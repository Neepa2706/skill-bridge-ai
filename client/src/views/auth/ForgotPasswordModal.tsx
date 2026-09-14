import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccessLogin?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccessLogin
}) => {
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState<'request' | 'sent' | 'reset'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset phase fields
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [devTokenCaptured, setDevTokenCaptured] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (val: string): boolean => {
    if (!val.trim()) {
      setEmailError('Please enter your registered email address.');
      return false;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val.trim())) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      setSuccessMessage(res.message);
      if (res.devToken) {
        setDevTokenCaptured(res.devToken);
      }
      setStep('sent');
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setTokenError('');
    setPasswordError('');

    let hasError = false;
    if (!token.trim()) {
      setTokenError('Reset token is required.');
      hasError = true;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      const res = await resetPassword(token.trim(), newPassword);
      setSuccessMessage(res.message);
      setStep('sent');
      setDevTokenCaptured(null);
      setTimeout(() => {
        onClose();
        if (onSuccessLogin) onSuccessLogin();
      }, 2000);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToResetWithDevToken = () => {
    if (devTokenCaptured) {
      setToken(devTokenCaptured);
    }
    setGeneralError(null);
    setStep('reset');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, hsl(222, 47%, 12%) 0%, hsl(224, 71%, 7%) 100%)',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          position: 'relative',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--transition-fast)'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* STEP 1: Request Reset */}
        {step === 'request' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'hsla(265, 89%, 66%, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Reset Your Password
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Enter your email to receive recovery instructions.
                </p>
              </div>
            </div>

            {generalError && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'hsla(350, 89%, 60%, 0.12)',
                  border: '1px solid var(--accent-rose)',
                  color: '#fda4af',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="reset-email-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}
                >
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  >
                    <Mail size={18} />
                  </div>
                  <input
                    id="reset-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    placeholder="name@university.edu"
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 16px 0 42px',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${emailError ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  />
                </div>
                {emailError && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-rose)', marginTop: '5px' }}>
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep('reset')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Already have a reset token? Enter it directly
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Request Sent Confirmation & Dev Helper */}
        {step === 'sent' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'hsla(152, 76%, 45%, 0.15)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Instructions Dispatched
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              {successMessage || 'If an account with that email exists, password reset instructions have been dispatched.'}
            </p>

            {devTokenCaptured && (
              <div
                style={{
                  background: 'hsla(265, 89%, 66%, 0.08)',
                  border: '1px dashed var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <KeyRound size={16} color="var(--primary)" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Local Test Token Generated
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  To facilitate testing without configuring a production SMTP relay, your test token is available:
                </p>
                <code
                  style={{
                    display: 'block',
                    background: 'var(--bg-base)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    color: 'var(--accent-cyan)',
                    wordBreak: 'break-all',
                    marginBottom: '12px'
                  }}
                >
                  {devTokenCaptured}
                </code>
                <button
                  type="button"
                  onClick={switchToResetWithDevToken}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  ⚡ Enter New Password With This Token
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ width: '100%', height: '42px', justifyContent: 'center' }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* STEP 3: Enter Token & Set New Password */}
        {step === 'reset' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('request')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Set New Password
              </h3>
            </div>

            {generalError && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'hsla(350, 89%, 60%, 0.12)',
                  border: '1px solid var(--accent-rose)',
                  color: '#fda4af',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit}>
              {/* Reset Token */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="reset-token-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}
                >
                  Reset Token
                </label>
                <input
                  id="reset-token-input"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste 64-character token"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    background: 'var(--bg-surface)',
                    border: `1px solid ${tokenError ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                {tokenError && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-rose)', marginTop: '4px' }}>
                    {tokenError}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="reset-new-password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}
                >
                  New Password (min. 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong password"
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 44px 0 42px',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${passwordError ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="reset-confirm-password"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}
                >
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 44px 0 42px',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${passwordError ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {passwordError && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-rose)', marginTop: '4px' }}>
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password & Continue</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
