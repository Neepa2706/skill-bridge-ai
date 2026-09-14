import React, { useState, useEffect } from 'react';
import { Video, Award } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './MentorDashboardView.css';

export const MentorSessionsView: React.FC = () => {
  const { addToast } = useNotification();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // Form states
  const [strengths, setStrengths] = useState('Clear structured communication and solid foundational logic.');
  const [weaknesses, setWeaknesses] = useState('Deepen understanding of distributed consensus and concurrency invariants.');
  const [recommendedPractice, setRecommendedPractice] = useState('Solve 5 medium Graph problems in the coding arena.');
  const [advice, setAdvice] = useState('Lead with quantifiable production results using the STAR framework.');
  const [rating, setRating] = useState(5.0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const getAuthToken = () => localStorage.getItem('token') || localStorage.getItem('sb_token');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/mentor/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success && d.data) {
        setSessions(d.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        fetchSessions();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  return (
    <div className="mentor-console-container">
      <div className="mentor-console-header">
        <div>
          <span className="console-tag">Step 14 • Sessions Management</span>
          <h1>Mentor Engagement Sessions</h1>
          <p>Scheduled 1-on-1 calls, video rooms, and post-session evaluations.</p>
        </div>
      </div>

      <div className="mentor-card">
        <h2>All Scheduled & Past Sessions ({sessions.length})</h2>
        {loading ? (
          <p className="card-subtext">Loading mentor sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="empty-text">No sessions found.</p>
        ) : (
          <div className="sessions-list-column">
            {sessions.map((s) => (
              <div key={s.id} className="scheduled-session-row">
                <div>
                  <div className="session-student-line">
                    <h3>{s.student_name || 'Assigned Candidate'}</h3>
                    <span className="badge-primary">{s.topic || 'Software Development Guidance'}</span>
                    <span className={`status-pill ${s.status?.toLowerCase()}`}>{s.status}</span>
                  </div>
                  <div className="session-email">{s.student_email}</div>
                  <div className="session-time-callout">
                    📅 Slot: <strong>{s.slot_time}</strong>
                  </div>
                </div>

                <div className="session-actions">
                  {s.meeting_link && s.status !== 'completed' && (
                    <a
                      href={s.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-live-room"
                    >
                      <Video size={14} /> Open Meeting Room
                    </a>
                  )}
                  <button
                    onClick={() => setActiveSession(s)}
                    className="btn-evaluate"
                  >
                    <Award size={14} /> {s.status === 'completed' ? 'Update Feedback' : 'Evaluate & Feedback'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
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
                <button type="submit" className="btn-primary">Submit Evaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MentorSessionsView;
