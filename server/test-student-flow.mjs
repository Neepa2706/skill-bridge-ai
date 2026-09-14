/**
 * SkillBridge AI — Test Suite 1: Complete Student Flow
 * 
 * Verifies the full student journey:
 * 1.  System Health Check
 * 2.  Student Registration & Authentication
 * 3.  Fresh Dashboard Zero-State (0% readiness, empty collections)
 * 4.  Null Skill Report for Unassessed Student
 * 5.  Graceful 503 Handling when AI Key Unconfigured (No Crash, Friendly Error, canRetry: true)
 * 6.  AI Key Configuration (Sandbox / Gemini Key)
 * 7.  AI Skill Assessment Generation (MCQ, Short Answer, Coding across 4 domains)
 * 8.  Assessment Submission & Objective AI Evaluation
 * 9.  Verified Skill Report & Category Breakdown
 * 10. Personalized Course Recommendations Generation
 * 11. Starting a Recommended Course & Course Enrollment
 * 12. Learning Platform & Course Progress Tracking
 * 13. Lesson Mock Tests Catalog & Availability
 * 14. Coding Practice Arena & Sandbox Execution
 * 15. Communication Practice Studio & AI Evaluation
 * 16. Opportunities Marketplace & AI Matching
 * 17. Opportunity Bookmarking & Application Tracking
 * 18. AI Mock Interview Session Setup & Questions
 * 19. Live Mentor Directory & Mentorship Request
 * 20. Application Tracking Pipeline & User Notifications
 * 21. Data Privacy & Zero-State History Deletion
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

async function runStudentFlow() {
  console.log('===============================================================');
  console.log('🧪 SUITE 1: COMPLETE STUDENT FLOW END-TO-END VERIFICATION');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const studentEmail = `student.journey.${timestamp}@skillbridge.ai`;
  const studentPassword = 'Password123!';

  // --- Step 1: Healthcheck ---
  console.log('--- Step 1: System Health & Active Engines ---');
  const health = await api('GET', '/api/health');
  assert(health.ok && health.data.status === 'healthy', 'GET /api/health reports system healthy');
  assert(health.data.database === 'connected', 'Database reports connected');
  assert(Array.isArray(health.data.activeEngines) && health.data.activeEngines.length > 0, 'Active AI engines listed');

  // --- Step 2: Student Registration ---
  console.log('\n--- Step 2: Student Registration & Authentication ---');
  const regRes = await api('POST', '/api/auth/register/student', {
    name: 'Devin Vance',
    email: studentEmail,
    phone: '+1 555-0922',
    password: studentPassword,
    confirmPassword: studentPassword,
    collegeName: 'National Engineering Academy',
    department: 'Computer Science & Engineering',
    degree: 'B.Tech',
    currentYear: 3,
    section: 'A',
    graduationYear: 2027,
    targetRole: 'Software Developer',
    selfDeclaredLevel: 'Beginner',
    agreedToTerms: true
  });
  assert(regRes.status === 201, 'POST /api/auth/register/student returns 201 Created');
  const studentToken = regRes.data.token;
  const studentId = regRes.data.user.id;
  assert(Boolean(studentToken), 'JWT token generated and returned');
  assert(regRes.data.user.role === 'student', 'User role is student');

  // --- Step 3: Fresh Empty Dashboard ---
  console.log('\n--- Step 3: Fresh Dashboard Zero-State Verification ---');
  const dashRes = await api('GET', '/api/student/dashboard', null, studentToken);
  assert(dashRes.ok, 'GET /api/student/dashboard returns 200 OK');
  assert(dashRes.data.hasCompletedAssessment === false, 'hasCompletedAssessment is false for fresh student');
  assert(dashRes.data.careerReadinessScore === 0, 'Career readiness score is 0%');
  assert(dashRes.data.continueLearning === null, 'continueLearning is null (no fake course progress)');
  assert(dashRes.data.codingStreak?.currentStreak === 0, 'Coding streak is 0 days');
  assert(Array.isArray(dashRes.data.recommendations) && dashRes.data.recommendations.length === 0, 'Recommendations list is empty');
  assert(Array.isArray(dashRes.data.skills) && dashRes.data.skills.length === 0, 'Skills list is empty');

  // --- Step 4: Report Endpoint Returns Null ---
  console.log('\n--- Step 4: Verify Report is Null for Unassessed Student ---');
  const reportNullRes = await api('GET', '/api/assessment/report', null, studentToken);
  assert(reportNullRes.ok, 'GET /api/assessment/report returns 200 OK');
  assert(reportNullRes.data.report === null, 'Report is null before assessment is taken');

  // --- Step 5: Verify Missing Key Handling (if not configured) ---
  console.log('\n--- Step 5: Test AI Key Verification & Configuration ---');
  const initialAiStatus = await api('GET', '/api/ai/status');
  console.log(`  Current AI Engine status: configured=${initialAiStatus.data?.configured}`);

  if (!initialAiStatus.data?.configured) {
    const unconfiguredStart = await api('POST', '/api/assessment/start', {
      targetRole: 'Software Developer',
      category: 'all'
    }, studentToken);
    assert(unconfiguredStart.status === 503, 'POST /api/assessment/start returns 503 when unconfigured');
    assert(unconfiguredStart.data.canRetry === true, 'Returns canRetry: true on missing API key');
    assert(unconfiguredStart.data.error.includes('GEMINI_API_KEY'), 'Clear friendly error message delivered');
  }

  // Configure Sandbox AI Key for complete workflow testing
  const configRes = await api('POST', '/api/ai/config', {
    apiKey: 'test-sandbox-key',
    persist: false
  });
  assert(configRes.ok && configRes.data.success === true, 'POST /api/ai/config activates AI engine for testing');

  // --- Step 6: Start AI Assessment ---
  console.log('\n--- Step 6: Start Dynamic AI Skill Assessment ---');
  const startAssessRes = await api('POST', '/api/assessment/start', {
    targetRole: 'Software Developer',
    category: 'all'
  }, studentToken);
  assert(startAssessRes.ok, 'POST /api/assessment/start returns 200 OK with AI active');
  const attemptId = startAssessRes.data.attemptId;
  const questions = startAssessRes.data.questions;
  assert(Boolean(attemptId), `Assessment attempt initiated: ${attemptId}`);
  assert(Array.isArray(questions) && questions.length >= 4, `Generated ${questions?.length} dynamic questions`);

  const domains = new Set(questions.map(q => q.category || q.domain));
  console.log(`  Questions cover domains: ${Array.from(domains).join(', ')}`);
  assert(domains.size >= 3, 'Questions span Programming, Logic, Problem Solving, and Communication');

  // --- Step 7: Submit Assessment Answers ---
  console.log('\n--- Step 7: Submit Assessment Answers & Receive Evaluation ---');
  const answers = {};
  for (const q of questions) {
    if (q.questionType === 'mcq' && q.options && q.options.length > 0) {
      answers[q.id] = q.options[0];
    } else if (q.questionType === 'coding') {
      answers[q.id] = 'function findFirstUnique(arr) { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); for (const x of arr) if (m.get(x) === 1) return x; return null; }';
    } else {
      answers[q.id] = 'Ordered lock acquisition and shorter transaction boundaries eliminate cyclic deadlocks.';
    }
  }

  const submitRes = await api('POST', '/api/assessment/submit', { attemptId, answers }, studentToken);
  assert(submitRes.ok, 'POST /api/assessment/submit returns 200 OK');
  assert(typeof submitRes.data.overallScore === 'number', `Overall score generated: ${submitRes.data.overallScore}%`);
  assert(submitRes.data.categoryScores, 'Category scores present');
  assert(Array.isArray(submitRes.data.strengths) && submitRes.data.strengths.length > 0, 'Candidate strengths identified');
  assert(Array.isArray(submitRes.data.weaknesses) && submitRes.data.weaknesses.length > 0, 'Candidate weaknesses identified');

  // --- Step 8: Fetch Skill Report & Gap Analysis ---
  console.log('\n--- Step 8: Fetch Verified Skill Report ---');
  const reportRes = await api('GET', '/api/assessment/report', null, studentToken);
  assert(reportRes.ok && reportRes.data.report !== null, 'GET /api/assessment/report returns populated report');
  assert(reportRes.data.report.overallScore > 0, `Verified overall score is ${reportRes.data.report.overallScore}%`);
  assert(reportRes.data.report.overallLevel, `Report overall level: ${reportRes.data.report.overallLevel}`);

  // --- Step 9: Personalized Course Recommendations ---
  console.log('\n--- Step 9: Personalized Course Recommendations ---');
  const recRes = await api('GET', '/api/student/recommendations', null, studentToken);
  assert(recRes.ok, 'GET /api/student/recommendations returns 200 OK');
  const recommendations = recRes.data.recommendations || recRes.data;
  assert(Array.isArray(recommendations) && recommendations.length > 0, `Generated ${recommendations.length} personalized recommendations`);

  const firstRec = recommendations[0];
  console.log(`  Recommendation: "${firstRec.courseTitle || firstRec.course_title || firstRec.title}" (Reason: ${firstRec.reason || firstRec.skillCovered})`);

  // --- Step 10: Start Recommended Course ---
  console.log('\n--- Step 10: Start Recommended Course ---');
  const startRecRes = await api('POST', `/api/student/recommendations/${firstRec.id}/start`, {}, studentToken);
  assert(startRecRes.ok, `POST /api/student/recommendations/${firstRec.id}/start returns 200 OK`);

  // --- Step 11: Learning Platform & Course Progress ---
  console.log('\n--- Step 11: Learning Platform & Active Enrollment ---');
  const learningDash = await api('GET', '/api/student/learning', null, studentToken);
  assert(learningDash.ok, 'GET /api/student/learning returns 200 OK');
  const enrolledList = learningDash.data?.myCourses?.inProgress || learningDash.data?.myCourses || [];
  assert(Array.isArray(enrolledList) && enrolledList.length > 0, 'Enrolled courses list returned with active course');

  // --- Step 12: Mock Tests Catalog ---
  console.log('\n--- Step 12: Mock Tests Catalog ---');
  const mockTestsRes = await api('GET', '/api/student/mock-tests', null, studentToken);
  assert(mockTestsRes.ok, 'GET /api/student/mock-tests returns 200 OK');
  assert(Array.isArray(mockTestsRes.data) && mockTestsRes.data.length > 0, `Mock tests list contains ${mockTestsRes.data?.length} tests`);

  // --- Step 13: Coding Practice Arena ---
  console.log('\n--- Step 13: Coding Arena & Code Execution ---');
  const codingDash = await api('GET', '/api/student/coding', null, studentToken);
  assert(codingDash.ok, 'GET /api/student/coding returns 200 OK');

  const problemsRes = await api('GET', '/api/student/coding/problems', null, studentToken);
  assert(problemsRes.ok && Array.isArray(problemsRes.data), `Fetched ${problemsRes.data?.length} coding problems`);
  
  if (problemsRes.data.length > 0) {
    const testProb = problemsRes.data[0];
    const runRes = await api('POST', '/api/student/coding/run', {
      problemId: testProb.id,
      language: 'javascript',
      code: 'function solution() { return true; }'
    }, studentToken);
    assert(runRes.ok, `Executed code in sandbox for problem: "${testProb.title}"`);
  }

  // --- Step 14: Communication Practice Studio ---
  console.log('\n--- Step 14: Communication Practice & Feedback ---');
  const commDash = await api('GET', '/api/student/communication/dashboard', null, studentToken);
  assert(commDash.ok, 'GET /api/student/communication/dashboard returns 200 OK');

  const writingRes = await api('POST', '/api/student/communication/writing/evaluate', {
    languageCode: 'en',
    prompt: 'Draft an urgent email notifying stakeholders of a planned database migration window.',
    answer: 'Hi team, we will migrate the postgres database this saturday at 2am. The site will be down for 30 minutes. We have backups ready.'
  }, studentToken);
  assert(writingRes.ok, 'Submitted writing exercise and received evaluation');

  // --- Step 15: Opportunities Catalog & AI Matching ---
  console.log('\n--- Step 15: Opportunities Catalog & Matching ---');
  const oppsRes = await api('GET', '/api/opportunities', null, studentToken);
  assert(oppsRes.ok, 'GET /api/opportunities returns 200 OK');
  assert(Array.isArray(oppsRes.data.opportunities) && oppsRes.data.opportunities.length > 0, `Loaded ${oppsRes.data.opportunities.length} opportunities`);

  const testOpp = oppsRes.data.opportunities[0];

  // Bookmark opportunity
  const saveRes = await api('POST', `/api/opportunities/${testOpp.id}/save`, {}, studentToken);
  assert(saveRes.ok, `POST /api/opportunities/${testOpp.id}/save bookmarks opportunity`);

  // Apply to opportunity
  const applyRes = await api('POST', '/api/opportunities/applications', {
    opportunity_id: testOpp.id,
    notes: 'Excited to apply with verified SkillBridge scores.'
  }, studentToken);
  assert(applyRes.ok, `POST /api/opportunities/applications applied to "${testOpp.title}"`);

  // --- Step 16: AI Mock Interview Session ---
  console.log('\n--- Step 16: AI Mock Interview Session ---');
  const intDash = await api('GET', '/api/interview/dashboard', null, studentToken);
  assert(intDash.ok, 'GET /api/interview/dashboard returns 200 OK');

  const startIntRes = await api('POST', '/api/interview/start', {
    interviewType: 'TECHNICAL',
    difficulty: 'INTERMEDIATE',
    targetRole: 'Software Developer',
    duration: 15,
    questionCount: 3
  }, studentToken);
  assert(startIntRes.ok, 'POST /api/interview/start initiates mock interview session');

  // --- Step 17: Live Mentorship Support ---
  console.log('\n--- Step 17: Mentorship Directory & Guidance Request ---');
  const mentorsRes = await api('GET', '/api/mentors', null, studentToken);
  assert(mentorsRes.ok && Array.isArray(mentorsRes.data?.data), 'GET /api/mentors loads verified mentors');

  const mentorsList = mentorsRes.data.data;
  if (mentorsList.length > 0) {
    const targetMentor = mentorsList[0];
    const reqMentorRes = await api('POST', '/api/mentorship-requests', {
      mentorId: targetMentor.userId || targetMentor.id,
      topic: 'Career guidance',
      description: 'Looking for guidance on preparing for full-stack engineering interviews.',
      preferredDate: '2026-10-01',
      preferredTime: '18:00'
    }, studentToken);
    assert(reqMentorRes.ok, `Requested mentorship session with ${targetMentor.name}`);
  }

  // --- Step 18: Application Tracking & Notifications ---
  console.log('\n--- Step 18: Application Tracking & Notifications ---');
  const myApps = await api('GET', '/api/student/applications', null, studentToken);
  assert(myApps.ok && Array.isArray(myApps.data) && myApps.data.length > 0, 'Tracked application confirmed in pipeline');

  const notifs = await api('GET', '/api/notifications', null, studentToken);
  assert(notifs.ok && typeof notifs.data.data?.unreadCount === 'number', 'GET /api/notifications returns unread counts');

  // --- Step 19: Verify Updated Post-Assessment Dashboard ---
  console.log('\n--- Step 19: Verify Dashboard Shows Genuine Assessment Results ---');
  const postDash = await api('GET', '/api/student/dashboard', null, studentToken);
  assert(postDash.data.hasCompletedAssessment === true, 'hasCompletedAssessment is TRUE after assessment');
  assert(postDash.data.careerReadinessScore > 0, `Career readiness score updated: ${postDash.data.careerReadinessScore}%`);
  assert(Array.isArray(postDash.data.recommendations) && postDash.data.recommendations.length > 0, 'Dashboard recommendations populated');

  // --- Step 20: Data Privacy & Zero-State History Reset ---
  console.log('\n--- Step 20: Data Privacy & History Deletion ---');
  const deleteHist = await api('DELETE', '/api/student/history', null, studentToken);
  assert(deleteHist.ok && deleteHist.data.success === true, 'DELETE /api/student/history succeeded');

  const resetDash = await api('GET', '/api/student/dashboard', null, studentToken);
  assert(resetDash.ok, 'Fetched student dashboard after history reset');
  assert(resetDash.data.hasCompletedAssessment === false, 'hasCompletedAssessment reset to FALSE');
  assert(resetDash.data.careerReadinessScore === 0, 'Career readiness score reset to 0%');
  assert(resetDash.data.codingStreak.currentStreak === 0, 'Coding streak reset to 0');
  assert(Array.isArray(resetDash.data.recommendations) && resetDash.data.recommendations.length === 0, 'Recommendations reset to empty array');
  assert(Array.isArray(resetDash.data.skills) && resetDash.data.skills.length === 0, 'Skills reset to empty array');

  console.log('\n===============================================================');
  console.log(`📊 SUITE 1 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentFlow().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
