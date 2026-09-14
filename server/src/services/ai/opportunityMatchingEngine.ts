import { queryAll, queryOne, execute, db } from '../../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export const ENGINE_VERSION = 'v1.2.0-hybrid';

// Mandatory legal & fairness disclaimers
export const MATCHING_DISCLAIMER = 'This score indicates profile similarity, not selection probability.';
export const AI_RECOMMENDATION_NOTICE =
  'AI recommendations are suggestions based on your profile and opportunity requirements. They do not guarantee selection, interview calls, or placement.';

// Skill aliases dictionary for fuzzy case-insensitive mapping
export const SKILL_ALIASES: Record<string, string[]> = {
  python: ['py', 'python3', 'python 3', 'core python'],
  javascript: ['js', 'java script', 'es6', 'ecmascript', 'modern javascript'],
  typescript: ['ts', 'type script'],
  'c++': ['cpp', 'c plus plus', 'c/c++'],
  c: ['c language', 'ansi c'],
  java: ['core java', 'java 8', 'java 11', 'java 17', 'jvm'],
  'artificial intelligence': ['ai', 'genai', 'generative ai', 'applied ai'],
  'machine learning': ['ml', 'deep learning', 'statistical learning'],
  sql: ['database systems & sql', 'relational databases', 'mysql', 'postgresql', 'sqlite', 'rdbms', 'dbms'],
  'data structures & algorithms': ['dsa', 'data structures', 'algorithms', 'problem solving', 'problem solving & logic', 'ds & algo'],
  'problem solving': ['problem solving & logic', 'analytical thinking', 'algorithmic thinking', 'aptitude'],
  'web & api architecture': ['rest api', 'restful api', 'api design', 'restful apis', 'web apis', 'backend api', 'microservices'],
  react: ['reactjs', 'react.js', 'react native', 'frontend react'],
  'node.js': ['nodejs', 'node', 'express', 'express.js', 'backend node'],
  html: ['html5', 'markup'],
  css: ['css3', 'modern css', 'responsive design'],
  docker: ['containerization', 'containers'],
  kubernetes: ['k8s', 'orchestration'],
  aws: ['amazon web services', 'cloud infrastructure', 'cloud computing', 'cloud devops'],
  git: ['github', 'version control', 'git & github'],
  linux: ['unix', 'bash', 'shell scripting', 'posix'],
  'english communication': ['english', 'communication skills', 'professional communication', 'verbal communication', 'soft skills'],
  'system design': ['distributed systems', 'low latency systems', 'system architecture', 'scalability']
};

/**
 * Normalizes skill name using lowercase trimming and canonical alias mapping.
 */
export function normalizeSkillName(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.toLowerCase().trim().replace(/[-_]/g, ' ');
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (cleaned === canonical || aliases.some(a => a.toLowerCase() === cleaned)) {
      return canonical;
    }
  }
  return cleaned;
}

/**
 * Checks if two skill names refer to the same conceptual skill.
 */
export function areSkillsMatching(skillA: string, skillB: string): boolean {
  const normA = normalizeSkillName(skillA);
  const normB = normalizeSkillName(skillB);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Check alias overlap
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    const family = [canonical, ...aliases.map(a => a.toLowerCase())];
    const hasA = family.some(f => normA === f || normA.includes(f) || f.includes(normA));
    const hasB = family.some(f => normB === f || normB.includes(f) || f.includes(normB));
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Converts a 0-100 score into a 1-5 level indicator.
 */
export function scoreToLevel(score: number): number {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

export interface SkillComparisonRow {
  skillName: string;
  studentLevel: number;
  studentScore: number;
  requiredLevel: number;
  status: 'Matched' | 'Needs Improvement' | 'Missing';
  isPreferred?: boolean;
}

export interface FactorBreakdown {
  skillMatch: number; // 40%
  eligibility: number; // 20%
  education: number; // 15%
  experience: number; // 10%
  locationWorkMode: number; // 5%
  communication: number; // 5%
  preference: number; // 5%
}

export interface ImprovementSuggestions {
  recommendedCourse?: {
    id: string;
    title: string;
    description: string;
    hours: number;
  };
  recommendedProblems: Array<{
    id: string;
    title: string;
    difficulty: string;
    category: string;
  }>;
  recommendedMockTest?: {
    id: string;
    title: string;
    durationMinutes: number;
  };
  recommendedCommunication: string;
  recommendedProjectTask: string;
}

export interface MatchEvaluation {
  matchingScore: number;
  matchCategory: 'EXCELLENT_MATCH' | 'STRONG_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'LOW_MATCH';
  matchCategoryLabel: string;
  matchedSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
  optionalSkills: string[];
  skillComparison: SkillComparisonRow[];
  eligibilityStatus: 'Eligible' | 'Possibly Eligible' | 'Not Eligible' | 'Eligibility Information Missing' | 'Deadline Passed';
  eligibilityReasons: string[];
  factorBreakdown: FactorBreakdown;
  explanation: string;
  whyMatched: string[];
  improvementSuggestions: ImprovementSuggestions;
  engineVersion: string;
}

/**
 * Evaluates student eligibility against an opportunity.
 */
export function evaluateEligibility(
  studentProfile: any,
  opportunity: any
): { status: MatchEvaluation['eligibilityStatus']; reasons: string[]; score: number } {
  const reasons: string[] = [];

  // Check deadline
  if (opportunity.application_deadline) {
    const deadline = new Date(opportunity.application_deadline);
    const now = new Date();
    if (deadline.getTime() < now.getTime()) {
      return {
        status: 'Deadline Passed',
        reasons: ['The application deadline for this opportunity has passed.'],
        score: 0
      };
    }
  }

  const currentYear = studentProfile?.year_of_study || 3;
  const minYear = opportunity.minimum_year ?? 1;
  const maxYear = opportunity.maximum_year ?? 4;

  let yearEligible = false;
  if (currentYear >= minYear && currentYear <= maxYear) {
    yearEligible = true;
    reasons.push(`Your academic standing (Year ${currentYear}) meets the required batch criterion (Years ${minYear}–${maxYear}).`);
  } else if (currentYear < minYear) {
    reasons.push(`Requires students in Year ${minYear} to ${maxYear}; you are currently in Year ${currentYear}.`);
  } else {
    reasons.push(`Requires students up to Year ${maxYear}; you are currently in Year ${currentYear}.`);
  }

  // Branch check
  const dept = (studentProfile?.department || 'Computer Science & Engineering').toLowerCase();
  const branchReq = (opportunity.branch || '').toLowerCase();
  let branchEligible = true;
  if (branchReq && !branchReq.includes('all') && !branchReq.includes('any')) {
    const matchesDept =
      branchReq.includes('cs') ||
      branchReq.includes('computer') ||
      branchReq.includes('it') ||
      branchReq.includes('information technology') ||
      branchReq.includes('engineering');
    if (!matchesDept && !branchReq.includes(dept)) {
      branchEligible = false;
      reasons.push(`Opportunity specifies branches: "${opportunity.branch}".`);
    } else {
      reasons.push(`Your department (${studentProfile?.department || 'CSE'}) is aligned with eligible academic programs.`);
    }
  } else {
    reasons.push('All engineering and technological branches are eligible to participate.');
  }

  if (yearEligible && branchEligible) {
    return {
      status: 'Eligible',
      reasons,
      score: 100
    };
  }

  if (yearEligible || Math.abs(currentYear - minYear) <= 1) {
    return {
      status: 'Possibly Eligible',
      reasons,
      score: 65
    };
  }

  return {
    status: 'Not Eligible',
    reasons,
    score: 20
  };
}

/**
 * Calculates skill matching score and generates comparison table.
 */
export function evaluateSkillsMatch(
  studentSkills: Array<{ name: string; score: number; level: number }>,
  requiredSkills: string[],
  preferredSkills: string[] = []
): {
  score: number;
  matched: string[];
  partial: string[];
  missing: string[];
  optional: string[];
  comparison: SkillComparisonRow[];
} {
  const matched: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  const optional: string[] = [];
  const comparison: SkillComparisonRow[] = [];

  let requiredScoreSum = 0;
  const totalRequired = Math.max(1, requiredSkills.length);

  for (const req of requiredSkills) {
    const studentSkill = studentSkills.find(s => areSkillsMatching(s.name, req));
    const studentScore = studentSkill ? studentSkill.score : 30;
    const studentLevel = studentSkill ? studentSkill.level : 1;
    const requiredLevel = 3; // Default benchmark Level 3

    if (studentScore >= 60) {
      matched.push(req);
      requiredScoreSum += Math.min(100, studentScore);
      comparison.push({
        skillName: req,
        studentLevel,
        studentScore,
        requiredLevel,
        status: 'Matched'
      });
    } else if (studentScore >= 40) {
      partial.push(req);
      requiredScoreSum += studentScore;
      comparison.push({
        skillName: req,
        studentLevel,
        studentScore,
        requiredLevel,
        status: 'Needs Improvement'
      });
    } else {
      missing.push(req);
      requiredScoreSum += Math.max(10, studentScore);
      comparison.push({
        skillName: req,
        studentLevel,
        studentScore,
        requiredLevel,
        status: 'Missing'
      });
    }
  }

  // Bonus for preferred skills
  let bonus = 0;
  for (const pref of preferredSkills) {
    const studentSkill = studentSkills.find(s => areSkillsMatching(s.name, pref));
    const studentScore = studentSkill ? studentSkill.score : 25;
    const studentLevel = studentSkill ? studentSkill.level : 1;
    optional.push(pref);

    if (studentScore >= 60) {
      bonus += 5;
      comparison.push({
        skillName: pref,
        studentLevel,
        studentScore,
        requiredLevel: 2,
        status: 'Matched',
        isPreferred: true
      });
    } else {
      comparison.push({
        skillName: pref,
        studentLevel,
        studentScore,
        requiredLevel: 2,
        status: studentScore >= 40 ? 'Needs Improvement' : 'Missing',
        isPreferred: true
      });
    }
  }

  const baseAverage = Math.round(requiredScoreSum / totalRequired);
  const finalSkillScore = Math.min(100, Math.max(10, baseAverage + bonus));

  return {
    score: finalSkillScore,
    matched,
    partial,
    missing,
    optional,
    comparison
  };
}

/**
 * Evaluates student preferences vs opportunity.
 */
export function evaluatePreferenceMatch(
  preferences: any,
  opportunity: any
): number {
  if (!preferences) return 80;

  let points = 50;
  const preferredRoles: string[] = preferences.preferred_roles || [];
  const preferredModes: string[] = preferences.preferred_work_modes || [];
  const preferredTypes: string[] = preferences.preferred_types || [];
  const preferredLocations: string[] = preferences.preferred_locations || [];

  // Match role
  if (preferredRoles.length > 0) {
    const roleMatch = preferredRoles.some(r =>
      opportunity.title.toLowerCase().includes(r.toLowerCase()) ||
      (opportunity.short_description || '').toLowerCase().includes(r.toLowerCase())
    );
    if (roleMatch) points += 20;
  } else {
    points += 15;
  }

  // Match type
  if (preferredTypes.length > 0) {
    if (preferredTypes.includes(opportunity.type)) points += 15;
  } else {
    points += 10;
  }

  // Match work mode
  if (preferredModes.length > 0) {
    if (preferredModes.includes(opportunity.work_mode)) points += 15;
  } else {
    points += 10;
  }

  return Math.min(100, Math.max(20, points));
}

/**
 * Evaluates location and work mode alignment.
 */
export function evaluateLocationWorkMode(preferences: any, opportunity: any): number {
  if (opportunity.work_mode === 'REMOTE') return 100;
  const preferredLocations: string[] = preferences?.preferred_locations || [];
  if (preferredLocations.length === 0) return 85;

  const loc = (opportunity.location || '').toLowerCase();
  const hasMatch = preferredLocations.some(l => loc.includes(l.toLowerCase()));
  if (hasMatch) return 100;

  if (opportunity.work_mode === 'HYBRID') return 75;
  return 55;
}

/**
 * Generates structured 6-step Preparation Plan for a specific opportunity.
 */
export function generatePreparationPlan(
  opportunity: any,
  missingSkills: string[],
  matchedSkills: string[]
): Array<{
  stepIndex: number;
  title: string;
  type: 'COURSE' | 'PRACTICE' | 'CODING' | 'PROJECT' | 'MOCK_TEST' | 'REVIEW';
  actionUrl: string;
  completed: boolean;
  description: string;
}> {
  const primaryFocus = missingSkills[0] || matchedSkills[0] || 'Technical Fundamentals';
  const secondaryFocus = missingSkills[1] || 'Applied System Design';

  return [
    {
      stepIndex: 1,
      title: `Complete ${primaryFocus} Basics`,
      type: 'COURSE',
      actionUrl: '/student/courses',
      completed: false,
      description: `Complete foundational modules covering ${primaryFocus} core syntax, libraries, and design patterns.`
    },
    {
      stepIndex: 2,
      title: `Practice ${secondaryFocus} Key Commands & Frameworks`,
      type: 'PRACTICE',
      actionUrl: '/student/learning',
      completed: false,
      description: `Hands-on guided walkthrough and flash exercises to solidify ${secondaryFocus} proficiency.`
    },
    {
      stepIndex: 3,
      title: `Solve 5 Targeted Coding Problems in ${primaryFocus}`,
      type: 'CODING',
      actionUrl: '/student/coding/problems',
      completed: false,
      description: `Practice algorithmic challenges in the Coding Arena that match the interview style of ${opportunity.company_name}.`
    },
    {
      stepIndex: 4,
      title: `Build Mini Project Showcase`,
      type: 'PROJECT',
      actionUrl: '/student/roadmap',
      completed: false,
      description: `Create a clean GitHub project repository demonstrating end-to-end integration for ${opportunity.title}.`
    },
    {
      stepIndex: 5,
      title: `Attempt the Related AI Mock Test`,
      type: 'MOCK_TEST',
      actionUrl: '/student/mock-tests',
      completed: false,
      description: `Take a timed, proctored mock assessment to benchmark your readiness and earn verified skill score improvement.`
    },
    {
      stepIndex: 6,
      title: `Review Opportunity & Submit Application`,
      type: 'REVIEW',
      actionUrl: `/student/opportunities/${opportunity.id}`,
      completed: false,
      description: `Review your updated match percentage, confirm all portfolio links, and proceed to the official application.`
    }
  ];
}

/**
 * Calculates complete match evaluation for a single opportunity and student.
 */
export function calculateStudentOpportunityMatch(
  studentId: string,
  opportunity: any
): MatchEvaluation {
  // 1. Fetch Student Profile
  const profile = queryOne<any>(
    `SELECT sp.*, u.name, u.email FROM student_profiles sp JOIN users u ON u.id = sp.user_id WHERE sp.user_id = ?`,
    [studentId]
  );

  // 2. Fetch Student Verified Skills
  const studentSkillsRaw = queryAll<any>(
    `SELECT s.name, ss.current_level as score, ss.verified_score
     FROM student_skills ss
     JOIN skills s ON s.id = ss.skill_id
     WHERE ss.user_id = ?`,
    [studentId]
  );

  const studentSkills = studentSkillsRaw.map(s => ({
    name: s.name,
    score: Number(s.verified_score || s.score || 50),
    level: scoreToLevel(Number(s.verified_score || s.score || 50))
  }));

  // Fallback to languages if empty
  if (studentSkills.length === 0) {
    studentSkills.push({ name: 'Python', score: 65, level: 3 });
    studentSkills.push({ name: 'SQL', score: 60, level: 3 });
    studentSkills.push({ name: 'English Communication', score: 75, level: 4 });
  }

  // 3. Fetch Student Preferences
  const prefRow = queryOne<any>(
    `SELECT * FROM student_opportunity_preferences WHERE student_id = ?`,
    [studentId]
  );
  const preferences = prefRow
    ? {
        preferred_roles: JSON.parse(prefRow.preferred_roles_json || '[]'),
        preferred_skills: JSON.parse(prefRow.preferred_skills_json || '[]'),
        preferred_locations: JSON.parse(prefRow.preferred_locations_json || '[]'),
        preferred_work_modes: JSON.parse(prefRow.preferred_work_modes_json || '[]'),
        preferred_types: JSON.parse(prefRow.preferred_types_json || '[]'),
        minimum_stipend: prefRow.minimum_stipend || 0,
        minimum_salary: prefRow.minimum_salary || 0
      }
    : null;

  // 4. Parse Opportunity Skills
  const requiredSkills: string[] = JSON.parse(opportunity.required_skills_json || '[]');
  const preferredSkills: string[] = JSON.parse(opportunity.preferred_skills_json || '[]');

  // 5. Evaluate Skills Match (40% Weight)
  const skillsEval = evaluateSkillsMatch(studentSkills, requiredSkills, preferredSkills);

  // 6. Evaluate Eligibility (20% Weight)
  const eligibilityEval = evaluateEligibility(profile, opportunity);

  // 7. Evaluate Education and Branch (15% Weight)
  const educationScore = eligibilityEval.score === 100 ? 90 : eligibilityEval.score === 65 ? 75 : 45;

  // 8. Evaluate Experience and Project Performance (10% Weight)
  const codingSubmissionsCount = queryOne<any>(
    `SELECT COUNT(*) as cnt FROM coding_submissions WHERE student_id = ? AND status = 'ACCEPTED'`,
    [studentId]
  )?.cnt || 0;
  const coursesCompletedCount = queryOne<any>(
    `SELECT COUNT(*) as cnt FROM course_enrollments WHERE (user_id = ? OR student_id = ?) AND status = 'completed'`,
    [studentId, studentId]
  )?.cnt || 0;
  const experienceScore = Math.min(100, Math.max(45, 60 + codingSubmissionsCount * 5 + coursesCompletedCount * 10));

  // 9. Evaluate Location & Work Mode Preference (5% Weight)
  const locationWorkModeScore = evaluateLocationWorkMode(preferences, opportunity);

  // 10. Evaluate Communication Score (5% Weight)
  const commScoreRow = queryOne<any>(
    `SELECT AVG(score) as avg_score FROM communication_skill_results WHERE student_id = ?`,
    [studentId]
  );
  const commScore = commScoreRow?.avg_score ? Math.round(Number(commScoreRow.avg_score)) : 75;

  // 11. Evaluate Opportunity Preference Score (5% Weight)
  const preferenceScore = evaluatePreferenceMatch(preferences, opportunity);

  // 12. Calculate Final Weighted Score Bounded 0 - 100
  const weightedTotal =
    skillsEval.score * 0.40 +
    eligibilityEval.score * 0.20 +
    educationScore * 0.15 +
    experienceScore * 0.10 +
    locationWorkModeScore * 0.05 +
    commScore * 0.05 +
    preferenceScore * 0.05;

  const matchingScore = Math.round(Math.min(100, Math.max(0, weightedTotal)));

  // Categorization
  let matchCategory: MatchEvaluation['matchCategory'] = 'LOW_MATCH';
  let matchCategoryLabel = 'Low Match';

  if (matchingScore >= 90) {
    matchCategory = 'EXCELLENT_MATCH';
    matchCategoryLabel = 'Excellent Match';
  } else if (matchingScore >= 75) {
    matchCategory = 'STRONG_MATCH';
    matchCategoryLabel = 'Strong Match';
  } else if (matchingScore >= 60) {
    matchCategory = 'GOOD_MATCH';
    matchCategoryLabel = 'Good Match';
  } else if (matchingScore >= 40) {
    matchCategory = 'PARTIAL_MATCH';
    matchCategoryLabel = 'Partial Match';
  }

  // Why this matches you bullets
  const whyMatched: string[] = [];
  if (skillsEval.matched.length > 0) {
    whyMatched.push(`Your verified skills in ${skillsEval.matched.slice(0, 3).join(', ')} directly meet technical requirements.`);
  }
  if (eligibilityEval.status === 'Eligible') {
    whyMatched.push(`Your current academic status matches the target graduation and batch criteria.`);
  }
  if (commScore >= 70) {
    whyMatched.push(`Your workplace English communication benchmark (${commScore}/100) satisfies recruiter collaboration expectations.`);
  }
  if (opportunity.work_mode === 'REMOTE' || (preferences?.preferred_work_modes || []).includes(opportunity.work_mode)) {
    whyMatched.push(`The ${opportunity.work_mode.toLowerCase()} work mode fits your selected career preferences.`);
  }
  if (codingSubmissionsCount >= 2) {
    whyMatched.push(`Your active coding arena track record (${codingSubmissionsCount} verified problem solutions) supports this engineering role.`);
  }

  // Summary explanation
  let explanation = `Your profile shows a ${matchCategoryLabel.toLowerCase()} (${matchingScore}%) for this ${opportunity.type.toLowerCase().replace('_', ' ')}. `;
  if (skillsEval.matched.length > 0) {
    explanation += `Matched skills include ${skillsEval.matched.slice(0, 3).join(', ')}. `;
  }
  if (skillsEval.missing.length > 0) {
    explanation += `Recommended preparation: Complete ${skillsEval.missing.slice(0, 2).join(' and ')} modules before final application.`;
  } else {
    explanation += `All primary technical prerequisites are satisfied.`;
  }

  // Improvement Suggestions (mapped to platform courses and problems)
  const focusSkill = skillsEval.missing[0] || skillsEval.partial[0] || skillsEval.matched[0] || 'Python';
  const recommendedCourse = queryOne<any>(
    `SELECT id, title, description, estimated_hours as hours FROM courses WHERE title LIKE ? OR description LIKE ? LIMIT 1`,
    [`%${focusSkill}%`, `%${focusSkill}%`]
  ) || queryOne<any>(`SELECT id, title, description, estimated_hours as hours FROM courses LIMIT 1`);

  const recommendedProblems = queryAll<any>(
    `SELECT id, title, difficulty, topic as category FROM coding_problems WHERE title LIKE ? OR topic LIKE ? LIMIT 2`,
    [`%${focusSkill}%`, `%${focusSkill}%`]
  );
  if (recommendedProblems.length === 0) {
    const fallbackProblems = queryAll<any>(`SELECT id, title, difficulty, topic as category FROM coding_problems LIMIT 2`);
    recommendedProblems.push(...fallbackProblems);
  }

  const recommendedMockTest = queryOne<any>(
    `SELECT id, title, duration_minutes as durationMinutes FROM mock_tests WHERE title LIKE ? LIMIT 1`,
    [`%${focusSkill}%`]
  ) || queryOne<any>(`SELECT id, title, duration_minutes as durationMinutes FROM mock_tests LIMIT 1`);

  const improvementSuggestions: ImprovementSuggestions = {
    recommendedCourse: recommendedCourse
      ? {
          id: recommendedCourse.id,
          title: recommendedCourse.title,
          description: recommendedCourse.description || '',
          hours: recommendedCourse.hours || 12
        }
      : undefined,
    recommendedProblems: recommendedProblems.map(p => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      category: p.category
    })),
    recommendedMockTest: recommendedMockTest
      ? {
          id: recommendedMockTest.id,
          title: recommendedMockTest.title,
          durationMinutes: recommendedMockTest.durationMinutes || 45
        }
      : undefined,
    recommendedCommunication: 'Practice placement dialogue & presentation module in Language Hub',
    recommendedProjectTask: `Develop a functional ${focusSkill} service or API project and link repository in application notes.`
  };

  return {
    matchingScore,
    matchCategory,
    matchCategoryLabel,
    matchedSkills: skillsEval.matched,
    partialSkills: skillsEval.partial,
    missingSkills: skillsEval.missing,
    optionalSkills: skillsEval.optional,
    skillComparison: skillsEval.comparison,
    eligibilityStatus: eligibilityEval.status,
    eligibilityReasons: eligibilityEval.reasons,
    factorBreakdown: {
      skillMatch: skillsEval.score,
      eligibility: eligibilityEval.score,
      education: educationScore,
      experience: experienceScore,
      locationWorkMode: locationWorkModeScore,
      communication: commScore,
      preference: preferenceScore
    },
    explanation,
    whyMatched,
    improvementSuggestions,
    engineVersion: ENGINE_VERSION
  };
}

/**
 * Re-evaluates matches across all verified, non-expired opportunities for a student.
 * Updates opportunity_match_results and records history.
 */
export function recalculateStudentMatches(studentId: string): {
  evaluatedCount: number;
  bestMatch: number;
  skillsMatchedCount: number;
  skillsToImproveCount: number;
  eligibleCount: number;
  pendingApplicationsCount: number;
} {
  // Load verified, published opportunities
  const opportunities = queryAll<any>(
    `SELECT * FROM opportunities WHERE status = 'PUBLISHED' AND verification_status = 'VERIFIED'`
  );

  let bestMatch = 0;
  const allMatchedSkills = new Set<string>();
  const allImproveSkills = new Set<string>();
  let eligibleCount = 0;

  for (const opp of opportunities) {
    const evalResult = calculateStudentOpportunityMatch(studentId, opp);
    if (evalResult.matchingScore > bestMatch) {
      bestMatch = evalResult.matchingScore;
    }
    evalResult.matchedSkills.forEach(s => allMatchedSkills.add(s));
    evalResult.missingSkills.forEach(s => allImproveSkills.add(s));
    evalResult.partialSkills.forEach(s => allImproveSkills.add(s));
    if (evalResult.eligibilityStatus === 'Eligible') {
      eligibleCount++;
    }

    const matchId = `match-${studentId}-${opp.id}`;

    // Check existing match to decide whether to record history snapshot
    const existing = queryOne<any>(
      `SELECT matching_score FROM opportunity_match_results WHERE student_id = ? AND opportunity_id = ?`,
      [studentId, opp.id]
    );

    // Save or update match result
    execute(
      `INSERT INTO opportunity_match_results (
        id, student_id, opportunity_id, matching_score, match_category,
        matched_skills_json, partial_skills_json, missing_skills_json, optional_skills_json,
        skill_comparison_json, eligibility_status, eligibility_reasons_json, factor_breakdown_json,
        explanation, why_matched_json, improvement_suggestions_json, engine_version, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, opportunity_id) DO UPDATE SET
        matching_score = excluded.matching_score,
        match_category = excluded.match_category,
        matched_skills_json = excluded.matched_skills_json,
        partial_skills_json = excluded.partial_skills_json,
        missing_skills_json = excluded.missing_skills_json,
        optional_skills_json = excluded.optional_skills_json,
        skill_comparison_json = excluded.skill_comparison_json,
        eligibility_status = excluded.eligibility_status,
        eligibility_reasons_json = excluded.eligibility_reasons_json,
        factor_breakdown_json = excluded.factor_breakdown_json,
        explanation = excluded.explanation,
        why_matched_json = excluded.why_matched_json,
        improvement_suggestions_json = excluded.improvement_suggestions_json,
        engine_version = excluded.engine_version,
        updated_at = CURRENT_TIMESTAMP`,
      [
        matchId,
        studentId,
        opp.id,
        evalResult.matchingScore,
        evalResult.matchCategory,
        JSON.stringify(evalResult.matchedSkills),
        JSON.stringify(evalResult.partialSkills),
        JSON.stringify(evalResult.missingSkills),
        JSON.stringify(evalResult.optionalSkills),
        JSON.stringify(evalResult.skillComparison),
        evalResult.eligibilityStatus,
        JSON.stringify(evalResult.eligibilityReasons),
        JSON.stringify(evalResult.factorBreakdown),
        evalResult.explanation,
        JSON.stringify(evalResult.whyMatched),
        JSON.stringify(evalResult.improvementSuggestions),
        ENGINE_VERSION
      ]
    );

    // Record history snapshot only if no record exists or score changed by at least 2 points
    const shouldRecordHistory =
      !existing || Math.abs(Number(existing.matching_score) - evalResult.matchingScore) >= 2;

    if (shouldRecordHistory) {
      execute(
        `INSERT INTO opportunity_match_history (
          id, student_id, opportunity_id, matching_score, match_category,
          matched_skills_json, missing_skills_json, eligibility_status, explanation, engine_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `hist-${uuidv4().slice(0, 8)}`,
          studentId,
          opp.id,
          evalResult.matchingScore,
          evalResult.matchCategory,
          JSON.stringify(evalResult.matchedSkills),
          JSON.stringify(evalResult.missingSkills),
          evalResult.eligibilityStatus,
          evalResult.explanation,
          ENGINE_VERSION
        ]
      );
    }
  }

  // Count pending applications
  const pendingApplicationsCount = queryOne<any>(
    `SELECT COUNT(*) as cnt FROM opportunity_applications
     WHERE student_id = ? AND status IN ('INTERESTED', 'SAVED', 'APPLIED')`,
    [studentId]
  )?.cnt || 0;

  return {
    evaluatedCount: opportunities.length,
    bestMatch,
    skillsMatchedCount: allMatchedSkills.size,
    skillsToImproveCount: allImproveSkills.size,
    eligibleCount,
    pendingApplicationsCount
  };
}

export const matchStudentToOpportunity = calculateStudentOpportunityMatch;

