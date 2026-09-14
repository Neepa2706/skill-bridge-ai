import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Award,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import './ApplicationsTrackingView.css';
import './OpportunitiesMarketplaceView.css';

interface ApplicationItem {
  application_id: string;
  student_id: string;
  opportunity_id: string;
  application_status: string;
  applied_at: string;
  last_updated_at: string;
  notes: string | null;
  application_reference: string | null;
  title: string;
  type: string;
  company_name: string;
  company_logo: string | null;
  location: string;
  work_mode: string;
  stipend: string | null;
  salary_range: string | null;
  duration: string | null;
  application_deadline: string;
  apply_url: string | null;
  days_remaining: number;
  is_expired: boolean;
  deadline_badge: string;
}

interface ApplicationsTrackingViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const ApplicationsTrackingView: React.FC<ApplicationsTrackingViewProps> = ({ onNavigate }) => {
  const [apps, setApps] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStage, setFilterStage] = useState('ALL');

  // Edit modal
  const [editingApp, setEditingApp] = useState<ApplicationItem | null>(null);
  const [editStatus, setEditStatus] = useState('APPLIED');
  const [editNotes, setEditNotes] = useState('');
  const [editReference, setEditReference] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch applications');
      const data = await res.json();
      setApps(data);
    } catch (err: any) {
      setError(err.message || 'Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const openEditModal = (app: ApplicationItem) => {
    setEditingApp(app);
    setEditStatus(app.application_status);
    setEditNotes(app.notes || '');
    setEditReference(app.application_reference || '');
  };

  const handleUpdateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/applications/${editingApp.application_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
          application_reference: editReference || null
        })
      });

      if (res.ok) {
        setApps(prev =>
          prev.map(a =>
            a.application_id === editingApp.application_id
              ? {
                  ...a,
                  application_status: editStatus,
                  notes: editNotes,
                  application_reference: editReference || null,
                  last_updated_at: new Date().toISOString()
                }
              : a
          )
        );
        setEditingApp(null);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update application');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!window.confirm('Are you sure you want to remove this application from tracking?')) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/applications/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setApps(prev => prev.filter(a => a.application_id !== appId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const totalCount = apps.length;
  const appliedCount = apps.filter(a => a.application_status === 'APPLIED').length;
  const interviewCount = apps.filter(a => a.application_status === 'INTERVIEW').length;
  const selectedCount = apps.filter(a => a.application_status === 'SELECTED').length;

  const filteredApps = apps.filter(app => {
    if (filterStage === 'ALL') return true;
    return app.application_status === filterStage;
  });

  return (
    <div className="apps-view">
      <button onClick={() => onNavigate('opportunities')} className="opp-back-btn">
        <ArrowLeft className="w-4 h-4" />
        Back to Opportunities
      </button>

      <div className="apps-header">
        <h1>
          <Layers className="w-6 h-6 text-purple-400" />
          My Applications Pipeline
        </h1>
        <p>Monitor your active job applications, interview stages, offers, and recruiter notes in one place.</p>
      </div>

      {/* Summary Metrics */}
      <div className="apps-summary-grid">
        <div
          className={`apps-summary-card clickable ${filterStage === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterStage('ALL')}
        >
          <div className="opp-metric-icon indigo">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="apps-summary-val">{totalCount}</div>
            <div className="apps-summary-lbl">Total Tracked</div>
          </div>
        </div>

        <div
          className={`apps-summary-card clickable ${filterStage === 'APPLIED' ? 'active' : ''}`}
          onClick={() => setFilterStage('APPLIED')}
        >
          <div className="opp-metric-icon cyan">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="apps-summary-val">{appliedCount}</div>
            <div className="apps-summary-lbl">Applied / Under Review</div>
          </div>
        </div>

        <div
          className={`apps-summary-card clickable ${filterStage === 'INTERVIEW' ? 'active' : ''}`}
          onClick={() => setFilterStage('INTERVIEW')}
        >
          <div className="opp-metric-icon purple">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="apps-summary-val">{interviewCount}</div>
            <div className="apps-summary-lbl">In Interview</div>
          </div>
        </div>

        <div
          className={`apps-summary-card clickable ${filterStage === 'SELECTED' ? 'active' : ''}`}
          onClick={() => setFilterStage('SELECTED')}
        >
          <div className="opp-metric-icon emerald">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="apps-summary-val">{selectedCount}</div>
            <div className="apps-summary-lbl">Offers / Selected</div>
          </div>
        </div>
      </div>

      {/* Stage Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {['ALL', 'INTERESTED', 'SAVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'].map(st => (
          <button
            key={st}
            onClick={() => setFilterStage(st)}
            className={`opp-quick-chip ${filterStage === st ? 'active' : ''}`}
          >
            {st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          <p>Loading your tracked applications...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredApps.length > 0 && (
        <div className="apps-list">
          {filteredApps.map(app => (
            <div key={app.application_id} className="app-card">
              <div className="app-main">
                {app.company_logo ? (
                  <img
                    src={app.company_logo}
                    alt={app.company_name}
                    className="app-logo"
                    onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="app-logo-fallback">{app.company_name.charAt(0)}</div>
                )}

                <div className="app-info">
                  <h3>{app.title}</h3>
                  <div className="app-meta">
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{app.company_name}</span>
                    <span>•</span>
                    <span className="opp-pill type">{app.type.replace('_', ' ')}</span>
                    <span className="opp-pill workmode">{app.work_mode}</span>
                    <span className={`app-status-chip ${app.application_status}`}>
                      {app.application_status}
                    </span>
                    {app.application_reference && (
                      <span className="opp-pill" style={{ background: 'rgba(255,255,255,0.05)', color: '#a5b4fc' }}>
                        Ref: {app.application_reference}
                      </span>
                    )}
                  </div>

                  {app.notes && (
                    <div className="app-notes-box">
                      <strong>Notes:</strong> {app.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="app-actions">
                <button
                  onClick={() => openEditModal(app)}
                  className="opp-btn-secondary"
                  title="Update Stage or Notes"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Update
                </button>

                <button
                  onClick={() => onNavigate('opportunity-detail', { id: app.opportunity_id })}
                  className="opp-btn-view"
                >
                  View Role
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(app.application_id)}
                  className="opp-bookmark-btn"
                  title="Remove Tracking"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filteredApps.length === 0 && (
        <div className="opp-empty">
          <div className="opp-empty-icon">
            <Layers className="w-6 h-6" />
          </div>
          <h3>No applications in this stage</h3>
          <p>
            You have no opportunities currently logged under the '{filterStage}' status.
          </p>
          <button onClick={() => setFilterStage('ALL')} className="btn btn-primary">
            View All Applications
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingApp && (
        <div className="opp-modal-backdrop">
          <div className="opp-modal-content">
            <div className="opp-modal-header">
              <h3>
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Update Application Pipeline
              </h3>
              <button onClick={() => setEditingApp(null)} className="opp-modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateApplication}>
              <div className="opp-modal-body">
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Updating status for <strong>{editingApp.title}</strong> at <strong>{editingApp.company_name}</strong>.
                </p>

                <div className="opp-form-group">
                  <label>Application Stage</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="opp-form-control"
                  >
                    <option value="INTERESTED">Interested</option>
                    <option value="SAVED">Saved</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="INTERVIEW">Interview Scheduled</option>
                    <option value="SELECTED">Selected / Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                </div>

                <div className="opp-form-group">
                  <label>Application Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. APX-2026-9812"
                    value={editReference}
                    onChange={e => setEditReference(e.target.value)}
                    className="opp-form-control"
                  />
                </div>

                <div className="opp-form-group">
                  <label>Interview & Application Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Cleared round 1 DSA screening. Technical deep dive scheduled for next Monday."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="opp-form-control"
                  />
                </div>
              </div>

              <div className="opp-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary"
                >
                  {isUpdating ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApplicationsTrackingView;
