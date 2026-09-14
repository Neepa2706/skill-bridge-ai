import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, Award, CheckCircle2, AlertTriangle, Briefcase, Users, Star, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './UnifiedReportsView.css';

interface UnifiedReportsViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const UnifiedReportsView: React.FC<UnifiedReportsViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const userRole = user?.role || 'student';

  const [activePersona, setActivePersona] = useState<string>(userRole);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchReport(activePersona);
  }, [activePersona]);

  const fetchReport = async (role: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/reports/${role}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReportData(json.data);
      }
    } catch (e) {
      console.error('Failed to load report:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unified-reports-container">
      {/* Top Banner */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>
            Executive Reports & Accreditation Dossiers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Comprehensive institutional evaluation metrics, placement records, and performance dossiers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()} className="btn btn-primary">
            <Printer size={16} /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Persona Switcher for Admins / TPOs */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '8px' }}>
          SELECT REPORT PERSPECTIVE:
        </span>
        {['student', 'mentor', 'recruiter', 'college', 'admin'].map(r => (
          <button
            key={r}
            onClick={() => setActivePersona(r)}
            className={`btn btn-sm ${activePersona === r ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {r} Report
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          Compiling institutional placement report...
        </div>
      ) : !reportData ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>No report data available for this perspective.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. STUDENT REPORT */}
          {activePersona === 'student' && (
            <>
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{reportData.student?.name || user?.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {reportData.student?.college} • {reportData.student?.department} (Year {reportData.student?.year})
                    </p>
                    <div style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '4px' }}>
                      Target Role: <strong>{reportData.student?.targetRole}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLACEMENT READINESS</div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {reportData.student?.careerReadinessScore}%
                    </div>
                    <span className="badge badge-success">Verified by AI Benchmarks</span>
                  </div>
                </div>
              </div>

              {/* Skills & Gaps Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Verified Competencies</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(reportData.skills || []).slice(0, 5).map((s: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span>{s.skill_name}</span>
                        <strong style={{ color: 'var(--accent-emerald)' }}>{s.verified_score}/100 ({s.current_level})</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Prioritized Skill Gaps</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(reportData.skillGaps || []).slice(0, 5).map((g: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span>{g.skill_name}</span>
                        <span className="badge badge-subtle">{g.gap_status || 'Need Focus'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--primary)" /> Actionable Placement Recommendations
                </h3>
                <ul style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {(reportData.recommendations || []).map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* 2. MENTOR REPORT */}
          {activePersona === 'mentor' && (
            <>
              <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Mentor Coaching & Impact Report</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Mentor: <strong>{reportData.mentorName}</strong> ({reportData.mentorEmail})
                </p>
              </div>

              <div className="report-stat-grid">
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SESSIONS CONDUCTED</div>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{reportData.totalSessionsConducted}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>100% On-Time Completion</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AVERAGE RATING</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {reportData.averageSatisfactionRating} / 5.0
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Student feedback score</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ACTIVE REQUESTS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>
                    {reportData.activeMentorshipRequests}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending confirmation</div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Specialized Coaching Focus Areas</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(reportData.coachingTopics || []).map((t: string, idx: number) => (
                    <span key={idx} className="badge badge-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 3. RECRUITER REPORT */}
          {activePersona === 'recruiter' && (
            <>
              <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Recruiter Hiring Pipeline Summary</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Talent Acquisition Performance & Conversion Funnel Analysis
                </p>
              </div>

              <div className="report-stat-grid">
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ACTIVE POSTINGS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{reportData.totalActiveOpportunities}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Published campus drives</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>REVIEWED APPLICANTS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {reportData.totalApplicantsReviewed}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Verified candidate files</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SHORTLISTED</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {reportData.shortlistedCandidates}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Advanced to technicals</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CONVERSION RATE</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
                    {reportData.conversionRatePct}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Shortlist-to-Apply</div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Top In-Demand Skills</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(reportData.topMatchedSkills || []).map((s: string, idx: number) => (
                    <span key={idx} className="badge badge-subtle" style={{ padding: '6px 12px' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 4. COLLEGE REPORT */}
          {activePersona === 'college' && (
            <>
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Department Placement & Accreditation Report</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Stanford Institute of Technology • {reportData.department}
                </p>
              </div>

              <div className="report-stat-grid">
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TOTAL CANDIDATES</div>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{reportData.totalStudents}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active campus learners</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AVERAGE READINESS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {reportData.averageReadinessScore}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Institutional benchmark</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PLACEMENT READY %</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {reportData.placementReadyPercentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ready for placement drives</div>
                </div>
              </div>
            </>
          )}

          {/* 5. ADMIN COMPLIANCE REPORT */}
          {activePersona === 'admin' && (
            <>
              <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Platform Compliance & Security Audit Dossier</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Enterprise RBAC, Safe Exam Integrity Logs, and Platform Governance
                </p>
              </div>

              <div className="report-stat-grid">
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>REGISTERED USERS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{reportData.totalUsers}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Multi-tenant accounts</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AUDIT TRAIL EVENTS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {reportData.auditLogEntries}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Immutable log entries</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>INTEGRITY VIOLATIONS</div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {reportData.proctoringIntegrityViolations}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>Proctoring alert signals</div>
                </div>
                <div className="card">
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>COMPLIANCE STATUS</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '8px' }}>
                    {reportData.complianceStatus}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
