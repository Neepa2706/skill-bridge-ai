import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Compass,
  Award,
  Layers
} from 'lucide-react';
import './LearningDashboardView.css';

interface MyCoursesViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const MyCoursesView: React.FC<MyCoursesViewProps> = ({ onNavigate }) => {
  const [coursesData, setCoursesData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'inProgress' | 'completed' | 'recommended'>('inProgress');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoursesData(data);
      }
    } catch (e) {
      console.error('Failed to load courses catalog:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>📚</div>
        <h3>Loading Course Portfolio...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Compiling active tracks, completed milestones, and roadmap recommendations.</p>
      </div>
    );
  }

  const inProgress = coursesData?.inProgress || [];
  const completed = coursesData?.completed || [];
  const recommended = coursesData?.recommended || [];

  return (
    <div className="learning-dashboard-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            onClick={() => onNavigate('learning')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px', marginBottom: '10px' }}
          >
            <ArrowLeft size={14} /> Back to Learning Dashboard
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            My Courses & Curriculum Tracks
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Structured learning directly aligned with your career goal and identified skill gaps.
          </p>
        </div>

        <button
          onClick={() => onNavigate('learning-roadmap')}
          className="btn btn-secondary"
          style={{ gap: '6px' }}
        >
          <Compass size={16} /> View Career Roadmap
        </button>
      </div>

      {/* Tabs */}
      <div className="courses-tab-pills" style={{ width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('inProgress')}
          className={`course-tab-btn ${activeTab === 'inProgress' ? 'active' : ''}`}
        >
          In Progress ({inProgress.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`course-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          Completed ({completed.length})
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`course-tab-btn ${activeTab === 'recommended' ? 'active' : ''}`}
        >
          Recommended by Roadmap ({recommended.length})
        </button>
      </div>

      {/* Course Cards Grid */}
      {activeTab === 'inProgress' && (
        <div>
          {inProgress.length > 0 ? (
            <div className="courses-cards-grid">
              {inProgress.map((c: any) => (
                <div key={c.id} className="course-dashboard-card">
                  <div
                    className="course-card-image"
                    style={{ backgroundImage: `url(${c.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&q=80'})` }}
                  >
                    <span className="badge badge-primary course-card-badge">
                      {c.difficulty}
                    </span>
                    <span className="badge badge-cyan course-card-badge">
                      {c.estimatedHours}h
                    </span>
                  </div>

                  <div className="course-card-body">
                    <h3 className="course-card-title">{c.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      {c.description}
                    </p>

                    {c.currentLessonTitle && (
                      <div className="course-card-current-lesson">
                        <BookOpen size={14} color="var(--primary)" />
                        <span>Next: {c.currentLessonTitle}</span>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progress</span>
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
                        onClick={() => onNavigate('course-overview', { courseId: c.id })}
                        className="btn btn-primary btn-sm"
                        style={{ gap: '4px' }}
                      >
                        Continue <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-courses-state">
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📖</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No active courses in progress</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                Open your recommended courses to start learning lessons.
              </p>
              <button onClick={() => setActiveTab('recommended')} className="btn btn-primary">
                View Recommended Courses
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div>
          {completed.length > 0 ? (
            <div className="courses-cards-grid">
              {completed.map((c: any) => (
                <div key={c.id} className="course-dashboard-card">
                  <div
                    className="course-card-image"
                    style={{ backgroundImage: `url(${c.thumbnail})` }}
                  >
                    <span className="badge badge-success course-card-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> 100% Completed
                    </span>
                  </div>

                  <div className="course-card-body">
                    <h3 className="course-card-title">{c.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      {c.description}
                    </p>

                    <div className="course-card-footer">
                      <span style={{ fontSize: '12px', color: 'var(--accent-emerald, #10b981)', fontWeight: 600 }}>
                        All {c.totalLessons} lessons completed ✓
                      </span>
                      <button
                        onClick={() => onNavigate('course-overview', { courseId: c.id })}
                        className="btn btn-secondary btn-sm"
                      >
                        Review Material
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-courses-state">
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No courses completed yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Complete all lessons in a course to earn learning completion verification.
              </p>
              <button onClick={() => setActiveTab('inProgress')} className="btn btn-secondary">
                Back to In-Progress Courses
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommended' && (
        <div>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            💡 Recommendations are derived exclusively from your Step 6 AI Personalized Roadmap and verified diagnostic skill gaps.
          </div>

          <div className="courses-cards-grid">
            {recommended.map((c: any) => (
              <div key={c.id} className="course-dashboard-card">
                <div
                  className="course-card-image"
                  style={{ backgroundImage: `url(${c.thumbnail})` }}
                >
                  <span className="badge badge-cyan course-card-badge">
                    <Sparkles size={11} /> Priority Roadmap Pick
                  </span>
                  <span className="badge badge-primary course-card-badge">
                    {c.difficulty}
                  </span>
                </div>

                <div className="course-card-body">
                  <h3 className="course-card-title">{c.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                    {c.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {c.skillsCovered?.map((sk: string, i: number) => (
                      <span key={i} className="skill-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {sk}
                      </span>
                    ))}
                  </div>

                  <div className="course-card-footer">
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {c.estimatedDuration}
                    </span>
                    <button
                      onClick={() => onNavigate('course-overview', { courseId: c.id })}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '4px' }}
                    >
                      Start Course <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
