import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, TrendingDown, FileSpreadsheet, Search, Filter, Printer, ShieldCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const CollegeDashboardView: React.FC = () => {
  const { addToast } = useNotification();
  const [data, setData] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [departmentReport, setDepartmentReport] = useState<any | null>(null);

  useEffect(() => {
    fetchCollegeData();
    fetchStudents();
  }, [selectedDept, search]);

  const fetchCollegeData = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/college/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load college analytics:', e);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      let url = `/api/college/students?search=${encodeURIComponent(search)}`;
      if (selectedDept !== 'All') {
        url += `&department=${encodeURIComponent(selectedDept)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/college/reports/department?department=${selectedDept !== 'All' ? selectedDept : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const rep = json.data || json;
        setDepartmentReport(rep);
        addToast('Report Ready', 'Department institutional report generated successfully.', 'success');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>College Placement & Accreditation Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Stanford Institute of Technology • Department Performance & Placement Readiness Intelligence
          </p>
        </div>

        <button onClick={handleGenerateReport} className="btn btn-primary">
          <FileSpreadsheet size={16} /> Generate Department Report
        </button>
      </div>

      {/* KPI Metrics */}
      {data?.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AUTHORIZED STUDENTS</div>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{data.metrics.totalAuthorizedStudents}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>100% Active Learners</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AVG READINESS SCORE</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {data.metrics.averageReadinessScore}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>Tier-1 Placement Quality</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PLACEMENT READY COHORT</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {data.metrics.placementReadyPercentage}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score &ge; 75% Benchmark</div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-rose)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>REQUIRING INTERVENTION</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-rose)' }}>
              {data.metrics.needsSupportCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Critical Skill Gaps</div>
          </div>
        </div>
      )}

      {/* Department Breakdown & Gap Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Department Stats */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Department Skill Performance</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data?.departmentList?.map((d: any) => (
              <div key={d.name} style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{d.name}</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '14px' }}>
                    {d.avgReadiness}% Avg
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill fill-emerald" style={{ width: `${d.avgReadiness}%` }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {d.studentCount} Registered Candidates
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institution-Wide Critical Gaps */}
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Department-Wide Critical Gaps</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.topGaps?.map((g: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'hsla(350, 89%, 60%, 0.08)',
                  border: '1px solid hsla(350, 89%, 60%, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{g.skill}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.studentsAffected} students below benchmark</div>
                </div>
                <span className="badge badge-critical">{g.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Authorized Student Roster */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '18px' }}>Candidate Readiness Roster ({students.length})</h2>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search candidate name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', width: '220px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
            </div>

            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="select-field"
            >
              <option value="All">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Information Technology">Information Technology</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Year</th>
                <th style={{ padding: '12px 16px' }}>Target Career Goal</th>
                <th style={{ padding: '12px 16px' }}>Readiness Score</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.3)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{s.department}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Year {s.year_of_study}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--accent-cyan)' }}>{s.career_interest}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: s.career_readiness_score >= 75 ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                    {s.career_readiness_score}%
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${s.career_readiness_score >= 75 ? 'badge-success' : 'badge-warning'}`}>
                      {s.career_readiness_score >= 75 ? 'Placement Ready' : 'In Training'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Department Report Modal */}
      {departmentReport && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px' }}>Department Accreditation Summary</h2>
              <button onClick={() => setDepartmentReport(null)} className="btn btn-outline btn-sm">✕ Close</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div>Institution: <strong>Stanford Institute of Technology</strong></div>
                <div>Department: <strong>{departmentReport.department}</strong></div>
                <div>Average Placement Readiness: <strong>{departmentReport.averageReadinessScore}%</strong></div>
                <div>Ready Candidates: <strong>{departmentReport.placementReadyPercentage}%</strong></div>
              </div>

              <h3 style={{ fontSize: '16px', marginTop: '10px' }}>Department Candidate Breakdown</h3>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px' }}>Name</th>
                      <th style={{ padding: '8px' }}>Year</th>
                      <th style={{ padding: '8px' }}>Readiness</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentReport.studentRoster?.map((st: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.2)' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{st.name}</td>
                        <td style={{ padding: '8px' }}>Yr {st.year}</td>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{st.readiness}%</td>
                        <td style={{ padding: '8px' }}>{st.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button onClick={() => window.print()} className="btn btn-primary">
                  <Printer size={16} /> Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
