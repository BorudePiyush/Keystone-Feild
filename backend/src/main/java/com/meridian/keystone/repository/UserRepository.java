package com.meridian.keystone.repository;

import com.meridian.keystone.domain.User;
import com.meridian.keystone.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByPhone(String phone);
    List<User> findByRole(Role role);
}
