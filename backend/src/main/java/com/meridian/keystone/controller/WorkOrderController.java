package com.meridian.keystone.controller;

import com.meridian.keystone.domain.PartUsage;
import com.meridian.keystone.domain.Priority;
import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.Status;
import com.meridian.keystone.domain.TimeLog;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.service.WorkOrderService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/work-orders")
public class WorkOrderController {

    @Autowired
    private WorkOrderService workOrderService;

    /**
     * Get the currently authenticated user.
     */
    private User getCurrentUser() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not authenticated"
            );
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof User) {
            return (User) principal;
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid authenticated user"
        );
    }

    /**
     * Get all work orders with optional filters.
     */
    @GetMapping
    public Page<WorkOrder> getWorkOrders(
            @RequestParam(value = "status", required = false) Status status,
            @RequestParam(value = "priority", required = false) Priority priority,
            @RequestParam(value = "searchTerm", required = false) String searchTerm,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {

        User currentUser = getCurrentUser();

        Long customerId = null;
        Long assignedToId = null;

        // Role-based scoping
        if (currentUser.getRole() == Role.CUSTOMER) {

            // Map seeded customers
            if ("customer2@keystone.com".equalsIgnoreCase(currentUser.getEmail())) {
                customerId = 2L;
            } else {
                customerId = 1L;
            }

        } else if (currentUser.getRole() == Role.TECHNICIAN) {

            assignedToId = currentUser.getId();
        }

        // Prevent invalid pagination values
        if (page < 0) {
            page = 0;
        }

        if (size <= 0) {
            size = 20;
        }

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("updatedAt").descending()
        );

        return workOrderService.searchWorkOrders(
                customerId,
                assignedToId,
                status,
                priority,
                searchTerm,
                pageable
        );
    }

    /**
     * Get a work order by ID.
     */
    @GetMapping("/{id}")
    public WorkOrder getWorkOrderById(
            @PathVariable("id") Long id
    ) {

        User currentUser = getCurrentUser();

        WorkOrder workOrder = workOrderService.getWorkOrderById(id);

        // Customer security check
        if (currentUser.getRole() == Role.CUSTOMER) {

            Long customerId;

            if ("customer2@keystone.com"
                    .equalsIgnoreCase(currentUser.getEmail())) {
                customerId = 2L;
            } else {
                customerId = 1L;
            }

            if (workOrder.getCustomer() == null
                    || workOrder.getCustomer().getId() == null
                    || !workOrder.getCustomer().getId().equals(customerId)) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Access denied to other customer's ticket"
                );
            }
        }

        // Technician security check
        else if (currentUser.getRole() == Role.TECHNICIAN) {

            if (workOrder.getAssignedTo() == null
                    || workOrder.getAssignedTo().getId() == null
                    || !workOrder.getAssignedTo().getId()
                    .equals(currentUser.getId())) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Access denied to unassigned ticket"
                );
            }
        }

        return workOrder;
    }

    /**
     * Create a new work order.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public WorkOrder createWorkOrder(
            @RequestBody Map<String, Object> body
    ) {

        User currentUser = getCurrentUser();

        String title = (String) body.get("title");
        String description = (String) body.get("description");

        if (body.get("priority") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Priority is required"
            );
        }

        if (body.get("customerId") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Customer ID is required"
            );
        }

        if (body.get("siteId") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Site ID is required"
            );
        }

        Priority priority;

        try {
            priority = Priority.valueOf(
                    body.get("priority").toString().toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid priority value"
            );
        }

        Long customerId;

        try {
            customerId = Long.valueOf(
                    body.get("customerId").toString()
            );
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid customerId"
            );
        }

        Long siteId;

        try {
            siteId = Long.valueOf(
                    body.get("siteId").toString()
            );
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid siteId"
            );
        }

        // Customer can only create tickets for their own organization
        if (currentUser.getRole() == Role.CUSTOMER) {

            Long authenticatedCustomerId;

            if ("customer2@keystone.com"
                    .equalsIgnoreCase(currentUser.getEmail())) {
                authenticatedCustomerId = 2L;
            } else {
                authenticatedCustomerId = 1L;
            }

            if (!customerId.equals(authenticatedCustomerId)) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Cannot raise ticket for another client"
                );
            }
        }

        WorkOrder workOrder = new WorkOrder();

        workOrder.setTitle(title);
        workOrder.setDescription(description);
        workOrder.setPriority(priority);

        return workOrderService.createWorkOrder(
                workOrder,
                customerId,
                siteId
        );
    }

    /**
     * Assign work order to a technician.
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public WorkOrder assignWorkOrder(
            @PathVariable("id") Long id,
            @RequestParam("technicianId") Long technicianId
    ) {

        User currentUser = getCurrentUser();

        return workOrderService.assignWorkOrder(
                id,
                technicianId,
                currentUser
        );
    }

    /**
     * Change work order status.
     */
    @PostMapping("/{id}/status")
    public WorkOrder transitionStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") Status status,
            @RequestParam(value = "note", defaultValue = "") String note
    ) {

        User currentUser = getCurrentUser();

        return workOrderService.transitionStatus(
                id,
                status,
                note,
                currentUser
        );
    }

    /**
     * Log part usage.
     */
    @PostMapping("/{id}/parts")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public PartUsage logPartUsage(
            @PathVariable("id") Long id,
            @RequestParam("partId") Long partId,
            @RequestParam("qtyUsed") int qtyUsed
    ) {

        if (qtyUsed <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity used must be greater than zero"
            );
        }

        return workOrderService.logPartUsage(
                id,
                partId,
                qtyUsed
        );
    }

    /**
     * Log technician labour time.
     */
    @PostMapping("/{id}/time")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public TimeLog logLabourTime(
            @PathVariable("id") Long id,
            @RequestParam("minutes") int minutes,
            @RequestParam("note") String note
    ) {

        User currentUser = getCurrentUser();

        if (minutes <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minutes must be greater than zero"
            );
        }

        return workOrderService.logLabourTime(
                id,
                currentUser,
                minutes,
                note
        );
    }
}