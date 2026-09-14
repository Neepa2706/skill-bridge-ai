import React, { useState, useEffect } from 'react';
import { OpportunityItem } from '../../types';
import { Briefcase, Layers, Calendar, CheckCircle2, Sparkles, MapPin, DollarSign, Clock, ExternalLink } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const OpportunityPortal: React.FC<{ initialTab?: 'internships' | 'jobs' | 'events' | 'pipeline' }> = ({ initialTab = 'internships' }) => {
  const { addToast } = useNotification();
  const [tab, setTab] = useState<'internships' | 'jobs' | 'events' | 'pipeline'>(initialTab);
  const [internships, setInternships] = useState<OpportunityItem[]>([]);
  const [jobs, setJobs] = useState<OpportunityItem[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('sb_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [internRes, jobRes, eventRes, appRes] = await Promise.all([
        fetch('/api/opportunities/internships', { headers }),
        fetch('/api/opportunities/jobs', { headers }),
        fetch('/api/opportunities/events', { headers }),
        fetch('/api/opportunities/my-applications', { headers })
      ]);

      if (internRes.ok) setInternships(await internRes.json());
      if (jobRes.ok) setJobs(await jobRes.json());
      if (eventRes.ok) setEvents(await eventRes.json());
      if (appRes.ok) setApplications(await appRes.json());
    } catch (e) {
      console.error('Failed to load opportunities:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (opportunityType: 'internship' | 'job', item: OpportunityItem) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/opportunities/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          opportunityType,
          opportunityId: item.id,
          matchScore: item.matchScore,
          matchReason: item.matchExplanation
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Application Submitted', data.message, 'success');
        fetchOpportunities();
      } else {
        addToast('Application Notice', data.error, 'warning');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const pipelineStages = [
    'applied',
    'assessment',
    'coding_round',
    'shortlisted',
    'interview',
    'selected',
    'offer'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>Career & Placement Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Curated internships, full-time engineering jobs, and competitive hackathons with AI match explanations.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('internships')}
            className={`btn ${tab === 'internships' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Briefcase size={15} /> Internships ({internships.length})
          </button>
          <button
            onClick={() => setTab('jobs')}
            className={`btn ${tab === 'jobs' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Layers size={15} /> Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`btn ${tab === 'events' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Calendar size={15} /> Hackathons & Events ({events.length})
          </button>
          <button
            onClick={() => setTab('pipeline')}
            className={`btn ${tab === 'pipeline' ? 'btn-cyan' : 'btn-outline'}`}
          >
            <CheckCircle2 size={15} /> My Applications ({applications.length})
          </button>
        </div>
      </div>

      {/* TAB 1: INTERNSHIPS */}
      {tab === 'internships' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {internships.map(item => (
            <div key={item.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <img src={item.company_name?.includes('Nexus') ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=128&q=80' : 'https://images.unsplash.com/photo-1516116211227-bbc13c733359?auto=format&fit=crop&w=128&q=80'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', lineHeight: 1.3 }}>{item.title}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{item.company_name}</div>
                  </div>
                </div>

                {/* AI Match Score Badge */}
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: item.matchScore >= 75 ? 'hsla(152, 76%, 45%, 0.15)' : 'hsla(38, 92%, 50%, 0.15)',
                    border: `1px solid ${item.matchScore >= 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: item.matchScore >= 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {item.matchScore}%
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>AI MATCH</div>
                </div>
              </div>

              {/* Match Explanation */}
              <div
                style={{
                  padding: '10px 12px',
                  background: 'hsla(265, 89%, 66%, 0.08)',
                  border: '1px solid hsla(265, 89%, 66%, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={15} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Match Analysis:</strong> {item.matchExplanation}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {item.location} ({item.work_mode})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DollarSign size={14} /> {item.stipend}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> Deadline: {item.deadline}
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.requiredSkills?.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="badge badge-primary" style={{ fontSize: '11px' }}>{s}</span>
                  ))}
                </div>

                {item.isApplied ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={13} /> Applied
                  </span>
                ) : (
                  <button onClick={() => handleApply('internship', item)} className="btn btn-primary btn-sm">
                    Apply with Verified Skills
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: JOBS */}
      {tab === 'jobs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {jobs.map(item => (
            <div key={item.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px' }}>{item.title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{item.company_name}</div>
                </div>

                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: item.matchScore >= 75 ? 'hsla(152, 76%, 45%, 0.15)' : 'hsla(38, 92%, 50%, 0.15)',
                    border: `1px solid ${item.matchScore >= 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: item.matchScore >= 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {item.matchScore}%
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)' }}>AI MATCH</div>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  background: 'hsla(265, 89%, 66%, 0.08)',
                  border: '1px solid hsla(265, 89%, 66%, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={15} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Match Analysis:</strong> {item.matchExplanation}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>📍 {item.location} ({item.work_mode})</span>
                <span>💰 {item.salary_range}</span>
                <span>📅 Deadline: {item.deadline}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.requiredSkills?.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="badge badge-primary" style={{ fontSize: '11px' }}>{s}</span>
                  ))}
                </div>

                {item.isApplied ? (
                  <span className="badge badge-success">
                    <CheckCircle2 size={13} /> Applied
                  </span>
                ) : (
                  <button onClick={() => handleApply('job', item)} className="btn btn-primary btn-sm">
                    Apply for Position
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: EVENTS & HACKATHONS */}
      {tab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {events.map(evt => (
            <div key={evt.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge badge-cyan" style={{ textTransform: 'uppercase' }}>
                  {evt.event_type}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{evt.date}</span>
              </div>

              <h3 style={{ fontSize: '17px' }}>{evt.title}</h3>
              <div style={{ fontSize: '13px', color: 'var(--primary)' }}>Organizer: {evt.organizer_name}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {evt.description}
              </p>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <div>📍 Location: {evt.location}</div>
                <div>🎯 Eligibility: {evt.eligibility}</div>
              </div>

              <a
                href={evt.registration_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
              >
                Register for Event <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: MY APPLICATION PIPELINE */}
      {tab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No active applications yet. Browse internships and jobs to apply.</p>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px' }}>{app.title}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>{app.company_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>
                      Current Stage: {app.current_stage.replace('_', ' ')}
                    </span>
                    <span className="badge badge-primary">{app.match_score}% Match</span>
                  </div>
                </div>

                {/* Pipeline Progression Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '10px 0' }}>
                  {pipelineStages.map((stg, sIdx) => {
                    const currentStageIdx = pipelineStages.indexOf(app.current_stage);
                    const isPassed = sIdx <= currentStageIdx;
                    const isCurrent = sIdx === currentStageIdx;
                    return (
                      <div
                        key={stg}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          background: isCurrent ? 'var(--primary-gradient)' : isPassed ? 'hsla(152, 76%, 45%, 0.15)' : 'var(--bg-surface)',
                          border: `1px solid ${isCurrent ? 'transparent' : isPassed ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                          color: isCurrent ? '#fff' : isPassed ? 'var(--accent-emerald)' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isPassed && <CheckCircle2 size={13} />}
                        <span>{stg.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                  {app.match_reason}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
