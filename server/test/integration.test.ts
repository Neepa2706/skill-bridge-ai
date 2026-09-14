const BASE = 'http://localhost:5000/api';

async function request(method: string, path: string, body?: any, token?: string) {
  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data: any = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function runAllTests() {
  console.log('\n🧪 Starting SkillBridge AI Automated Integration Test Suite...\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  try {
    // 1. HEALTHCHECK
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.status === 'online', 'Server healthcheck returns online status');

    // 2. AUTHENTICATION & ROLE SWITCHING (All 5 Roles)
    const studentAuth = await request('POST', '/auth/demo-switch', { role: 'student' });
    assert(studentAuth.status === 200 && !!studentAuth.data.token, 'Student demo auth succeeds with JWT');
    const studentToken = studentAuth.data.token;

    const collegeAuth = await request('POST', '/auth/demo-switch', { role: 'college' });
    assert(collegeAuth.status === 200 && collegeAuth.data.user.role === 'college', 'College demo auth succeeds');

    const recruiterAuth = await request('POST', '/auth/demo-switch', { role: 'recruiter' });
    assert(recruiterAuth.status === 200 && recruiterAuth.data.user.role === 'recruiter', 'Recruiter demo auth succeeds');

    const mentorAuth = await request('POST', '/auth/demo-switch', { role: 'mentor' });
    assert(mentorAuth.status === 200 && mentorAuth.data.user.role === 'mentor', 'Mentor demo auth succeeds');

    const adminAuth = await request('POST', '/auth/demo-switch', { role: 'admin' });
    assert(adminAuth.status === 200 && adminAuth.data.user.role === 'admin', 'Admin demo auth succeeds');
    const adminToken = adminAuth.data.token;

    // 3. STUDENT DASHBOARD & ROADMAP
    const dashboard = await request('GET', '/student/dashboard', undefined, studentToken);
    assert(dashboard.status === 200 && dashboard.data.careerReadinessScore > 0, 'Student dashboard returns career readiness score');
    assert(!!dashboard.data.gapAnalysis, 'Dashboard contains skill gap matrix');
    assert(!!dashboard.data.continueLearning, 'Dashboard provides exact continue learning lesson');

    const roadmap = await request('GET', '/student/roadmap', undefined, studentToken);
    assert(roadmap.status === 200 && Array.isArray(roadmap.data.steps) && roadmap.data.steps.length === 10, 'Continuous career roadmap has 10 milestones');

    // 4. AI ASSESSMENT ENGINE & SAFE EXAM
    const asmtStart = await request('POST', '/assessment/start', { targetRole: 'Software Developer' }, studentToken);
    assert(asmtStart.status === 200 && asmtStart.data.questions.length >= 6, 'AI Assessment generator produces questions');
    const attemptId = asmtStart.data.attemptId;

    const mockAnswers: Record<string, string> = {};
    for (const q of asmtStart.data.questions) {
      mockAnswers[q.id] = q.options[0];
    }
    const asmtSubmit = await request('POST', '/assessment/submit', { attemptId, answers: mockAnswers }, studentToken);
    assert(asmtSubmit.status === 200 && asmtSubmit.data.overallScore !== undefined, 'Assessment submission evaluates score');
    assert(!!asmtSubmit.data.skillBreakdown, 'Skill report breakdown generated');

    const proctorLog = await request('POST', '/assessment/proctor-log', { attemptId, violationType: 'window_blur', details: 'Focus lost' }, studentToken);
    assert(proctorLog.status === 200 && proctorLog.data.success === true, 'Proctoring integrity log recorded');

    // 5. LEARNING PLATFORM & LESSON TEST GATING
    const courses = await request('GET', '/learning/courses', undefined, studentToken);
    assert(courses.status === 200 && courses.data.length >= 3, 'Course catalog lists courses with progress');

    const recCourses = await request('GET', '/learning/courses/recommended', undefined, studentToken);
    assert(recCourses.status === 200 && Array.isArray(recCourses.data.requiredCourses), 'Course recommendation prioritizes critical gaps');

    const lessonQuiz = await request('POST', '/learning/lessons/les-dsa-1/test/generate', undefined, studentToken);
    assert(lessonQuiz.status === 200 && lessonQuiz.data.questions.length >= 3, 'AI generates lesson test questions');

    const quizAnswers: Record<string, string> = {};
    for (const ref of lessonQuiz.data._referenceKey) {
      quizAnswers[ref.id] = ref.correctAnswer;
    }
    const quizSubmit = await request('POST', '/learning/lessons/les-dsa-1/test/submit', { answers: quizAnswers, referenceKey: lessonQuiz.data._referenceKey }, studentToken);
    assert(quizSubmit.status === 200 && quizSubmit.data.passed === true, 'Passing lesson test completes lesson and unlocks next milestone');

    // 6. CODING PLATFORM & SANDBOX RUNNER
    const problems = await request('GET', '/coding/problems', undefined, studentToken);
    assert(problems.status === 200 && problems.data.length >= 2, 'Coding arena returns problems');

    const codeRun = await request('POST', '/coding/run', {
      problemId: 'prob-two-sum',
      language: 'javascript',
      code: 'function solution(input) { return [0, 1]; }'
    }, studentToken);
    assert(codeRun.status === 200 && codeRun.data.executionTimeMs > 0, 'Isolated sandbox executes code safely');

    const codeSubmit = await request('POST', '/coding/submit', {
      problemId: 'prob-two-sum',
      language: 'javascript',
      code: 'function solution(input) { const { nums, target } = input; const map = {}; for (let i=0; i<nums.length; i++) { const diff = target - nums[i]; if (map[diff] !== undefined) return [map[diff], i]; map[nums[i]] = i; } return []; }'
    }, studentToken);
    assert(codeSubmit.status === 200 && codeSubmit.data.status === 'accepted', 'Correct submission is accepted and evaluated against hidden test cases');
    assert(!!codeSubmit.data.feedback, 'Algorithmic complexity feedback generated');

    // 7. MULTILINGUAL CONVERSATION ENGINE (English, Japanese, German)
    for (const lang of ['en', 'ja', 'de']) {
      const convStart = await request('POST', '/language/conversation/start', { languageCode: lang }, studentToken);
      assert(convStart.status === 200 && convStart.data.languageCode === lang, `Language session initialized for ${lang.toUpperCase()}`);

      const convMsg = await request('POST', '/language/conversation/message', {
        conversationId: convStart.data.conversationId,
        messageText: lang === 'ja' ? '私はAIエンジニアを目指しています。' : lang === 'de' ? 'Ich möchte als Softwareentwickler arbeiten.' : 'I am practicing for a backend cloud developer position.'
      }, studentToken);
      assert(convMsg.status === 200 && !!convMsg.data.aiMessage.messageText, `AI partner responds in ${lang.toUpperCase()} with context`);

      const convEval = await request('POST', '/language/conversation/evaluate', {
        conversationId: convStart.data.conversationId
      }, studentToken);
      assert(convEval.status === 200 && convEval.data.scorecard.overallScore > 0, `Conversation scorecard generated for ${lang.toUpperCase()}`);
    }

    // 8. OPPORTUNITIES & AI MATCH SCORES
    const internships = await request('GET', '/opportunities/internships', undefined, studentToken);
    assert(internships.status === 200 && internships.data[0].matchScore > 0, 'Internships computed with AI match percentage');
    assert(typeof internships.data[0].matchExplanation === 'string', 'Internships explain strong matches and gaps');

    const applyRes = await request('POST', '/opportunities/apply', {
      opportunityType: 'internship',
      opportunityId: internships.data[0].id,
      matchScore: internships.data[0].matchScore,
      matchReason: internships.data[0].matchExplanation
    }, studentToken);
    assert(applyRes.status === 200, 'Candidate can apply and enters recruitment pipeline');

    // 9. AI MOCK INTERVIEWS & LIVE MENTORS
    const intvStart = await request('POST', '/interview/ai/start', { category: 'technical' }, studentToken);
    assert(intvStart.status === 200 && !!intvStart.data.currentQuestion, 'AI Mock interview initializes adaptive question');

    const intvFinish = await request('POST', '/interview/ai/finish', { interviewId: intvStart.data.interviewId }, studentToken);
    assert(intvFinish.status === 200 && intvFinish.data.rubric.overallScore > 0, 'Interview scorecard evaluated across rubric');

    const mentors = await request('GET', '/interview/mentors', undefined, studentToken);
    assert(mentors.status === 200 && mentors.data.length > 0, 'Live mentor directory lists available slots');

    const bookMentor = await request('POST', '/interview/mentor/book', {
      mentorId: mentors.data[0].id,
      slotTime: mentors.data[0].availableSlots[0]
    }, studentToken);
    assert(bookMentor.status === 200 && !!bookMentor.data.meetingLink, 'Student can book live mentor slot with generated room URL');

    // 10. COLLEGE, RECRUITER & ADMIN PORTALS
    const collegeDash = await request('GET', '/college/dashboard', undefined, collegeAuth.data.token);
    assert(collegeDash.status === 200 && collegeDash.data.metrics.totalAuthorizedStudents > 0, 'College dashboard returns institution metrics');

    const recruiterDash = await request('GET', '/recruiter/dashboard', undefined, recruiterAuth.data.token);
    assert(recruiterDash.status === 200 && recruiterDash.data.totalApplicants >= 0, 'Recruiter dashboard returns talent pipeline');

    const adminMetrics = await request('GET', '/admin/metrics', undefined, adminToken);
    assert(adminMetrics.status === 200 && adminMetrics.data.metrics.totalUsers >= 5, 'Admin dashboard returns system metrics and audit logs');

  } catch (err) {
    console.error('Test Suite Exception:', err);
    failedCount++;
  } finally {
    console.log(`\n=======================================================`);
    console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`=======================================================\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runAllTests();
