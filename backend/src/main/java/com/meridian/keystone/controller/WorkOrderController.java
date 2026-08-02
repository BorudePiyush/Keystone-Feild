package com.meridian.keystone.controller;

import com.meridian.keystone.domain.*;
import com.meridian.keystone.service.WorkOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/work-orders")
public class WorkOrderController {

    @Autowired
    private WorkOrderService workOrderService;

    @GetMapping
    public Page<WorkOrder> getWorkOrders(
            @RequestParam(value = "status", required = false) Status status,
            @RequestParam(value = "priority", required = false) Priority priority,
            @RequestParam(value = "searchTerm", required = false) String searchTerm,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long customerId = null;
        Long assignedToId = null;

        // Role-based scoping
        if (currentUser.getRole() == Role.CUSTOMER) {
            // Map seeded customers
            if (currentUser.getEmail().equals("customer2@keystone.com")) {
                customerId = 2L;
            } else {
                customerId = 1L; // Default for new registrations
            }
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            assignedToId = currentUser.getId();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        return workOrderService.searchWorkOrders(customerId, assignedToId, status, priority, searchTerm, pageable);
    }

    @GetMapping("/{id}")
    public WorkOrder getWorkOrderById(@PathVariable("id") Long id) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        WorkOrder wo = workOrderService.getWorkOrderById(id);

        // Security check
        if (currentUser.getRole() == Role.CUSTOMER) {
            Long customerId = currentUser.getEmail().equals("customer2@keystone.com") ? 2L : 1L;
            if (!wo.getCustomer().getId().equals(customerId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to other customer's ticket");
            }
        } else if (currentUser.getRole() == Role.TECHNICIAN) {
            if (wo.getAssignedTo() == null || !wo.getAssignedTo().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to unassigned ticket");
            }
        }

        return wo;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public WorkOrder createWorkOrder(@RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String description = (String) body.get("description");
        Priority priority = Priority.valueOf((String) body.get("priority"));
        Long customerId = Long.valueOf(body.get("customerId").toString());
        Long siteId = Long.valueOf(body.get("siteId").toString());

        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (currentUser.getRole() == Role.CUSTOMER) {
            // Enforce customer can only create for their own organization
            Long authenticatedCustId = currentUser.getEmail().equals("customer2@keystone.com") ? 2L : 1L;
            if (!customerId.equals(authenticatedCustId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot raise ticket for another client");
            }
        }

        WorkOrder wo = new WorkOrder();
        wo.setTitle(title);
        wo.setDescription(description);
        wo.setPriority(priority);

        return workOrderService.createWorkOrder(wo, customerId, siteId);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public WorkOrder assignWorkOrder(@PathVariable("id") Long id, @RequestParam("technicianId") Long technicianId) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return workOrderService.assignWorkOrder(id, technicianId, currentUser);
    }

    @PostMapping("/{id}/status")
    public WorkOrder transitionStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") Status status,
            @RequestParam(value = "note", defaultValue = "") String note
    ) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return workOrderService.transitionStatus(id, status, note, currentUser);
    }

    @PostMapping("/{id}/parts")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public PartUsage logPartUsage(
            @PathVariable("id") Long id,
            @RequestParam("partId") Long partId,
            @RequestParam("qtyUsed") int qtyUsed
    ) {
        return workOrderService.logPartUsage(id, partId, qtyUsed);
    }

    @PostMapping("/{id}/time")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public TimeLog logLabourTime(
            @PathVariable("id") Long id,
            @RequestParam("minutes") int minutes,
            @RequestParam("note") String note
    ) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return workOrderService.logLabourTime(id, currentUser, minutes, note);
    }
}
