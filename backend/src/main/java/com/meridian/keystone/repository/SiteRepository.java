package com.meridian.keystone.repository;

import com.meridian.keystone.domain.Site;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SiteRepository extends JpaRepository<Site, Long> {
    List<Site> findByCustomerId(Long customerId);
    Page<Site> findByCustomerId(Long customerId, Pageable pageable);
    Page<Site> findByCustomerIdAndNameContainingIgnoreCase(Long customerId, String name, Pageable pageable);
}
