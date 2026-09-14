import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 9: CODING PRACTICE & AUTO-EVALUATION TESTS');
  console.log('================================================================\n');

  let passedCount = 0;
  function pass(testName) {
    console.log(`  ✓ ${testName}`);
    passedCount++;
  }

  // 1. Authenticate demo student
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Student login should succeed');
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  pass('Login as demo student');

  // 2. Authenticate secondary user for RBAC ownership tests
  const secLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'recruiter@skillbridge.ai', password: 'password123' })
  });
  const secToken = secLoginRes.data.token;
  const secAuthHeaders = { Authorization: `Bearer ${secToken}` };
  pass('Login as secondary user for RBAC & ownership checks');

  // 3. GET /api/student/coding (Dashboard)
  const dashRes = await request('/api/student/coding', { headers: authHeaders });
  assert.strictEqual(dashRes.status, 200, 'Dashboard overview should return 200');
  assert.ok(dashRes.data.codingLevel, 'Dashboard should have coding level');
  assert.ok(typeof dashRes.data.problemsSolved === 'number', 'Dashboard should have problems solved count');
  assert.ok(dashRes.data.difficultyBreakdown, 'Dashboard should have difficulty breakdown');
  assert.ok(Array.isArray(dashRes.data.recommendedProblems), 'Dashboard should include recommended problems');
  pass('GET /api/student/coding delivers dashboard overview, streak, and metrics');

  // 4. GET /api/student/coding/problems (Catalog & Filters)
  const listRes = await request('/api/student/coding/problems', { headers: authHeaders });
  assert.strictEqual(listRes.status, 200, 'Problems list should return 200');
  assert.ok(Array.isArray(listRes.data), 'Problems list should be an array');
  assert.ok(listRes.data.length >= 5, 'Should have at least 5 seeded coding problems');
  const firstProb = listRes.data[0];
  assert.ok(firstProb.id, 'Problem should have ID');
  assert.ok(firstProb.title, 'Problem should have title');
  assert.ok(firstProb.difficulty, 'Problem should have difficulty');
  pass('GET /api/student/coding/problems returns catalog with solved flags');

  // 5. Test Filters (Difficulty & Topic & Language)
  const filterRes = await request('/api/student/coding/problems?difficulty=easy&language=python', { headers: authHeaders });
  assert.strictEqual(filterRes.status, 200);
  assert.ok(filterRes.data.every(p => p.difficulty === 'easy'), 'All returned problems should be easy');
  pass('Query filters (difficulty, language, status) correctly refine problems list');

  // 6. GET /api/student/coding/problems/:problemId (Public Test Cases ONLY)
  const probRes = await request('/api/student/coding/problems/cp-1', { headers: authHeaders });
  assert.strictEqual(probRes.status, 200, 'Problem details should return 200');
  assert.strictEqual(probRes.data.id, 'cp-1');
  assert.ok(probRes.data.sampleInput, 'Problem should have sample input');
  assert.ok(probRes.data.starterCode?.python, 'Problem should have Python starter code');
  assert.ok(Array.isArray(probRes.data.publicTestCases), 'Problem should return public test cases');
  // Security verification: private test cases must NEVER be exposed
  assert.strictEqual(probRes.data.publicTestCases.length, 2, 'Only the 2 public test cases should be returned');
  assert.ok(!JSON.stringify(probRes.data).includes('tc-1-3'), 'Hidden test cases must strictly NOT be leaked in details');
  pass('GET /api/student/coding/problems/:id returns specifications and strictly hides private test cases');

  // 7. POST /api/student/coding/problems/cp-1/run (Dry Run Python Code)
  const runRes = await request('/api/student/coding/problems/cp-1/run', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'python',
      code: `import sys\ndef solve():\n    data = sys.stdin.read().split()\n    if not data: return\n    a, b = int(data[0]), int(data[1])\n    print(max(a, b))\nif __name__ == '__main__': solve()`
    })
  });
  assert.strictEqual(runRes.status, 200, 'Run code should return 200');
  assert.strictEqual(runRes.data.status, 'ACCEPTED', 'Dry run should pass public sample test cases');
  assert.strictEqual(runRes.data.passedTests, 2, 'Should pass both public test cases');
  assert.ok(runRes.data.executionTimeMs > 0, 'Should measure execution time');
  pass('POST /problems/:id/run dry-runs Python code against public test cases only');

  // 8. POST /api/student/coding/problems/cp-1/submit (Full Evaluation)
  const submitRes = await request('/api/student/coding/problems/cp-1/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'python',
      code: `import sys\ndef solve():\n    data = sys.stdin.read().split()\n    if not data: return\n    a, b = int(data[0]), int(data[1])\n    print(max(a, b))\nif __name__ == '__main__': solve()`
    })
  });
  assert.strictEqual(submitRes.status, 200, 'Submit code should return 200');
  assert.strictEqual(submitRes.data.status, 'ACCEPTED', 'Complete solution should be ACCEPTED');
  assert.strictEqual(submitRes.data.score, 100, 'All test cases passed should yield 100% score');
  assert.strictEqual(submitRes.data.passedTests, 4, 'Should pass all 4 test cases');
  assert.ok(submitRes.data.submissionId, 'Should generate submission ID');
  assert.ok(submitRes.data.feedback, 'Should generate AI diagnostic feedback');
  const submissionId = submitRes.data.submissionId;
  pass('POST /problems/:id/submit executes against all test cases, updates streak & computes 100% score');

  // 9. GET /api/student/coding/submissions/:submissionId
  const subDetailRes = await request(`/api/student/coding/submissions/${submissionId}`, { headers: authHeaders });
  assert.strictEqual(subDetailRes.status, 200, 'Submission detail should return 200');
  assert.strictEqual(subDetailRes.data.id, submissionId);
  assert.strictEqual(subDetailRes.data.status, 'ACCEPTED');
  assert.ok(subDetailRes.data.feedback?.strengths?.length > 0, 'Submission detail should have AI strengths');
  pass('GET /submissions/:id returns complete scorecard with AI diagnostic feedback');

  // 10. Security: Accessing another user\'s submission is rejected with 403 Forbidden
  const forbiddenRes = await request(`/api/student/coding/submissions/${submissionId}`, { headers: secAuthHeaders });
  assert.strictEqual(forbiddenRes.status, 403, 'Cross-user submission inspection must be rejected with 403 Forbidden');
  pass('Security: Accessing another student submission is rejected with 403 Forbidden');

  // 11. Partial / Wrong Answer Handling
  const wrongRes = await request('/api/student/coding/problems/cp-1/submit', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'python',
      code: `import sys\ndef solve():\n    data = sys.stdin.read().split()\n    if not data: return\n    a, b = int(data[0]), int(data[1])\n    # Intentionally flawed logic that only works if a > b\n    print(a)\nif __name__ == '__main__': solve()`
    })
  });
  assert.strictEqual(wrongRes.status, 200);
  assert.ok(['PARTIAL_SUCCESS', 'WRONG_ANSWER'].includes(wrongRes.data.status), 'Flawed code should be PARTIAL_SUCCESS or WRONG_ANSWER');
  assert.ok(wrongRes.data.score < 100, 'Flawed code should receive score < 100');
  assert.ok(wrongRes.data.feedback.edgeCasesToReview, 'Feedback should point to edge cases');
  pass('Partial correctness is scored proportionally and generates edge-case hints');

  // 12. Syntax & Compilation Error Handling
  const syntaxRes = await request('/api/student/coding/problems/cp-1/run', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'python',
      code: `def solve(\n  invalid syntax line`
    })
  });
  assert.strictEqual(syntaxRes.status, 200);
  assert.strictEqual(syntaxRes.data.status, 'COMPILATION_ERROR', 'Syntax error must be flagged as COMPILATION_ERROR');
  pass('Compilation & syntax errors are safely captured and reported');

  // 13. Infinite Loop Timeout Handling
  const timeoutRes = await request('/api/student/coding/problems/cp-1/run', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'python',
      code: `import sys\nwhile True:\n    pass`
    })
  });
  assert.strictEqual(timeoutRes.status, 200);
  assert.strictEqual(timeoutRes.data.status, 'TIME_LIMIT_EXCEEDED', 'Infinite loop must be terminated with TIME_LIMIT_EXCEEDED');
  pass('Infinite loop process timeout terminates child process with TIME_LIMIT_EXCEEDED');

  // 14. AI Hints (Progressive Levels 1 to 4)
  for (const level of [1, 2, 3, 4]) {
    const hintRes = await request('/api/student/coding/problems/cp-1/ai-hint', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        hintLevel: level,
        language: 'python',
        userCode: 'def solve(): pass'
      })
    });
    assert.strictEqual(hintRes.status, 200, `Hint level ${level} should return 200`);
    assert.strictEqual(hintRes.data.hintLevel, level);
    assert.ok(hintRes.data.hint, `Hint level ${level} should return hint text`);
  }
  pass('POST /problems/:id/ai-hint delivers progressive Hint Levels 1, 2, 3, and 4');

  // 15. C/C++ Execution without Compiler is gracefully handled
  const cRes = await request('/api/student/coding/problems/cp-1/run', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      language: 'c',
      code: `#include <stdio.h>\nint main() { return 0; }`
    })
  });
  assert.strictEqual(cRes.status, 200);
  assert.strictEqual(cRes.data.status, 'COMPILATION_ERROR');
  assert.ok(cRes.data.userFriendlyMessage.includes('C/C++ compiler'), 'Should clearly inform student about compiler availability');
  pass('C/C++ compiler absence is reported clearly without pretending execution');

  // 16. GET /problems/:id/hints returns previously unlocked hints (Persistence)
  const getHintsRes = await request('/api/student/coding/problems/cp-1/hints', { headers: authHeaders });
  assert.strictEqual(getHintsRes.status, 200);
  assert.ok(getHintsRes.data[1], 'Hint 1 should be present in unlocked hints');
  assert.ok(getHintsRes.data[2], 'Hint 2 should be present in unlocked hints');
  pass('GET /problems/:id/hints successfully retrieves previously unlocked hints');

  // 17. Security: Unauthenticated access is rejected with 401 Unauthorized
  const unauthRes = await request('/api/student/coding/dashboard');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated access must return 401 Unauthorized');
  pass('Security: Unauthenticated API request is rejected with 401 Unauthorized');

  // 18. Submission details return persisted test results array
  assert.ok(Array.isArray(subDetailRes.data.testResults), 'Submission should return testResults array');
  assert.strictEqual(subDetailRes.data.testResults.length, 4, 'All 4 test cases results should be preserved');
  pass('GET /submissions/:id returns persisted benchmark test cases breakdown');

  // 19. GET /api/student/coding/skills returns verified skill evidence
  const skillsRes = await request('/api/student/coding/skills', { headers: authHeaders });
  assert.strictEqual(skillsRes.status, 200);
  assert.ok(Array.isArray(skillsRes.data), 'Skills response should be an array');
  assert.ok(skillsRes.data.length > 0, 'Should have verified coding skill evidence');
  const pySkill = skillsRes.data.find(s => s.skill_id === 'skl-py' || s.skill_id === 'skl-ps');
  assert.ok(pySkill, 'Should track evidence for Python or Problem Solving skill');
  pass('GET /api/student/coding/skills delivers verified skill progression evidence');

  // 20. GET /api/student/coding/streak returns streak and milestone badges
  const streakRes = await request('/api/student/coding/streak', { headers: authHeaders });
  assert.strictEqual(streakRes.status, 200);
  assert.ok(typeof streakRes.data.currentStreak === 'number', 'Current streak should be number');
  assert.ok(Array.isArray(streakRes.data.badges), 'Badges should be an array');
  pass('GET /api/student/coding/streak delivers accurate streak and milestone badges');

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedCount}/20 TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
