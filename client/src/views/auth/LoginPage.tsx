import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  GraduationCap,
  Building2,
  Briefcase,
  Award,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { RegisterModal } from './RegisterModal';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess?: (role: string) => void;
  onNavigateToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const { login, oauthError, clearOAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Modal Dialogs
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Email format regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError('Email is required.');
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (val: string): boolean => {
    if (!val) {
      setPasswordError('Password is required.');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setAuthError(null);
    clearOAuthError();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(email.trim(), password);
      setIsSuccess(true);
      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser.role);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Direct redirect to backend OAuth initiation endpoint (standard server-side flow)
    window.location.href = '/api/auth/google';
  };



  return (
    <div className="login-page-container">
      <div className="login-split-layout">
        {/* ==================================================== */}
        {/* LEFT SECTION: BRANDING & VALUE PROPOSITION            */}
        {/* ==================================================== */}
        <section className="brand-showcase-section">
          <div>
            {/* Header Brand */}
            <div className="brand-header">
              <div className="brand-logo-icon">
                <Sparkles size={26} />
              </div>
              <div>
                <h1 className="brand-title">SkillBridge AI</h1>
                <div className="brand-tagline">From Beginner to Placement Ready</div>
              </div>
            </div>

            {/* Hero Pitch */}
            <div className="brand-hero-content">
              <div className="brand-badge">
                <ShieldCheck size={14} />
                <span>Next-Generation Career Readiness Engine</span>
              </div>
              <h2 className="brand-main-heading">
                Accelerate your journey from <span>first line of code</span> to <span>offer letter</span>.
              </h2>
              <p className="brand-description">
                SkillBridge AI unifies diagnostic assessments, role-tailored roadmaps, proctored code execution,
                multilingual interview prep, and direct hiring pipelines for students, colleges, and industry recruiters.
              </p>
            </div>

            {/* 5-Step Continuous Journey */}
            <div className="career-journey-list">
              <div className="career-step-item">
                <div className="step-number">01</div>
                <div className="step-content">
                  <h4>Learn & Calibrate</h4>
                  <p>Adaptive AI diagnostic assessments uncover real-time skill gaps across core CS and communication.</p>
                </div>
              </div>

              <div className="career-step-item">
                <div className="step-number">02</div>
                <div className="step-content">
                  <h4>Build Skills</h4>
                  <p>Targeted curriculum modules and role-specific mastery roadmaps crafted for industry demand.</p>
                </div>
              </div>

              <div className="career-step-item">
                <div className="step-number">03</div>
                <div className="step-content">
                  <h4>Practice</h4>
                  <p>Interactive multi-language coding playground & proctored safe exam environment with live test cases.</p>
                </div>
              </div>

              <div className="career-step-item">
                <div className="step-number">04</div>
                <div className="step-content">
                  <h4>Get Opportunities</h4>
                  <p>Connect with vetted internships, campus drives, and verified recruiter talent pools.</p>
                </div>
              </div>

              <div className="career-step-item">
                <div className="step-number">05</div>
                <div className="step-content">
                  <h4>Get Placed</h4>
                  <p>AI placement readiness score benchmarks you against hiring standards for top tech companies.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stakeholders Footer */}
          <div className="stakeholders-footer">
            <div className="stakeholders-label">Unified Platform For</div>
            <div className="stakeholder-pills">
              <span className="stakeholder-pill">🎓 Students</span>
              <span className="stakeholder-pill">🏛️ Colleges & Departments</span>
              <span className="stakeholder-pill">🏢 Recruiters & Companies</span>
              <span className="stakeholder-pill">🌟 Industry Mentors</span>
              <span className="stakeholder-pill">🛡️ Administrators</span>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* RIGHT SECTION: AUTHENTICATION FORM                   */}
        {/* ==================================================== */}
        <section className="login-form-section">
          <div className="login-card">
            <div className="login-card-header">
              <h2>Welcome Back!</h2>
              <p>Sign in to continue your SkillBridge AI journey.</p>
            </div>

            {/* OAuth Error Alert */}
            {oauthError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{oauthError}</span>
                <button
                  onClick={clearOAuthError}
                  className="auth-error-close"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* General Auth Error Alert */}
            {authError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{authError}</span>
                <button
                  onClick={() => setAuthError(null)}
                  className="auth-error-close"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Success Feedback */}
            {isSuccess && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'hsla(152, 76%, 45%, 0.15)',
                  border: '1px solid var(--accent-emerald)',
                  color: '#86efac',
                  fontSize: '13px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={18} />
                <span>Authentication confirmed! Launching your portal...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Field 1: Email */}
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                    className={`form-input ${emailError ? 'error' : ''}`}
                    disabled={isSubmitting}
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error-text' : undefined}
                  />
                </div>
                {emailError && (
                  <p id="email-error-text" className="field-error-message">
                    <AlertCircle size={13} />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Password */}
              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={(e) => validatePassword(e.target.value)}
                    className={`form-input ${passwordError ? 'error' : ''}`}
                    disabled={isSubmitting}
                    required
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'password-error-text' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p id="password-error-text" className="field-error-message">
                    <AlertCircle size={13} />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="forgot-password-row">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="forgot-password-link"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="submit-btn"
                id="sign-in-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* OR Divider */}
              <div className="or-divider">
                <div className="or-line"></div>
                <span className="or-text">OR</span>
                <div className="or-line"></div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="google-sign-in-btn"
                id="google-sign-in-button"
              >
                {/* Official Google 'G' Logo SVG */}
                <svg className="google-icon-svg" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Registration Link */}
              <div className="register-prompt-row">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToRegister) {
                      onNavigateToRegister();
                    } else {
                      setShowRegisterModal(true);
                    }
                  }}
                  className="register-link-btn"
                  id="create-account-link-btn"
                >
                  Create Account
                </button>
              </div>


            </form>
          </div>
        </section>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
        onSuccessLogin={() => {
          setShowForgotPassword(false);
          setAuthError(null);
        }}
      />

      {/* Registration Modal Preview */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSelectRoleDemo={() => {
          setShowRegisterModal(false);
          if (onNavigateToRegister) onNavigateToRegister();
        }}
      />
    </div>
  );
};
