package com.meridian.keystone.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "part_usages")
public class PartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(name = "qty_used", nullable = false)
    private Integer qtyUsed;

    public PartUsage() {}

    public PartUsage(Long id, WorkOrder workOrder, Part part, Integer qtyUsed) {
        this.id = id;
        this.workOrder = workOrder;
        this.part = part;
        this.qtyUsed = qtyUsed;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public WorkOrder getWorkOrder() {
        return workOrder;
    }

    public void setWorkOrder(WorkOrder workOrder) {
        this.workOrder = workOrder;
    }

    public Part getPart() {
        return part;
    }

    public void setPart(Part part) {
        this.part = part;
    }

    public Integer getQtyUsed() {
        return qtyUsed;
    }

    public void setQtyUsed(Integer qtyUsed) {
        this.qtyUsed = qtyUsed;
    }
}
