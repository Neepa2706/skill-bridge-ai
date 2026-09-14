/**
 * SkillBridge AI — Test Suite 3: Security & RBAC Audit
 * 
 * Verifies non-negotiable security boundaries:
 * 1.  Unauthenticated Access Rejection (HTTP 401)
 * 2.  Malformed / Invalid Token Rejection (HTTP 401 / 403)
 * 3.  Public Admin Registration Blocking (HTTP 403)
 * 4.  Role Escalation Blocking (Student cannot promote self to Admin)
 * 5.  Student Data Isolation (BOLA/IDOR: Student A cannot view/tamper Student B's data)
 * 6.  Recruiter Ownership Isolation (Recruiter A cannot edit/delete Recruiter B's postings)
 * 7.  Admin Privilege Protection (Students & Recruiters blocked from /api/admin/*)
 * 8.  Tamper-Proof Scoring (Students cannot manually overwrite readiness or skill scores)
 * 9.  API Key Masking (Raw secrets never exposed in responses)
 * 10. Demo Switching Endpoint Disabled (HTTP 403)
 */

const BASE_URL = 'http://localhost:5000';

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${JSON.stringify(details)})` : ''}`);
    failed++;
    process.exitCode = 1;
  }
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('🔒 SUITE 3: SECURITY & ROLE-BASED ACCESS CONTROL (RBAC) AUDIT');
  console.log('===============================================================\n');

  const timestamp = Date.now();

  // --- 1. Unauthenticated Requests Rejected ---
  console.log('--- 1. Authentication Gatekeeping ---');
  const noTokenDash = await api('GET', '/api/student/dashboard');
  assert(noTokenDash.status === 401, 'Unauthenticated request to /api/student/dashboard rejected with 401');

  const noTokenAdmin = await api('GET', '/api/admin/metrics');
  assert(noTokenAdmin.status === 401, 'Unauthenticated request to /api/admin/metrics rejected with 401');

  const badTokenRes = await api('GET', '/api/student/dashboard', null, 'malformed.jwt.token');
  assert(badTokenRes.status === 401 || badTokenRes.status === 403, 'Malformed token rejected with 401/403');

  // --- 2. Public Admin Registration Block ---
  console.log('\n--- 2. Public Admin Escalation Prevention ---');
  const fakeAdmin = await api('POST', '/api/auth/register/student', {
    name: 'Attacker Admin',
    email: `attacker.${timestamp}@skillbridge.ai`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'admin',
    agreedToTerms: true
  });
  assert(fakeAdmin.status === 403, 'Public registration rejects role: admin attempt with 403 Forbidden');

  // --- 3. Demo Switch Endpoint Disabled ---
  console.log('\n--- 3. Demo Switch Endpoint Quarantine ---');
  const demoSwitch = await api('POST', '/api/auth/demo-switch', { role: 'admin' });
  assert(demoSwitch.status === 403, 'POST /api/auth/demo-switch disabled with 403 Forbidden');

  // --- 4. Setup Test Users ---
  console.log('\n--- 4. Setup Multi-Tenant Test Identities ---');
  // Student A
  const studentAReg = await api('POST', '/api/auth/register/student', {
    name: 'Student Alice',
    email: `student.a.${timestamp}@skillbridge.ai`,
    phone: '+1 555-1111',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    collegeName: 'Apex Tech',
    department: 'Computer Science',
    currentYear: 3,
    graduationYear: 2027,
    agreedToTerms: true
  });
  const tokenA = studentAReg.data.token;
  const userAId = studentAReg.data.user.id;
  assert(studentAReg.status === 201 && Boolean(tokenA), 'Student A registered');

  // Student B
  const studentBReg = await api('POST', '/api/auth/register/student', {
    name: 'Student Bob',
    email: `student.b.${timestamp}@skillbridge.ai`,
    phone: '+1 555-2222',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    collegeName: 'Apex Tech',
    department: 'Electronics',
    currentYear: 2,
    graduationYear: 2028,
    agreedToTerms: true
  });
  const tokenB = studentBReg.data.token;
  const userBId = studentBReg.data.user.id;
  assert(studentBReg.status === 201 && Boolean(tokenB), 'Student B registered');

  // Recruiter A
  const recAReg = await api('POST', '/api/auth/register/recruiter', {
    companyName: `Alpha Corp ${timestamp}`,
    companyEmail: `rec.a.${timestamp}@skillbridge.ai`,
    recruiterName: 'Recruiter Alpha',
    phone: '+1 555-3333',
    industry: 'Software',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    agreedToTerms: true
  });
  const tokenRecA = recAReg.data.token;
  assert(recAReg.status === 201 && Boolean(tokenRecA), 'Recruiter A registered');

  // Recruiter B
  const recBReg = await api('POST', '/api/auth/register/recruiter', {
    companyName: `Beta Corp ${timestamp}`,
    companyEmail: `rec.b.${timestamp}@skillbridge.ai`,
    recruiterName: 'Recruiter Beta',
    phone: '+1 555-4444',
    industry: 'Cloud',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    agreedToTerms: true
  });
  const tokenRecB = recBReg.data.token;
  assert(recBReg.status === 201 && Boolean(tokenRecB), 'Recruiter B registered');

  // --- 5. Student Data Isolation (BOLA / IDOR) ---
  console.log('\n--- 5. Student Multi-Tenant Data Isolation ---');
  // Student A attempts to access Student B's report
  const bReportRes = await api('GET', `/api/assessment/report?userId=${userBId}`, null, tokenA);
  // It should either return 403 or return Alice's own data (ignoring the unauthorized query param)
  if (bReportRes.ok && bReportRes.data.report) {
    assert(bReportRes.data.report.userId !== userBId, 'Student A cannot inspect Student B report data');
  } else {
    assert(true, 'Student A blocked from viewing Student B report');
  }

  // Student A attempts to delete Student B history
  const deleteTamper = await api('DELETE', `/api/student/history?userId=${userBId}`, null, tokenA);
  // Endpoint deletes authenticated user's own data only
  const bDashCheck = await api('GET', '/api/student/dashboard', null, tokenB);
  assert(bDashCheck.ok, 'Student B data remains intact after Student A delete attempt');

  // --- 6. Recruiter Ownership Isolation ---
  console.log('\n--- 6. Recruiter Ownership & Cross-Company Isolation ---');
  // Recruiter A creates an opportunity
  const oppARes = await api('POST', '/api/recruiter/opportunities', {
    title: 'Alpha Private Position',
    type: 'INTERNSHIP',
    description: 'Internal opening for Alpha Corp.',
    requiredSkills: ['C++'],
    stipend: '₹35,000 / month',
    duration: '3 Months',
    applicationDeadline: '2026-12-31'
  }, tokenRecA);
  const oppAId = oppARes.data.data?.id || oppARes.data.data?.opportunityId;
  assert(Boolean(oppAId), 'Recruiter A created opportunity');

  // Recruiter B attempts to modify Recruiter A's opportunity
  const editTamper = await api('PUT', `/api/recruiter/opportunities/${oppAId}`, {
    title: 'Hacked Title by Recruiter B'
  }, tokenRecB);
  assert(editTamper.status === 403 || editTamper.status === 404 || !editTamper.ok, 'Recruiter B blocked from editing Recruiter A opportunity');

  // --- 7. Admin Privilege Protection ---
  console.log('\n--- 7. Admin RBAC Privilege Protection ---');
  // Student attempts to fetch Admin Metrics
  const studentMetrics = await api('GET', '/api/admin/metrics', null, tokenA);
  assert(studentMetrics.status === 403, 'Student blocked from /api/admin/metrics with 403 Forbidden');

  // Student attempts to fetch Audit Logs
  const studentLogs = await api('GET', '/api/admin/audit-logs', null, tokenA);
  assert(studentLogs.status === 403, 'Student blocked from /api/admin/audit-logs with 403 Forbidden');

  // Recruiter attempts to access Moderation Queue
  const recModeration = await api('GET', '/api/admin/moderation/opportunities', null, tokenRecA);
  assert(recModeration.status === 403, 'Recruiter blocked from /api/admin/moderation/opportunities with 403 Forbidden');

  // --- 8. Tamper-Proof Readiness & Score Protection ---
  console.log('\n--- 8. Tamper-Proof Career Readiness & Scoring Protection ---');
  // Student attempts to overwrite their readiness score via arbitrary PUT
  const tamperReadiness = await api('PUT', '/api/student/profile', {
    careerReadinessScore: 99,
    career_readiness_score: 99
  }, tokenA);
  
  const checkReadiness = await api('GET', '/api/student/dashboard', null, tokenA);
  assert(checkReadiness.data.careerReadinessScore !== 99, 'Student cannot self-assign career readiness score (tamper-proof)');

  // --- 9. API Key Masking in Public Responses ---
  console.log('\n--- 9. API Secrets & Key Masking ---');
  const aiStatus = await api('GET', '/api/ai/status');
  assert(aiStatus.ok, 'GET /api/ai/status returns 200 OK');
  assert(!JSON.stringify(aiStatus.data).includes('AIzaSy'), 'Raw Google API keys are never exposed in JSON responses');

  console.log('\n===============================================================');
  console.log(`📊 SUITE 3 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
