package com.meridian.keystone.repository;

import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.domain.Status;
import com.meridian.keystone.domain.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {

    Optional<WorkOrder> findByCode(String code);

    @Query("SELECT w FROM WorkOrder w WHERE " +
           "(:customerId IS NULL OR w.customer.id = :customerId) AND " +
           "(:assignedToId IS NULL OR w.assignedTo.id = :assignedToId) AND " +
           "(:status IS NULL OR w.status = :status) AND " +
           "(:priority IS NULL OR w.priority = :priority) AND " +
           "(:searchTerm IS NULL OR LOWER(w.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(w.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "OR LOWER(w.code) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<WorkOrder> searchWorkOrders(
            @Param("customerId") Long customerId,
            @Param("assignedToId") Long assignedToId,
            @Param("status") Status status,
            @Param("priority") Priority priority,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    long countByStatus(Status status);
    
    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status <> 'CLOSED' AND w.status <> 'CANCELLED' AND w.slaDueAt < CURRENT_TIMESTAMP")
    long countOverdueWorkOrders();

    java.util.List<WorkOrder> findByAssignedToId(Long assignedToId);
    java.util.List<WorkOrder> findByCustomerId(Long customerId);
}
