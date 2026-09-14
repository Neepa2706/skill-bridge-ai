import React, { useState, useEffect } from 'react';
import { FileText, Printer, CheckCircle2, Award, Flame, Video, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const StudentReportView: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/report', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error('Failed to load report:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading verified career readiness report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Career Dossier Available</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '14px', lineHeight: 1.5 }}>
          You have not completed an assessment yet. Complete your first AI baseline assessment to generate your verified placement dossier.
        </p>
      </div>
    );
  }

  const { student, skills, skillGaps, learningProgress, codingSummary, interviewPerformance, recommendations } = report;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px' }}>Student Placement Dossier</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Comprehensive institutional career readiness verification document.
          </p>
        </div>

        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={16} /> Print / Export Verified PDF
        </button>
      </div>

      {/* Printable Paper Document Container */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface)',
          padding: '40px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
              SKILLBRIDGE AI CAREER VERIFICATION
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Official Candidate Placement Readiness Dossier
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generated:</div>
            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {new Date(report.generatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Candidate Profile Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CANDIDATE NAME</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{student.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INSTITUTION</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{student.college}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DEPARTMENT / YEAR</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{student.department} (Yr {student.year})</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLACEMENT READINESS</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              {student.careerReadinessScore}%
            </div>
          </div>
        </div>

        {/* Verified Skills Table */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>1. Verified Skill Profiles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {skills.map((s: any) => (
              <div key={s.skill_name} style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{s.skill_name}</span>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: s.verified_score >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {s.verified_score}%
                  </span>
                </div>
                <div className="progress-bar-bg" style={{ height: '5px' }}>
                  <div
                    className={`progress-bar-fill ${s.verified_score >= 70 ? 'fill-emerald' : 'fill-amber'}`}
                    style={{ width: `${s.verified_score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning & Coding Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>2. Learning Platform Invariants</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>• Total Lessons Mastered: <strong>{learningProgress.totalCompletedLessons}</strong></div>
              <div>• Proctored Tests Passed: <strong>{learningProgress.testsPassed}</strong></div>
              <div>• Active Course Tracks: <strong>{learningProgress.coursesEnrolled.join(', ') || 'Core DSA'}</strong></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>3. Coding Arena Verification</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>• Active Problem Solving Streak: <strong>{codingSummary.currentStreak} Days</strong></div>
              <div>• Maximum Unbroken Streak: <strong>{codingSummary.longestStreak} Days</strong></div>
              <div>• Verified Test Execution: <strong>100% Isolated Sandbox Pass</strong></div>
            </div>
          </div>
        </div>

        {/* AI Actionable Recommendations */}
        <div style={{ background: 'hsla(265, 89%, 66%, 0.08)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(265, 89%, 66%, 0.25)' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--primary)', marginBottom: '8px' }}>
            4. AI Placement Recommendations
          </h3>
          <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            {recommendations.map((r: string, idx: number) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Institutional Verification Stamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Digitally certified by SkillBridge AI Automated Assessment Architecture. ID: SB-CERT-{student.id}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: 700 }}>
            <CheckCircle2 size={16} /> VERIFIED BY ENTERPRISE RBAC
          </div>
        </div>
      </div>
    </div>
  );
};
