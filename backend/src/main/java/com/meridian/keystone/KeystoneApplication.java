package com.meridian.keystone;

import com.meridian.keystone.domain.Role;
import com.meridian.keystone.domain.User;
import com.meridian.keystone.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class KeystoneApplication {

    public static void main(String[] args) {
        SpringApplication.run(KeystoneApplication.class, args);
    }

    @Bean
    public CommandLineRunner initDefaultUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String defaultHash = passwordEncoder.encode("password");

            createOrUpdateUser(userRepository, "John Manager", "manager@keystone.com", "+15550001", Role.MANAGER, defaultHash);
            createOrUpdateUser(userRepository, "Sarah Dispatcher", "dispatcher@keystone.com", "+15550002", Role.DISPATCHER, defaultHash);
            createOrUpdateUser(userRepository, "Dave Tech (HVAC)", "tech1@keystone.com", "+15550003", Role.TECHNICIAN, defaultHash);
            createOrUpdateUser(userRepository, "Mike Tech (Plumbing)", "tech2@keystone.com", "+15550004", Role.TECHNICIAN, defaultHash);
            createOrUpdateUser(userRepository, "Alice Customer (Meridian)", "customer@keystone.com", "+15550005", Role.CUSTOMER, defaultHash);
            createOrUpdateUser(userRepository, "Bob Customer (Nexus)", "customer2@keystone.com", "+15550006", Role.CUSTOMER, defaultHash);
        };
    }

    private void createOrUpdateUser(UserRepository userRepository, String name, String email, String phone, Role role, String passwordHash) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            return newUser;
        });

        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        user.setPasswordHash(passwordHash);
        userRepository.save(user);
    }
}
