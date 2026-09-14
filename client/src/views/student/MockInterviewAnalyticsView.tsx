import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MockInterviewAnalyticsView.css';

interface ScorePoint {
  date: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  targetRole: string;
}

interface CommonWeakness {
  topic: string;
  occurrences: number;
}

interface ImprovedTopic {
  topic: string;
  gain: string;
}

interface AnalyticsData {
  totalInterviews: number;
  interviewCompletionRate: number;
  scoreImprovement: string;
  technicalImprovement: string;
  communicationImprovement: string;
  hrImprovement: string;
  interviewStreak: number;
  scoreTimeline: ScorePoint[];
  mostCommonWeaknesses: CommonWeakness[];
  mostImprovedTopics: ImprovedTopic[];
}

export const MockInterviewAnalyticsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/mock-interview/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalytics(data.data);
      } else {
        setError(data.message || 'Failed to load interview analytics.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching interview analytics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <span className="analytics-tag">Progress Insights</span>
          <h1>Interview Performance Analytics</h1>
          <p>Longitudinal metrics, skill progression over time, and verified readiness benchmarks.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/student/mock-interview/start')}
        >
          + New Mock Interview
        </button>
      </div>

      <div className="disclaimer-mini">
        ℹ️ AI mock interview results are for practice and preparation only. They do not guarantee job selection.
      </div>

      {loading ? (
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Calculating longitudinal interview insights...</p>
        </div>
      ) : error ? (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-secondary" onClick={fetchAnalytics}>Retry</button>
        </div>
      ) : !analytics || analytics.totalInterviews === 0 ? (
        <div className="insufficient-data-card">
          <h3>Insufficient Data for Analytics</h3>
          <p>Complete at least 1 mock interview session to unlock detailed performance trajectories and weakness analysis.</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/student/mock-interview/start')}
          >
            Start First Mock Interview
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="analytics-metrics-grid">
            <div className="metric-box">
              <span className="m-label">Score Progression</span>
              <span className="m-val positive">{analytics.scoreImprovement}</span>
              <span className="m-sub">Baseline vs Latest Round</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Technical Gain</span>
              <span className="m-val positive">{analytics.technicalImprovement}</span>
              <span className="m-sub">Concepts & Problem Solving</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Communication Gain</span>
              <span className="m-val positive">{analytics.communicationImprovement}</span>
              <span className="m-sub">Articulation & Structure</span>
            </div>

            <div className="metric-box">
              <span className="m-label">Completion Rate</span>
              <span className="m-val">{analytics.interviewCompletionRate}%</span>
              <span className="m-sub">Sessions finished without abort</span>
            </div>
          </div>

          {/* Timeline & Trajectory */}
          <div className="analytics-panel">
            <div className="panel-header">
              <h3>Score Progression Timeline</h3>
              <span className="pill-badge">{analytics.scoreTimeline.length} Rounds Analyzed</span>
            </div>
            <div className="timeline-list">
              {analytics.scoreTimeline.map((item, idx) => (
                <div key={idx} className="timeline-row">
                  <div className="row-meta">
                    <span className="t-date">{item.date}</span>
                    <strong className="t-role">{item.targetRole}</strong>
                  </div>
                  <div className="row-bars">
                    <div className="bar-group">
                      <div className="bar-label">Overall: {item.overallScore}%</div>
                      <div className="bar-track">
                        <div className="bar-fill overall" style={{ width: `${item.overallScore}%` }}></div>
                      </div>
                    </div>
                    <div className="bar-group">
                      <div className="bar-label">Technical: {item.technicalScore}%</div>
                      <div className="bar-track">
                        <div className="bar-fill tech" style={{ width: `${item.technicalScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2-Column: Weaknesses & Improvements */}
          <div className="analytics-two-col">
            <div className="analytics-panel">
              <div className="panel-header">
                <h3>Most Common Weaknesses</h3>
                <span className="pill-badge red">Focus Areas</span>
              </div>
              <div className="weakness-freq-list">
                {analytics.mostCommonWeaknesses.map((w, idx) => (
                  <div key={idx} className="weakness-item">
                    <span className="w-text">{w.topic}</span>
                    <span className="w-count">{w.occurrences}x detected</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-panel">
              <div className="panel-header">
                <h3>Most Improved Topics</h3>
                <span className="pill-badge green">Verified Growth</span>
              </div>
              <div className="improved-list">
                {analytics.mostImprovedTopics.map((item, idx) => (
                  <div key={idx} className="improved-item">
                    <span className="i-title">{item.topic}</span>
                    <span className="i-gain positive">{item.gain}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default MockInterviewAnalyticsView;
