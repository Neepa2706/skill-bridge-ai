// Comprehensive Integration Test Suite for Step 8: Lesson-wise AI Mock Test & Assessment System
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 8: LESSON-WISE AI MOCK TESTS INTEGRATION TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(description, fn) {
    totalTests++;
    return (async () => {
      try {
        await fn();
        passedTests++;
        console.log(`  ✓ ${description}`);
      } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    Error: ${err.message}`);
      }
    })();
  }

  // 1. Authenticate demo student
  let studentToken = '';
  let studentUserId = '';
  await test('Login as demo student', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Student login should succeed');
    assert.ok(data.token, 'Should return JWT token');
    studentToken = data.token;
    studentUserId = data.user.id;
  });

  // 2. Authenticate second user for security cross-access testing
  let otherToken = '';
  await test('Login as secondary user for RBAC & ownership tests', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@skillbridge.ai', password: 'password123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Admin login should succeed');
    otherToken = data.token;
  });

  // 3. Fetch mock tests list
  let availableTests = [];
  await test('GET /api/student/mock-tests returns list of published tests with student progress', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data), 'Response should be an array');
    assert.ok(data.length >= 3, 'Should have at least 3 seeded tests');
    availableTests = data;

    const test1 = data.find(t => t.id === 'mt-py-1');
    assert.ok(test1, 'mt-py-1 should exist');
    assert.strictEqual(test1.status, 'passed', 'mt-py-1 should show passed from seeded attempt');
    assert.strictEqual(test1.bestScore, 80, 'mt-py-1 best score should be 80');

    const test3 = data.find(t => t.id === 'mt-py-3');
    assert.ok(test3, 'mt-py-3 should exist');
    assert.strictEqual(test3.courseTitle, 'Python Programming Fundamentals');
    assert.ok(test3.lessonTitle.includes('Operators') || test3.lessonTitle.includes('Control Flow'), 'Lesson title should match');
  });

  // 4. Fetch instructions for mt-py-3
  await test('GET /api/student/mock-tests/mt-py-3/instructions returns guidelines & attempt allowance', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/instructions`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.testId, 'mt-py-3');
    assert.strictEqual(data.durationMinutes, 20);
    assert.strictEqual(data.canAttempt, true);
    assert.ok(data.rules.length >= 3, 'Should provide anti-cheating & test rules');
  });

  // 5. Start new attempt on mt-py-3
  let currentAttemptId = '';
  let examQuestions = [];
  await test('POST /api/student/mock-tests/mt-py-3/start initializes attempt and strips answers', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.attemptId, 'Should return attemptId');
    assert.ok(Array.isArray(data.questions), 'Should return questions');
    assert.strictEqual(data.questions.length, 5, 'Should return 5 questions');

    currentAttemptId = data.attemptId;
    examQuestions = data.questions;

    // SECURITY CHECK: Ensure correct answers and explanations are NEVER exposed during exam
    for (const q of data.questions) {
      assert.strictEqual(q.correctAnswer, undefined, `Question ${q.id} must NOT expose correctAnswer!`);
      assert.strictEqual(q.correct_answer, undefined, `Question ${q.id} must NOT expose correct_answer!`);
      assert.strictEqual(q.explanation, undefined, `Question ${q.id} must NOT expose explanation!`);
    }
  });

  // 6. Resume active attempt
  await test('GET /api/student/mock-tests/mt-py-3/attempt/:attemptId delivers active timer and state', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attemptId, currentAttemptId);
    assert.strictEqual(data.status, 'in_progress');
    assert.ok(data.timeRemainingSeconds > 0, 'Should have positive time remaining');
    assert.strictEqual(data.questions.length, 5);

    // SECURITY CHECK AGAIN
    for (const q of data.questions) {
      assert.strictEqual(q.correctAnswer, undefined);
      assert.strictEqual(q.explanation, undefined);
    }
  });

  // 7. Auto-save answers across question types
  await test('PUT /api/student/mock-tests/mt-py-3/attempt/:attemptId/answer saves MCQ, MSQ, True/False, Short Answer', async () => {
    // Q1: MCQ (Correct: 'True')
    const res1 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionId: examQuestions[0].id,
        selectedOption: 'True'
      })
    });
    assert.strictEqual(res1.status, 200);

    // Q2: MSQ (Correct: JSON array string of 3 options)
    const msqAnswer = [
      'A while loop executes continuously as long as its condition remains True.',
      'The `break` statement immediately exits the active loop.',
      'The `continue` statement skips to the next iteration of the loop.'
    ];
    const res2 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionId: examQuestions[1].id,
        selectedOption: JSON.stringify(msqAnswer)
      })
    });
    assert.strictEqual(res2.status, 200);

    // Q3: True/False (Correct: 'True')
    const res3 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionId: examQuestions[2].id,
        selectedOption: 'True',
        isMarkedForReview: true
      })
    });
    assert.strictEqual(res3.status, 200);

    // Q4: Short Answer
    const res4 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionId: examQuestions[3].id,
        answerText: 'The break statement terminates the entire loop immediately, while continue skips the remainder of the current iteration and jumps to the next cycle.'
      })
    });
    assert.strictEqual(res4.status, 200);

    // Q5: MCQ (Correct: '[1, 4, 7]')
    const res5 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/answer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionId: examQuestions[4].id,
        selectedOption: '[1, 4, 7]'
      })
    });
    assert.strictEqual(res5.status, 200);
  });

  // 8. Proctoring Security Events Logger
  await test('POST /api/student/mock-tests/mt-py-3/attempt/:attemptId/activity-log records violations & escalates', async () => {
    // 1st violation: Tab switch
    const res1 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ activityType: 'TAB_SWITCH', metadata: { url: 'external' } })
    });
    const d1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(d1.suspiciousEventCount, 1);
    assert.strictEqual(d1.action, 'warning');

    // 2nd violation: Fullscreen exit
    const res2 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ activityType: 'FULLSCREEN_EXIT' })
    });
    const d2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(d2.suspiciousEventCount, 2);
    assert.strictEqual(d2.action, 'final_warning');
  });

  // 9. Cross-access security prevention
  await test('Security: Accessing another user attempt is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    assert.strictEqual(res.status, 404, 'Attempt belonging to another user must not be found/accessible');
  });

  // 10. Final submission and server-side evaluation
  let submissionResult = null;
  await test('POST /api/student/mock-tests/mt-py-3/attempt/:attemptId/submit performs server evaluation', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attemptId, currentAttemptId);
    assert.ok(data.percentage >= 60, `Score should be passing (>=60%), got ${data.percentage}%`);
    assert.strictEqual(data.passed, true, 'Test should be marked passed');
    assert.ok(Array.isArray(data.skillResults), 'Should return skill results');
    assert.ok(data.aiFeedback, 'Should return AI feedback');
    assert.ok(data.aiFeedback.strengths.length > 0, 'Should return strengths');
    submissionResult = data;
  });

  // 11. Duplicate submission safety
  await test('POST submit again returns idempotent result without re-evaluating or erroring', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/attempt/${currentAttemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.alreadySubmitted, true);
    assert.strictEqual(data.percentage, submissionResult.percentage);
  });

  // 12. Fetch scorecard result
  await test('GET /api/student/mock-tests/mt-py-3/result/:attemptId returns scorecard & next action', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/result/${currentAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attemptId, currentAttemptId);
    assert.strictEqual(data.passed, true);
    assert.ok(data.earnedMarks > 0);
    assert.ok(data.aiFeedback.motivationMessage);
  });

  // 13. Fetch post-submission review (Now answers and explanations are unlocked!)
  await test('GET /api/student/mock-tests/mt-py-3/review/:attemptId unlocks full answers and explanations', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-3/review/${currentAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attemptId, currentAttemptId);
    assert.strictEqual(data.questions.length, 5);

    // NOW correct answers and explanations MUST be present for learning
    for (const q of data.questions) {
      assert.ok(q.correctAnswer, `Question ${q.questionId} must have correctAnswer in review`);
      assert.ok(q.explanation, `Question ${q.questionId} must have explanation in review`);
      assert.ok(q.studentAnswer !== undefined, `Question ${q.questionId} must show studentAnswer`);
    }
  });

  // 14. Evaluate short answer AI direct endpoint
  await test('POST /api/student/mock-tests/evaluate-short-answer grades and validates bounds strictly', async () => {
    const res = await fetch(`${BASE_URL}/api/student/mock-tests/evaluate-short-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        questionText: 'Explain the difference between mutable and immutable objects in Python.',
        expectedAnswer: 'Mutable objects can be modified in-place after creation (like lists and dicts), while immutable objects cannot have their state altered (like tuples and strings).',
        studentAnswer: 'Mutable objects such as lists can change in memory, but immutable ones like strings cannot be changed after definition.',
        maximumScore: 4,
        skillName: 'Python Programming'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.score >= 0 && data.score <= 4, 'Score must be between 0 and 4');
    assert.ok(['correct', 'partially_correct', 'incorrect'].includes(data.correctness));
    assert.ok(data.feedback);
  });

  // 15. Attempt limit verification
  await test('Starting attempts past max_attempts is blocked', async () => {
    // mt-py-1 has maxAttempts: 3, already has 1. Let's start and submit 2 more
    // Attempt 2
    const start2 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const d2 = await start2.json();
    await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-1/attempt/${d2.attemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    // Attempt 3
    const start3 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const d3 = await start3.json();
    await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-1/attempt/${d3.attemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    // Attempt 4 should be BLOCKED with 400
    const start4 = await fetch(`${BASE_URL}/api/student/mock-tests/mt-py-1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const d4 = await start4.json();
    assert.strictEqual(start4.status, 400, 'Attempt 4 should exceed max_attempts');
    assert.ok(d4.error.includes('Maximum attempts limit'));
  });

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[Fatal Test Error]', err);
  process.exit(1);
});
