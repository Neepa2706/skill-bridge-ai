import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  BookOpen,
  Code2,
  ShieldCheck,
  Languages,
  Calendar,
  MapPin,
  Building2,
  TrendingUp,
  Award,
  Clock,
  Layers,
  CheckSquare
} from 'lucide-react';
import './MatchDetailExplanationView.css';

interface MatchDetailExplanationViewProps {
  id: string;
  initialTab?: string;
  onNavigate: (view: string, data?: any) => void;
}

export const MatchDetailExplanationView: React.FC<MatchDetailExplanationViewProps> = ({
  id,
  initialTab = 'overview',
  onNavigate
}) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [prepPlan, setPrepPlan] = useState<any>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/matched-opportunities/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        setIsSaved(Boolean(json.isSaved));
        if (json.preparationPlan) {
          setPrepPlan(json.preparationPlan);
        }
      } else {
        addToast('Error', json.error || 'Failed to load match explanation.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleToggleSave = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const method = isSaved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/opportunities/${id}/save`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsSaved(!isSaved);
        addToast(
          isSaved ? 'Removed from Saved' : 'Opportunity Saved',
          isSaved ? 'Removed from your bookmarks' : 'Added to your bookmarked opportunities',
          'info'
        );
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleStepToggle = async (stepIndex: number, currentCompleted: boolean) => {
    if (!prepPlan) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/preparation-plans/${prepPlan.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stepIndex,
          completed: !currentCompleted
        })
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setPrepPlan(resJson.plan);
        addToast('Plan Updated', `Preparation progress updated to ${resJson.plan.progressPercentage}%`, 'success');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <p>Loading AI match explanation and deterministic factor breakdown...</p>
      </div>
    );
  }

  if (!data || !data.opportunity) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h3>Opportunity Not Found</h3>
        <button onClick={() => onNavigate('matched-opportunities')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to AI Matches
        </button>
      </div>
    );
  }

  const { opportunity, match } = data;
  const score = match.matchingScore;
  const tierClass =
    score >= 90 ? 'excellent' :
    score >= 75 ? 'strong' :
    score >= 60 ? 'good' :
    score >= 40 ? 'partial' : 'low';

  const factors = [
    { label: 'Skill Match Score', key: 'skillMatch', weight: '40%', score: match.factorBreakdown?.skillMatch || 0, color: 'emerald' },
    { label: 'Eligibility Score', key: 'eligibility', weight: '20%', score: match.factorBreakdown?.eligibility || 0, color: 'cyan' },
    { label: 'Education & Branch', key: 'education', weight: '15%', score: match.factorBreakdown?.education || 0, color: 'indigo' },
    { label: 'Experience & Projects', key: 'experience', weight: '10%', score: match.factorBreakdown?.experience || 0, color: 'amber' },
    { label: 'Location & Work Mode', key: 'locationWorkMode', weight: '5%', score: match.factorBreakdown?.locationWorkMode || 0, color: 'cyan' },
    { label: 'Communication Score', key: 'communication', weight: '5%', score: match.factorBreakdown?.communication || 0, color: 'indigo' },
    { label: 'Opportunity Preference', key: 'preference', weight: '5%', score: match.factorBreakdown?.preference || 0, color: 'emerald' }
  ];

  return (
    <div className="match-detail-container">
      {/* Back Button */}
      <div className="back-btn-row">
        <button
          onClick={() => onNavigate('matched-opportunities')}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to AI Opportunity Matches
        </button>
      </div>

      {/* Header Info */}
      <div className="match-detail-header">
        <div className="match-role-title-wrap">
          <h1>{opportunity.title}</h1>
          <div className="match-company-meta">
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{opportunity.companyName}</span>
            <span>•</span>
            <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>{opportunity.type.replace('_', ' ')}</span>
            <span>•</span>
            <span>{opportunity.location} ({opportunity.workMode})</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleToggleSave}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSaved ? (
              <>
                <BookmarkCheck style={{ width: 16, height: 16, color: 'var(--accent-emerald)' }} />
                Saved
              </>
            ) : (
              <>
                <Bookmark style={{ width: 16, height: 16 }} />
                Save Opportunity
              </>
            )}
          </button>

          {opportunity.applyUrl && (
            <a
              href={opportunity.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Apply on Official Portal
              <ExternalLink style={{ width: 16, height: 16 }} />
            </a>
          )}
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="disclaimer-banner">
        <span className="disclaimer-badge">Disclaimer</span>
        <p>
          <strong>{data.disclaimer}</strong> {data.notice}
        </p>
      </div>

      {/* Hero Score Card */}
      <div className="match-hero-card">
        <div className="hero-score-display">
          <div className={`score-radial-circle ${tierClass}`}>
            <span className="score-num">{score}%</span>
            <span className="score-label">Match</span>
          </div>

          <div className="hero-summary-details">
            <h2>{match.matchCategoryLabel}</h2>
            <p>{match.explanation}</p>

            <div className="hero-badges-row">
              <span className={`eligibility-pill ${
                match.eligibilityStatus === 'Eligible' ? 'eligible' :
                match.eligibilityStatus === 'Possibly Eligible' ? 'possibly' : 'not-eligible'
              }`}>
                {match.eligibilityStatus}
              </span>

              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Confidence: <strong style={{ color: 'var(--text-primary)' }}>{match.recommendationConfidence}</strong>
              </span>

              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Engine: <strong style={{ color: 'var(--text-primary)' }}>{data.engineVersion}</strong>
              </span>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => {
              const el = document.getElementById('preparation-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <BookOpen style={{ width: 16, height: 16 }} />
            View Preparation Plan
          </button>
        </div>
      </div>

      {/* 7-Factor Weighted Breakdown */}
      <div className="factors-section">
        <div className="factors-section-header">
          <h3>
            <TrendingUp style={{ width: 18, height: 18, color: 'var(--primary)' }} />
            Transparent 7-Factor Matching Breakdown
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mathematical Formula Weighted Between 0% and 100%
          </span>
        </div>

        <div className="factors-grid">
          {factors.map(f => (
            <div key={f.key} className="factor-item-card">
              <div className="factor-top">
                <span className="factor-title">{f.label}</span>
                <span className="factor-weight-pill">Weight: {f.weight}</span>
              </div>

              <div className="factor-score-bar-bg">
                <div
                  className={`factor-score-bar-fill ${f.color}`}
                  style={{ width: `${Math.min(100, Math.max(5, f.score))}%` }}
                />
              </div>

              <div className="factor-bottom">
                <span>Evaluated Score</span>
                <strong style={{ color: 'var(--text-primary)' }}>{f.score}/100</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why This Matches You */}
      {match.whyMatched && match.whyMatched.length > 0 && (
        <div className="why-matches-section">
          <h3>
            <Sparkles style={{ width: 18, height: 18, color: 'var(--accent-emerald)' }} />
            Why This Matches You
          </h3>

          <div className="why-matches-list">
            {match.whyMatched.map((point: string, idx: number) => (
              <div key={idx} className="why-match-item">
                <CheckCircle2 className="why-match-icon" style={{ width: 18, height: 18 }} />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Comparison Table */}
      <div className="comparison-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>
            <Layers style={{ width: 18, height: 18, color: 'var(--accent-cyan)' }} />
            Skill Comparison Matrix
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Based on Verified AI Skill Report & Coding Practice
          </span>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Opportunity Skill</th>
                <th>Your Level</th>
                <th>Score</th>
                <th>Required Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {match.skillComparison && match.skillComparison.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{row.skillName}</strong>
                    {row.isPreferred && (
                      <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        (Preferred)
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="level-dots-wrap">
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <div
                          key={lvl}
                          className={`level-dot ${lvl <= row.studentLevel ? 'active' : ''} ${row.status === 'Matched' ? 'emerald' : ''}`}
                        />
                      ))}
                      <span style={{ fontSize: '12px', marginLeft: '6px', color: 'var(--text-secondary)' }}>
                        Level {row.studentLevel}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{row.studentScore}/100</span>
                  </td>
                  <td>
                    <div className="level-dots-wrap">
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <div
                          key={lvl}
                          className={`level-dot ${lvl <= row.requiredLevel ? 'active' : ''}`}
                        />
                      ))}
                      <span style={{ fontSize: '12px', marginLeft: '6px', color: 'var(--text-muted)' }}>
                        Level {row.requiredLevel}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`skill-chip ${row.status === 'Matched' ? 'matched' : 'improve'}`}>
                      {row.status === 'Matched' ? '✓ Matched' : row.status === 'Needs Improvement' ? '△ Needs Improvement' : '✕ Missing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Improvement Suggestions */}
      {match.improvementSuggestions && (
        <div className="suggestions-section">
          <h3>
            <Award style={{ width: 18, height: 18, color: 'var(--accent-amber)' }} />
            Targeted Skill Improvement Recommendations
          </h3>

          <div className="suggestions-grid">
            {match.improvementSuggestions.recommendedCourse && (
              <div className="suggestion-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
                    <BookOpen style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Course</span>
                  </div>
                  <h4>{match.improvementSuggestions.recommendedCourse.title}</h4>
                  <p>{match.improvementSuggestions.recommendedCourse.description}</p>
                </div>
                <button
                  onClick={() => onNavigate('courses')}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '12.5px' }}
                >
                  Start Course ({match.improvementSuggestions.recommendedCourse.hours} Hours)
                </button>
              </div>
            )}

            {match.improvementSuggestions.recommendedProblems && match.improvementSuggestions.recommendedProblems.length > 0 && (
              <div className="suggestion-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                    <Code2 style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Coding Arena</span>
                  </div>
                  <h4>Practice Targeted Problem Sets</h4>
                  <p>Solve algorithm challenges in Python and SQL to meet the role's coding standard.</p>
                </div>
                <button
                  onClick={() => onNavigate('coding')}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '12.5px' }}
                >
                  Go to Coding Arena
                </button>
              </div>
            )}

            {match.improvementSuggestions.recommendedMockTest && (
              <div className="suggestion-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', marginBottom: '8px' }}>
                    <ShieldCheck style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Benchmark Mock Test</span>
                  </div>
                  <h4>{match.improvementSuggestions.recommendedMockTest.title}</h4>
                  <p>Attempt timed assessment to boost your verified skill score and unlock placement shortlists.</p>
                </div>
                <button
                  onClick={() => onNavigate('mock-tests')}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', fontSize: '12.5px' }}
                >
                  Attempt Mock Test ({match.improvementSuggestions.recommendedMockTest.durationMinutes} Mins)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured 6-Step Preparation Plan */}
      <div id="preparation-section" className="preparation-plan-section">
        <div className="prep-plan-header">
          <div>
            <h3>
              <CheckSquare style={{ width: 20, height: 20, color: 'var(--accent-emerald)' }} />
              Skill-Gap to Placement Preparation Plan
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
              Structured, sequential roadmap generated specifically for {opportunity.title} at {opportunity.companyName}.
            </p>
          </div>

          {prepPlan && (
            <span className={`eligibility-pill ${prepPlan.status === 'COMPLETED' ? 'eligible' : 'possibly'}`}>
              Status: {prepPlan.status.replace('_', ' ')}
            </span>
          )}
        </div>

        {prepPlan && (
          <>
            <div className="prep-progress-bar-wrap">
              <div className="prep-progress-meta">
                <span>Preparation Progress</span>
                <span style={{ color: 'var(--text-primary)' }}>{prepPlan.progressPercentage}% Completed</span>
              </div>
              <div className="factor-score-bar-bg" style={{ height: '10px' }}>
                <div
                  className="factor-score-bar-fill emerald"
                  style={{ width: `${prepPlan.progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="prep-steps-list">
              {prepPlan.steps && prepPlan.steps.map((step: any) => (
                <div key={step.stepIndex} className={`prep-step-item ${step.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => handleStepToggle(step.stepIndex, step.completed)}
                    className="prep-step-checkbox"
                    id={`step-chk-${step.stepIndex}`}
                  />
                  <div className="prep-step-content">
                    <div className="prep-step-title-row">
                      <label htmlFor={`step-chk-${step.stepIndex}`} className="prep-step-title" style={{ cursor: 'pointer' }}>
                        Step {step.stepIndex}: {step.title}
                      </label>
                      <span className="opp-type-pill" style={{ fontSize: '10px' }}>
                        {step.type}
                      </span>
                    </div>
                    <p className="prep-step-desc">{step.description}</p>
                    <button
                      onClick={() => {
                        if (step.type === 'COURSE') onNavigate('courses');
                        else if (step.type === 'CODING' || step.type === 'PRACTICE') onNavigate('coding');
                        else if (step.type === 'MOCK_TEST') onNavigate('mock-tests');
                        else if (step.type === 'PROJECT') onNavigate('roadmap');
                        else if (opportunity.applyUrl) window.open(opportunity.applyUrl, '_blank');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      Open {step.type.replace('_', ' ')} Activity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
