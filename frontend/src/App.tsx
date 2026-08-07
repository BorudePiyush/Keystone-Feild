import React, { useState, useEffect } from 'react';
import { 
  Shield, Kanban, LayoutDashboard, MapPin, 
  Wrench, FileEdit, LogOut, UserCircle, Compass 
} from 'lucide-react';
import AuthView from './components/AuthView';
import KanbanBoard from './components/KanbanBoard';
import TechnicianView from './components/TechnicianView';
import CustomerPortal from './components/CustomerPortal';
import ManagerDashboard from './components/ManagerDashboard';
import CustomerSiteManagement from './components/CustomerSiteManagement';
import UserProfileView from './components/UserProfileView';
import LiveTrackingMap from './components/LiveTrackingMap';

interface UserState {
  email: string;
  name: string;
  role: string;
}

const viewMeta: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Operations Command Center',
    subtitle: 'Live SLA, ticket and inventory intelligence for managers',
  },
  board: {
    title: 'Work Order Control Board',
    subtitle: 'Track the pipeline from intake to closure',
  },
  sites: {
    title: 'Client Sites',
    subtitle: 'Manage facilities and customer locations',
  },
  tracking: {
    title: 'Staff Tracking Radar',
    subtitle: 'Monitor on-duty technicians on the map',
  },
  tech: {
    title: 'Field Technician Workspace',
    subtitle: 'Review assigned jobs and update work progress',
  },
  customer: {
    title: 'Customer Service Portal',
    subtitle: 'Submit and monitor maintenance requests',
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Manage account details and service history',
  },
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('keystone_token'));
  const [user, setUser] = useState<UserState | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  // Load user details from token payload or local state
  useEffect(() => {
    if (token) {
      // Validate token with backend profile endpoint
      fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (!res.ok) {
          console.warn('Backend rejected current token, logging out');
          handleLogout();
          return;
        }
        return res.json();
      }).then(profile => {
        if (profile) {
          setUser({
            email: profile.email,
            name: profile.name,
            role: profile.role
          });
        }
      }).catch(() => {
        // Network error fallback
      });

      // Decode JWT token payload
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const userDetails = {
          email: decodedPayload.sub,
          name: decodedPayload.name || 'User',
          role: decodedPayload.role,
        };
        setUser(prev => prev || userDetails);
        
        // Auto-select initial active tab based on role
        if (!activeTab) {
          if (userDetails.role === 'MANAGER') {
            setActiveTab('dashboard');
          } else if (userDetails.role === 'DISPATCHER') {
            setActiveTab('board');
          } else if (userDetails.role === 'TECHNICIAN') {
            setActiveTab('tech');
          } else if (userDetails.role === 'CUSTOMER') {
            setActiveTab('customer');
          }
        }
      } catch (err) {
        console.error("Token decoding error, logging out", err);
        handleLogout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, userDetails: UserState) => {
    localStorage.setItem('keystone_token', newToken);
    setToken(newToken);
    setUser(userDetails);
  };

  const handleProfileUpdate = (newToken: string, updatedUser: UserState) => {
    localStorage.setItem('keystone_token', newToken);
    setToken(newToken);
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('keystone_token');
    setToken(null);
    setUser(null);
    setActiveTab('');
  };

  if (!token || !user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  const currentView = viewMeta[activeTab] || {
    title: 'Welcome to Keystone',
    subtitle: 'Select a workspace from the sidebar to begin',
  };

  // Sidebar navigation options depending on role
  const getNavLinks = () => {
    const links = [];
    if (user.role === 'MANAGER') {
      links.push({ id: 'dashboard', label: 'Operations Dashboard', icon: <LayoutDashboard size={18} /> });
      links.push({ id: 'board', label: 'Kanban Board', icon: <Kanban size={18} /> });
      links.push({ id: 'sites', label: 'Client Sites', icon: <MapPin size={18} /> });
      links.push({ id: 'tracking', label: 'Staff Tracking Radar', icon: <Compass size={18} /> });
      links.push({ id: 'tech', label: 'Field Portal (Tech)', icon: <Wrench size={18} /> });
      links.push({ id: 'customer', label: 'Customer Portal', icon: <FileEdit size={18} /> });
    } else if (user.role === 'DISPATCHER') {
      links.push({ id: 'board', label: 'Kanban Board', icon: <Kanban size={18} /> });
      links.push({ id: 'sites', label: 'Client Sites', icon: <MapPin size={18} /> });
      links.push({ id: 'tracking', label: 'Staff Tracking Radar', icon: <Compass size={18} /> });
    } else if (user.role === 'TECHNICIAN') {
      links.push({ id: 'tech', label: 'My Assigned Jobs', icon: <Wrench size={18} /> });
    } else if (user.role === 'CUSTOMER') {
      links.push({ id: 'customer', label: 'My Service Requests', icon: <FileEdit size={18} /> });
    }
    links.push({ id: 'profile', label: 'My Profile', icon: <UserCircle size={18} /> });
    return links;
  };

  return (
    <div className="app-container">
      {/* Mesh Glow Background */}
      <div className="bg-glow-container">
        <div className="bg-glow-blob bg-glow-blob-1"></div>
        <div className="bg-glow-blob bg-glow-blob-2"></div>
        <div className="bg-glow-blob bg-glow-blob-3"></div>
      </div>

      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <Shield className="logo-icon" size={28} />
            <span className="logo-text">KEYSTONE</span>
          </div>

          <nav>
            <ul className="nav-links">
              {getNavLinks().map(link => (
                <li key={link.id}>
                  <button
                    onClick={() => setActiveTab(link.id)}
                    className={`nav-item ${activeTab === link.id ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Profile and Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="user-profile">
            <div className="avatar">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role.replace('_', ' ')}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.15)' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main viewport panels */}
      <main className="main-content">
        <header className="workspace-shell glass-card shimmer-glow">
          <div className="workspace-copy">
            <span className="eyebrow">Keystone Field Service Management</span>
            <h1 className="workspace-title">{currentView.title}</h1>
            <p className="workspace-subtitle">{currentView.subtitle}</p>
          </div>

          <div className="workspace-status">
            <div className="workspace-chip">
              <span className="workspace-chip-label">Logged in as</span>
              <strong>{user.name}</strong>
            </div>
            <div className="workspace-chip workspace-chip-role">
              <span className="workspace-chip-label">Role</span>
              <strong>{user.role.replace('_', ' ')}</strong>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <ManagerDashboard token={token} />}
        {activeTab === 'board' && <KanbanBoard token={token} userRole={user.role} />}
        {activeTab === 'sites' && <CustomerSiteManagement token={token} />}
        {activeTab === 'tech' && <TechnicianView token={token} technicianEmail={user.email} userRole={user.role} />}
        {activeTab === 'customer' && <CustomerPortal token={token} />}
        {activeTab === 'profile' && <UserProfileView token={token} onProfileUpdated={handleProfileUpdate} />}
        {activeTab === 'tracking' && <LiveTrackingMap token={token} />}
      </main>
    </div>
  );
}
