package com.meridian.keystone.service;

import com.meridian.keystone.domain.*;
import com.meridian.keystone.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class WorkOrderService {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepository;

    @Autowired
    private PartRepository partRepository;

    @Autowired
    private PartUsageRepository partUsageRepository;

    @Autowired
    private TimeLogRepository timeLogRepository;

    public Page<WorkOrder> searchWorkOrders(Long customerId, Long assignedToId, Status status, Priority priority, String searchTerm, Pageable pageable) {
        return workOrderRepository.searchWorkOrders(customerId, assignedToId, status, priority, searchTerm, pageable);
    }

    public WorkOrder getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
    }

    public WorkOrder createWorkOrder(WorkOrder workOrder, Long customerId, Long siteId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Site not found"));

        workOrder.setCustomer(customer);
        workOrder.setSite(site);
        workOrder.setStatus(Status.NEW);

        // Calculate SLA Due Date
        LocalDateTime now = LocalDateTime.now();
        int hours = 24; // Default medium
        if (workOrder.getPriority() != null) {
            switch (workOrder.getPriority()) {
                case EMERGENCY: hours = 2; break;
                case HIGH: hours = 4; break;
                case MEDIUM: hours = 24; break;
                case LOW: hours = 72; break;
            }
        }
        workOrder.setSlaDueAt(now.plusHours(hours));

        // Generate unique code format
        long nextId = workOrderRepository.count() + 1001;
        workOrder.setCode("WO-" + nextId);

        return workOrderRepository.save(workOrder);
    }

    public WorkOrder updateWorkOrder(Long id, WorkOrder updateData) {
        WorkOrder wo = getWorkOrderById(id);
        if (wo.getStatus() == Status.CLOSED || wo.getStatus() == Status.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot edit closed or cancelled work order");
        }
        wo.setTitle(updateData.getTitle());
        wo.setDescription(updateData.getDescription());
        return workOrderRepository.save(wo);
    }

    public WorkOrder assignWorkOrder(Long id, Long technicianId, User dispatcher) {
        WorkOrder wo = getWorkOrderById(id);
        if (wo.getStatus() == Status.CLOSED || wo.getStatus() == Status.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot assign closed or cancelled work order");
        }
        User tech = userRepository.findById(technicianId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Technician not found"));

        if (tech.getRole() != Role.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user must be a TECHNICIAN");
        }

        Status originalStatus = wo.getStatus();
        wo.setAssignedTo(tech);
        wo.setStatus(Status.ASSIGNED);
        workOrderRepository.save(wo);

        // Add history log
        WorkOrderStatusHistory history = new WorkOrderStatusHistory(
                null, wo, originalStatus, Status.ASSIGNED, dispatcher, "Assigned to technician " + tech.getName()
        );
        historyRepository.save(history);

        return wo;
    }

    public WorkOrder transitionStatus(Long id, Status targetStatus, String note, User changedBy) {
        WorkOrder wo = getWorkOrderById(id);
        Status fromStatus = wo.getStatus();

        if (fromStatus == targetStatus) {
            return wo; // no-op
        }

        if (fromStatus == Status.CLOSED || fromStatus == Status.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot transition from terminal status " + fromStatus);
        }

        boolean valid = false;
        switch (fromStatus) {
            case NEW:
                if (targetStatus == Status.ASSIGNED || targetStatus == Status.CANCELLED) valid = true;
                break;
            case ASSIGNED:
                if (targetStatus == Status.IN_PROGRESS || targetStatus == Status.CANCELLED || targetStatus == Status.ASSIGNED) valid = true;
                break;
            case IN_PROGRESS:
                if (targetStatus == Status.ON_HOLD || targetStatus == Status.COMPLETED || targetStatus == Status.CANCELLED) valid = true;
                break;
            case ON_HOLD:
                if (targetStatus == Status.IN_PROGRESS || targetStatus == Status.CANCELLED) valid = true;
                break;
            case COMPLETED:
                if (targetStatus == Status.CLOSED || targetStatus == Status.IN_PROGRESS) valid = true;
                break;
        }

        if (!valid) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid status transition from " + fromStatus + " to " + targetStatus);
        }

        // Role-based security validation
        if (targetStatus == Status.CLOSED && changedBy.getRole() != Role.MANAGER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only a manager can CLOSE a work order");
        }
        if (changedBy.getRole() == Role.TECHNICIAN && wo.getAssignedTo() != null && !wo.getAssignedTo().getId().equals(changedBy.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Technicians can only update their own assigned work orders");
        }

        wo.setStatus(targetStatus);
        workOrderRepository.save(wo);

        // Audit Trail
        WorkOrderStatusHistory history = new WorkOrderStatusHistory(null, wo, fromStatus, targetStatus, changedBy, note);
        historyRepository.save(history);

        return wo;
    }

    @Transactional
    public PartUsage logPartUsage(Long workOrderId, Long partId, int qtyUsed) {
        WorkOrder wo = getWorkOrderById(workOrderId);
        if (wo.getStatus() != Status.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Parts can only be logged when ticket is IN PROGRESS");
        }
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Part not found"));

        if (part.getStockQty() < qtyUsed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock. Available: " + part.getStockQty());
        }

        part.setStockQty(part.getStockQty() - qtyUsed);
        partRepository.save(part);

        PartUsage usage = new PartUsage(null, wo, part, qtyUsed);
        return partUsageRepository.save(usage);
    }

    public TimeLog logLabourTime(Long workOrderId, User technician, int minutes, String note) {
        WorkOrder wo = getWorkOrderById(workOrderId);
        if (wo.getStatus() != Status.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Labor time can only be logged when ticket is IN PROGRESS");
        }
        if (technician.getRole() != Role.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Labor can only be logged by a TECHNICIAN");
        }

        TimeLog timeLog = new TimeLog(null, wo, technician, minutes, note);
        return timeLogRepository.save(timeLog);
    }
}
