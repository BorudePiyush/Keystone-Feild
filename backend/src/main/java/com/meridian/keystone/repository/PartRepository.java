package com.meridian.keystone.repository;

import com.meridian.keystone.domain.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PartRepository extends JpaRepository<Part, Long> {
    Optional<Part> findBySku(String sku);
}
