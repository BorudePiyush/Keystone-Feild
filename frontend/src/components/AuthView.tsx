import React, { useState } from 'react';
import { Shield, KeyRound, Mail, AlertTriangle, Play, Eye, EyeOff, User, CheckCircle2, Phone, Key } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (token: string, user: { email: string; name: string; role: string }) => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1 = enter identifier, 2 = enter code

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CUSTOMER');

  // OTP / Reset Fields
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  // Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isForgotPassword) {
      if (otpStep === 1) {
        // Send reset OTP
        try {
          const response = await fetch('/api/auth/password/reset-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to send reset code.');
          }

          const data = await response.json();
          setSuccess(data.message);
          if (data.demoOtp) {
            setDemoOtp(data.demoOtp);
          }
          setOtpStep(2);
        } catch (err: any) {
          setError(err.message || 'Failed to send reset code.');
        } finally {
          setLoading(false);
        }
      } else {
        // Reset Password
        try {
          const response = await fetch('/api/auth/password/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier, otp: otpCode, newPassword: password }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Verification or reset failed.');
          }

          const data = await response.json();
          setSuccess(data.message);
          
          // Auto switch to login
          setTimeout(() => {
            setIsForgotPassword(false);
            setSuccess(null);
            setPassword('');
            setOtpCode('');
            setIdentifier('');
            setDemoOtp(null);
          }, 2000);
        } catch (err: any) {
          setError(err.message || 'Password reset failed.');
        } finally {
          setLoading(false);
        }
      }
    } else if (isRegister) {
      // Register logic
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, phone, password, role }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Registration failed.');
        }

        setSuccess('Registration successful! Account details stored in registrations.json. Note: Password login is disabled for registered emails; please use OTP Login.');
        // Reset fields
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setRole('CUSTOMER');
        setIsRegister(false);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else if (useOtp) {
      if (otpStep === 1) {
        // Send login OTP
        try {
          const response = await fetch('/api/auth/otp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to send OTP.');
          }

          const data = await response.json();
          setSuccess(data.message);
          if (data.demoOtp) {
            setDemoOtp(data.demoOtp);
          }
          setOtpStep(2);
        } catch (err: any) {
          setError(err.message || 'Failed to send OTP.');
        } finally {
          setLoading(false);
        }
      } else {
        // Verify login OTP
        try {
          const response = await fetch('/api/auth/otp/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier, otp: otpCode }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Invalid or expired OTP.');
          }

          const data = await response.json();
          onLoginSuccess(data.token, {
            email: data.email,
            name: data.name,
            role: data.role,
          });
        } catch (err: any) {
          setError(err.message || 'OTP verification failed.');
        } finally {
          setLoading(false);
        }
      }
    } else {
      // Login logic
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Invalid email or password');
        }

        const data = await response.json();
        onLoginSuccess(data.token, {
          email: data.email,
          name: data.name,
          role: data.role,
        });
      } catch (err: any) {
        setError(err.message || 'Connection to server failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setError(null);
    setSuccess(null);
    setIsRegister(false);
    setUseOtp(false);
    setIsForgotPassword(false);
    setEmail(roleEmail);
    setPassword('password');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: roleEmail, password: 'password' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Invalid email or password');
      }

      const data = await response.json();
      onLoginSuccess(data.token, {
        email: data.email,
        name: data.name,
        role: data.role,
      });
    } catch (err: any) {
      setError(err.message || 'Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetAllTabs = () => {
    setIsRegister(false);
    setUseOtp(false);
    setIsForgotPassword(false);
    setOtpStep(1);
    setDemoOtp(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem',
      position: 'relative'
    }}>
      {/* Mesh Glow Background */}
      <div className="bg-glow-container">
        <div className="bg-glow-blob bg-glow-blob-1"></div>
        <div className="bg-glow-blob bg-glow-blob-2"></div>
        <div className="bg-glow-blob bg-glow-blob-3"></div>
      </div>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: '#6366f1',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
          }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>KEYSTONE</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isForgotPassword ? 'Reset Your Account Password' : 'Field Service Management Platform'}
          </p>
        </div>

        {/* Tab switchers */}
        {!isForgotPassword && (
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '0.25rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <button
              type="button"
              onClick={() => {
                resetAllTabs();
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: (!isRegister && !useOtp) ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                resetAllTabs();
                setUseOtp(true);
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: (!isRegister && useOtp) ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
            >
              OTP Login
            </button>
            <button
              type="button"
              onClick={() => {
                resetAllTabs();
                setIsRegister(true);
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: isRegister ? 'var(--primary)' : 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#34d399',
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Demo OTP Helper Box */}
        {(useOtp || isForgotPassword) && otpStep === 2 && demoOtp && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '0.85rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Demo Verification Code: </span>
            <strong style={{ color: '#a5b4fc', fontSize: '1.1rem', letterSpacing: '0.15em', fontFamily: 'monospace' }}>{demoOtp}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="phone"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="+15550000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {!useOtp && !isForgotPassword && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Forgot Password Link */}
                <div style={{ textAlign: 'right', marginTop: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setIsRegister(false);
                      setUseOtp(false);
                      setOtpStep(1);
                      setIdentifier('');
                      setOtpCode('');
                      setPassword('');
                      setDemoOtp(null);
                      setError(null);
                      setSuccess(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a5b4fc',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Reset Request Input identifier */}
          {isForgotPassword && otpStep === 1 && (
            <div className="form-group animate-slide-up">
              <label className="form-label" htmlFor="identifier">
                Email Address or Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="name@company.com or +15550001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Reset OTP entry and New Password input */}
          {isForgotPassword && otpStep === 2 && (
            <div className="form-group animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label" htmlFor="otpCode">
                  Enter Reset OTP Code
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', letterSpacing: '0.15em', fontWeight: 700 }}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="newPassword">
                  Enter New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {useOtp && otpStep === 1 && (
            <div className="form-group animate-slide-up">
              <label className="form-label" htmlFor="identifier">
                Email Address or Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  placeholder="manager@keystone.com or +15550001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {useOtp && otpStep === 2 && (
            <div className="form-group animate-slide-up">
              <label className="form-label" htmlFor="otpCode">
                Enter Verification Code (OTP)
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', width: '100%', letterSpacing: '0.15em', fontWeight: 700 }}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(1);
                  setSuccess(null);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0',
                  marginTop: '0.5rem'
                }}
              >
                Change Email / Mobile Number
              </button>
            </div>
          )}

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="role">
                Select Role
              </label>
              <select
                id="role"
                className="form-input"
                style={{ width: '100%' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="CUSTOMER">Customer (Site Owner)</option>
                <option value="TECHNICIAN">Technician (Field Specialist)</option>
                <option value="DISPATCHER">Dispatcher (Scheduler)</option>
                <option value="MANAGER">Manager (Administrator)</option>
              </select>
              {role === 'MANAGER' && (
                <p style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: '0.25rem' }}>
                  * Limit of 5 Manager accounts maximum.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', height: '48px' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (
              isForgotPassword ? (otpStep === 1 ? 'Send Reset Code' : 'Reset & Save Password') : (
                isRegister ? 'Create Account' : (
                  useOtp ? (otpStep === 1 ? 'Send OTP Code' : 'Verify & Sign In') : 'Sign In'
                )
              )
            )}
          </button>
          
          {/* Back button for Forgot Password view */}
          {isForgotPassword && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetAllTabs}
              style={{ width: '100%', marginTop: '0.5rem', height: '40px', justifyContent: 'center' }}
            >
              Back to Login
            </button>
          )}
        </form>

        {!isRegister && !isForgotPassword && (
          <div style={{ marginTop: '2.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
              Quick Login Demo Accounts
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => handleQuickLogin('manager@keystone.com')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', justifyContent: 'flex-start', gap: '0.25rem' }}
              >
                <Play size={10} style={{ color: '#6366f1' }} />
                <span>Manager</span>
              </button>
              <button
                onClick={() => handleQuickLogin('dispatcher@keystone.com')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', justifyContent: 'flex-start', gap: '0.25rem' }}
              >
                <Play size={10} style={{ color: '#38bdf8' }} />
                <span>Dispatcher</span>
              </button>
              <button
                onClick={() => handleQuickLogin('tech1@keystone.com')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', justifyContent: 'flex-start', gap: '0.25rem' }}
              >
                <Play size={10} style={{ color: '#fb7185' }} />
                <span>Technician</span>
              </button>
              <button
                onClick={() => handleQuickLogin('customer@keystone.com')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', justifyContent: 'flex-start', gap: '0.25rem' }}
              >
                <Play size={10} style={{ color: '#34d399' }} />
                <span>Customer</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
