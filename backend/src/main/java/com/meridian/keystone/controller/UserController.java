package com.meridian.keystone.controller;

import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.TimeLog;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.domain.WorkOrderExpense;
import com.meridian.keystone.repository.TimeLogRepository;
import com.meridian.keystone.repository.UserRepository;
import com.meridian.keystone.repository.WorkOrderExpenseRepository;
import com.meridian.keystone.repository.WorkOrderRepository;
import com.meridian.keystone.security.JwtTokenProvider;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderExpenseRepository expenseRepository;
    private final TimeLogRepository timeLogRepository;
    private final JwtTokenProvider tokenProvider;

    public UserController(
            UserRepository userRepository,
            WorkOrderRepository workOrderRepository,
            WorkOrderExpenseRepository expenseRepository,
            TimeLogRepository timeLogRepository,
            JwtTokenProvider tokenProvider) {

        this.userRepository = userRepository;
        this.workOrderRepository = workOrderRepository;
        this.expenseRepository = expenseRepository;
        this.timeLogRepository = timeLogRepository;
        this.tokenProvider = tokenProvider;
    }

    /**
     * Get currently authenticated user.
     */
    private User getCurrentUser() {

        var authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (authentication == null ||
                authentication.getPrincipal() == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User not authenticated"
            );
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof User user) {

            Long userId = user.getId();

            if (userId == null) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User ID is null"
                );
            }

            return userRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "User not authenticated"
                    ));
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "User not authenticated"
        );
    }

    /**
     * Get current user's profile.
     */
    @GetMapping("/profile")
    public User getProfile() {
        return getCurrentUser();
    }

    /**
     * Update current user's profile.
     */
    @PutMapping("/profile")
    public Map<String, Object> updateProfile(
            @RequestBody Map<String, String> updates) {

        User user = getCurrentUser();

        if (updates.containsKey("name")) {
            user.setName(updates.get("name"));
        }

        if (updates.containsKey("email")) {

            String newEmail = updates.get("email");

            if (newEmail == null || newEmail.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email cannot be empty"
                );
            }

            if (!newEmail.equalsIgnoreCase(user.getEmail())
                    && userRepository.findByEmail(newEmail).isPresent()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email address is already in use"
                );
            }

            user.setEmail(newEmail);
        }

        if (updates.containsKey("phone")) {
            user.setPhone(updates.get("phone"));
        }

        if (updates.containsKey("avatarUrl")) {
            user.setAvatarUrl(updates.get("avatarUrl"));
        }

       User savedUser = userRepository.save(
        java.util.Objects.requireNonNull(user, "User cannot be null")
);

        String freshToken = tokenProvider.generateToken(
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.getName()
        );

        return Map.of(
                "user", savedUser,
                "token", freshToken
        );
    }

    /**
     * Toggle technician duty status and update location.
     */
    @PostMapping("/duty")
    public User toggleDutyStatus(
            @RequestBody Map<String, Object> body) {

        User user = getCurrentUser();

        if (body.containsKey("isOnDuty")
                && body.get("isOnDuty") != null) {

            user.setIsOnDuty(
                    Boolean.valueOf(body.get("isOnDuty").toString())
            );
        }

        if (body.containsKey("latitude")
                && body.get("latitude") != null) {

            user.setLatitude(
                    Double.valueOf(body.get("latitude").toString())
            );
        }

        if (body.containsKey("longitude")
                && body.get("longitude") != null) {

            user.setLongitude(
                    Double.valueOf(body.get("longitude").toString())
            );
        }

        user.setLastLocationUpdate(LocalDateTime.now());

        return userRepository.save(user);
    }

    /**
     * Get technicians and users currently on duty.
     */
    @GetMapping("/technicians")
    public List<User> getTechnicians() {

        User user = getCurrentUser();

        if (user.getRole() != Role.MANAGER
                && user.getRole() != Role.DISPATCHER) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: Only Dispatchers and Managers can track staff location"
            );
        }

        List<User> list = new ArrayList<>(
                userRepository.findByRole(Role.TECHNICIAN)
        );

        List<User> allUsers = userRepository.findAll();

        for (User u : allUsers) {

            if (Boolean.TRUE.equals(u.getIsOnDuty())
                    && u.getId() != null
                    && list.stream().noneMatch(
                            t -> t.getId() != null
                                    && t.getId().equals(u.getId()))) {

                list.add(u);
            }
        }

        return list;
    }

    /**
     * Log an expense for a work order.
     */
    @PostMapping("/expenses")
    public WorkOrderExpense logExpense(
            @RequestBody Map<String, Object> body) {

        if (body.get("workOrderId") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "workOrderId is required"
            );
        }

        if (body.get("amount") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "amount is required"
            );
        }

        if (body.get("category") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "category is required"
            );
        }

        Long workOrderId = Long.valueOf(
                body.get("workOrderId").toString()
        );

        BigDecimal amount = new BigDecimal(
                body.get("amount").toString()
        );

        String category = body.get("category").toString();

        String note = body.getOrDefault("note", "").toString();

        WorkOrderExpense expense =
                new WorkOrderExpense(
                        workOrderId,
                        amount,
                        category,
                        note
                );

        return expenseRepository.save(expense);
    }

    /**
     * Get expenses for a work order.
     */
    @GetMapping("/expenses/{workOrderId}")
    public List<WorkOrderExpense> getExpenses(
            @PathVariable Long workOrderId) {

        return expenseRepository.findByWorkOrderId(workOrderId);
    }

    /**
     * Get profile history.
     */
    @GetMapping("/profile/history")
    public List<Map<String, Object>> getProfileHistory() {

        User user = getCurrentUser();

        List<Map<String, Object>> history = new ArrayList<>();

        if (user.getRole() == Role.TECHNICIAN) {

            // Labor logs entered by this technician
            List<TimeLog> logs =
                    timeLogRepository.findByTechnicianId(user.getId());

            for (TimeLog log : logs) {

                Map<String, Object> entry = new HashMap<>();

                entry.put(
                        "ticketCode",
                        log.getWorkOrder().getCode()
                );

                entry.put(
                        "title",
                        "Labor Time Logged"
                );

                entry.put(
                        "description",
                        "You logged "
                                + log.getMinutes()
                                + " minutes of labor: "
                                + log.getNote()
                );

                entry.put(
                        "type",
                        "COMPLETED"
                );

                entry.put(
                        "date",
                        log.getLoggedAt().toString()
                );

                entry.put(
                        "loggedTime",
                        log.getMinutes()
                );

                history.add(entry);
            }

            // Work orders assigned to technician
            List<WorkOrder> orders =
                    workOrderRepository.findByAssignedToId(user.getId());

            for (WorkOrder order : orders) {

                Map<String, Object> entry = new HashMap<>();

                entry.put(
                        "ticketCode",
                        order.getCode()
                );

                entry.put(
                        "title",
                        "Job Assignment"
                );

                entry.put(
                        "description",
                        "Assigned: "
                                + order.getTitle()
                                + " (Status: "
                                + order.getStatus().name()
                                + ")"
                );

                entry.put(
                        "type",
                        order.getStatus().name()
                );

                entry.put(
                        "date",
                        order.getUpdatedAt().toString()
                );

                // Expenses
                List<WorkOrderExpense> expenses =
                        expenseRepository.findByWorkOrderId(
                                order.getId()
                        );

                if (!expenses.isEmpty()) {

                    BigDecimal totalAmount = BigDecimal.ZERO;

                    for (WorkOrderExpense exp : expenses) {

                        if (exp.getAmount() != null) {
                            totalAmount =
                                    totalAmount.add(
                                            exp.getAmount()
                                    );
                        }
                    }

                    entry.put(
                            "description",
                            entry.get("description")
                                    + " | Total Expenses Logged: $"
                                    + totalAmount
                    );
                }

                history.add(entry);
            }

        } else if (user.getRole() == Role.CUSTOMER) {

            /*
             * Customer organization mapping.
             *
             * This currently follows your existing logic:
             * customer2@keystone.com -> customer ID 2
             * all other customers -> customer ID 1
             */
            Long customerId =
                    "customer2@keystone.com".equalsIgnoreCase(
                            user.getEmail()
                    )
                            ? 2L
                            : 1L;

            List<WorkOrder> orders =
                    workOrderRepository.findByCustomerId(
                            customerId
                    );

            for (WorkOrder order : orders) {

                Map<String, Object> entry =
                        new HashMap<>();

                entry.put(
                        "ticketCode",
                        order.getCode()
                );

                entry.put(
                        "title",
                        "Ticket Raised: "
                                + order.getTitle()
                );

                entry.put(
                        "description",
                        "Status: "
                                + order.getStatus().name()
                                + " | Description: "
                                + order.getDescription()
                );

                entry.put(
                        "type",
                        order.getStatus().name()
                );

                entry.put(
                        "date",
                        order.getCreatedAt().toString()
                );

                history.add(entry);
            }

        } else {

            // Manager / Dispatcher
            List<WorkOrder> allOrders =
                    workOrderRepository.findAll();

            int count = 0;

            for (WorkOrder order : allOrders) {

                if (count >= 10) {
                    break;
                }

                Map<String, Object> entry =
                        new HashMap<>();

                entry.put(
                        "ticketCode",
                        order.getCode()
                );

                entry.put(
                        "title",
                        "Service Ticket Update"
                );

                entry.put(
                        "description",
                        "Ticket: "
                                + order.getTitle()
                                + " | Status transitioned to "
                                + order.getStatus().name()
                );

                entry.put(
                        "type",
                        order.getStatus().name()
                );

                entry.put(
                        "date",
                        order.getUpdatedAt().toString()
                );

                history.add(entry);

                count++;
            }
        }

        // Sort newest first
        history.sort(
                (a, b) -> b.get("date")
                        .toString()
                        .compareTo(
                                a.get("date").toString()
                        )
        );

        return history;
    }
}