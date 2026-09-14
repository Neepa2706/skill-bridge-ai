import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Compass,
  Award,
  BookOpen,
  Code2,
  Briefcase,
  Flame,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Clock,
  Layers,
  Play
} from 'lucide-react';

interface StudentDashboardViewProps {
  onNavigate: (view: string, extraData?: any) => void;
  onStartAssessment: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({ onNavigate, onStartAssessment }) => {
  const { user, profile } = useAuth();
  const { addToast } = useNotification();
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [roadmapSteps, setRoadmapSteps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState<boolean>(false);
  const [startingRecId, setStartingRecId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    fetchRoadmap();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        setRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error('Failed to load student dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoadmap = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/roadmap', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmapSteps(data.steps || []);
      }
    } catch (e) {}
  };

  const handleStartRecommendation = async (rec: any) => {
    setStartingRecId(rec.id);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/recommendations/${rec.id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        addToast('Course Started', `Enrolled in "${rec.course_title}". Happy learning!`, 'success');
        fetchDashboard();
        onNavigate('course-overview', { courseId: rec.course_id });
      } else {
        addToast('Error', data.error || 'Failed to start course.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message || 'Network error starting course.', 'error');
    } finally {
      setStartingRecId(null);
    }
  };

  const handleDeleteHistory = async () => {
    setIsDeletingHistory(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        addToast('History Deleted', 'Your assessment history and recommendations have been cleared.', 'info');
        setShowDeleteModal(false);
        fetchDashboard();
        fetchRoadmap();
      } else {
        addToast('Error', data.error || 'Failed to clear history.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to communicate with server.', 'error');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const hasCompletedAssessment = Boolean(dashboardData?.hasCompletedAssessment);
  const readinessScore = Math.round(dashboardData?.careerReadinessScore ?? profile?.career_readiness_score ?? 0);
  const gapAnalysis = dashboardData?.gapAnalysis;
  const continueLearning = dashboardData?.continueLearning;
  const streak = dashboardData?.codingStreak;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Welcome & Career Goal Hero */}
      <div
        className="card"
        style={{
          background: hasCompletedAssessment
            ? 'linear-gradient(135deg, hsla(265, 89%, 66%, 0.18) 0%, hsla(222, 47%, 11%, 0.95) 100%)'
            : 'linear-gradient(135deg, hsla(217, 91%, 60%, 0.14) 0%, hsla(222, 47%, 11%, 0.95) 100%)',
          border: '1px solid var(--border-bright)',
          padding: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-primary">SkillBridge Continuous Engine</span>
            <span className="badge badge-cyan">
              {profile?.target_role_id === 'role-software-dev' ? 'Software Track' : 'Career Track'}
            </span>
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            Welcome, {user?.name || 'Student'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
            {hasCompletedAssessment ? (
              <>
                Target Career: <strong>{profile?.career_interest || 'Software Developer'}</strong> at{' '}
                {profile?.college_name || 'Academic Institution'}. Follow your personalized recommendations and roadmap to close verified skill gaps.
              </>
            ) : (
              <>
                Target Career: <strong>{profile?.career_interest || 'Software Developer'}</strong>. Take your initial AI Baseline Assessment to establish your diagnostic scores across Programming, Logic, Problem Solving, and Communication.
              </>
            )}
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <button onClick={onStartAssessment} className="btn btn-primary" id="start-assessment-cta">
              <ShieldCheck size={16} /> {hasCompletedAssessment ? 'Retake AI Assessment' : 'Start AI Baseline Assessment'}
            </button>
            {hasCompletedAssessment && (
              <>
                <button onClick={() => onNavigate('skill-report')} className="btn btn-outline">
                  <Award size={16} /> View Full Report
                </button>
                <button onClick={() => onNavigate('skill-gaps')} className="btn btn-outline">
                  <TrendingDown size={16} /> View Skill Gaps
                </button>
              </>
            )}
          </div>
        </div>

        {/* Career Readiness Circular Visual */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--bg-glass)',
            padding: '24px 32px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            minWidth: '200px'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.06em' }}>
            CAREER READINESS
          </div>
          <div
            style={{
              fontSize: '44px',
              fontWeight: 900,
              color: hasCompletedAssessment ? 'var(--accent-emerald)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {readinessScore}%
          </div>
          <div
            style={{
              fontSize: '12px',
              color: hasCompletedAssessment ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontWeight: 600,
              marginTop: '4px'
            }}
          >
            {hasCompletedAssessment ? 'Evaluated by SkillBridge AI' : 'Unassessed Baseline'}
          </div>
          <div className="progress-bar-bg" style={{ width: '140px', height: '6px', marginTop: '12px' }}>
            <div
              className={`progress-bar-fill ${hasCompletedAssessment ? 'fill-emerald' : ''}`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Visual Career Roadmap Pipeline UI */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '18px' }}>Continuous Career Roadmap</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ASSESS → GAP → LEARN → PRACTICE → TEST → IMPROVE → OPPORTUNITY → INTERVIEW → PLACEMENT
          </span>
        </div>

        <div className="roadmap-container">
          {roadmapSteps.map((st, idx) => (
            <div key={st.id} className={`roadmap-step-card ${st.status}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    0{idx + 1}
                  </span>
                  <span
                    className={`badge ${st.status === 'completed' ? 'badge-success' : st.status === 'in_progress' ? 'badge-primary' : 'badge-outline'}`}
                    style={{ fontSize: '10px' }}
                  >
                    {st.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h3 style={{ fontSize: '14px', marginBottom: '6px' }}>{st.title}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {st.description}
                </p>
              </div>

              <button
                onClick={() => {
                  if (st.id === 'step-assess') onStartAssessment();
                  else onNavigate(st.route.replace(/^\//, ''));
                }}
                className="btn btn-outline btn-sm"
                style={{ marginTop: '16px', width: '100%', fontSize: '11px' }}
              >
                {st.actionLabel} <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Personalized Course Recommendations Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '18px' }}>Personalized Course Recommendations</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Targeted courses automatically mapped to your diagnosed skill gaps and weaknesses.
            </p>
          </div>
          {hasCompletedAssessment && recommendations.length > 0 && (
            <span className="badge badge-primary">{recommendations.length} Tailored Courses</span>
          )}
        </div>

        {recommendations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-cyan">{rec.skill_covered}</span>
                    <span className="badge badge-outline" style={{ textTransform: 'capitalize' }}>
                      {rec.difficulty || 'Intermediate'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                    {rec.course_title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                    {rec.reason}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> {rec.estimated_duration || '4 hours'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={13} /> {rec.learning_objective}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={() => handleStartRecommendation(rec)}
                    disabled={startingRecId === rec.id}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    <Play size={14} /> {startingRecId === rec.id ? 'Starting Course...' : 'Start Course'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
              {hasCompletedAssessment
                ? 'No skill gaps detected. You are on track with your target career role!'
                : 'Personalized course recommendations are locked. Complete your initial AI assessment to receive tailored courses for your exact skill gaps.'}
            </p>
            {!hasCompletedAssessment && (
              <button onClick={onStartAssessment} className="btn btn-outline btn-sm">
                <ShieldCheck size={14} /> Take Baseline Assessment to Unlock
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Continue Learning & Coding Streak Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Continue Learning Widget */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-primary">CONTINUE LEARNING</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {continueLearning ? 'Resumes Unfinished Lesson' : 'Learning Tracker'}
              </span>
            </div>
            {continueLearning ? (
              <>
                <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>{continueLearning.lesson_title}</h3>
                <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginBottom: '14px' }}>
                  Course: {continueLearning.course_title}
                </div>
                <div className="progress-bar-bg" style={{ height: '6px', marginBottom: '8px' }}>
                  <div className="progress-bar-fill fill-primary" style={{ width: `${continueLearning.progress_percentage || 50}%` }} />
                </div>
                <button
                  onClick={() => onNavigate('lesson-player', { courseId: continueLearning.course_id, lessonId: continueLearning.lesson_id })}
                  className="btn btn-primary"
                  style={{ marginTop: '16px', alignSelf: 'flex-start' }}
                >
                  <BookOpen size={16} /> Continue Lesson <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                You have no active courses in progress. Complete your assessment or explore recommendations above to begin.
              </div>
            )}
          </div>
        </div>

        {/* Coding Streak & Daily Challenge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-critical">🔥 CODING STREAK</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {streak?.currentStreak || 0} Days Active
              </span>
            </div>
            <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Daily Algorithmic Challenge</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Solve challenges daily to build your problem-solving streak and placement badges.
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(streak?.badges || []).map((b: any) => (
                <span key={b.id} className="badge badge-cyan" title={b.desc}>
                  {b.title}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('coding')}
            className="btn btn-cyan"
            style={{ marginTop: '16px', alignSelf: 'flex-start' }}
          >
            <Code2 size={16} /> Enter Coding Arena
          </button>
        </div>
      </div>

      {/* 5. Skill Gap Summary Matrix */}
      {gapAnalysis && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px' }}>Target Role Skill Gaps ({gapAnalysis.targetRoleTitle})</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Compared against verified industry placement standards.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge badge-critical">{gapAnalysis.criticalCount} Critical</span>
              <span className="badge badge-warning">{gapAnalysis.needsImprovementCount} Needs Improvement</span>
              <span className="badge badge-success">{gapAnalysis.goodCount} Good</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {gapAnalysis.gaps?.slice(0, 4).map((g: any) => (
              <div
                key={g.skillName}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${g.gapStatus === 'critical' ? 'hsla(350, 89%, 60%, 0.3)' : g.gapStatus === 'needs_improvement' ? 'hsla(38, 92%, 50%, 0.3)' : 'hsla(152, 76%, 45%, 0.3)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{g.skillName}</span>
                  <span
                    className={`badge ${g.gapStatus === 'critical' ? 'badge-critical' : g.gapStatus === 'needs_improvement' ? 'badge-warning' : 'badge-success'}`}
                    style={{ fontSize: '10px' }}
                  >
                    {g.gapStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Current: {g.currentLevel}%</span>
                  <span>Required: {g.requiredLevel}%</span>
                </div>

                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div
                    className={`progress-bar-fill ${g.gapStatus === 'critical' ? 'fill-rose' : g.gapStatus === 'needs_improvement' ? 'fill-amber' : 'fill-emerald'}`}
                    style={{ width: `${Math.min(100, g.currentLevel)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Account Privacy & History Management */}
      <div
        className="card"
        style={{
          border: '1px solid hsla(350, 89%, 60%, 0.2)',
          background: 'hsla(350, 89%, 60%, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Data Privacy & History Management
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Reset your assessment scores, test history, skill gap records, and recommendations back to baseline.
          </p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-outline btn-sm"
          style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}
          id="delete-history-btn"
        >
          <Trash2 size={14} /> Delete My History
        </button>
      </div>

      {/* Delete History Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              border: '1px solid var(--accent-rose)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'hsla(350, 89%, 60%, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-rose)'
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Reset Account History?</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Irreversible action</p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
              This will permanently wipe your assessment submissions, AI skill reports, diagnosed skill gaps, personalized recommendations, and active course progress. Your account readiness score will be reset to 0%.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingHistory}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHistory}
                disabled={isDeletingHistory}
                className="btn"
                style={{ background: 'var(--accent-rose)', color: '#fff' }}
                id="confirm-delete-history-btn"
              >
                {isDeletingHistory ? 'Deleting...' : 'Confirm & Wipe History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
