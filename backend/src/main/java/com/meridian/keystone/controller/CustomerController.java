package com.meridian.keystone.controller;

import com.meridian.keystone.domain.Customer;
import com.meridian.keystone.domain.Site;
import com.meridian.keystone.service.CustomerService;
import com.meridian.keystone.service.SiteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private SiteService siteService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public List<Customer> getAllCustomers() {
        return customerService.getAllCustomers();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public Customer createCustomer(@Valid @RequestBody Customer customer) {
        return customerService.createCustomer(customer);
    }

    @GetMapping("/{id}/sites")
    public List<Site> getSites(@PathVariable("id") Long customerId) {
        return siteService.getSitesByCustomerId(customerId);
    }

    @PostMapping("/{id}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public Site createSite(@PathVariable("id") Long customerId, @Valid @RequestBody Site site) {
        return siteService.createSite(customerId, site);
    }
}
