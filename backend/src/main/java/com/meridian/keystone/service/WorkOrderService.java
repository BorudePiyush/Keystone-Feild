package com.meridian.keystone.service;

import com.meridian.keystone.domain.Customer;
import com.meridian.keystone.domain.Part;
import com.meridian.keystone.domain.PartUsage;
import com.meridian.keystone.domain.Priority;
import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.Site;
import com.meridian.keystone.domain.Status;
import com.meridian.keystone.domain.TimeLog;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.domain.WorkOrderStatusHistory;
import com.meridian.keystone.repository.CustomerRepository;
import com.meridian.keystone.repository.PartRepository;
import com.meridian.keystone.repository.PartUsageRepository;
import com.meridian.keystone.repository.SiteRepository;
import com.meridian.keystone.repository.TimeLogRepository;
import com.meridian.keystone.repository.UserRepository;
import com.meridian.keystone.repository.WorkOrderRepository;
import com.meridian.keystone.repository.WorkOrderStatusHistoryRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import java.util.Objects;

@Service
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final CustomerRepository customerRepository;
    private final SiteRepository siteRepository;
    private final UserRepository userRepository;
    private final WorkOrderStatusHistoryRepository historyRepository;
    private final PartRepository partRepository;
    private final PartUsageRepository partUsageRepository;
    private final TimeLogRepository timeLogRepository;

    public WorkOrderService(
            WorkOrderRepository workOrderRepository,
            CustomerRepository customerRepository,
            SiteRepository siteRepository,
            UserRepository userRepository,
            WorkOrderStatusHistoryRepository historyRepository,
            PartRepository partRepository,
            PartUsageRepository partUsageRepository,
            TimeLogRepository timeLogRepository) {

        this.workOrderRepository = workOrderRepository;
        this.customerRepository = customerRepository;
        this.siteRepository = siteRepository;
        this.userRepository = userRepository;
        this.historyRepository = historyRepository;
        this.partRepository = partRepository;
        this.partUsageRepository = partUsageRepository;
        this.timeLogRepository = timeLogRepository;
    }

    /**
     * Search work orders with optional filters.
     */
    public Page<WorkOrder> searchWorkOrders(
            Long customerId,
            Long assignedToId,
            Status status,
            Priority priority,
            String searchTerm,
            Pageable pageable) {

        return workOrderRepository.searchWorkOrders(
                customerId,
                assignedToId,
                status,
                priority,
                searchTerm,
                pageable);
    }

    /**
     * Get a work order by ID.
     */
    public WorkOrder getWorkOrderById(Long id) {

        Long safeId = Objects.requireNonNull(
                id,
                "Work order ID must not be null");

        return workOrderRepository.findById(safeId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Work order not found"));
    }

    /**
     * Create a new work order.
     */
    @Transactional
    public WorkOrder createWorkOrder(
            WorkOrder workOrder,
            Long customerId,
            Long siteId) {

        Long safeCustomerId = Objects.requireNonNull(
                customerId,
                "Customer ID must not be null");

        Long safeSiteId = Objects.requireNonNull(
                siteId,
                "Site ID must not be null");

        Customer customer = customerRepository.findById(safeCustomerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found"));

        Site site = siteRepository.findById(safeSiteId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Site not found"));

        workOrder.setCustomer(customer);
        workOrder.setSite(site);
        workOrder.setStatus(Status.NEW);

        /*
         * Calculate SLA due date.
         *
         * EMERGENCY = 2 hours
         * HIGH      = 4 hours
         * MEDIUM    = 24 hours
         * LOW       = 72 hours
         */
        LocalDateTime now = LocalDateTime.now();

        int hours = 24;

        if (workOrder.getPriority() != null) {
            switch (workOrder.getPriority()) {
                case EMERGENCY:
                    hours = 2;
                    break;

                case HIGH:
                    hours = 4;
                    break;

                case MEDIUM:
                    hours = 24;
                    break;

                case LOW:
                    hours = 72;
                    break;
            }
        }

        workOrder.setSlaDueAt(now.plusHours(hours));

        /*
         * Generate work order code.
         */
        long nextId = workOrderRepository.count() + 1001;

        workOrder.setCode("WO-" + nextId);

        return workOrderRepository.save(workOrder);
    }

    /**
     * Update an existing work order.
     */
    @Transactional
    public WorkOrder updateWorkOrder(
            Long id,
            WorkOrder updateData) {

        WorkOrder wo = getWorkOrderById(id);

        if (wo.getStatus() == Status.CLOSED
                || wo.getStatus() == Status.CANCELLED) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot edit closed or cancelled work order");
        }

        wo.setTitle(updateData.getTitle());
        wo.setDescription(updateData.getDescription());

        return workOrderRepository.save(wo);
    }

    /**
     * Assign a work order to a technician.
     */
    @Transactional
    public WorkOrder assignWorkOrder(
            Long id,
            Long technicianId,
            User dispatcher) {

        WorkOrder wo = getWorkOrderById(id);

        if (wo.getStatus() == Status.CLOSED
                || wo.getStatus() == Status.CANCELLED) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot assign closed or cancelled work order");
        }

        Long safeTechnicianId = Objects.requireNonNull(
                technicianId,
                "Technician ID must not be null");

        User tech = userRepository.findById(safeTechnicianId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Technician not found"));

        if (tech.getRole() != Role.TECHNICIAN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Assigned user must be a TECHNICIAN");
        }

        Status originalStatus = wo.getStatus();

        wo.setAssignedTo(tech);
        wo.setStatus(Status.ASSIGNED);

        WorkOrder savedWorkOrder = workOrderRepository.save(wo);

        /*
         * Add status history.
         */
        WorkOrderStatusHistory history =
                new WorkOrderStatusHistory(
                        null,
                        savedWorkOrder,
                        originalStatus,
                        Status.ASSIGNED,
                        dispatcher,
                        "Assigned to technician " + tech.getName());

        historyRepository.save(history);

        return savedWorkOrder;
    }

    /**
     * Change work order status.
     */
    @Transactional
    public WorkOrder transitionStatus(
            Long id,
            Status targetStatus,
            String note,
            User changedBy) {

        WorkOrder wo = getWorkOrderById(id);

        Status fromStatus = wo.getStatus();

        if (targetStatus == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Target status must not be null");
        }

        if (fromStatus == targetStatus) {
            return wo;
        }

        if (fromStatus == Status.CLOSED
                || fromStatus == Status.CANCELLED) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot transition from terminal status "
                            + fromStatus);
        }

        boolean valid = false;

        switch (fromStatus) {

            case NEW:
                if (targetStatus == Status.ASSIGNED
                        || targetStatus == Status.CANCELLED) {
                    valid = true;
                }
                break;

            case ASSIGNED:
                if (targetStatus == Status.IN_PROGRESS
                        || targetStatus == Status.CANCELLED
                        || targetStatus == Status.ASSIGNED) {
                    valid = true;
                }
                break;

            case IN_PROGRESS:
                if (targetStatus == Status.ON_HOLD
                        || targetStatus == Status.COMPLETED
                        || targetStatus == Status.CANCELLED) {
                    valid = true;
                }
                break;

            case ON_HOLD:
                if (targetStatus == Status.IN_PROGRESS
                        || targetStatus == Status.CANCELLED) {
                    valid = true;
                }
                break;

            case COMPLETED:
                if (targetStatus == Status.CLOSED
                        || targetStatus == Status.IN_PROGRESS) {
                    valid = true;
                }
                break;

            case CLOSED:
            case CANCELLED:
                valid = false;
                break;
        }

        if (!valid) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid status transition from "
                            + fromStatus
                            + " to "
                            + targetStatus);
        }

        /*
         * Only managers can close work orders.
         */
        if (targetStatus == Status.CLOSED
                && changedBy.getRole() != Role.MANAGER) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only a manager can CLOSE a work order");
        }

        /*
         * Technicians can only update their own assigned work orders.
         */
        if (changedBy.getRole() == Role.TECHNICIAN
                && wo.getAssignedTo() != null
                && !wo.getAssignedTo()
                        .getId()
                        .equals(changedBy.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Technicians can only update their own assigned work orders");
        }

        wo.setStatus(targetStatus);

        WorkOrder savedWorkOrder =
                workOrderRepository.save(wo);

        /*
         * Audit trail.
         */
        WorkOrderStatusHistory history =
                new WorkOrderStatusHistory(
                        null,
                        savedWorkOrder,
                        fromStatus,
                        targetStatus,
                        changedBy,
                        note);

        historyRepository.save(history);

        return savedWorkOrder;
    }

    /**
     * Log part usage against a work order.
     */
    @Transactional
    public PartUsage logPartUsage(
            Long workOrderId,
            Long partId,
            int qtyUsed) {

        if (qtyUsed <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity used must be greater than zero");
        }

        WorkOrder wo = getWorkOrderById(workOrderId);

        if (wo.getStatus() != Status.IN_PROGRESS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Parts can only be logged when ticket is IN PROGRESS");
        }

        Long safePartId = Objects.requireNonNull(
                partId,
                "Part ID must not be null");

        Part part = partRepository.findById(safePartId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Part not found"));

        if (part.getStockQty() < qtyUsed) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Insufficient stock. Available: "
                            + part.getStockQty());
        }

        part.setStockQty(
                part.getStockQty() - qtyUsed);

        partRepository.save(part);

        PartUsage usage =
                new PartUsage(
                        null,
                        wo,
                        part,
                        qtyUsed);

        return partUsageRepository.save(usage);
    }

    /**
     * Log technician labour time.
     */
    @Transactional
    public TimeLog logLabourTime(
            Long workOrderId,
            User technician,
            int minutes,
            String note) {

        if (minutes <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Labour time must be greater than zero");
        }

        WorkOrder wo = getWorkOrderById(workOrderId);

        if (wo.getStatus() != Status.IN_PROGRESS) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Labor time can only be logged when ticket is IN PROGRESS");
        }

        if (technician == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Technician is not authenticated");
        }

        if (technician.getRole() != Role.TECHNICIAN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Labor can only be logged by a TECHNICIAN");
        }

        TimeLog timeLog =
                new TimeLog(
                        null,
                        wo,
                        technician,
                        minutes,
                        note);

        return timeLogRepository.save(timeLog);
    }
}

