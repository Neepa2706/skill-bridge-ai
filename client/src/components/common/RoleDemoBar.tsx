import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const RoleDemoBar: React.FC = () => {
  const { user, switchRole, isLoading } = useAuth();

  const roles: Array<{ id: UserRole; label: string; icon: string; subtitle: string }> = [
    { id: 'student', label: 'Student', icon: '🎓', subtitle: 'Alex Rivera (CS 3rd Year)' },
    { id: 'college', label: 'College / Dept', icon: '🏛️', subtitle: 'Prof. Arthur Vance (SIT)' },
    { id: 'recruiter', label: 'Recruiter', icon: '💼', subtitle: 'Marcus Reed (Nexus Tech)' },
    { id: 'mentor', label: 'Live Mentor', icon: '🎙️', subtitle: 'Dr. Sarah Chen (FAANG Architect)' },
    { id: 'admin', label: 'Admin', icon: '🛡️', subtitle: 'System Administrator' }
  ];

  return (
    <div className="role-demo-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontWeight: 800, letterSpacing: '0.04em', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SKILLBRIDGE AI
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
          Interactive Role Switcher
        </span>
      </div>

      <div className="role-pills">
        {roles.map(r => {
          const isActive = user?.role === r.id;
          return (
            <button
              key={r.id}
              className={`role-pill ${isActive ? 'active' : ''}`}
              onClick={() => switchRole(r.id)}
              disabled={isLoading}
              title={r.subtitle}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
              {isActive && <span style={{ fontSize: '10px', opacity: 0.85 }}>● Active</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
