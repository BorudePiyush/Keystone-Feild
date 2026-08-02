import React, { useState, useEffect } from 'react';
import { Clock, Hammer, Clipboard, Play, AlertCircle, CheckCircle, Package, Send, RefreshCw, MapPin } from 'lucide-react';

interface TechnicianViewProps {
  token: string;
  technicianEmail: string;
  userRole?: string;
  onRefreshTrigger?: () => void;
}

export default function TechnicianView({ token, technicianEmail, userRole, onRefreshTrigger }: TechnicianViewProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Log Time Form state
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [timeNote, setTimeNote] = useState('');
  
  // Log Parts Form state
  const [partsList, setPartsList] = useState<any[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partError, setPartError] = useState<string | null>(null);
  const [partSuccess, setPartSuccess] = useState(false);
  const [timeSuccess, setTimeSuccess] = useState(false);

  const fetchAssignedJobs = async () => {
    setLoading(true);
    try {
      // Find my tech user id from seed or call API
      const response = await fetch('/api/work-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const allOrders = await response.json();
        const content = allOrders.content || allOrders;
        // Filter jobs assigned to the logged in technician
        // The mock backend resolves current user by JWT.
        // For local robustness, we display all assigned work orders or filter by role.
        const assignedJobs = content.filter((w: any) => w.assignedTo && w.assignedTo.email === technicianEmail);
        setJobs(assignedJobs);
        
        // If selected job is active, reload its details
        if (selectedJob) {
          const freshDetail = content.find((w: any) => w.id === selectedJob.id);
          if (freshDetail) {
            setSelectedJob(freshDetail);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartsInventory = async () => {
    try {
      // Fetch parts list or set mocks
      setPartsList([
        { id: 1, name: 'HVAC Air Filter 20x20', sku: 'PART-HVAC-FILT-01', stockQty: 50 },
        { id: 2, name: 'Copper Pipe 1/2 inch 10ft', sku: 'PART-PLUMB-PIPE-02', stockQty: 30 },
        { id: 3, name: 'LED Troffer Light 2x4', sku: 'PART-ELEC-LED-03', stockQty: 20 },
        { id: 4, name: 'Thermostat Digital Programmable', sku: 'PART-HVAC-THERM-04', stockQty: 10 },
        { id: 5, name: 'Brass Ball Valve 1/2 inch', sku: 'PART-PLUMB-VALV-05', stockQty: 40 }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Duty Status state
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(false);

  // Log Ticket Expenses state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Fuel/Travel');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSuccess, setExpenseSuccess] = useState(false);

  const fetchDutyStatus = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsOnDuty(data.isOnDuty || false);
      }
    } catch (err) {
      console.error('Failed to load profile duty status:', err);
    }
  };

  const fetchExpenses = async (jobId: number) => {
    try {
      const response = await fetch(`/api/users/expenses/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDutyToggle = async () => {
    setDutyLoading(true);
    const newStatus = !isOnDuty;
    
    let lat: number | null = null;
    let lon: number | null = null;

    if (newStatus) {
      if (navigator.geolocation) {
        try {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                lat = position.coords.latitude;
                lon = position.coords.longitude;
                resolve();
              },
              (error) => {
                console.warn('Geolocation failed, using default coordinates', error);
                lat = 40.7580;
                lon = -73.9855;
                resolve();
              },
              { timeout: 3000 }
            );
          });
        } catch {
          lat = 40.7580;
          lon = -73.9855;
        }
      }
      if (lat === null || lon === null) {
        lat = 40.7580;
        lon = -73.9855;
      }
    }

    try {
      const response = await fetch('/api/users/duty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isOnDuty: newStatus,
          latitude: lat,
          longitude: lon
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsOnDuty(data.isOnDuty ?? newStatus);
      } else {
        const errText = await response.text().catch(() => '');
        let errMsg = 'Failed to update duty status';
        try {
          const parsed = JSON.parse(errText);
          if (parsed.message) errMsg = parsed.message;
        } catch {}
        alert(`Duty Update Notice: ${errMsg}`);
      }
    } catch (err) {
      alert('Error connecting to status API');
    } finally {
      setDutyLoading(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !expenseAmount) return;

    setExpenseSuccess(false);
    try {
      const response = await fetch('/api/users/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workOrderId: selectedJob.id,
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          note: expenseNote
        })
      });

      if (response.ok) {
        setExpenseSuccess(true);
        setExpenseAmount('');
        setExpenseNote('');
        fetchExpenses(selectedJob.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      fetchExpenses(selectedJob.id);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchAssignedJobs();
    fetchPartsInventory();
    fetchDutyStatus();
  }, [technicianEmail]);

  const handleStatusChange = async (jobId: number, targetStatus: string) => {
    try {
      const response = await fetch(`/api/work-orders/${jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          status: targetStatus,
          note: `Technician changed status to ${targetStatus}`
        })
      });
      if (response.ok) {
        fetchAssignedJobs();
        if (onRefreshTrigger) onRefreshTrigger();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Action rejected'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    setTimeSuccess(false);
    try {
      const response = await fetch(`/api/work-orders/${selectedJob.id}/time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          minutes: timeMinutes.toString(),
          note: timeNote
        })
      });
      if (response.ok) {
        setTimeSuccess(true);
        setTimeNote('');
        fetchAssignedJobs();
        if (onRefreshTrigger) onRefreshTrigger();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogParts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !selectedPartId) return;

    setPartError(null);
    setPartSuccess(false);

    const part = partsList.find(p => p.id === parseInt(selectedPartId));
    if (part && part.stockQty < partQty) {
      setPartError(`Insufficient stock. Available quantity: ${part.stockQty}`);
      return;
    }

    try {
      const response = await fetch(`/api/work-orders/${selectedJob.id}/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          partId: selectedPartId,
          qtyUsed: partQty.toString()
        })
      });

      if (response.ok) {
        setPartSuccess(true);
        // Local decrement of stock for demo purposes
        setPartsList(prev => prev.map(p => {
          if (p.id === parseInt(selectedPartId)) {
            return { ...p, stockQty: p.stockQty - partQty };
          }
          return p;
        }));
        setSelectedPartId('');
        setPartQty(1);
        fetchAssignedJobs();
        if (onRefreshTrigger) onRefreshTrigger();
      } else {
        const error = await response.json();
        setPartError(error.message || 'Failed to log parts usage.');
      }
    } catch (err) {
      setPartError('Connection to server failed.');
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Technician Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mobile field logs & status dashboard</p>
        </div>
        <button onClick={fetchAssignedJobs} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', height: '36px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading assigned work orders...</p>
        </div>
      ) : selectedJob ? (
        // Job Detail & Interaction View
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <button onClick={() => setSelectedJob(null)} className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            &larr; Back to Job List
          </button>

          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span className="card-code" style={{ fontSize: '0.85rem' }}>{selectedJob.code}</span>
              <span className={`card-priority priority-${selectedJob.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                {selectedJob.priority}
              </span>
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.40rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#a5b4fc', fontWeight: 600 }}>
                {selectedJob.status.replace('_', ' ')}
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem' }}>{selectedJob.title}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Site: <strong>{selectedJob.site ? selectedJob.site.name : 'N/A'}</strong> ({selectedJob.site ? selectedJob.site.address : ''})
            </p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Job Details</span>
            {selectedJob.description || 'No description provided.'}
          </div>

          {/* Quick status controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Update Job Status</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {selectedJob.status === 'ASSIGNED' && (
                <button onClick={() => handleStatusChange(selectedJob.id, 'IN_PROGRESS')} className="btn btn-primary" style={{ flex: 1, height: '40px' }}>
                  <Play size={16} />
                  <span>Start Work</span>
                </button>
              )}
              {selectedJob.status === 'IN_PROGRESS' && (
                <>
                  <button onClick={() => handleStatusChange(selectedJob.id, 'ON_HOLD')} className="btn btn-secondary" style={{ flex: 1, borderColor: 'var(--color-hold)', color: 'var(--color-hold)', height: '40px' }}>
                    <span>Hold Job</span>
                  </button>
                  <button onClick={() => handleStatusChange(selectedJob.id, 'COMPLETED')} className="btn btn-primary" style={{ flex: 1, background: 'var(--secondary)', height: '40px' }}>
                    <CheckCircle size={16} />
                    <span>Complete Job</span>
                  </button>
                </>
              )}
              {selectedJob.status === 'ON_HOLD' && (
                <button onClick={() => handleStatusChange(selectedJob.id, 'IN_PROGRESS')} className="btn btn-primary" style={{ flex: 1, height: '40px' }}>
                  <span>Resume Work</span>
                </button>
              )}
              {(selectedJob.status === 'COMPLETED' || selectedJob.status === 'CLOSED' || selectedJob.status === 'CANCELLED') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={18} />
                  <span>This job is completed/closed. No further actions required.</span>
                </div>
              )}
            </div>
          </div>

          {selectedJob.status === 'IN_PROGRESS' && (
            <>
              {/* Log Labor Time form */}
              <form onSubmit={handleLogTime} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> Log Labor Time
                </span>

                {timeSuccess && (
                  <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                    &check; Time logged successfully!
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Minutes</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '100%' }}
                      min="5" 
                      step="5"
                      value={timeMinutes} 
                      onChange={(e) => setTimeMinutes(parseInt(e.target.value))} 
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Labor Notes</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '100%' }}
                    placeholder="Describe what was done..." 
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1rem' }}>
                  <Send size={14} />
                  <span>Save Labor Time</span>
                </button>
              </form>

              {/* Log Part Consumption form */}
              <form onSubmit={handleLogParts} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Package size={12} /> Log Part Consumption
                </span>

                {partError && (
                  <div style={{ color: 'var(--color-cancelled)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={14} />
                    <span>{partError}</span>
                  </div>
                )}
                {partSuccess && (
                  <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                    &check; Part usage logged successfully!
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label">Part Name</label>
                    <select
                      className="form-input"
                      style={{ width: '100%' }}
                      value={selectedPartId}
                      onChange={(e) => setSelectedPartId(e.target.value)}
                      required
                    >
                      <option value="">Select Part...</option>
                      {partsList.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQty})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%' }}
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1rem' }}>
                  <Send size={14} />
                  <span>Log Part Used</span>
                </button>
              </form>

              {/* Log Ticket Expenses form */}
              <form onSubmit={handleLogExpense} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  💳 Log Fuel & Ticket Expenses
                </span>

                {expenseSuccess && (
                  <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                    &check; Expense logged successfully!
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      style={{ width: '100%' }}
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      required
                    >
                      <option value="Fuel/Travel">Fuel / Mileage</option>
                      <option value="Materials">Parts & Materials</option>
                      <option value="Tools">Tools Purchase</option>
                      <option value="Meals/Misc">Meals & Miscellaneous</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Amount ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%' }}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Expense Note</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Fuel purchase receipt..."
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1rem' }}>
                  <Send size={14} />
                  <span>Log Ticket Expense</span>
                </button>
              </form>

              {/* Expenses logged list */}
              {expenses.length > 0 && (
                <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Logged Expenses</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {expenses.map((exp) => (
                      <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.2rem' }}>
                        <div>
                          <strong>{exp.category}</strong>: <span style={{ color: 'var(--text-muted)' }}>{exp.note}</span>
                        </div>
                        <span style={{ color: 'var(--color-hold)', fontWeight: 600 }}>${exp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // Jobs list
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Duty Status Geotagged Check-In Widget */}
          <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: isOnDuty ? '4px solid var(--color-completed)' : '4px solid rgba(255,255,255,0.1)' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Field Duty Attendance</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isOnDuty ? '✓ Checked In - Live GPS Tracking active' : '✖ Checked Out - Offline'}
              </p>
            </div>
            <button 
              onClick={handleDutyToggle} 
              className={`btn ${isOnDuty ? 'btn-secondary' : 'btn-primary'}`} 
              disabled={dutyLoading}
              style={{ height: '36px', fontSize: '0.8rem', padding: '0 1rem' }}
            >
              {dutyLoading ? 'Updating...' : isOnDuty ? 'Check Out' : 'Check In (GPS)'}
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Hammer size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
              <p>No active work orders assigned to you.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div 
                key={job.id} 
                className="glass-card fade-in" 
                style={{ cursor: 'pointer', padding: '1.25rem', borderLeftWidth: '5px', borderLeftColor: getStatusColor(job.status) }}
                onClick={() => setSelectedJob(job)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="card-code">{job.code}</span>
                  <span className={`card-priority priority-${job.priority.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                    {job.priority}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{job.title}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <MapPin size={12} />
                  <span>{job.site ? job.site.name : 'N/A'}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: getStatusColor(job.status) }}>{job.status.replace('_', ' ')}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Due: {new Date(job.slaDueAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
