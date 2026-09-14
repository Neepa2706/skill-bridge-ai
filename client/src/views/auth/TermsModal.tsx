import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
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
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'hsla(265, 89%, 66%, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Terms of Service
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                SkillBridge AI Platform Agreement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
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
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            fontSize: '13px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)'
          }}
        >
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            1. Acceptance of Terms
          </h4>
          <p style={{ marginBottom: '16px' }}>
            By registering for an account on SkillBridge AI (“From Beginner to Placement Ready”), you agree to abide
            by these Terms of Service, platform honor codes, and applicable institutional regulations.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            2. Platform Purpose & Academic Integrity
          </h4>
          <p style={{ marginBottom: '16px' }}>
            SkillBridge AI provides adaptive diagnostic assessments, automated skill analysis, coding sandbox practice,
            multilingual interview preparation, and placement connection tools. Users agree to submit original work
            during proctored safe assessments and code evaluations without plagiarism or automated solver tools.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            3. Account Roles & Institutional Verification
          </h4>
          <p style={{ marginBottom: '16px' }}>
            Student accounts are activated upon email verification. College/Department, Recruiter/Company, and Mentor
            accounts are subject to administrative review and verification before receiving verified institutional access.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            4. Placement Readiness & Recruiter Matching
          </h4>
          <p style={{ marginBottom: '16px' }}>
            Placement readiness metrics, badges, and skill scores benchmark competencies against industry hiring standards.
            SkillBridge AI does not guarantee employment offers, which remain at the discretion of hiring partner companies.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 24px', fontSize: '13px' }}
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
