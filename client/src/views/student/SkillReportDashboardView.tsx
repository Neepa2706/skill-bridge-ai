import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingDown,
  Compass,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Eye,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Target,
  BarChart3,
  Flame
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './SkillReportDashboardView.css';

interface SkillItem {
  skillId: string;
  skillName: string;
  category: string;
  score: number;
  level: string;
  levelNumber: number;
  confidence: 'Low' | 'Medium' | 'High';
  evidence: string[];
  improvementStatus: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface SkillGap {
  skillName: string;
  currentScore: number;
  currentLevelNumber: number;
  requiredLevelNumber: number;
  requiredScore: number;
  gapSize: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  isMandatory: boolean;
  recommendation: string;
}

interface ReportData {
  reportId: string;
  version: number;
  overallScore: number;
  overallLevel: string;
  summary: string;
  categoryScores: {
    technical: number;
    coding: number;
    communication: number;
    problemSolving: number;
  };
  skills: SkillItem[];
  strengths: Array<{
    title: string;
    description: string;
    skillName: string;
    evidenceSnippet: string;
  }>;
  areasToImprove: Array<{
    title: string;
    description: string;
    skillName: string;
    recommendedAction: string;
  }>;
  skillGaps: SkillGap[];
  careerAlignment: {
    targetRoleTitle: string;
    targetRoleId: string;
    alignmentPercentage: number;
    summary: string;
    strengthsAlignment: string[];
    gapFactors: string[];
    alternativeCareers: Array<{
      roleTitle: string;
      roleId: string;
      alignmentPercentage: number;
      rationale: string;
    }>;
  };
  priorityImprovements: Array<{
    rank: number;
    skillName: string;
    currentLevel: string;
    targetLevel: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    actionPlan: string;
  }>;
  skillGrowthHistory: Array<{
    skillName: string;
    initialScore: number;
    initialLevel: string;
    currentScore: number;
    currentLevel: string;
    targetLevel: string;
  }>;
  generatedAt: string;
  visibility: string;
}

interface SkillReportDashboardViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const SkillReportDashboardView: React.FC<SkillReportDashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [visibility, setVisibility] = useState<string>('private');
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState<boolean>(false);

  useEffect(() => {
    fetchSkillReport();
  }, []);

  const fetchSkillReport = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/skill-report', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setVisibility(data.visibility || 'private');
      } else {
        const err = await res.json();
        addToast('Error', err.error || 'Failed to load skill report.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivacyChange = async (newVisibility: string) => {
    setIsUpdatingPrivacy(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/skill-report/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ visibility: newVisibility })
      });
      if (res.ok) {
        setVisibility(newVisibility);
        addToast('Privacy Updated', `Report visibility set to ${newVisibility}.`, 'success');
      }
    } catch (e: any) {
      addToast('Error', 'Failed to update visibility.', 'error');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const toggleEvidence = (skillId: string) => {
    setExpandedEvidence(prev => ({ ...prev, [skillId]: !prev[skillId] }));
  };

  const handleDownloadPDF = () => {
    const token = localStorage.getItem('sb_token');
    window.open(`/api/student/skill-report/pdf?print=true`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>🧠</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Analysing Your Skills...</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
          SkillBridge AI is evaluating your technical, coding, and communication responses against industry standards...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No skill report generated yet. Complete your initial assessment to view your diagnostic report.</p>
      </div>
    );
  }

  const levelClass = (report.overallLevel || 'Developing').toLowerCase();

  return (
    <div className="skill-report-container">
      {/* 1. REPORT HEADER & META */}
      <header className="report-header">
        <div className="report-title-group">
          <h1>
            Your Skill Report <Sparkles size={24} style={{ color: 'var(--primary)' }} />
          </h1>
          <p>Here's where you stand today — and where you can go next.</p>
          <div className="report-meta-badges">
            <span className="report-badge">
              <strong>Candidate:</strong> {user?.name || 'Student Candidate'}
            </span>
            <span className="report-badge">
              <Target size={14} /> <strong>Target Role:</strong> {report.careerAlignment?.targetRoleTitle || 'Software Developer'}
            </span>
            <span className="report-badge">
              <strong>Date:</strong> {new Date(report.generatedAt).toLocaleDateString()}
            </span>
            <span className="report-badge" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              Version {report.version}
            </span>
          </div>
        </div>

        <div className="report-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="privacy-select"
              value={visibility}
              disabled={isUpdatingPrivacy}
              onChange={(e) => handlePrivacyChange(e.target.value)}
              title="Report Visibility Setting"
            >
              <option value="private">Private (Only You)</option>
              <option value="college_visible">College & TPO Visible</option>
              <option value="mentor_visible">Mentors Visible</option>
              <option value="recruiter_visible">Verified Recruiters Visible</option>
            </select>
          </div>

          <button onClick={handleDownloadPDF} className="btn btn-secondary" title="Export as PDF / Print">
            <Printer size={16} /> Download PDF
          </button>
        </div>
      </header>

      {/* 2 & 3. HERO GRID: OVERALL READINESS & CATEGORIES */}
      <section className="report-hero-grid">
        {/* Overall Readiness Card */}
        <div className="readiness-card">
          <div
            className="gauge-circle"
            style={{ ['--score-pct' as any]: report.overallScore }}
          >
            <div className="gauge-val">{report.overallScore}</div>
            <div className="gauge-sub">out of 100</div>
          </div>

          <span className={`level-tag ${levelClass}`}>
            Level {report.overallLevel}
          </span>

          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Overall Readiness</h3>
          <p className="readiness-note">
            This score is a diagnostic benchmark of where your journey starts — not an absolute measure of your talent. Every skill is buildable.
          </p>
        </div>

        {/* Assessed Category Score Cards */}
        <div className="categories-grid">
          <div className="category-card">
            <div className="category-header">
              <span className="category-title">
                <BrainCircuit size={18} style={{ color: '#38bdf8' }} /> Technical Knowledge
              </span>
              <span className="category-score">{report.categoryScores?.technical || 65}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${report.categoryScores?.technical || 65}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Database systems, OS fundamentals & architecture</span>
          </div>

          <div className="category-card">
            <div className="category-header">
              <span className="category-title">
                <BarChart3 size={18} style={{ color: '#a855f7' }} /> Coding Ability
              </span>
              <span className="category-score">{report.categoryScores?.coding || 58}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${report.categoryScores?.coding || 58}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Syntax, algorithms, test case validation in Python/JS</span>
          </div>

          <div className="category-card">
            <div className="category-header">
              <span className="category-title">
                <Sparkles size={18} style={{ color: '#10b981' }} /> Communication
              </span>
              <span className="category-score">{report.categoryScores?.communication || 68}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${report.categoryScores?.communication || 68}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workplace scenarios in English, Japanese & German</span>
          </div>

          <div className="category-card">
            <div className="category-header">
              <span className="category-title">
                <Flame size={18} style={{ color: '#f59e0b' }} /> Problem Solving
              </span>
              <span className="category-score">{report.categoryScores?.problemSolving || 60}%</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${report.categoryScores?.problemSolving || 60}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Edge cases, structural logic & deduplication</span>
          </div>
        </div>
      </section>

      {/* 11. AI CAREER COACH SUMMARY */}
      <section className="ai-coach-banner">
        <div className="ai-coach-avatar">✨</div>
        <div className="ai-coach-content">
          <h3>AI Career Coach Summary — Your Current Position</h3>
          <p>{report.summary}</p>
        </div>
      </section>

      {/* 5 & 6. STRENGTHS & AREAS TO IMPROVE */}
      <section className="duo-grid">
        <div className="duo-card">
          <div className="duo-card-header" style={{ color: '#34d399' }}>
            <CheckCircle2 size={20} /> Your Strengths 💪
          </div>
          {report.strengths?.map((s, idx) => (
            <div key={idx} className="strength-item">
              <div className="strength-title">{s.title} ({s.skillName})</div>
              <div className="strength-desc">{s.description}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Verified Evidence: {s.evidenceSnippet}
              </div>
            </div>
          ))}
        </div>

        <div className="duo-card">
          <div className="duo-card-header" style={{ color: '#fbbf24' }}>
            <Target size={20} /> Areas to Improve 🎯
          </div>
          {report.areasToImprove?.map((a, idx) => (
            <div key={idx} className="improve-item">
              <div className="improve-title">{a.title} ({a.skillName})</div>
              <div className="improve-desc">{a.description}</div>
              <div className="improve-action">Recommended Next Step: {a.recommendedAction}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. INDIVIDUAL SKILL ANALYSIS TABLE WITH TRACEABLE EVIDENCE */}
      <section className="skills-table-card">
        <div className="skills-table-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Individual Skill Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Full competency breakdown with verified assessment evidence.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="skills-table">
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Category</th>
                <th>Diagnostic Level</th>
                <th>Score</th>
                <th>Confidence</th>
                <th>Improvement Status</th>
                <th>Assessment Evidence</th>
              </tr>
            </thead>
            <tbody>
              {report.skills?.map((sk) => (
                <React.Fragment key={sk.skillId}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>{sk.skillName}</td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {sk.category}
                    </td>
                    <td>
                      <span className={`level-tag ${(sk.level || 'Developing').toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 10px' }}>
                        Level {sk.levelNumber}: {sk.level}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, minWidth: '32px' }}>{sk.score}</span>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${sk.score}%`, height: '100%', background: 'var(--primary)' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`confidence-chip ${sk.confidence}`}>
                        {sk.confidence} Confidence
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: sk.improvementStatus === 'Proficient' ? '#34d399' : '#facc15' }}>
                        {sk.improvementStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleEvidence(sk.skillId)}
                        className="evidence-btn"
                        title="View traceable assessment questions and sandbox results"
                      >
                        {expandedEvidence[sk.skillId] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expandedEvidence[sk.skillId] ? 'Hide Evidence' : 'View Evidence'}
                      </button>
                    </td>
                  </tr>

                  {expandedEvidence[sk.skillId] && (
                    <tr>
                      <td colSpan={7} style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 24px' }}>
                        <div className="evidence-drawer">
                          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                            Traceable Assessment Data Points:
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {sk.evidence?.map((ev, i) => (
                              <li key={i} style={{ marginBottom: '4px' }}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. SKILL GAP ANALYSIS MATRIX */}
      <section className="skills-table-card">
        <div className="skills-table-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              Skill Gap Analysis against {report.careerAlignment?.targetRoleTitle}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Benchmarked against enterprise hiring standards for entry to intermediate roles.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="skills-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Current Level</th>
                <th>Required Benchmark</th>
                <th>Gap Size</th>
                <th>Action Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {report.skillGaps?.map((gap, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{gap.skillName}</td>
                  <td>
                    <span style={{ fontWeight: 700 }}>Level {gap.currentLevelNumber}</span> ({gap.currentScore}%)
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Level {gap.requiredLevelNumber}</span> ({gap.requiredScore}%)
                  </td>
                  <td>
                    <span className={`gap-badge ${gap.gapSize}`}>
                      {gap.gapSize} Gap
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {gap.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 8 & 9. CAREER ALIGNMENT & ALTERNATIVE SUGGESTIONS */}
      <section className="alignment-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Career Alignment & Synergy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Estimated alignment with <strong>{report.careerAlignment?.targetRoleTitle}</strong>:
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>
              {report.careerAlignment?.alignmentPercentage || 60}% Aligned
            </div>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {report.careerAlignment?.summary}
        </p>

        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
            Careers You May Also Explore
          </h4>
          <div className="alt-careers-grid">
            {report.careerAlignment?.alternativeCareers?.map((alt, i) => (
              <div key={i} className="alt-career-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{alt.roleTitle}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                    {alt.alignmentPercentage}% Match
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {alt.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PERSONALIZED PRIORITY LIST */}
      <section className="skills-table-card">
        <div className="skills-table-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>What Should You Improve First?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Ranked roadmap priorities to accelerate your placement readiness timeline.
            </p>
          </div>
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report.priorityImprovements?.map((p) => (
            <div
              key={p.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--primary-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff'
                  }}
                >
                  {p.rank}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{p.skillName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.actionPlan}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`gap-badge ${p.priority}`}>{p.priority} Priority</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Goal: Level {p.targetLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12. SKILL GROWTH VISUALIZATION */}
      <section className="growth-card">
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Your Skill Growth</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Historical progression tracking from initial baseline to current level and target milestone.
        </p>

        <div className="growth-bars">
          {report.skillGrowthHistory?.map((g, idx) => (
            <div key={idx} className="growth-row">
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{g.skillName}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${g.currentScore}%`,
                      background: 'var(--primary-gradient)',
                      borderRadius: '4px'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: '75%',
                      top: '-4px',
                      bottom: '-4px',
                      width: '2px',
                      background: '#10b981'
                    }}
                    title="Target: 75% (Proficient)"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Initial: {g.initialScore}%</span>
                  <span>Current: {g.currentScore}% ({g.currentLevel})</span>
                  <span style={{ color: '#10b981' }}>Target: Proficient (75%)</span>
                </div>
              </div>
              <span className={`level-tag ${(g.currentLevel || 'developing').toLowerCase()}`} style={{ fontSize: '11px', textAlign: 'center' }}>
                {g.currentLevel}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 13. NEXT STEP CTA */}
      <section className="cta-banner">
        <h2>Ready to Build Your Skills? 🚀</h2>
        <p>
          We've identified where you are. Now let's create a personalized, milestone-driven learning path to close your priority skill gaps and get you placement ready.
        </p>
        <button
          onClick={() => onNavigate ? onNavigate('learning-roadmap') : (window.location.href = '/student/learning-roadmap')}
          className="btn btn-primary btn-lg"
          style={{ padding: '14px 32px', fontSize: '16px' }}
        >
          Build My Learning Roadmap <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
};
