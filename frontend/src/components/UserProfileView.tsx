import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Image as ImageIcon, History, Save, Edit2, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

interface UserProfileViewProps {
  token: string;
  onProfileUpdated?: (newToken: string, user: { email: string; name: string; role: string }) => void;
}

export default function UserProfileView({ token, onProfileUpdated }: UserProfileViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Edit fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80'
  ];

  const fetchProfileAndHistory = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const profRes = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
        setName(profData.name || '');
        setEmail(profData.email || '');
        setPhone(profData.phone || '');
        setAvatarUrl(profData.avatarUrl || '');
      }

      // 2. Fetch Working History
      const histRes = await fetch('/api/users/profile/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndHistory();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, phone, avatarUrl })
      });

      if (response.ok) {
        const resData = await response.json();
        const updatedUser = resData.user || resData;
        const freshToken = resData.token;

        setProfile(updatedUser);
        setIsEditing(false);

        if (freshToken && onProfileUpdated) {
          onProfileUpdated(freshToken, {
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role
          });
        }
        alert('Profile updated successfully!');
      } else {
        const err = await response.json();
        alert(`Error: ${err.message || 'Failed to update profile'}`);
      }
    } catch (err) {
      alert('Network error updating profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading profile data...</p>
      </div>
    );
  }

  const defaultInitials = profile?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'US';

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>My User Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage your credentials and view your working history</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Profile Card */}
        <div className="glass-card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          {/* Backdrop Graphic banner */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '100px',
            background: 'linear-gradient(135deg, rgba(124, 140, 255, 0.16) 0%, rgba(25, 195, 125, 0.08) 100%)',
            borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
              
              {/* Profile Photo */}
              <div style={{ position: 'relative' }}>
                {profile?.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt="Avatar" 
                    style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 0 15px rgba(99, 102, 241, 0.18)' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #7c8cff 0%, #9b7bff 100%)', color: '#ffffff', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '2rem', fontWeight: 800, border: '3px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: '0 0 15px rgba(99, 102, 241, 0.18)'
                  }}>
                    {defaultInitials}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{profile?.name}</h2>
                  <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(124, 140, 255, 0.12)', color: '#4f46e5', textTransform: 'uppercase', fontWeight: 700 }}>
                    {profile?.role?.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {profile?.email}
                </p>
                {profile?.phone && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                    <Phone size={12} />
                    <span>{profile.phone}</span>
                  </p>
                )}
              </div>

              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                  <Edit2 size={14} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {/* Edit Form */}
            {isEditing && (
              <form onSubmit={handleSave} className="animate-slide-up" style={{ borderTop: '1px solid rgba(15,23,42,0.08)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Update Profile Details</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name / Username</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="email" 
                        className="form-input" 
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profile Photo URL</label>
                    <div style={{ position: 'relative' }}>
                      <ImageIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                        placeholder="https://..."
                        value={avatarUrl} 
                        onChange={(e) => setAvatarUrl(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar Presets Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Choose from Premium Photo Presets</label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {avatarPresets.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        style={{
                          border: avatarUrl === preset ? '3px solid var(--primary)' : '2px solid transparent',
                          borderRadius: '50%',
                          padding: 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          width: '48px', height: '48px',
                          boxShadow: avatarUrl === preset ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <img src={preset} alt="Preset avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="btn btn-secondary"
                      style={{ height: '48px', borderRadius: '24px', fontSize: '0.75rem', padding: '0 1rem' }}
                    >
                      Clear / Initial Text
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ height: '40px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ height: '40px' }} disabled={saveLoading}>
                    <Save size={16} />
                    <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Working History Section */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} style={{ color: 'var(--primary)' }} />
            <span>My Working History & Actions</span>
          </h3>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Clock size={40} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>No activity records or history logs found for this account.</p>
            </div>
          ) : (
            <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
              {/* Timeline line graphic */}
              <div style={{
                position: 'absolute',
                left: '19px', top: '10px', bottom: '10px',
                width: '2px',
                background: 'rgba(255,255,255,0.06)',
                zIndex: 0
              }} />

              {history.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                  {/* Timeline point */}
                  <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    background: item.type === 'COMPLETED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: item.type === 'COMPLETED' ? 'var(--color-completed)' : 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.type === 'COMPLETED' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>

                  {/* History details */}
                  <div className="glass-card" style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {item.ticketCode}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {item.description}
                    </p>

                    {item.loggedTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>
                        <Clock size={12} />
                        <span>Logged Labor: {item.loggedTime} minutes</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
