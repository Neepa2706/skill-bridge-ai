import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Sparkles,
  FolderGit2,
  Code2,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Award,
  Globe,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import './CourseOverviewView.css';

interface CourseOverviewViewProps {
  courseId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const CourseOverviewView: React.FC<CourseOverviewViewProps> = ({ courseId, onNavigate }) => {
  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load course details.');
      }
      const data = await res.json();
      setCourse(data);

      // Expand all modules by default for easy scanning
      const expandedState: Record<string, boolean> = {};
      data.modules?.forEach((m: any) => {
        expandedState[m.id] = true;
      });
      setExpandedModules(expandedState);
    } catch (err: any) {
      setError(err.message || 'Error loading course details.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleStartOrContinue = () => {
    if (!course) return;
    const targetLessonId = course.continueTarget?.lessonId || course.modules?.[0]?.lessons?.[0]?.id;
    if (targetLessonId) {
      onNavigate('lesson-player', { courseId: course.id, lessonId: targetLessonId });
    }
  };

  const handleLessonClick = (lessonId: string) => {
    onNavigate('lesson-player', { courseId: course.id, lessonId });
  };

  const renderContentTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <PlayCircle size={16} className="badge-video" />;
      case 'interactive':
        return <Sparkles size={16} className="badge-interactive" />;
      case 'project':
        return <FolderGit2 size={16} className="badge-project" />;
      case 'coding':
        return <Code2 size={16} className="badge-coding" />;
      default:
        return <BookOpen size={16} className="badge-article" />;
    }
  };

  if (isLoading) {
    return (
      <div className="course-overview-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>✨</div>
        <h3>Loading Course Architecture...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Retrieving modules, lessons, and real-time progress.</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="course-overview-container">
        <button onClick={() => onNavigate('learning')} className="btn btn-secondary" style={{ width: 'fit-content', gap: '8px' }}>
          <ArrowLeft size={16} /> Back to Learning Platform
        </button>
        <div className="card" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--accent-rose, #f43f5e)', marginBottom: '12px' }}>We couldn't load this course.</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Course data unavailable.'}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={fetchCourseDetails} className="btn btn-primary">Try Again</button>
            <button onClick={() => onNavigate('learning')} className="btn btn-secondary">Back to Courses</button>
          </div>
        </div>
      </div>
    );
  }

  const isEnrolled = course.isEnrolled;
  const progressPct = course.progressPercentage || 0;
  const isComplete = course.status === 'completed' || progressPct === 100;

  return (
    <div className="course-overview-container">
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => onNavigate('learning-roadmap')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Learning Roadmap
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>{course.title}</span>
      </div>

      {/* Course Hero Header */}
      <div className="course-overview-header">
        <div className="course-meta-top">
          <span className="badge badge-primary">
            {course.difficulty} → Foundation
          </span>
          <span className="badge badge-cyan">
            {course.provider || 'SkillBridge Academy'}
          </span>
          {isComplete && (
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Course Completed 🎉
            </span>
          )}
        </div>

        <h1 className="course-title">{course.title}</h1>
        <p className="course-description">{course.description}</p>

        {/* Skills Covered */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
            Skills Covered:
          </div>
          <div className="course-skills-list">
            {course.skillsCovered?.map((sk: string, idx: number) => (
              <span key={idx} className="skill-tag">
                {sk}
              </span>
            ))}
          </div>
        </div>

        {/* Key Course Attributes Grid */}
        <div className="course-details-grid">
          <div className="course-detail-item">
            <Clock size={18} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Duration</div>
              <div className="course-detail-value">{course.estimatedDuration}</div>
            </div>
          </div>

          <div className="course-detail-item">
            <Globe size={18} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Language</div>
              <div className="course-detail-value">{course.language}</div>
            </div>
          </div>

          <div className="course-detail-item">
            <Award size={18} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Modules</div>
              <div className="course-detail-value">{course.modules?.length} Modules ({course.totalLessons} Lessons)</div>
            </div>
          </div>

          <div className="course-detail-item">
            <UserCheck size={18} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Provider</div>
              <div className="course-detail-value">{course.provider}</div>
            </div>
          </div>
        </div>

        {/* Action / Progress Card */}
        <div className="course-action-card">
          <div className="course-progress-info">
            <div className="progress-label-row">
              <span>Overall Course Progress</span>
              <span className="progress-percentage-text">{progressPct}% Complete</span>
            </div>
            <div className="progress-bar-bg" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill fill-primary"
                style={{ width: `${progressPct}%`, transition: 'width 0.4s ease' }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {course.completedLessons} of {course.totalLessons} lessons completed
            </div>
          </div>

          <button
            onClick={handleStartOrContinue}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '220px', gap: '8px', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)' }}
          >
            {isComplete ? (
              <>Review Course Content <ArrowRight size={18} /></>
            ) : progressPct > 0 ? (
              <>Continue Learning →</>
            ) : (
              <>Start Course <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </div>

      {/* Course Content / Expandable Syllabus */}
      <div className="course-syllabus-section">
        <div className="syllabus-heading">
          <span>Course Content</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {course.modules?.length} Modules • {course.totalLessons} Lessons
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {course.modules?.map((module: any, mIdx: number) => {
            const isExpanded = !!expandedModules[module.id];
            const isModuleComplete = module.isCompleted;

            return (
              <div key={module.id} className="module-card">
                <div className="module-header" onClick={() => toggleModule(module.id)}>
                  <div className="module-title-group">
                    {isExpanded ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                    <div>
                      <div className="module-title-text">{module.title}</div>
                      {module.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {module.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="module-stats">
                    {isModuleComplete ? (
                      <span className="module-badge-completed">
                        {module.completedLessons} / {module.totalLessons} lessons completed <CheckCircle2 size={16} />
                      </span>
                    ) : (
                      <span>
                        {module.completedLessons} / {module.totalLessons} completed ({module.progressPercentage}%)
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>• {module.estimatedDuration}</span>
                  </div>
                </div>

                {/* Lessons inside module */}
                {isExpanded && (
                  <div className="lesson-list">
                    {module.lessons?.map((lesson: any, lIdx: number) => {
                      const isTarget = course.continueTarget?.lessonId === lesson.id && !lesson.isCompleted;

                      return (
                        <div
                          key={lesson.id}
                          className="lesson-row"
                          onClick={() => handleLessonClick(lesson.id)}
                          style={{
                            background: isTarget ? 'rgba(124, 58, 237, 0.08)' : undefined,
                            borderLeft: isTarget ? '3px solid var(--primary)' : '3px solid transparent'
                          }}
                        >
                          <div className="lesson-left">
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>
                              {lIdx + 1}.
                            </span>
                            {renderContentTypeIcon(lesson.contentType)}
                            <span>{lesson.title}</span>
                            <span className={`lesson-type-badge badge-${lesson.contentType?.toLowerCase()}`}>
                              {lesson.contentType}
                            </span>
                            {isTarget && (
                              <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Resume Here
                              </span>
                            )}
                          </div>

                          <div className="lesson-right">
                            <span>{lesson.duration} min</span>
                            {lesson.isCompleted ? (
                              <span className="lesson-status-completed">
                                <CheckCircle2 size={16} /> Completed
                              </span>
                            ) : lesson.progressPercentage > 0 ? (
                              <span className="lesson-status-inprogress">
                                {lesson.progressPercentage}% in progress
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Not Started</span>
                            )}
                            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
