import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Sliders, Briefcase, Calendar, Award, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './NotificationsView.css';

interface NotificationsViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
        addToast('All Read', 'All notifications marked as read.', 'info');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        addToast('Deleted', 'Notification removed.', 'info');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEW_INVITATION':
      case 'INTERVIEW_REMINDER':
        return { icon: Calendar, bg: 'hsla(265, 89%, 66%, 0.15)', color: 'var(--primary)' };
      case 'OPPORTUNITY_MATCH':
      case 'OPPORTUNITY_UPDATE':
      case 'APPLICATION_UPDATE':
        return { icon: Briefcase, bg: 'hsla(190, 95%, 45%, 0.15)', color: 'var(--accent-cyan)' };
      case 'MENTORSHIP_UPDATE':
        return { icon: MessageSquare, bg: 'hsla(158, 82%, 40%, 0.15)', color: 'var(--accent-emerald)' };
      case 'SKILL_ACHIEVEMENT':
      case 'TEST_RESULT':
        return { icon: Award, bg: 'hsla(40, 95%, 55%, 0.15)', color: '#f59e0b' };
      default:
        return { icon: Bell, bg: 'hsla(215, 20%, 50%, 0.15)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div className="notifications-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Notification Center</h1>
            {unreadCount > 0 && (
              <span className="badge badge-primary">{unreadCount} New</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Real-time updates regarding interview invites, opportunity matches, and campus placement drives.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-outline btn-sm">
              <CheckCheck size={14} /> Mark All as Read
            </button>
          )}
          <button
            onClick={() => onNavigate && onNavigate('notification-preferences')}
            className="btn btn-outline btn-sm"
          >
            <Sliders size={14} /> Alert Preferences
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading your updates...
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Bell size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>No notifications yet</h3>
          <p style={{ fontSize: '13px' }}>You will receive alert notices when new matches, interviews, or test results arrive.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map(item => {
            const isUnread = !item.is_read;
            const config = getIcon(item.type || 'SYSTEM');
            const Icon = config.icon;

            return (
              <div key={item.id} className={`notif-item ${isUnread ? 'notif-unread' : ''}`}>
                <div className="notif-icon-circle" style={{ background: config.bg, color: config.color }}>
                  <Icon size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: isUnread ? 700 : 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 10px 0', lineHeight: 1.5 }}>
                    {item.message}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <CheckCheck size={13} /> Mark read
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <Trash2 size={13} /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
