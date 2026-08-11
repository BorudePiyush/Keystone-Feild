package com.meridian.keystone.service;

import com.meridian.keystone.domain.*;
import com.meridian.keystone.repository.WorkOrderRepository;
import com.meridian.keystone.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class WorkOrderServiceTest {

    @InjectMocks
    private WorkOrderService workOrderService;

    @Mock
    private WorkOrderRepository workOrderRepository;

    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    private User dispatcherUser;
    private User techUser;
    private User managerUser;
    private WorkOrder testWorkOrder;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);

        dispatcherUser = new User(1L, "Sarah Dispatcher", "dispatcher@keystone.com", Role.DISPATCHER, "pass");
        techUser = new User(2L, "Dave Tech", "tech1@keystone.com", Role.TECHNICIAN, "pass");
        managerUser = new User(3L, "John Manager", "manager@keystone.com", Role.MANAGER, "pass");

        testWorkOrder = new WorkOrder(
                100L, "WO-1001", "Test Issue", "AC broken", Priority.HIGH, Status.NEW,
                LocalDateTime.now().plusHours(4), new Customer(), new Site(), null
        );
    }

    @SuppressWarnings("null")
    @Test
    public void testValidStatusTransition_NewToAssigned() {
        when(workOrderRepository.findById(100L)).thenReturn(Optional.of(testWorkOrder));

        WorkOrder updated = workOrderService.transitionStatus(100L, Status.ASSIGNED, "Assigning", dispatcherUser);

        assertEquals(Status.ASSIGNED, updated.getStatus());
        final WorkOrder testWorkOrder2 = testWorkOrder;
        if (testWorkOrder2 != null) {
            verify(workOrderRepository, times(1)).save(testWorkOrder2);
        } else {
            // TODO handle null value
        }
        verify(historyRepository, times(1)).save(any(WorkOrderStatusHistory.class));
    }

    @Test
    public void testInvalidStatusTransition_NewToCompletedThrowsConflict() {
        when(workOrderRepository.findById(100L)).thenReturn(Optional.of(testWorkOrder));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            workOrderService.transitionStatus(100L, Status.COMPLETED, "Skipping", dispatcherUser);
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Invalid status transition"));
    }

    @Test
    public void testManagerOnlyCloseConstraint() {
        testWorkOrder.setStatus(Status.COMPLETED);
        when(workOrderRepository.findById(100L)).thenReturn(Optional.of(testWorkOrder));

        // Dispatcher tries to close -> should fail
        ResponseStatusException dispatcherException = assertThrows(ResponseStatusException.class, () -> {
            workOrderService.transitionStatus(100L, Status.CLOSED, "Closing", dispatcherUser);
        });
        assertEquals(HttpStatus.FORBIDDEN, dispatcherException.getStatusCode());

        // Manager tries to close -> should succeed
        WorkOrder closed = workOrderService.transitionStatus(100L, Status.CLOSED, "Closing", managerUser);
        assertEquals(Status.CLOSED, closed.getStatus());
    }
}
