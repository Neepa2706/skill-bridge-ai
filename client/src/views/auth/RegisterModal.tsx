import React from 'react';
import { X, GraduationCap, Building2, Briefcase, Award, ShieldCheck, ArrowRight } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoleDemo?: (role: string) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSelectRoleDemo
}) => {
  if (!isOpen) return null;

  const roles = [
    {
      id: 'student',
      title: 'Student / Graduate',
      desc: 'Adaptive skill gap analysis, personalized roadmaps, and direct placement opportunities.',
      icon: <GraduationCap size={22} color="var(--primary)" />,
      badge: 'Job Seeker'
    },
    {
      id: 'college',
      title: 'College / Department',
      desc: 'Institutional analytics, batch cohort tracking, and curriculum alignment tools.',
      icon: <Building2 size={22} color="var(--accent-cyan)" />,
      badge: 'Institution'
    },
    {
      id: 'recruiter',
      title: 'Recruiter / Employer',
      desc: 'Verified candidate matching, proctored code reports, and talent pipelines.',
      icon: <Briefcase size={22} color="var(--accent-emerald)" />,
      badge: 'Hiring'
    },
    {
      id: 'mentor',
      title: 'Industry Mentor',
      desc: 'Review mock interviews, provide resume feedback, and host 1-on-1 mentorship.',
      icon: <Award size={22} color="var(--accent-amber)" />,
      badge: 'Guidance'
    }
  ];

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
          maxWidth: '560px',
          padding: '32px',
          position: 'relative'
        }}
      >
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
            padding: '4px'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '20px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
            Account Registration Preview
          </span>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            Choose Your Platform Role
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Full multi-step onboarding is configured in Step 2. You can explore any role right now using demo credentials on the sign in page.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '24px' }}>
          {roles.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'hsla(217, 33%, 20%, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {r.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {r.title}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'hsla(210, 40%, 98%, 0.08)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {r.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.desc}
                  </p>
                </div>
              </div>

              {onSelectRoleDemo && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectRoleDemo(r.id);
                    onClose();
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ whiteSpace: 'nowrap', fontSize: '12px', gap: '4px' }}
                >
                  Test Demo <ArrowRight size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Return to Sign In Page
          </button>
        </div>
      </div>
    </div>
  );
};
