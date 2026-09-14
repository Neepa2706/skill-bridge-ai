import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MockInterviewSetupView.css';

export const MockInterviewSetupView: React.FC = () => {
  const navigate = useNavigate();

  const [interviewType, setInterviewType] = useState('TECHNICAL');
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');
  const [targetRole, setTargetRole] = useState('Python Developer');
  const [duration, setDuration] = useState(15);
  const [questionCount, setQuestionCount] = useState(5);
  const [mode, setMode] = useState('TEXT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interviewTypes = [
    { value: 'TECHNICAL', label: 'Technical Interview', desc: 'Coding concepts, system architecture, database optimization, algorithms' },
    { value: 'HR', label: 'HR Interview', desc: 'Background, career vision, cultural fit, salary expectations' },
    { value: 'BEHAVIORAL', label: 'Behavioral Interview', desc: 'STAR technique, team collaboration, conflict resolution, accountability' },
    { value: 'COMMUNICATION', label: 'Communication Interview', desc: 'Technical articulation, stakeholder translation, clarity & fluency' },
    { value: 'ROLE_SPECIFIC', label: 'Role-Specific Deep Dive', desc: 'Tailored domain challenges for your specific chosen engineering role' },
    { value: 'MIXED', label: 'Comprehensive Mixed Round', desc: 'Full placement simulation combining technical, behavioral, and HR questions' }
  ];

  const roles = [
    'Python Developer',
    'Java Developer',
    'Web Developer',
    'Data Analyst',
    'AI/ML Engineer',
    'Data Scientist',
    'Software Engineer',
    'Cloud Engineer',
    'General Placement'
  ];

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');

      const res = await fetch('/api/student/mock-interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          interviewType,
          difficulty,
          targetRole,
          duration,
          questionCount,
          mode
        })
      });

      const data = await res.json();
      if (data.success && data.data?.interviewId) {
        navigate(`/student/mock-interview/session/${data.data.interviewId}`);
      } else {
        setError(data.message || 'Failed to start interview session.');
      }
    } catch (err: any) {
      setError(err.message || 'Error initializing mock interview session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-header">
        <span className="setup-tag">Step 13 • Configuration</span>
        <h1>Interview Setup</h1>
        <p>Configure your target role, difficulty, and interview domain for this simulated round.</p>
      </div>

      <div className="disclaimer-banner" role="alert">
        <span className="disclaimer-icon">ℹ️</span>
        <span className="disclaimer-text">
          <strong>Notice:</strong> AI mock interview results are for practice and preparation only. They do not guarantee job selection.
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="setup-form" onSubmit={handleStartInterview}>
        {/* Interview Type Grid */}
        <div className="form-section">
          <label className="section-title">1. Select Interview Type</label>
          <div className="radio-cards-grid">
            {interviewTypes.map((type) => (
              <div
                key={type.value}
                className={`radio-card ${interviewType === type.value ? 'selected' : ''}`}
                onClick={() => setInterviewType(type.value)}
              >
                <div className="radio-card-header">
                  <span className="radio-dot"></span>
                  <strong>{type.label}</strong>
                </div>
                <p>{type.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Target Role & Difficulty */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="targetRole" className="form-label">2. Target Role</label>
            <select
              id="targetRole"
              className="form-select"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">3. Difficulty Tier</label>
            <div className="pill-group">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  className={`pill-btn ${difficulty === lvl ? 'active' : ''}`}
                  onClick={() => setDifficulty(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Duration, Questions & Mode */}
        <div className="form-row three-col">
          <div className="form-group">
            <label className="form-label">4. Duration</label>
            <div className="pill-group">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  className={`pill-btn ${duration === mins ? 'active' : ''}`}
                  onClick={() => setDuration(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">5. Question Count</label>
            <div className="pill-group">
              {[5, 10, 15, 20].map((cnt) => (
                <button
                  type="button"
                  key={cnt}
                  className={`pill-btn ${questionCount === cnt ? 'active' : ''}`}
                  onClick={() => setQuestionCount(cnt)}
                >
                  {cnt} Qs
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">6. Input Mode</label>
            <div className="pill-group">
              {[
                { id: 'TEXT', label: '⌨️ Text' },
                { id: 'VOICE', label: '🎙️ Voice' }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`pill-btn ${mode === m.id ? 'active' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/student/mock-interview')}
          >
            Cancel
          </button>
          <button
            id="btn-begin-interview"
            type="submit"
            className="btn-start"
            disabled={submitting}
          >
            {submitting ? 'Generating Custom Interview...' : 'Begin AI Mock Interview →'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default MockInterviewSetupView;
