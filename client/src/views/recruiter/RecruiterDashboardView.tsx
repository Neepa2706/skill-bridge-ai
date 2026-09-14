import React, { useState, useEffect } from 'react';
import { Briefcase, UserCheck, Plus, Layers, CheckCircle, Search, Filter, Sparkles, Building, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface RecruiterDashboardViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterDashboardView: React.FC<RecruiterDashboardViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'candidates'>('overview');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('');
  const [minReadiness, setMinReadiness] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboard();
    fetchCandidates();
  }, [selectedSkillFilter, minReadiness]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDashboard(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load recruiter dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      let url = `/api/recruiter/candidates?minReadiness=${minReadiness}`;
      if (selectedSkillFilter) url += `&skill=${encodeURIComponent(selectedSkillFilter)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCandidates(await res.json());
      }
    } catch (e) {
      console.error('Failed to load candidates:', e);
    }
  };

  const handleUpdateStage = async (applicationId: string, newStage: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/recruiter/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStage })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Pipeline Updated', data.message || 'Stage updated successfully.', 'success');
        fetchDashboard();
      } else {
        addToast('Error', data.message || 'Failed to update stage', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const summary = dashboard?.summaryCards || {
    activeJobs: 3,
    totalCandidates: 12,
    pendingApplications: 5,
    shortlisted: 4,
    selected: 2,
    upcomingInterviews: 3
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800 }}>Recruitment & Campus Talent Portal</h1>
            {dashboard?.company && (
              <span className="badge" style={{ background: 'hsla(158, 82%, 40%, 0.15)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                <ShieldCheck size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {dashboard.company.name || 'Verified Partner'}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            AI-Assisted Candidate Sourcing, Verified Skill Matching, and Campus Interview Pipeline
          </p>
        </div>

        {/* Quick Nav Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('recruiter-opportunities') : null}
            className="btn btn-outline"
          >
            <Briefcase size={15} /> Postings
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('recruiter-applications') : setActiveTab('pipeline')}
            className="btn btn-outline"
          >
            <Layers size={15} /> Applications
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('recruiter-interviews') : null}
            className="btn btn-outline"
          >
            <Calendar size={15} /> Interviews
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('recruiter-company-profile') : null}
            className="btn btn-outline"
          >
            <Building size={15} /> Company Profile
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('recruiter-create-opportunity') : null}
            className="btn btn-cyan"
          >
            <Plus size={16} /> Post Opportunity
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIVE POSTS</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {summary.activeJobs}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Campus Drives & Jobs</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL APPLICANTS</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
            {summary.totalCandidates}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Verified student dossiers</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>UNDER REVIEW</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            {summary.pendingApplications}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Awaiting recruiter evaluation</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SHORTLISTED</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-emerald)', margin: '4px 0' }}>
            {summary.shortlisted}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Advanced to rounds</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>INTERVIEWS</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>
            {summary.upcomingInterviews}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Scheduled technical sessions</div>
        </div>
      </div>

      {/* VIEW: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Recent Applications Preview */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Recent Candidate Applications</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Students who applied to your open campus listings with proctored safe exam scores.
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate('recruiter-applications')}
                className="btn btn-outline btn-sm"
              >
                View All Pipeline <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>Candidate</th>
                    <th style={{ padding: '12px' }}>Opportunity</th>
                    <th style={{ padding: '12px' }}>Department</th>
                    <th style={{ padding: '12px' }}>Readiness Score</th>
                    <th style={{ padding: '12px' }}>Current Stage</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.recentApplications || []).slice(0, 5).map((app: any) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.3)' }}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{app.candidate_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.candidate_email}</div>
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                        {app.opportunity_title || 'Campus Placement'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        {app.department || 'Computer Science'} ({app.current_year || 'Year 4'})
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {app.career_readiness_score || 78}%
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className="badge badge-subtle" style={{ textTransform: 'uppercase' }}>
                          {(app.status || 'APPLIED').replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() =>
                            onNavigate &&
                            onNavigate('recruiter-candidate-skills', {
                              candidateId: app.student_id,
                              opportunityId: app.opportunity_id
                            })
                          }
                          className="btn btn-outline btn-sm"
                          style={{ marginRight: '6px' }}
                        >
                          <Sparkles size={12} /> Skills
                        </button>
                        <button
                          onClick={() =>
                            onNavigate &&
                            onNavigate('recruiter-interviews', {
                              candidateId: app.student_id,
                              candidateName: app.candidate_name,
                              opportunityId: app.opportunity_id
                            })
                          }
                          className="btn btn-primary btn-sm"
                        >
                          Interview
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Interviews & Opportunities Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Upcoming Interviews */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Upcoming Campus Interviews</h3>
                <button onClick={() => onNavigate && onNavigate('recruiter-interviews')} className="btn btn-outline btn-sm">
                  Schedule <Plus size={12} />
                </button>
              </div>

              {(dashboard?.upcomingInterviews || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No interviews scheduled for this week.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(dashboard?.upcomingInterviews || []).slice(0, 3).map((item: any) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-base)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>{item.candidate_name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.scheduled_date} at {item.scheduled_time} ({item.interview_type})
                        </div>
                      </div>
                      <span className="badge badge-primary">{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Postings */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Active Postings</h3>
                <button onClick={() => onNavigate && onNavigate('recruiter-opportunities')} className="btn btn-outline btn-sm">
                  Manage <ArrowRight size={12} />
                </button>
              </div>

              {(dashboard?.opportunities || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No active postings.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(dashboard?.opportunities || []).slice(0, 3).map((opp: any) => (
                    <div
                      key={opp.id}
                      style={{
                        background: 'var(--bg-base)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>{opp.title}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {opp.type} • {opp.location}
                        </div>
                      </div>
                      <span className="badge" style={{ background: opp.status === 'PUBLISHED' ? 'hsla(158, 82%, 40%, 0.15)' : 'hsla(40, 95%, 55%, 0.15)', color: opp.status === 'PUBLISHED' ? 'var(--accent-emerald)' : '#f59e0b' }}>
                        {opp.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TALENT SEARCH */}
      {activeTab === 'candidates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                FILTER BY SKILL:
              </span>
              <select
                value={selectedSkillFilter}
                onChange={e => setSelectedSkillFilter(e.target.value)}
                className="input"
              >
                <option value="">All Skills</option>
                <option value="Python">Python</option>
                <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                <option value="Database Systems & SQL">Database Systems & SQL</option>
                <option value="Problem Solving & Logic">Problem Solving & Logic</option>
                <option value="English Communication">English Communication</option>
              </select>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                MINIMUM READINESS SCORE: {minReadiness}%
              </span>
              <input
                type="range"
                min={40}
                max={90}
                value={minReadiness}
                onChange={e => setMinReadiness(Number(e.target.value))}
                style={{ width: '180px' }}
              />
            </div>

            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {candidates.length} verified candidate dossiers
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {candidates.map(c => (
              <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{c.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.department} • Year {c.year}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {c.readinessScore}%
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>READINESS</div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>
                  Target Role: <strong>{c.targetRole}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>VERIFIED SKILLS:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {c.verifiedSkills?.map((s: any) => (
                      <span key={s.name} className="badge badge-subtle" style={{ fontSize: '11px' }}>
                        {s.name}: {s.verified_score}%
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    onClick={() =>
                      onNavigate &&
                      onNavigate('recruiter-candidate-skills', {
                        candidateId: c.id
                      })
                    }
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    View Skill Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
