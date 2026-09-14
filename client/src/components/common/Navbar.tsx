import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Bell, User, LogOut, CheckCircle2, Sparkles } from 'lucide-react';
import { AISettingsModal } from './AISettingsModal';

export const Navbar: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user, profile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  return (
    <header
      style={{
        height: '68px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 900
      }}
    >
      {/* Brand / Role Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>SkillBridge AI</span>
            <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
              {user?.role} Portal
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From Beginner to Placement Ready</span>
        </div>

        {user?.role === 'student' && profile?.career_interest && (
          <div
            className="badge badge-cyan"
            style={{ cursor: 'pointer', padding: '4px 12px' }}
            onClick={() => onNavigate('skill-gaps')}
            title="Target Career Benchmark"
          >
            🎯 Goal: {profile.career_interest} ({Math.round(profile.career_readiness_score || 0)}% Ready)
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* AI Key & Engine Status */}
        <button
          onClick={() => setShowAISettings(true)}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          title="Configure Google Gemini AI Key"
          id="navbar-ai-settings-btn"
        >
          <Sparkles size={15} color="var(--primary)" />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>AI Engine</span>
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn btn-outline btn-sm"
            style={{ position: 'relative', padding: '8px 10px', borderRadius: 'var(--radius-full)' }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-rose)',
                  color: '#fff',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '360px',
                maxHeight: '440px',
                overflowY: 'auto',
                zIndex: 2000,
                boxShadow: 'var(--shadow-lg)',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>In-App Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  No new notifications.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link_url) {
                          onNavigate(n.link_url.replace(/^\//, ''));
                          setShowNotifs(false);
                        }
                      }}
                      style={{
                        padding: '10px',
                        background: n.is_read ? 'transparent' : 'hsla(265, 89%, 66%, 0.1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</span>
                        {n.is_read === 1 && <CheckCircle2 size={13} color="var(--accent-emerald)" />}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              color: '#fff',
              overflow: 'hidden'
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="btn btn-outline btn-sm"
          style={{ padding: '6px 12px', color: 'var(--accent-rose)', borderColor: 'hsla(350, 89%, 60%, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Sign Out"
          id="navbar-sign-out-btn"
        >
          <LogOut size={15} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Sign Out</span>
        </button>
      </div>

      <AISettingsModal
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
      />
    </header>
  );
};
