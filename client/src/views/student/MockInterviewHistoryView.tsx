import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MockInterviewHistoryView.css';

interface HistoryItem {
  id: string;
  targetRole: string;
  interviewType: string;
  difficulty: string;
  mode: string;
  status: string;
  overallScore: number;
  scoreLabel: string;
  technicalScore: number;
  communicationScore: number;
  questionsAttempted: number;
  questionsSkipped: number;
  startedAt: string;
  completedAt: string;
}

export const MockInterviewHistoryView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/mock-interview/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHistory(data.data);
      } else {
        setError(data.message || 'Failed to load interview history.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching interview history.');
    } finally {
      setLoading(false);
    }
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

  const filteredHistory = history.filter(item => {
    if (filterType === 'ALL') return true;
    return item.interviewType === filterType;
  });

  return (
    <div className="history-container">
      <div className="history-header">
        <div>
          <span className="history-tag">Track Record</span>
          <h1>Mock Interview History</h1>
          <p>Review past performance, score progression, and question evaluations.</p>
        </div>
        <div>
          <button
            className="btn-primary"
            onClick={() => navigate('/student/mock-interview/start')}
          >
            + Start New Interview
          </button>
        </div>
      </div>

      {/* Mandatory Notice */}
      <div className="disclaimer-mini">
        ℹ️ AI mock interview results are for practice and preparation only. They do not guarantee job selection.
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <span>Filter by Type:</span>
        <div className="filter-chips">
          {['ALL', 'TECHNICAL', 'HR', 'BEHAVIORAL', 'COMMUNICATION', 'ROLE_SPECIFIC', 'MIXED'].map((t) => (
            <button
              key={t}
              className={`chip-btn ${filterType === t ? 'active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="history-loading">
          <div className="spinner"></div>
          <p>Retrieving your interview sessions...</p>
        </div>
      ) : error ? (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-secondary" onClick={fetchHistory}>Retry</button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="empty-history-box">
          <h3>No mock interviews found</h3>
          <p>You haven't completed any mock interviews matching this filter yet.</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/student/mock-interview/start')}
          >
            Take an Interview Now
          </button>
        </div>
      ) : (
        <div className="history-cards-grid">
          {filteredHistory.map((item) => (
            <div key={item.id} className="history-card">
              <div className="card-top">
                <span className="type-pill">{item.interviewType}</span>
                <span className={`status-pill ${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>

              <h3 className="role-title">{item.targetRole}</h3>

              <div className="score-summary-box">
                <div className="score-lead">
                  <span className="num">{item.overallScore}%</span>
                  <span className={`badge ${getScoreBadgeClass(item.scoreLabel)}`}>
                    {item.scoreLabel}
                  </span>
                </div>
                <div className="sub-scores">
                  <span>Tech: <strong>{item.technicalScore}%</strong></span>
                  <span>Comm: <strong>{item.communicationScore}%</strong></span>
                </div>
              </div>

              <div className="meta-details">
                <span>Difficulty: {item.difficulty}</span>
                <span>Attempted: {item.questionsAttempted}</span>
                <span>Date: {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'In Progress'}</span>
              </div>

              <div className="card-action">
                <Link
                  to={`/student/mock-interview/result/${item.id}`}
                  className="btn-view-card"
                >
                  View Full Scorecard →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default MockInterviewHistoryView;
