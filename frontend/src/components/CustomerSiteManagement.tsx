import React, { useState, useEffect } from 'react';
import { Building, MapPin, Plus, List, Mail, Map, RefreshCw } from 'lucide-react';

interface CustomerSiteManagementProps {
  token: string;
}

export default function CustomerSiteManagement({ token }: CustomerSiteManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'sites'>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Customer Form State
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custError, setCustError] = useState<string | null>(null);
  
  // New Site Form State
  const [siteCustId, setSiteCustId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);

  const fetchManagementData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Customers
      const custResp = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (custResp.ok) {
        const custData = await custResp.json();
        setCustomers(custData.content || custData);
        if (custData.length > 0 && !siteCustId) {
          setSiteCustId(custData[0].id.toString());
        }
      }

      // 2. Fetch all Sites
      // For local demo, we map all sites of all seeded customers
      const allSites: any[] = [];
      const NexusSites = await fetch('/api/customers/2/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const MeridianSites = await fetch('/api/customers/1/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (MeridianSites.ok) {
        const mSites = await MeridianSites.json();
        allSites.push(...mSites);
      }
      if (NexusSites.ok) {
        const nSites = await NexusSites.json();
        allSites.push(...nSites);
      }
      setSites(allSites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagementData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError(null);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: custName,
          contactEmail: custEmail
        })
      });

      if (response.ok) {
        setCustName('');
        setCustEmail('');
        fetchManagementData();
      } else {
        const err = await response.json();
        setCustError(err.message || 'Failed to create customer.');
      }
    } catch (err) {
      setCustError('Server communication failed.');
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteError(null);

    if (!siteCustId) {
      setSiteError('Please select a customer first.');
      return;
    }

    try {
      const response = await fetch(`/api/customers/${siteCustId}/sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: siteName,
          address: siteAddress
        })
      });

      if (response.ok) {
        setSiteName('');
        setSiteAddress('');
        fetchManagementData();
      } else {
        const err = await response.json();
        setSiteError(err.message || 'Failed to create site.');
      }
    } catch (err) {
      setSiteError('Server communication failed.');
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Client & Site Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure customer records and physical facility directories</p>
        </div>
        <button onClick={fetchManagementData} className="btn btn-secondary">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Sub tabs nav */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setActiveSubTab('customers')} 
          className={`btn ${activeSubTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          <Building size={16} />
          <span>Customers</span>
        </button>
        <button 
          onClick={() => setActiveSubTab('sites')} 
          className={`btn ${activeSubTab === 'sites' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          <MapPin size={16} />
          <span>Sites</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading lists...</p>
        </div>
      ) : activeSubTab === 'customers' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Create Customer */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} />
              <span>Add Customer</span>
            </h3>
            
            {custError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
                {custError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label className="form-label">Customer Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Nexus Commercial Real Estate"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Billing/Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. billing@nexusre.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Create Client Profile
              </button>
            </form>
          </div>

          {/* Customer list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={18} />
              <span>Client Records</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {customers.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                      <Mail size={12} />
                      {c.contactEmail}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    ID: {c.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Create Site */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} />
              <span>Add Facility Site</span>
            </h3>
            
            {siteError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
                {siteError}
              </div>
            )}

            <form onSubmit={handleCreateSite}>
              <div className="form-group">
                <label className="form-label">Client Owner</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={siteCustId}
                  onChange={(e) => setSiteCustId(e.target.value)}
                  required
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Site Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Eastside Warehouse"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 789 Industrial Pkwy, Boston"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Register Facility Site
              </button>
            </form>
          </div>

          {/* Sites list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Map size={18} />
              <span>Registered Facilities</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sites.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                      <MapPin size={12} />
                      {s.address}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    Client ID: {s.customer ? s.customer.id : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
