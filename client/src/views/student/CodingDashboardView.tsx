import React, { useState, useEffect } from 'react';
import {
  Code,
  Flame,
  CheckCircle,
  TrendingUp,
  Award,
  ArrowRight,
  Terminal,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import './CodingDashboardView.css';

interface CodingDashboardViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const CodingDashboardView: React.FC<CodingDashboardViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/coding', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load coding dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="coding-dashboard-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading Coding Arena...</p>
      </div>
    );
  }

  const continueProblem = data?.continueProblem;

  return (
    <div className="coding-dashboard-container">
      {/* 1. Hero Card */}
      <div className="coding-hero-card">
        <div className="coding-hero-content">
          <div className="coding-hero-badge">
            <Sparkles size={14} /> Interactive Code Sandbox & Practice
          </div>
          <h1 className="coding-hero-title">Practice Coding. Master Algorithms. Get Placement Ready.</h1>
          <p className="coding-hero-subtitle">
            Write real code, run against verified test cases, and receive instant server-side auto-evaluation with step-by-step AI debugging hints and complexity profiling.
          </p>
          <div className="coding-hero-actions">
            {continueProblem && (
              <button
                className="btn btn-primary"
                onClick={() => onNavigate('coding-problem-detail', { problemId: continueProblem.id })}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px' }}
              >
                Continue Practice: {continueProblem.title} <ArrowRight size={18} />
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('coding-problems')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '15px' }}
            >
              Browse All Problems <Code size={18} />
            </button>
          </div>
        </div>

        {/* Hero Illustration / Mascot */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Flame size={48} color="#f97316" />
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
            {data?.currentStreak || 0} Days
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ACTIVE CODING STREAK
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="coding-stats-grid">
        {/* Streak */}
        <div className="coding-stat-card">
          <div className="coding-stat-icon-wrapper flame">
            <Flame size={26} />
          </div>
          <div>
            <div className="coding-stat-val">{data?.currentStreak || 0} Days</div>
            <div className="coding-stat-label">Current Streak (Best: {data?.longestStreak || 0}d)</div>
          </div>
        </div>

        {/* Problems Solved */}
        <div className="coding-stat-card">
          <div className="coding-stat-icon-wrapper solved">
            <CheckCircle size={26} />
          </div>
          <div>
            <div className="coding-stat-val">
              {data?.problemsSolved || 0} <span style={{ fontSize: '16px', color: '#64748b' }}>/ {data?.totalProblems || 0}</span>
            </div>
            <div className="difficulty-pills">
              <span className="diff-badge easy">{data?.difficultyBreakdown?.easy || 0} Easy</span>
              <span className="diff-badge medium">{data?.difficultyBreakdown?.medium || 0} Med</span>
              <span className="diff-badge hard">{data?.difficultyBreakdown?.hard || 0} Hard</span>
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="coding-stat-card">
          <div className="coding-stat-icon-wrapper accuracy">
            <TrendingUp size={26} />
          </div>
          <div>
            <div className="coding-stat-val">{data?.accuracyRate || 0}%</div>
            <div className="coding-stat-label">Acceptance Rate ({data?.totalSubmissions || 0} tries)</div>
          </div>
        </div>

        {/* Coding Level */}
        <div className="coding-stat-card">
          <div className="coding-stat-icon-wrapper level">
            <Award size={26} />
          </div>
          <div>
            <div className="coding-stat-val">{data?.codingLevel || 'Beginner'}</div>
            <div className="coding-stat-label">Placement Readiness Level</div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Content Grid */}
      <div className="coding-dashboard-content">
        {/* Left: Recommended Challenges */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Terminal size={20} color="#a855f7" /> Recommended Practice Challenges
            </div>
            <span
              className="panel-action-link"
              onClick={() => onNavigate('coding-problems')}
            >
              View All ({data?.totalProblems || 0}) →
            </span>
          </div>

          <div className="recommended-grid">
            {data?.recommendedProblems?.map((prob: any) => (
              <div
                key={prob.id}
                className="problem-card-compact"
                onClick={() => onNavigate('coding-problem-detail', { problemId: prob.id })}
              >
                <div className="problem-compact-info">
                  <div className="problem-compact-title">{prob.title}</div>
                  <div className="problem-compact-meta">
                    <span className={`diff-badge ${prob.difficulty}`}>{prob.difficulty.toUpperCase()}</span>
                    <span>•</span>
                    <span>{prob.topic}</span>
                    <span>•</span>
                    <span>Python, C, C++</span>
                  </div>
                </div>
                <button className="btn btn-sm btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Solve <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Recent Submissions */}
          <div style={{ marginTop: '36px' }}>
            <div className="panel-header" style={{ marginBottom: '12px' }}>
              <div className="panel-title" style={{ fontSize: '16px' }}>
                <Clock size={18} color="#3b82f6" /> Recent Coding Submissions
              </div>
            </div>

            {data?.recentActivity?.length > 0 ? (
              <table className="recent-subs-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Status</th>
                    <th>Language</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivity.map((sub: any) => (
                    <tr
                      key={sub.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate('coding-submission-result', { submissionId: sub.id })}
                    >
                      <td style={{ fontWeight: 600 }}>{sub.problem_title}</td>
                      <td>
                        <span className={`sub-status-pill ${sub.status}`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{sub.language}</td>
                      <td style={{ fontWeight: 700, color: sub.score === 100 ? '#4ade80' : '#facc15' }}>
                        {sub.score}%
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '12px' }}>
                        {sub.submitted_at?.split(' ')[0] || 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                No recent submissions yet. Start with "Find the Greater Number"!
              </p>
            )}
          </div>
        </div>

        {/* Right: Coding Badges & Streak Calendar */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Award size={20} color="#f97316" /> Unlocked Badges & Milestones
            </div>
          </div>

          <div className="streak-badges-list">
            {data?.badges?.map((badge: any) => (
              <div key={badge.id} className="streak-badge-item">
                <div style={{ fontSize: '28px' }}>{badge.title.split(' ')[0]}</div>
                <div>
                  <div className="badge-title">{badge.title}</div>
                  <div className="badge-desc">{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Motivational Tip Box */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '12px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#c4b5fd', marginBottom: '6px' }}>
              💡 Consistency Builds Placement Edge
            </div>
            <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              Top tech recruiters look for candidates who demonstrate consistent problem-solving habits. Solving just 1 challenge every day compounds your technical depth exponentially.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
