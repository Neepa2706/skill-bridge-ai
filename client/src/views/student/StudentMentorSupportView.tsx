import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './StudentMentorSupportView.css';

interface Mentor {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  designation: string;
  currentCompany: string;
  department: string;
  yearsExperience: number;
  rating: number;
  bio: string;
  expertise: string[];
  availableSlots: string[];
  languages: string[];
}

interface MentorshipRequest {
  id: string;
  mentor_id: string;
  mentor_name?: string;
  topic: string;
  description: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  mentor_response?: string;
  created_at: string;
}

export const StudentMentorSupportView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [myRequests, setMyRequests] = useState<MentorshipRequest[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Form states
  const [topic, setTopic] = useState('Interview preparation');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('2026-09-25');
  const [preferredTime, setPreferredTime] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Privacy controls
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    share_skills: 1,
    share_gaps: 1,
    share_courses: 1,
    share_coding: 1,
    share_interviews: 1,
    share_applications: 0
  });

  const topics = [
    'Coding',
    'Communication',
    'Resume preparation',
    'Interview preparation',
    'Career guidance',
    'Internship guidance',
    'Project guidance',
    'Placement preparation'
  ];

  useEffect(() => {
    fetchMentorsAndRequests();
    fetchPrivacySettings();
  }, []);

  const fetchMentorsAndRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [mentorsRes, reqsRes] = await Promise.all([
        fetch('/api/mentors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student/mentorship-requests', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const mentorsData = await mentorsRes.json();
      const reqsData = await reqsRes.json();

      if (mentorsData.success && mentorsData.data) {
        setMentors(mentorsData.data);
      }
      if (reqsData.success && reqsData.data) {
        setMyRequests(reqsData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching mentor data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivacySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/privacy-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPrivacySettings(data.data);
      }
    } catch {
      // ignore
    }
  };

  const handleUpdatePrivacy = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/student/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(privacySettings)
      });
      setShowPrivacyModal(false);
      alert('Privacy preferences updated successfully!');
    } catch (err: any) {
      alert('Error updating privacy settings: ' + err.message);
    }
  };

  const handleOpenRequest = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setSubmitSuccess(null);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');

      const res = await fetch('/api/mentorship-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: selectedMentor.userId || selectedMentor.id,
          topic,
          description,
          preferredDate,
          preferredTime
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(`Request submitted to ${selectedMentor.name}!`);
        setDescription('');
        fetchMentorsAndRequests();
        setTimeout(() => setShowRequestModal(false), 1500);
      } else {
        setError(data.message || 'Failed to submit request.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mentor-support-container">
      {/* Header */}
      <div className="support-header">
        <div>
          <span className="support-tag">1-on-1 Placement Coaching</span>
          <h1>Live Mentor Support</h1>
          <p>Connect with industry architects and senior engineering leaders for personalized placement mentorship.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowPrivacyModal(true)}
          >
            🔒 Privacy Controls
          </button>
          <Link to="/student/mentor-sessions" className="btn-primary">
            My Scheduled Sessions →
          </Link>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Active Requests Tracker */}
      {myRequests.length > 0 && (
        <div className="requests-section">
          <div className="section-title-row">
            <h3>My Mentorship Requests ({myRequests.length})</h3>
          </div>
          <div className="requests-list">
            {myRequests.map((r) => (
              <div key={r.id} className="request-card">
                <div className="req-header">
                  <div>
                    <span className="req-topic">{r.topic}</span>
                    <strong className="req-mentor">With: {r.mentor_name || 'Assigned Mentor'}</strong>
                  </div>
                  <span className={`status-pill ${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </div>
                <p className="req-desc">{r.description}</p>
                <div className="req-footer">
                  <span>📅 Requested: {r.preferred_date} at {r.preferred_time}</span>
                  {r.mentor_response && (
                    <div className="mentor-resp">
                      <strong>Mentor Note:</strong> {r.mentor_response}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentors Directory */}
      <div className="directory-section">
        <h3>Available Verified Mentors</h3>
        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading mentors directory...</p>
          </div>
        ) : (
          <div className="mentors-grid">
            {mentors.map((m) => (
              <div key={m.id} className="mentor-card">
                <div className="mentor-profile-top">
                  <img
                    src={m.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=128&q=80'}
                    alt={m.name}
                    className="mentor-avatar"
                  />
                  <div>
                    <h4 className="mentor-name">{m.name}</h4>
                    <span className="mentor-designation">{m.designation}</span>
                    <div className="mentor-meta">
                      <span>🏢 {m.currentCompany}</span>
                      <span>⭐ {m.rating}</span>
                      <span>💼 {m.yearsExperience} yrs exp</span>
                    </div>
                  </div>
                </div>

                <p className="mentor-bio">{m.bio}</p>

                <div className="skills-chips">
                  {m.expertise.slice(0, 4).map((exp, idx) => (
                    <span key={idx} className="chip">{exp}</span>
                  ))}
                </div>

                <div className="slots-preview">
                  <span className="slots-label">🕒 Available Slots:</span>
                  <ul>
                    {m.availableSlots.slice(0, 2).map((slot, idx) => (
                      <li key={idx}>{slot}</li>
                    ))}
                  </ul>
                </div>

                <div className="mentor-card-footer">
                  <button
                    className="btn-request-session"
                    onClick={() => handleOpenRequest(m)}
                  >
                    Request Mentorship →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedMentor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Request Mentorship with {selectedMentor.name}</h3>
              <button className="close-btn" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>

            {submitSuccess ? (
              <div className="success-box">{submitSuccess}</div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="request-form">
                <div className="form-group">
                  <label className="form-label">Select Support Topic</label>
                  <select
                    className="form-select"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    {topics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Date & Time</label>
                  <div className="form-row">
                    <input
                      type="date"
                      className="form-input"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      required
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">What specific questions or challenges would you like guidance on?</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="E.g., I'd love a mock technical walkthrough on distributed caching and feedback on my project portfolio architecture."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowRequestModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Send Mentorship Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔒 Student Privacy & Mentor Data Sharing</h3>
              <button className="close-btn" onClick={() => setShowPrivacyModal(false)}>✕</button>
            </div>
            <p className="privacy-desc">
              Control what academic and platform assessment metrics your mentors are allowed to view:
            </p>
            <div className="privacy-toggles-list">
              {[
                { key: 'share_skills', label: 'Verified Skill Levels & Scores' },
                { key: 'share_gaps', label: 'Identified Skill Gaps & Deficiencies' },
                { key: 'share_courses', label: 'Course Progress & Completions' },
                { key: 'share_coding', label: 'Coding Arena Practice & Streaks' },
                { key: 'share_interviews', label: 'Mock Interview Scores & Feedback' },
                { key: 'share_applications', label: 'Opportunity Application Statuses' }
              ].map((item) => (
                <label key={item.key} className="toggle-row">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean((privacySettings as any)[item.key])}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      [item.key]: e.target.checked ? 1 : 0
                    })}
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpdatePrivacy}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentMentorSupportView;
