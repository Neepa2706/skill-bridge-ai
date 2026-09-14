import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MockInterviewSessionView.css';

interface CurrentQuestion {
  id: string;
  text: string;
  type: string;
  sequenceNumber: number;
  isFollowUp: boolean;
  parentQuestionId?: string;
}

interface EvaluationData {
  score: number;
  technicalScore: number;
  communicationScore: number;
  hrScore: number;
  problemSolvingScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missingPoints: string[];
  suggestedStructure: string;
  improvementAdvice: string;
}

export const MockInterviewSessionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [interviewType, setInterviewType] = useState('TECHNICAL');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationData | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);

  // Local storage backup key
  const storageKey = `mock_interview_draft_${id}`;

  useEffect(() => {
    fetchSession();
    // Restore draft if present
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      setAnswerText(savedDraft);
    }
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (timeLeftSeconds <= 0 || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds, isFinished]);

  // Sync draft to localStorage on edit
  const handleAnswerChange = (val: string) => {
    setAnswerText(val);
    localStorage.setItem(storageKey, val);
  };

  const fetchSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/student/mock-interview/session/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTargetRole(data.data.targetRole);
        setInterviewType(data.data.interviewType);
        setTotalQuestions(data.data.totalQuestions);
        setAnsweredCount(data.data.answeredCount || 0);
        setCurrentQuestion(data.data.currentQuestion);
        setTimeLeftSeconds((data.data.duration || 15) * 60);
        if (!data.data.currentQuestion || data.data.status === 'COMPLETED') {
          setIsFinished(true);
        }
      } else {
        setError(data.message || 'Failed to load session.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with interview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    if (!answerText.trim()) {
      alert('Please type an answer before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/student/mock-interview/session/${id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerText
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        // Clear local storage draft
        localStorage.removeItem(storageKey);
        setAnswerText('');
        setLastEvaluation(data.data.evaluation);
        setAnsweredCount(prev => prev + 1);

        if (data.data.nextQuestion) {
          setCurrentQuestion(data.data.nextQuestion);
        } else {
          setCurrentQuestion(null);
          setIsFinished(true);
        }
      } else {
        setError(data.message || 'Failed to submit answer.');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipQuestion = async () => {
    if (!currentQuestion) return;
    if (!window.confirm('Skip this question? A skipped question receives 0 points.')) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/student/mock-interview/session/${id}/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionId: currentQuestion.id })
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.removeItem(storageKey);
        setAnswerText('');
        setLastEvaluation(null);
        if (data.data.nextQuestion) {
          setCurrentQuestion(data.data.nextQuestion);
        } else {
          setCurrentQuestion(null);
          setIsFinished(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error skipping question.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishInterview = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/student/mock-interview/session/${id}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      localStorage.removeItem(storageKey);
      if (data.success) {
        navigate(`/student/mock-interview/result/${id}`);
      } else {
        setError(data.message || 'Failed to finalize interview.');
      }
    } catch (err: any) {
      setError(err.message || 'Error completing interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.round((answeredCount / Math.max(1, totalQuestions)) * 100));

  return (
    <div className="session-container">
      {/* Top Status Bar */}
      <div className="session-navbar">
        <div className="navbar-left">
          <span className="role-tag">{targetRole}</span>
          <span className="type-badge">{interviewType}</span>
          {currentQuestion?.isFollowUp && (
            <span className="follow-up-badge">Conversational Follow-Up</span>
          )}
        </div>
        <div className="navbar-right">
          <div className="timer-box">
            <span>⏱️ Remaining:</span>
            <strong className={timeLeftSeconds < 120 ? 'timer-warning' : ''}>
              {formatTime(timeLeftSeconds)}
            </strong>
          </div>
          <button
            className="btn-end-interview"
            onClick={handleFinishInterview}
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-header">
        <div className="progress-labels">
          <span>Question {answeredCount + 1} of {totalQuestions}</span>
          <span>{progressPercent}% Completed</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Mandatory Notice */}
      <div className="disclaimer-mini">
        ℹ️ AI mock interview results are for practice and preparation only. They do not guarantee job selection.
      </div>

      {error && <div className="session-error">{error}</div>}

      {loading ? (
        <div className="session-loading">
          <div className="spinner"></div>
          <p>Loading interview question...</p>
        </div>
      ) : isFinished ? (
        <div className="session-completed-card">
          <h2>🎉 Interview Round Completed!</h2>
          <p>You have addressed all questions for this {targetRole} mock interview.</p>
          <button
            id="btn-view-results"
            className="btn-finish-big"
            onClick={handleFinishInterview}
            disabled={submitting}
          >
            {submitting ? 'Calculating Multi-Factor Scorecard...' : 'View Full Evaluation Scorecard →'}
          </button>
        </div>
      ) : (
        <div className="interview-flow-grid">
          {/* Question & Answer Box */}
          <div className="active-question-card">
            <div className="question-header">
              <span className={`question-badge ${currentQuestion?.isFollowUp ? 'fu' : 'main'}`}>
                {currentQuestion?.isFollowUp ? 'Follow-Up Question' : 'Main Question'}
              </span>
              <span className="cat-text">{currentQuestion?.type}</span>
            </div>

            <h3 className="question-text">{currentQuestion?.text}</h3>

            <div className="answer-section">
              <label htmlFor="studentAnswer" className="answer-label">Your Response:</label>
              <textarea
                id="studentAnswer"
                className="answer-textarea"
                rows={7}
                placeholder="Structure your answer clearly: Define the core concept, provide concrete practical mechanisms, and mention production trade-offs..."
                value={answerText}
                onChange={(e) => handleAnswerChange(e.target.value)}
                disabled={submitting}
              />
              <div className="textarea-footer">
                <span className="word-counter">
                  {answerText.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span className="autosave-indicator">💾 Draft autosaved locally</span>
              </div>
            </div>

            <div className="action-buttons-row">
              <button
                type="button"
                className="btn-skip"
                onClick={handleSkipQuestion}
                disabled={submitting}
              >
                Skip Question
              </button>
              <button
                id="btn-submit-answer"
                type="button"
                className="btn-submit"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting ? 'Evaluating with Rubric...' : 'Submit Answer →'}
              </button>
            </div>
          </div>

          {/* Turn Evaluation Feedback Panel */}
          {lastEvaluation && (
            <div className="turn-feedback-card">
              <div className="turn-score-header">
                <div>
                  <span className="subhead">Turn Score</span>
                  <div className="score-big">{lastEvaluation.score}/100</div>
                </div>
                <div className="dimension-pills">
                  <span>Tech: {lastEvaluation.technicalScore}</span>
                  <span>Comm: {lastEvaluation.communicationScore}</span>
                  <span>HR: {lastEvaluation.hrScore}</span>
                </div>
              </div>

              <p className="turn-feedback-text">{lastEvaluation.feedback}</p>

              {lastEvaluation.strengths.length > 0 && (
                <div className="eval-block">
                  <strong>✅ Strong Points:</strong>
                  <ul>
                    {lastEvaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {lastEvaluation.weaknesses.length > 0 && (
                <div className="eval-block">
                  <strong>⚠️ Missing Elements:</strong>
                  <ul>
                    {lastEvaluation.weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {lastEvaluation.suggestedStructure && (
                <div className="eval-block structure">
                  <strong>📐 Suggested Answer Structure:</strong>
                  <p>{lastEvaluation.suggestedStructure}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MockInterviewSessionView;
