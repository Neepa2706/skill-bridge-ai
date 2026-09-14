import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import './MockTestResultView.css';

interface ResultData {
  attemptId: string;
  testId: string;
  testTitle: string;
  lessonId: string;
  lessonTitle: string;
  percentage: number;
  passed: boolean;
  passingPercentage: number;
  earnedMarks: number;
  totalMarks: number;
  timeTakenSeconds: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  suspiciousEventCount: number;
  canRetry: boolean;
  attemptsRemaining: number;
  aiFeedback: {
    strengths?: string[];
    weakConcepts?: string[];
    commonMistakes?: string[];
    recommendedRevision?: string[];
    suggestedLesson?: { id: string; title: string };
    nextDifficulty?: string;
    motivationMessage?: string;
    nextAction?: string;
  };
  skillResults: Array<{
    skillId: string;
    skillName: string;
    earnedMarks: number;
    maximumMarks: number;
    percentage: number;
    status: 'Mastered' | 'Developing' | 'Needs Practice';
  }>;
}

interface MockTestResultViewProps {
  testId: string;
  attemptId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const MockTestResultView: React.FC<MockTestResultViewProps> = ({ testId, attemptId, onNavigate }) => {
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [testId, attemptId]);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/result/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load assessment result.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="result-page-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Calculating score and generating AI diagnostic feedback...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="result-page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={40} color="var(--accent-rose)" style={{ margin: '0 auto 12px auto' }} />
          <h3>Error Loading Result</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'Result unavailable.'}</p>
          <button className="btn btn-outline" onClick={() => onNavigate('mock-tests')}>
            Back to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page-container">
      {/* 1. Hero Score Banner */}
      <div className={`result-hero-card ${data.passed ? 'passed' : 'failed'}`}>
        <div className="result-hero-text">
          <h1>
            {data.passed ? (
              <>
                <CheckCircle2 size={32} color="var(--accent-emerald)" />
                Assessment Passed! 🎉
              </>
            ) : (
              <>
                <XCircle size={32} color="var(--accent-rose)" />
                Needs Practice & Revision
              </>
            )}
          </h1>
          <div className="result-lesson-context">
            Lesson: {data.lessonTitle}
          </div>
          <p className="result-hero-desc">
            {data.passed
              ? `Congratulations! You scored ${data.percentage}%, exceeding the ${data.passingPercentage}% passing threshold. Your lesson progress has been updated and skill evidence recorded.`
              : `You scored ${data.percentage}%, below the ${data.passingPercentage}% passing threshold. Review the targeted concepts below and retry to solidify your understanding.`}
          </p>
        </div>

        <div className="score-circle-wrap">
          <div className={`score-gauge-ring ${data.passed ? 'passed' : 'failed'}`}>
            <span className="score-gauge-number">{data.percentage}%</span>
            <span className="score-gauge-label">
              {data.earnedMarks} / {data.totalMarks} Pts
            </span>
          </div>
        </div>
      </div>

      {/* 2. Stat Counters Row */}
      <div className="result-stats-row">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'hsla(142, 76%, 45%, 0.12)', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">{data.correctCount}</div>
            <div className="stat-lbl">Correct Answers</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'hsla(0, 84%, 60%, 0.12)', color: 'var(--accent-rose)' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="stat-val">{data.incorrectCount}</div>
            <div className="stat-lbl">Incorrect Answers</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'hsla(38, 92%, 50%, 0.12)', color: 'var(--accent-amber)' }}>
            <HelpCircle size={22} />
          </div>
          <div>
            <div className="stat-val">{data.unansweredCount}</div>
            <div className="stat-lbl">Unanswered</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'hsla(190, 95%, 45%, 0.12)', color: 'var(--accent-cyan)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">{formatSeconds(data.timeTakenSeconds)}</div>
            <div className="stat-lbl">Time Taken</div>
          </div>
        </div>
      </div>

      {/* 3. Split Grid: Skills & AI Feedback */}
      <div className="result-content-grid">
        {/* Left: Skill Breakdown */}
        <div className="skills-result-card">
          <h3>
            <Award size={20} color="var(--accent-purple)" />
            Skill Competency Breakdown
          </h3>

          {data.skillResults.map((skill) => {
            const statusClass =
              skill.status === 'Mastered' ? 'mastered' : skill.status === 'Developing' ? 'developing' : 'needs_practice';

            const barColor =
              skill.status === 'Mastered'
                ? 'var(--accent-emerald)'
                : skill.status === 'Developing'
                ? 'var(--accent-cyan)'
                : 'var(--accent-amber)';

            return (
              <div key={skill.skillId} className="skill-result-row">
                <div className="skill-result-header">
                  <span className="skill-result-name">{skill.skillName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      {skill.earnedMarks} / {skill.maximumMarks} ({skill.percentage}%)
                    </span>
                    <span className={`skill-result-status ${statusClass}`}>{skill.status}</span>
                  </div>
                </div>
                <div className="skill-progress-bar-bg">
                  <div
                    className="skill-progress-bar-fill"
                    style={{ width: `${skill.percentage}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: AI Diagnostic Feedback */}
        <div className="ai-feedback-card">
          <div>
            <div className="ai-feedback-header">
              <Sparkles size={20} color="var(--accent-purple)" />
              <h3>AI Diagnostic Feedback</h3>
            </div>

            {data.aiFeedback.motivationMessage && (
              <div className="ai-mentor-quote">
                "{data.aiFeedback.motivationMessage}"
              </div>
            )}

            {data.aiFeedback.strengths && data.aiFeedback.strengths.length > 0 && (
              <div className="feedback-bullet-group">
                <div className="feedback-bullet-title" style={{ color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={14} /> Demonstrated Strengths:
                </div>
                <ul className="feedback-bullets">
                  {data.aiFeedback.strengths.map((st, i) => (
                    <li key={i}>
                      <span style={{ color: 'var(--accent-emerald)' }}>•</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.aiFeedback.weakConcepts && data.aiFeedback.weakConcepts.length > 0 && (
              <div className="feedback-bullet-group">
                <div className="feedback-bullet-title" style={{ color: 'var(--accent-amber)' }}>
                  <AlertTriangle size={14} /> Focus Areas to Revisit:
                </div>
                <ul className="feedback-bullets">
                  {data.aiFeedback.weakConcepts.map((wc, i) => (
                    <li key={i}>
                      <span style={{ color: 'var(--accent-amber)' }}>•</span>
                      <span>{wc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-muted)' }}>
            <strong>Recommended Next Action:</strong>{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              {data.aiFeedback.nextAction || 'Continue to next roadmap stage.'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Actions Bar */}
      <div className="result-actions-bar">
        <div>
          <button
            className="btn btn-outline"
            onClick={() => onNavigate('mock-test-review', { testId, attemptId })}
          >
            <FileText size={16} /> Review Answers & Explanations
          </button>
        </div>

        <div className="action-buttons-group">
          {data.canRetry && (
            <button
              className="btn btn-outline"
              onClick={() => onNavigate('mock-test-instructions', { testId })}
            >
              <RotateCcw size={16} /> Retry Assessment ({data.attemptsRemaining} left)
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={() => onNavigate('learning')}
          >
            Continue Learning <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
