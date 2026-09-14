/**
 * SkillBridge AI — Test Suite 2: Multi-Role Workflows
 * 
 * Verifies end-to-end workflows across all 4 system roles:
 * 1. Mentor Workflow:
 *    - Registration & Verification
 *    - Dashboard & Availability Management
 *    - Reviewing Student Guidance Requests
 *    - Session Scheduling & Mentorship Feedback
 * 
 * 2. Recruiter Workflow:
 *    - Company Registration & Profile Management
 *    - Opportunity Posting & Required Skills Specification
 *    - Recruiter Dashboard & Applicant Pipeline
 *    - Verified Skills Dossier Inspection
 *    - Candidate Interview Scheduling
 * 
 * 3. College Governance Workflow:
 *    - Institutional Registration
 *    - Placement & Department Analytics Dashboard
 *    - Institutional Critical Skill Gaps & Readiness Metrics
 * 
 * 4. System Administrator Governance Workflow:
 *    - Secure Admin Account Bootstrapping (Protected Secret)
 *    - System-Wide Health & Usage Metrics
 *    - Opportunity Moderation & Verification Approval
 *    - Enterprise Partner Verification & Accreditation
 *    - Security Audit Logs & Compliance Verification
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

async function runRolesWorkflow() {
  console.log('===============================================================');
  console.log('🧪 SUITE 2: MULTI-ROLE WORKFLOWS VERIFICATION');
  console.log('===============================================================\n');

  const timestamp = Date.now();

  // ==========================================================================
  // 1. MENTOR FLOW
  // ==========================================================================
  console.log('--- 1. MENTOR WORKFLOW ---');
  const mentorEmail = `mentor.${timestamp}@skillbridge.ai`;
  const mentorPassword = 'Password123!';

  // Mentor Registration
  const mentorReg = await api('POST', '/api/auth/register/mentor', {
    name: 'Dr. Aris Thorne',
    email: mentorEmail,
    phone: '+1 555-0811',
    designation: 'Staff Distributed Systems Engineer',
    expertise: 'Distributed Systems, High-Concurrency Go, Architecture',
    experienceYears: 11,
    password: mentorPassword,
    confirmPassword: mentorPassword,
    agreedToTerms: true
  });
  assert(mentorReg.status === 201, 'POST /api/auth/register/mentor returns 201 Created');
  const mentorToken = mentorReg.data.token;
  const mentorUserId = mentorReg.data.user.id;
  assert(Boolean(mentorToken), 'Mentor JWT token issued');
  assert(mentorReg.data.user.role === 'mentor', 'User role assigned as mentor');

  // Mentor Dashboard
  const mentorDash = await api('GET', '/api/mentor/dashboard', null, mentorToken);
  assert(mentorDash.ok && mentorDash.data.success, 'GET /api/mentor/dashboard loads mentor metrics');
  assert(mentorDash.data.data?.mentor !== undefined, 'Mentor profile structure present');

  // Mentor Requests Queue
  const mentorReqs = await api('GET', '/api/mentor/mentorship-requests', null, mentorToken);
  assert(mentorReqs.ok && mentorReqs.data.success, 'GET /api/mentor/mentorship-requests loads requests list');

  // Single Mentor Directory Lookup
  const mentorList = await api('GET', '/api/mentors', null, mentorToken);
  assert(mentorList.ok && Array.isArray(mentorList.data?.data), 'GET /api/mentors returns mentor directory');

  // ==========================================================================
  // 2. RECRUITER FLOW
  // ==========================================================================
  console.log('\n--- 2. RECRUITER WORKFLOW ---');
  const recruiterEmail = `recruiter.${timestamp}@skillbridge.ai`;
  const recruiterPassword = 'Password123!';

  // Recruiter Registration
  const recruiterReg = await api('POST', '/api/auth/register/recruiter', {
    companyName: 'Vertex AI Cloud Systems',
    companyEmail: recruiterEmail,
    recruiterName: 'Elena Rostova',
    designation: 'Director of University Talent',
    phone: '+1 555-0733',
    industry: 'Cloud Infrastructure & AI',
    website: 'https://vertexai-systems.example',
    password: recruiterPassword,
    confirmPassword: recruiterPassword,
    agreedToTerms: true
  });
  assert(recruiterReg.status === 201, 'POST /api/auth/register/recruiter returns 201 Created');
  const recruiterToken = recruiterReg.data.token;
  assert(Boolean(recruiterToken), 'Recruiter JWT token issued');
  assert(recruiterReg.data.user.role === 'recruiter', 'User role assigned as recruiter');

  // Get & Update Company Profile
  const compProfile = await api('GET', '/api/recruiter/company-profile', null, recruiterToken);
  assert(compProfile.ok && compProfile.data.success, 'GET /api/recruiter/company-profile returns company profile');

  const updateComp = await api('PUT', '/api/recruiter/company-profile', {
    companyName: 'Vertex AI Cloud Systems Inc.',
    industry: 'Enterprise Cloud & Machine Learning',
    website: 'https://vertex-cloud.example',
    description: 'Pioneering next-generation distributed inference clusters.',
    location: 'Bengaluru & San Francisco',
    companySize: '500-1000 Employees'
  }, recruiterToken);
  assert(updateComp.ok && updateComp.data.success, 'PUT /api/recruiter/company-profile updates company profile');

  // Post New Opportunity
  const postOpp = await api('POST', '/api/recruiter/opportunities', {
    title: 'Distributed Systems Software Engineer Intern',
    type: 'INTERNSHIP',
    description: 'Design and deploy high-throughput caching and gRPC microservices.',
    requiredSkills: ['Go', 'Distributed Systems', 'Docker'],
    preferredSkills: ['Kubernetes', 'Redis'],
    eligibility: 'Graduating 2026/2027 Batch',
    qualification: 'B.Tech / B.E. in Computer Science',
    branch: 'Computer Science, IT',
    academicYear: 'Year 3 or Year 4',
    location: 'Remote / Bengaluru',
    workMode: 'REMOTE',
    stipend: '₹45,000 / month',
    duration: '6 Months',
    applicationDeadline: '2026-11-30'
  }, recruiterToken);
  assert(postOpp.ok && postOpp.data.success, 'POST /api/recruiter/opportunities creates new opportunity posting');
  const createdOppId = postOpp.data.data?.id || postOpp.data.data?.opportunityId;
  assert(Boolean(createdOppId), `Opportunity posted with ID: ${createdOppId}`);

  // Recruiter Dashboard
  const recruiterDash = await api('GET', '/api/recruiter/dashboard', null, recruiterToken);
  assert(recruiterDash.ok && recruiterDash.data.success, 'GET /api/recruiter/dashboard loads hiring pipeline metrics');

  // Recruiter Applications List
  const recruiterApps = await api('GET', '/api/recruiter/applications', null, recruiterToken);
  assert(recruiterApps.ok && recruiterApps.data.success, 'GET /api/recruiter/applications retrieves applicant dossier');

  // Schedule Interview
  const schedInt = await api('POST', '/api/recruiter/interviews', {
    candidateId: mentorUserId,
    opportunityId: createdOppId,
    scheduledDate: '2026-10-15',
    scheduledTime: '14:00',
    round: 'Round 1 - Technical Architecture',
    interviewers: 'Elena Rostova, Dr. Aris Thorne'
  }, recruiterToken);
  assert(schedInt.ok && schedInt.data.success, 'POST /api/recruiter/interviews creates scheduled interview');

  // ==========================================================================
  // 3. COLLEGE GOVERNANCE FLOW
  // ==========================================================================
  console.log('\n--- 3. COLLEGE INSTITUTION WORKFLOW ---');
  const collegeEmail = `college.${timestamp}@skillbridge.ai`;
  const collegePassword = 'Password123!';

  // College Registration
  const collegeReg = await api('POST', '/api/auth/register/college', {
    institutionName: 'St. Jude Institute of Technology',
    departmentName: 'Department of Computer Science and Engineering',
    officialEmail: collegeEmail,
    contactPersonName: 'Prof. Marcus Brody',
    designation: 'Dean of Placements & Training',
    phone: '+1 555-0644',
    password: collegePassword,
    confirmPassword: collegePassword,
    agreedToTerms: true
  });
  assert(collegeReg.status === 201, 'POST /api/auth/register/college returns 201 Created');
  const collegeToken = collegeReg.data.token;
  assert(Boolean(collegeToken), 'College JWT token issued');
  assert(collegeReg.data.user.role === 'college', 'User role assigned as college');

  // College Dashboard & Analytics
  const collegeDash = await api('GET', '/api/college/dashboard', null, collegeToken);
  assert(collegeDash.ok && collegeDash.data.success, 'GET /api/college/dashboard loads institutional readiness analytics');
  assert(collegeDash.data.data?.metrics !== undefined, 'College metrics populated');
  assert(Array.isArray(collegeDash.data.data?.departmentList), 'Department readiness breakdown present');

  // ==========================================================================
  // 4. PLATFORM ADMINISTRATOR GOVERNANCE FLOW
  // ==========================================================================
  console.log('\n--- 4. PLATFORM ADMINISTRATOR GOVERNANCE WORKFLOW ---');
  const adminEmail = `admin.${timestamp}@skillbridge.ai`;
  const adminPassword = 'Password123!';

  // Secure Admin Bootstrapping with Secret
  const adminReg = await api('POST', '/api/auth/register/admin', {
    name: 'Chief Platform Auditor',
    email: adminEmail,
    phone: '+1 555-0100',
    password: adminPassword,
    confirmPassword: adminPassword,
    adminSecret: 'skillbridge-admin-key-2026',
    agreedToTerms: true
  });
  assert(adminReg.status === 201, 'POST /api/auth/register/admin with valid secret returns 201 Created');
  const adminToken = adminReg.data.token;
  assert(Boolean(adminToken), 'Admin JWT token issued');
  assert(adminReg.data.user.role === 'admin', 'User role assigned as admin');

  // Admin System Metrics
  const adminMetrics = await api('GET', '/api/admin/metrics', null, adminToken);
  assert(adminMetrics.ok && adminMetrics.data.success, 'GET /api/admin/metrics retrieves system-wide health and usage stats');
  assert(adminMetrics.data.data?.metrics?.totalUsers > 0, `Total users count reported: ${adminMetrics.data.data?.metrics?.totalUsers}`);
  assert(Array.isArray(adminMetrics.data.data?.auditLogs), 'Audit logs stream present');

  // Opportunity Moderation Queue
  const modQueue = await api('GET', '/api/admin/moderation/opportunities', null, adminToken);
  assert(modQueue.ok && modQueue.data.success, 'GET /api/admin/moderation/opportunities returns pending postings');

  // Moderate & Approve Opportunity
  if (createdOppId) {
    const approveOpp = await api('PUT', `/api/admin/moderation/opportunities/${createdOppId}`, {
      action: 'APPROVE',
      notes: 'Verified enterprise hiring compliance and clear salary disclosures.'
    }, adminToken);
    assert(approveOpp.ok && approveOpp.data.success, `Approved opportunity ${createdOppId}`);
  }

  // Company Partner Verification
  const companiesList = await api('GET', '/api/admin/companies', null, adminToken);
  assert(companiesList.ok && companiesList.data.success, 'GET /api/admin/companies lists partner companies');

  if (Array.isArray(companiesList.data?.data) && companiesList.data.data.length > 0) {
    const targetComp = companiesList.data.data[0];
    const verifyComp = await api('PUT', `/api/admin/companies/${targetComp.id}/verify`, {
      status: 'VERIFIED'
    }, adminToken);
    assert(verifyComp.ok && verifyComp.data.success, `Verified partner company: ${targetComp.name || targetComp.company_name}`);
  }

  // Security Audit Logs
  const auditLogs = await api('GET', '/api/admin/audit-logs', null, adminToken);
  assert(auditLogs.ok && auditLogs.data.success, 'GET /api/admin/audit-logs returns immutable compliance ledger');
  assert(Array.isArray(auditLogs.data.data) && auditLogs.data.data.length > 0, `Verified ${auditLogs.data.data?.length} security audit entries`);

  // User Administration
  const usersList = await api('GET', '/api/admin/users', null, adminToken);
  assert(usersList.ok && usersList.data.success, 'GET /api/admin/users lists all accounts across roles');

  const studentsList = await api('GET', '/api/admin/students', null, adminToken);
  assert(studentsList.ok && studentsList.data.success, 'GET /api/admin/students lists student roster');

  console.log('\n===============================================================');
  console.log(`📊 SUITE 2 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRolesWorkflow().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
