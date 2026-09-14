import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Briefcase,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Building,
  BookOpen,
  Calendar,
  Layers,
  Target,
  Globe,
  CheckCircle2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';
import './RegisterPage.css';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
  initialRole?: 'student' | 'college' | 'recruiter' | 'mentor';
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
  initialRole = 'student'
}) => {
  const {
    registerStudent,
    registerCollege,
    registerRecruiter,
    registerMentor,
    verifyEmail,
    resendVerification
  } = useAuth();

  // Multi-step Wizard Step: 1 = Role, 2 = Details, 3 = Verify
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<'student' | 'college' | 'recruiter' | 'mentor'>(initialRole);

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Student Fields
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [degree, setDegree] = useState('Bachelor of Technology (B.Tech)');
  const [currentYear, setCurrentYear] = useState('1');
  const [section, setSection] = useState('A');
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear() + 3));
  const [targetRole, setTargetRole] = useState('Software Developer');
  const [selfDeclaredLevel, setSelfDeclaredLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

  // College Fields
  const [institutionName, setInstitutionName] = useState('');
  const [collegeDepartment, setCollegeDepartment] = useState('');
  const [designation, setDesignation] = useState('');

  // Recruiter Fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Information Technology');
  const [companyWebsite, setCompanyWebsite] = useState('');

  // Mentor Fields
  const [mentorExpertise, setMentorExpertise] = useState('System Design, Data Structures');
  const [experienceYears, setExperienceYears] = useState('5');

  // Validation & Submission States
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);
  const [isVerifyingDev, setIsVerifyingDev] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Password criteria tracker
  const passwordCriteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const isPasswordStrong =
    passwordCriteria.length &&
    passwordCriteria.upper &&
    passwordCriteria.lower &&
    passwordCriteria.number &&
    passwordCriteria.special;

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Role Option Definitions (strictly no admin)
  const roleOptions = [
    {
      id: 'student' as const,
      title: 'Student / Graduate',
      badge: 'Job Seeker',
      badgeClass: 'badge-primary',
      iconBoxBg: 'hsla(265, 89%, 66%, 0.15)',
      iconColor: 'var(--primary)',
      icon: <GraduationCap size={22} color="var(--primary)" />,
      desc: 'Assess your skills, practice coding, improve communication, find internships, and become placement ready.'
    },
    {
      id: 'college' as const,
      title: 'College / Department',
      badge: 'Institution',
      badgeClass: 'badge-cyan',
      iconBoxBg: 'hsla(188, 95%, 48%, 0.15)',
      iconColor: 'var(--accent-cyan)',
      icon: <Building2 size={22} color="var(--accent-cyan)" />,
      desc: 'Monitor batch student progress, generate accredited reports, track skill development, and support placement prep.'
    },
    {
      id: 'recruiter' as const,
      title: 'Recruiter / Company',
      badge: 'Hiring Partner',
      badgeClass: 'badge-emerald',
      iconBoxBg: 'hsla(152, 76%, 45%, 0.15)',
      iconColor: 'var(--accent-emerald)',
      icon: <Briefcase size={22} color="var(--accent-emerald)" />,
      desc: 'Post jobs, post internships, define role requirements, and discover benchmark-verified student talent.'
    },
    {
      id: 'mentor' as const,
      title: 'Industry Mentor',
      badge: 'Guidance & Mock Exams',
      badgeClass: 'badge-amber',
      iconBoxBg: 'hsla(38, 92%, 50%, 0.15)',
      iconColor: 'var(--accent-amber)',
      icon: <Award size={22} color="var(--accent-amber)" />,
      desc: 'Conduct mock interviews, provide resume feedback, guide ambitious students, and track assigned mentees.'
    }
  ];

  const handleRoleContinue = () => {
    setFormError(null);
    setCurrentStep(2);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Common validations
    if (!agreedToTerms) {
      setFormError('You must agree to the Terms of Service and Privacy Policy to register.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError('Please fulfill all password requirements before proceeding.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      let res: any;

      if (selectedRole === 'student') {
        if (!fullName || !email) {
          throw new Error('Full name and email address are required.');
        }
        res = await registerStudent({
          name: fullName,
          email,
          phone,
          password,
          confirmPassword,
          collegeName,
          department,
          degree,
          currentYear: Number(currentYear) || 1,
          section,
          graduationYear: Number(graduationYear) || (new Date().getFullYear() + 3),
          targetRole,
          selfDeclaredLevel,
          agreedToTerms
        });
      } else if (selectedRole === 'college') {
        if (!institutionName || !email || !fullName) {
          throw new Error('Institution name, official email, and contact person name are required.');
        }
        res = await registerCollege({
          institutionName,
          departmentName: collegeDepartment,
          officialEmail: email,
          contactPersonName: fullName,
          designation,
          phone,
          password,
          confirmPassword,
          agreedToTerms
        });
      } else if (selectedRole === 'recruiter') {
        if (!companyName || !email || !fullName) {
          throw new Error('Company name, corporate email, and recruiter name are required.');
        }
        res = await registerRecruiter({
          companyName,
          companyEmail: email,
          recruiterName: fullName,
          designation,
          phone,
          industry,
          website: companyWebsite,
          password,
          confirmPassword,
          agreedToTerms
        });
      } else if (selectedRole === 'mentor') {
        if (!fullName || !email) {
          throw new Error('Full name and email address are required.');
        }
        res = await registerMentor({
          name: fullName,
          email,
          phone,
          designation,
          expertise: mentorExpertise,
          experienceYears: Number(experienceYears) || 3,
          password,
          confirmPassword,
          agreedToTerms
        });
      }

      if (res?.verificationToken) {
        setDevVerificationToken(res.verificationToken);
      }
      setCurrentStep(3);
    } catch (err: any) {
      setFormError(err.message || 'Account registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevVerifyNow = async () => {
    if (!devVerificationToken) return;
    setIsVerifyingDev(true);
    try {
      await verifyEmail(devVerificationToken);
      setIsVerified(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to verify email token.');
    } finally {
      setIsVerifyingDev(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const res = await resendVerification(email);
      setResendStatus('A fresh verification token has been sent.');
      if (res.verificationToken) {
        setDevVerificationToken(res.verificationToken);
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Could not resend verification.');
    }
  };

  return (
    <div className="register-page-container">
      <div className="register-split-layout">
        {/* ==================================================== */}
        {/* LEFT SECTION: BRANDING & CAREER ROADMAP SHOWCASE      */}
        {/* ==================================================== */}
        <section className="register-brand-showcase">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
              <div className="brand-logo-icon">
                <Sparkles size={26} />
              </div>
              <div>
                <h1 className="brand-title">SkillBridge AI</h1>
                <div className="brand-tagline">From Beginner to Placement Ready</div>
              </div>
            </div>

            <div className="brand-hero-content" style={{ margin: '24px 0' }}>
              <div className="brand-badge">
                <ShieldCheck size={14} />
                <span>Unified Ecosystem Registration</span>
              </div>
              <h2 className="brand-main-heading" style={{ fontSize: '32px' }}>
                Join the platform transforming <span>college potential</span> into <span>industry careers</span>.
              </h2>
              <p className="brand-description" style={{ fontSize: '14px' }}>
                Create your account to unlock continuous skill analysis, proctored safe sandbox assessments,
                multilingual interview partners, and direct institutional hiring pipelines.
              </p>
            </div>

            <div className="career-journey-list" style={{ gap: '10px' }}>
              <div className="career-step-item" style={{ padding: '10px 14px' }}>
                <div className="step-number">01</div>
                <div className="step-content">
                  <h4>Register & Verify</h4>
                  <p>Establish your verified identity and role within the campus or corporate network.</p>
                </div>
              </div>
              <div className="career-step-item" style={{ padding: '10px 14px' }}>
                <div className="step-number">02</div>
                <div className="step-content">
                  <h4>AI Initial Assessment</h4>
                  <p>Calibrate actual baseline strengths independent of self-declared levels.</p>
                </div>
              </div>
              <div className="career-step-item" style={{ padding: '10px 14px' }}>
                <div className="step-number">03</div>
                <div className="step-content">
                  <h4>Placement Readiness</h4>
                  <p>Continuous progress reports benchmark readiness for leading recruiters.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stakeholders-footer" style={{ marginTop: '24px', paddingTop: '16px' }}>
            <div className="stakeholder-pills">
              <span className="stakeholder-pill">🎓 Students</span>
              <span className="stakeholder-pill">🏛️ Colleges</span>
              <span className="stakeholder-pill">🏢 Recruiters</span>
              <span className="stakeholder-pill">🌟 Mentors</span>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* RIGHT SECTION: MULTI-STEP REGISTRATION WIZARD        */}
        {/* ==================================================== */}
        <section className="register-form-section">
          <div className="register-card">
            {/* Card Header */}
            <div className="register-card-header">
              <h2>Create Your SkillBridge Account</h2>
              <p>Start your journey from Beginner to Placement Ready.</p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="stepper-container">
              <div className={`stepper-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                <div className="stepper-circle">{currentStep > 1 ? <Check size={16} /> : '1'}</div>
                <span className="stepper-label">Role</span>
              </div>
              <div className={`stepper-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                <div className="stepper-circle">{currentStep > 2 ? <Check size={16} /> : '2'}</div>
                <span className="stepper-label">Details</span>
              </div>
              <div className={`stepper-step ${currentStep === 3 ? 'active' : ''}`}>
                <div className="stepper-circle">3</div>
                <span className="stepper-label">Verification</span>
              </div>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{formError}</span>
              </div>
            )}

            {/* ================================================= */}
            {/* STEP 1: ROLE SELECTION                            */}
            {/* ================================================= */}
            {currentStep === 1 && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  I am a...
                </h3>

                <div className="role-grid">
                  {roleOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedRole(opt.id)}
                      className={`role-card ${selectedRole === opt.id ? 'selected' : ''}`}
                    >
                      <div>
                        <div className="role-card-header">
                          <div className="role-icon-box" style={{ background: opt.iconBoxBg }}>
                            {opt.icon}
                          </div>
                          <div className="role-radio-circle">
                            {selectedRole === opt.id && <div className="role-radio-dot" />}
                          </div>
                        </div>
                        <h4 className="role-card-title">{opt.title}</h4>
                        <p className="role-card-desc">{opt.desc}</p>
                      </div>
                      <span className={`badge ${opt.badgeClass} role-badge-pill`}>{opt.badge}</span>
                    </div>
                  ))}
                </div>

                <div className="form-actions-row">
                  <button
                    type="button"
                    onClick={handleRoleContinue}
                    className="submit-btn"
                    id="role-continue-btn"
                  >
                    <span>Continue to Registration</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ================================================= */}
            {/* STEP 2: ROLE-SPECIFIC REGISTRATION FORM           */}
            {/* ================================================= */}
            {currentStep === 2 && (
              <form onSubmit={handleCreateAccount} noValidate>
                {/* Back to Role Button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Change Role (Current: {selectedRole.toUpperCase()})</span>
                </button>

                {/* ---------------- STUDENT FORM ---------------- */}
                {selectedRole === 'student' && (
                  <div>
                    {/* Basic Information */}
                    <div className="form-section-title">
                      <User size={15} />
                      <span>Basic Information</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-name">Full Name *</label>
                        <input
                          id="student-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Alex Rivera"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-email">Email Address *</label>
                        <input
                          id="student-email"
                          type="email"
                          className="form-input"
                          placeholder="alex@university.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="student-phone">Mobile Phone Number</label>
                      <input
                        id="student-phone"
                        type="tel"
                        className="form-input"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    {/* Academic Information */}
                    <div className="form-section-title">
                      <BookOpen size={15} />
                      <span>Academic Information</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-college">College / Institution *</label>
                        <input
                          id="student-college"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Engineering Institute"
                          value={collegeName}
                          onChange={(e) => setCollegeName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-dept">Department *</label>
                        <input
                          id="student-dept"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Computer Science"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-3">
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-year">Current Year</label>
                        <select
                          id="student-year"
                          className="form-input"
                          value={currentYear}
                          onChange={(e) => setCurrentYear(e.target.value)}
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year (Final)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-section">Section</label>
                        <input
                          id="student-section"
                          type="text"
                          className="form-input"
                          placeholder="e.g. A"
                          value={section}
                          onChange={(e) => setSection(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-grad-year">Graduation Year</label>
                        <input
                          id="student-grad-year"
                          type="number"
                          className="form-input"
                          placeholder="2027"
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Career Information */}
                    <div className="form-section-title">
                      <Target size={15} />
                      <span>Career Information</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-role">Target Career Role *</label>
                        <select
                          id="student-role"
                          className="form-input"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                        >
                          <option value="Software Developer">Software Developer</option>
                          <option value="Full Stack Engineer">Full Stack Engineer</option>
                          <option value="Frontend Specialist">Frontend Specialist</option>
                          <option value="Backend Specialist">Backend Specialist</option>
                          <option value="AI / ML Engineer">AI / ML Engineer</option>
                          <option value="Data Engineer">Data Engineer</option>
                          <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="student-level">
                          Self-Declared Skill Level
                        </label>
                        <select
                          id="student-level"
                          className="form-input"
                          value={selfDeclaredLevel}
                          onChange={(e) => setSelfDeclaredLevel(e.target.value as any)}
                        >
                          <option value="Beginner">Beginner (Foundational)</option>
                          <option value="Intermediate">Intermediate (Hands-on Practice)</option>
                          <option value="Advanced">Advanced (Interview Ready)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- COLLEGE FORM ---------------- */}
                {selectedRole === 'college' && (
                  <div>
                    <div className="form-section-title">
                      <Building2 size={15} />
                      <span>Institution Information</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-inst-name">Institution Name *</label>
                        <input
                          id="college-inst-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Apex Institute of Technology"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-dept-name">Department Name *</label>
                        <input
                          id="college-dept-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Department of Computer Engineering"
                          value={collegeDepartment}
                          onChange={(e) => setCollegeDepartment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-official-email">Official Institutional Email *</label>
                        <input
                          id="college-official-email"
                          type="email"
                          className="form-input"
                          placeholder="placement@apex.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-contact-name">Contact Person Name *</label>
                        <input
                          id="college-contact-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Dr. Arthur Vance"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-designation">Designation</label>
                        <input
                          id="college-designation"
                          type="text"
                          className="form-input"
                          placeholder="Head of Department / Placement Officer"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="college-phone">Official Mobile / Landline</label>
                        <input
                          id="college-phone"
                          type="tel"
                          className="form-input"
                          placeholder="+1 555-0123"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- RECRUITER FORM ---------------- */}
                {selectedRole === 'recruiter' && (
                  <div>
                    <div className="form-section-title">
                      <Briefcase size={15} />
                      <span>Company Information</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-company">Company Name *</label>
                        <input
                          id="recruiter-company"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Nova Systems"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-email">Company Corporate Email *</label>
                        <input
                          id="recruiter-email"
                          type="email"
                          className="form-input"
                          placeholder="recruiting@novasystems.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-name">Recruiter Name *</label>
                        <input
                          id="recruiter-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Marcus Reed"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-desig">Designation</label>
                        <input
                          id="recruiter-desig"
                          type="text"
                          className="form-input"
                          placeholder="Talent Acquisition Lead"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-industry">Industry Sector</label>
                        <input
                          id="recruiter-industry"
                          type="text"
                          className="form-input"
                          placeholder="Cloud & AI Software"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="recruiter-website">Company Website</label>
                        <input
                          id="recruiter-website"
                          type="url"
                          className="form-input"
                          placeholder="https://company.com"
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- MENTOR FORM ---------------- */}
                {selectedRole === 'mentor' && (
                  <div>
                    <div className="form-section-title">
                      <Award size={15} />
                      <span>Mentor Professional Background</span>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="mentor-name">Full Name *</label>
                        <input
                          id="mentor-name"
                          type="text"
                          className="form-input"
                          placeholder="e.g. Dr. Sarah Chen"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="mentor-email">Email Address *</label>
                        <input
                          id="mentor-email"
                          type="email"
                          className="form-input"
                          placeholder="sarah.chen@tech.org"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="mentor-desig">Professional Role / Designation</label>
                        <input
                          id="mentor-desig"
                          type="text"
                          className="form-input"
                          placeholder="Principal Cloud Architect"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="mentor-exp">Years of Industry Experience</label>
                        <input
                          id="mentor-exp"
                          type="number"
                          className="form-input"
                          placeholder="8"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="mentor-expertise">Area of Expertise (comma-separated)</label>
                      <input
                        id="mentor-expertise"
                        type="text"
                        className="form-input"
                        placeholder="System Design, Algorithms, Cloud Architecture"
                        value={mentorExpertise}
                        onChange={(e) => setMentorExpertise(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* ---------------- PASSWORD FIELDS & STRENGTH ---------------- */}
                <div className="form-section-title" style={{ marginTop: '28px' }}>
                  <Lock size={15} />
                  <span>Security & Account Credentials</span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-password">Password *</label>
                    <div className="input-wrapper">
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Enter strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="toggle-password-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-confirm-password">Confirm Password *</label>
                    <div className="input-wrapper">
                      <input
                        id="reg-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="toggle-password-btn"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Password Strength Requirements Box */}
                <div className="password-criteria-box">
                  <div className="criteria-title">Password Security Requirements</div>
                  <div className="criteria-list">
                    <div className={`criteria-item ${passwordCriteria.length ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`criteria-item ${passwordCriteria.upper ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>Uppercase letter (A-Z)</span>
                    </div>
                    <div className={`criteria-item ${passwordCriteria.lower ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>Lowercase letter (a-z)</span>
                    </div>
                    <div className={`criteria-item ${passwordCriteria.number ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`criteria-item ${passwordCriteria.special ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>Special symbol (!@#$%^&*)</span>
                    </div>
                    <div className={`criteria-item ${passwordsMatch ? 'met' : ''}`}>
                      <CheckCircle2 size={13} />
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>

                {/* Terms of Service & Privacy Policy Checkbox */}
                <label className="terms-checkbox-row">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="terms-link-btn"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="terms-link-btn"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>

                {/* Submission Actions */}
                <div className="form-actions-row">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn btn-outline"
                    style={{ flex: 0.4, justifyContent: 'center' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !agreedToTerms}
                    className="submit-btn"
                    style={{ flex: 1 }}
                    id="create-account-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create {selectedRole.toUpperCase()} Account</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ================================================= */}
            {/* STEP 3: REGISTRATION SUCCESS & EMAIL VERIFICATION  */}
            {/* ================================================= */}
            {currentStep === 3 && (
              <div className="verification-screen">
                <div className={`verification-icon-circle ${isVerified ? 'verified' : ''}`}>
                  {isVerified ? <CheckCircle2 size={36} /> : <Mail size={36} />}
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {isVerified ? 'Email Verified Successfully!' : 'Verify Your Email Address'}
                </h3>

                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 20px auto' }}>
                  {isVerified
                    ? 'Your SkillBridge AI account is active and verified. You can now proceed to login.'
                    : `We've generated an email verification link for ${email}. Please verify your email to unlock your full platform journey.`}
                </p>

                {/* In-App Next Steps Preview */}
                <div className="verification-steps-card">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Continuous Journey Ahead
                  </span>
                  <div className="next-steps-list">
                    <div className="next-step-badge">
                      <CheckCircle2 size={14} color="var(--accent-emerald)" />
                      <span>Step 1: Account Registration (Completed)</span>
                    </div>
                    <div className="next-step-badge">
                      <span style={{ width: '14px', textAlign: 'center', color: isVerified ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                        {isVerified ? '✓' : '●'}
                      </span>
                      <span>Step 2: Email Verification ({isVerified ? 'Verified' : 'Pending'})</span>
                    </div>
                    <div className="next-step-badge">
                      <span style={{ width: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>○</span>
                      <span>Step 3: AI Initial Assessment (Calibrates baseline skill gaps)</span>
                    </div>
                    <div className="next-step-badge">
                      <span style={{ width: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>○</span>
                      <span>Step 4: Skill Report & Benchmark Placement Readiness</span>
                    </div>
                  </div>
                </div>

                {/* Development 1-Click Verification Button */}
                {!isVerified && devVerificationToken && (
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
                      <Sparkles size={16} color="var(--primary)" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        Local Development Verification
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      To facilitate instant testing without an SMTP server, you can simulate clicking your verification email:
                    </p>
                    <button
                      type="button"
                      onClick={handleDevVerifyNow}
                      disabled={isVerifyingDev}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                    >
                      {isVerifyingDev ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                      <span>⚡ Verify Email Now (Development Mode)</span>
                    </button>
                  </div>
                )}

                {/* Resend status message */}
                {resendStatus && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                    {resendStatus}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '44px', justifyContent: 'center' }}
                  >
                    Proceed to Sign In
                  </button>

                  {!isVerified && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Didn't receive instructions? Resend verification
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Link to Sign In */}
            {currentStep !== 3 && (
              <div className="register-prompt-row">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="register-link-btn"
                  id="nav-to-sign-in-link"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
};
