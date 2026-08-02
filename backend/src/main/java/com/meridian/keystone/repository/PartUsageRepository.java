package com.meridian.keystone.repository;

import com.meridian.keystone.domain.PartUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PartUsageRepository extends JpaRepository<PartUsage, Long> {
    List<PartUsage> findByWorkOrderId(Long workOrderId);
}
