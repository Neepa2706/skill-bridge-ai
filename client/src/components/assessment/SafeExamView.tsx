import React, { useState, useEffect } from 'react';
import { CameraProctorHUD } from './CameraProctorHUD';
import { ShieldCheck, Clock, AlertOctagon, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface SafeExamViewProps {
  assessmentId: string;
  attemptId: string;
  title: string;
  durationMinutes: number;
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    options: string[];
    skillName: string;
    category: string;
    difficulty: string;
    points: number;
  }>;
  onComplete: (result: any) => void;
  onExit: () => void;
}

export const SafeExamView: React.FC<SafeExamViewProps> = ({
  assessmentId,
  attemptId,
  title,
  durationMinutes,
  questions,
  onComplete,
  onExit
}) => {
  const { addToast } = useNotification();
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60);
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Safe Exam Proctoring Listeners (Tab switch, Blur, Copy-Paste)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'Candidate switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      logViolation('window_blur', 'Window focus lost');
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('copy_paste_attempt', 'Attempted clipboard copy or paste during safe exam');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [attemptId]);

  const logViolation = async (type: string, details: string) => {
    setViolationsCount(prev => prev + 1);
    addToast('Proctoring Notice', `${details}. This incident has been logged.`, 'warning');

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/assessment/proctor-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          violationType: type,
          details,
          severity: 'medium'
        })
      });
      const data = await res.json();
      if (data.shouldBlock) {
        addToast('Exam Locked', 'Violation threshold exceeded. Assessment auto-submitted.', 'error');
        handleSubmit();
      }
    } catch (e) {
      console.error('Failed to report proctor log:', e);
    }
  };

  const selectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          answers
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Assessment Complete', 'AI skill analysis generated and career readiness profile updated.', 'success');
        onComplete(data);
      } else {
        addToast('Submission Error', data.error || 'Failed to submit assessment.', 'error');
        setIsSubmitting(false);
      }
    } catch (e: any) {
      addToast('Network Error', e.message || 'Error communicating with evaluation server.', 'error');
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="safe-exam-container">
      {/* Header Bar */}
      <div className="proctor-hud-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <span style={{ fontWeight: 800, fontSize: '16px' }}>SAFE EXAM ENVIRONMENT</span>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Timer Display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: timeLeft < 300 ? 'hsla(350, 89%, 60%, 0.15)' : 'hsla(217, 25%, 25%, 0.6)',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${timeLeft < 300 ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
              color: timeLeft < 300 ? 'var(--accent-rose)' : 'var(--text-primary)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)'
            }}
          >
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 20px' }}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Assessment'}
          </button>
        </div>
      </div>

      {/* Main Exam Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question Pane */}
        <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
          {currentQ && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge badge-primary">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="badge badge-cyan">{currentQ.skillName}</span>
              </div>

              <h2 style={{ fontSize: '20px', lineHeight: 1.5, marginBottom: '28px' }}>
                {currentQ.questionText}
              </h2>

              {/* Options & Input by Question Type */}
              {currentQ.questionType === 'mcq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '36px' }}>
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => selectOption(currentQ.id, opt)}
                        style={{
                          padding: '16px 20px',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'hsla(265, 89%, 66%, 0.12)' : 'var(--bg-card)',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: 'var(--radius-full)',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            flexShrink: 0
                          }}
                        >
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: '15px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQ.questionType === 'short_answer' && (
                <div style={{ marginBottom: '36px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Type your answer or explanation below:
                  </label>
                  <textarea
                    rows={6}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                    placeholder="Write your explanation or reasoning here..."
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1.5px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {(answers[currentQ.id] || '').length} characters entered
                  </div>
                </div>
              )}

              {currentQ.questionType === 'coding' && (
                <div style={{ marginBottom: '36px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      Code Sandbox ({currentQ.skillName || 'Coding Challenge'})
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Write your solution below</span>
                  </div>
                  <textarea
                    rows={10}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                    placeholder={`// Implement your algorithmic solution\nfunction solution() {\n  // your code\n}`}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: '#090d18',
                      border: '1.5px solid var(--border-subtle)',
                      color: '#58a6ff',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      fontFamily: 'Consolas, Monaco, monospace',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {/* Navigation Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="btn btn-outline"
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {answeredCount} of {questions.length} answered
                </div>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    className="btn btn-primary"
                  >
                    Next <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ background: 'var(--cyan-gradient)', color: '#000', fontWeight: 700 }}
                  >
                    Finish & Evaluate <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Proctoring Sidebar (Camera Feed + Question Matrix) */}
        <div
          style={{
            width: '280px',
            background: '#0a0e1a',
            borderLeft: '1px solid var(--border-subtle)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Live Camera Sentinel */}
          <CameraProctorHUD onViolation={logViolation} violationsCount={violationsCount} />

          {/* Question Grid */}
          <div className="card" style={{ padding: '16px', background: '#090d18' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
              QUESTION NAVIGATOR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    style={{
                      padding: '10px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isAnswered ? 'hsla(152, 76%, 45%, 0.2)' : isCurrent ? 'hsla(265, 89%, 66%, 0.2)' : 'var(--bg-card)',
                      color: isAnswered ? 'var(--accent-emerald)' : isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
