// ============================================================================
// SkillBridge AI — Automated End-to-End Test Suite for Steps 13 to 18
// ============================================================================

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting SkillBridge AI Steps 13 - 18 End-to-End Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details}`);
      failed++;
    }
  }

  // --- 0. Step 18 Health Check ---
  console.log('\n--- 0. Step 18 Health & System Status ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert(healthRes.ok, 'GET /api/health returns 200 OK');
    assert(health.status === 'healthy', 'Health status is healthy');
    assert(health.database === 'connected', 'Database is connected');
    assert(Array.isArray(health.activeEngines) && health.activeEngines.length >= 8, 'Active engines list populated');
  } catch (e) {
    assert(false, 'GET /api/health', e.message);
  }

  // --- Auth Setup ---
  let studentToken = '';
  let mentorToken = '';
  let recruiterToken = '';
  let collegeToken = '';
  let adminToken = '';

  console.log('\n--- Authentication Tokens for All 5 Roles ---');
  try {
    const sRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
    });
    studentToken = (await sRes.json()).token;
    assert(!!studentToken, 'Student login successful');

    const mRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@skillbridge.ai', password: 'password123' })
    });
    mentorToken = (await mRes.json()).token;
    assert(!!mentorToken, 'Mentor login successful');

    const rRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@skillbridge.ai', password: 'password123' })
    });
    recruiterToken = (await rRes.json()).token;
    assert(!!recruiterToken, 'Recruiter login successful');

    const cRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'college@skillbridge.ai', password: 'password123' })
    });
    collegeToken = (await cRes.json()).token;
    assert(!!collegeToken, 'College login successful');

    const aRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@skillbridge.ai', password: 'password123' })
    });
    adminToken = (await aRes.json()).token;
    assert(!!adminToken, 'Admin login successful');
  } catch (e) {
    assert(false, 'Role Authentication', e.message);
  }

  // --- Step 13: AI Mock Interview System ---
  console.log('\n--- Step 13: AI Mock Interview System ---');
  let mockSessionId = '';
  try {
    // Dashboard
    const dashRes = await fetch(`${BASE_URL}/api/interview/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const dash = await dashRes.json();
    assert(dashRes.ok && dash.success, 'GET /api/interview/dashboard returns 200 OK');
    assert(!!dash.data?.summaryCards, 'Mock interview metrics loaded');
    assert(dash.data?.disclaimer?.includes('practice and preparation only'), 'Prominent disclaimer present');

    // Start Session
    const startRes = await fetch(`${BASE_URL}/api/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        targetRole: 'Software Developer',
        interviewType: 'TECHNICAL',
        difficulty: 'INTERMEDIATE',
        questionCount: 3
      })
    });
    const start = await startRes.json();
    assert(startRes.ok && start.success, 'POST /api/interview/start initiates session');
    mockSessionId = start.data?.session?.id || start.data?.sessionId;
    assert(!!mockSessionId, `Session created with ID: ${mockSessionId}`);

    // Get Session Questions
    const sessionRes = await fetch(`${BASE_URL}/api/interview/session/${mockSessionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const sessionData = await sessionRes.json();
    assert(sessionRes.ok && sessionData.success, 'GET /api/interview/session/:id retrieves questions');
    const questions = sessionData.data?.questions || [];
    assert(questions.length >= 3, `Session has ${questions.length} questions`);

    // Submit Answer to Q1
    if (questions.length > 0) {
      const q1 = questions[0];
      const answerRes = await fetch(`${BASE_URL}/api/interview/session/${mockSessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          questionId: q1.id,
          answerText: 'In Python, a list is a dynamic array with O(1) random access, whereas a linked list consists of nodes with pointers requiring O(N) access but O(1) insertions once located.',
          timeTakenSeconds: 45
        })
      });
      const answerJson = await answerRes.json();
      assert(answerRes.ok && answerJson.success, 'POST /api/interview/session/:id/answer evaluates rubric');
      assert(typeof answerJson.data?.score === 'number' && answerJson.data?.score >= 0, 'Score is 0-100 numeric');
      assert(!!answerJson.data?.feedback, 'Rubric feedback provided');
    }

    // Finish Session
    const finishRes = await fetch(`${BASE_URL}/api/interview/session/${mockSessionId}/finish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const finishJson = await finishRes.json();
    assert(finishRes.ok && finishJson.success, 'POST /api/interview/session/:id/finish completes interview');
    assert(finishJson.data?.finalScore !== undefined, `Final overall score computed: ${finishJson.data?.finalScore}`);

    // Result Scorecard
    const resultRes = await fetch(`${BASE_URL}/api/interview/result/${mockSessionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const resultJson = await resultRes.json();
    assert(resultRes.ok && resultJson.success, 'GET /api/interview/result/:id retrieves scorecard');
    assert((resultJson.data?.disclaimer || resultJson.disclaimer || resultJson.notice || '').toLowerCase().includes('guarantee job selection'), 'Disclaimer on result scorecard verified');

    // History & Analytics
    const histRes = await fetch(`${BASE_URL}/api/interview/history`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await histRes.json()).success, 'GET /api/interview/history retrieves session history');

    const anaRes = await fetch(`${BASE_URL}/api/interview/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await anaRes.json()).success, 'GET /api/interview/analytics calculates radar scores');
  } catch (e) {
    assert(false, 'Step 13 Mock Interview API', e.message);
  }

  // --- Step 14: Mentor Support ---
  console.log('\n--- Step 14: Mentor Dashboard & Live Support ---');
  try {
    // Student Directory of Mentors
    const dirRes = await fetch(`${BASE_URL}/api/mentor/directory`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const dir = await dirRes.json();
    assert(dirRes.ok && dir.success, 'GET /api/mentor/directory loads mentors');
    const mentors = dir.data || [];
    assert(mentors.length > 0, `Found ${mentors.length} active mentors`);

    // Student Request Mentorship
    const reqRes = await fetch(`${BASE_URL}/api/student/mentorship-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        mentorId: mentors[0]?.userId || 'usr-mentor-1',
        topic: 'Full-Stack Architecture Prep',
        message: 'Looking for guidance on system design interviews.',
        preferredTime: 'Thursday 4:00 PM'
      })
    });
    const reqJson = await reqRes.json();
    assert(reqRes.ok && reqJson.success, 'POST /api/student/mentorship-requests submits request');

    // Mentor Dashboard
    const mDashRes = await fetch(`${BASE_URL}/api/mentor/dashboard`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    const mDash = await mDashRes.json();
    assert(mDashRes.ok && mDash.success, 'GET /api/mentor/dashboard loads mentor metrics');
    assert(!!mDash.data?.summaryCards, 'Mentor summary cards populated');

    // Mentor Sessions
    const mSessionsRes = await fetch(`${BASE_URL}/api/mentor/sessions`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    assert((await mSessionsRes.json()).success, 'GET /api/mentor/sessions returns scheduled sessions');

    // Mentor Feedback
    const fbRes = await fetch(`${BASE_URL}/api/mentor/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mentorToken}` },
      body: JSON.stringify({
        sessionId: 'ses-1',
        studentId: 'usr-student-1',
        strengths: 'Excellent grasp of algorithmic time complexity.',
        weaknesses: 'Needs more practice with live whiteboarding communication.',
        recommendedPractice: 'Solve 3 graph traversal problems.',
        advice: 'Structure responses with concrete tradeoffs.',
        rating: 4.8
      })
    });
    assert((await fbRes.json()).success, 'POST /api/mentor/feedback submits feedback');
  } catch (e) {
    assert(false, 'Step 14 Mentor Support API', e.message);
  }

  // --- Step 15: Recruiter Dashboard ---
  console.log('\n--- Step 15: Recruiter Dashboard & Talent Pipeline ---');
  try {
    // Recruiter Dashboard
    const rDashRes = await fetch(`${BASE_URL}/api/recruiter/dashboard`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    const rDash = await rDashRes.json();
    assert(rDashRes.ok && rDash.success, 'GET /api/recruiter/dashboard loads recruiter metrics');
    assert(!!rDash.data?.summaryCards, 'Recruiter summary cards present');

    // Company Profile GET & PUT
    const profRes = await fetch(`${BASE_URL}/api/recruiter/company-profile`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert((await profRes.json()).success, 'GET /api/recruiter/company-profile returns company details');

    const updateProfRes = await fetch(`${BASE_URL}/api/recruiter/company-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        companyName: 'Nexus AI Labs',
        industry: 'Enterprise AI & Cloud Infrastructure'
      })
    });
    assert((await updateProfRes.json()).success, 'PUT /api/recruiter/company-profile updates company details');

    // Create Opportunity (Starts as PENDING)
    const oppRes = await fetch(`${BASE_URL}/api/recruiter/opportunities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        title: 'Cloud Infrastructure Engineering Intern',
        type: 'INTERNSHIP',
        description: 'Build robust cloud deployment pipelines and container services.',
        requiredSkills: ['Python', 'Docker', 'REST API', 'SQL'],
        applicationDeadline: '2026-11-30'
      })
    });
    const oppJson = await oppRes.json();
    assert(oppRes.ok && oppJson.success, 'POST /api/recruiter/opportunities creates opportunity');
    assert(oppJson.data?.verificationStatus === 'PENDING', 'New opportunity created as PENDING verification');

    // List Opportunities
    const listOppRes = await fetch(`${BASE_URL}/api/recruiter/opportunities`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert((await listOppRes.json()).success, 'GET /api/recruiter/opportunities lists postings');

    // Applications & Status Update
    const appsRes = await fetch(`${BASE_URL}/api/recruiter/applications`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    const apps = (await appsRes.json()).data || [];
    assert(Array.isArray(apps), 'GET /api/recruiter/applications retrieves applicant pipeline');

    if (apps.length > 0) {
      const app1 = apps[0];
      const statusRes = await fetch(`${BASE_URL}/api/recruiter/applications/${app1.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterToken}` },
        body: JSON.stringify({ status: 'SHORTLISTED', notes: 'Strong coding arena track record' })
      });
      assert((await statusRes.json()).success, 'PUT /api/recruiter/applications/:id/status updates stage');
    }

    // Candidate Skill Breakdown
    const candSkillsRes = await fetch(`${BASE_URL}/api/recruiter/candidates/usr-student-1/skills`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    const candSkills = await candSkillsRes.json();
    assert(candSkillsRes.ok && candSkills.success, 'GET /api/recruiter/candidates/:id/skills compares skills');
    assert(candSkills.data?.comparison?.length > 0, 'Skill comparison items present');

    // Schedule Interview
    const intRes = await fetch(`${BASE_URL}/api/recruiter/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recruiterToken}` },
      body: JSON.stringify({
        candidateId: 'usr-student-1',
        opportunityId: 'opp-1',
        scheduledDate: '2026-10-15',
        scheduledTime: '15:00',
        durationMinutes: 45,
        interviewType: 'TECHNICAL'
      })
    });
    assert((await intRes.json()).success, 'POST /api/recruiter/interviews schedules interview');

    const getIntRes = await fetch(`${BASE_URL}/api/recruiter/interviews`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert((await getIntRes.json()).success, 'GET /api/recruiter/interviews returns scheduled interviews');
  } catch (e) {
    assert(false, 'Step 15 Recruiter Dashboard API', e.message);
  }

  // --- Step 16: College & Admin Governance ---
  console.log('\n--- Step 16: College & Admin Governance ---');
  try {
    // College Dashboard
    const colDashRes = await fetch(`${BASE_URL}/api/college/dashboard`, {
      headers: { Authorization: `Bearer ${collegeToken}` }
    });
    assert((await colDashRes.json()).success, 'GET /api/college/dashboard loads department metrics');

    // College Students
    const colStudRes = await fetch(`${BASE_URL}/api/college/students`, {
      headers: { Authorization: `Bearer ${collegeToken}` }
    });
    assert((await colStudRes.json()).success, 'GET /api/college/students returns student roster');

    // Admin Metrics
    const admMetricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert((await admMetricsRes.json()).success, 'GET /api/admin/metrics returns system metrics');

    // Admin Opportunity Moderation Queue
    const modRes = await fetch(`${BASE_URL}/api/admin/moderation/opportunities`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const modOpps = (await modRes.json()).data || [];
    assert(Array.isArray(modOpps), 'GET /api/admin/moderation/opportunities returns queue');

    // Approve an opportunity
    if (modOpps.length > 0) {
      const oppToMod = modOpps[0];
      const approveRes = await fetch(`${BASE_URL}/api/admin/moderation/opportunities/${oppToMod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'APPROVE', notes: 'Meets campus eligibility requirements' })
      });
      assert((await approveRes.json()).success, `PUT /api/admin/moderation/opportunities/${oppToMod.id} approves opportunity`);
    }

    // Admin Company Verification
    const compRes = await fetch(`${BASE_URL}/api/admin/companies`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const comps = (await compRes.json()).data || [];
    assert(comps.length > 0, 'GET /api/admin/companies lists partner companies');

    if (comps.length > 0) {
      const vRes = await fetch(`${BASE_URL}/api/admin/companies/${comps[0].id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      assert((await vRes.json()).success, 'PUT /api/admin/companies/:id/verify grants accreditation');
    }

    // Admin Audit Logs
    const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert((await auditRes.json()).success, 'GET /api/admin/audit-logs retrieves security audit trails');
  } catch (e) {
    assert(false, 'Step 16 College & Admin API', e.message);
  }

  // --- Step 17: Notifications & Reports ---
  console.log('\n--- Step 17: Notifications, Reports & Analytics ---');
  try {
    // Notifications list & preferences
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await notifRes.json()).success, 'GET /api/notifications returns user alerts');

    const markAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await markAllRes.json()).success, 'PUT /api/notifications/read-all marks all read');

    const prefRes = await fetch(`${BASE_URL}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await prefRes.json()).success, 'GET /api/notifications/preferences returns alert channels');

    const updatePrefRes = await fetch(`${BASE_URL}/api/notifications/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ emailAlerts: true, inAppAlerts: true, opportunityAlerts: true })
    });
    assert((await updatePrefRes.json()).success, 'PUT /api/notifications/preferences updates alert channels');

    // All 5 Persona Reports
    const repStudent = await fetch(`${BASE_URL}/api/reports/student`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await repStudent.json()).success, 'GET /api/reports/student generates portfolio report');

    const repMentor = await fetch(`${BASE_URL}/api/reports/mentor`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    assert((await repMentor.json()).success, 'GET /api/reports/mentor generates coaching report');

    const repRecruiter = await fetch(`${BASE_URL}/api/reports/recruiter`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert((await repRecruiter.json()).success, 'GET /api/reports/recruiter generates pipeline report');

    const repCollege = await fetch(`${BASE_URL}/api/reports/college`, {
      headers: { Authorization: `Bearer ${collegeToken}` }
    });
    assert((await repCollege.json()).success, 'GET /api/reports/college generates department report');

    const repAdmin = await fetch(`${BASE_URL}/api/reports/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert((await repAdmin.json()).success, 'GET /api/reports/admin generates compliance report');

    // Macro Analytics
    const repAnalytics = await fetch(`${BASE_URL}/api/reports/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert((await repAnalytics.json()).success, 'GET /api/reports/analytics computes placement charts');
  } catch (e) {
    assert(false, 'Step 17 Notifications & Reports API', e.message);
  }

  // --- Regression Check on Steps 1 - 12 ---
  console.log('\n--- Regression Verification (Steps 1 - 12) ---');
  try {
    // Step 3 Assessment
    const assessRes = await fetch(`${BASE_URL}/api/assessment/questions?targetRole=Software%20Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(assessRes.ok, 'Step 3: Adaptive assessment questions API active');

    // Step 7 Learning
    const crsRes = await fetch(`${BASE_URL}/api/learning/courses`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(crsRes.ok, 'Step 7: Learning courses API active');

    // Step 9 Coding
    const codRes = await fetch(`${BASE_URL}/api/coding/problems`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(codRes.ok, 'Step 9: Coding arena problems API active');

    // Step 10 Communication
    const commRes = await fetch(`${BASE_URL}/api/communication/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(commRes.ok, 'Step 10: Multilingual communication dashboard API active');

    // Step 11 Opportunities
    const oppMarketRes = await fetch(`${BASE_URL}/api/opportunities`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(oppMarketRes.ok, 'Step 11: Opportunities marketplace API active');

    // Step 12 Matching
    const matchRes = await fetch(`${BASE_URL}/api/opportunities/matches`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(matchRes.ok, 'Step 12: AI Opportunity matching API active');
  } catch (e) {
    assert(false, 'Regression Verification Steps 1-12', e.message);
  }

  console.log(`\n=======================================================`);
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
