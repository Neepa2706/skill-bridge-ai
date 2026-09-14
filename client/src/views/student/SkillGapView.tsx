import React, { useState, useEffect } from 'react';
import { TrendingDown, ArrowRight, BookOpen, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const SkillGapView: React.FC<{ onNavigate: (view: string, data?: any) => void }> = ({ onNavigate }) => {
  const [selectedRole, setSelectedRole] = useState<string>('role-software-dev');
  const [gapData, setGapData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const roles = [
    { id: 'role-software-dev', title: 'Software Developer' },
    { id: 'role-data-analyst', title: 'Data Analyst' },
    { id: 'role-ai-engineer', title: 'AI / ML Engineer' },
    { id: 'role-fullstack-dev', title: 'Full Stack Developer' }
  ];

  useEffect(() => {
    fetchGaps(selectedRole);
  }, [selectedRole]);

  const fetchGaps = async (roleId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      // Fetch dashboard which computes current gaps for role
      const res = await fetch('/api/student/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGapData(data.gapAnalysis);
      }
    } catch (e) {
      console.error('Failed to load skill gaps:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>AI Skill-Gap Engine</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Continuous comparison between your verified skill matrix and target role requirements.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`btn ${selectedRole === r.id ? 'btn-primary' : 'btn-outline'}`}
            >
              {r.title}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      {gapData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ROLE READINESS SCORE</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {gapData.readinessScore}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>Target: {gapData.targetRoleTitle}</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CRITICAL GAPS</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-rose)' }}>
              {gapData.criticalCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Blocks campus placement</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NEEDS IMPROVEMENT</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-amber)' }}>
              {gapData.needsImprovementCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Practice challenges needed</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BENCHMARK MET</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {gapData.goodCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maintain via weekly streaks</div>
          </div>
        </div>
      )}

      {/* Comprehensive Gaps List */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Prioritized Skill Gaps</h2>

        {(!gapData || !gapData.gaps || gapData.gaps.length === 0) ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              No skill gaps diagnosed yet. Complete your initial AI assessment to analyze your baseline skills against target role benchmarks.
            </p>
            <button onClick={() => onNavigate('dashboard')} className="btn btn-primary btn-sm">
              Go to Dashboard to Start Assessment
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {gapData.gaps.map((g: any) => {
              const isCritical = g.gapStatus === 'critical';
              const isWarning = g.gapStatus === 'needs_improvement';
              return (
                <div
                  key={g.skillName}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: `1.5px solid ${isCritical ? 'hsla(350, 89%, 60%, 0.35)' : isWarning ? 'hsla(38, 92%, 50%, 0.35)' : 'hsla(152, 76%, 45%, 0.35)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isCritical ? (
                        <ShieldAlert size={20} color="var(--accent-rose)" />
                      ) : isWarning ? (
                        <AlertTriangle size={20} color="var(--accent-amber)" />
                      ) : (
                        <CheckCircle size={20} color="var(--accent-emerald)" />
                      )}
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {g.skillName}
                      </span>
                    </div>

                    <span
                      className={`badge ${isCritical ? 'badge-critical' : isWarning ? 'badge-warning' : 'badge-success'}`}
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                    >
                      {isCritical ? '🔴 CRITICAL GAP' : isWarning ? '🟡 NEEDS IMPROVEMENT' : '🟢 GOOD'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Current Level: <strong>{g.currentLevel}%</strong></span>
                        <span>Target Level: <strong>{g.requiredLevel}%</strong></span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '8px' }}>
                        <div
                          className={`progress-bar-fill ${isCritical ? 'fill-rose' : isWarning ? 'fill-amber' : 'fill-emerald'}`}
                          style={{ width: `${Math.min(100, g.currentLevel)}%` }}
                        />
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: isCritical ? 'var(--accent-rose)' : isWarning ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                        {g.gapPercentage > 0 ? `-${g.gapPercentage}% Gap` : 'Achieved'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {g.recommendation}
                  </p>

                  {/* Course Trigger Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button
                      onClick={() => onNavigate('learning')}
                      className="btn btn-outline btn-sm"
                    >
                      <BookOpen size={14} /> Open Relevant Learning Path <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
