import React, { useState, useEffect } from 'react';
import {
  Mic,
  PenTool,
  MessageSquare,
  Award,
  Flame,
  Globe,
  BookOpen,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  Target,
  TrendingUp,
  Headphones,
  BookMarked,
  HelpCircle,
  PlayCircle
} from 'lucide-react';
import './CommunicationDashboardView.css';

interface CommunicationDashboardViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const CommunicationDashboardView: React.FC<CommunicationDashboardViewProps> = ({ onNavigate }) => {
  const [activeLangCode, setActiveLangCode] = useState<'en' | 'ja' | 'de'>('en');
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchDashboard(activeLangCode);
  }, [activeLangCode]);

  const fetchDashboard = async (lang: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/dashboard?lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDashboardData(json);
      }
    } catch (err) {
      console.error('Failed to load communication dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="comm-dashboard-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading Communication Studio...</p>
      </div>
    );
  }

  const activeLang = dashboardData?.activeLanguage;
  const track = activeLang?.track;
  const streak = dashboardData?.streak;
  const recommendedLesson = dashboardData?.recommendedLesson;

  // Sub-skills list with icons & colors
  const subSkillsConfig = [
    { key: 'speaking', label: 'Speaking & Articulation', icon: Mic, color: '#38bdf8' },
    { key: 'listening', label: 'Listening Comprehension', icon: Headphones, color: '#818cf8' },
    { key: 'reading', label: 'Technical Reading & RFCs', icon: BookMarked, color: '#34d399' },
    { key: 'writing', label: 'Professional Writing', icon: PenTool, color: '#f472b6' },
    { key: 'grammar', label: 'Grammar & Structure', icon: CheckCircle2, color: '#fbbf24' },
    { key: 'vocabulary', label: 'Tech & Action Vocabulary', icon: Sparkles, color: '#a78bfa' },
    { key: 'pronunciation', label: 'Pronunciation Clarity', icon: Award, color: '#2dd4bf' },
    { key: 'conversation', label: 'Spontaneous Dialogue', icon: MessageSquare, color: '#fb923c' }
  ];

  const subSkills = track?.subSkills || {};

  return (
    <div className="comm-dashboard-container">
      {/* 1. Hero Card with Language Switcher */}
      <div className="comm-hero-card">
        <div className="comm-hero-content">
          <div className="comm-hero-badge">
            <Sparkles size={14} /> Career Fluency & Placement Readiness
          </div>
          <h1 className="comm-hero-title">Communication & Language Learning System</h1>
          <p className="comm-hero-subtitle">
            Master professional articulation in English, Japanese, and German. Practice AI-driven speaking, writing incident reports, and simulated technical interviews tailored for global placements.
          </p>

          <div className="comm-lang-switcher">
            {dashboardData?.languages?.map((lang: any) => (
              <button
                key={lang.code}
                className={`comm-lang-btn ${activeLangCode === lang.code ? 'active' : ''}`}
                onClick={() => setActiveLangCode(lang.code)}
              >
                <span className="comm-lang-flag">{lang.flagEmoji}</span>
                <span>{lang.name} ({lang.nativeName})</span>
                {lang.currentLevel && (
                  <span style={{ fontSize: '11px', opacity: 0.8, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                    L{lang.currentLevel}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Level & Mastery Summary Card */}
        <div className="comm-level-widget">
          <span className="comm-level-badge">{track?.levelName || 'Level 1 — Beginner'}</span>
          <div className="comm-level-score">{track?.overallScore || 0}%</div>
          <div className="comm-level-label">Overall Fluency Readiness</div>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('communication-assessment', { languageCode: activeLangCode })}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Take Assessment
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="comm-stats-grid">
        <div className="comm-stat-card">
          <div className="comm-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="comm-stat-val">{track?.currentLevel ? `Level ${track.currentLevel}` : 'Level 1'}</div>
            <div className="comm-stat-lbl">SkillBridge Mastery Tier</div>
          </div>
        </div>

        <div className="comm-stat-card">
          <div className="comm-stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
            <Flame size={24} />
          </div>
          <div>
            <div className="comm-stat-val">{streak?.currentStreak || 0} Days</div>
            <div className="comm-stat-lbl">Practice Streak Consistency</div>
          </div>
        </div>

        <div className="comm-stat-card">
          <div className="comm-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="comm-stat-val">{track?.completedLessonsCount || 0} Completed</div>
            <div className="comm-stat-lbl">Curated Career Lessons</div>
          </div>
        </div>

        <div className="comm-stat-card">
          <div className="comm-stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="comm-stat-val">{track?.practiceSessionsCount || 0} Sessions</div>
            <div className="comm-stat-lbl">Total Speaking & Writing Labs</div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Skills 8-Dimension Matrix */}
      <div className="comm-skills-section">
        <div className="comm-section-header">
          <div>
            <h2 className="comm-section-title">
              <BarChart3Icon size={22} color="#a855f7" /> 8-Dimension Communication Matrix ({activeLang?.name})
            </h2>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '4px' }}>
              Comprehensive radar of technical vocabulary, grammar precision, listening comprehension, and interview fluency.
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('communication-practice-hub', { languageCode: activeLangCode })}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Practice Drills Hub <ArrowRight size={14} />
          </button>
        </div>

        <div className="comm-subskills-grid">
          {subSkillsConfig.map(s => {
            const score = subSkills[s.key] !== undefined ? Math.round(subSkills[s.key]) : 0;
            const Icon = s.icon;
            return (
              <div key={s.key} className="comm-subskill-card">
                <div className="comm-subskill-top">
                  <div className="comm-subskill-name">
                    <Icon size={16} color={s.color} /> {s.label}
                  </div>
                  <div className="comm-subskill-score" style={{ color: s.color }}>
                    {score}%
                  </div>
                </div>
                <div className="comm-subskill-bar-bg">
                  <div
                    className="comm-subskill-bar-fill"
                    style={{ width: `${Math.max(5, score)}%`, background: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Learning Modules & Launchers */}
      <div>
        <div className="comm-section-header">
          <h2 className="comm-section-title">
            <Target size={22} color="#38bdf8" /> AI Practice Studios & Assessment
          </h2>
        </div>

        <div className="comm-actions-grid">
          {/* Speaking Studio */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                🎙️
              </div>
              <div>
                <div className="comm-action-title">Speaking Practice Studio</div>
                <span className="comm-action-tag" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                  6-Dimension Speech Rubric
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Record voice responses for technical elevator pitches and project explanations. Evaluates relevance (25%), grammar (20%), vocabulary (15%), fluency (20%), pronunciation (10%), and completeness (10%).
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-speaking', { languageCode: activeLangCode })}
            >
              <Mic size={16} /> Open Speaking Studio <ArrowRight size={14} />
            </button>
          </div>

          {/* Business Writing Lab */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#f472b6' }}>
                ✍️
              </div>
              <div>
                <div className="comm-action-title">Business Writing Lab</div>
                <span className="comm-action-tag" style={{ background: 'rgba(244, 114, 182, 0.2)', color: '#f472b6' }}>
                  Side-by-Side Rewrite
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Draft incident escalations, architecture RFC summaries, and pull request notes. Receive instant grammar coaching and an improved professional rewrite following the BLUF principle.
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-writing', { languageCode: activeLangCode })}
            >
              <PenTool size={16} /> Open Writing Lab <ArrowRight size={14} />
            </button>
          </div>

          {/* AI Conversation Trainer */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                💬
              </div>
              <div>
                <div className="comm-action-title">AI Conversation Trainer</div>
                <span className="comm-action-tag" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                  5 Dynamic Modes
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Engage in multi-turn dialogues with adaptive follow-ups in Daily, Professional Standup, Placement Interview, Group Discussion, and Tech Presentation modes.
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-conversation', { languageCode: activeLangCode })}
            >
              <MessageSquare size={16} /> Start Conversation <ArrowRight size={14} />
            </button>
          </div>

          {/* Placement Mock Interview Test */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                🏆
              </div>
              <div>
                <div className="comm-action-title">Placement Mock Test</div>
                <span className="comm-action-tag" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                  Formal Assessment
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Attend a full conversation-based mock test simulating an international technical interview. Evaluates spontaneous problem solving, verifies skill evidence, and awards milestone certifications.
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-mock-test', { languageCode: activeLangCode })}
            >
              <Award size={16} /> Start Mock Interview <ArrowRight size={14} />
            </button>
          </div>

          {/* Diagnostic Baseline Assessment */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                🧠
              </div>
              <div>
                <div className="comm-action-title">Diagnostic Assessment</div>
                <span className="comm-action-tag" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>
                  12 Adaptive Questions
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Benchmark your grammar, vocabulary, technical reading, and listening retention. Generates a personalized diagnostic report and assigns your SkillBridge level.
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-assessment', { languageCode: activeLangCode })}
            >
              <HelpCircle size={16} /> Launch Assessment <ArrowRight size={14} />
            </button>
          </div>

          {/* Practice Hub */}
          <div className="comm-action-card">
            <div className="comm-action-header">
              <div className="comm-action-icon" style={{ background: 'rgba(129, 140, 248, 0.15)', color: '#818cf8' }}>
                📚
              </div>
              <div>
                <div className="comm-action-title">Practice Drills Hub</div>
                <span className="comm-action-tag" style={{ background: 'rgba(129, 140, 248, 0.2)', color: '#818cf8' }}>
                  Targeted Micro-Drills
                </span>
              </div>
            </div>
            <p className="comm-action-desc">
              Access targeted drills: Grammar Rules (Past vs Present Perfect, V2 rule), Placement Vocabulary Flashcards, Architectural RFC Reading Labs, and Standup Audio Simulations.
            </p>
            <button
              className="comm-action-btn"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff' }}
              onClick={() => onNavigate('communication-practice-hub', { languageCode: activeLangCode })}
            >
              <BookOpen size={16} /> Open Practice Hub <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Streak & Consistency Tracker */}
      <div className="comm-streak-card">
        <div className="comm-streak-header">
          <div className="comm-streak-info">
            <span className="comm-streak-fire">🔥</span>
            <div>
              <div className="comm-streak-number">{streak?.currentStreak || 0} Day Streak</div>
              <div className="comm-streak-text">
                Longest: {streak?.longestStreak || 0} days • Total Active: {streak?.totalActiveDays || 0} days
              </div>
            </div>
          </div>

          <div className="comm-badges-list">
            {streak?.badges?.map((b: any) => (
              <div key={b.id} className="comm-badge-chip" title={b.desc}>
                <span>{b.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Curated Lessons Catalog */}
      <div className="comm-lessons-section">
        <div className="comm-section-header">
          <div>
            <h2 className="comm-section-title">
              <BookOpen size={22} color="#a855f7" /> Curated Lessons for {activeLang?.name} ({activeLang?.nativeName})
            </h2>
            <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '4px' }}>
              Structured step-by-step curriculum designed for engineering presentations and corporate technical fluency.
            </p>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="comm-category-filters">
          {['all', 'Daily Communication', 'Grammar', 'Vocabulary', 'Professional Communication', 'Interview Communication', 'Listening', 'Reading'].map(cat => (
            <button
              key={cat}
              className={`comm-filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Lessons' : cat}
            </button>
          ))}
        </div>

        {/* Lessons List */}
        <div className="comm-lessons-grid">
          {dashboardData?.allLessons
            ?.filter((l: any) => selectedCategory === 'all' || l.category === selectedCategory)
            .map((lesson: any) => (
              <div key={lesson.id} className="comm-lesson-card">
                <div>
                  <div className="comm-lesson-meta">
                    <span className="comm-lesson-cat">{lesson.category}</span>
                    <span className={`comm-lesson-diff comm-diff-${lesson.difficulty}`}>
                      {lesson.difficulty}
                    </span>
                  </div>
                  <h3 className="comm-lesson-title" style={{ marginTop: '10px' }}>
                    {lesson.title}
                  </h3>
                  <p className="comm-lesson-desc" style={{ marginTop: '8px' }}>
                    {lesson.description}
                  </p>
                </div>

                <div className="comm-lesson-footer">
                  <span className="comm-lesson-duration">
                    <Clock size={13} /> {lesson.estimatedMinutes || 20} mins
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('communication-practice-hub', { languageCode: activeLangCode, lessonId: lesson.id })}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Open Lesson
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

function BarChart3Icon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
