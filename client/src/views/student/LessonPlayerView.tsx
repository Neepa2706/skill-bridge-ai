import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Check,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  BookOpen,
  PlayCircle,
  FolderGit2,
  Code2,
  Send,
  HelpCircle,
  X,
  Clock,
  Layers,
  Award,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './LessonPlayerView.css';

interface LessonPlayerViewProps {
  courseId: string;
  lessonId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const LessonPlayerView: React.FC<LessonPlayerViewProps> = ({
  courseId,
  lessonId,
  onNavigate
}) => {
  const { addToast } = useNotification();
  const [lesson, setLesson] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Video State
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number>(18 * 60);

  // Reading Scroll / Progress
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [doubtQuery, setDoubtQuery] = useState<string>('');

  // Course Completion State
  const [completionData, setCompletionData] = useState<any | null>(null);

  // Interactive toggle states for interactive lesson types
  const [interactiveOpen, setInteractiveOpen] = useState<Record<number, boolean>>({ 0: true });

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLessonData(lessonId);
  }, [lessonId]);

  // Video simulated timer effect
  useEffect(() => {
    let interval: any = null;
    if (isPlayingVideo) {
      interval = setInterval(() => {
        setPlaybackSeconds(prev => {
          const next = Math.min(totalDurationSeconds, prev + 1);
          if (next >= totalDurationSeconds) {
            setIsPlayingVideo(false);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingVideo, totalDurationSeconds]);

  // Save progress periodically (debounced or on unmount / milestone)
  useEffect(() => {
    if (!lesson) return;

    if (playbackSeconds > 0 && playbackSeconds % 10 === 0) {
      saveProgressToServer({ playbackPosition: playbackSeconds });
    }
  }, [playbackSeconds]);

  const fetchLessonData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setAiResult(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/courses/${courseId}/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to load lesson content.');
      }

      const data = await res.json();
      setLesson(data);

      const durSec = (data.duration || 15) * 60;
      setTotalDurationSeconds(durSec);

      // Restore saved playback / reading progress
      if (data.progress?.playbackPosition) {
        setPlaybackSeconds(data.progress.playbackPosition);
        if (data.progress.playbackPosition > 10 && data.progress.playbackPosition < durSec - 10) {
          addToast(
            'Resumed Video Playback',
            `Continuing from ${formatTime(data.progress.playbackPosition)}`,
            'info'
          );
        }
      } else {
        setPlaybackSeconds(0);
      }

      if (data.progress?.readPosition) {
        setScrollProgress(Math.round(data.progress.readPosition * 100));
      } else {
        setScrollProgress(data.progress?.isCompleted ? 100 : 0);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgressToServer = async (payload: any) => {
    if (!lesson) return;
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/student/lessons/${lesson.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Progress auto-save failed:', e);
    }
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/lessons/${lesson.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLesson((prev: any) => ({
          ...prev,
          progress: { ...prev.progress, isCompleted: true, progressPercentage: 100 }
        }));

        if (data.isCourseCompleted) {
          setCompletionData(data);
          addToast('Course Completed! 🎉', `You have finished ${data.courseTitle}`, 'success');
        } else {
          addToast('Lesson Completed! ✓', 'Progress saved on server. Ready for next step.', 'success');
        }
      }
    } catch (e: any) {
      addToast('Error', 'Could not save completion status.', 'error');
    }
  };

  // Trigger AI Assistant Mode
  const handleAIAssistant = async (mode: string, query?: string) => {
    if (!lesson) return;
    setAiLoading(true);
    setAiResult(null);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/lessons/${lesson.id}/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode,
          userQuery: query || doubtQuery
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        if (mode === 'question') {
          setDoubtQuery('');
        }
      } else {
        throw new Error('AI Assistant request failed.');
      }
    } catch (err: any) {
      addToast('AI Assistant Notice', 'Could not generate response. Please try again.', 'warning');
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📖</div>
        <h3>Loading Lesson Canvas...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading learning material and restoring your saved progress.</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '36px' }}>
          <h3 style={{ color: 'var(--accent-rose, #f43f5e)', marginBottom: '10px' }}>We couldn't load this lesson.</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{error || 'Lesson data unavailable.'}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => fetchLessonData(lessonId)} className="btn btn-primary">Try Again</button>
            <button onClick={() => onNavigate('course-overview', { courseId })} className="btn btn-secondary">Back to Course</button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = lesson.progress?.isCompleted;
  const progressPct = isCompleted ? 100 : (lesson.progress?.progressPercentage || 0);

  const videoWatchedPct = totalDurationSeconds > 0 ? Math.round((playbackSeconds / totalDurationSeconds) * 100) : 0;

  return (
    <div className="lesson-player-layout">
      {/* Left Syllabus Navigation Sidebar */}
      <aside className="lesson-syllabus-sidebar">
        <div className="syllabus-sidebar-header">
          <button
            onClick={() => onNavigate('course-overview', { courseId })}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', gap: '6px', justifyContent: 'flex-start' }}
          >
            <ArrowLeft size={14} /> Back to Course Overview
          </button>
          <div className="syllabus-course-title">{lesson.courseTitle}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {lesson.syllabus?.map((mod: any) => (
            <div key={mod.id} className="sidebar-module-section">
              <div className="sidebar-module-title">
                {mod.title}
              </div>

              <div>
                {mod.lessons?.map((les: any) => {
                  const isActive = les.id === lesson.id;
                  return (
                    <div
                      key={les.id}
                      onClick={() => onNavigate('lesson-player', { courseId, lessonId: les.id })}
                      className={`sidebar-lesson-item ${isActive ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        {les.isCompleted ? (
                          <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: '15px', height: '15px', borderRadius: '50%', border: '1.5px solid var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                        )}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {les.title}
                        </span>
                      </div>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {les.duration}m
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Center Canvas */}
      <main className="lesson-canvas-container" ref={canvasRef}>
        {/* Top Reading Progress Bar */}
        <div className="reading-progress-track">
          <div
            className="reading-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="lesson-canvas-inner">
          {/* Breadcrumb & Navigation */}
          <div className="lesson-breadcrumbs">
            <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('course-overview', { courseId })}>
              {lesson.courseTitle}
            </span>
            <span>&gt;</span>
            <span>{lesson.moduleTitle}</span>
            <span>&gt;</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lesson.title}</span>
          </div>

          <h1 className="lesson-main-title">{lesson.title}</h1>

          {/* Metadata badges */}
          <div className="lesson-meta-bar">
            <span className={`lesson-type-badge badge-${lesson.contentType?.toLowerCase()}`}>
              {lesson.contentType} Lesson
            </span>
            <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {lesson.duration} Mins
            </span>
            {lesson.relatedSkills?.map((sk: string, i: number) => (
              <span key={i} className="badge badge-cyan">
                {sk}
              </span>
            ))}
            {isCompleted && (
              <span className="badge badge-success" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> ✓ Completed
              </span>
            )}
          </div>

          {/* Section 7: Learning Objectives ("What You'll Learn") */}
          {lesson.learningObjectives?.length > 0 && (
            <div className="objectives-card">
              <div className="objectives-header">
                <Sparkles size={16} color="var(--primary)" /> What You'll Learn
              </div>
              <div className="objectives-list">
                {lesson.learningObjectives.map((obj: string, idx: number) => (
                  <div key={idx} className="objective-item">
                    <CheckCircle2 size={16} />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Lesson Types Specialized Viewers */}
          {lesson.contentType === 'video' && (
            <div className="custom-video-player">
              <div className="video-screen">
                {/* Embed or Simulated Player */}
                {lesson.videoUrl && lesson.videoUrl.includes('youtube') ? (
                  <iframe
                    src={lesson.videoUrl.replace('watch?v=', 'embed/')}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div
                      className="video-overlay-play"
                      onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                    >
                      {isPlayingVideo ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
                      SkillBridge HD Stream • {formatTime(playbackSeconds)} / {formatTime(totalDurationSeconds)}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Controls Tray */}
              <div className="video-control-tray">
                <button
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '4px' }}
                >
                  {isPlayingVideo ? <Pause size={14} /> : <Play size={14} />}
                  {isPlayingVideo ? 'Pause' : 'Play'}
                </button>

                <div
                  className="video-progress-bar"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = clickX / rect.width;
                    const newSec = Math.round(pct * totalDurationSeconds);
                    setPlaybackSeconds(newSec);
                    saveProgressToServer({ playbackPosition: newSec });
                  }}
                >
                  <div
                    className="video-progress-current"
                    style={{ width: `${videoWatchedPct}%` }}
                  />
                </div>

                <div className="video-timestamp">
                  <strong>{formatTime(playbackSeconds)}</strong> / {formatTime(totalDurationSeconds)} ({videoWatchedPct}% watched)
                </div>

                <button
                  onClick={() => {
                    setPlaybackSeconds(0);
                    saveProgressToServer({ playbackPosition: 0 });
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Rewind to start"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Lesson Type: Expandable / Interactive Examples */}
          {lesson.contentType === 'interactive' && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ec4899', marginBottom: '10px' }}>
                ⚡ Interactive Exploration Sandbox
              </div>
              <div className="card" style={{ padding: '20px', background: 'rgba(236, 72, 153, 0.04)', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Click below to inspect real-time evaluation rules and edge-case behavior:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { title: 'Arithmetic & Precedence Invariant', code: 'result = (10 + 5) * 2 ** 3 // 4\nprint(result) # Output: 30', note: 'Exponents (**) take precedence over multiplication and floor division.' },
                    { title: 'Identity (is) vs Equality (==) Invariant', code: 'list_a = [10, 20]\nlist_b = [10, 20]\nprint(list_a == list_b) # True (Same values)\nprint(list_a is list_b) # False (Distinct memory references)', note: 'Equality checks contents; identity checks memory addresses.' },
                    { title: 'Short-Circuit Evaluation Demo', code: 'def trigger():\n    print("Evaluated!")\n    return True\n\n# Short circuit suppresses trigger():\nval = False and trigger() # trigger() is never called!', note: 'Boolean AND terminates immediately on first falsy operand.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        onClick={() => setInteractiveOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                      >
                        <span>{item.title}</span>
                        <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{interactiveOpen[idx] ? 'Hide' : 'Inspect'}</span>
                      </div>
                      {interactiveOpen[idx] && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: '#090d16' }}>
                          <pre style={{ margin: '0 0 8px 0', fontSize: '13px' }}>{item.code}</pre>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>💡 {item.note}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Project Lesson Type: Instructions & Deliverables */}
          {lesson.contentType === 'project' && (
            <div style={{ marginBottom: '28px' }}>
              <div className="card" style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>
                  <FolderGit2 size={20} /> Project Implementation Blueprint
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                  Follow the step-by-step instructions below to build and verify your capstone command-line project.
                  Full automated code evaluation and mentor reviews will unlock in Step 8.
                </p>
              </div>
            </div>
          )}

          {/* Core Lesson Body Content (Headings, Markdown, Text) */}
          <div className="lesson-body-content">
            {lesson.content.split('\n\n').map((block: string, bIdx: number) => {
              if (block.startsWith('### ')) {
                return <h3 key={bIdx}>{block.replace('### ', '')}</h3>;
              }
              if (block.startsWith('#### ')) {
                return <h4 key={bIdx}>{block.replace('#### ', '')}</h4>;
              }
              if (block.startsWith('```')) {
                const lines = block.split('\n');
                const code = lines.slice(1, -1).join('\n');
                return (
                  <pre key={bIdx}>
                    <code>{code}</code>
                  </pre>
                );
              }
              if (block.startsWith('- ')) {
                const items = block.split('\n');
                return (
                  <ul key={bIdx}>
                    {items.map((it, i) => (
                      <li key={i}>{it.replace('- ', '')}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={bIdx}>{block}</p>;
            })}
          </div>

          {/* Section 7: Key Points */}
          {lesson.keyPoints?.length > 0 && (
            <div className="key-points-box">
              <div className="key-points-title">
                <CheckCircle2 size={16} /> Key Takeaways for Placement Readiness
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {lesson.keyPoints.map((kp: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>{kp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 8: Explain with AI 🤖 */}
          <div className="ai-explanation-bar">
            <div className="ai-bar-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <Sparkles size={18} color="var(--primary)" /> Explain with AI 🤖
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Grounded exclusively in this lesson's content
              </span>
            </div>

            <div className="ai-buttons-row">
              <button
                onClick={() => handleAIAssistant('simplify')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Explain Simply 💡
              </button>
              <button
                onClick={() => handleAIAssistant('example')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Give an Example 💻
              </button>
              <button
                onClick={() => handleAIAssistant('beginner')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Explain for a Beginner 🚀
              </button>
              <button
                onClick={() => handleAIAssistant('real_life')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Real-Life Example 🌍
              </button>
              <button
                onClick={() => handleAIAssistant('summarize')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Summarize 📝
              </button>
              <button
                onClick={() => handleAIAssistant('difficult_part')}
                disabled={aiLoading}
                className="ai-quick-btn"
              >
                Difficult Part 🎯
              </button>
            </div>

            {/* AI Assistant Output Card */}
            {aiLoading && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                <div style={{ fontSize: '13px' }}>SkillBridge AI is synthesizing grounded explanation...</div>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div className="ai-response-card">
                <div className="ai-response-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>
                    <Sparkles size={16} /> {aiResult.title}
                  </div>
                  <button
                    onClick={() => setAiResult(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="ai-response-body">
                  {aiResult.explanation.split('\n\n').map((block: string, idx: number) => {
                    if (block.startsWith('### ')) {
                      return <h3 key={idx}>{block.replace('### ', '')}</h3>;
                    }
                    if (block.startsWith('```')) {
                      const lines = block.split('\n');
                      const code = lines.slice(1, -1).join('\n');
                      return (
                        <pre key={idx}>
                          <code>{code}</code>
                        </pre>
                      );
                    }
                    if (block.startsWith('- ')) {
                      return (
                        <ul key={idx}>
                          {block.split('\n').map((it, i) => (
                            <li key={i}>{it.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx}>{block}</p>;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 9: AI Doubt Assistant ("Ask AI About This Lesson") */}
          <div className="ai-doubt-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
              <HelpCircle size={18} color="var(--accent-cyan, #38bdf8)" /> Ask AI About This Lesson
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
              Ask questions about loops, variables, operators, or difficult concepts in {lesson.title}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (doubtQuery.trim()) {
                  handleAIAssistant('question', doubtQuery.trim());
                }
              }}
              className="ai-doubt-input-row"
            >
              <input
                type="text"
                value={doubtQuery}
                onChange={(e) => setDoubtQuery(e.target.value)}
                placeholder="e.g. I don't understand how Python memory references work..."
                className="ai-doubt-input"
              />
              <button
                type="submit"
                disabled={aiLoading || !doubtQuery.trim()}
                className="btn btn-primary"
                style={{ gap: '6px' }}
              >
                <Send size={15} /> Ask AI
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Section 10: Fixed Bottom Lesson Control Bar */}
      <footer className="lesson-control-bar">
        <div className="control-bar-left">
          {lesson.navigation?.previousLesson ? (
            <button
              onClick={() => onNavigate('lesson-player', { courseId, lessonId: lesson.navigation.previousLesson.id })}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <ArrowLeft size={14} /> Previous Lesson
            </button>
          ) : (
            <button
              onClick={() => onNavigate('course-overview', { courseId })}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <ArrowLeft size={14} /> Course Overview
            </button>
          )}
        </div>

        <div className="control-bar-center">
          <div className="control-lesson-counter">
            Lesson {lesson.navigation?.currentLessonIndex} of {lesson.navigation?.totalLessonsInCourse}
          </div>
          <div className="control-progress-pill">
            {progressPct}% Course Milestone Complete
          </div>
        </div>

        <div className="control-bar-right">
          <button
            onClick={handleMarkComplete}
            className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
            style={{ gap: '6px' }}
          >
            {isCompleted ? (
              <>
                <Check size={16} color="#10b981" /> ✓ Completed
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Mark as Complete
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('mock-tests')}
            className="btn btn-outline btn-sm"
            style={{ gap: '6px', color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
            title="Take AI Mock Test for this lesson"
          >
            <ShieldCheck size={16} /> Take Mock Test
          </button>

          {lesson.navigation?.nextLesson && (
            <button
              onClick={() => onNavigate('lesson-player', { courseId, lessonId: lesson.navigation.nextLesson.id })}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              Next Lesson <ArrowRight size={14} />
            </button>
          )}
        </div>
      </footer>

      {/* Section 16: Course Completed Celebration Modal */}
      {completionData && (
        <div className="modal-overlay">
          <div className="completion-modal">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
              Course Completed! 🎉
            </h2>
            <div className="badge badge-success" style={{ fontSize: '13px', padding: '6px 14px', marginBottom: '16px' }}>
              100% Complete
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
              Congratulations on completing all modules and lessons in <strong>{completionData.courseTitle}</strong>!
            </p>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Skills Covered:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {completionData.skillsCovered?.map((sk: string, i: number) => (
                  <span key={i} className="skill-tag">{sk}</span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
                💡 Note: Course completion is recorded as verified learning evidence. Official skill level elevation unlocks through upcoming assessments, projects, and evaluations.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setCompletionData(null);
                  onNavigate('mock-tests');
                }}
                className="btn btn-primary"
                style={{ background: 'var(--primary-gradient)' }}
              >
                <ShieldCheck size={16} /> Attend Course Mock Tests
              </button>
              <button
                onClick={() => {
                  setCompletionData(null);
                  onNavigate('course-overview', { courseId });
                }}
                className="btn btn-outline"
              >
                Course Overview
              </button>
              <button
                onClick={() => {
                  setCompletionData(null);
                  onNavigate('learning');
                }}
                className="btn btn-secondary"
              >
                Learning Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
