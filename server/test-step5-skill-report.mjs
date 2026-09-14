import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runStep5Tests() {
  console.log('--- Starting Step 5: AI Skill Report & Skill Gap Automated Tests ---');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`✅ Test ${totalCount}: ${message}`);
      passedCount++;
    } else {
      console.error(`❌ Test ${totalCount} FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Authenticate as student
  console.log('\n[1] Authenticating as student...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@skillbridge.ai', password: 'password123' });

  assert(loginRes.status === 200 && loginRes.body.token, 'Student successfully logged in with valid JWT token');
  const token = loginRes.body.token;

  // 2. Generate or trigger AI Skill Report
  console.log('\n[2] Triggering AI Skill Report generation...');
  const genRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-report/generate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, {});

  assert(genRes.status === 200, `Generate endpoint returned status 200 (got ${genRes.status})`);
  assert(genRes.body.report && genRes.body.report.reportId, 'Report generated with valid unique reportId');
  assert(genRes.body.report.overallScore >= 0 && genRes.body.report.overallScore <= 100, `Overall score is valid percentage: ${genRes.body.report.overallScore}`);
  assert(['Beginner', 'Foundation', 'Developing', 'Proficient', 'Advanced'].includes(genRes.body.report.overallLevel), `Valid 5-level scale level: ${genRes.body.report.overallLevel}`);

  // 3. Retrieve Latest Skill Report
  console.log('\n[3] Retrieving latest Skill Report via GET /api/student/skill-report...');
  const getReportRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-report',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  assert(getReportRes.status === 200, 'GET /api/student/skill-report returned status 200');
  const report = getReportRes.body;
  assert(report.categoryScores && report.categoryScores.technical !== undefined, 'Assessed Technical Category score present');
  assert(report.categoryScores && report.categoryScores.coding !== undefined, 'Assessed Coding Category score present');
  assert(report.categoryScores && report.categoryScores.communication !== undefined, 'Assessed Communication Category score present');
  assert(Array.isArray(report.skills) && report.skills.length > 0, `Individual skills populated (${report.skills.length} skills evaluated)`);

  // Check individual skill structure and evidence
  const sampleSkill = report.skills[0];
  assert(sampleSkill.skillName && sampleSkill.score !== undefined && sampleSkill.level, `Skill ${sampleSkill.skillName} has score ${sampleSkill.score} and level ${sampleSkill.level}`);
  assert(['Low', 'Medium', 'High'].includes(sampleSkill.confidence), `Confidence level valid: ${sampleSkill.confidence}`);
  assert(Array.isArray(sampleSkill.evidence) && sampleSkill.evidence.length > 0, `Evidence traceable for skill (${sampleSkill.evidence[0]})`);

  // 4. Check Strengths & Areas to Improve
  console.log('\n[4] Checking Strengths & Areas to Improve...');
  assert(Array.isArray(report.strengths) && report.strengths.length >= 2, `Strengths populated (${report.strengths.length} items)`);
  assert(Array.isArray(report.areasToImprove) && report.areasToImprove.length >= 2, `Areas to improve populated (${report.areasToImprove.length} items)`);

  // 5. Check Skill Gaps Matrix
  console.log('\n[5] Checking Skill Gaps Matrix against target role...');
  assert(Array.isArray(report.skillGaps) && report.skillGaps.length > 0, `Skill gaps evaluated (${report.skillGaps.length} gaps)`);
  const sampleGap = report.skillGaps[0];
  assert(sampleGap.skillName && sampleGap.requiredScore && sampleGap.gapSize, `Gap item has required score (${sampleGap.requiredScore}) and gapSize (${sampleGap.gapSize})`);

  // 6. Check Career Alignment & Alternative Careers
  console.log('\n[6] Checking Career Alignment & Alternative Careers...');
  assert(report.careerAlignment && report.careerAlignment.alignmentPercentage !== undefined, `Career alignment calculated: ${report.careerAlignment?.alignmentPercentage}%`);
  assert(Array.isArray(report.careerAlignment.alternativeCareers) && report.careerAlignment.alternativeCareers.length > 0, `Alternative careers suggested (${report.careerAlignment.alternativeCareers.length} roles)`);

  // 7. Check Priority Improvements & AI Career Coach Summary
  console.log('\n[7] Checking Priority Improvements & AI Coach Summary...');
  assert(Array.isArray(report.priorityImprovements) && report.priorityImprovements.length > 0, `Priorities ranked (${report.priorityImprovements.length} items)`);
  assert(typeof report.summary === 'string' && report.summary.length > 30, 'AI Career Coach summary present and detailed');

  // 8. Test Skill History API
  console.log('\n[8] Checking Historical Skill Progression via GET /api/student/skill-history...');
  const histRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-history',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(histRes.status === 200 && Array.isArray(histRes.body.history), `Skill history returns array of progression snapshots (${histRes.body.history.length} snapshots)`);

  // 9. Test Privacy Update API
  console.log('\n[9] Testing Privacy / Visibility update...');
  const privRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-report/privacy',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, { visibility: 'college_visible' });
  assert(privRes.status === 200 && privRes.body.visibility === 'college_visible', 'Report privacy successfully updated to college_visible');

  // 10. Test PDF Dossier Export Endpoint
  console.log('\n[10] Testing PDF export endpoint via GET /api/student/skill-report/pdf...');
  const pdfRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-report/pdf',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(pdfRes.status === 200, 'PDF endpoint returned status 200');
  assert(typeof pdfRes.body === 'string' && pdfRes.body.includes('SkillBridge AI'), 'PDF/HTML response contains formatted branding and student dossier');

  // 11. Security Check: Recruiter should be blocked from private report
  console.log('\n[11] Security check: verify unpermitted recruiter cannot modify student report...');
  const recLogin = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'recruiter@skillbridge.ai', password: 'password123' });
  const recToken = recLogin.body.token;

  const recPatch = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/student/skill-report/privacy',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recToken}` }
  }, { visibility: 'recruiter_visible' });
  assert(recPatch.status === 403, `Recruiter cannot modify student privacy (got status ${recPatch.status})`);

  console.log(`\n🎉 All ${passedCount}/${totalCount} Step 5 automated tests passed successfully!`);
}

runStep5Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
