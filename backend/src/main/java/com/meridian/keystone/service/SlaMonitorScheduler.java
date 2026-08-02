package com.meridian.keystone.service;

import com.meridian.keystone.domain.WorkOrder;
import com.meridian.keystone.domain.Status;
import com.meridian.keystone.repository.WorkOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SlaMonitorScheduler {

    private static final Logger logger = LoggerFactory.getLogger(SlaMonitorScheduler.class);

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Scheduled(fixedDelay = 60000) // Scan database every 60 seconds
    public void scanForSlaBreaches() {
        logger.info("Executing periodic SLA monitoring scan...");

        List<WorkOrder> activeOrders = workOrderRepository.findAll().stream()
                .filter(w -> w.getStatus() != Status.CLOSED 
                        && w.getStatus() != Status.CANCELLED 
                        && w.getStatus() != Status.COMPLETED)
                .toList();

        LocalDateTime now = LocalDateTime.now();
        int breachesFound = 0;

        for (WorkOrder wo : activeOrders) {
            if (wo.getSlaDueAt().isBefore(now)) {
                breachesFound++;
                logger.warn("SLA BREACH ALERT: Work Order [{}] ({}) has breached its SLA due date [{}]. Priority: {}",
                        wo.getCode(), wo.getTitle(), wo.getSlaDueAt(), wo.getPriority());
            } else if (wo.getSlaDueAt().isBefore(now.plusMinutes(30))) {
                logger.warn("SLA RISK WARNING: Work Order [{}] ({}) is near breach deadline. Due in less than 30 minutes at [{}]",
                        wo.getCode(), wo.getTitle(), wo.getSlaDueAt());
            }
        }

        if (breachesFound > 0) {
            logger.info("SLA Scan complete. Total breaches flagged: {}", breachesFound);
        }
    }
}
