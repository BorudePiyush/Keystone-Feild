package com.meridian.keystone.controller;

import com.meridian.keystone.domain.Customer;
import com.meridian.keystone.domain.Site;
import com.meridian.keystone.service.CustomerService;
import com.meridian.keystone.service.SiteService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;
    private final SiteService siteService;

    public CustomerController(
            CustomerService customerService,
            SiteService siteService) {

        this.customerService = customerService;
        this.siteService = siteService;
    }

    /**
     * Get all customers.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public List<Customer> getAllCustomers() {
        return customerService.getAllCustomers();
    }

    /**
     * Create a new customer.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public Customer createCustomer(
            @Valid @RequestBody Customer customer) {

        return customerService.createCustomer(customer);
    }

    /**
     * Get all sites belonging to a customer.
     */
    @GetMapping("/{id}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER', 'CUSTOMER')")
    public List<Site> getSites(
            @PathVariable("id") Long customerId) {

        return siteService.getSitesByCustomerId(customerId);
    }

    /**
     * Create a site for a customer.
     */
    @PostMapping("/{id}/sites")
    @PreAuthorize("hasAnyRole('MANAGER', 'DISPATCHER')")
    public Site createSite(
            @PathVariable("id") Long customerId,
            @Valid @RequestBody Site site) {

        return siteService.createSite(customerId, site);
    }
}