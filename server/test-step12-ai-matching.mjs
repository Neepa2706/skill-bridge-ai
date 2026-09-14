const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Step 12 AI Student–Opportunity Matching System Verification Tests...\n');

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

  // 1. Authenticate Demo Student
  console.log('[Test 1] Student Authentication');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@skillbridge.ai',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.token, 'Student logged in successfully with token');
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 2. Fetch Matched Opportunities Dashboard
  console.log('\n[Test 2] GET /api/student/matched-opportunities');
  const matchedRes = await fetch(`${API_BASE}/student/matched-opportunities`, {
    headers: authHeaders
  });
  const matchedData = await matchedRes.json();
  assert(matchedRes.ok, 'Response status 200 OK');
  assert(matchedData.success === true, 'Payload success flag is true');
  assert(matchedData.summary && typeof matchedData.summary.bestMatch === 'number', 'Summary contains bestMatch score');
  assert(typeof matchedData.summary.eligibleOpportunities === 'number', 'Summary contains eligibleOpportunities count');
  assert(matchedData.disclaimer.includes('profile similarity'), 'Mandatory similarity disclaimer present');
  assert(matchedData.notice.includes('do not guarantee selection'), 'Mandatory AI recommendation notice present');
  assert(Array.isArray(matchedData.opportunities) && matchedData.opportunities.length > 0, `Returned ${matchedData.opportunities?.length} recommended opportunities`);

  const firstOpp = matchedData.opportunities[0];
  console.log(`   Top Opportunity: "${firstOpp.title}" at ${firstOpp.companyName} | Match: ${firstOpp.matchingScore}% (${firstOpp.matchCategoryLabel})`);
  assert(firstOpp.matchingScore >= 0 && firstOpp.matchingScore <= 100, 'Score is bounded between 0 and 100');
  assert(firstOpp.matchCategoryLabel, 'Match category label present');
  assert(Array.isArray(firstOpp.matchedSkills), 'Matched skills array present');
  assert(firstOpp.eligibilityStatus, 'Eligibility status present');

  // 3. Test Filter by Category (BEST_MATCHES, STRONG_MATCHES, REMOTE)
  console.log('\n[Test 3] Filter Matched Opportunities by Category');
  const remoteRes = await fetch(`${API_BASE}/student/matched-opportunities?category=REMOTE`, {
    headers: authHeaders
  });
  const remoteData = await remoteRes.json();
  assert(remoteRes.ok && Array.isArray(remoteData.opportunities), 'Filtered remote matches query succeeded');
  const allRemote = remoteData.opportunities.every(o => o.workMode === 'REMOTE');
  assert(allRemote, 'All returned items in REMOTE category have workMode REMOTE');

  // 4. Match Detail Explanation View
  console.log(`\n[Test 4] GET /api/student/matched-opportunities/${firstOpp.id}`);
  const detailRes = await fetch(`${API_BASE}/student/matched-opportunities/${firstOpp.id}`, {
    headers: authHeaders
  });
  const detailData = await detailRes.json();
  assert(detailRes.ok, 'Detail response status 200 OK');
  assert(detailData.match && typeof detailData.match.matchingScore === 'number', 'Detail contains match score');
  assert(detailData.match.factorBreakdown, 'Transparent 7-factor breakdown present');
  console.log('   Factor Breakdown:', detailData.match.factorBreakdown);
  assert(typeof detailData.match.factorBreakdown.skillMatch === 'number', 'Skill Match factor calculated');
  assert(typeof detailData.match.factorBreakdown.eligibility === 'number', 'Eligibility factor calculated');
  assert(typeof detailData.match.factorBreakdown.education === 'number', 'Education factor calculated');
  assert(Array.isArray(detailData.match.skillComparison) && detailData.match.skillComparison.length > 0, 'Skill comparison table generated');
  const firstSkillRow = detailData.match.skillComparison[0];
  console.log(`   Skill row: ${firstSkillRow.skillName} | Student Level: ${firstSkillRow.studentLevel} | Req: ${firstSkillRow.requiredLevel} | Status: ${firstSkillRow.status}`);
  assert(['Matched', 'Needs Improvement', 'Missing'].includes(firstSkillRow.status), 'Skill row has valid status classification');
  assert(detailData.match.improvementSuggestions, 'Improvement suggestions present');
  assert(detailData.preparationPlan && detailData.preparationPlan.steps.length === 6, '6-step structured preparation plan generated');

  // 5. Preparation Plan Progress Tracking
  console.log('\n[Test 5] Preparation Plan Progress Tracking (PUT /api/student/preparation-plans/:id/progress)');
  const planId = detailData.preparationPlan.id;
  const updatePlanRes = await fetch(`${API_BASE}/student/preparation-plans/${planId}/progress`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      stepIndex: 2,
      completed: true
    })
  });
  const updatePlanData = await updatePlanRes.json();
  assert(updatePlanRes.ok && updatePlanData.plan, 'Progress update successful');
  assert(updatePlanData.plan.steps[1].completed === true, 'Step 2 marked as completed');
  assert(updatePlanData.plan.progressPercentage > 0, `Progress percentage updated to ${updatePlanData.plan.progressPercentage}%`);

  // 6. Get & Update Opportunity Preferences
  console.log('\n[Test 6] Student Opportunity Preferences (GET & PUT)');
  const prefGetRes = await fetch(`${API_BASE}/student/opportunity-preferences`, {
    headers: authHeaders
  });
  const prefGetData = await prefGetRes.json();
  assert(prefGetRes.ok && prefGetData.preferences, 'Fetched opportunity preferences');

  const updatePrefRes = await fetch(`${API_BASE}/student/opportunity-preferences`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      preferredRoles: ['Python Backend Developer', 'AI Systems Engineer'],
      preferredSkills: ['Python', 'SQL', 'FastAPI'],
      preferredLocations: ['Bengaluru', 'Remote'],
      preferredWorkModes: ['REMOTE', 'HYBRID'],
      preferredTypes: ['INTERNSHIP', 'JOB'],
      minimumStipend: 30000,
      minimumSalary: 700000
    })
  });
  const updatePrefData = await updatePrefRes.json();
  assert(updatePrefRes.ok && updatePrefData.success === true, 'Updated opportunity preferences successfully');
  assert(updatePrefData.summary && typeof updatePrefData.summary.bestMatch === 'number', 'Preferences update triggered match recalculation');

  // 7. Recalculate Matches Endpoint
  console.log('\n[Test 7] POST /api/student/recalculate-matches');
  const recalcRes = await fetch(`${API_BASE}/student/recalculate-matches`, {
    method: 'POST',
    headers: authHeaders
  });
  const recalcData = await recalcRes.json();
  assert(recalcRes.ok && recalcData.success === true, 'Recalculation endpoint succeeded');
  assert(recalcData.message === 'Your recommendations were updated.', 'User-friendly update message returned');
  assert(recalcData.summary.bestMatch > 0, `Best match is ${recalcData.summary.bestMatch}%`);

  // 8. Match History Audit
  console.log('\n[Test 8] GET /api/student/match-history');
  const historyRes = await fetch(`${API_BASE}/student/match-history`, {
    headers: authHeaders
  });
  const historyData = await historyRes.json();
  assert(historyRes.ok && Array.isArray(historyData.history), 'Match history retrieved');
  assert(historyData.history.length > 0, `Retrieved ${historyData.history.length} historical match records`);
  const firstHist = historyData.history[0];
  assert(firstHist.matchingScore && firstHist.opportunityTitle, 'History record contains score and opportunity title');

  // 9. Granular Match Score & Eligibility Endpoints
  console.log('\n[Test 9] Standalone Match Score & Eligibility APIs');
  const scoreRes = await fetch(`${API_BASE}/opportunities/${firstOpp.id}/match-score`, {
    headers: authHeaders
  });
  const scoreData = await scoreRes.json();
  assert(scoreRes.ok && typeof scoreData.matchingScore === 'number', 'GET /api/opportunities/:id/match-score returned valid score');

  const eligRes = await fetch(`${API_BASE}/opportunities/${firstOpp.id}/eligibility`, {
    headers: authHeaders
  });
  const eligData = await eligRes.json();
  assert(eligRes.ok && eligData.eligibilityStatus, 'GET /api/opportunities/:id/eligibility returned status');

  // 10. Security & RBAC: Unauthenticated Requests Blocked
  console.log('\n[Test 10] Security & RBAC: Unauthorized Access Blocked');
  const unauthRes = await fetch(`${API_BASE}/student/matched-opportunities`);
  assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401 Unauthorized');

  // 11. Regression Verification: Steps 5, 7, 8, 9, 10, 11
  console.log('\n[Test 11] Regression Verification across Prior Steps (Steps 5–11)');

  // Step 5: AI Skill Report
  const skillReportRes = await fetch(`${API_BASE}/student/skill-report`, { headers: authHeaders });
  assert(skillReportRes.ok, 'Step 5: Student Skill Report endpoint functional');

  // Step 7: Course Catalog
  const coursesRes = await fetch(`${API_BASE}/learning/courses`, { headers: authHeaders });
  assert(coursesRes.ok, 'Step 7: Courses catalog endpoint functional');

  // Step 8: Mock Tests
  const mockTestsRes = await fetch(`${API_BASE}/student/mock-tests`, { headers: authHeaders });
  assert(mockTestsRes.ok, 'Step 8: Mock tests endpoint functional');

  // Step 9: Coding Arena
  const codingRes = await fetch(`${API_BASE}/coding/problems`, { headers: authHeaders });
  assert(codingRes.ok, 'Step 9: Coding arena problems endpoint functional');

  // Step 10: Communication Dashboard
  const commRes = await fetch(`${API_BASE}/communication/dashboard`, { headers: authHeaders });
  assert(commRes.ok, 'Step 10: Communication dashboard endpoint functional');

  // Step 11: Opportunities Marketplace
  const marketplaceRes = await fetch(`${API_BASE}/opportunities`, { headers: authHeaders });
  assert(marketplaceRes.ok, 'Step 11: Opportunities marketplace endpoint functional');

  console.log(`\n=======================================================`);
  console.log(`Step 12 Backend Verification Complete: ${passed} passed, ${failed} failed`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[Test Execution Error]', err);
  process.exit(1);
});
