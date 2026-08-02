package com.meridian.keystone.repository;

import com.meridian.keystone.domain.TimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {
    List<TimeLog> findByWorkOrderId(Long workOrderId);
    List<TimeLog> findByTechnicianId(Long technicianId);
}
