package com.meridian.keystone.service;

import com.meridian.keystone.domain.Site;
import com.meridian.keystone.domain.Customer;
import com.meridian.keystone.repository.SiteRepository;
import com.meridian.keystone.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class SiteService {

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private CustomerRepository customerRepository;

    public List<Site> getSitesByCustomerId(Long customerId) {
        return siteRepository.findByCustomerId(customerId);
    }

    public Page<Site> searchSitesByCustomer(Long customerId, String name, Pageable pageable) {
        if (name == null || name.trim().isEmpty()) {
            return siteRepository.findByCustomerId(customerId, pageable);
        }
        return siteRepository.findByCustomerIdAndNameContainingIgnoreCase(customerId, name, pageable);
    }

    public List<Site> getAllSites() {
        return siteRepository.findAll();
    }

    public Site createSite(Long customerId, Site site) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        site.setCustomer(customer);
        return siteRepository.save(site);
    }
}
