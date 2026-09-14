import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import './MentorDashboardView.css';

export const MentorStudentFeedbackView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [student, setStudent] = useState<any | null>(null);
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [recommendedPractice, setRecommendedPractice] = useState('');
  const [interviewAdvice, setInterviewAdvice] = useState('');
  const [courseSuggestions, setCourseSuggestions] = useState('');
  const [careerGuidance, setCareerGuidance] = useState('');
  const [followUpTasks, setFollowUpTasks] = useState('');
  const [rating, setRating] = useState(5.0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const getAuthToken = () => localStorage.getItem('token') || localStorage.getItem('sb_token');

  const fetchStudent = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/mentor/students/${id}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setStudent(d.data?.student);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = getAuthToken();
      const res = await fetch(`/api/mentor/students/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          strengths,
          weaknesses,
          recommendedPractice,
          interviewAdvice,
          courseSuggestions,
          careerGuidance,
          followUpTasks,
          rating
        })
      });

      if (res.ok) {
        addToast('Feedback Submitted', 'Student has been notified and portfolio updated.', 'success');
        navigate('/mentor/dashboard');
      } else {
        const err = await res.json();
        addToast('Error', err.message || 'Failed to submit feedback.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mentor-console-container">
      <div className="mentor-console-header">
        <div>
          <span className="console-tag">Step 14 • Candidate Evaluation</span>
          <h1>Submit Structured Mentorship Feedback</h1>
          <p>Provide supportive, actionable guidance to accelerate placement readiness.</p>
        </div>
      </div>

      <div className="mentor-card" style={{ maxWidth: '800px' }}>
        <h2>Feedback Dossier: {student?.name || 'Assigned Candidate'}</h2>
        <p className="card-subtext">
          Target Role: {student?.targetRole || 'Software Engineer'} • Department: {student?.department || 'Computer Science'}
        </p>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-field">
            <label>Key Strengths (Observed technical & behavioral excellence):</label>
            <textarea
              rows={3}
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              className="input-textarea"
              placeholder="E.g., Outstanding problem decomposition, clean algorithmic invariants, articulate delivery."
              required
            />
          </div>

          <div className="form-field">
            <label>Areas for Improvement / Skill Gaps:</label>
            <textarea
              rows={3}
              value={weaknesses}
              onChange={e => setWeaknesses(e.target.value)}
              className="input-textarea"
              placeholder="E.g., Deepen awareness of high-throughput caching and database index selection."
              required
            />
          </div>

          <div className="two-column-grid">
            <div className="form-field">
              <label>Recommended Practice:</label>
              <input
                type="text"
                value={recommendedPractice}
                onChange={e => setRecommendedPractice(e.target.value)}
                className="input-field"
                placeholder="E.g., 5 medium Graph & DP problems"
              />
            </div>

            <div className="form-field">
              <label>Interview Advice:</label>
              <input
                type="text"
                value={interviewAdvice}
                onChange={e => setInterviewAdvice(e.target.value)}
                className="input-field"
                placeholder="E.g., Frame responses using the STAR method"
              />
            </div>
          </div>

          <div className="two-column-grid">
            <div className="form-field">
              <label>Course Suggestions:</label>
              <input
                type="text"
                value={courseSuggestions}
                onChange={e => setCourseSuggestions(e.target.value)}
                className="input-field"
                placeholder="E.g., Advanced Distributed Systems"
              />
            </div>

            <div className="form-field">
              <label>Overall Readiness Rating (1.0 - 5.0):</label>
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
          </div>

          <div className="form-field">
            <label>Follow-Up Tasks for Student:</label>
            <textarea
              rows={2}
              value={followUpTasks}
              onChange={e => setFollowUpTasks(e.target.value)}
              className="input-textarea"
              placeholder="E.g., Refactor portfolio project to include Redis caching before next review."
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={() => navigate('/mentor/dashboard')} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Deliver Feedback to Student →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default MentorStudentFeedbackView;
