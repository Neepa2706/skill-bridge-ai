import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  PlayCircle,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  Award,
  Layers,
  Compass,
  ShieldCheck
} from 'lucide-react';
import './LearningDashboardView.css';

interface LearningDashboardViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const LearningDashboardView: React.FC<LearningDashboardViewProps> = ({ onNavigate }) => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [mockStats, setMockStats] = useState<{ total: number; passed: number; avgScore: number }>({ total: 0, passed: 0, avgScore: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [courseFilter, setCourseFilter] = useState<'inProgress' | 'completed' | 'paused'>('inProgress');

  useEffect(() => {
    fetchLearningDashboard();
  }, []);

  const fetchLearningDashboard = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const [dashRes, testsRes] = await Promise.all([
        fetch('/api/student/learning', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/student/mock-tests', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboardData(data);
      }

      if (testsRes.ok) {
        const tests = await testsRes.json();
        const passed = tests.filter((t: any) => t.status === 'passed').length;
        const scores = tests.filter((t: any) => t.bestScore > 0).map((t: any) => t.bestScore);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
        setMockStats({ total: tests.length, passed, avgScore: avg });
      }
    } catch (e) {
      console.error('Failed to load learning dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>✨</div>
        <h3>Loading Your Learning Dashboard...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Compiling courses, resume checkpoints, and weekly analytics.</p>
      </div>
    );
  }

  const continueItem = dashboardData?.continueLearning;
  const inProgressCourses = dashboardData?.myCourses?.inProgress || [];
  const completedCourses = dashboardData?.myCourses?.completed || [];
  const pausedCourses = dashboardData?.myCourses?.paused || [];

  const displayCourses = courseFilter === 'completed'
    ? completedCourses
    : courseFilter === 'paused'
    ? pausedCourses
    : inProgressCourses;

  return (
    <div className="learning-dashboard-container">
      {/* 1. Hero Section: Continue Where You Left Off */}
      {continueItem ? (
        <div className="continue-learning-hero">
          <div className="hero-content-left">
            <div className="hero-eyebrow">
              <Sparkles size={14} /> Continue Where You Left Off
            </div>
            <div className="hero-course-title">
              {continueItem.courseTitle} • {continueItem.courseDifficulty}
            </div>
            <h2 className="hero-lesson-title">
              {continueItem.lessonTitle}
            </h2>

            <div className="hero-progress-wrapper">
              <div className="hero-progress-labels">
                <span style={{ color: 'var(--text-muted)' }}>Lesson Progress</span>
                <span style={{ color: 'var(--primary)' }}>{continueItem.progressPercentage}% complete</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '8px' }}>
                <div
                  className="progress-bar-fill fill-primary"
                  style={{ width: `${continueItem.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('lesson-player', { courseId: continueItem.courseId, lessonId: continueItem.lessonId })}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '220px', gap: '8px', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)' }}
          >
            Continue Learning →
          </button>
        </div>
      ) : (
        <div className="empty-courses-state">
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗺️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Your learning journey starts here.</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
            Your personalized roadmap contains courses based on your career goal and identified skill gaps.
          </p>
          <button onClick={() => onNavigate('learning-roadmap')} className="btn btn-primary" style={{ gap: '6px' }}>
            <Compass size={16} /> View My Roadmap
          </button>
        </div>
      )}

      {/* 2. Key Metrics Grid: Progress, Activity, Streak */}
      <div className="learning-metrics-grid">
        <div className="metric-card-learning">
          <div className="metric-card-header">
            <span className="metric-card-title">Overall Progress</span>
            <Award size={18} color="var(--primary)" />
          </div>
          <div className="metric-card-value">
            {dashboardData?.overallProgress || 0}%
          </div>
          <div className="metric-card-subtitle">
            Across all enrolled foundational and specialization tracks
          </div>
        </div>

        <div className="metric-card-learning">
          <div className="metric-card-header">
            <span className="metric-card-title">Today's Progress</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="metric-card-value">
            {dashboardData?.learningActivity?.today?.lessonsCompleted || 0}
          </div>
          <div className="metric-card-subtitle">
            Lessons completed today ({dashboardData?.learningActivity?.today?.timeSpentMinutes || 0}m active)
          </div>
        </div>

        <div className="metric-card-learning">
          <div className="metric-card-header">
            <span className="metric-card-title">This Week</span>
            <Calendar size={18} color="#38bdf8" />
          </div>
          <div className="metric-card-value">
            {dashboardData?.learningActivity?.thisWeek?.hoursLearning || 0} hrs
          </div>
          <div className="metric-card-subtitle">
            Across {dashboardData?.learningActivity?.thisWeek?.activeDays || 1} active learning days
          </div>
        </div>

        <div className="metric-card-learning" style={{ cursor: 'pointer' }} onClick={() => onNavigate('mock-tests')}>
          <div className="metric-card-header">
            <span className="metric-card-title">AI Mock Tests</span>
            <ShieldCheck size={18} color="var(--accent-purple)" />
          </div>
          <div className="metric-card-value" style={{ color: 'var(--accent-purple)' }}>
            {mockStats.passed} / {mockStats.total} Passed
          </div>
          <div className="metric-card-subtitle">
            Avg Score: {mockStats.avgScore}% • Click to attend mock tests →
          </div>
        </div>
      </div>

      {/* 3. Skills Being Developed */}
      {dashboardData?.skillsBeingDeveloped?.length > 0 && (
        <div>
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Skills Being Developed</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Integrated directly with verified skill diagnostic
            </span>
          </div>

          <div className="skills-dev-grid">
            {dashboardData.skillsBeingDeveloped.map((sk: any) => (
              <div key={sk.id} className="skill-dev-card">
                <div className="skill-dev-name">
                  <span>{sk.name}</span>
                  <span className="badge badge-primary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {sk.current_level}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Verified Benchmark</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(sk.verified_score)}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div
                    className="progress-bar-fill fill-cyan"
                    style={{ width: `${Math.min(100, sk.verified_score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. My Courses Section with Tabs */}
      <div>
        <div className="dashboard-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 className="dashboard-section-title">My Courses</h3>
            <div className="courses-tab-pills">
              <button
                onClick={() => setCourseFilter('inProgress')}
                className={`course-tab-btn ${courseFilter === 'inProgress' ? 'active' : ''}`}
              >
                In Progress ({inProgressCourses.length})
              </button>
              <button
                onClick={() => setCourseFilter('completed')}
                className={`course-tab-btn ${courseFilter === 'completed' ? 'active' : ''}`}
              >
                Completed ({completedCourses.length})
              </button>
              {pausedCourses.length > 0 && (
                <button
                  onClick={() => setCourseFilter('paused')}
                  className={`course-tab-btn ${courseFilter === 'paused' ? 'active' : ''}`}
                >
                  Paused ({pausedCourses.length})
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('courses')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            Explore Catalog <ArrowRight size={14} />
          </button>
        </div>

        {displayCourses.length > 0 ? (
          <div className="courses-cards-grid">
            {displayCourses.map((c: any) => (
              <div key={c.courseId} className="course-dashboard-card">
                <div
                  className="course-card-image"
                  style={{ backgroundImage: `url(${c.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&q=80'})` }}
                >
                  <span className="badge badge-primary course-card-badge">
                    {c.difficulty}
                  </span>
                  {c.status === 'completed' && (
                    <span className="badge badge-success course-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  )}
                </div>

                <div className="course-card-body">
                  <h4 className="course-card-title">{c.title}</h4>

                  {c.currentLessonTitle && c.status !== 'completed' && (
                    <div className="course-card-current-lesson">
                      <BookOpen size={14} color="var(--primary)" />
                      <span>{c.currentLessonTitle}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                      <span style={{ color: 'var(--primary)' }}>{c.progressPercentage}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '6px' }}>
                      <div
                        className="progress-bar-fill fill-primary"
                        style={{ width: `${c.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="course-card-footer">
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.completedLessons} / {c.totalLessons} lessons
                    </span>
                    <button
                      onClick={() => onNavigate('course-overview', { courseId: c.courseId })}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '4px' }}
                    >
                      {c.status === 'completed' ? 'Review' : 'Continue'} <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-courses-state">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              No {courseFilter === 'completed' ? 'completed' : 'paused'} courses in your portfolio yet.
            </p>
            <button onClick={() => onNavigate('courses')} className="btn btn-secondary btn-sm">
              Browse Recommended Courses
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
