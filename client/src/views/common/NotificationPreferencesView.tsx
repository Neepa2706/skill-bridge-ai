import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Bell, Mail, Briefcase, Calendar, MessageSquare, ShieldCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './NotificationPreferencesView.css';

interface NotificationPreferencesViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const NotificationPreferencesView: React.FC<NotificationPreferencesViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    inAppAlerts: true,
    opportunityAlerts: true,
    interviewAlerts: true,
    mentorshipAlerts: true,
    systemAlerts: true
  });

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setPrefs(json.data);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Preferences Saved', 'Alert channel settings updated.', 'success');
      } else {
        addToast('Error', json.message || 'Failed to update preferences', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pref-container">
      {onNavigate && (
        <button
          onClick={() => onNavigate('notifications')}
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={14} /> Back to Notifications
        </button>
      )}

      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
          Notification & Alert Preferences
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Configure your channels and specify which events trigger instant notifications.
        </p>
      </div>

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Delivery Channels</h2>

        <div className="pref-row">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Bell size={20} color="var(--primary)" />
            <div>
              <strong style={{ fontSize: '14px' }}>In-App Toast & Notification Drawer</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Receive real-time banners and badges inside SkillBridge AI while active.
              </div>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prefs.inAppAlerts}
              onChange={e => setPrefs({ ...prefs, inAppAlerts: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="pref-row">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Mail size={20} color="var(--accent-cyan)" />
            <div>
              <strong style={{ fontSize: '14px' }}>Email Summary Digests</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Send instant email alerts for high-priority placement invites and deadlines.
              </div>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prefs.emailAlerts}
              onChange={e => setPrefs({ ...prefs, emailAlerts: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: '20px', marginBottom: '8px' }}>Event Categories</h2>

        <div className="pref-row">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Briefcase size={20} color="var(--accent-emerald)" />
            <div>
              <strong style={{ fontSize: '14px' }}>Opportunity Matches & Application Status</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Alert when opportunities match your profile or recruiter status updates occur.
              </div>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prefs.opportunityAlerts}
              onChange={e => setPrefs({ ...prefs, opportunityAlerts: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="pref-row">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Calendar size={20} color="var(--primary)" />
            <div>
              <strong style={{ fontSize: '14px' }}>Campus Interview Rounds & Reminders</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Reminders 1 hour prior to recruiter interviews and mentor sessions.
              </div>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prefs.interviewAlerts}
              onChange={e => setPrefs({ ...prefs, interviewAlerts: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="pref-row">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <MessageSquare size={20} color="#f59e0b" />
            <div>
              <strong style={{ fontSize: '14px' }}>Live Mentorship Requests & Feedback</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Session confirmations and post-session constructive feedback notes.
              </div>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prefs.mentorshipAlerts}
              onChange={e => setPrefs({ ...prefs, mentorshipAlerts: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '160px' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
