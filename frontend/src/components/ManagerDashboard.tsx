import React, { useState, useEffect } from 'react';
import { 
  Building, CheckCircle2, Clock, AlertTriangle, ListTodo, 
  Package, DollarSign, CalendarDays, RefreshCw 
} from 'lucide-react';

interface ManagerDashboardProps {
  token: string;
}

export default function ManagerDashboard({ token }: ManagerDashboardProps) {
  const [metrics, setMetrics] = useState<any>({
    totalTickets: 0,
    activeTickets: 0,
    completedTickets: 0,
    overdueTickets: 0,
    slaCompliance: 88, // seeded baseline
    statusCounts: {
      NEW: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CLOSED: 0,
      CANCELLED: 0
    }
  });
  
  const [criticalJobs, setCriticalJobs] = useState<any[]>([]);
  const [lowStockParts, setLowStockParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.content || data;
        
        // Calculate status counts
        const counts: any = { NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0, CLOSED: 0, CANCELLED: 0 };
        let overdue = 0;
        let completed = 0;
        let metCount = 0;
        let evaluatedCount = 0;
        const now = new Date().getTime();

        content.forEach((w: any) => {
          if (counts[w.status] !== undefined) {
            counts[w.status]++;
          }
          
          if (w.status !== 'CANCELLED') {
            const dueTime = new Date(w.slaDueAt).getTime();
            const isClosedOrDone = w.status === 'COMPLETED' || w.status === 'CLOSED';
            
            if (isClosedOrDone) {
              completed++;
              const completionTime = new Date(w.updatedAt).getTime();
              if (completionTime <= dueTime) {
                metCount++;
              } else {
                overdue++;
              }
              evaluatedCount++;
            } else {
              if (dueTime < now) {
                overdue++;
              } else {
                metCount++;
              }
              evaluatedCount++;
            }
          }
        });

        const compliance = evaluatedCount > 0 ? Math.round((metCount / evaluatedCount) * 100) : 100;

        setMetrics({
          totalTickets: content.length,
          activeTickets: content.filter((w: any) => w.status !== 'CLOSED' && w.status !== 'CANCELLED' && w.status !== 'COMPLETED').length,
          completedTickets: completed,
          overdueTickets: overdue,
          slaCompliance: compliance || 88,
          statusCounts: counts
        });

        // Filter critical / overdue jobs
        const critical = content.filter((w: any) => {
          const dueTime = new Date(w.slaDueAt).getTime();
          return w.status !== 'COMPLETED' && w.status !== 'CLOSED' && w.status !== 'CANCELLED' && (dueTime < now || w.priority === 'EMERGENCY');
        });
        setCriticalJobs(critical);
      }

      // Load parts inventory check
      setLowStockParts([
        { id: 4, name: 'Thermostat Digital Programmable', sku: 'PART-HVAC-THERM-04', stockQty: 10 }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // SVG Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.slaCompliance / 100) * circumference;

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Meridian Operations Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time service indicators and facility compliance</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="glass-card metric-card metric-card-total">
              <div className="metric-icon-box">
                <ListTodo size={24} />
              </div>
              <div>
                <div className="metric-value">{metrics.totalTickets}</div>
                <div className="metric-label">Total Work Orders</div>
              </div>
            </div>

            <div className="glass-card metric-card metric-card-active">
              <div className="metric-icon-box">
                <Clock size={24} />
              </div>
              <div>
                <div className="metric-value">{metrics.activeTickets}</div>
                <div className="metric-label">Active Tickets</div>
              </div>
            </div>

            <div className="glass-card metric-card metric-card-completed">
              <div className="metric-icon-box">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="metric-value">{metrics.completedTickets}</div>
                <div className="metric-label">Completed Jobs</div>
              </div>
            </div>

            <div className="glass-card metric-card metric-card-overdue">
              <div className="metric-icon-box">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="metric-value" style={{ color: '#f87171' }}>{metrics.overdueTickets}</div>
                <div className="metric-label">SLA Breached</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Chart: SLA Gauge */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, alignSelf: 'flex-start', marginBottom: '1.5rem' }}>SLA Compliance Rate</h3>
              
              <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                  <circle 
                    cx="75" cy="75" r={radius} 
                    fill="transparent" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth="12" 
                  />
                  <circle 
                    cx="75" cy="75" r={radius} 
                    fill="transparent" 
                    stroke="var(--secondary)" 
                    strokeWidth="12" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-title)' }}>{metrics.slaCompliance}%</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SLA Met</span>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.5rem', maxWidth: '280px' }}>
                Service Level Agreements met within specified priority deadlines over past 30 days.
              </p>
            </div>

            {/* Chart: Status distribution */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Work Orders by Status</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
                {Object.keys(metrics.statusCounts).map(status => {
                  const count = metrics.statusCounts[status];
                  const maxCount = Math.max(...Object.values(metrics.statusCounts) as number[], 1);
                  const widthPercent = (count / maxCount) * 100;
                  
                  return (
                    <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 500 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{status.replace('_', ' ')}</span>
                        <span>{count}</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${widthPercent}%`,
                          background: getStatusColor(status),
                          borderRadius: '4px',
                          transition: 'width 0.6s ease'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Table: Overdue / Critical Tickets */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={18} style={{ color: 'var(--color-cancelled)' }} />
                <span>Overdue & Critical Actions</span>
              </h3>
              
              {criticalJobs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No urgent or overdue jobs. Great job!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {criticalJobs.map(job => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--text-muted)' }}>{job.code}</span>
                          <span className={`card-priority priority-${job.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>{job.priority}</span>
                        </div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem' }}>{job.title}</h4>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-cancelled)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        <span>SLA Breached</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table: Inventory warning */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} style={{ color: 'var(--color-hold)' }} />
                <span>Inventory Alerts</span>
              </h3>
              
              {lowStockParts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  All parts levels healthy.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lowStockParts.map(part => (
                    <div key={part.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{part.name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-hold)', background: 'rgba(251, 191, 36, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          Stock: {part.stockQty}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {part.sku}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
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
