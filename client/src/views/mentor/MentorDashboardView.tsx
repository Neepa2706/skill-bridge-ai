import React, { useState, useEffect } from 'react';
import { Calendar, Video, Award, CheckCircle2, User, Clock, AlertTriangle, Shield, Check, X } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './MentorDashboardView.css';

interface SummaryCards {
  totalAssignedStudents: number;
  pendingRequests: number;
  upcomingSessions: number;
  studentsImproving: number;
  studentsRequiringAttention: number;
}

export const MentorDashboardView: React.FC = () => {
  const { addToast } = useNotification();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [activeStudentProgress, setActiveStudentProgress] = useState<any | null>(null);
  const [slotsInput, setSlotsInput] = useState<string>('');

  // Feedback form
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [strengths, setStrengths] = useState<string>('Solid conceptual understanding and structured problem decomposition.');
  const [weaknesses, setWeaknesses] = useState<string>('Could provide more quantitative latency numbers and mention microservice trade-offs.');
  const [recommendedPractice, setRecommendedPractice] = useState<string>('Solve 5 medium Tree & Graph problems in the coding arena.');
  const [advice, setAdvice] = useState<string>('Use the STAR method and lead with measurable production impact.');
  const [rating, setRating] = useState<number>(5.0);

  useEffect(() => {
    fetchMentorDashboard();
  }, []);

  const getAuthToken = () => localStorage.getItem('token') || localStorage.getItem('sb_token');

  const fetchMentorDashboard = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/mentor/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        const payload = d.data || d;
        setData(payload);
        setSlotsInput(payload.mentor?.availableSlots?.join(', ') || '');
      }
    } catch (e) {
      console.error('Failed to load mentor dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      const token = getAuthToken();
      const slotsArray = slotsInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/mentor/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ availableSlots: slotsArray })
      });
      if (res.ok) {
        addToast('Availability Updated', 'Your booking calendar has been updated.', 'success');
        fetchMentorDashboard();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleRequestStatus = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/mentorship-requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status,
          mentorResponse: status === 'ACCEPTED' ? 'Accepted! Session scheduled.' : 'Declined due to schedule conflict.'
        })
      });
      if (res.ok) {
        addToast('Request Updated', `Mentorship request has been ${status.toLowerCase()}.`, 'success');
        fetchMentorDashboard();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleViewStudentProgress = async (studentId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/mentor/students/${studentId}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setActiveStudentProgress(d.data);
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    try {
      const token = getAuthToken();
      const studentId = activeSession.student_id || activeSession.user_id;
      const res = await fetch(`/api/mentor/students/${studentId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId: activeSession.id,
          strengths,
          weaknesses,
          recommendedPractice,
          interviewAdvice: advice,
          rating
        })
      });

      if (res.ok) {
        addToast('Feedback Delivered', 'Student portfolio updated and notification dispatched.', 'success');
        setActiveSession(null);
        fetchMentorDashboard();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const summary: SummaryCards = data?.summaryCards || {
    totalAssignedStudents: 4,
    pendingRequests: 0,
    upcomingSessions: 1,
    studentsImproving: 3,
    studentsRequiringAttention: 1
  };

  return (
    <div className="mentor-console-container">
      {/* Header */}
      <div className="mentor-console-header">
        <div>
          <span className="console-tag">Step 14 • Mentorship Console</span>
          <h1>Mentor Dashboard & Live Support</h1>
          <p>Guide assigned students, manage 1-on-1 sessions, review permitted skill metrics, and provide structured feedback.</p>
        </div>
        <div className="mentor-profile-summary">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=128&q=80"
            alt="Mentor avatar"
            className="mentor-avatar-small"
          />
          <div>
            <strong>Dr. Sarah Chen</strong>
            <span>Principal Systems Architect</span>
          </div>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="mentor-metrics-grid">
        <div className="mentor-metric-card">
          <span className="metric-title">Total Assigned Students</span>
          <span className="metric-num">{summary.totalAssignedStudents}</span>
          <span className="metric-desc">Under your direct mentorship</span>
        </div>

        <div className="mentor-metric-card">
          <span className="metric-title">Pending Requests</span>
          <span className="metric-num warning">{summary.pendingRequests}</span>
          <span className="metric-desc">Awaiting your approval</span>
        </div>

        <div className="mentor-metric-card">
          <span className="metric-title">Upcoming Sessions</span>
          <span className="metric-num primary">{summary.upcomingSessions}</span>
          <span className="metric-desc">Confirmed 1-on-1 calls</span>
        </div>

        <div className="mentor-metric-card">
          <span className="metric-title">Students Improving</span>
          <span className="metric-num positive">{summary.studentsImproving}</span>
          <span className="metric-desc">Positive skill trend</span>
        </div>

        <div className="mentor-metric-card">
          <span className="metric-title">Requires Attention</span>
          <span className="metric-num alert">{summary.studentsRequiringAttention}</span>
          <span className="metric-desc">Skill gap alerts detected</span>
        </div>
      </div>

      {/* Pending Requests Queue */}
      {data?.pendingRequests && data.pendingRequests.length > 0 && (
        <div className="mentor-card queue-card">
          <div className="card-header-row">
            <h2>Pending Mentorship Requests ({data.pendingRequests.length})</h2>
            <span className="badge-warning">Requires Response</span>
          </div>
          <div className="requests-queue-list">
            {data.pendingRequests.map((req: any) => (
              <div key={req.id} className="queue-item">
                <div className="queue-info">
                  <div className="student-line">
                    <strong>{req.student_name || 'Alex Rivera'}</strong>
                    <span className="topic-badge">{req.topic}</span>
                  </div>
                  <p className="req-msg">"{req.description}"</p>
                  <span className="slot-pref">📅 Preferred: {req.preferred_date} at {req.preferred_time}</span>
                </div>
                <div className="queue-actions">
                  <button
                    className="btn-accept"
                    onClick={() => handleRequestStatus(req.id, 'ACCEPTED')}
                  >
                    <Check size={14} /> Accept & Schedule
                  </button>
                  <button
                    className="btn-decline"
                    onClick={() => handleRequestStatus(req.id, 'REJECTED')}
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview & Availability Manager */}
      <div className="two-column-grid">
        <div className="mentor-card">
          <h2>Manage Booking Availability</h2>
          <p className="card-subtext">
            Publish your available slots for student mentorship requests.
          </p>
          <label className="input-label">AVAILABLE TIME SLOTS (Comma-separated):</label>
          <textarea
            rows={3}
            value={slotsInput}
            onChange={e => setSlotsInput(e.target.value)}
            className="input-textarea"
            placeholder="E.g., Tomorrow 4:00 PM, Friday 10:00 AM, Saturday 2:00 PM"
          />
          <button onClick={handleUpdateAvailability} className="btn-primary-sm">
            Save Schedule
          </button>
        </div>

        {/* Assigned Students */}
        <div className="mentor-card">
          <h2>Assigned Students</h2>
          <p className="card-subtext">
            Students assigned to you for placement guidance. Respects student privacy toggles.
          </p>
          <div className="assigned-students-list">
            {(data?.assignedStudents || []).map((s: any) => (
              <div key={s.id} className="student-row-item">
                <div>
                  <strong>{s.name}</strong>
                  <div className="student-sub">{s.department || 'Computer Science'} • {s.targetRole || 'Software Engineer'}</div>
                </div>
                <div className="action-buttons">
                  <button
                    className="btn-outline-sm"
                    onClick={() => handleViewStudentProgress(s.id)}
                  >
                    <Shield size={12} /> View Permitted Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Sessions List */}
      <div className="mentor-card">
        <h2>Scheduled Mock Interviews & Sessions</h2>
        <div className="sessions-list-column">
          {data?.upcomingSessions?.length === 0 ? (
            <p className="empty-text">No sessions currently scheduled.</p>
          ) : (
            data?.upcomingSessions?.map((s: any) => (
              <div key={s.id} className="scheduled-session-row">
                <div>
                  <div className="session-student-line">
                    <h3>{s.student_name}</h3>
                    <span className="badge-primary">{s.target_role || s.topic || 'Software Developer'}</span>
                  </div>
                  <div className="session-email">{s.student_email}</div>
                  <div className="session-time-callout">
                    📅 Slot: <strong>{s.slot_time}</strong>
                  </div>
                </div>

                <div className="session-actions">
                  <a
                    href={s.meeting_link || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-live-room"
                  >
                    <Video size={14} /> Open Meeting Room
                  </a>
                  <button
                    onClick={() => setActiveSession(s)}
                    className="btn-evaluate"
                  >
                    <Award size={14} /> Provide Feedback
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Student Progress Privacy Modal */}
      {activeStudentProgress && (
        <div className="modal-overlay">
          <div className="modal-box progress-modal">
            <div className="modal-header">
              <h3>Permitted Progress: {activeStudentProgress.student?.name}</h3>
              <button onClick={() => setActiveStudentProgress(null)} className="btn-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="privacy-notice-badge">
                🔒 Privacy Controlled: Viewing only metrics student has explicitly permitted.
              </div>

              <div className="permitted-data-block">
                <h4>Verified Skill Levels</h4>
                <div className="skills-tags">
                  {activeStudentProgress.permittedData?.skills?.map((sk: any, idx: number) => (
                    <span key={idx} className="skill-tag">
                      {sk.name}: Level {sk.level} ({sk.score}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="permitted-data-block">
                <h4>Mock Interview History</h4>
                {activeStudentProgress.permittedData?.interviews?.map((intv: any) => (
                  <div key={intv.id} className="interview-snapshot">
                    <strong>{intv.target_role} ({intv.interview_type})</strong>
                    <span>Score: {intv.overall_score}% • Status: {intv.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setActiveStudentProgress(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Submission Modal */}
      {activeSession && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>Candidate Evaluation: {activeSession.student_name}</h2>
              <button onClick={() => setActiveSession(null)} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="feedback-form">
              <div className="form-field">
                <label>Key Strengths:</label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={e => setStrengths(e.target.value)}
                  className="input-textarea"
                  required
                />
              </div>

              <div className="form-field">
                <label>Improvement Opportunities / Gaps:</label>
                <textarea
                  rows={2}
                  value={weaknesses}
                  onChange={e => setWeaknesses(e.target.value)}
                  className="input-textarea"
                  required
                />
              </div>

              <div className="form-field">
                <label>Recommended Practice Tasks:</label>
                <input
                  type="text"
                  value={recommendedPractice}
                  onChange={e => setRecommendedPractice(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Interview Advice:</label>
                <input
                  type="text"
                  value={advice}
                  onChange={e => setAdvice(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-field">
                <label>Session Rating (1.0 - 5.0):</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={rating}
                  onChange={e => setRating(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setActiveSession(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit Feedback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MentorDashboardView;
