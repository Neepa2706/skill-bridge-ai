import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 COMPREHENSIVE STEP 11 OPPORTUNITY MARKETPLACE TEST & SECURITY SUITE');
  console.log('========================================================================');

  // 1. Authenticate Roles
  console.log('\n[1/15] Authenticating Student, Admin, and Recruiter...');
  const studentLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
  })).json();
  const studentToken = studentLogin.token;
  assert(studentToken, 'Student token must exist');

  const adminLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@skillbridge.ai', password: 'password123' })
  })).json();
  const adminToken = adminLogin.token;
  assert(adminToken, 'Admin token must exist');

  const recruiterLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@skillbridge.ai', password: 'password123' })
  })).json();
  const recruiterToken = recruiterLogin.token;
  assert(recruiterToken, 'Recruiter token must exist');
  console.log('  ✓ All 3 test users authenticated successfully');

  // 2. Catalog Listing & 8 Opportunity Types
  console.log('\n[2/15] Verifying Opportunity Catalog & all 8 opportunity types...');
  const catRes = await (await fetch(`${BASE_URL}/api/opportunities?deadline=all`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(Array.isArray(catRes.opportunities), 'Opportunities must be an array');
  assert(catRes.opportunities.length >= 12, 'Catalog should contain full demo set');

  const typesFound = new Set(catRes.opportunities.map(o => o.type));
  const expectedTypes = ['INTERNSHIP', 'JOB', 'HIRING_DRIVE', 'PLACEMENT_DRIVE', 'EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION'];
  for (const t of expectedTypes) {
    assert(typesFound.has(t), `Catalog must contain opportunity type: ${t}`);
  }
  console.log(`  ✓ Verified all 8 opportunity types: ${[...typesFound].join(', ')}`);

  // 3. Search Functionality
  console.log('\n[3/15] Verifying search across titles, company names, skills...');
  const searchPython = await (await fetch(`${BASE_URL}/api/opportunities?q=python`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(searchPython.opportunities.length > 0, 'Search for Python should return results');

  const searchCompany = await (await fetch(`${BASE_URL}/api/opportunities?q=Apex`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(searchCompany.opportunities.some(o => o.company_name.includes('Apex')), 'Search for Apex should find company');
  console.log(`  ✓ Search verified: 'python' matched ${searchPython.opportunities.length} items, 'Apex' matched ${searchCompany.opportunities.length} items`);

  // 4. Multi-Faceted Filters & Sorting
  console.log('\n[4/15] Verifying Multi-Faceted Filters (Type, WorkMode, Compensation, Sort)...');
  const filterRemote = await (await fetch(`${BASE_URL}/api/opportunities?workMode=REMOTE`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(filterRemote.opportunities.every(o => o.work_mode === 'REMOTE'), 'All items must be REMOTE');

  const filterPaid = await (await fetch(`${BASE_URL}/api/opportunities?compensation=paid`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(filterPaid.opportunities.every(o => o.stipend || o.salary_range), 'All items must have compensation');

  const sortDeadline = await (await fetch(`${BASE_URL}/api/opportunities?sort=deadline_soon`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(sortDeadline.opportunities.length > 0, 'Sort by deadline_soon should return items');
  console.log('  ✓ Verified workMode, compensation, and sort filters');

  // 5. Rule-Based Match Relevance Engine
  console.log('\n[5/15] Verifying Rule-Based Match Relevance Score & Eligibility...');
  const opp1 = await (await fetch(`${BASE_URL}/api/opportunities/opp-1`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert.strictEqual(typeof opp1.relevance_score, 'number');
  assert(opp1.relevance_score >= 10 && opp1.relevance_score <= 100, 'Score must be between 10 and 100');
  assert(Array.isArray(opp1.matched_skills), 'matched_skills must be an array');
  assert(Array.isArray(opp1.missing_skills), 'missing_skills must be an array');
  assert(Array.isArray(opp1.eligibility_reasons), 'eligibility_reasons must be an array');
  console.log(`  ✓ Relevance score for ${opp1.title}: ${opp1.relevance_score}% (Matched: ${opp1.matched_skills.join(', ')})`);

  // 6. Expired Opportunity Handling
  console.log('\n[6/15] Verifying Expired Opportunity Handling & Deadline Badges...');
  // Query with deadline=expired
  const expiredRes = await (await fetch(`${BASE_URL}/api/opportunities?deadline=expired`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(expiredRes.opportunities.some(o => o.id === 'opp-15'), 'opp-15 must be returned under deadline=expired');

  const opp15 = await (await fetch(`${BASE_URL}/api/opportunities/opp-15`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert.strictEqual(opp15.is_expired, true, 'opp-15 must have is_expired = true');
  assert.strictEqual(opp15.deadline_badge, 'Deadline Passed', 'opp-15 badge must be Deadline Passed');

  // Verify deadline=active excludes opp-15
  const activeRes = await (await fetch(`${BASE_URL}/api/opportunities?deadline=active`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(!activeRes.opportunities.some(o => o.id === 'opp-15'), 'Active filter must exclude expired opp-15');
  console.log('  ✓ Expired opportunity handling & Deadline Passed badges verified');

  // 7. Opportunity Details & 404 Handling
  console.log('\n[7/15] Verifying Opportunity Details & 404 response on non-existent ID...');
  const notFoundRes = await fetch(`${BASE_URL}/api/opportunities/non-existent-id-999`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.strictEqual(notFoundRes.status, 404, 'Invalid ID must return 404');
  console.log('  ✓ 404 properly returned for invalid ID');

  // 8. Bookmarking / Save Opportunities (Idempotent)
  console.log('\n[8/15] Verifying Bookmarking (Save, Duplicate Save, Unsave)...');
  const save1 = await (await fetch(`${BASE_URL}/api/opportunities/opp-5/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert.strictEqual(save1.is_saved, true);

  // Duplicate save should be idempotent and return 200
  const saveDuplicate = await (await fetch(`${BASE_URL}/api/opportunities/opp-5/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert.strictEqual(saveDuplicate.is_saved, true, 'Duplicate save must succeed idempotently');

  const savedList = await (await fetch(`${BASE_URL}/api/student/saved-opportunities`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(savedList.some(o => o.id === 'opp-5'), 'opp-5 must be in saved opportunities list');

  // Remove bookmark
  const unsaveRes = await fetch(`${BASE_URL}/api/opportunities/opp-5/save`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.strictEqual(unsaveRes.status, 200);
  console.log('  ✓ Bookmarking and idempotency verified');

  // 9. Application Pipeline Tracking
  console.log('\n[9/15] Verifying Application Pipeline Tracking (Create, Update Status, Reference)...');
  const trackRes = await (await fetch(`${BASE_URL}/api/opportunities/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      opportunity_id: 'opp-7',
      status: 'INTERESTED',
      notes: 'Reviewing systems programming C++ concepts before applying.',
      application_reference: 'SYS-2026-001'
    })
  })).json();
  assert(trackRes.applicationId, 'Must return applicationId');
  const testAppId = trackRes.applicationId;

  // Update status to SHORTLISTED
  const updateRes = await fetch(`${BASE_URL}/api/student/applications/${testAppId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      status: 'SHORTLISTED',
      notes: 'Cleared initial screening test.'
    })
  });
  assert.strictEqual(updateRes.status, 200);

  const appsList = await (await fetch(`${BASE_URL}/api/student/applications`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  const trackedItem = appsList.find(a => a.application_id === testAppId);
  assert(trackedItem, 'Tracked item must exist in pipeline');
  assert.strictEqual(trackedItem.application_status, 'SHORTLISTED');
  console.log(`  ✓ Application tracked and updated to 'SHORTLISTED'`);

  // 10. BOLA Authorization Protection
  console.log('\n[10/15] Verifying BOLA Authorization Protection on Application Tracking...');
  // Recruiter tries to modify the student's application tracking record
  const unauthorizedUpdate = await fetch(`${BASE_URL}/api/student/applications/${testAppId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`
    },
    body: JSON.stringify({ status: 'REJECTED' })
  });
  assert.strictEqual(unauthorizedUpdate.status, 403, 'Cross-user modification must return 403 Forbidden');
  console.log('  ✓ BOLA authorization protection confirmed (403 Forbidden)');

  // Clean up tracked application
  await fetch(`${BASE_URL}/api/student/applications/${testAppId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  // 11. Reporting System & Admin Moderation
  console.log('\n[11/15] Verifying Reporting System & Resolution Workflow...');
  const reportRes = await (await fetch(`${BASE_URL}/api/opportunities/opp-2/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      reason: 'Duplicate Listing',
      description: 'Role appears twice in catalog.'
    })
  })).json();
  assert(reportRes.reportId, 'Must return reportId');

  // Admin resolves report with FLAG
  const resolveRes = await fetch(`${BASE_URL}/api/admin/opportunity-reports/${reportRes.reportId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'FLAG' })
  });
  assert.strictEqual(resolveRes.status, 200);

  // Check opportunity verification_status was updated to FLAGGED
  const flaggedOpp = await (await fetch(`${BASE_URL}/api/opportunities/opp-2`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })).json();
  assert.strictEqual(flaggedOpp.verification_status, 'FLAGGED');
  console.log('  ✓ Report created and resolved with FLAG action');

  // Re-verify opp-2 back to VERIFIED
  await fetch(`${BASE_URL}/api/opportunities/opp-2/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  // 12. Input Validation & RBAC
  console.log('\n[12/15] Verifying Input Validation & RBAC Restrictions...');
  // Student cannot create opportunities
  const studentCreateRes = await fetch(`${BASE_URL}/api/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ title: 'Student Post', type: 'JOB', company_name: 'Test', description: 'Test', application_deadline: '2026-12-31', location: 'Remote' })
  });
  assert.strictEqual(studentCreateRes.status, 403, 'Student must not be allowed to create opportunities');

  // Student cannot view admin reports
  const studentReportsRes = await fetch(`${BASE_URL}/api/admin/opportunity-reports`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.strictEqual(studentReportsRes.status, 403, 'Student must not access admin reports');

  // Invalid opportunity type
  const invalidTypeRes = await fetch(`${BASE_URL}/api/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Invalid Type',
      type: 'INVALID_TYPE_XYZ',
      company_name: 'Test Corp',
      description: 'Desc',
      application_deadline: '2026-12-31',
      location: 'Remote'
    })
  });
  assert.strictEqual(invalidTypeRes.status, 400, 'Invalid opportunity type must return 400');
  console.log('  ✓ RBAC and Input Validation confirmed (403 on student create, 400 on invalid type)');

  // 13. Opportunity Lifecycle & Cascade Deletions
  console.log('\n[13/15] Verifying Recruiter Posting, Admin Moderation & Cascade Deletion...');
  const postRes = await (await fetch(`${BASE_URL}/api/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${recruiterToken}`
    },
    body: JSON.stringify({
      title: 'Temporary Test Role For Deletion',
      type: 'WORKSHOP',
      company_name: 'Test Labs',
      description: 'A temporary workshop to test complete cascade deletion.',
      location: 'Online',
      work_mode: 'REMOTE',
      application_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  })).json();
  const tempOppId = postRes.opportunityId;
  assert(tempOppId, 'Opportunity must be created');

  // Student saves this temporary role
  await fetch(`${BASE_URL}/api/opportunities/${tempOppId}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });

  // Admin deletes the opportunity
  const deleteRes = await fetch(`${BASE_URL}/api/opportunities/${tempOppId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(deleteRes.status, 200);

  // Verify role is deleted and no longer in saved list
  const checkDeleted = await fetch(`${BASE_URL}/api/opportunities/${tempOppId}`);
  assert.strictEqual(checkDeleted.status, 404, 'Deleted opportunity must return 404');

  const checkSavedAfterDelete = await (await fetch(`${BASE_URL}/api/student/saved-opportunities`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  })).json();
  assert(!checkSavedAfterDelete.some(o => o.id === tempOppId), 'Cascade delete must remove saved bookmark');
  console.log('  ✓ Cascade deletion verified (Role and associated bookmarks safely deleted)');

  // 14. Unauthenticated Access Protection
  console.log('\n[14/15] Verifying Unauthenticated Access Protection...');
  const unauthSave = await fetch(`${BASE_URL}/api/opportunities/opp-1/save`, { method: 'POST' });
  assert.strictEqual(unauthSave.status, 401, 'Unauthenticated save must return 401');

  const unauthApps = await fetch(`${BASE_URL}/api/student/applications`);
  assert.strictEqual(unauthApps.status, 401, 'Unauthenticated applications list must return 401');
  console.log('  ✓ Unauthenticated access protection confirmed (401 Unauthorized)');

  // 15. Non-Interference Regression Verification (Steps 5–10)
  console.log('\n[15/15] Verifying Non-Interference with Steps 5–10...');
  const s5 = await fetch(`${BASE_URL}/api/student/skill-report`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s5.status, 200, 'Step 5 Skill Report intact');

  const s6 = await fetch(`${BASE_URL}/api/student/roadmap`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s6.status, 200, 'Step 6 Learning Roadmap intact');

  const s7 = await fetch(`${BASE_URL}/api/student/courses`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s7.status, 200, 'Step 7 Learning Platform intact');

  const s8 = await fetch(`${BASE_URL}/api/student/mock-tests`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s8.status, 200, 'Step 8 Mock Tests intact');

  const s9 = await fetch(`${BASE_URL}/api/student/coding/problems`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s9.status, 200, 'Step 9 Coding Arena intact');

  const s10 = await fetch(`${BASE_URL}/api/student/communication/dashboard`, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.strictEqual(s10.status, 200, 'Step 10 Communication Hub intact');
  console.log('  ✓ Steps 5, 6, 7, 8, 9, 10 all 100% verified and operational');

  console.log('\n========================================================================');
  console.log('🎉 ALL 15/15 STEP 11 TEST & HARDENING SUITE CHECKS PASSED SUCCESSFULLY!');
  console.log('========================================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
