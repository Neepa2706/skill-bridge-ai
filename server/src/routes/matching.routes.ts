import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  calculateStudentOpportunityMatch,
  recalculateStudentMatches,
  generatePreparationPlan,
  MATCHING_DISCLAIMER,
  AI_RECOMMENDATION_NOTICE,
  ENGINE_VERSION
} from '../services/ai/opportunityMatchingEngine.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Helper to resolve authenticated student ID safely.
 */
function resolveStudentId(req: any): string {
  return req.user?.id || 'usr-student-1';
}

// =========================================================================
// 1. MATCHED OPPORTUNITIES DASHBOARD (GET /api/student/matched-opportunities)
// =========================================================================
router.get(['/matched-opportunities', '/matches'], authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const {
      category = 'ALL',
      type = 'ALL',
      workMode = 'ALL',
      location = '',
      search = '',
      eligibility = 'ALL',
      sortBy = 'score_desc',
      page = '1',
      limit = '12'
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Check if match results already exist for student; if none, trigger recalculation
    const existingCount = queryOne<any>(
      `SELECT COUNT(*) as cnt FROM opportunity_match_results WHERE student_id = ?`,
      [studentId]
    )?.cnt || 0;

    if (existingCount === 0) {
      recalculateStudentMatches(studentId);
    }

    // Build filter SQL
    const conditions: string[] = [
      `mr.student_id = ?`,
      `o.status = 'PUBLISHED'`,
      `o.verification_status = 'VERIFIED'`
    ];
    const params: any[] = [studentId];

    if (search.trim()) {
      conditions.push(`(o.title LIKE ? OR o.company_name LIKE ? OR o.required_skills_json LIKE ? OR o.short_description LIKE ?)`);
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (type !== 'ALL') {
      conditions.push(`o.type = ?`);
      params.push(type);
    }

    if (workMode !== 'ALL') {
      conditions.push(`o.work_mode = ?`);
      params.push(workMode);
    }

    if (location.trim()) {
      conditions.push(`o.location LIKE ?`);
      params.push(`%${location.trim()}%`);
    }

    if (eligibility === 'Eligible') {
      conditions.push(`mr.eligibility_status = 'Eligible'`);
    } else if (eligibility === 'Possibly Eligible') {
      conditions.push(`mr.eligibility_status IN ('Eligible', 'Possibly Eligible')`);
    }

    // Category Tabs Filter
    if (category === 'BEST_MATCHES') {
      conditions.push(`mr.matching_score >= 80`);
    } else if (category === 'STRONG_MATCHES') {
      conditions.push(`mr.matching_score >= 75 AND mr.matching_score < 90`);
    } else if (category === 'BEGINNER_FRIENDLY') {
      conditions.push(`(o.minimum_year <= 2 OR o.type = 'INTERNSHIP' OR o.short_description LIKE '%beginner%' OR o.short_description LIKE '%foundational%')`);
    } else if (category === 'SKILL_BUILDING') {
      conditions.push(`json_array_length(mr.missing_skills_json) > 0`);
    } else if (category === 'DEADLINE_SOON') {
      conditions.push(`o.application_deadline >= datetime('now') AND o.application_deadline <= datetime('now', '+7 days')`);
    } else if (category === 'REMOTE') {
      conditions.push(`o.work_mode = 'REMOTE'`);
    } else if (category === 'SAVED') {
      conditions.push(`EXISTS (SELECT 1 FROM saved_opportunities so WHERE so.student_id = mr.student_id AND so.opportunity_id = mr.opportunity_id)`);
    }

    // Sort order
    let orderByClause = `mr.matching_score DESC`;
    if (sortBy === 'deadline_soon') {
      orderByClause = `o.application_deadline ASC, mr.matching_score DESC`;
    } else if (sortBy === 'newest') {
      orderByClause = `o.created_at DESC, mr.matching_score DESC`;
    } else if (sortBy === 'score_asc') {
      orderByClause = `mr.matching_score ASC`;
    }

    const whereClause = conditions.join(' AND ');

    // Total filtered count
    const totalRow = queryOne<any>(
      `SELECT COUNT(*) as total
       FROM opportunity_match_results mr
       JOIN opportunities o ON o.id = mr.opportunity_id
       WHERE ${whereClause}`,
      params
    );
    const total = totalRow?.total || 0;

    // Fetch items with saved and application statuses
    const rows = queryAll<any>(
      `SELECT
        mr.*,
        o.title, o.company_name, o.company_logo, o.type, o.short_description,
        o.location, o.work_mode, o.stipend, o.salary_range, o.duration,
        o.application_deadline, o.apply_url, o.status as opportunity_status,
        o.verification_status, o.minimum_year, o.maximum_year,
        (SELECT 1 FROM saved_opportunities so WHERE so.student_id = mr.student_id AND so.opportunity_id = mr.opportunity_id) as is_saved,
        (SELECT status FROM opportunity_applications oa WHERE oa.student_id = mr.student_id AND oa.opportunity_id = mr.opportunity_id) as application_status
       FROM opportunity_match_results mr
       JOIN opportunities o ON o.id = mr.opportunity_id
       WHERE ${whereClause}
       ORDER BY ${orderByClause}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Compute Summary Cards
    const summaryAgg = queryOne<any>(
      `SELECT
        MAX(mr.matching_score) as best_match,
        COUNT(DISTINCT CASE WHEN mr.eligibility_status = 'Eligible' THEN mr.opportunity_id END) as eligible_count
       FROM opportunity_match_results mr
       JOIN opportunities o ON o.id = mr.opportunity_id
       WHERE mr.student_id = ? AND o.status = 'PUBLISHED'`,
      [studentId]
    );

    // Count skills matched & to improve across all matches
    const allMatches = queryAll<any>(
      `SELECT matched_skills_json, missing_skills_json, partial_skills_json
       FROM opportunity_match_results
       WHERE student_id = ?`,
      [studentId]
    );
    const matchedSkillsSet = new Set<string>();
    const improveSkillsSet = new Set<string>();
    for (const m of allMatches) {
      const matched = JSON.parse(m.matched_skills_json || '[]');
      const missing = JSON.parse(m.missing_skills_json || '[]');
      const partial = JSON.parse(m.partial_skills_json || '[]');
      matched.forEach((s: string) => matchedSkillsSet.add(s));
      missing.forEach((s: string) => improveSkillsSet.add(s));
      partial.forEach((s: string) => improveSkillsSet.add(s));
    }

    const pendingAppsCount = queryOne<any>(
      `SELECT COUNT(*) as cnt FROM opportunity_applications
       WHERE student_id = ? AND status IN ('INTERESTED', 'SAVED', 'APPLIED')`,
      [studentId]
    )?.cnt || 0;

    const summary = {
      bestMatch: summaryAgg?.best_match || 0,
      skillsMatched: matchedSkillsSet.size,
      skillsToImprove: improveSkillsSet.size,
      eligibleOpportunities: summaryAgg?.eligible_count || 0,
      applicationsPending: pendingAppsCount
    };

    // Format opportunity cards
    const opportunities = rows.map(r => ({
      id: r.opportunity_id,
      matchId: r.id,
      title: r.title,
      companyName: r.company_name,
      companyLogo: r.company_logo,
      type: r.type,
      shortDescription: r.short_description,
      location: r.location,
      workMode: r.work_mode,
      stipend: r.stipend,
      salaryRange: r.salary_range,
      duration: r.duration,
      deadline: r.application_deadline,
      applyUrl: r.apply_url,
      matchingScore: r.matching_score,
      matchCategory: r.match_category,
      matchCategoryLabel:
        r.match_category === 'EXCELLENT_MATCH' ? 'Excellent Match' :
        r.match_category === 'STRONG_MATCH' ? 'Strong Match' :
        r.match_category === 'GOOD_MATCH' ? 'Good Match' :
        r.match_category === 'PARTIAL_MATCH' ? 'Partial Match' : 'Low Match',
      matchedSkills: JSON.parse(r.matched_skills_json || '[]'),
      missingSkills: JSON.parse(r.missing_skills_json || '[]'),
      partialSkills: JSON.parse(r.partial_skills_json || '[]'),
      eligibilityStatus: r.eligibility_status,
      eligibilityReasons: JSON.parse(r.eligibility_reasons_json || '[]'),
      factorBreakdown: JSON.parse(r.factor_breakdown_json || '{}'),
      explanation: r.explanation,
      isSaved: Boolean(r.is_saved),
      applicationStatus: r.application_status || null,
      updatedAt: r.updated_at
    }));

    // Recommendation summary narrative
    const recommendationSummary = summary.bestMatch >= 75
      ? `Your profile strongly matches ${opportunities.filter(o => o.matchingScore >= 75).length} active opportunities. Focusing on ${Array.from(improveSkillsSet).slice(0, 2).join(' and ') || 'API Architecture'} will unlock higher-tier roles.`
      : `Complete foundational technical and communication modules to raise your match index across verified opportunities.`;

    res.json({
      success: true,
      summary,
      disclaimer: MATCHING_DISCLAIMER,
      notice: AI_RECOMMENDATION_NOTICE,
      recommendationSummary,
      opportunities,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      engineVersion: ENGINE_VERSION
    });
  } catch (error: any) {
    console.error('[Matched Opportunities Error]', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve matched opportunities.' });
  }
});

// =========================================================================
// 2. MATCH DETAIL EXPLANATION (GET /api/student/matched-opportunities/:id)
// =========================================================================
router.get('/matched-opportunities/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const opportunityId = req.params.id;

    const opportunity = queryOne<any>(
      `SELECT * FROM opportunities WHERE id = ?`,
      [opportunityId]
    );

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    // Evaluate match
    const matchEval = calculateStudentOpportunityMatch(studentId, opportunity);

    // Check saved and application status
    const isSaved = Boolean(queryOne<any>(
      `SELECT 1 FROM saved_opportunities WHERE student_id = ? AND opportunity_id = ?`,
      [studentId, opportunityId]
    ));

    const application = queryOne<any>(
      `SELECT * FROM opportunity_applications WHERE student_id = ? AND opportunity_id = ?`,
      [studentId, opportunityId]
    );

    // Fetch or generate active preparation plan
    let prepPlan = queryOne<any>(
      `SELECT * FROM opportunity_preparation_plans WHERE student_id = ? AND opportunity_id = ?`,
      [studentId, opportunityId]
    );

    if (!prepPlan) {
      const generatedSteps = generatePreparationPlan(
        opportunity,
        matchEval.missingSkills,
        matchEval.matchedSkills
      );
      const planId = `prep-${studentId}-${opportunityId}`;
      execute(
        `INSERT OR REPLACE INTO opportunity_preparation_plans (
          id, student_id, opportunity_id, title, steps_json, progress_percentage, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          planId,
          studentId,
          opportunityId,
          `Preparation Plan: ${opportunity.title}`,
          JSON.stringify(generatedSteps),
          0,
          'NOT_STARTED'
        ]
      );
      prepPlan = {
        id: planId,
        student_id: studentId,
        opportunity_id: opportunityId,
        title: `Preparation Plan: ${opportunity.title}`,
        steps_json: JSON.stringify(generatedSteps),
        progress_percentage: 0,
        status: 'NOT_STARTED',
        updated_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        companyName: opportunity.company_name,
        companyLogo: opportunity.company_logo,
        type: opportunity.type,
        description: opportunity.description,
        shortDescription: opportunity.short_description,
        eligibilityCriteria: opportunity.eligibility_criteria,
        qualification: opportunity.qualification,
        branch: opportunity.branch,
        minimumYear: opportunity.minimum_year,
        maximumYear: opportunity.maximum_year,
        location: opportunity.location,
        workMode: opportunity.work_mode,
        stipend: opportunity.stipend,
        salaryRange: opportunity.salary_range,
        duration: opportunity.duration,
        deadline: opportunity.application_deadline,
        applyUrl: opportunity.apply_url,
        registrationUrl: opportunity.registration_url,
        contactEmail: opportunity.contact_email,
        contactPhone: opportunity.contact_phone,
        status: opportunity.status,
        verificationStatus: opportunity.verification_status,
        isFeatured: Boolean(opportunity.is_featured)
      },
      match: {
        matchingScore: matchEval.matchingScore,
        matchCategory: matchEval.matchCategory,
        matchCategoryLabel: matchEval.matchCategoryLabel,
        eligibilityStatus: matchEval.eligibilityStatus,
        eligibilityReasons: matchEval.eligibilityReasons,
        factorBreakdown: matchEval.factorBreakdown,
        explanation: matchEval.explanation,
        whyMatched: matchEval.whyMatched,
        skillComparison: matchEval.skillComparison,
        improvementSuggestions: matchEval.improvementSuggestions,
        matchedSkills: matchEval.matchedSkills,
        missingSkills: matchEval.missingSkills,
        partialSkills: matchEval.partialSkills,
        optionalSkills: matchEval.optionalSkills,
        recommendationConfidence: 'High (Deterministic & Verifiable)',
        lastUpdatedDate: new Date().toISOString()
      },
      preparationPlan: {
        id: prepPlan.id,
        title: prepPlan.title,
        steps: JSON.parse(prepPlan.steps_json || '[]'),
        progressPercentage: prepPlan.progress_percentage,
        status: prepPlan.status,
        updatedAt: prepPlan.updated_at
      },
      isSaved,
      application: application
        ? {
            id: application.id,
            status: application.status,
            appliedAt: application.applied_at,
            lastUpdatedAt: application.last_updated_at,
            notes: application.notes
          }
        : null,
      disclaimer: MATCHING_DISCLAIMER,
      notice: AI_RECOMMENDATION_NOTICE,
      engineVersion: ENGINE_VERSION
    });
  } catch (error: any) {
    console.error('[Match Detail Error]', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve match details.' });
  }
});

// =========================================================================
// 3. RECALCULATE MATCHES (POST /api/student/recalculate-matches)
// =========================================================================
router.post('/recalculate-matches', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const summary = recalculateStudentMatches(studentId);

    res.json({
      success: true,
      message: 'Your recommendations were updated.',
      summary,
      disclaimer: MATCHING_DISCLAIMER,
      engineVersion: ENGINE_VERSION,
      recalculatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Recalculate Matches Error]', error);
    res.status(500).json({ error: error.message || 'Failed to recalculate matches.' });
  }
});

// =========================================================================
// 4. STUDENT OPPORTUNITY PREFERENCES (GET & PUT /api/student/opportunity-preferences)
// =========================================================================
router.get('/opportunity-preferences', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    let pref = queryOne<any>(
      `SELECT * FROM student_opportunity_preferences WHERE student_id = ?`,
      [studentId]
    );

    if (!pref) {
      // Create defaults
      const id = `pref-${studentId}`;
      execute(
        `INSERT OR REPLACE INTO student_opportunity_preferences (
          id, student_id, preferred_roles_json, preferred_skills_json, preferred_locations_json,
          preferred_work_modes_json, preferred_types_json, minimum_stipend, minimum_salary,
          preferred_industries_json, available_from, preferred_duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          studentId,
          JSON.stringify(['Software Developer', 'Backend Developer']),
          JSON.stringify(['Python', 'SQL', 'REST API']),
          JSON.stringify(['Bengaluru', 'Remote']),
          JSON.stringify(['REMOTE', 'HYBRID']),
          JSON.stringify(['INTERNSHIP', 'JOB']),
          20000,
          500000,
          JSON.stringify(['Software & AI', 'FinTech']),
          '2026-06-01',
          '6 Months'
        ]
      );
      pref = queryOne<any>(`SELECT * FROM student_opportunity_preferences WHERE student_id = ?`, [studentId]);
    }

    res.json({
      success: true,
      preferences: {
        id: pref.id,
        studentId: pref.student_id,
        preferredRoles: JSON.parse(pref.preferred_roles_json || '[]'),
        preferredSkills: JSON.parse(pref.preferred_skills_json || '[]'),
        preferredLocations: JSON.parse(pref.preferred_locations_json || '[]'),
        preferredWorkModes: JSON.parse(pref.preferred_work_modes_json || '[]'),
        preferredTypes: JSON.parse(pref.preferred_types_json || '[]'),
        minimumStipend: pref.minimum_stipend || 0,
        minimumSalary: pref.minimum_salary || 0,
        preferredIndustries: JSON.parse(pref.preferred_industries_json || '[]'),
        availableFrom: pref.available_from || '',
        preferredDuration: pref.preferred_duration || '',
        updatedAt: pref.updated_at
      }
    });
  } catch (error: any) {
    console.error('[Get Preferences Error]', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve opportunity preferences.' });
  }
});

router.put('/opportunity-preferences', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const {
      preferredRoles = [],
      preferredSkills = [],
      preferredLocations = [],
      preferredWorkModes = [],
      preferredTypes = [],
      minimumStipend = 0,
      minimumSalary = 0,
      preferredIndustries = [],
      availableFrom = '',
      preferredDuration = ''
    } = req.body;

    // Server-side validation
    const cleanRoles = Array.isArray(preferredRoles) ? preferredRoles.slice(0, 20) : [];
    const cleanSkills = Array.isArray(preferredSkills) ? preferredSkills.slice(0, 30) : [];
    const cleanLocations = Array.isArray(preferredLocations) ? preferredLocations.slice(0, 15) : [];
    const cleanWorkModes = Array.isArray(preferredWorkModes)
      ? preferredWorkModes.filter(m => ['REMOTE', 'HYBRID', 'ONSITE'].includes(m))
      : ['REMOTE', 'HYBRID', 'ONSITE'];
    const cleanTypes = Array.isArray(preferredTypes) ? preferredTypes.slice(0, 10) : [];
    const cleanStipend = Math.max(0, parseInt(minimumStipend, 10) || 0);
    const cleanSalary = Math.max(0, parseInt(minimumSalary, 10) || 0);

    const prefId = `pref-${studentId}`;

    execute(
      `INSERT INTO student_opportunity_preferences (
        id, student_id, preferred_roles_json, preferred_skills_json, preferred_locations_json,
        preferred_work_modes_json, preferred_types_json, minimum_stipend, minimum_salary,
        preferred_industries_json, available_from, preferred_duration, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id) DO UPDATE SET
        preferred_roles_json = excluded.preferred_roles_json,
        preferred_skills_json = excluded.preferred_skills_json,
        preferred_locations_json = excluded.preferred_locations_json,
        preferred_work_modes_json = excluded.preferred_work_modes_json,
        preferred_types_json = excluded.preferred_types_json,
        minimum_stipend = excluded.minimum_stipend,
        minimum_salary = excluded.minimum_salary,
        preferred_industries_json = excluded.preferred_industries_json,
        available_from = excluded.available_from,
        preferred_duration = excluded.preferred_duration,
        updated_at = CURRENT_TIMESTAMP`,
      [
        prefId,
        studentId,
        JSON.stringify(cleanRoles),
        JSON.stringify(cleanSkills),
        JSON.stringify(cleanLocations),
        JSON.stringify(cleanWorkModes),
        JSON.stringify(cleanTypes),
        cleanStipend,
        cleanSalary,
        JSON.stringify(preferredIndustries),
        availableFrom,
        preferredDuration
      ]
    );

    // Auto trigger recalculation after preference update
    const summary = recalculateStudentMatches(studentId);

    res.json({
      success: true,
      message: 'Matching preferences saved successfully. Recommendations updated.',
      summary,
      preferences: {
        preferredRoles: cleanRoles,
        preferredSkills: cleanSkills,
        preferredLocations: cleanLocations,
        preferredWorkModes: cleanWorkModes,
        preferredTypes: cleanTypes,
        minimumStipend: cleanStipend,
        minimumSalary: cleanSalary
      }
    });
  } catch (error: any) {
    console.error('[Update Preferences Error]', error);
    res.status(500).json({ error: error.message || 'Failed to update preferences.' });
  }
});

// =========================================================================
// 5. MATCH HISTORY (GET /api/student/match-history)
// =========================================================================
router.get('/match-history', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);

    const rows = queryAll<any>(
      `SELECT
        mh.*,
        o.title as opportunity_title,
        o.company_name,
        o.type as opportunity_type,
        o.location,
        o.work_mode
       FROM opportunity_match_history mh
       JOIN opportunities o ON o.id = mh.opportunity_id
       WHERE mh.student_id = ?
       ORDER BY mh.created_at DESC
       LIMIT ?`,
      [studentId, limit]
    );

    const history = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      opportunityId: r.opportunity_id,
      opportunityTitle: r.opportunity_title,
      companyName: r.company_name,
      opportunityType: r.opportunity_type,
      location: r.location,
      workMode: r.work_mode,
      matchingScore: r.matching_score,
      matchCategory: r.match_category,
      matchCategoryLabel:
        r.match_category === 'EXCELLENT_MATCH' ? 'Excellent Match' :
        r.match_category === 'STRONG_MATCH' ? 'Strong Match' :
        r.match_category === 'GOOD_MATCH' ? 'Good Match' :
        r.match_category === 'PARTIAL_MATCH' ? 'Partial Match' : 'Low Match',
      matchedSkills: JSON.parse(r.matched_skills_json || '[]'),
      missingSkills: JSON.parse(r.missing_skills_json || '[]'),
      eligibilityStatus: r.eligibility_status,
      explanation: r.explanation,
      engineVersion: r.engine_version,
      createdAt: r.created_at
    }));

    res.json({
      success: true,
      history,
      count: history.length,
      disclaimer: MATCHING_DISCLAIMER
    });
  } catch (error: any) {
    console.error('[Match History Error]', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve match history.' });
  }
});

// =========================================================================
// 6. GRANULAR STANDALONE SCORE & ELIGIBILITY ENDPOINTS
// =========================================================================
router.get('/:id/match-score', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const opportunityId = req.params.id;

    const opp = queryOne<any>(`SELECT * FROM opportunities WHERE id = ?`, [opportunityId]);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

    const matchEval = calculateStudentOpportunityMatch(studentId, opp);
    res.json({
      success: true,
      opportunityId,
      matchingScore: matchEval.matchingScore,
      matchCategory: matchEval.matchCategory,
      matchCategoryLabel: matchEval.matchCategoryLabel,
      factorBreakdown: matchEval.factorBreakdown,
      disclaimer: MATCHING_DISCLAIMER
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/eligibility', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const opportunityId = req.params.id;

    const opp = queryOne<any>(`SELECT * FROM opportunities WHERE id = ?`, [opportunityId]);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

    const matchEval = calculateStudentOpportunityMatch(studentId, opp);
    res.json({
      success: true,
      opportunityId,
      eligibilityStatus: matchEval.eligibilityStatus,
      eligibilityReasons: matchEval.eligibilityReasons
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 7. PREPARATION PLANS (POST, GET, PUT progress)
// =========================================================================
router.post('/:id/preparation-plan', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const opportunityId = req.params.id;

    const opp = queryOne<any>(`SELECT * FROM opportunities WHERE id = ?`, [opportunityId]);
    if (!opp) return res.status(404).json({ error: 'Opportunity not found.' });

    const matchEval = calculateStudentOpportunityMatch(studentId, opp);
    const generatedSteps = generatePreparationPlan(
      opp,
      matchEval.missingSkills,
      matchEval.matchedSkills
    );

    const planId = `prep-${studentId}-${opportunityId}`;
    execute(
      `INSERT INTO opportunity_preparation_plans (
        id, student_id, opportunity_id, title, steps_json, progress_percentage, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, opportunity_id) DO UPDATE SET
        steps_json = excluded.steps_json,
        updated_at = CURRENT_TIMESTAMP`,
      [
        planId,
        studentId,
        opportunityId,
        `Preparation Plan: ${opp.title}`,
        JSON.stringify(generatedSteps),
        0,
        'NOT_STARTED'
      ]
    );

    const savedPlan = queryOne<any>(
      `SELECT * FROM opportunity_preparation_plans WHERE id = ?`,
      [planId]
    );

    res.json({
      success: true,
      plan: {
        id: savedPlan.id,
        opportunityId: savedPlan.opportunity_id,
        title: savedPlan.title,
        steps: JSON.parse(savedPlan.steps_json || '[]'),
        progressPercentage: savedPlan.progress_percentage,
        status: savedPlan.status,
        updatedAt: savedPlan.updated_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/preparation-plans', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const { status = 'ALL' } = req.query as Record<string, string>;

    let sql = `
      SELECT pp.*, o.title as opportunity_title, o.company_name, o.type, o.application_deadline
      FROM opportunity_preparation_plans pp
      JOIN opportunities o ON o.id = pp.opportunity_id
      WHERE pp.student_id = ?
    `;
    const params: any[] = [studentId];

    if (status !== 'ALL') {
      sql += ` AND pp.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY pp.updated_at DESC`;

    const rows = queryAll<any>(sql, params);
    const plans = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      opportunityId: r.opportunity_id,
      opportunityTitle: r.opportunity_title,
      companyName: r.company_name,
      type: r.type,
      deadline: r.application_deadline,
      title: r.title,
      steps: JSON.parse(r.steps_json || '[]'),
      progressPercentage: r.progress_percentage,
      status: r.status,
      updatedAt: r.updated_at
    }));

    res.json({
      success: true,
      plans
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/preparation-plans/:id/progress', authenticateToken, (req: Request, res: Response) => {
  try {
    const studentId = resolveStudentId(req);
    const planId = req.params.id;
    const { stepIndex, completed, status } = req.body;

    const plan = queryOne<any>(
      `SELECT * FROM opportunity_preparation_plans WHERE id = ? AND student_id = ?`,
      [planId, studentId]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Preparation plan not found or unauthorized.' });
    }

    const steps: Array<any> = JSON.parse(plan.steps_json || '[]');

    if (typeof stepIndex === 'number' && stepIndex >= 1 && stepIndex <= steps.length) {
      steps[stepIndex - 1].completed = Boolean(completed);
    }

    // Calculate completed percentage
    const completedCount = steps.filter(s => s.completed).length;
    const progressPercentage = Math.round((completedCount / Math.max(1, steps.length)) * 100);

    let nextStatus = status || plan.status;
    if (progressPercentage === 100) {
      nextStatus = 'COMPLETED';
    } else if (progressPercentage > 0 && nextStatus === 'NOT_STARTED') {
      nextStatus = 'IN_PROGRESS';
    }

    execute(
      `UPDATE opportunity_preparation_plans
       SET steps_json = ?, progress_percentage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(steps), progressPercentage, nextStatus, planId]
    );

    res.json({
      success: true,
      plan: {
        id: plan.id,
        opportunityId: plan.opportunity_id,
        title: plan.title,
        steps,
        progressPercentage,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
