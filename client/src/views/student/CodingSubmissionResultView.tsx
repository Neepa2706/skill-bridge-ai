import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Code2,
  ChevronLeft,
  Award
} from 'lucide-react';
import './CodingSubmissionResultView.css';

interface CodingSubmissionResultViewProps {
  submissionId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const CodingSubmissionResultView: React.FC<CodingSubmissionResultViewProps> = ({
  submissionId,
  onNavigate
}) => {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/coding/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="submission-result-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Generating AI Submission Scorecard...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="submission-result-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <p style={{ color: '#ef4444' }}>Submission not found or access denied.</p>
        <button className="btn btn-secondary" onClick={() => onNavigate('coding')}>
          Return to Coding Arena
        </button>
      </div>
    );
  }

  const isAccepted = submission.status === 'ACCEPTED';
  const isPartial = submission.status === 'PARTIAL_SUCCESS';
  const bannerTheme = isAccepted ? 'accepted' : isPartial ? 'partial' : 'failed';
  const feedback = submission.feedback;

  return (
    <div className="submission-result-container">
      {/* Back Button */}
      <button
        className="btn btn-sm btn-secondary"
        onClick={() => onNavigate('coding-problem-detail', { problemId: submission.problemId })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={14} /> Back to Code Editor
      </button>

      {/* 1. Scorecard Hero Banner */}
      <div className={`scorecard-banner ${bannerTheme}`}>
        <div className="scorecard-info-left">
          <div className="status-headline-badge">
            {isAccepted ? <CheckCircle2 size={16} /> : isPartial ? <AlertTriangle size={16} /> : <XCircle size={16} />}
            {submission.status.replace('_', ' ')}
          </div>
          <h1 className="scorecard-title">{submission.problemTitle}</h1>
          <p className="scorecard-meta-text">
            {feedback?.headline || (isAccepted ? 'All test cases passed with 100% accuracy!' : 'Solution failed on one or more benchmark test cases.')}
          </p>
        </div>

        <div className="score-circle-widget">
          <div className="score-number" style={{ color: isAccepted ? '#4ade80' : isPartial ? '#facc15' : '#f87171' }}>
            {submission.score}%
          </div>
          <div className="score-caption">ACCURACY SCORE</div>
        </div>
      </div>

      {/* 2. Metrics Row */}
      <div className="submission-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="metric-val">{submission.passedTests} / {submission.totalTests}</div>
            <div className="metric-label">Benchmark Test Cases Passed</div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon">
            <Clock size={22} />
          </div>
          <div>
            <div className="metric-val">{submission.executionTimeMs} ms</div>
            <div className="metric-label">Execution Time (Sandboxed)</div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon">
            <Cpu size={22} />
          </div>
          <div>
            <div className="metric-val">{submission.memoryUsedMb} MB</div>
            <div className="metric-label">Memory Footprint</div>
          </div>
        </div>
      </div>

      {/* 3. AI Code Diagnostic Analysis Card */}
      {feedback && (
        <div className="ai-feedback-card">
          <div className="feedback-card-header">
            <Sparkles size={20} color="#a855f7" /> AI Diagnostic Code Evaluation
          </div>

          {/* Strengths */}
          {feedback.strengths?.length > 0 && (
            <div className="feedback-section">
              <div className="feedback-section-title">Demonstrated Strengths</div>
              <ul className="feedback-list">
                {feedback.strengths.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Likely Mistake or Error if not accepted */}
          {feedback.likelyMistake && !isAccepted && (
            <div className="feedback-section">
              <div className="feedback-section-title" style={{ color: '#f87171' }}>
                Why the Solution Failed
              </div>
              <p style={{ fontSize: '14px', color: '#fca5a5', margin: 0, lineHeight: 1.6 }}>
                {feedback.likelyMistake}
              </p>
            </div>
          )}

          {/* Edge Cases to Review */}
          {feedback.edgeCasesToReview?.length > 0 && (
            <div className="feedback-section">
              <div className="feedback-section-title">Critical Edge Cases to Verify</div>
              <ul className="feedback-list">
                {feedback.edgeCasesToReview.map((e: string, idx: number) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Algorithmic Complexity Profile */}
          {feedback.complexityAnalysis && (
            <div className="feedback-section">
              <div className="feedback-section-title">Algorithmic Complexity Profile</div>
              <div className="complexity-verdict-box">
                <div><strong>Time:</strong> {feedback.complexityAnalysis.time}</div>
                <div><strong>Space:</strong> {feedback.complexityAnalysis.space}</div>
                <div><strong>Verdict:</strong> {feedback.complexityAnalysis.verdict}</div>
              </div>
            </div>
          )}

          {/* Concept Revision & Next Step */}
          {feedback.conceptRevisionAdvice && (
            <div className="feedback-section">
              <div className="feedback-section-title">Targeted Revision Recommendation</div>
              <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>
                {feedback.conceptRevisionAdvice}
              </p>
            </div>
          )}

          {feedback.recommendedNextStep && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', marginBottom: '2px' }}>
                NEXT ACTIONABLE CHALLENGE
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>
                {feedback.recommendedNextStep}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Benchmark Test Cases Breakdown */}
      {submission.testResults?.length > 0 && (
        <div className="ai-feedback-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="#22c55e" /> Benchmark Test Cases Breakdown ({submission.passedTests} / {submission.totalTests} Passed)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {submission.testResults.map((tc: any) => (
              <div
                key={tc.caseIndex}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${tc.passed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '10px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>
                    {tc.passed ? <CheckCircle2 size={15} color="#22c55e" /> : <XCircle size={15} color="#ef4444" />}
                    Test Case {tc.caseIndex}
                    {!tc.isPublic && (
                      <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderRadius: '4px' }}>
                        Hidden Benchmark
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {tc.executionTimeMs}ms
                  </span>
                </div>

                {tc.isPublic ? (
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                    <div><strong style={{ color: '#cbd5e1' }}>Input:</strong> {tc.input}</div>
                    <div><strong style={{ color: '#cbd5e1' }}>Expected:</strong> {tc.expected}</div>
                    {tc.actual && <div><strong style={{ color: tc.passed ? '#4ade80' : '#f87171' }}>Actual:</strong> {tc.actual}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: tc.passed ? '#4ade80' : '#f87171', fontWeight: 500 }}>
                    {tc.passed ? '✓ Passed all private assertions' : '✗ Failed on edge case benchmark'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Submitted Source Code */}
      <div className="ai-feedback-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={16} color="#3b82f6" /> Submitted {submission.language?.toUpperCase()} Code
        </div>
        <div className="submitted-code-preview">
          {submission.sourceCode}
        </div>
      </div>

      {/* 5. Actions Footer */}
      <div className="submission-actions-row">
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('coding-problem-detail', { problemId: submission.problemId })}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RotateCcw size={16} /> Try Again / Refactor Solution
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('coding-problems')}
          >
            All Challenges
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('coding')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Coding Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
