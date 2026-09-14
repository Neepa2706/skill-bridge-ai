import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Briefcase,
  Flag,
  CheckCircle2,
  XCircle,
  Star,
  Lock,
  Plus,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import './AdminOpportunitiesView.css';

interface AdminOpportunity {
  id: string;
  title: string;
  type: string;
  company_name: string;
  location: string;
  work_mode: string;
  status: string;
  verification_status: string;
  is_featured: number;
  application_deadline: string;
  created_at: string;
}

interface OpportunityReport {
  id: string;
  reported_by: string;
  reporter_name: string;
  reporter_email: string;
  opportunity_id: string;
  opportunity_title: string;
  company_name: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

interface AdminOpportunitiesViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const AdminOpportunitiesView: React.FC<AdminOpportunitiesViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'listings' | 'reports' | 'create'>('listings');
  const [listings, setListings] = useState<AdminOpportunity[]>([]);
  const [reports, setReports] = useState<OpportunityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Admin New Opportunity
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('INTERNSHIP');
  const [formCompany, setFormCompany] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formLocation, setFormLocation] = useState('Bengaluru, Karnataka');
  const [formWorkMode, setFormWorkMode] = useState('HYBRID');
  const [formStipend, setFormStipend] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formDeadline, setFormDeadline] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formApplyUrl, setFormApplyUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/opportunities?verificationStatus=ALL&limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load listings');
      const data = await res.json();
      setListings(data.opportunities || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/opportunity-reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  // Moderation Actions
  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/opportunities/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchListings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/opportunities/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchListings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFeature = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/opportunities/${id}/feature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchListings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async (id: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/opportunities/${id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchListings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveReport = async (reportId: string, action: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/admin/opportunity-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      fetchReports();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('sb_token');
      const skillsArray = formSkills.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          type: formType,
          company_name: formCompany,
          description: formDesc,
          required_skills: skillsArray,
          location: formLocation,
          work_mode: formWorkMode,
          stipend: formStipend || null,
          salary_range: formSalary || null,
          application_deadline: new Date(formDeadline).toISOString(),
          apply_url: formApplyUrl || null,
          status: 'PUBLISHED',
          verification_status: 'VERIFIED',
          is_featured: 1
        })
      });

      if (res.ok) {
        alert('Opportunity created and published successfully!');
        setFormTitle('');
        setFormCompany('');
        setFormDesc('');
        setFormSkills('');
        setActiveTab('listings');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create opportunity');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-opps-view">
      <div className="admin-header">
        <div>
          <h1>
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            Opportunities & Moderation Console
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Verify recruiter submissions, feature high-value openings, and address student reporting tickets.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Post Verified Opportunity
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab('listings')}
          className={`admin-tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
        >
          <Briefcase className="w-4 h-4" />
          Moderation Queue ({listings.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <Flag className="w-4 h-4 text-rose-400" />
          Student Reports ({reports.filter(r => r.status === 'PENDING').length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`admin-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
        >
          <Plus className="w-4 h-4" />
          Post New Role
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          <p>Loading moderation records...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      {/* Tab 1: Listings Moderation */}
      {activeTab === 'listings' && !loading && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Type</th>
                <th>Location / Mode</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(opp => (
                <tr key={opp.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{opp.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{opp.company_name}</div>
                  </td>
                  <td>
                    <span className="opp-pill type">{opp.type}</span>
                  </td>
                  <td>
                    <div>{opp.location}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opp.work_mode}</div>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '11px',
                      color: opp.status === 'PUBLISHED' ? '#34d399' : opp.status === 'CLOSED' ? '#94a3b8' : '#f87171'
                    }}>
                      {opp.status}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '11px',
                      color: opp.verification_status === 'VERIFIED' ? '#38bdf8' : opp.verification_status === 'FLAGGED' ? '#fbbf24' : '#f87171'
                    }}>
                      {opp.verification_status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleFeature(opp.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      title="Toggle Featured"
                    >
                      <Star className={`w-4 h-4 ${opp.is_featured ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    </button>
                  </td>
                  <td>
                    <div className="admin-act-btns">
                      {opp.verification_status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleApprove(opp.id)}
                          className="admin-act-btn approve"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {opp.verification_status !== 'REJECTED' && (
                        <button
                          onClick={() => handleReject(opp.id)}
                          className="admin-act-btn reject"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      {opp.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleClose(opp.id)}
                          className="admin-act-btn close"
                        >
                          <Lock className="w-3.5 h-3.5" /> Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Student Reports */}
      {activeTab === 'reports' && !loading && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reported Role</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Report Status</th>
                <th>Resolve Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(rep => (
                <tr key={rep.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{rep.opportunity_title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{rep.company_name}</div>
                  </td>
                  <td>
                    <div>{rep.reporter_name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{rep.reporter_email}</div>
                  </td>
                  <td>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>{rep.reason}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', maxWidth: '280px', color: '#cbd5e1' }}>
                      {rep.description || 'No additional note.'}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '11px',
                      color: rep.status === 'PENDING' ? '#f87171' : rep.status === 'RESOLVED' ? '#34d399' : '#94a3b8'
                    }}>
                      {rep.status}
                    </span>
                  </td>
                  <td>
                    {rep.status === 'PENDING' ? (
                      <div className="admin-act-btns">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'DISMISS')}
                          className="admin-act-btn close"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'FLAG')}
                          className="admin-act-btn feature"
                        >
                          Flag
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'UNPUBLISH')}
                          className="admin-act-btn reject"
                        >
                          Unpublish
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No student reports pending moderation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Post Opportunity Form */}
      {activeTab === 'create' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus className="w-5 h-5 text-indigo-400" />
            Create Verified Opportunity
          </h2>

          <form onSubmit={handleCreateOpportunity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="opp-form-group">
              <label>Role Title *</label>
              <input
                type="text"
                required
                placeholder="e.g., Cloud & Distributed Systems Intern"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="opp-form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="opp-form-group">
                <label>Opportunity Type *</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="opp-form-control"
                >
                  <option value="INTERNSHIP">Internship</option>
                  <option value="JOB">Full-time Job</option>
                  <option value="HIRING_DRIVE">Hiring Drive</option>
                  <option value="PLACEMENT_DRIVE">Placement Drive</option>
                  <option value="EVENT">Career Event</option>
                  <option value="HACKATHON">Hackathon</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="COMPETITION">Coding Competition</option>
                </select>
              </div>

              <div className="opp-form-group">
                <label>Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Google Cloud Systems"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  className="opp-form-control"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="opp-form-group">
                <label>Work Mode *</label>
                <select
                  value={formWorkMode}
                  onChange={e => setFormWorkMode(e.target.value)}
                  className="opp-form-control"
                >
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">Onsite</option>
                </select>
              </div>

              <div className="opp-form-group">
                <label>Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bengaluru, Karnataka"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="opp-form-control"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="opp-form-group">
                <label>Stipend (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., ₹25,000 / month"
                  value={formStipend}
                  onChange={e => setFormStipend(e.target.value)}
                  className="opp-form-control"
                />
              </div>

              <div className="opp-form-group">
                <label>Salary Range / CTC (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., ₹8.0 - 12.0 LPA"
                  value={formSalary}
                  onChange={e => setFormSalary(e.target.value)}
                  className="opp-form-control"
                />
              </div>
            </div>

            <div className="opp-form-group">
              <label>Required Skills (Comma separated) *</label>
              <input
                type="text"
                required
                placeholder="Python, React, Docker, Linux, SQL"
                value={formSkills}
                onChange={e => setFormSkills(e.target.value)}
                className="opp-form-control"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="opp-form-group">
                <label>Application Deadline *</label>
                <input
                  type="date"
                  required
                  value={formDeadline}
                  onChange={e => setFormDeadline(e.target.value)}
                  className="opp-form-control"
                />
              </div>

              <div className="opp-form-group">
                <label>External Apply URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://company.example.com/apply"
                  value={formApplyUrl}
                  onChange={e => setFormApplyUrl(e.target.value)}
                  className="opp-form-control"
                />
              </div>
            </div>

            <div className="opp-form-group">
              <label>Full Role Description *</label>
              <textarea
                rows={5}
                required
                placeholder="Describe key responsibilities, daily work, and engineering culture..."
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                className="opp-form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('listings')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Verified Opportunity'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default AdminOpportunitiesView;
