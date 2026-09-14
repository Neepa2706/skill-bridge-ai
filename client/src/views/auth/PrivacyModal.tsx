import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
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
                background: 'hsla(152, 76%, 45%, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Privacy Policy
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Data Protection & Candidate Privacy Notice
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
            1. Information We Collect
          </h4>
          <p style={{ marginBottom: '16px' }}>
            We collect account credentials, academic information (institution, department, graduation year), self-declared
            skill levels, diagnostic assessment performance, coding submissions, and communication practice recordings.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            2. How Information is Used
          </h4>
          <p style={{ marginBottom: '16px' }}>
            Data is strictly processed to:
            (a) calibrate personalized skill roadmaps and gap analyses,
            (b) provide verifiable competency reports to your college placement cell, and
            (c) connect candidates with hiring companies based on verified skill benchmarks.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            3. Recruiter Data Sharing
          </h4>
          <p style={{ marginBottom: '16px' }}>
            Only verified skill scores and candidate-authorized profiles are shared with vetted recruiter partner organizations.
            We never sell user data to third-party marketing networks.
          </p>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px' }}>
            4. Security & Cryptographic Protection
          </h4>
          <p style={{ marginBottom: '16px' }}>
            Passwords are salted and cryptographically hashed with bcrypt. Sensitive tokens for email verification
            and session authorization are signed and sha256 encrypted.
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
