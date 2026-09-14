import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Filter, Users, CheckCircle2, Clock, MapPin, XCircle, ArrowRight } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './RecruiterOpportunitiesView.css';

interface RecruiterOpportunitiesViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterOpportunitiesView: React.FC<RecruiterOpportunitiesViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setOpportunities(json.data);
      }
    } catch (e: any) {
      addToast('Error', 'Failed to load opportunities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOpportunity = async (id: string) => {
    if (!window.confirm('Are you sure you want to close this opportunity? It will no longer accept new student applications.')) {
      return;
    }

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/recruiter/opportunities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Opportunity Closed', 'Opportunity status marked as CLOSED.', 'info');
        fetchOpportunities();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const filtered = opportunities.filter(o => {
    const matchesSearch =
      o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PUBLISHED' && o.status === 'PUBLISHED') ||
      (statusFilter === 'PENDING' && o.verification_status === 'PENDING') ||
      (statusFilter === 'CLOSED' && o.status === 'CLOSED');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="recruiter-opps-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
            Managed Opportunities
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Monitor campus job drives, review incoming applicant cohorts, and maintain postings.
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('recruiter-create-opportunity')}
          className="btn btn-primary"
        >
          <Plus size={16} /> Post New Opportunity
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            style={{ width: '100%', paddingLeft: '36px' }}
            placeholder="Search by role title, keyword, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PUBLISHED', 'PENDING', 'CLOSED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline'}`}
            >
              {status === 'ALL' ? 'All Opportunities' : status === 'PENDING' ? 'Pending Moderation' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading your postings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Briefcase size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>No opportunities found</h3>
          <p style={{ fontSize: '13px', marginBottom: '20px' }}>
            {searchQuery ? 'Try adjusting your search terms or filters.' : 'Post your first campus opportunity to begin hiring verified students.'}
          </p>
          <button
            onClick={() => onNavigate && onNavigate('recruiter-create-opportunity')}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Post Opportunity
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(opp => {
            const isPending = opp.verification_status === 'PENDING';
            const isPublished = opp.status === 'PUBLISHED';
            const isClosed = opp.status === 'CLOSED';

            return (
              <div key={opp.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{opp.title}</h3>
                      <span className={`opp-status-badge ${isPublished ? 'status-published' : isPending ? 'status-pending' : isClosed ? 'status-closed' : 'status-draft'}`}>
                        {isPending ? 'Pending Moderation' : opp.status}
                      </span>
                      <span className="badge badge-subtle">{opp.type}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px', flexWrap: 'wrap' }}>
                      <span><MapPin size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {opp.location || 'Remote'} ({opp.work_mode || 'Hybrid'})</span>
                      <span><Clock size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Deadline: {opp.application_deadline || 'Open'}</span>
                      <span>Stipend/CTC: <strong style={{ color: 'var(--text-primary)' }}>{opp.salary || opp.stipend || 'Competitive'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onNavigate && onNavigate('recruiter-applications', { opportunityId: opp.id })}
                      className="btn btn-primary btn-sm"
                    >
                      <Users size={14} /> View Applicants ({opp.applications_count || 0})
                    </button>
                    {!isClosed && (
                      <button
                        onClick={() => handleCloseOpportunity(opp.id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--accent-rose)', borderColor: 'hsla(0, 75%, 60%, 0.3)' }}
                      >
                        <XCircle size={14} /> Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics ribbon */}
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    padding: '10px 16px',
                    background: 'var(--bg-base)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total Applicants: </span>
                    <strong>{opp.applications_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Shortlisted: </span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>{opp.shortlisted_count || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Target Batch: </span>
                    <span>{opp.eligibility || 'Graduating Batch 2026'}</span>
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
