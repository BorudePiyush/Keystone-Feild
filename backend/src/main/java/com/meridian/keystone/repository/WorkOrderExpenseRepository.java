package com.meridian.keystone.repository;

import com.meridian.keystone.domain.WorkOrderExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkOrderExpenseRepository extends JpaRepository<WorkOrderExpense, Long> {
    List<WorkOrderExpense> findByWorkOrderId(Long workOrderId);
}
