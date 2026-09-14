import React from 'react';
import { Compass, BookOpen, Sparkles, ArrowLeft, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface LearningRoadmapPlaceholderViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const LearningRoadmapPlaceholderView: React.FC<LearningRoadmapPlaceholderViewProps> = ({ onNavigate }) => {
  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        onClick={() => onNavigate ? onNavigate('report') : (window.location.href = '/student/skill-report')}
        className="btn btn-secondary btn-sm"
        style={{ width: 'fit-content', gap: '6px' }}
      >
        <ArrowLeft size={16} /> Back to Skill Report
      </button>

      {/* Roadmap Header */}
      <div
        className="card"
        style={{
          padding: '36px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(124, 58, 237, 0.08) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: 'var(--radius-lg, 16px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
          <Sparkles size={16} /> AI Personalized Learning Roadmap
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Your Recommended Learning Curriculum
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '680px', margin: 0 }}>
          Based on your diagnostic baseline assessment, SkillBridge AI has mapped the following priority foundational track to bridge your critical skill gaps and prepare you for placements.
        </p>

        {/* Priority Recommended Course Banner */}
        <div
          style={{
            marginTop: '28px',
            background: 'var(--bg-surface)',
            border: '1.5px solid rgba(124, 58, 237, 0.35)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-primary">Beginner → Foundation</span>
              <span className="badge badge-cyan">Priority 1 Track</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Python Programming Fundamentals
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {['Python', 'Programming Fundamentals', 'Problem Solving'].map((sk, idx) => (
                <span key={idx} className="badge badge-secondary" style={{ fontSize: '11px' }}>
                  {sk}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> 18 Hours
              </span>
              <span>• 3 Modules (8 Lessons)</span>
              <span style={{ color: 'var(--accent-emerald, #10b981)', fontWeight: 600 }}>
                • 35% Progress
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
            <button
              onClick={() => onNavigate && onNavigate('course-overview', { courseId: 'crs-py-201' })}
              className="btn btn-primary"
              style={{ gap: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 700 }}
            >
              Start Course <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate && onNavigate('learning')}
              className="btn btn-secondary btn-sm"
              style={{ textAlign: 'center' }}
            >
              Learning Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
