import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Activity, Sliders, AlertTriangle, Briefcase, Building, CheckCircle2, XCircle, Flag, RefreshCw } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const AdminDashboardView: React.FC = () => {
  const { addToast } = useNotification();
  const [data, setData] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'moderation' | 'companies' | 'users' | 'audit'>('metrics');
  const [moderationFilter, setModerationFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [moderationNotes, setModerationNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
    fetchOpportunities();
    fetchCompanies();
    fetchAuditLogs();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load admin metrics:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || json);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/moderation/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setOpportunities(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load moderation opportunities:', e);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setCompanies(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load companies:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        addToast('Role Updated', `User permissions updated to ${newRole}.`, 'success');
        fetchUsers();
        fetchMetrics();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        addToast('Account Status Updated', `User account ${!currentStatus ? 'activated' : 'suspended'}.`, 'info');
        fetchUsers();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleModerateOpportunity = async (oppId: string, action: 'APPROVE' | 'REJECT' | 'FLAG') => {
    try {
      const token = localStorage.getItem('sb_token');
      const notes = moderationNotes[oppId] || '';
      const res = await fetch(`/api/admin/moderation/opportunities/${oppId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, notes })
      });
      if (res.ok) {
        addToast('Moderation Complete', `Opportunity ${action} successful.`, 'success');
        fetchOpportunities();
        fetchMetrics();
        fetchAuditLogs();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const handleVerifyCompany = async (companyId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/admin/companies/${companyId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        addToast('Accreditation Updated', `Company status set to ${newStatus}.`, 'success');
        fetchCompanies();
        fetchAuditLogs();
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const pendingOpportunities = opportunities.filter(
    o => o.verification_status === 'PENDING' || o.status === 'DRAFT'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>Platform Governance & System Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            System Metrics, Campus Opportunity Moderation, Partner Verification, RBAC, and Security Audits.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`btn ${activeTab === 'metrics' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Activity size={15} /> System Health
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`btn ${activeTab === 'moderation' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Briefcase size={15} /> Opportunity Moderation ({pendingOpportunities.length})
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`btn ${activeTab === 'companies' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Building size={15} /> Partner Verification ({companies.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Users size={15} /> User RBAC ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`btn ${activeTab === 'audit' ? 'btn-cyan' : 'btn-outline'}`}
          >
            <ShieldCheck size={15} /> Audit Logs
          </button>
        </div>
      </div>

      {/* TAB 1: METRICS & SYSTEM HEALTH */}
      {activeTab === 'metrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL PLATFORM USERS</div>
              <div style={{ fontSize: '32px', fontWeight: 800 }}>{data?.metrics?.totalUsers || users.length || 6}</div>
              <div style={{ fontSize: '12px', color: 'var(--primary)' }}>Role Partitioned RBAC</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ASSESSMENTS CONDUCTED</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {data?.metrics?.totalAssessments || 1}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Adaptive Proctoring</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CODING SUBMISSIONS</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {data?.metrics?.totalSubmissions || 2}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--accent-emerald)' }}>Safe VM Execution</div>
            </div>
            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>MODERATION QUEUE</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>
                {pendingOpportunities.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Postings</div>
            </div>
          </div>

          {/* System Health Card */}
          <div className="card" style={{ background: '#090d18' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>System Architecture & Environment</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DATABASE ENGINE</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>SQLite Node 24 Native Engine</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>AI ENGINE CLUSTER</span>
                <strong style={{ color: 'var(--primary)' }}>Steps 1-18 Full Unified Pipeline</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DEPLOYMENT CONTAINER</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>Multi-Stage Docker & Compose Ready</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SECURITY & ACCESS</span>
                <strong style={{ color: 'var(--accent-amber)' }}>JWT Bearer Authentication + RBAC</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPPORTUNITY MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Campus Opportunity Moderation Queue</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Review recruiter-submitted campus placements, verify compensation and eligibility, and publish or reject.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setModerationFilter('PENDING')}
                className={`btn btn-sm ${moderationFilter === 'PENDING' ? 'btn-primary' : 'btn-outline'}`}
              >
                Pending ({pendingOpportunities.length})
              </button>
              <button
                onClick={() => setModerationFilter('ALL')}
                className={`btn btn-sm ${moderationFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              >
                All Opportunities ({opportunities.length})
              </button>
            </div>
          </div>

          {(moderationFilter === 'PENDING' ? pendingOpportunities : opportunities).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 8px auto', color: 'var(--accent-emerald)' }} />
              <p>No opportunities pending moderation review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(moderationFilter === 'PENDING' ? pendingOpportunities : opportunities).map(opp => {
                const isPending = opp.verification_status === 'PENDING' || opp.status === 'DRAFT';
                return (
                  <div
                    key={opp.id}
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{opp.title}</h3>
                          <span className="badge" style={{ background: isPending ? 'hsla(40, 95%, 55%, 0.15)' : 'hsla(158, 82%, 40%, 0.15)', color: isPending ? '#f59e0b' : 'var(--accent-emerald)' }}>
                            {opp.verification_status || 'PENDING'}
                          </span>
                          <span className="badge badge-subtle">{opp.type}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Company: <strong>{opp.company_name || 'Partner Company'}</strong> • Location: {opp.location} • Compensation: {opp.salary || opp.stipend || 'Unspecified'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Target: {opp.eligibility || 'Graduating Batch 2026'} • Deadline: {opp.application_deadline || 'Open'}
                        </div>
                      </div>

                      {/* Moderation Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        <input
                          type="text"
                          placeholder="Optional review note..."
                          className="input"
                          style={{ fontSize: '12px', padding: '6px 10px' }}
                          value={moderationNotes[opp.id] || ''}
                          onChange={e => setModerationNotes({ ...moderationNotes, [opp.id]: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleModerateOpportunity(opp.id, 'APPROVE')}
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1 }}
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => handleModerateOpportunity(opp.id, 'REJECT')}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1, color: 'var(--accent-rose)', borderColor: 'hsla(0, 75%, 60%, 0.3)' }}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            onClick={() => handleModerateOpportunity(opp.id, 'FLAG')}
                            className="btn btn-sm btn-outline"
                            title="Flag for Investigation"
                          >
                            <Flag size={13} color="#f59e0b" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PARTNER COMPANY VERIFICATION */}
      {activeTab === 'companies' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Corporate & Campus Partner Accreditation
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Verify corporate identity, official email domain, and recruitment legitimacy.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Company Name</th>
                  <th style={{ padding: '12px' }}>Industry</th>
                  <th style={{ padding: '12px' }}>Recruiter Contact</th>
                  <th style={{ padding: '12px' }}>Active Postings</th>
                  <th style={{ padding: '12px' }}>Accreditation Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(comp => {
                  const isVerified = comp.verification_status === 'VERIFIED' || comp.verified === 1;
                  return (
                    <tr key={comp.id} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.3)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 700 }}>{comp.name || comp.company_name}</td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{comp.industry || 'Technology'}</td>
                      <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                        {comp.recruiter_email || comp.contact_email || 'hiring@company.com'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>{comp.opportunities_count || 1}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          className="badge"
                          style={{
                            background: isVerified ? 'hsla(158, 82%, 40%, 0.15)' : 'hsla(40, 95%, 55%, 0.15)',
                            color: isVerified ? 'var(--accent-emerald)' : '#f59e0b',
                            fontWeight: 700
                          }}
                        >
                          {comp.verification_status || (isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        {isVerified ? (
                          <button
                            onClick={() => handleVerifyCompany(comp.id, 'PENDING_VERIFICATION')}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--accent-rose)', borderColor: 'hsla(0, 75%, 60%, 0.3)' }}
                          >
                            Revoke Verification
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerifyCompany(comp.id, 'VERIFIED')}
                            className="btn btn-primary btn-sm"
                          >
                            <CheckCircle2 size={13} /> Grant Verification
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USER RBAC */}
      {activeTab === 'users' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Authorized Users & Role Assignments</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>User</th>
                  <th style={{ padding: '12px' }}>Current Role</th>
                  <th style={{ padding: '12px' }}>Account Status</th>
                  <th style={{ padding: '12px' }}>Modify Role</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.3)' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className="badge badge-subtle" style={{ textTransform: 'uppercase' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        className="badge"
                        style={{
                          background: u.is_active === 0 ? 'hsla(0, 75%, 60%, 0.15)' : 'hsla(158, 82%, 40%, 0.15)',
                          color: u.is_active === 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                        }}
                      >
                        {u.is_active === 0 ? 'SUSPENDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="college">College Admin</option>
                        <option value="admin">Platform Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleStatusToggle(u.id, u.is_active !== 0)}
                        className={`btn btn-sm ${u.is_active === 0 ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {u.is_active === 0 ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Governance & Security Audit Logs</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px' }}>User</th>
                  <th style={{ padding: '10px' }}>Action</th>
                  <th style={{ padding: '10px' }}>Resource ID</th>
                  <th style={{ padding: '10px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid hsla(217, 25%, 28%, 0.2)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{log.user_name || log.user_id || 'System'}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-primary">{log.action}</span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>{log.resource}</td>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details_json}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
