import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  Maximize,
  Minimize,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save
} from 'lucide-react';
import './MockTestExamView.css';

interface QuestionItem {
  id: string;
  questionType: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'CODING';
  questionText: string;
  options: string[];
  marks: number;
  skillId: string;
  difficulty: string;
  orderIndex: number;
}

interface SavedAnswerState {
  selectedOption?: string;
  answerText?: string;
  isMarkedForReview?: boolean;
}

interface MockTestExamViewProps {
  testId: string;
  attemptId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const MockTestExamView: React.FC<MockTestExamViewProps> = ({ testId, attemptId, onNavigate }) => {
  const [testTitle, setTestTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SavedAnswerState>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(1200);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Security Proctoring State
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [violationModal, setViolationModal] = useState<{ show: boolean; title: string; message: string; count: number }>({
    show: false,
    title: '',
    message: '',
    count: 0
  });

  // Submit Confirmation Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // References for timer and debounced auto-save
  const timerRef = useRef<any>(null);
  const saveTimeoutRef = useRef<any>(null);

  // 1. Initial Load
  useEffect(() => {
    fetchAttemptState();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [testId, attemptId]);

  const fetchAttemptState = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/attempt/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        if (data.status === 'submitted') {
          onNavigate('mock-test-result', { testId, attemptId });
          return;
        }

        setTestTitle(data.testTitle);
        setQuestions(data.questions || []);
        setAnswers(data.savedAnswers || {});
        setTimeRemaining(data.timeRemainingSeconds || 1200);
        setSuspiciousCount(data.suspiciousEventCount || 0);

        // Start countdown timer
        startCountdown(data.timeRemainingSeconds || 1200);
      } else {
        alert(data.error || 'Failed to load exam state.');
        onNavigate('mock-tests');
      }
    } catch (e: any) {
      console.error('Error fetching attempt state:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown Timer
  const startCountdown = (initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    setTimeRemaining(initialSeconds);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeExpired = async () => {
    alert('Time limit expired! Your answers are being submitted automatically.');
    await submitExam(true);
  };

  // 3. Proctoring & Anti-Cheating Event Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('TAB_SWITCH', 'Student switched browser tabs or minimized window.');
      }
    };

    const handleWindowBlur = () => {
      logViolation('WINDOW_BLUR', 'Window focus lost during examination.');
    };

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && !loading && !isSubmitting) {
        logViolation('FULLSCREEN_EXIT', 'Student exited fullscreen exam mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [loading, isSubmitting]);

  const logViolation = async (activityType: string, reason: string) => {
    if (isSubmitting) return;

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/attempt/${attemptId}/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activityType, metadata: { reason } })
      });
      const data = await res.json();

      if (res.ok) {
        setSuspiciousCount(data.suspiciousEventCount);

        if (data.action === 'auto_submitted') {
          alert('Security Policy: 3 violations recorded. Your test has been submitted automatically.');
          submitExam(true);
        } else if (data.action === 'final_warning') {
          setViolationModal({
            show: true,
            title: '⚠️ Final Proctoring Warning',
            message: 'Navigating away from the active exam window one more time will trigger immediate auto-submission.',
            count: data.suspiciousEventCount
          });
        } else if (data.action === 'warning') {
          setViolationModal({
            show: true,
            title: 'Security Alert: Focus Lost',
            message: 'Tab switching and window minimization are recorded to protect exam integrity.',
            count: data.suspiciousEventCount
          });
        }
      }
    } catch (err) {
      console.warn('Violation logging failed:', err);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  // 4. Answer Handling & Auto-Saving
  const currentQ = questions[currentIndex];
  const currentAns = currentQ ? answers[currentQ.id] || {} : {};

  const handleSelectOption = (option: string) => {
    if (!currentQ) return;

    if (currentQ.questionType === 'MSQ') {
      // Toggle in JSON array
      let selectedList: string[] = [];
      try {
        selectedList = JSON.parse(currentAns.selectedOption || '[]');
      } catch {
        selectedList = currentAns.selectedOption ? [currentAns.selectedOption] : [];
      }

      if (selectedList.includes(option)) {
        selectedList = selectedList.filter((item) => item !== option);
      } else {
        selectedList.push(option);
      }

      const newAns = { ...currentAns, selectedOption: JSON.stringify(selectedList) };
      updateAnswerState(currentQ.id, newAns);
    } else {
      // Single choice
      const newAns = { ...currentAns, selectedOption: option, answerText: option };
      updateAnswerState(currentQ.id, newAns);
    }
  };

  const handleTextAnswerChange = (text: string) => {
    if (!currentQ) return;
    const newAns = { ...currentAns, answerText: text, selectedOption: text };
    updateAnswerState(currentQ.id, newAns, true);
  };

  const toggleMarkForReview = () => {
    if (!currentQ) return;
    const newAns = { ...currentAns, isMarkedForReview: !currentAns.isMarkedForReview };
    updateAnswerState(currentQ.id, newAns);
  };

  const updateAnswerState = (questionId: string, newAns: SavedAnswerState, debounce = false) => {
    setAnswers((prev) => ({ ...prev, [questionId]: newAns }));

    if (debounce) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveAnswerToServer(questionId, newAns);
      }, 600);
    } else {
      saveAnswerToServer(questionId, newAns);
    }
  };

  const saveAnswerToServer = async (questionId: string, ans: SavedAnswerState) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/student/mock-tests/${testId}/attempt/${attemptId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          questionId,
          selectedOption: ans.selectedOption,
          answerText: ans.answerText,
          isMarkedForReview: ans.isMarkedForReview
        })
      });
    } catch (e) {
      console.warn('Auto-save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Final Submission
  const submitExam = async (force = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch {}
        }
        onNavigate('mock-test-result', { testId, attemptId });
      } else {
        alert(data.error || 'Submission failed.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      alert('Error submitting test: ' + err.message);
      setIsSubmitting(false);
    }
  };

  // Format Timer mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
        Launching safe exam environment...
      </div>
    );
  }

  // Answered questions stats for modal
  const answeredCount = Object.values(answers).filter(
    (a) => (a.selectedOption && a.selectedOption.trim().length > 0) || (a.answerText && a.answerText.trim().length > 0)
  ).length;
  const reviewCount = Object.values(answers).filter((a) => a.isMarkedForReview).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="exam-view-container">
      {/* 1. Header */}
      <header className="exam-header">
        <div className="exam-header-left">
          <div className="exam-title-badge">
            <ShieldCheck size={20} color="var(--accent-purple)" />
            <span>{testTitle}</span>
          </div>
          <span className="exam-progress-text">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="exam-header-center">
          <div className={`exam-timer-chip ${timeRemaining <= 180 ? 'warning' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>

        <div className="exam-header-right">
          <div className={`security-indicator ${suspiciousCount > 0 ? 'violation' : ''}`}>
            {suspiciousCount > 0 ? (
              <>
                <ShieldAlert size={14} />
                <span>{suspiciousCount} Warning{suspiciousCount > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>Proctoring Active</span>
              </>
            )}
          </div>

          <div className="save-indicator">
            <Save size={14} color={isSaving ? 'var(--accent-amber)' : 'var(--accent-emerald)'} />
            <span>{isSaving ? 'Saving...' : 'Saved'}</span>
          </div>

          <button className="btn btn-outline btn-sm" onClick={toggleFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* 2. Main Body Split Layout */}
      <div className="exam-body">
        {/* Main Question Panel */}
        <main className="exam-main-panel">
          {currentQ && (
            <div className="question-card-wrapper">
              <div className="question-meta-row">
                <span className="q-badge-type">
                  {currentQ.questionType.replace('_', ' ')}
                </span>
                <span className="q-marks-tag">
                  {currentQ.marks} Marks
                </span>
              </div>

              {/* Question Text */}
              <div className="question-text-box">
                {currentQ.questionText}
              </div>

              {/* Multi-Format Answer Inputs */}
              {currentQ.questionType === 'MCQ' && (
                <div className="options-list">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = currentAns.selectedOption === opt;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(opt)}
                      >
                        <div className="option-bullet">{letter}</div>
                        <div className="option-text">{opt}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQ.questionType === 'MSQ' && (
                <div className="options-list">
                  {currentQ.options.map((opt, idx) => {
                    let selectedList: string[] = [];
                    try {
                      selectedList = JSON.parse(currentAns.selectedOption || '[]');
                    } catch {
                      selectedList = [];
                    }
                    const isSelected = selectedList.includes(opt);
                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <div
                        key={idx}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(opt)}
                      >
                        <div className="option-bullet">{isSelected ? '✓' : letter}</div>
                        <div className="option-text">{opt}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQ.questionType === 'TRUE_FALSE' && (
                <div className="tf-container">
                  {['True', 'False'].map((val) => {
                    const isSelected = currentAns.selectedOption === val;
                    return (
                      <div
                        key={val}
                        className={`tf-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(val)}
                      >
                        {val}
                      </div>
                    );
                  })}
                </div>
              )}

              {(currentQ.questionType === 'SHORT_ANSWER' || currentQ.questionType === 'CODING') && (
                <div className="short-answer-container">
                  <textarea
                    className="short-answer-textarea"
                    placeholder={
                      currentQ.questionType === 'CODING'
                        ? '# Write your Python code solution here...'
                        : 'Explain your reasoning clearly with key technical concepts...'
                    }
                    value={currentAns.answerText || ''}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                  />
                  <div className="short-answer-hints">
                    <span>Write clearly; this response will be evaluated by AI against key principles.</span>
                    <span>{(currentAns.answerText || '').length} characters</span>
                  </div>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="exam-controls-bar">
                <div className="exam-controls-left">
                  <button
                    className="btn btn-outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>

                  <button
                    className={`btn ${currentAns.isMarkedForReview ? 'btn-warning' : 'btn-outline'}`}
                    onClick={toggleMarkForReview}
                  >
                    <Bookmark size={16} />
                    {currentAns.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                <div className="exam-controls-right">
                  {currentIndex < questions.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                      onClick={() => setShowSubmitModal(true)}
                    >
                      <Send size={16} /> Submit Test
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Question Palette Sidebar */}
        <aside className="exam-palette-sidebar">
          <div className="palette-title">Question Palette</div>
          <div className="palette-grid">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = Boolean(
                (ans?.selectedOption && ans.selectedOption.trim().length > 0) ||
                (ans?.answerText && ans.answerText.trim().length > 0)
              );
              const isReview = Boolean(ans?.isMarkedForReview);
              const isCurrent = idx === currentIndex;

              let statusClass = '';
              if (isCurrent) statusClass = 'current';
              else if (isReview) statusClass = 'review';
              else if (isAnswered) statusClass = 'answered';

              return (
                <div
                  key={q.id}
                  className={`palette-item ${statusClass}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          <div className="palette-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'hsla(142, 76%, 45%, 0.4)', border: '1px solid var(--accent-emerald)' }} />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'hsla(38, 92%, 50%, 0.4)', border: '1px solid var(--accent-amber)' }} />
              <span>Marked for Review ({reviewCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }} />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'hsla(265, 89%, 66%, 0.4)', border: '1px solid var(--accent-purple)' }} />
              <span>Current Question</span>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', background: 'var(--primary-gradient)' }}
              onClick={() => setShowSubmitModal(true)}
            >
              Finish & Submit Test
            </button>
          </div>
        </aside>
      </div>

      {/* Violation Alert Modal */}
      {violationModal.show && (
        <div className="violation-modal-overlay">
          <div className="violation-modal">
            <AlertTriangle size={48} color="var(--accent-rose)" style={{ margin: '0 auto 12px auto' }} />
            <h3>{violationModal.title}</h3>
            <p>{violationModal.message}</p>
            <button
              className="btn btn-primary"
              onClick={() => setViolationModal((prev) => ({ ...prev, show: false }))}
            >
              I Understand, Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Final Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="violation-modal-overlay">
          <div className="violation-modal">
            <Send size={44} color="var(--accent-purple)" style={{ margin: '0 auto 12px auto' }} />
            <h3>Submit Mock Test?</h3>
            <p>
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {unansweredCount > 0 && (
                <span style={{ color: 'var(--accent-rose)', display: 'block', marginTop: '6px' }}>
                  ⚠️ {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} currently unanswered.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Return to Exam
              </button>
              <button
                className="btn btn-primary"
                onClick={() => submitExam(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Evaluating with AI...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
