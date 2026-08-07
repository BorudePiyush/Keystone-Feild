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
    <div className="auth-page">
      {/* Mesh Glow Background */}
      <div className="bg-glow-container">
        <div className="bg-glow-blob bg-glow-blob-1"></div>
        <div className="bg-glow-blob bg-glow-blob-2"></div>
        <div className="bg-glow-blob bg-glow-blob-3"></div>
      </div>
      <div className="auth-shell fade-in">
        <section className="auth-brand glass-card">
          <div className="auth-brand-badge">
            <Shield size={28} />
          </div>
          <span className="eyebrow">Keystone Field Service Management</span>
          <h2 className="auth-brand-title">Service operations with a command-center feel.</h2>
          <p className="auth-brand-copy">
            Dispatch, monitor, and resolve field work from one responsive interface designed for managers,
            technicians, and customers.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <strong>Live SLA</strong>
              <span>Track compliance and urgent tickets in real time.</span>
            </div>
            <div className="auth-highlight">
              <strong>Role-aware</strong>
              <span>Switch between manager, dispatcher, technician, and customer workflows.</span>
            </div>
            <div className="auth-highlight">
              <strong>Fast login</strong>
              <span>Use OTP, password, or one-click demo accounts.</span>
            </div>
          </div>
        </section>

        <section className="auth-panel glass-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 className="auth-title">{isForgotPassword ? 'Reset password' : 'Welcome back'}</h1>
            <p className="auth-subtitle">
              {isForgotPassword ? 'Confirm your identity and choose a new password' : 'Sign in with password, OTP, or a demo account'}
            </p>
          </div>

          {/* Tab switchers */}
          {!isForgotPassword && (
            <div className="auth-toggle-group">
            
              <button
                type="button"
                onClick={() => {
                  resetAllTabs();
                }}
                className={`auth-toggle ${!isRegister && !useOtp ? 'active' : ''}`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllTabs();
                  setUseOtp(true);
                }}
                className={`auth-toggle ${!isRegister && useOtp ? 'active' : ''}`}
              >
                OTP Login
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllTabs();
                  setIsRegister(true);
                }}
                className={`auth-toggle ${isRegister ? 'active' : ''}`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert-error">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Demo OTP Helper Box */}
          {(useOtp || isForgotPassword) && otpStep === 2 && demoOtp && (
            <div className="auth-demo-otp">
              <span style={{ color: 'var(--text-muted)' }}>Demo Verification Code:</span>
              <strong>{demoOtp}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name
                </label>
                <div className="input-shell">
                  <User size={18} className="input-icon" />
                  <input
                    id="name"
                    type="text"
                    className="form-input"
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
                <div className="input-shell">
                  <Phone size={18} className="input-icon" />
                  <input
                    id="phone"
                    type="text"
                    className="form-input"
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
                  <div className="input-shell">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      className="form-input"
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
                  <div className="input-shell">
                    <KeyRound size={18} className="input-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-ghost-button"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="form-row-end">
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
                      className="link-button"
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
                <div className="input-shell">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="identifier"
                    type="text"
                    className="form-input"
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
              <div className="form-group animate-slide-up auth-step-stack">
                <div>
                  <label className="form-label" htmlFor="otpCode">
                    Enter Reset OTP Code
                  </label>
                  <div className="input-shell">
                    <Key size={18} className="input-icon" />
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      className="form-input"
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
                  <div className="input-shell">
                    <KeyRound size={18} className="input-icon" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-ghost-button"
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
                <div className="input-shell">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="identifier"
                    type="text"
                    className="form-input"
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
                <div className="input-shell">
                  <Key size={18} className="input-icon" />
                  <input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    className="form-input"
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
                  className="link-button"
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

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
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
                className="btn btn-secondary auth-back-button"
                onClick={resetAllTabs}
              >
                Back to Login
              </button>
            )}
          </form>

          {!isRegister && !isForgotPassword && (
            <div className="auth-demo-section">
              <span className="auth-demo-label">Quick Login Demo Accounts</span>
              <div className="auth-demo-grid">
                <button
                  onClick={() => handleQuickLogin('manager@keystone.com')}
                  className="demo-card"
                >
                  <Play size={12} style={{ color: '#6366f1' }} />
                  <span>Manager</span>
                </button>
                <button
                  onClick={() => handleQuickLogin('dispatcher@keystone.com')}
                  className="demo-card"
                >
                  <Play size={12} style={{ color: '#38bdf8' }} />
                  <span>Dispatcher</span>
                </button>
                <button
                  onClick={() => handleQuickLogin('tech1@keystone.com')}
                  className="demo-card"
                >
                  <Play size={12} style={{ color: '#fb7185' }} />
                  <span>Technician</span>
                </button>
                <button
                  onClick={() => handleQuickLogin('customer@keystone.com')}
                  className="demo-card"
                >
                  <Play size={12} style={{ color: '#34d399' }} />
                  <span>Customer</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
