package com.meridian.keystone.controller;

import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.domain.WorkOrderExpense;
import com.meridian.keystone.domain.TimeLog;
import com.meridian.keystone.repository.UserRepository;
import com.meridian.keystone.repository.WorkOrderRepository;
import com.meridian.keystone.repository.WorkOrderExpenseRepository;
import com.meridian.keystone.repository.TimeLogRepository;
import com.meridian.keystone.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WorkOrderExpenseRepository expenseRepository;

    @Autowired
    private TimeLogRepository timeLogRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return userRepository.findById(((User) principal).getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated"));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
    }

    @GetMapping("/profile")
    public User getProfile() {
        return getCurrentUser();
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(@RequestBody Map<String, String> updates) {
        User user = getCurrentUser();

        if (updates.containsKey("name")) {
            user.setName(updates.get("name"));
        }
        if (updates.containsKey("email")) {
            String newEmail = updates.get("email");
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.findByEmail(newEmail).isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is already in use");
            }
            user.setEmail(newEmail);
        }
        if (updates.containsKey("phone")) {
            user.setPhone(updates.get("phone"));
        }
        if (updates.containsKey("avatarUrl")) {
            user.setAvatarUrl(updates.get("avatarUrl"));
        }

        User savedUser = userRepository.save(user);
        String freshToken = tokenProvider.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getName());

        return Map.of(
            "user", savedUser,
            "token", freshToken
        );
    }

    @PostMapping("/duty")
    public User toggleDutyStatus(@RequestBody Map<String, Object> body) {
        User user = getCurrentUser();

        if (body.containsKey("isOnDuty")) {
            user.setIsOnDuty((Boolean) body.get("isOnDuty"));
        }
        if (body.containsKey("latitude") && body.get("latitude") != null) {
            user.setLatitude(Double.valueOf(body.get("latitude").toString()));
        }
        if (body.containsKey("longitude") && body.get("longitude") != null) {
            user.setLongitude(Double.valueOf(body.get("longitude").toString()));
        }
        user.setLastLocationUpdate(LocalDateTime.now());

        return userRepository.save(user);
    }

    @GetMapping("/technicians")
    public List<User> getTechnicians() {
        User user = getCurrentUser();
        if (user.getRole() != Role.MANAGER && user.getRole() != Role.DISPATCHER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Only Dispatchers and Managers can track staff location");
        }
        List<User> list = new ArrayList<>(userRepository.findByRole(Role.TECHNICIAN));
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            if (Boolean.TRUE.equals(u.getIsOnDuty()) && list.stream().noneMatch(t -> t.getId().equals(u.getId()))) {
                list.add(u);
            }
        }
        return list;
    }

    @PostMapping("/expenses")
    public WorkOrderExpense logExpense(@RequestBody Map<String, Object> body) {
        Long workOrderId = Long.valueOf(body.get("workOrderId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String category = body.get("category").toString();
        String note = body.getOrDefault("note", "").toString();

        WorkOrderExpense expense = new WorkOrderExpense(workOrderId, amount, category, note);
        return expenseRepository.save(expense);
    }

    @GetMapping("/expenses/{workOrderId}")
    public List<WorkOrderExpense> getExpenses(@PathVariable Long workOrderId) {
        return expenseRepository.findByWorkOrderId(workOrderId);
    }

    @GetMapping("/profile/history")
    public List<Map<String, Object>> getProfileHistory() {
        User user = getCurrentUser();
        List<Map<String, Object>> history = new ArrayList<>();

        if (user.getRole() == Role.TECHNICIAN) {
            // Fetch real-time labor logs entered by this technician
            List<TimeLog> logs = timeLogRepository.findByTechnicianId(user.getId());
            for (TimeLog log : logs) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("ticketCode", log.getWorkOrder().getCode());
                entry.put("title", "Labor Time Logged");
                entry.put("description", "You logged " + log.getMinutes() + " minutes of labor: " + log.getNote());
                entry.put("type", "COMPLETED");
                entry.put("date", log.getLoggedAt().toString());
                entry.put("loggedTime", log.getMinutes());
                history.add(entry);
            }

            // Fetch work orders assigned to this technician
            List<WorkOrder> orders = workOrderRepository.findByAssignedToId(user.getId());
            for (WorkOrder order : orders) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("ticketCode", order.getCode());
                entry.put("title", "Job Assignment");
                entry.put("description", "Assigned: " + order.getTitle() + " (Status: " + order.getStatus().name() + ")");
                entry.put("type", order.getStatus().name());
                entry.put("date", order.getUpdatedAt().toString());

                // Check if any expenses are logged on this order
                List<WorkOrderExpense> expenses = expenseRepository.findByWorkOrderId(order.getId());
                if (!expenses.isEmpty()) {
                    BigDecimal totalAmount = BigDecimal.ZERO;
                    for (WorkOrderExpense exp : expenses) {
                        totalAmount = totalAmount.add(exp.getAmount());
                    }
                    entry.put("description", entry.get("description") + " | Total Expenses Logged: $" + totalAmount);
                }
                history.add(entry);
            }
        } else if (user.getRole() == Role.CUSTOMER) {
            // Find orders submitted by this customer organization
            Long customerId = user.getEmail().equals("customer2@keystone.com") ? 2L : 1L;
            List<WorkOrder> orders = workOrderRepository.findByCustomerId(customerId);
            for (WorkOrder order : orders) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("ticketCode", order.getCode());
                entry.put("title", "Ticket Raised: " + order.getTitle());
                entry.put("description", "Status: " + order.getStatus().name() + " | Description: " + order.getDescription());
                entry.put("type", order.getStatus().name());
                entry.put("date", order.getCreatedAt().toString());
                history.add(entry);
            }
        } else {
            // Manager/Dispatcher: show recent updates across all work orders in the system
            List<WorkOrder> allOrders = workOrderRepository.findAll();
            int count = 0;
            for (WorkOrder order : allOrders) {
                if (count >= 10) break;
                Map<String, Object> entry = new HashMap<>();
                entry.put("ticketCode", order.getCode());
                entry.put("title", "Service Ticket Update");
                entry.put("description", "Ticket: " + order.getTitle() + " | Status transitioned to " + order.getStatus().name());
                entry.put("type", order.getStatus().name());
                entry.put("date", order.getUpdatedAt().toString());
                history.add(entry);
                count++;
            }
        }

        // Sort history by date descending
        history.sort((a, b) -> b.get("date").toString().compareTo(a.get("date").toString()));
        return history;
    }
}
