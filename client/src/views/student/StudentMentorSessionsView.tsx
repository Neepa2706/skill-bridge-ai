import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './StudentMentorSessionsView.css';

interface MentorSession {
  id: string;
  mentor_id: string;
  mentor_name: string;
  mentor_avatar?: string;
  topic?: string;
  slot_time: string;
  session_date?: string;
  session_time?: string;
  status: string;
  meeting_link?: string;
  notes?: string;
  feedback_summary?: string;
  strengths?: string;
  weaknesses?: string;
  interview_advice?: string;
  recommended_practice?: string;
  feedback_rating?: number;
}

export const StudentMentorSessionsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<MentorSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/mentor-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSessions(data.data);
      } else {
        setError(data.message || 'Failed to fetch sessions.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with mentor sessions endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mentor-sessions-container">
      <div className="sessions-header">
        <div>
          <span className="sessions-tag">Scheduled Engagements</span>
          <h1>My Mentorship Sessions</h1>
          <p>Upcoming 1-on-1 calls, video meeting links, session notes, and personalized mentor feedback.</p>
        </div>
        <Link to="/student/mentor-support" className="btn-primary">
          + Book New Session
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="sessions-loading">
          <div className="spinner"></div>
          <p>Loading your scheduled sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-sessions-box">
          <h3>No mentorship sessions scheduled</h3>
          <p>You don't have any confirmed sessions yet. Request support from our mentor directory to get started.</p>
          <Link to="/student/mentor-support" className="btn-primary">
            Explore Mentors & Request Session
          </Link>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((sess) => (
            <div key={sess.id} className="session-card">
              <div className="card-top">
                <span className={`status-pill ${sess.status.toLowerCase()}`}>
                  {sess.status}
                </span>
                <span className="session-date-tag">🕒 {sess.slot_time}</span>
              </div>

              <h3 className="session-topic">{sess.topic || 'Mentorship Guidance'}</h3>

              <div className="mentor-info-row">
                <img
                  src={sess.mentor_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=128&q=80'}
                  alt={sess.mentor_name}
                  className="mentor-mini-avatar"
                />
                <div>
                  <strong className="mentor-name">{sess.mentor_name}</strong>
                  <span className="mentor-role">Senior Industry Mentor</span>
                </div>
              </div>

              {sess.notes && (
                <div className="notes-box">
                  <span className="notes-label">Preparation Notes:</span>
                  <p>{sess.notes}</p>
                </div>
              )}

              <div className="session-card-actions">
                {sess.meeting_link && sess.status !== 'completed' && (
                  <a
                    href={sess.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-join-meeting"
                  >
                    🎥 Open Meeting Room
                  </a>
                )}

                {(sess.feedback_summary || sess.strengths) && (
                  <button
                    className="btn-view-feedback"
                    onClick={() => setSelectedSessionForFeedback(sess)}
                  >
                    ⭐ Review Mentor Feedback
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Review Drawer / Modal */}
      {selectedSessionForFeedback && (
        <div className="modal-backdrop">
          <div className="modal-content feedback-modal">
            <div className="modal-header">
              <h3>Mentor Feedback from {selectedSessionForFeedback.mentor_name}</h3>
              <button className="close-btn" onClick={() => setSelectedSessionForFeedback(null)}>✕</button>
            </div>

            <div className="feedback-content">
              {selectedSessionForFeedback.feedback_rating && (
                <div className="rating-pill">
                  Rating: <strong>⭐ {selectedSessionForFeedback.feedback_rating} / 5.0</strong>
                </div>
              )}

              {selectedSessionForFeedback.strengths && (
                <div className="fb-section strengths">
                  <strong>Key Strengths:</strong>
                  <p>{selectedSessionForFeedback.strengths}</p>
                </div>
              )}

              {selectedSessionForFeedback.weaknesses && (
                <div className="fb-section weaknesses">
                  <strong>Improvement Opportunities:</strong>
                  <p>{selectedSessionForFeedback.weaknesses}</p>
                </div>
              )}

              {selectedSessionForFeedback.interview_advice && (
                <div className="fb-section advice">
                  <strong>Interview Advice:</strong>
                  <p>{selectedSessionForFeedback.interview_advice}</p>
                </div>
              )}

              {selectedSessionForFeedback.recommended_practice && (
                <div className="fb-section practice">
                  <strong>Recommended Practice Tasks:</strong>
                  <p>{selectedSessionForFeedback.recommended_practice}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={() => setSelectedSessionForFeedback(null)}
              >
                Close Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentMentorSessionsView;
