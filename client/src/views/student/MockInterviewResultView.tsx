import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './MockInterviewResultView.css';

interface QuestionBreakdown {
  questionId: string;
  questionText: string;
  questionType: string;
  isFollowUp: boolean;
  answerText: string;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missingPoints: string[];
  suggestedStructure: string;
  improvementAdvice: string;
}

interface RecommendedItem {
  id: string;
  title: string;
  level?: string;
  duration?: string;
  difficulty?: string;
  topic?: string;
  matchReason?: string;
  link?: string;
}

interface ResultData {
  id: string;
  targetRole: string;
  interviewType: string;
  difficulty: string;
  mode: string;
  durationMinutes: number;
  startedAt: string;
  completedAt: string;
  overallScore: number;
  scoreLabel: string;
  technicalScore: number;
  communicationScore: number;
  hrScore: number;
  problemSolvingScore: number;
  questionsAttempted: number;
  questionsSkipped: number;
  strengths: string[];
  weaknesses: string[];
  feedbackSummary: string;
  recommendedCourses: RecommendedItem[];
  recommendedCodingPractice: RecommendedItem[];
  questionBreakdown: QuestionBreakdown[];
}

export const MockInterviewResultView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/student/mock-interview/result/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to load interview scorecard.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching scorecard.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const getScoreBadgeClass = (label: string) => {
    switch (label) {
      case 'Excellent': return 'badge-excellent';
      case 'Very Good': return 'badge-very-good';
      case 'Good': return 'badge-good';
      case 'Needs Improvement': return 'badge-needs-imp';
      default: return 'badge-beginner';
    }
  };

  if (loading) {
    return (
      <div className="result-loading">
        <div className="spinner"></div>
        <p>Generating multidimensional interview scorecard...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="result-error">
        <h2>Unable to load result</h2>
        <p>{error || 'Session not found.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/student/mock-interview')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="result-container">
      {/* Disclaimer */}
      <div className="disclaimer-banner" role="alert">
        <span className="disclaimer-icon">ℹ️</span>
        <span className="disclaimer-text">
          <strong>Notice:</strong> AI mock interview results are for practice and preparation only. They do not guarantee job selection.
        </span>
      </div>

      {/* Main Score Banner */}
      <div className="score-hero">
        <div className="score-hero-left">
          <div className="role-chip">{result.targetRole} • {result.interviewType}</div>
          <h1 className="hero-title">Mock Interview Scorecard</h1>
          <p className="hero-feedback">{result.feedbackSummary}</p>
          <div className="meta-row">
            <span>⏱️ Duration: {result.durationMinutes} mins</span>
            <span>📝 Attempted: {result.questionsAttempted}</span>
            <span>⏭️ Skipped: {result.questionsSkipped}</span>
            <span>📅 {new Date(result.completedAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="score-hero-right">
          <div className="score-circle">
            <span className="score-number">{result.overallScore}</span>
            <span className="score-out-of">/ 100</span>
          </div>
          <div className={`overall-badge ${getScoreBadgeClass(result.scoreLabel)}`}>
            {result.scoreLabel}
          </div>
        </div>
      </div>

      {/* Multidimensional Radar/Cards */}
      <div className="dimensions-grid">
        <div className="dim-card">
          <div className="dim-header">
            <span>Technical Correctness</span>
            <strong>{result.technicalScore}%</strong>
          </div>
          <div className="dim-bar-bg">
            <div className="dim-bar-fill tech" style={{ width: `${result.technicalScore}%` }}></div>
          </div>
        </div>

        <div className="dim-card">
          <div className="dim-header">
            <span>Communication & Clarity</span>
            <strong>{result.communicationScore}%</strong>
          </div>
          <div className="dim-bar-bg">
            <div className="dim-bar-fill comm" style={{ width: `${result.communicationScore}%` }}></div>
          </div>
        </div>

        <div className="dim-card">
          <div className="dim-header">
            <span>HR & Professionalism</span>
            <strong>{result.hrScore}%</strong>
          </div>
          <div className="dim-bar-bg">
            <div className="dim-bar-fill hr" style={{ width: `${result.hrScore}%` }}></div>
          </div>
        </div>

        <div className="dim-card">
          <div className="dim-header">
            <span>Problem-Solving Logic</span>
            <strong>{result.problemSolvingScore}%</strong>
          </div>
          <div className="dim-bar-bg">
            <div className="dim-bar-fill prob" style={{ width: `${result.problemSolvingScore}%` }}></div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses 2-column */}
      <div className="strengths-gaps-row">
        <div className="panel-box strengths">
          <h3>✅ Demonstrated Strengths</h3>
          <ul>
            {result.strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="panel-box weaknesses">
          <h3>⚠️ Key Improvement Areas</h3>
          <ul>
            {result.weaknesses.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Practice */}
      <div className="recommendations-box">
        <h3>Recommended Preparation Next Steps</h3>
        <div className="rec-grid">
          <div className="rec-column">
            <h4>Recommended Courses</h4>
            {result.recommendedCourses.map((c) => (
              <div key={c.id} className="rec-card">
                <div>
                  <strong>{c.title}</strong>
                  <p>{c.matchReason}</p>
                </div>
                <Link to={`/student/courses/${c.id}`} className="rec-btn">
                  Start Course →
                </Link>
              </div>
            ))}
          </div>

          <div className="rec-column">
            <h4>Targeted Coding Practice</h4>
            {result.recommendedCodingPractice.map((p) => (
              <div key={p.id} className="rec-card">
                <div>
                  <strong>{p.title}</strong>
                  <p>{p.topic} • {p.difficulty}</p>
                </div>
                <Link to={p.link || `/student/coding/problem/${p.id}`} className="rec-btn">
                  Solve in Editor →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question-by-Question Detailed Review */}
      <div className="question-review-section">
        <h3>Detailed Question-by-Question Review</h3>
        <div className="question-items-list">
          {result.questionBreakdown.map((q, idx) => (
            <div key={q.questionId || idx} className="question-review-card">
              <div className="q-card-top">
                <div>
                  <span className={`pill ${q.isFollowUp ? 'fu' : 'main'}`}>
                    {q.isFollowUp ? 'Follow-Up Question' : `Question ${idx + 1}`}
                  </span>
                  <span className="q-type">{q.questionType}</span>
                </div>
                <div className="q-score">Score: <strong>{q.score}/100</strong></div>
              </div>

              <h4 className="q-prompt">{q.questionText}</h4>

              <div className="q-answer-box">
                <span className="subhead">Your Answer:</span>
                <p>{q.answerText}</p>
              </div>

              <div className="q-feedback-box">
                <span className="subhead">AI Evaluation & Feedback:</span>
                <p>{q.feedback}</p>

                {q.missingPoints && q.missingPoints.length > 0 && (
                  <div className="missing-box">
                    <strong>Missing Points to Include:</strong>
                    <ul>
                      {q.missingPoints.map((mp, i) => (
                        <li key={i}>{mp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {q.suggestedStructure && (
                  <div className="structure-box">
                    <strong>Recommended Delivery Structure:</strong>
                    <code>{q.suggestedStructure}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation Action */}
      <div className="result-footer-actions">
        <button
          id="btn-retry-interview"
          className="btn-primary"
          onClick={() => navigate('/student/mock-interview/start')}
        >
          🔄 Retry Another Interview
        </button>
        <button
          id="btn-download-report"
          className="btn-secondary"
          onClick={handleDownloadReport}
        >
          📄 Download / Print Report
        </button>
        <Link to="/student/mock-interview" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
};
export default MockInterviewResultView;
