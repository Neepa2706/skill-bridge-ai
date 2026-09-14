import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MockInterviewDashboardView.css';

interface SummaryCards {
  totalInterviews: number;
  averageScore: number;
  bestScore: number;
  technicalReadiness: number;
  communicationReadiness: number;
  improvementAreas: number;
}

interface Scores {
  averageScore: number;
  technicalScore: number;
  communicationScore: number;
  hrScore: number;
  bestScore: number;
  streakDays: number;
}

interface RecommendedPractice {
  title: string;
  type: string;
  link: string;
  estimatedTime: string;
}

interface RecentInterview {
  id: string;
  targetRole: string;
  interviewType: string;
  difficulty: string;
  status: string;
  overallScore: number;
  scoreLabel: string;
  startedAt: string;
  completedAt: string;
}

export const MockInterviewDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryCards | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedPractice[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<RecentInterview[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/mock-interview/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summaryCards);
        setScores(json.data.scores);
        setWeakAreas(json.data.weakAreas || []);
        setRecommendations(json.data.recommendedPractice || []);
        setRecentInterviews(json.data.recentInterviews || []);
      } else {
        setError(json.message || 'Failed to load dashboard.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while fetching mock interview dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (label: string) => {
    switch (label) {
      case 'Excellent': return 'badge-excellent';
      case 'Very Good': return 'badge-very-good';
      case 'Good': return 'badge-good';
      case 'Needs Improvement': return 'badge-needs-imp';
      default: return 'badge-beginner';
    }
  };

  return (
    <div className="mock-interview-container">
      {/* Header Banner */}
      <div className="mock-header">
        <div>
          <div className="header-tag">Placement Preparation Engine</div>
          <h1 className="header-title">AI Mock Interview System</h1>
          <p className="header-sub">
            Practice role-specific questions, receive instant multidimensional evaluations, and refine your technical & behavioral delivery.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="btn-start-interview"
            className="btn-primary-glow"
            onClick={() => navigate('/student/mock-interview/start')}
          >
            Start New Interview
          </button>
          <button
            id="btn-view-analytics"
            className="btn-secondary"
            onClick={() => navigate('/student/mock-interview/analytics')}
          >
            Detailed Analytics
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer Notice */}
      <div className="disclaimer-banner" role="alert">
        <span className="disclaimer-icon">ℹ️</span>
        <span className="disclaimer-text">
          <strong>Notice:</strong> AI mock interview results are for practice and preparation only. They do not guarantee job selection.
        </span>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing your interview performance and readiness metrics...</p>
        </div>
      ) : error ? (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-secondary" onClick={fetchDashboard}>Retry</button>
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total Interviews</span>
              <span className="metric-value">{summary?.totalInterviews ?? 0}</span>
              <span className="metric-sub">Completed practice rounds</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Average Score</span>
              <span className="metric-value">{summary?.averageScore ?? 0}%</span>
              <span className="metric-sub">Across all dimensions</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Best Score</span>
              <span className="metric-value best-score">{summary?.bestScore ?? 0}%</span>
              <span className="metric-sub">Peak recorded session</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Technical Readiness</span>
              <span className="metric-value">{summary?.technicalReadiness ?? 75}%</span>
              <span className="metric-sub">Code & architecture mastery</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Communication Score</span>
              <span className="metric-value">{summary?.communicationReadiness ?? 78}%</span>
              <span className="metric-sub">Fluency & clarity score</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Interview Streak</span>
              <span className="metric-value streak-val">{scores?.streakDays ?? 1} Days 🔥</span>
              <span className="metric-sub">Consistent daily preparation</span>
            </div>
          </div>

          {/* Weak Areas & Targeted Remediation */}
          <div className="dashboard-columns">
            <div className="section-card">
              <div className="section-header">
                <h3>Priority Improvement Areas</h3>
                <span className="pill-badge">{weakAreas.length} Identified</span>
              </div>
              <p className="section-desc">
                Derived directly from missing points and conceptual gaps detected in your mock interview evaluations:
              </p>
              <div className="weakness-chips-list">
                {weakAreas.map((area, idx) => (
                  <div key={idx} className="weakness-chip">
                    <span className="bullet">⚠️</span>
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Recommended Practice Modules</h3>
                <span className="pill-badge">Personalized</span>
              </div>
              <p className="section-desc">
                Hand-picked courses and exercises mapped to your specific interview weaknesses:
              </p>
              <div className="recommendations-list">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="rec-item">
                    <div>
                      <div className="rec-type">{rec.type} MODULE • {rec.estimatedTime}</div>
                      <div className="rec-title">{rec.title}</div>
                    </div>
                    <Link to={rec.link} className="rec-action-btn">
                      Practice →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Previous Interviews Table */}
          <div className="section-card full-width">
            <div className="section-header">
              <h3>Previous Interview Sessions</h3>
              <Link to="/student/mock-interview/history" className="view-all-link">
                View Complete History →
              </Link>
            </div>

            {recentInterviews.length === 0 ? (
              <div className="empty-state">
                <p>No mock interviews recorded yet. Take your first interview to benchmark your readiness!</p>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/student/mock-interview/start')}
                >
                  Start First Interview
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="interview-table">
                  <thead>
                    <tr>
                      <th>Target Role</th>
                      <th>Type</th>
                      <th>Difficulty</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Performance</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInterviews.map((item) => (
                      <tr key={item.id}>
                        <td className="role-cell">
                          <strong>{item.targetRole}</strong>
                        </td>
                        <td>
                          <span className="type-pill">{item.interviewType}</span>
                        </td>
                        <td>
                          <span className="diff-pill">{item.difficulty}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <strong>{Math.round(item.overallScore)}%</strong>
                        </td>
                        <td>
                          <span className={`score-badge ${getBadgeColor(item.scoreLabel)}`}>
                            {item.scoreLabel}
                          </span>
                        </td>
                        <td className="date-cell">
                          {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'In Progress'}
                        </td>
                        <td>
                          <Link
                            to={`/student/mock-interview/result/${item.id}`}
                            className="review-link"
                          >
                            Scorecard →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default MockInterviewDashboardView;
