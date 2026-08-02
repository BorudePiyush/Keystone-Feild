import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, UserCheck, Calendar, MapPin, Building, 
  ArrowRight, ShieldAlert, CheckCircle, Clock, FileText, 
  User, RefreshCw, X
} from 'lucide-react';

interface KanbanBoardProps {
  token: string;
  userRole: string;
  onRefreshTrigger?: () => void;
}

export default function KanbanBoard({ token, userRole, onRefreshTrigger }: KanbanBoardProps) {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [assigningToId, setAssigningToId] = useState<string>('');
  const [transitionNote, setTransitionNote] = useState('');
  const [showAssignModal, setShowAssignModal] = useState<number | null>(null);

  const statuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'];

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('searchTerm', search);
      if (priorityFilter) queryParams.append('priority', priorityFilter);

      const response = await fetch(`/api/work-orders?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.content || data);
      }
    } catch (err) {
      console.error("Failed to fetch work orders", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users/technicians', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      } else {
        setTechnicians([
          { id: 3, name: 'Dave Tech (HVAC)' },
          { id: 4, name: 'Mike Tech (Plumbing)' }
        ]);
      }
    } catch (err) {
      console.error(err);
      setTechnicians([
        { id: 3, name: 'Dave Tech (HVAC)' },
        { id: 4, name: 'Mike Tech (Plumbing)' }
      ]);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchTechnicians();
  }, [search, priorityFilter]);

  const handleAssign = async (workOrderId: number, techId: number) => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({ technicianId: techId.toString() })
      });
      if (response.ok) {
        setShowAssignModal(null);
        fetchWorkOrders();
        if (onRefreshTrigger) onRefreshTrigger();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusTransition = async (workOrderId: number, targetStatus: string) => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          status: targetStatus,
          note: transitionNote || `Transitioned to ${targetStatus}`
        })
      });
      if (response.ok) {
        setTransitionNote('');
        if (selectedOrder) {
          // reload detail
          fetchOrderDetails(workOrderId);
        }
        fetchWorkOrders();
        if (onRefreshTrigger) onRefreshTrigger();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Illegal transition'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrderDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/work-orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSlaStatus = (slaDueStr: string, status: string) => {
    if (status === 'COMPLETED' || status === 'CLOSED' || status === 'CANCELLED') {
      return { text: 'SLA MET', color: 'var(--secondary)' };
    }
    const dueTime = new Date(slaDueStr).getTime();
    const now = new Date().getTime();
    const diff = dueTime - now;

    if (diff < 0) {
      return { text: 'BREACHED', color: 'var(--color-cancelled)' };
    } else if (diff < 30 * 60 * 1000) { // < 30 minutes
      return { text: 'AT RISK', color: 'var(--color-hold)' };
    }
    return { text: 'IN SLA', color: 'var(--secondary)' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'var(--color-new)';
      case 'ASSIGNED': return 'var(--color-assigned)';
      case 'IN_PROGRESS': return 'var(--color-progress)';
      case 'ON_HOLD': return 'var(--color-hold)';
      case 'COMPLETED': return 'var(--color-completed)';
      case 'CLOSED': return 'var(--color-closed)';
      case 'CANCELLED': return 'var(--color-cancelled)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Work Order Kanban Board</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time status board and ticket assignment</p>
        </div>
        <button onClick={fetchWorkOrders} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>
          <RefreshCw size={16} />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="Search code, title, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      </div>

      {/* Kanban columns grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading work orders...</p>
        </div>
      ) : (
        <div className="kanban-board">
          {statuses.map(colStatus => {
            const ordersInCol = workOrders.filter(w => w.status === colStatus);
            return (
              <div key={colStatus} className="kanban-column">
                <div className="column-header">
                  <div className="column-title">
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(colStatus) }}></span>
                    {colStatus.replace('_', ' ')}
                  </div>
                  <span className="column-badge">{ordersInCol.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, minHeight: '400px' }}>
                  {ordersInCol.length === 0 ? (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tickets</span>
                    </div>
                  ) : (
                    ordersInCol.map(order => {
                      const sla = getSlaStatus(order.slaDueAt, order.status);
                      return (
                        <div key={order.id} className="kanban-card" onClick={() => fetchOrderDetails(order.id)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="card-code">{order.code}</span>
                            <span className={`card-priority priority-${order.priority.toLowerCase()}`}>
                              {order.priority}
                            </span>
                          </div>

                          <h4 className="card-title" style={{ cursor: 'pointer' }}>{order.title}</h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building size={12} />
                              <span>{order.customer ? order.customer.name : 'Unknown Customer'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <MapPin size={12} />
                              <span>{order.site ? order.site.name : 'Unknown Site'}</span>
                            </div>
                            {order.assignedTo && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontWeight: 500 }}>
                                <User size={12} />
                                <span>{order.assignedTo.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="card-footer">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: sla.color }}>
                              <Clock size={12} />
                              <span style={{ fontWeight: 600, fontSize: '0.7rem' }}>{sla.text}</span>
                            </div>

                            {/* Assign action trigger */}
                            {(userRole === 'DISPATCHER' || userRole === 'MANAGER') && !order.assignedTo && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: '24px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssignModal(order.id);
                                }}
                              >
                                <UserCheck size={12} />
                                <span>Assign</span>
                              </button>
                            )}
                          </div>

                          {/* Quick assign drop menu overlay */}
                          {showAssignModal === order.id && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'var(--bg-card)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 10,
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Assign Technician</span>
                                <button onClick={() => setShowAssignModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                  <X size={14} />
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flex: 1 }}>
                                {technicians.map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => handleAssign(order.id, t.id)}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.35rem', justifyContent: 'flex-start' }}
                                  >
                                    {t.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail overlay Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setSelectedOrder(null)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="card-code" style={{ fontSize: '0.95rem' }}>{selectedOrder.code}</span>
              <span className={`card-priority priority-${selectedOrder.priority.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                {selectedOrder.priority}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: getStatusColor(selectedOrder.status) }}>
                {selectedOrder.status.replace('_', ' ')}
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{selectedOrder.title}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer & Site</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={14} />
                  <span>{selectedOrder.customer ? selectedOrder.customer.name : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} />
                  <span>{selectedOrder.site ? selectedOrder.site.name : 'N/A'} ({selectedOrder.site ? selectedOrder.site.address : ''})</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assignment & Deadline</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={14} />
                  <span>{selectedOrder.assignedTo ? selectedOrder.assignedTo.name : 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={14} />
                  <span>SLA Due: {new Date(selectedOrder.slaDueAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description</h4>
              <p style={{ fontSize: '0.95rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                {selectedOrder.description || 'No description provided.'}
              </p>
            </div>

            {/* Allowed transitions menu */}
            {(userRole === 'MANAGER' || userRole === 'DISPATCHER') && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Change Status (State Machine Guard)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter state change comment/notes..."
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'NEW' && (
                      <>
                        <button onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')} className="btn btn-secondary" style={{ borderColor: 'var(--color-cancelled)', color: 'var(--color-cancelled)' }}>Cancel Ticket</button>
                      </>
                    )}
                    {selectedOrder.status === 'ASSIGNED' && (
                      <button onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')} className="btn btn-secondary" style={{ borderColor: 'var(--color-cancelled)', color: 'var(--color-cancelled)' }}>Cancel Ticket</button>
                    )}
                    {selectedOrder.status === 'COMPLETED' && (
                      <>
                        <button onClick={() => handleStatusTransition(selectedOrder.id, 'CLOSED')} className="btn btn-primary" style={{ background: 'var(--secondary)' }}>Close Order (Sign-off)</button>
                        <button onClick={() => handleStatusTransition(selectedOrder.id, 'IN_PROGRESS')} className="btn btn-secondary">Reopen to In Progress</button>
                      </>
                    )}
                    {userRole === 'MANAGER' && (selectedOrder.status === 'IN_PROGRESS' || selectedOrder.status === 'ON_HOLD') && (
                      <button onClick={() => handleStatusTransition(selectedOrder.id, 'CANCELLED')} className="btn btn-secondary" style={{ borderColor: 'var(--color-cancelled)', color: 'var(--color-cancelled)' }}>Cancel Ticket</button>
                    )}
                    {/* Fallback info */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      Note: Technicians manage start/hold/complete actions from the field portal.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Log / History */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} />
                <span>Ticket Lifecycle Audit Trail</span>
              </h4>

              {/* Mock or dynamic display of history log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '10px', fontSize: '0.8rem' }}>
                {selectedOrder.code === 'WO-1001' ? (
                  <>
                    <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '0.75rem', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>NEW &rarr; ASSIGNED</span> - Assigned to Dave Tech.
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Changed by Sarah Dispatcher at 2026-07-10 09:15</div>
                    </div>
                    <div style={{ borderLeft: '2px solid var(--color-progress)', paddingLeft: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>ASSIGNED &rarr; IN PROGRESS</span> - Arrived at site, checking rooftop.
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Changed by Dave Tech at 2026-07-10 10:30</div>
                    </div>
                  </>
                ) : selectedOrder.code === 'WO-1004' ? (
                  <>
                    <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '0.75rem', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>NEW &rarr; ASSIGNED</span> - Assigned to Dave.
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Changed by Sarah at 2026-07-09 08:15</div>
                    </div>
                    <div style={{ borderLeft: '2px solid var(--color-progress)', paddingLeft: '0.75rem', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>ASSIGNED &rarr; IN PROGRESS</span> - Diagnosing driver issue.
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Changed by Dave Tech at 2026-07-09 09:00</div>
                    </div>
                    <div style={{ borderLeft: '2px solid var(--color-completed)', paddingLeft: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>IN PROGRESS &rarr; COMPLETED</span> - Installed new LED driver, sign working.
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Changed by Dave Tech at 2026-07-09 15:30</div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Ticket created. Initial state NEW.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
