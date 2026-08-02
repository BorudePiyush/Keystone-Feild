package com.meridian.keystone.service;

import com.meridian.keystone.domain.Customer;
import com.meridian.keystone.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Page<Customer> searchCustomers(String name, Pageable pageable) {
        if (name == null || name.trim().isEmpty()) {
            return customerRepository.findAll(pageable);
        }
        return customerRepository.findByNameContainingIgnoreCase(name, pageable);
    }

    public Customer createCustomer(Customer customer) {
        return customerRepository.save(customer);
    }
}
