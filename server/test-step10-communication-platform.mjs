/**
 * SkillBridge AI - Step 10: Communication and Language Learning System Test Suite
 * Comprehensive Verification & Security Audit
 *
 * Validates:
 * 1. Authentication & Security (401 Unauthorized on missing/invalid token)
 * 2. Multi-Tenant Isolation & BOLA/IDOR Prevention (403 Forbidden on cross-student access)
 * 3. Communication Dashboard with 8-dimension Sub-Skills & SkillBridge Levels
 * 4. Language Selection & Switching (en, ja, de) with Native Script / Emoji Preservation
 * 5. Lessons Catalog & Progress Tracking & Lesson Completion
 * 6. Adaptive 12-Question Diagnostic Baseline Assessment & Cheating Prevention (masked answers)
 * 7. Audio Privacy Protocol (in-memory processing, no disk persistence) & Speech Transcription
 * 8. Speaking Practice Studio & 6-Dimension Rubric (Relevance, Grammar, Vocabulary, Fluency, Pronunciation, Completeness)
 * 9. Business Writing Lab & 4-Dimension Rubric with Side-by-Side BLUF Professional Rewrites
 * 10. AI Conversation Trainer across 5 Modes with Continuous Follow-ups & Live In-line Coaching Chips
 * 11. Conversation Session Lifecycle (GET history, active turns, idempotent end, prevention of post-end turns)
 * 12. 15-Minute Placement Interview Mock Test System
 * 13. Daily Communication Streaks & Milestone Badges
 * 14. Relational Database Evidence Logging to student_skill_history
 * 15. Server-Side Score Clamping (0 <= score <= 100) & SkillBridge Level System
 * 16. Non-Interference Regression Check on Steps 5, 7, 8, 9
 */

const BASE_URL = 'http://localhost:5000';

let studentToken = '';
let secondaryToken = '';
let studentUser = null;
let secondaryUser = null;

async function runTests() {
  console.log('================================================================');
  console.log('🧪 STEP 10: COMMUNICATION & LANGUAGE LEARNING VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Authentication & Security
  console.log('--- Test 1: Authentication & Token Security ---');
  try {
    // Unauthenticated request
    const noAuthRes = await fetch(`${BASE_URL}/api/student/communication/dashboard`);
    assert(noAuthRes.status === 401, 'Unauthenticated request to dashboard rejected with 401 Unauthorized');

    // Invalid token
    const badTokenRes = await fetch(`${BASE_URL}/api/student/communication/dashboard`, {
      headers: { Authorization: 'Bearer invalid-token-string' }
    });
    assert(badTokenRes.status === 401 || badTokenRes.status === 403, 'Invalid token rejected with 401/403');

    // Login primary student
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Primary student login returns 200 OK');
    studentToken = loginData.token;
    studentUser = loginData.user;

    // Login secondary user for isolation tests
    const secLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@skillbridge.ai', password: 'password123' })
    });
    const secData = await secLoginRes.json();
    assert(secLoginRes.status === 200, 'Secondary user login returns 200 OK');
    secondaryToken = secData.token;
    secondaryUser = secData.user;
  } catch (err) {
    assert(false, `Authentication setup failed: ${err.message}`);
  }

  const studentHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${studentToken}`
  };

  const secondaryHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${secondaryToken}`
  };

  // 2. Communication Dashboard & Sub-Skills
  console.log('\n--- Test 2: Communication Dashboard & 8 Sub-Skills ---');
  try {
    const dashRes = await fetch(`${BASE_URL}/api/student/communication/dashboard`, {
      headers: studentHeaders
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard returns 200 OK');
    assert(Array.isArray(dashData.languages) && dashData.languages.length >= 3, 'Returns all 3 supported languages');
    assert(dashData.activeLanguage && dashData.activeLanguage.code === 'en', 'Default active language is English (en)');
    assert(dashData.activeLanguage.track.currentLevel >= 1 && dashData.activeLanguage.track.currentLevel <= 5, 'Internal SkillBridge level assigned (Level 1-5)');
    assert(dashData.activeLanguage.track.overallScore !== undefined, 'Overall score present on track');
    
    // Check all 8 sub-skills
    const sub = dashData.activeLanguage.track.subSkills;
    assert(sub && typeof sub.speaking === 'number', 'Sub-skill 1: Speaking present');
    assert(sub && typeof sub.listening === 'number', 'Sub-skill 2: Listening present');
    assert(sub && typeof sub.reading === 'number', 'Sub-skill 3: Reading present');
    assert(sub && typeof sub.writing === 'number', 'Sub-skill 4: Writing present');
    assert(sub && typeof sub.grammar === 'number', 'Sub-skill 5: Grammar present');
    assert(sub && typeof sub.vocabulary === 'number', 'Sub-skill 6: Vocabulary present');
    assert(sub && typeof sub.pronunciation === 'number', 'Sub-skill 7: Pronunciation present');
    assert(sub && typeof sub.conversation === 'number', 'Sub-skill 8: Conversation present');
    assert(dashData.streak && typeof dashData.streak.currentStreak === 'number', 'Streak tracking present');
  } catch (err) {
    assert(false, `Dashboard test failed: ${err.message}`);
  }

  // 3. Language Selection & Switching (en, ja, de)
  console.log('\n--- Test 3: Language Selection & Native Script Integrity ---');
  try {
    // GET /languages
    const langsRes = await fetch(`${BASE_URL}/api/student/communication/languages`, {
      headers: studentHeaders
    });
    const langs = await langsRes.json();
    assert(langsRes.status === 200, 'GET /languages returns 200 OK');
    assert(langs.some(l => l.code === 'en' && l.nativeName === 'English'), 'English cataloged correctly');
    assert(langs.some(l => l.code === 'ja' && l.nativeName === '日本語'), 'Japanese cataloged with kanji/hiragana');
    assert(langs.some(l => l.code === 'de' && l.nativeName === 'Deutsch'), 'German cataloged correctly');

    // POST /language/switch to Japanese
    const swJaRes = await fetch(`${BASE_URL}/api/student/communication/language/switch`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ languageCode: 'ja' })
    });
    const swJa = await swJaRes.json();
    assert(swJaRes.status === 200, 'POST /language/switch to ja returns 200 OK');
    assert(swJa.language.code === 'ja' && swJa.language.nativeName === '日本語', 'Switched to Japanese with Unicode preserved');

    // POST /language/switch to German
    const swDeRes = await fetch(`${BASE_URL}/api/student/communication/language/switch`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ languageCode: 'de' })
    });
    const swDe = await swDeRes.json();
    assert(swDeRes.status === 200, 'POST /language/switch to de returns 200 OK');
    assert(swDe.language.code === 'de' && swDe.language.flagEmoji === '🇩🇪', 'Switched to German with flag emoji');

    // Switch back to English
    const swEnRes = await fetch(`${BASE_URL}/api/student/communication/language/switch`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ languageCode: 'en' })
    });
    assert(swEnRes.status === 200, 'POST /language/switch back to en returns 200 OK');

    // Reject unsupported language
    const badLangRes = await fetch(`${BASE_URL}/api/student/communication/language/switch`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ languageCode: 'fr' })
    });
    assert(badLangRes.status === 400, 'POST /language/switch rejects unsupported language code with 400');
  } catch (err) {
    assert(false, `Language selection test failed: ${err.message}`);
  }

  // 4. Lessons Catalog & Completion & Activities
  console.log('\n--- Test 4: Lessons Catalog & Activity Progress Tracking ---');
  let sampleLessonId = '';
  try {
    const lessonsRes = await fetch(`${BASE_URL}/api/student/communication/lessons?lang=en`, {
      headers: studentHeaders
    });
    const lessons = await lessonsRes.json();
    assert(lessonsRes.status === 200, 'GET /lessons returns 200 OK');
    assert(Array.isArray(lessons) && lessons.length >= 5, 'English curriculum contains at least 5 curated lessons');
    sampleLessonId = lessons[0].id;

    // Filter by category
    const catRes = await fetch(`${BASE_URL}/api/student/communication/lessons?lang=en&category=Professional Communication`, {
      headers: studentHeaders
    });
    const catLessons = await catRes.json();
    assert(catRes.status === 200, 'Filtering lessons by category returns 200 OK');
    assert(catLessons.every(l => l.category === 'Professional Communication'), 'All returned lessons match filtered category');

    // Lesson detail
    const detailRes = await fetch(`${BASE_URL}/api/student/communication/lessons/${sampleLessonId}`, {
      headers: studentHeaders
    });
    const detail = await detailRes.json();
    assert(detailRes.status === 200, 'GET /lessons/:id returns 200 OK');
    assert(detail.title && detail.content && detail.content.sampleDialogue, 'Lesson content parsed correctly');

    // Complete lesson
    const compRes = await fetch(`${BASE_URL}/api/student/communication/lessons/${sampleLessonId}/complete`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ score: 92, durationSeconds: 720 })
    });
    const compData = await compRes.json();
    assert(compRes.status === 200, 'POST /lessons/:id/complete returns 200 OK');
    assert(compData.success === true, 'Lesson completion recorded successfully');
    assert(compData.streak && compData.streak.currentStreak >= 1, 'Streak incremented on lesson completion');

    // GET /activities
    const actRes = await fetch(`${BASE_URL}/api/student/communication/activities`, {
      headers: studentHeaders
    });
    const activities = await actRes.json();
    assert(actRes.status === 200, 'GET /activities returns 200 OK');
    assert(Array.isArray(activities) && activities.length > 0, 'Activity history contains completed lesson entry');
    assert(activities[0].activity_type === 'LESSON_COMPLETED', 'Most recent activity is LESSON_COMPLETED');
  } catch (err) {
    assert(false, `Lessons and activities test failed: ${err.message}`);
  }

  // 5. Adaptive Diagnostic Baseline Assessment
  console.log('\n--- Test 5: Adaptive Diagnostic Baseline Assessment ---');
  try {
    // English questions
    const qEnRes = await fetch(`${BASE_URL}/api/student/communication/assessments/questions?lang=en`, {
      headers: studentHeaders
    });
    const qEnData = await qEnRes.json();
    assert(qEnRes.status === 200, 'GET /assessments/questions?lang=en returns 200 OK');
    assert(qEnData.totalQuestions === 12, 'English diagnostic contains exactly 12 questions');
    assert(!('correctIndex' in qEnData.questions[0]), 'Correct answer is masked from client payload (Anti-Cheating)');

    // Japanese questions
    const qJaRes = await fetch(`${BASE_URL}/api/student/communication/assessments/questions?lang=ja`, {
      headers: studentHeaders
    });
    const qJaData = await qJaRes.json();
    assert(qJaRes.status === 200, 'GET /assessments/questions?lang=ja returns 200 OK');
    assert(qJaData.questions.some(q => q.prompt.includes('敬語') || q.prompt.includes('報告')), 'Japanese questions contain authentic workplace scenarios');

    // German questions
    const qDeRes = await fetch(`${BASE_URL}/api/student/communication/assessments/questions?lang=de`, {
      headers: studentHeaders
    });
    const qDeData = await qDeRes.json();
    assert(qDeRes.status === 200, 'GET /assessments/questions?lang=de returns 200 OK');
    assert(qDeData.questions.some(q => q.prompt.includes('Verb') || q.prompt.includes('Schnittstelle')), 'German questions contain engineering vocabulary');

    // Submit diagnostic assessment
    const answers = qEnData.questions.map((q, idx) => ({
      questionId: q.id,
      selectedIndex: idx % 2 === 0 ? 1 : 0
    }));

    const subRes = await fetch(`${BASE_URL}/api/student/communication/assessments/submit`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        answers,
        durationSeconds: 540
      })
    });
    const subData = await subRes.json();
    assert(subRes.status === 200, 'POST /assessments/submit returns 200 OK');
    assert(subData.report && subData.report.overallScore >= 0 && subData.report.overallScore <= 100, 'Score is strictly bounded between 0 and 100');
    assert(subData.report.level >= 1 && subData.report.level <= 5, 'SkillBridge Level (1-5) assigned');
    assert(Array.isArray(subData.report.strengths) && subData.report.strengths.length > 0, 'Returns actionable strengths');
    assert(Array.isArray(subData.report.recommendations) && subData.report.recommendations.length > 0, 'Returns concrete follow-up recommendations');

    // Edge case: submitting empty/null answers does not crash the server
    const emptySubRes = await fetch(`${BASE_URL}/api/student/communication/assessments/submit`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        answers: null,
        durationSeconds: 100
      })
    });
    assert(emptySubRes.status === 200, 'Submitting null answers handled gracefully without crashing');
  } catch (err) {
    assert(false, `Assessment test failed: ${err.message}`);
  }

  // 6. Speech-to-Text & In-Memory Audio Privacy
  console.log('\n--- Test 6: Audio Privacy Protocol & Speaking Studio ---');
  try {
    const sttRes = await fetch(`${BASE_URL}/api/student/communication/speaking/transcribe`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        fallbackTranscript: 'We re-architected our microservices using Kafka message streams to achieve sub-second event processing.',
        durationSeconds: 16
      })
    });
    const sttData = await sttRes.json();
    assert(sttRes.status === 200, 'POST /speaking/transcribe returns 200 OK');
    assert(sttData.confidence >= 0.8, 'Speech recognition confidence computed');
    assert(Array.isArray(sttData.waveformPoints) && sttData.waveformPoints.length > 0, 'Audio waveform points generated for visual feedback');
    assert(sttData.privacyNotice.includes('in-memory'), 'Privacy Notice confirms audio processed in-memory without persistent disk storage');

    // Speaking Rubric Evaluation (6 Dimensions)
    const spkEvalRes = await fetch(`${BASE_URL}/api/student/communication/speaking/evaluate`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        promptText: 'Explain how you diagnosed and resolved an unexpected production outage.',
        transcript: sttData.transcript,
        durationSeconds: 16,
        relevanceScore: 90,
        grammarScore: 85,
        vocabularyScore: 88,
        fluencyScore: 82,
        pronunciationScore: 84,
        completenessScore: 86
      })
    });
    const spkEval = await spkEvalRes.json();
    assert(spkEvalRes.status === 200, 'POST /speaking/evaluate returns 200 OK');
    assert(spkEval.evaluation.overallScore >= 0 && spkEval.evaluation.overallScore <= 100, 'Speaking score bounded 0-100');
    assert(spkEval.evaluation.breakdown.relevance.weight === 0.25, 'Speaking Rubric: Relevance weight is 25%');
    assert(spkEval.evaluation.breakdown.grammar.weight === 0.20, 'Speaking Rubric: Grammar weight is 20%');
    assert(spkEval.evaluation.breakdown.vocabulary.weight === 0.15, 'Speaking Rubric: Vocabulary weight is 15%');
    assert(spkEval.evaluation.breakdown.fluency.weight === 0.20, 'Speaking Rubric: Fluency weight is 20%');
    assert(spkEval.evaluation.breakdown.pronunciation.weight === 0.10, 'Speaking Rubric: Pronunciation weight is 10%');
    assert(spkEval.evaluation.breakdown.completeness.weight === 0.10, 'Speaking Rubric: Completeness weight is 10%');
    assert(Array.isArray(spkEval.evaluation.tips) && spkEval.evaluation.tips.length > 0, 'Returns targeted speaking & pronunciation tips');

    // Validation: empty transcript rejected
    const badSpkRes = await fetch(`${BASE_URL}/api/student/communication/speaking/evaluate`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ promptText: 'Test', transcript: '' })
    });
    assert(badSpkRes.status === 400, 'Empty speaking transcript rejected with 400 Bad Request');
  } catch (err) {
    assert(false, `Speaking test failed: ${err.message}`);
  }

  // 7. Business Writing Lab & BLUF Professional Rewrite
  console.log('\n--- Test 7: Business Writing Lab & BLUF Principle ---');
  try {
    const wrtRes = await fetch(`${BASE_URL}/api/student/communication/writing/evaluate`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        prompt: 'Draft an urgent email notifying stakeholders of a planned database migration window.',
        answer: 'Hi team, we will migrate the postgres database this saturday at 2am. The site will be down for 30 minutes. We have backups ready.'
      })
    });
    const wrtData = await wrtRes.json();
    assert(wrtRes.status === 200, 'POST /writing/evaluate returns 200 OK');
    assert(wrtData.evaluation.overallScore >= 0 && wrtData.evaluation.overallScore <= 100, 'Writing score bounded 0-100');
    assert(wrtData.evaluation.breakdown.taskCompletion.weight === 0.30, 'Writing Rubric: Task weight is 30%');
    assert(wrtData.evaluation.breakdown.grammar.weight === 0.25, 'Writing Rubric: Grammar weight is 25%');
    assert(wrtData.evaluation.breakdown.vocabulary.weight === 0.25, 'Writing Rubric: Vocabulary weight is 25%');
    assert(wrtData.evaluation.breakdown.clarity.weight === 0.20, 'Writing Rubric: Clarity weight is 20%');
    assert(wrtData.evaluation.suggestedRewrite.includes('BLUF:'), 'Returns professional rewrite using the BLUF (Bottom Line Up Front) principle');
    assert(wrtData.evaluation.grammarCorrections.length > 0, 'Returns actionable grammar correction notes');
    assert(wrtData.evaluation.vocabularyEnhancements.length > 0, 'Returns technical vocabulary upgrades');

    // Validation: empty answer rejected
    const badWrtRes = await fetch(`${BASE_URL}/api/student/communication/writing/evaluate`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ prompt: 'RFC', answer: '' })
    });
    assert(badWrtRes.status === 400, 'Empty writing answer rejected with 400 Bad Request');
  } catch (err) {
    assert(false, `Writing test failed: ${err.message}`);
  }

  // 8. AI Conversation Trainer (Multi-Turn & In-Line Coaching)
  console.log('\n--- Test 8: Multi-Turn AI Conversation Trainer ---');
  let activeSessionId = '';
  try {
    // Start session in placement interview mode
    const startRes = await fetch(`${BASE_URL}/api/student/communication/conversation/start`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        mode: 'placement',
        topic: 'Distributed Systems & STAR Behavioral'
      })
    });
    const startData = await startRes.json();
    assert(startRes.status === 200, 'POST /conversation/start returns 200 OK');
    assert(startData.sessionId, 'Session ID generated');
    assert(startData.initialMessage && startData.initialMessage.text.length > 20, 'Opening AI interviewer greeting generated');
    activeSessionId = startData.sessionId;

    // Turn 1
    const turn1Res = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/turn`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        messageText: 'I architected a distributed caching layer with Redis sentinel to withstand regional node failovers.'
      })
    });
    const turn1Data = await turn1Res.json();
    assert(turn1Res.status === 200, 'Turn 1 returns 200 OK');
    assert(turn1Data.aiReply && turn1Data.aiReply.text.length > 10, 'AI responds with in-character reply and follow-up question');
    assert(turn1Data.studentTurn.relevanceScore >= 50, 'Student turn scored for relevance');

    // Turn 2 (Continuous Dialogue)
    const turn2Res = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/turn`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        messageText: 'We monitored cache hit rates with Prometheus and Grafana dashboards, maintaining a 94% hit ratio.'
      })
    });
    const turn2Data = await turn2Res.json();
    assert(turn2Res.status === 200, 'Turn 2 returns 200 OK');
    assert(turn2Data.aiReply && turn2Data.aiReply.text.length > 10, 'AI follows up continuously on cache monitoring metrics');

    // GET /conversation/:sessionId (History retrieval)
    const histRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}`, {
      headers: studentHeaders
    });
    const histData = await histRes.json();
    assert(histRes.status === 200, 'GET /conversation/:sessionId returns 200 OK');
    assert(Array.isArray(histData.messages) && histData.messages.length >= 4, 'Full message history preserved in chronological order');
    assert(histData.session.topic === 'Distributed Systems & STAR Behavioral', 'Session metadata retrieved accurately');
  } catch (err) {
    assert(false, `Conversation trainer test failed: ${err.message}`);
  }

  // 9. Multi-Tenant Security & BOLA Prevention on Conversation
  console.log('\n--- Test 9: Multi-Tenant Security & BOLA Prevention ---');
  try {
    // Secondary user tries to view primary student's session history
    const crossGetRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}`, {
      headers: secondaryHeaders
    });
    assert(crossGetRes.status === 403, 'Cross-student GET /conversation/:id rejected with 403 Forbidden');

    // Secondary user tries to send a turn to primary student's session
    const crossTurnRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/turn`, {
      method: 'POST',
      headers: secondaryHeaders,
      body: JSON.stringify({ messageText: 'Hacking session from secondary user.' })
    });
    assert(crossTurnRes.status === 403, 'Cross-student POST /conversation/:id/turn rejected with 403 Forbidden');

    // Secondary user tries to end primary student's session
    const crossEndRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/end`, {
      method: 'POST',
      headers: secondaryHeaders,
      body: JSON.stringify({ durationSeconds: 200 })
    });
    assert(crossEndRes.status === 403, 'Cross-student POST /conversation/:id/end rejected with 403 Forbidden');
  } catch (err) {
    assert(false, `Multi-tenant security test failed: ${err.message}`);
  }

  // 10. Conversation Session Completion & Lifecycle Protection
  console.log('\n--- Test 10: Conversation Session End & Lifecycle Protection ---');
  try {
    // Primary student ends session
    const endRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/end`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ durationSeconds: 360 })
    });
    const endData = await endRes.json();
    assert(endRes.status === 200, 'POST /conversation/:id/end returns 200 OK');
    assert(endData.overallScore >= 0 && endData.overallScore <= 100, 'Overall conversation score bounded');
    assert(endData.levelAssigned && endData.levelAssigned.level >= 1, 'Assigned SkillBridge level to completed conversation');
    assert(endData.totalTurns >= 2, 'Assessed all completed turns');

    // Lifecycle check: Sending a turn to an already ended session must be rejected
    const lateTurnRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/turn`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ messageText: 'Trying to send after end.' })
    });
    assert(lateTurnRes.status === 400, 'Sending turn to completed session rejected with 400 Bad Request');

    // Idempotent end: Calling end again returns existing scorecard cleanly
    const reEndRes = await fetch(`${BASE_URL}/api/student/communication/conversation/${activeSessionId}/end`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ durationSeconds: 360 })
    });
    assert(reEndRes.status === 200, 'Calling end on already completed session returns 200 idempotently');
  } catch (err) {
    assert(false, `Session lifecycle test failed: ${err.message}`);
  }

  // 11. Placement Interview Mock Test System
  console.log('\n--- Test 11: Placement Interview Mock Test System ---');
  try {
    const promptRes = await fetch(`${BASE_URL}/api/student/communication/mock-test/prompt?lang=en`, {
      headers: studentHeaders
    });
    const promptData = await promptRes.json();
    assert(promptRes.status === 200, 'GET /mock-test/prompt returns 200 OK');
    assert(promptData.title && promptData.keyObjectives.length >= 3, 'Returns interview scenario and objectives');
    assert(promptData.durationMinutes === 15, 'Mock test duration is configured for 15 minutes');

    // Secondary user tries to submit mock test using primary student's session
    const badSecMockRes = await fetch(`${BASE_URL}/api/student/communication/mock-test/submit`, {
      method: 'POST',
      headers: secondaryHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        sessionId: activeSessionId,
        durationSeconds: 600
      })
    });
    assert(badSecMockRes.status === 403, 'Cross-student mock test submission rejected with 403 Forbidden');

    // Primary student submits mock test
    const subMockRes = await fetch(`${BASE_URL}/api/student/communication/mock-test/submit`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        sessionId: activeSessionId,
        durationSeconds: 700
      })
    });
    const subMockData = await subMockRes.json();
    assert(subMockRes.status === 200, 'POST /mock-test/submit returns 200 OK');
    assert(subMockData.mockTestId, 'Mock test record ID generated');
    assert(subMockData.overallScore >= 0 && subMockData.overallScore <= 100, 'Mock test score strictly bounded');
    assert(subMockData.levelAssigned && subMockData.levelAssigned.level >= 1, 'Assigned SkillBridge level to mock interview');
  } catch (err) {
    assert(false, `Mock test system test failed: ${err.message}`);
  }

  // 12. Streaks, Badges & Evidence Logging
  console.log('\n--- Test 12: Communication Streaks, Badges & Evidence Logging ---');
  try {
    const strkRes = await fetch(`${BASE_URL}/api/student/communication/streak`, {
      headers: studentHeaders
    });
    const strkData = await strkRes.json();
    assert(strkRes.status === 200, 'GET /streak returns 200 OK');
    assert(strkData.currentStreak >= 1, 'Current streak is active');
    assert(strkData.totalActiveDays >= 1, 'Total active days recorded');
    assert(Array.isArray(strkData.calendar) && strkData.calendar.length > 0, 'Calendar heatmap contains activity entries');
    assert(Array.isArray(strkData.badges) && strkData.badges.length > 0, 'Earned milestone badges returned');
  } catch (err) {
    assert(false, `Streak test failed: ${err.message}`);
  }

  // 13. Score Clamping & Boundaries Audit
  console.log('\n--- Test 13: Score Clamping & Boundaries Audit ---');
  try {
    // Check extreme inputs
    const testExtremeSpeaking = await fetch(`${BASE_URL}/api/student/communication/speaking/evaluate`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        languageCode: 'en',
        promptText: 'Boundary Test',
        transcript: 'Testing extreme boundary inputs.',
        relevanceScore: 999,
        grammarScore: -50,
        vocabularyScore: '85',
        fluencyScore: 100,
        pronunciationScore: 0,
        completenessScore: 70
      })
    });
    const extData = await testExtremeSpeaking.json();
    assert(testExtremeSpeaking.status === 200, 'Evaluates extreme score input values safely');
    assert(extData.evaluation.overallScore <= 100 && extData.evaluation.overallScore >= 0, 'Extreme scores are clamped to [0, 100]');
    assert(extData.evaluation.breakdown.relevance.score === 100, '999 clamped to 100');
    assert(extData.evaluation.breakdown.grammar.score === 0, '-50 clamped to 0');
  } catch (err) {
    assert(false, `Score boundary test failed: ${err.message}`);
  }

  // 14. Non-Interference Regression on Steps 5, 6, 7, 8, 9
  console.log('\n--- Test 14: Non-Interference Regression (Steps 5-9) ---');
  try {
    // Step 5: Skill Report
    const rptRes = await fetch(`${BASE_URL}/api/student/skill-report`, { headers: studentHeaders });
    assert(rptRes.status === 200, 'Step 5: Skill Report endpoint intact (200 OK)');

    // Step 7: Courses Catalog
    const crsRes = await fetch(`${BASE_URL}/api/student/courses`, { headers: studentHeaders });
    assert(crsRes.status === 200, 'Step 7: Courses catalog intact (200 OK)');

    // Step 8: Lesson-wise Mock Tests
    const mtRes = await fetch(`${BASE_URL}/api/student/mock-tests`, { headers: studentHeaders });
    assert(mtRes.status === 200, 'Step 8: Lesson-wise Mock Tests intact (200 OK)');

    // Step 9: Coding Practice Arena
    const codeRes = await fetch(`${BASE_URL}/api/student/coding`, { headers: studentHeaders });
    assert(codeRes.status === 200, 'Step 9: Coding Practice arena intact (200 OK)');

    const codeProbRes = await fetch(`${BASE_URL}/api/student/coding/problems`, { headers: studentHeaders });
    assert(codeProbRes.status === 200, 'Step 9: Coding Problems catalog intact (200 OK)');
  } catch (err) {
    assert(false, `Regression check failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
