import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  X
} from 'lucide-react';
import './MockTestListView.css';

interface MockTestItem {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingPercentage: number;
  maxAttempts: number;
  attemptCount: number;
  attemptsRemaining: number;
  status: 'not_attempted' | 'passed' | 'failed' | 'in_progress';
  bestScore: number;
  latestScore: number;
  latestAttemptId: string | null;
  inProgressAttemptId: string | null;
}

interface MockTestListViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const MockTestListView: React.FC<MockTestListViewProps> = ({ onNavigate }) => {
  const [tests, setTests] = useState<MockTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'not_attempted' | 'in_progress' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMockTests();
  }, []);

  const fetchMockTests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/mock-tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (err) {
      console.error('Failed to load mock tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate metrics
  const totalCount = tests.length;
  const passedCount = tests.filter(t => t.status === 'passed').length;
  const attemptedCount = tests.filter(t => t.attemptCount > 0).length;
  const scores = tests.filter(t => t.bestScore > 0).map(t => t.bestScore);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="mock-tests-page">
      {/* Header */}
      <div className="mock-tests-header">
        <h1>
          <ShieldCheck size={32} color="var(--accent-purple)" />
          Lesson-wise AI Mock Tests
        </h1>
        <p className="mock-tests-subtitle">
          Verify your real-world coding and technical comprehension after every lesson.
          Each assessment is grounded in lesson objectives, evaluated server-side, and tracked for career placement readiness.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="mock-metrics-row">
        <div className="metric-card">
          <div className="metric-icon-wrap purple">
            <BookOpen size={24} />
          </div>
          <div className="metric-info">
            <h4>{totalCount}</h4>
            <p>Curated Lesson Tests</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap green">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-info">
            <h4>{passedCount}</h4>
            <p>Passed Assessments</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap cyan">
            <Award size={24} />
          </div>
          <div className="metric-info">
            <h4>{avgScore}%</h4>
            <p>Average Proficiency</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap amber">
            <Sparkles size={24} />
          </div>
          <div className="metric-info">
            <h4>{attemptedCount}</h4>
            <p>Active Revisions</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="mock-tests-toolbar">
        <div className="filter-pills">
          <button
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Tests ({tests.length})
          </button>
          <button
            className={`filter-pill ${filter === 'not_attempted' ? 'active' : ''}`}
            onClick={() => setFilter('not_attempted')}
          >
            Not Attempted ({tests.filter(t => t.status === 'not_attempted').length})
          </button>
          <button
            className={`filter-pill ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({tests.filter(t => t.status === 'in_progress').length})
          </button>
          <button
            className={`filter-pill ${filter === 'passed' ? 'active' : ''}`}
            onClick={() => setFilter('passed')}
          >
            Passed ({passedCount})
          </button>
          <button
            className={`filter-pill ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            Needs Practice ({tests.filter(t => t.status === 'failed').length})
          </button>
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by lesson or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      {/* Test Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          Loading mock tests and progress history...
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ShieldCheck size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>No mock tests found</h3>
          <p style={{ fontSize: '13px' }}>Try switching filters or search keywords.</p>
        </div>
      ) : (
        <div className="mock-tests-grid">
          {filteredTests.map((test) => {
            const hasAttemptsRemaining = test.attemptsRemaining > 0;

            return (
              <div key={test.id} className="mock-test-card">
                <div>
                  {/* Badges */}
                  <div className="card-top-badges">
                    <span className="course-context-tag">
                      {test.courseTitle}
                    </span>

                    {test.status === 'passed' && (
                      <span className="status-badge passed">
                        <Check size={14} /> Passed ({test.bestScore}%)
                      </span>
                    )}
                    {test.status === 'failed' && (
                      <span className="status-badge failed">
                        <X size={14} /> Needs Revision ({test.latestScore}%)
                      </span>
                    )}
                    {test.status === 'in_progress' && (
                      <span className="status-badge in_progress">
                        <Clock size={14} /> In Progress
                      </span>
                    )}
                    {test.status === 'not_attempted' && (
                      <span className="status-badge not_attempted">
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Title & Lesson context */}
                  <h3>{test.title}</h3>
                  <div className="lesson-subheading">
                    <BookOpen size={14} />
                    <span>{test.lessonTitle}</span>
                  </div>

                  <p className="test-card-desc">{test.description}</p>
                </div>

                <div>
                  {/* Meta Specs */}
                  <div className="test-specs-meta">
                    <div className="test-spec-item">
                      <Clock size={14} />
                      <span>{test.durationMinutes} Mins</span>
                    </div>
                    <div className="test-spec-item">
                      <Award size={14} />
                      <span>{test.totalQuestions} Questions ({test.totalMarks} Marks)</span>
                    </div>
                    <div className="test-spec-item">
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: test.difficulty === 'easy' ? 'var(--accent-emerald)' : test.difficulty === 'medium' ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                        {test.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Score & Attempts info */}
                  <div className="score-preview-row">
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Attempts: </span>
                      <span style={{ fontWeight: 600 }}>{test.attemptCount} / {test.maxAttempts}</span>
                    </div>
                    {test.bestScore > 0 && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Best Score: </span>
                        <span className={`score-highlight ${test.bestScore >= test.passingPercentage ? 'pass' : 'fail'}`}>
                          {test.bestScore}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions">
                    {test.status === 'in_progress' && test.inProgressAttemptId ? (
                      <button
                        className="btn btn-warning"
                        onClick={() => onNavigate('mock-test-attempt', { testId: test.id, attemptId: test.inProgressAttemptId })}
                      >
                        Resume Attempt <ArrowRight size={16} />
                      </button>
                    ) : test.status === 'passed' && test.latestAttemptId ? (
                      <>
                        <button
                          className="btn btn-outline"
                          onClick={() => onNavigate('mock-test-review', { testId: test.id, attemptId: test.latestAttemptId })}
                        >
                          Review Answers
                        </button>
                        {hasAttemptsRemaining && (
                          <button
                            className="btn btn-primary"
                            onClick={() => onNavigate('mock-test-instructions', { testId: test.id })}
                            title="Improve your score"
                          >
                            <RotateCcw size={14} /> Retry
                          </button>
                        )}
                      </>
                    ) : test.status === 'failed' && test.latestAttemptId ? (
                      <>
                        <button
                          className="btn btn-outline"
                          onClick={() => onNavigate('mock-test-review', { testId: test.id, attemptId: test.latestAttemptId })}
                        >
                          Review Mistakes
                        </button>
                        {hasAttemptsRemaining && (
                          <button
                            className="btn btn-primary"
                            onClick={() => onNavigate('mock-test-instructions', { testId: test.id })}
                          >
                            <RotateCcw size={14} /> Retry Test
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => onNavigate('mock-test-instructions', { testId: test.id })}
                      >
                        Start Mock Test <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
