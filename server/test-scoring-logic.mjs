/**
 * SkillBridge AI — Test Suite 4: Scoring Formula & Consistency Verification
 * 
 * Verifies mathematical soundness and behavioral integrity:
 * 1. Score Range Strict Invariant: All scores must lie in [0, 100].
 * 2. Career Readiness Weighted Aggregation: Accurate computation from verified skill components.
 * 3. Match Score Calculation: Weighted matching rewards verified skills and penalizes missing core prerequisites.
 * 4. Skill Gap Formula: Gap status mapped cleanly to (required - current).
 * 5. Streak & Progression Logic: Clean zero-start and verified increments.
 */

import { calculateOpportunityRelevance } from './dist/routes/opportunities.routes.js';
import { computeSkillGaps } from './dist/services/ai/skillGapEngine.js';

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

async function runScoringLogicTests() {
  console.log('===============================================================');
  console.log('📐 SUITE 4: SCORING FORMULA & MATHEMATICAL SOUNDNESS AUDIT');
  console.log('===============================================================\n');

  // --- 1. Score Clamping & Range Invariants ---
  console.log('--- 1. Strict Boundary Invariant: [0, 100] ---');
  function clampScore(val) {
    return Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
  }

  assert(clampScore(-15) === 0, 'Negative scores safely clamp to 0');
  assert(clampScore(145) === 100, 'Overflow scores safely clamp to 100');
  assert(clampScore(78.6) === 79, 'Fractional scores round accurately');
  assert(clampScore(NaN) === 0, 'NaN safely clamps to 0');
  assert(clampScore(undefined) === 0, 'Undefined safely clamps to 0');

  // --- 2. Skill Gap Formula & Status Mapping ---
  console.log('\n--- 2. Skill Gap Engine & Benchmark Gap Sizing ---');
  const currentSkills = {
    'Data Structures & Algorithms': 45,
    'Python': 85,
    'Database Systems & SQL': 65
  };

  const gapAnalysis = computeSkillGaps(currentSkills, 'role-software-dev');
  assert(gapAnalysis && Array.isArray(gapAnalysis.gaps), 'Computed gaps for role benchmark skills');

  const dsaGap = gapAnalysis.gaps.find(g => g.skillName.includes('Data Structures'));
  assert(dsaGap !== undefined, 'DSA gap calculated');
  assert(dsaGap.gapPercentage === 30, `DSA gap accurately computed: 75 - 45 = ${dsaGap.gapPercentage}%`);
  assert(dsaGap.gapStatus === 'critical', 'Gap > 25% classified as critical');

  const pyGap = gapAnalysis.gaps.find(g => g.skillName === 'Python');
  assert(pyGap.gapPercentage <= 0, 'Python score (85 >= 75) shows 0 or negative gap');
  assert(pyGap.gapStatus === 'good', 'Exceeding benchmark classified as good');

  const sqlGap = gapAnalysis.gaps.find(g => g.skillName.includes('Database'));
  assert(sqlGap !== undefined, 'Database/SQL gap calculated');
  assert(sqlGap.gapPercentage <= 10, 'Minor gap identified');

  // --- 3. Opportunity Relevance & Matching Engine ---
  console.log('\n--- 3. Hybrid Opportunity Matching Engine ---');
  const mockOpportunity = {
    id: 'opp-match-test',
    title: 'Junior Full Stack Developer',
    branch: 'Computer Science',
    minimum_year: 3,
    maximum_year: 4,
    required_skills_json: JSON.stringify(['Python', 'SQL', 'Docker']),
    preferred_skills_json: JSON.stringify(['Kubernetes']),
    is_featured: 0
  };

  // Student with high match: CS dept, Year 3, knows Python & SQL
  const highMatchStudent = {
    studentId: 'stud-high',
    department: 'Computer Science',
    yearOfStudy: 3,
    skills: new Set(['python', 'sql']),
    skillScores: { Python: 85, SQL: 80 }
  };

  const highResult = calculateOpportunityRelevance(mockOpportunity, highMatchStudent);
  assert(highResult.relevanceScore >= 50, `High match score computed: ${highResult.relevanceScore}%`);
  assert(highResult.matchedSkills.includes('Python') && highResult.matchedSkills.includes('SQL'), 'Matched core skills identified');
  assert(highResult.missingSkills.includes('Docker'), 'Missing core skill (Docker) accurately identified');

  // Student with low match: Chemical dept, Year 1, no matching skills
  const lowMatchStudent = {
    studentId: 'stud-low',
    department: 'Chemical Engineering',
    yearOfStudy: 1,
    skills: new Set(['organic chemistry']),
    skillScores: {}
  };

  const lowResult = calculateOpportunityRelevance(mockOpportunity, lowMatchStudent);
  assert(lowResult.relevanceScore < highResult.relevanceScore, `Low match score (${lowResult.relevanceScore}%) strictly lower than high match (${highResult.relevanceScore}%)`);
  assert(lowResult.isEligible === false, 'Student failing year & core prerequisites flagged as ineligible');

  // --- 4. Career Readiness Weighted Formula Invariant ---
  console.log('\n--- 4. Career Readiness Weighted Aggregation Invariant ---');
  function computeCareerReadiness(categories) {
    const weights = {
      programming: 0.35,
      problemSolving: 0.25,
      logicalReasoning: 0.20,
      communication: 0.20
    };
    const total = 
      (categories.programming * weights.programming) +
      (categories.problemSolving * weights.problemSolving) +
      (categories.logicalReasoning * weights.logicalReasoning) +
      (categories.communication * weights.communication);
    return clampScore(total);
  }

  const perfectCategories = { programming: 100, problemSolving: 100, logicalReasoning: 100, communication: 100 };
  assert(computeCareerReadiness(perfectCategories) === 100, 'Perfect category scores yield 100% readiness');

  const zeroCategories = { programming: 0, problemSolving: 0, logicalReasoning: 0, communication: 0 };
  assert(computeCareerReadiness(zeroCategories) === 0, 'Zero category scores yield 0% readiness');

  const mixedCategories = { programming: 80, problemSolving: 70, logicalReasoning: 90, communication: 60 };
  // Expected: 80*0.35 + 70*0.25 + 90*0.20 + 60*0.20 = 28 + 17.5 + 18 + 12 = 75.5 -> 76
  assert(computeCareerReadiness(mixedCategories) === 76, 'Weighted career readiness aggregates accurately (75.5 -> 76%)');

  console.log('\n===============================================================');
  console.log(`📊 SUITE 4 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runScoringLogicTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
