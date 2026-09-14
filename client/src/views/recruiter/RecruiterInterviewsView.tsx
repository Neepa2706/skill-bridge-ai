import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Plus, CheckCircle, XCircle, Users, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './RecruiterInterviewsView.css';

interface RecruiterInterviewsViewProps {
  initialCandidateId?: string;
  initialCandidateName?: string;
  initialOpportunityId?: string;
  initialApplicationId?: string;
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterInterviewsView: React.FC<RecruiterInterviewsViewProps> = ({
  initialCandidateId,
  initialCandidateName,
  initialOpportunityId,
  initialApplicationId,
  onNavigate
}) => {
  const { addToast } = useNotification();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(!!initialCandidateId);

  // Form State
  const [candidateId, setCandidateId] = useState(initialCandidateId || 'usr-student-1');
  const [candidateName, setCandidateName] = useState(initialCandidateName || 'Alex Chen');
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId || 'opp-1');
  const [applicationId, setApplicationId] = useState(initialApplicationId || 'app-1');
  const [interviewType, setInterviewType] = useState('TECHNICAL');
  const [scheduledDate, setScheduledDate] = useState('2026-10-05');
  const [scheduledTime, setScheduledTime] = useState('14:30');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingLink, setMeetingLink] = useState('https://meet.skillbridge.ai/room-nexus-talent');
  const [instructions, setInstructions] = useState('Please have your code editor and web browser open for a live paired problem-solving session.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/interviews', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setInterviews(json.data);
      }
    } catch (e: any) {
      addToast('Error', 'Failed to load interviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateId,
          opportunityId,
          applicationId,
          interviewType,
          scheduledDate,
          scheduledTime,
          durationMinutes,
          meetingLink,
          instructions
        })
      });

      const json = await res.json();
      if (res.ok) {
        addToast('Interview Scheduled', 'Calendar invite & portal notification sent to candidate.', 'success');
        setShowScheduleModal(false);
        fetchInterviews();
      } else {
        addToast('Error', json.message || 'Failed to schedule interview', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/recruiter/interviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        addToast('Interview Updated', `Status changed to ${newStatus}.`, 'info');
        fetchInterviews();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  return (
    <div className="recruiter-interviews-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
            Campus Interview Schedule
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Coordinate and manage live technical evaluations, cultural fit chats, and hiring panel interviews.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onNavigate && (
            <button onClick={() => onNavigate('recruiter-applications')} className="btn btn-outline">
              <Users size={16} /> All Applicants
            </button>
          )}
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary">
            <Plus size={16} /> Schedule Interview
          </button>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="card" style={{ border: '2px solid var(--primary)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Schedule Candidate Interview</h2>
            <button onClick={() => setShowScheduleModal(false)} className="btn btn-outline btn-sm">
              Cancel
            </button>
          </div>

          <form onSubmit={handleScheduleInterview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>CANDIDATE ID / NAME</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={candidateName}
                  onChange={e => {
                    setCandidateName(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>ROUND TYPE</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={interviewType}
                  onChange={e => setInterviewType(e.target.value)}
                >
                  <option value="TECHNICAL">Technical Round 1 (Coding & Algorithms)</option>
                  <option value="SYSTEM_DESIGN">Technical Round 2 (System Architecture)</option>
                  <option value="HR">HR & Cultural Fit Round</option>
                  <option value="FINAL_EXECUTIVE">Final Executive Discussion</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>DATE</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TIME</label>
                <input
                  type="time"
                  className="input"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>DURATION (MINUTES)</label>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>MEETING / VIDEO ROOM LINK</label>
              <input
                type="url"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... or https://meet.skillbridge.ai/..."
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>INSTRUCTIONS FOR CANDIDATE</label>
              <textarea
                className="input"
                rows={3}
                style={{ width: '100%', marginTop: '4px', resize: 'vertical' }}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minWidth: '160px' }}>
                <Calendar size={16} /> {submitting ? 'Scheduling...' : 'Confirm & Notify'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interviews List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading scheduled interviews...
        </div>
      ) : interviews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>No interviews scheduled</h3>
          <p style={{ fontSize: '13px', marginBottom: '16px' }}>
            Schedule interview sessions with shortlisted students to initiate live evaluation.
          </p>
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Schedule Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {interviews.map(item => {
            const isScheduled = item.status === 'SCHEDULED';
            const isCompleted = item.status === 'COMPLETED';
            const isCancelled = item.status === 'CANCELLED';

            return (
              <div key={item.id} className="interview-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{item.candidate_name || 'Candidate'}</h3>
                    <span
                      className={
                        isCompleted
                          ? 'interview-badge-completed'
                          : isCancelled
                          ? 'interview-badge-cancelled'
                          : 'interview-badge-scheduled'
                      }
                    >
                      {item.status}
                    </span>
                    <span className="badge badge-subtle">{item.interview_type}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span><Calendar size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {item.scheduled_date} at {item.scheduled_time}</span>
                    <span><Clock size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {item.duration_minutes} Mins</span>
                    <span>Position: <strong>{item.opportunity_title || 'Campus Placement Drive'}</strong></span>
                  </div>

                  {item.meeting_link && (
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <a
                        href={item.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <Video size={13} /> {item.meeting_link} <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Status action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isScheduled && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--accent-emerald)', borderColor: 'hsla(158, 82%, 40%, 0.3)' }}
                      >
                        <CheckCircle size={14} /> Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'CANCELLED')}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--accent-rose)', borderColor: 'hsla(0, 75%, 60%, 0.3)' }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
