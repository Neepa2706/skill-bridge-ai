import React, { useState, useEffect } from 'react';
import { Users, Filter, Search, Award, CheckCircle, Calendar, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './RecruiterApplicationsView.css';

interface RecruiterApplicationsViewProps {
  initialOpportunityId?: string;
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterApplicationsView: React.FC<RecruiterApplicationsViewProps> = ({
  initialOpportunityId,
  onNavigate
}) => {
  const { addToast } = useNotification();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [initialOpportunityId, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      let url = '/api/recruiter/applications';
      const params = new URLSearchParams();
      if (initialOpportunityId) params.append('opportunityId', initialOpportunityId);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setApplications(json.data);
      }
    } catch (e: any) {
      addToast('Error', 'Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      setUpdatingId(appId);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/recruiter/applications/${appId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const json = await res.json();
      if (res.ok) {
        addToast('Status Updated', `Candidate moved to ${newStatus}`, 'success');
        setApplications(prev =>
          prev.map(app => (app.id === appId ? { ...app, status: newStatus } : app))
        );
      } else {
        addToast('Error', json.message || 'Failed to update status', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = applications.filter(app => {
    const q = searchQuery.toLowerCase();
    return (
      app.candidate_name?.toLowerCase().includes(q) ||
      app.candidate_email?.toLowerCase().includes(q) ||
      app.opportunity_title?.toLowerCase().includes(q) ||
      app.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="recruiter-apps-container">
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
          Applicant Pipeline Governance
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Inspect verified student profiles, track candidate progression, and schedule campus interviews.
        </p>
      </div>

      {/* Filter and Search controls */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ width: '100%', paddingLeft: '36px' }}
            placeholder="Search candidate by name, email, department, or posting..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Applications list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading candidate applications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>No candidates found</h3>
          <p style={{ fontSize: '13px' }}>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No applicants match the current filter selection.'
              : 'Students will appear here once they apply to your open opportunities.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(app => (
            <div key={app.id} className="applicant-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '18px',
                      fontWeight: 700
                    }}
                  >
                    {app.candidate_name ? app.candidate_name.charAt(0).toUpperCase() : 'S'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px' }}>{app.candidate_name}</strong>
                      <span className={`app-status-badge status-${(app.status || 'applied').toLowerCase()}`}>
                        {(app.status || 'APPLIED').replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {app.department || 'Computer Science'} • {app.current_year || 'Year 4'} • {app.candidate_email}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px' }}>
                      Applied for: <strong>{app.opportunity_title}</strong>
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CAREER READINESS</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {app.career_readiness_score || 78}%
                    </div>
                  </div>

                  {/* Stage Dropdown */}
                  <select
                    className="input"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    value={app.status || 'APPLIED'}
                    disabled={updatingId === app.id}
                    onChange={e => handleStatusChange(app.id, e.target.value)}
                  >
                    <option value="APPLIED">Applied</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                    <option value="SELECTED">Selected / Hired</option>
                    <option value="REJECTED">Rejected</option>
                  </select>

                  {/* Deep link to skill comparison */}
                  <button
                    onClick={() =>
                      onNavigate &&
                      onNavigate('recruiter-candidate-skills', {
                        candidateId: app.student_id,
                        opportunityId: app.opportunity_id
                      })
                    }
                    className="btn btn-outline btn-sm"
                    title="Inspect AI Verified Skill Comparison"
                  >
                    <Sparkles size={14} color="var(--primary)" /> Skills Breakdown
                  </button>

                  {/* Schedule Interview */}
                  <button
                    onClick={() =>
                      onNavigate &&
                      onNavigate('recruiter-interviews', {
                        candidateId: app.student_id,
                        candidateName: app.candidate_name,
                        opportunityId: app.opportunity_id,
                        applicationId: app.id
                      })
                    }
                    className="btn btn-primary btn-sm"
                  >
                    <Calendar size={14} /> Schedule Interview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
