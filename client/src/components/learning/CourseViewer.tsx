import React, { useState, useEffect } from 'react';
import { CourseItem, LessonItem } from '../../types';
import { BookOpen, CheckCircle, Play, FileText, ArrowRight, ShieldCheck, Clock, Award } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const CourseViewer: React.FC<{ initialCourseId?: string }> = ({ initialCourseId }) => {
  const { addToast } = useNotification();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [quizData, setQuizData] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [practiceInput, setPracticeInput] = useState<string>('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/learning/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        const toSelect = initialCourseId ? data.find((c: any) => c.id === initialCourseId) || data[0] : data[0];
        if (toSelect) loadCourseDetails(toSelect.id);
      }
    } catch (e) {
      console.error('Failed to load courses:', e);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/learning/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCourse(data);
        // Default to first lesson
        const firstLesson = data.modules?.[0]?.lessons?.[0];
        if (firstLesson) {
          loadLesson(firstLesson.id);
        }
      }
    } catch (e) {
      console.error('Failed to load course details:', e);
    }
  };

  const loadLesson = async (lessonId: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/learning/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLesson(data);
        setQuizData(null);
        setQuizResult(null);
        setPracticeInput('');
      }
    } catch (e) {
      console.error('Failed to load lesson:', e);
    }
  };

  const markContentProgress = async () => {
    if (!activeLesson) return;
    try {
      const token = localStorage.getItem('sb_token');
      await fetch(`/api/learning/lessons/${activeLesson.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentCompleted: true, timeSpentSeconds: 120 })
      });
      addToast('Lesson Progress Saved', 'Reading completed. Now solve the practice challenge or take the test.', 'success');
      loadLesson(activeLesson.id);
    } catch (e) {}
  };

  const generateQuiz = async () => {
    if (!activeLesson) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/learning/lessons/${activeLesson.id}/test/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizData(data);
        setQuizAnswers({});
        setQuizResult(null);
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleQuizSubmit = async () => {
    if (!quizData || !activeLesson || isSubmittingQuiz) return;
    setIsSubmittingQuiz(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/learning/lessons/${activeLesson.id}/test/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: quizAnswers,
          referenceKey: quizData._referenceKey
        })
      });

      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        if (data.passed) {
          addToast('Test Passed!', data.message, 'success');
          // Refresh course to reflect progress
          if (selectedCourse) loadCourseDetails(selectedCourse.id);
        } else {
          addToast('Test Score: ' + data.score + '%', data.message, 'warning');
        }
      }
    } catch (e: any) {
      addToast('Submission Error', e.message, 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Course Carousel / Catalog */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
        {courses.map(c => {
          const isSelected = selectedCourse?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => loadCourseDetails(c.id)}
              className="card card-hover"
              style={{
                flex: '0 0 340px',
                padding: '16px',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'hsla(265, 89%, 66%, 0.1)' : 'var(--bg-card)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className={`badge ${c.tier === 'required' ? 'badge-critical' : 'badge-cyan'}`} style={{ textTransform: 'uppercase' }}>
                  {c.tier} COURSE
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.estimated_hours}h</span>
              </div>

              <h3 style={{ fontSize: '15px', lineHeight: 1.4, marginBottom: '8px' }}>{c.title}</h3>

              <div style={{ marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Completion</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.progressPercentage}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '5px' }}>
                  <div className="progress-bar-fill fill-primary" style={{ width: `${c.progressPercentage}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Course Content Pane */}
      {selectedCourse && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Syllabus Navigation */}
          <div className="card" style={{ padding: '20px', maxHeight: '780px', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '14px' }}>{selectedCourse.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedCourse.modules?.map((m: any) => (
                <div key={m.id}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                    {m.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {m.lessons?.map((l: any) => {
                      const isCurrent = activeLesson?.id === l.id;
                      const isDone = l.is_completed === 1;
                      return (
                        <div
                          key={l.id}
                          onClick={() => loadLesson(l.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: isCurrent ? 'hsla(265, 89%, 66%, 0.15)' : 'var(--bg-surface)',
                            border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          <span style={{ fontWeight: isCurrent ? 700 : 500 }}>{l.title}</span>
                          {isDone ? (
                            <CheckCircle size={15} color="var(--accent-emerald)" />
                          ) : (
                            <Clock size={14} color="var(--text-muted)" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson Content & Test Runner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeLesson ? (
              <div className="card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className="badge badge-primary">{activeLesson.course_title}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {activeLesson.progress?.test_passed === 1 && (
                      <span className="badge badge-success">
                        <CheckCircle size={12} /> Test Passed
                      </span>
                    )}
                    <span className="badge badge-cyan">Lesson {activeLesson.order_index}</span>
                  </div>
                </div>

                <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>{activeLesson.title}</h1>

                {/* Content Render */}
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '15px',
                    lineHeight: 1.8,
                    marginBottom: '32px',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {activeLesson.content}
                </div>

                {/* Practice Exercise */}
                {activeLesson.practice_prompt && (
                  <div
                    style={{
                      padding: '20px',
                      background: 'hsla(188, 95%, 48%, 0.08)',
                      border: '1px solid hsla(188, 95%, 48%, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '28px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Award size={18} color="var(--accent-cyan)" />
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Interactive Practice Challenge
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      {activeLesson.practice_prompt}
                    </p>

                    <textarea
                      rows={3}
                      value={practiceInput}
                      onChange={e => setPracticeInput(e.target.value)}
                      placeholder="Write your explanation or code solution..."
                      className="input-field"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '10px' }}
                    />

                    <button onClick={markContentProgress} className="btn btn-cyan btn-sm">
                      Validate & Save Practice
                    </button>
                  </div>
                )}

                {/* Lesson Actions: AI Mock Test & Next Lesson */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={generateQuiz} className="btn btn-primary">
                    <ShieldCheck size={16} /> Take AI Lesson Mock Test
                  </button>

                  {activeLesson.nextLessonId && (
                    <button
                      onClick={() => loadLesson(activeLesson.nextLessonId)}
                      className="btn btn-outline"
                    >
                      Next: {activeLesson.nextLessonTitle} <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                {/* AI Lesson Mock Test Runner */}
                {quizData && (
                  <div
                    className="card"
                    style={{
                      marginTop: '28px',
                      background: '#0d1322',
                      border: '1.5px solid var(--primary)',
                      padding: '24px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px' }}>AI Lesson Mock Test</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Passing score: {quizData.passingScore}% • Unlocks next curriculum milestone
                        </p>
                      </div>
                      <span className="badge badge-primary">{quizData.totalQuestions} Questions</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {quizData.questions?.map((q: any, qIdx: number) => (
                        <div key={q.id} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                            {qIdx + 1}. {q.questionText}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isChecked = quizAnswers[q.id] === opt;
                              return (
                                <label
                                  key={optIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isChecked ? 'hsla(265, 89%, 66%, 0.15)' : 'var(--bg-surface)',
                                    border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={isChecked}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          onClick={handleQuizSubmit}
                          disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < quizData.totalQuestions}
                          className="btn btn-primary"
                        >
                          {isSubmittingQuiz ? 'Grading Test...' : 'Submit & Grade Test'}
                        </button>
                      </div>

                      {quizResult && (
                        <div
                          style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            background: quizResult.passed ? 'hsla(152, 76%, 45%, 0.12)' : 'hsla(350, 89%, 60%, 0.12)',
                            border: `1.5px solid ${quizResult.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ color: quizResult.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '16px' }}>
                              {quizResult.passed ? 'Passed!' : 'Needs Review'} — Score: {quizResult.score}%
                            </h4>
                            <span className="badge badge-primary">{quizResult.correctCount}/{quizResult.totalQuestions} Correct</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{quizResult.message}</p>

                          {quizResult.unlockedNextLessonId && (
                            <button
                              onClick={() => loadLesson(quizResult.unlockedNextLessonId)}
                              className="btn btn-cyan btn-sm"
                              style={{ marginTop: '12px' }}
                            >
                              Continue to Next Lesson: {quizResult.unlockedNextLessonTitle} <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a lesson from the course modules to begin learning.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
