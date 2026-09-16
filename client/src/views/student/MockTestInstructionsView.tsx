import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Award,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Eye,
  Save,
  AlertTriangle
} from 'lucide-react';
import './MockTestInstructionsView.css';

interface InstructionsData {
  testId: string;
  title: string;
  description: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  difficulty: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  passingPercentage: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  canAttempt: boolean;
  activeAttemptId: string | null;
  rules: string[];
}

interface MockTestInstructionsViewProps {
  testId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const MockTestInstructionsView: React.FC<MockTestInstructionsViewProps> = ({ testId, onNavigate }) => {
  const [data, setData] = useState<InstructionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructions();
  }, [testId]);

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/instructions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Failed to load instructions.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        // Attempt initialized, jump to exam view
        onNavigate('mock-test-attempt', { testId, attemptId: resData.attemptId });
      } else {
        setError(resData.error || 'Failed to start assessment.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error.');
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="instructions-page" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Preparing exam guidelines and environment...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="instructions-page">
        <div className="instructions-card" style={{ textAlign: 'center', padding: '48px' }}>
          <AlertTriangle size={48} color="var(--accent-rose)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Assessment Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Test could not be loaded.'}</p>
          <button className="btn btn-outline" onClick={() => onNavigate('mock-tests')}>
            <ArrowLeft size={16} /> Back to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="instructions-page">
      <div className="instructions-card">
        {/* Back Link */}
        <div className="instructions-back-btn" onClick={() => onNavigate('mock-tests')}>
          <ArrowLeft size={16} /> Back to Mock Tests List
        </div>

        {/* Header */}
        <div className="instructions-header">
          <h1>{data.title}</h1>
          <div className="instructions-lesson-tag">
            <span>{data.courseTitle}</span>
            <span>•</span>
            <span>{data.lessonTitle}</span>
          </div>
          <p className="instructions-desc">{data.description}</p>
        </div>

        {/* Parameters Grid */}
        <div className="params-grid">
          <div className="param-box">
            <div className="param-box-label">Duration</div>
            <div className="param-box-val">{data.durationMinutes} Minutes</div>
          </div>
          <div className="param-box">
            <div className="param-box-label">Questions</div>
            <div className="param-box-val">{data.totalQuestions} Questions</div>
          </div>
          <div className="param-box">
            <div className="param-box-label">Total Marks</div>
            <div className="param-box-val">{data.totalMarks} Marks</div>
          </div>
          <div className="param-box">
            <div className="param-box-label">Passing Mark</div>
            <div className="param-box-val" style={{ color: 'var(--accent-emerald)' }}>
              {data.passingPercentage}%
            </div>
          </div>
          <div className="param-box">
            <div className="param-box-label">Difficulty</div>
            <div
              className="param-box-val"
              style={{
                textTransform: 'capitalize',
                color: data.difficulty === 'easy' ? 'var(--accent-emerald)' : data.difficulty === 'medium' ? 'var(--accent-amber)' : 'var(--accent-rose)'
              }}
            >
              {data.difficulty}
            </div>
          </div>
        </div>

        {/* Instructions & Anti-Cheating Checklist */}
        <div className="rules-section">
          <h3>
            <ShieldAlert size={18} color="var(--accent-purple)" />
            Rules & Proctoring Guidelines
          </h3>
          <ul className="rules-list">
            <li>
              <Maximize2 size={18} />
              <div>
                <strong>Focused Screen Mode:</strong> The assessment should be taken in fullscreen.
                Exiting fullscreen or minimizing the window is monitored.
              </div>
            </li>
            <li>
              <Eye size={18} />
              <div>
                <strong>Tab Switching / Window Focus:</strong> Navigating away from the active tab is strictly recorded.
                Accumulating 3 violations will trigger an automatic submission of your exam.
              </div>
            </li>
            <li>
              <Clock size={18} />
              <div>
                <strong>Timer & Auto-Submit:</strong> The countdown timer is tracked server-side.
                When the time reaches 00:00, your current answers are automatically submitted.
              </div>
            </li>
            <li>
              <Save size={18} />
              <div>
                <strong>Instant Auto-Save:</strong> Each answer choice is immediately saved to the server.
                If your internet briefly stutters, your selected answers remain safe.
              </div>
            </li>
            <li>
              <CheckCircle2 size={18} />
              <div>
                <strong>Explanations & AI Feedback:</strong> Complete step-by-step solutions, correct answers,
                and personalized revision recommendations unlock immediately upon submission.
              </div>
            </li>
          </ul>
        </div>

        {/* Safe Exam Browser (SEB) Integration Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, hsla(217, 91%, 60%, 0.08) 0%, hsla(265, 89%, 66%, 0.08) 100%)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Safe Exam Browser (SEB) Enabled</h4>
              <span className="badge badge-success" style={{ fontSize: '10px' }}>SEB Ready</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.5 }}>
              This assessment enforces workstation lockdown. You can launch directly using the official desktop <strong>Safe Exam Browser</strong> application or continue in this browser with strict proctored fullscreen lockdown.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="/api/assessment/seb-config"
              download="SkillBridge-Assessment.seb"
              className="btn btn-outline btn-sm"
              id="download-seb-mock-test-btn"
            >
              📥 Download .seb Config
            </a>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="instructions-actions">

          <div className="attempts-notice">
            <span>Attempts Used: </span>
            <strong>{data.attemptsUsed} of {data.maxAttempts}</strong>
            {data.attemptsRemaining > 0 ? (
              <span style={{ color: 'var(--accent-emerald)', marginLeft: '8px' }}>
                ({data.attemptsRemaining} attempt{data.attemptsRemaining > 1 ? 's' : ''} left)
              </span>
            ) : (
              <span style={{ color: 'var(--accent-rose)', marginLeft: '8px' }}>
                (No attempts left)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-outline" onClick={() => onNavigate('mock-tests')}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleStartExam}
              disabled={isStarting || !data.canAttempt}
            >
              {isStarting ? (
                'Initializing Exam Sandbox...'
              ) : data.activeAttemptId ? (
                <>Resume Active Attempt <ArrowRight size={18} /></>
              ) : (
                <>Start Assessment Now <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
