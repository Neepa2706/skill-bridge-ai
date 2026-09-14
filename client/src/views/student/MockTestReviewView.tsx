import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Sparkles,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import './MockTestReviewView.css';

interface ReviewQuestion {
  questionId: string;
  questionType: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  skillId: string;
  skillName: string;
  difficulty: string;
  studentAnswer: string | null;
  earnedMarks: number;
  evaluationStatus: 'correct' | 'incorrect' | 'partially_correct' | 'unanswered';
  aiFeedback: string | null;
  isMarkedForReview: boolean;
}

interface ReviewData {
  attemptId: string;
  testTitle: string;
  lessonTitle: string;
  percentage: number;
  passed: boolean;
  totalMarks: number;
  earnedMarks: number;
  questions: ReviewQuestion[];
}

interface MockTestReviewViewProps {
  testId: string;
  attemptId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const MockTestReviewView: React.FC<MockTestReviewViewProps> = ({ testId, attemptId, onNavigate }) => {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'review'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReview();
  }, [testId, attemptId]);

  const fetchReview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/mock-tests/${testId}/review/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Failed to load test review.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="review-page-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading questions and detailed explanations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="review-page-container">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--accent-rose)" style={{ margin: '0 auto 12px auto' }} />
          <h3>Unable to Load Review</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error}</p>
          <button className="btn btn-outline" onClick={() => onNavigate('mock-tests')}>
            Back to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  const filteredQuestions = data.questions.filter((q) => {
    if (filter === 'incorrect') return q.evaluationStatus === 'incorrect';
    if (filter === 'review') return q.isMarkedForReview;
    return true;
  });

  const incorrectCount = data.questions.filter((q) => q.evaluationStatus === 'incorrect').length;
  const reviewCount = data.questions.filter((q) => q.isMarkedForReview).length;

  const formatDisplayAnswer = (raw: string | null) => {
    if (!raw) return '<Unanswered>';
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {}
    return raw;
  };

  return (
    <div className="review-page-container">
      {/* 1. Header */}
      <div className="review-header">
        <div className="review-header-left">
          <h1>
            <FileText size={26} color="var(--accent-purple)" />
            {data.testTitle} — Answer Review
          </h1>
          <div className="review-subtitle">
            Lesson: <strong>{data.lessonTitle}</strong> • Final Score:{' '}
            <strong style={{ color: data.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
              {data.percentage}% ({data.earnedMarks} / {data.totalMarks} Marks)
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={() => onNavigate('mock-test-result', { testId, attemptId })}
          >
            <ArrowLeft size={16} /> Back to Scorecard
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('mock-tests')}
          >
            All Mock Tests
          </button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="review-filters-bar">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('all')}
          >
            All Questions ({data.questions.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'incorrect' ? 'btn-warning' : 'btn-outline'}`}
            onClick={() => setFilter('incorrect')}
          >
            Incorrect Only ({incorrectCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'review' ? 'btn-warning' : 'btn-outline'}`}
            onClick={() => setFilter('review')}
          >
            Marked for Review ({reviewCount})
          </button>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing {filteredQuestions.length} of {data.questions.length} questions
        </div>
      </div>

      {/* 3. Questions List */}
      <div>
        {filteredQuestions.map((q, idx) => {
          const isCorrect = q.evaluationStatus === 'correct';
          const isPartiallyCorrect = q.evaluationStatus === 'partially_correct';

          return (
            <div
              key={q.questionId}
              className={`review-question-card ${
                isCorrect ? 'correct' : isPartiallyCorrect ? 'partially_correct' : 'incorrect'
              }`}
            >
              {/* Question Header */}
              <div className="q-review-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="q-review-num">Question {idx + 1}</span>
                  <span className="badge badge-primary">{q.questionType}</span>
                  <span className="badge badge-cyan">{q.skillName}</span>
                  {q.isMarkedForReview && (
                    <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Bookmark size={12} /> Marked for Review
                    </span>
                  )}
                </div>

                <div className="q-review-marks">
                  Marks: {q.earnedMarks} / {q.marks}
                </div>
              </div>

              {/* Question Text */}
              <div className="q-review-text">{q.questionText}</div>

              {/* Answer Comparison */}
              <div className="answer-comparison-grid">
                {/* Student's Answer */}
                <div className={`answer-box student ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="answer-box-title" style={{ color: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    Your Answer:
                  </div>
                  <div className="answer-box-content">
                    {formatDisplayAnswer(q.studentAnswer)}
                  </div>
                </div>

                {/* Correct Solution */}
                <div className="answer-box solution">
                  <div className="answer-box-title" style={{ color: 'var(--accent-cyan)' }}>
                    <CheckCircle2 size={14} />
                    Verified Solution:
                  </div>
                  <div className="answer-box-content">
                    {formatDisplayAnswer(q.correctAnswer)}
                  </div>
                </div>
              </div>

              {/* Detailed Explanation */}
              <div className="explanation-box">
                <div className="explanation-title">
                  <Sparkles size={14} />
                  Concept Explanation & Pedagogical Rationale
                </div>
                <div className="explanation-content">{q.explanation}</div>

                {q.aiFeedback && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid hsla(265, 89%, 66%, 0.15)', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <strong>AI Feedback on your answer:</strong> {q.aiFeedback}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
