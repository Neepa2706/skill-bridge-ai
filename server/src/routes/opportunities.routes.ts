import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole, AuthUser } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { matchStudentToOpportunity } from '../services/ai/opportunityMatchingEngine.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge-super-secret-jwt-key-2026';

// Optional Authentication helper - populates req.user if token is present, but doesn't block if absent
function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const userInDb = queryOne('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);
    if (userInDb) {
      req.user = userInDb as AuthUser;
    }
  } catch (_e) {
    // Ignore invalid token for optional auth
  }
  next();
}

// Helper: Calculate deadline status and countdown badge
export function getDeadlineStatus(deadlineStr: string): {
  isExpired: boolean;
  daysRemaining: number;
  deadlineBadge: string;
  badgeVariant: 'danger' | 'warning' | 'info' | 'neutral';
} {
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    const daysAgo = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
    return {
      isExpired: true,
      daysRemaining: -daysAgo,
      deadlineBadge: 'Deadline Passed',
      badgeVariant: 'neutral'
    };
  }

  const hoursRemaining = diffMs / (1000 * 60 * 60);
  const days = Math.ceil(hoursRemaining / 24);

  if (hoursRemaining <= 24) {
    return {
      isExpired: false,
      daysRemaining: 0,
      deadlineBadge: 'Closing Today',
      badgeVariant: 'danger'
    };
  } else if (days === 1) {
    return {
      isExpired: false,
      daysRemaining: 1,
      deadlineBadge: '1 Day Left',
      badgeVariant: 'danger'
    };
  } else if (days <= 3) {
    return {
      isExpired: false,
      daysRemaining: days,
      deadlineBadge: `${days} Days Left`,
      badgeVariant: 'warning'
    };
  } else {
    return {
      isExpired: false,
      daysRemaining: days,
      deadlineBadge: `${days} Days Left`,
      badgeVariant: 'info'
    };
  }
}

// Student Context for Rule-Based Relevance Calculation
interface StudentProfileContext {
  studentId: string;
  department: string;
  yearOfStudy: number;
  skills: Set<string>;
  skillScores: Record<string, number>;
}

function getStudentContext(userId: string): StudentProfileContext | null {
  const profile = queryOne('SELECT department, year_of_study FROM student_profiles WHERE user_id = ?', [userId]);
  const skillsList = queryAll(`
    SELECT s.name, ss.verified_score
    FROM student_skills ss
    JOIN skills s ON ss.skill_id = s.id
    WHERE ss.user_id = ?
  `, [userId]);

  const skillSet = new Set<string>();
  const scoreMap: Record<string, number> = {};

  for (const s of skillsList) {
    skillSet.add(s.name.toLowerCase());
    scoreMap[s.name] = s.verified_score;
  }

  // Also include programming languages if present
  const fullProfile = queryOne('SELECT programming_languages_json, communication_languages_json FROM student_profiles WHERE user_id = ?', [userId]);
  if (fullProfile?.programming_languages_json) {
    try {
      const langs = JSON.parse(fullProfile.programming_languages_json);
      if (Array.isArray(langs)) {
        langs.forEach(l => skillSet.add(String(l).toLowerCase()));
      }
    } catch (_e) {}
  }

  return {
    studentId: userId,
    department: profile?.department || '',
    yearOfStudy: profile?.year_of_study || 3,
    skills: skillSet,
    skillScores: scoreMap
  };
}

// Rule-Based Relevance & Eligibility Engine
export function calculateOpportunityRelevance(
  opp: any,
  student: StudentProfileContext | null
): {
  relevanceScore: number;
  isEligible: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  eligibilityReasons: string[];
} {
  const requiredSkills: string[] = JSON.parse(opp.required_skills_json || '[]');
  const preferredSkills: string[] = JSON.parse(opp.preferred_skills_json || '[]');

  if (!student) {
    return {
      relevanceScore: opp.is_featured ? 88 : 72,
      isEligible: true,
      matchedSkills: [],
      missingSkills: [],
      eligibilityReasons: ['Open to all students. Sign in to view personalized relevance and eligibility.']
    };
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of requiredSkills) {
    const lower = reqSkill.toLowerCase().trim();
    let found = false;
    for (const userSk of student.skills) {
      if (userSk === lower || userSk.includes(lower) || lower.includes(userSk)) {
        found = true;
        break;
      }
    }
    if (found) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  // 1. Required Skills Score (0 - 50 points)
  const reqRatio = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) : 1;
  const reqPoints = reqRatio * 50;

  // 2. Preferred Skills Score (0 - 20 points)
  let prefMatchCount = 0;
  for (const prefSkill of preferredSkills) {
    const lower = prefSkill.toLowerCase().trim();
    for (const userSk of student.skills) {
      if (userSk === lower || userSk.includes(lower) || lower.includes(userSk)) {
        prefMatchCount++;
        break;
      }
    }
  }
  const prefRatio = preferredSkills.length > 0 ? (prefMatchCount / preferredSkills.length) : 0.6;
  const prefPoints = prefRatio * 20;

  // 3. Department / Branch Score (0 - 15 points)
  let branchPoints = 15;
  let branchMatches = true;
  if (opp.branch && !opp.branch.toLowerCase().includes('all')) {
    const bLower = opp.branch.toLowerCase();
    const dLower = student.department.toLowerCase();
    const isTech = bLower.includes('cs') || bLower.includes('it') || bLower.includes('engineering') || bLower.includes('tech');
    const studentTech = dLower.includes('cs') || dLower.includes('computer') || dLower.includes('it') || dLower.includes('engineering');
    branchMatches = isTech ? studentTech : (bLower.includes(dLower) || dLower.includes(bLower));
    branchPoints = branchMatches ? 15 : 5;
  }

  // 4. Year of Study Score (0 - 15 points)
  const minYear = opp.minimum_year || 1;
  const maxYear = opp.maximum_year || 4;
  const yearMatches = student.yearOfStudy >= minYear && student.yearOfStudy <= maxYear;
  const yearPoints = yearMatches ? 15 : 0;

  let totalRelevance = Math.round(reqPoints + prefPoints + branchPoints + yearPoints);
  if (opp.is_featured) totalRelevance += 5;
  totalRelevance = Math.max(15, Math.min(100, totalRelevance));

  // Eligibility details
  const eligibilityReasons: string[] = [];
  let isEligible = true;

  if (!yearMatches) {
    isEligible = false;
    eligibilityReasons.push(`Eligible for Year ${minYear}–${maxYear} (You are currently in Year ${student.yearOfStudy})`);
  } else {
    eligibilityReasons.push(`Year criteria met: Year ${student.yearOfStudy} is within Year ${minYear}–${maxYear}`);
  }

  if (requiredSkills.length > 0) {
    if (matchedSkills.length === requiredSkills.length) {
      eligibilityReasons.push(`100% core skill match (${matchedSkills.length}/${requiredSkills.length} required skills verified)`);
    } else if (matchedSkills.length > 0) {
      eligibilityReasons.push(`Partial skill match (${matchedSkills.length}/${requiredSkills.length} required skills verified)`);
    } else {
      eligibilityReasons.push(`Core skill gap: Missing ${missingSkills.slice(0, 3).join(', ')}`);
      if (requiredSkills.length >= 3) isEligible = false;
    }
  }

  if (branchMatches) {
    eligibilityReasons.push(`Department verified: ${student.department || 'Engineering'}`);
  } else {
    eligibilityReasons.push(`Role prefers: ${opp.branch}`);
  }

  return {
    relevanceScore: totalRelevance,
    isEligible,
    matchedSkills,
    missingSkills,
    eligibilityReasons
  };
}

// =========================================================================
// 1. GET /api/opportunities — Opportunity Marketplace Catalog & Search
// =========================================================================
router.get('/', optionalAuth, (req: Request, res: Response): void => {
  try {
    const {
      q,
      search,
      type,
      workMode,
      location,
      skill,
      compensation,
      deadline = 'all',
      verificationStatus = 'VERIFIED',
      sort = 'newest',
      page = '1',
      limit = '30'
    } = req.query;

    const searchTerm = (q || search || '') as string;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));

    // Build SQL query conditions
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by verification status (Admins can view ALL, students default to VERIFIED)
    if (req.user?.role === 'admin' && verificationStatus === 'ALL') {
      // no filter
    } else if (verificationStatus && verificationStatus !== 'ALL') {
      conditions.push('verification_status = ?');
      params.push(verificationStatus);
    } else {
      conditions.push("verification_status = 'VERIFIED'");
    }

    // Default status for active catalog
    if (req.user?.role !== 'admin') {
      conditions.push("status IN ('PUBLISHED', 'EXPIRED')");
    }

    // Search query
    if (searchTerm.trim()) {
      const pattern = `%${searchTerm.trim()}%`;
      conditions.push('(title LIKE ? OR company_name LIKE ? OR description LIKE ? OR short_description LIKE ? OR required_skills_json LIKE ?)');
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    // Type filter (comma separated or single)
    if (type && type !== 'ALL') {
      const types = (type as string).split(',').map(t => t.trim().toUpperCase());
      const placeholders = types.map(() => '?').join(',');
      conditions.push(`type IN (${placeholders})`);
      params.push(...types);
    }

    // Work Mode filter
    if (workMode && workMode !== 'ALL') {
      const modes = (workMode as string).split(',').map(m => m.trim().toUpperCase());
      const placeholders = modes.map(() => '?').join(',');
      conditions.push(`work_mode IN (${placeholders})`);
      params.push(...modes);
    }

    // Location filter
    if (location && location !== 'ALL') {
      conditions.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    // Skill filter
    if (skill && skill !== 'ALL') {
      const skills = (skill as string).split(',').map(s => s.trim().toLowerCase());
      const skillConds: string[] = [];
      for (const s of skills) {
        skillConds.push('(LOWER(required_skills_json) LIKE ? OR LOWER(preferred_skills_json) LIKE ?)');
        params.push(`%${s}%`, `%${s}%`);
      }
      conditions.push(`(${skillConds.join(' OR ')})`);
    }

    // Compensation filter
    if (compensation === 'stipend') {
      conditions.push("stipend IS NOT NULL AND stipend != ''");
    } else if (compensation === 'salary') {
      conditions.push("salary_range IS NOT NULL AND salary_range != ''");
    } else if (compensation === 'paid') {
      conditions.push("((stipend IS NOT NULL AND stipend != '') OR (salary_range IS NOT NULL AND salary_range != ''))");
    }

    // Deadline filter
    if (deadline === 'active') {
      conditions.push("application_deadline >= CURRENT_TIMESTAMP AND status != 'EXPIRED'");
    } else if (deadline === 'closing_soon') {
      conditions.push("application_deadline >= CURRENT_TIMESTAMP AND application_deadline <= datetime('now', '+3 days') AND status != 'EXPIRED'");
    } else if (deadline === 'expired') {
      conditions.push("(application_deadline < CURRENT_TIMESTAMP OR status = 'EXPIRED')");
    }

    // Auto-sync any passed deadlines in database to status EXPIRED
    try {
      execute("UPDATE opportunities SET status = 'EXPIRED' WHERE application_deadline < CURRENT_TIMESTAMP AND status = 'PUBLISHED'");
    } catch (_e) {}

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch all matching rows
    const allRows = queryAll(`
      SELECT * FROM opportunities
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    // Student Context & personalization
    const studentContext = req.user ? getStudentContext(req.user.id) : null;
    let savedIds = new Set<string>();
    const applicationMap = new Map<string, { status: string; applied_at: string; notes?: string }>();

    if (req.user) {
      const savedList = queryAll('SELECT opportunity_id FROM saved_opportunities WHERE student_id = ?', [req.user.id]);
      savedIds = new Set(savedList.map(s => s.opportunity_id));

      const appList = queryAll('SELECT opportunity_id, status, applied_at, notes FROM opportunity_applications WHERE student_id = ?', [req.user.id]);
      for (const app of appList) {
        applicationMap.set(app.opportunity_id, {
          status: app.status,
          applied_at: app.applied_at,
          notes: app.notes
        });
      }
    }

    // Transform and annotate each opportunity
    let processed = allRows.map(opp => {
      const deadlineInfo = getDeadlineStatus(opp.application_deadline);
      const relevance = calculateOpportunityRelevance(opp, studentContext);
      const appInfo = applicationMap.get(opp.id);

      return {
        ...opp,
        required_skills: JSON.parse(opp.required_skills_json || '[]'),
        preferred_skills: JSON.parse(opp.preferred_skills_json || '[]'),
        is_saved: savedIds.has(opp.id),
        application_status: appInfo ? appInfo.status : null,
        applied_at: appInfo ? appInfo.applied_at : null,
        relevance_score: relevance.relevanceScore,
        is_eligible: relevance.isEligible,
        matched_skills: relevance.matchedSkills,
        missing_skills: relevance.missingSkills,
        eligibility_reasons: relevance.eligibilityReasons,
        is_expired: deadlineInfo.isExpired,
        days_remaining: deadlineInfo.daysRemaining,
        deadline_badge: deadlineInfo.deadlineBadge,
        deadline_variant: deadlineInfo.badgeVariant
      };
    });

    // Sorting
    if (sort === 'deadline_soon') {
      processed.sort((a, b) => {
        if (a.is_expired && !b.is_expired) return 1;
        if (!a.is_expired && b.is_expired) return -1;
        return a.days_remaining - b.days_remaining;
      });
    } else if (sort === 'most_relevant') {
      processed.sort((a, b) => b.relevance_score - a.relevance_score);
    } else if (sort === 'featured') {
      processed.sort((a, b) => (b.is_featured || 0) - (a.is_featured || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // default 'newest'
      processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Pagination
    const totalCount = processed.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = processed.slice(startIndex, startIndex + limitNum);

    // Compute Summary Metrics across active catalog
    const metricsRow = queryAll(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'INTERNSHIP' THEN 1 ELSE 0 END) as internships,
        SUM(CASE WHEN type = 'JOB' THEN 1 ELSE 0 END) as jobs,
        SUM(CASE WHEN type IN ('HIRING_DRIVE', 'PLACEMENT_DRIVE') THEN 1 ELSE 0 END) as drives,
        SUM(CASE WHEN type IN ('EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION') THEN 1 ELSE 0 END) as events
      FROM opportunities
      WHERE verification_status = 'VERIFIED' AND status = 'PUBLISHED'
    `)[0] || { total: 0, internships: 0, jobs: 0, drives: 0, events: 0 };

    res.json({
      opportunities: paginatedItems,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      summaryMetrics: {
        totalOpportunities: metricsRow.total || 0,
        internshipsCount: metricsRow.internships || 0,
        jobsCount: metricsRow.jobs || 0,
        drivesCount: metricsRow.drives || 0,
        eventsCount: metricsRow.events || 0
      }
    });
  } catch (err: any) {
    console.error('[Opportunities GET error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch opportunities.' });
  }
});

// =========================================================================
// 2. GET /api/opportunities/filters — Filter Dropdown Metadata
// =========================================================================
router.get('/filters', (_req: Request, res: Response): void => {
  try {
    const types = [
      { id: 'ALL', label: 'All Opportunities' },
      { id: 'INTERNSHIP', label: 'Internships' },
      { id: 'JOB', label: 'Jobs & Freshers' },
      { id: 'HIRING_DRIVE', label: 'Hiring Drives' },
      { id: 'PLACEMENT_DRIVE', label: 'Placement Drives' },
      { id: 'EVENT', label: 'Career Events' },
      { id: 'HACKATHON', label: 'Hackathons' },
      { id: 'WORKSHOP', label: 'Workshops' },
      { id: 'COMPETITION', label: 'Competitions' }
    ];

    const workModes = [
      { id: 'ALL', label: 'All Work Modes' },
      { id: 'REMOTE', label: 'Remote / WFH' },
      { id: 'HYBRID', label: 'Hybrid' },
      { id: 'ONSITE', label: 'On-site' }
    ];

    // Top locations
    const locationsRaw = queryAll(`
      SELECT DISTINCT location FROM opportunities 
      WHERE verification_status = 'VERIFIED'
      LIMIT 15
    `);
    const locations = ['ALL', ...locationsRaw.map(l => l.location)];

    // Popular skills
    const popularSkills = [
      'Python', 'React', 'JavaScript', 'TypeScript', 'Node.js', 'SQL',
      'Data Structures', 'Docker', 'Linux', 'Machine Learning', 'C++',
      'Communication', 'Java', 'Git', 'AWS'
    ];

    res.json({
      types,
      workModes,
      locations,
      popularSkills
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch filters metadata.' });
  }
});

// =========================================================================
// 3. GET /api/opportunities/saved & /api/student/saved-opportunities
// =========================================================================
router.get(['/saved', '/saved-opportunities', '/student/saved-opportunities'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const studentContext = getStudentContext(studentId);

    const savedRows = queryAll(`
      SELECT so.id as saved_record_id, so.saved_at, o.*
      FROM saved_opportunities so
      JOIN opportunities o ON so.opportunity_id = o.id
      WHERE so.student_id = ?
      ORDER BY so.saved_at DESC
    `, [studentId]);

    // Check application statuses
    const appRows = queryAll('SELECT opportunity_id, status FROM opportunity_applications WHERE student_id = ?', [studentId]);
    const appMap = new Map<string, string>();
    for (const a of appRows) {
      appMap.set(a.opportunity_id, a.status);
    }

    const result = savedRows.map(opp => {
      const deadline = getDeadlineStatus(opp.application_deadline);
      const relevance = calculateOpportunityRelevance(opp, studentContext);

      return {
        ...opp,
        required_skills: JSON.parse(opp.required_skills_json || '[]'),
        preferred_skills: JSON.parse(opp.preferred_skills_json || '[]'),
        is_saved: true,
        application_status: appMap.get(opp.id) || null,
        relevance_score: relevance.relevanceScore,
        is_eligible: relevance.isEligible,
        is_expired: deadline.isExpired,
        days_remaining: deadline.daysRemaining,
        deadline_badge: deadline.deadlineBadge,
        deadline_variant: deadline.badgeVariant
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch saved opportunities.' });
  }
});

// =========================================================================
// 4. GET /api/opportunities/applications & /api/student/applications
// =========================================================================
router.get(['/applications', '/student/applications'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;

    const apps = queryAll(`
      SELECT 
        oa.id as application_id,
        oa.student_id,
        oa.opportunity_id,
        oa.status as application_status,
        oa.applied_at,
        oa.last_updated_at,
        oa.notes,
        oa.application_reference,
        o.title,
        o.type,
        o.company_name,
        o.company_logo,
        o.location,
        o.work_mode,
        o.stipend,
        o.salary_range,
        o.duration,
        o.application_deadline,
        o.apply_url,
        o.contact_email
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      WHERE oa.student_id = ?
      ORDER BY oa.last_updated_at DESC
    `, [studentId]);

    const formatted = apps.map(app => {
      const deadline = getDeadlineStatus(app.application_deadline);
      return {
        ...app,
        days_remaining: deadline.daysRemaining,
        is_expired: deadline.isExpired,
        deadline_badge: deadline.deadlineBadge
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch tracked applications.' });
  }
});

// =========================================================================
// 5. POST /api/opportunities/applications — Create or Update Application Tracking
// =========================================================================
router.post(['/applications', '/student/applications'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const {
      opportunity_id,
      status = 'APPLIED',
      notes = '',
      application_reference = null
    } = req.body;

    if (!opportunity_id) {
      res.status(400).json({ error: 'opportunity_id is required.' });
      return;
    }

    const opp = queryOne('SELECT id, title, company_name FROM opportunities WHERE id = ?', [opportunity_id]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const validStatuses = ['INTERESTED', 'SAVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const existing = queryOne(
      'SELECT id FROM opportunity_applications WHERE student_id = ? AND opportunity_id = ?',
      [studentId, opportunity_id]
    );

    let appId = existing?.id;
    if (existing) {
      execute(
        `UPDATE opportunity_applications 
         SET status = ?, notes = COALESCE(?, notes), application_reference = COALESCE(?, application_reference), last_updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, notes || null, application_reference, existing.id]
      );
    } else {
      appId = `app-${uuidv4().slice(0, 8)}`;
      execute(
        `INSERT INTO opportunity_applications (
          id, student_id, opportunity_id, status, applied_at, last_updated_at, notes, application_reference
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`,
        [appId, studentId, opportunity_id, status, notes || null, application_reference]
      );
    }

    res.json({
      success: true,
      applicationId: appId,
      status,
      message: `Application tracking updated to '${status}'.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update application tracking.' });
  }
});

// Update Application Status & Notes
router.put(['/applications/:id/status', '/applications/:id', '/student/applications/:id'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const appId = req.params.id;
    const { status, notes, application_reference } = req.body;

    const existing = queryOne('SELECT * FROM opportunity_applications WHERE id = ?', [appId]);
    if (!existing) {
      res.status(404).json({ error: 'Application record not found.' });
      return;
    }

    // BOLA Authorization Check: students can only update their own application records
    if (req.user!.role !== 'admin' && existing.student_id !== studentId) {
      res.status(403).json({ error: 'Unauthorized to update this application.' });
      return;
    }

    const validStatuses = ['INTERESTED', 'SAVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    execute(
      `UPDATE opportunity_applications
       SET status = COALESCE(?, status),
           notes = COALESCE(?, notes),
           application_reference = COALESCE(?, application_reference),
           last_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status || null, notes !== undefined ? notes : null, application_reference !== undefined ? application_reference : null, appId]
    );

    res.json({
      success: true,
      message: 'Application details updated successfully.',
      status: status || existing.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update application.' });
  }
});

// Delete Application Tracking
router.delete(['/applications/:id', '/student/applications/:id'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const appId = req.params.id;

    const existing = queryOne('SELECT * FROM opportunity_applications WHERE id = ?', [appId]);
    if (!existing) {
      res.status(404).json({ error: 'Application record not found.' });
      return;
    }

    if (req.user!.role !== 'admin' && existing.student_id !== studentId) {
      res.status(403).json({ error: 'Unauthorized to remove this application.' });
      return;
    }

    execute('DELETE FROM opportunity_applications WHERE id = ?', [appId]);
    res.json({ success: true, message: 'Application removed from tracking.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove application.' });
  }
});

// =========================================================================
// 6. POST & DELETE /api/opportunities/:id/save — Bookmark Opportunity
// =========================================================================
router.post('/:id/save', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const oppId = req.params.id;

    const opp = queryOne('SELECT id FROM opportunities WHERE id = ?', [oppId]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const existing = queryOne(
      'SELECT id FROM saved_opportunities WHERE student_id = ? AND opportunity_id = ?',
      [studentId, oppId]
    );

    if (existing) {
      res.json({ success: true, is_saved: true, message: 'Opportunity is already saved.' });
      return;
    }

    const saveId = `so-${uuidv4().slice(0, 8)}`;
    execute(
      'INSERT INTO saved_opportunities (id, student_id, opportunity_id, saved_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [saveId, studentId, oppId]
    );

    res.json({ success: true, is_saved: true, message: 'Opportunity saved to bookmarks.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save opportunity.' });
  }
});

router.delete('/:id/save', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const oppId = req.params.id;

    execute(
      'DELETE FROM saved_opportunities WHERE student_id = ? AND opportunity_id = ?',
      [studentId, oppId]
    );

    res.json({ success: true, is_saved: false, message: 'Opportunity removed from saved.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unsave opportunity.' });
  }
});

// =========================================================================
// 7. POST /api/opportunities/:id/report — Report Opportunity
// =========================================================================
router.post('/:id/report', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const oppId = req.params.id;
    const { reason, description = '' } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Reason for report is required.' });
      return;
    }

    const opp = queryOne('SELECT id FROM opportunities WHERE id = ?', [oppId]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const reportId = `rep-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO opportunity_reports (id, reported_by, opportunity_id, reason, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
      [reportId, userId, oppId, reason.trim(), description.trim()]
    );

    res.json({
      success: true,
      reportId,
      message: 'Thank you for reporting. Our administrative moderation team will review this opportunity.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit report.' });
  }
});

// =========================================================================
// 8. Admin Moderation Routes — Reports & Status Updates
// =========================================================================
router.get('/admin/reports', authenticateToken, requireRole(['admin']), (_req: Request, res: Response): void => {
  try {
    const reports = queryAll(`
      SELECT 
        r.*,
        u.name as reporter_name,
        u.email as reporter_email,
        o.title as opportunity_title,
        o.company_name,
        o.status as opportunity_status,
        o.verification_status
      FROM opportunity_reports r
      JOIN users u ON r.reported_by = u.id
      JOIN opportunities o ON r.opportunity_id = o.id
      ORDER BY r.created_at DESC
    `);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch opportunity reports.' });
  }
});

router.post('/admin/reports/:id/resolve', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const reportId = req.params.id;
    const { action } = req.body; // 'DISMISS' | 'FLAG' | 'UNPUBLISH' | 'DELETE'

    const report = queryOne('SELECT * FROM opportunity_reports WHERE id = ?', [reportId]);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    if (action === 'DISMISS') {
      execute("UPDATE opportunity_reports SET status = 'DISMISSED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [reportId]);
    } else if (action === 'FLAG') {
      execute("UPDATE opportunity_reports SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [reportId]);
      execute("UPDATE opportunities SET verification_status = 'FLAGGED' WHERE id = ?", [report.opportunity_id]);
    } else if (action === 'UNPUBLISH') {
      execute("UPDATE opportunity_reports SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [reportId]);
      execute("UPDATE opportunities SET status = 'REJECTED', verification_status = 'REJECTED' WHERE id = ?", [report.opportunity_id]);
    } else if (action === 'DELETE') {
      execute("UPDATE opportunity_reports SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = ?", [reportId]);
      execute('DELETE FROM opportunities WHERE id = ?', [report.opportunity_id]);
    } else {
      res.status(400).json({ error: "Invalid action. Supported: 'DISMISS', 'FLAG', 'UNPUBLISH', 'DELETE'" });
      return;
    }

    res.json({ success: true, message: `Report processed with action: ${action}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve report.' });
  }
});

// Admin Opportunity Approvals & Moderation
router.post('/:id/approve', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    execute("UPDATE opportunities SET status = 'PUBLISHED', verification_status = 'VERIFIED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [oppId]);
    res.json({ success: true, message: 'Opportunity approved and published.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    execute("UPDATE opportunities SET status = 'REJECTED', verification_status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [oppId]);
    res.json({ success: true, message: 'Opportunity rejected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/feature', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    const current = queryOne('SELECT is_featured FROM opportunities WHERE id = ?', [oppId]);
    const newFeatured = current?.is_featured ? 0 : 1;
    execute('UPDATE opportunities SET is_featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newFeatured, oppId]);
    res.json({ success: true, is_featured: newFeatured, message: `Featured status updated to ${newFeatured}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/close', authenticateToken, requireRole(['admin', 'recruiter']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    const opp = queryOne('SELECT posted_by FROM opportunities WHERE id = ?', [oppId]);
    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }
    if (req.user!.role !== 'admin' && opp.posted_by !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to close this opportunity.' });
      return;
    }
    execute("UPDATE opportunities SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [oppId]);
    res.json({ success: true, message: 'Opportunity closed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 9. GET /api/opportunities/:id — Single Opportunity Details & Eligibility
// =========================================================================
router.get('/:id', optionalAuth, (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    const opp = queryOne('SELECT * FROM opportunities WHERE id = ?', [oppId]);

    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    const studentContext = req.user ? getStudentContext(req.user.id) : null;
    const relevance = calculateOpportunityRelevance(opp, studentContext);
    const deadline = getDeadlineStatus(opp.application_deadline);

    let isSaved = false;
    let applicationInfo: any = null;

    if (req.user) {
      const saved = queryOne('SELECT id FROM saved_opportunities WHERE student_id = ? AND opportunity_id = ?', [req.user.id, oppId]);
      isSaved = !!saved;

      const app = queryOne('SELECT * FROM opportunity_applications WHERE student_id = ? AND opportunity_id = ?', [req.user.id, oppId]);
      if (app) {
        applicationInfo = {
          application_id: app.id,
          status: app.status,
          applied_at: app.applied_at,
          last_updated_at: app.last_updated_at,
          notes: app.notes,
          application_reference: app.application_reference
        };
      }
    }

    res.json({
      ...opp,
      required_skills: JSON.parse(opp.required_skills_json || '[]'),
      preferred_skills: JSON.parse(opp.preferred_skills_json || '[]'),
      is_saved: isSaved,
      application_status: applicationInfo ? applicationInfo.status : null,
      application_details: applicationInfo,
      relevance_score: relevance.relevanceScore,
      is_eligible: relevance.isEligible,
      matched_skills: relevance.matchedSkills,
      missing_skills: relevance.missingSkills,
      eligibility_reasons: relevance.eligibilityReasons,
      is_expired: deadline.isExpired,
      days_remaining: deadline.daysRemaining,
      deadline_badge: deadline.deadlineBadge,
      deadline_variant: deadline.badgeVariant
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch opportunity details.' });
  }
});

// =========================================================================
// 10. POST /api/opportunities — Create Opportunity (Recruiter/Admin)
// =========================================================================
router.post('/', authenticateToken, requireRole(['recruiter', 'admin', 'college']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const {
      title,
      type,
      company_name,
      company_logo,
      description,
      short_description,
      required_skills = [],
      preferred_skills = [],
      eligibility_criteria,
      qualification,
      branch = 'All Engineering Branches',
      minimum_year = 1,
      maximum_year = 4,
      location,
      work_mode = 'ONSITE',
      stipend,
      salary_range,
      duration,
      start_date,
      end_date,
      application_deadline,
      apply_url,
      registration_url,
      contact_email,
      contact_phone
    } = req.body;

    if (!title || !type || !company_name || !description || !application_deadline || !location) {
      res.status(400).json({
        error: 'Missing required fields: title, type, company_name, description, application_deadline, location.'
      });
      return;
    }

    const validTypes = ['INTERNSHIP', 'JOB', 'HIRING_DRIVE', 'PLACEMENT_DRIVE', 'EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid opportunity type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const validWorkModes = ['ONSITE', 'REMOTE', 'HYBRID'];
    if (work_mode && !validWorkModes.includes(work_mode)) {
      res.status(400).json({ error: `Invalid work mode. Must be one of: ${validWorkModes.join(', ')}` });
      return;
    }

    if (isNaN(new Date(application_deadline).getTime())) {
      res.status(400).json({ error: 'Invalid application_deadline date format.' });
      return;
    }

    const oppId = `opp-${uuidv4().slice(0, 8)}`;
    const status = role === 'admin' ? (req.body.status || 'PUBLISHED') : 'PUBLISHED';
    const verificationStatus = role === 'admin' ? (req.body.verification_status || 'VERIFIED') : 'PENDING';
    const isFeatured = role === 'admin' && req.body.is_featured ? 1 : 0;

    execute(
      `INSERT INTO opportunities (
        id, title, type, company_name, company_logo, description, short_description,
        required_skills_json, preferred_skills_json, eligibility_criteria, qualification,
        branch, minimum_year, maximum_year, location, work_mode, stipend, salary_range,
        duration, start_date, end_date, application_deadline, apply_url, registration_url,
        contact_email, contact_phone, posted_by, company_id, status, verification_status,
        is_featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        oppId, title, type, company_name, company_logo || null, description, short_description || title,
        JSON.stringify(Array.isArray(required_skills) ? required_skills : [required_skills]),
        JSON.stringify(Array.isArray(preferred_skills) ? preferred_skills : [preferred_skills]),
        eligibility_criteria || null, qualification || null,
        branch, minimum_year, maximum_year, location, work_mode, stipend || null, salary_range || null,
        duration || null, start_date || null, end_date || null, application_deadline, apply_url || null,
        registration_url || null, contact_email || null, contact_phone || null, userId,
        status, verificationStatus, isFeatured
      ]
    );

    res.status(201).json({
      success: true,
      opportunityId: oppId,
      status,
      verification_status: verificationStatus,
      message: 'Opportunity created successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create opportunity.' });
  }
});

// =========================================================================
// 11. PUT /api/opportunities/:id — Update Opportunity
// =========================================================================
router.put('/:id', authenticateToken, requireRole(['recruiter', 'admin', 'college']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    const opp = queryOne('SELECT posted_by FROM opportunities WHERE id = ?', [oppId]);

    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    if (req.user!.role !== 'admin' && opp.posted_by !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to edit this opportunity.' });
      return;
    }

    const {
      title,
      type,
      company_name,
      company_logo,
      description,
      short_description,
      required_skills,
      preferred_skills,
      eligibility_criteria,
      qualification,
      branch,
      minimum_year,
      maximum_year,
      location,
      work_mode,
      stipend,
      salary_range,
      duration,
      application_deadline,
      apply_url,
      contact_email
    } = req.body;

    const validTypes = ['INTERNSHIP', 'JOB', 'HIRING_DRIVE', 'PLACEMENT_DRIVE', 'EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION'];
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid opportunity type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const validWorkModes = ['ONSITE', 'REMOTE', 'HYBRID'];
    if (work_mode && !validWorkModes.includes(work_mode)) {
      res.status(400).json({ error: `Invalid work mode. Must be one of: ${validWorkModes.join(', ')}` });
      return;
    }

    if (application_deadline && isNaN(new Date(application_deadline).getTime())) {
      res.status(400).json({ error: 'Invalid application_deadline date format.' });
      return;
    }

    execute(
      `UPDATE opportunities SET
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        company_name = COALESCE(?, company_name),
        company_logo = COALESCE(?, company_logo),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        required_skills_json = COALESCE(?, required_skills_json),
        preferred_skills_json = COALESCE(?, preferred_skills_json),
        eligibility_criteria = COALESCE(?, eligibility_criteria),
        qualification = COALESCE(?, qualification),
        branch = COALESCE(?, branch),
        minimum_year = COALESCE(?, minimum_year),
        maximum_year = COALESCE(?, maximum_year),
        location = COALESCE(?, location),
        work_mode = COALESCE(?, work_mode),
        stipend = COALESCE(?, stipend),
        salary_range = COALESCE(?, salary_range),
        duration = COALESCE(?, duration),
        application_deadline = COALESCE(?, application_deadline),
        apply_url = COALESCE(?, apply_url),
        contact_email = COALESCE(?, contact_email),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || null,
        type || null,
        company_name || null,
        company_logo || null,
        description || null,
        short_description || null,
        required_skills ? JSON.stringify(required_skills) : null,
        preferred_skills ? JSON.stringify(preferred_skills) : null,
        eligibility_criteria || null,
        qualification || null,
        branch || null,
        minimum_year || null,
        maximum_year || null,
        location || null,
        work_mode || null,
        stipend || null,
        salary_range || null,
        duration || null,
        application_deadline || null,
        apply_url || null,
        contact_email || null,
        oppId
      ]
    );

    res.json({ success: true, message: 'Opportunity updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update opportunity.' });
  }
});

// =========================================================================
// 12. DELETE /api/opportunities/:id — Delete Opportunity
// =========================================================================
router.delete('/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const oppId = req.params.id;
    const opp = queryOne('SELECT posted_by FROM opportunities WHERE id = ?', [oppId]);

    if (!opp) {
      res.status(404).json({ error: 'Opportunity not found.' });
      return;
    }

    if (req.user!.role !== 'admin' && opp.posted_by !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to delete this opportunity.' });
      return;
    }

    execute('DELETE FROM opportunities WHERE id = ?', [oppId]);
    res.json({ success: true, message: 'Opportunity deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete opportunity.' });
  }
});

// =========================================================================
// 13. Backwards Compatibility: /internships, /jobs, /events, /apply, /my-applications
// =========================================================================
router.get('/internships', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const studentContext = getStudentContext(userId);
    const opps = queryAll("SELECT * FROM opportunities WHERE type = 'INTERNSHIP' AND verification_status = 'VERIFIED' ORDER BY created_at DESC");

    const appliedIds = new Set(
      queryAll("SELECT opportunity_id FROM opportunity_applications WHERE student_id = ?", [userId]).map(a => a.opportunity_id)
    );

    const result = opps.map(item => {
      const rel = calculateOpportunityRelevance(item, studentContext);
      return {
        ...item,
        requiredSkills: JSON.parse(item.required_skills_json || '[]'),
        preferredSkills: JSON.parse(item.preferred_skills_json || '[]'),
        matchScore: rel.relevanceScore,
        matchExplanation: rel.eligibilityReasons.join('. '),
        strongMatches: rel.matchedSkills,
        missingSkills: rel.missingSkills,
        isRecommended: rel.relevanceScore >= 75,
        isApplied: appliedIds.has(item.id)
      };
    });

    result.sort((a, b) => b.matchScore - a.matchScore);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch internships.' });
  }
});

router.get('/jobs', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const studentContext = getStudentContext(userId);
    const opps = queryAll("SELECT * FROM opportunities WHERE type = 'JOB' AND verification_status = 'VERIFIED' ORDER BY created_at DESC");

    const appliedIds = new Set(
      queryAll("SELECT opportunity_id FROM opportunity_applications WHERE student_id = ?", [userId]).map(a => a.opportunity_id)
    );

    const result = opps.map(item => {
      const rel = calculateOpportunityRelevance(item, studentContext);
      return {
        ...item,
        requiredSkills: JSON.parse(item.required_skills_json || '[]'),
        preferredSkills: JSON.parse(item.preferred_skills_json || '[]'),
        matchScore: rel.relevanceScore,
        matchExplanation: rel.eligibilityReasons.join('. '),
        strongMatches: rel.matchedSkills,
        missingSkills: rel.missingSkills,
        isRecommended: rel.relevanceScore >= 75,
        isApplied: appliedIds.has(item.id)
      };
    });

    result.sort((a, b) => b.matchScore - a.matchScore);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch jobs.' });
  }
});

router.get('/events', authenticateToken, (_req: Request, res: Response): void => {
  try {
    const events = queryAll("SELECT * FROM opportunities WHERE type IN ('EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION') ORDER BY application_deadline ASC");
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch events.' });
  }
});

router.post('/apply', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { opportunityId, notes, applicationReference } = req.body;

    if (!opportunityId) {
      res.status(400).json({ error: 'Opportunity ID is required.' });
      return;
    }

    const existing = queryOne(
      'SELECT id FROM opportunity_applications WHERE student_id = ? AND opportunity_id = ?',
      [userId, opportunityId]
    );

    if (existing) {
      res.json({
        success: true,
        applicationId: existing.id,
        message: 'Application already on file in your tracking pipeline.'
      });
      return;
    }

    const appId = `app-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO opportunity_applications (
        id, student_id, opportunity_id, status, applied_at, last_updated_at, notes, application_reference
      ) VALUES (?, ?, ?, 'APPLIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)`,
      [appId, userId, opportunityId, notes || null, applicationReference || null]
    );

    res.json({
      success: true,
      applicationId: appId,
      message: 'Application tracked successfully!'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to apply.' });
  }
});

router.get('/my-applications', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const applications = queryAll(`
      SELECT 
        oa.id as id,
        oa.opportunity_id,
        oa.status as current_stage,
        oa.applied_at,
        oa.notes,
        o.title,
        o.company_name,
        o.company_logo as logo_url,
        o.type as opportunity_type
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      WHERE oa.student_id = ?
      ORDER BY oa.applied_at DESC
    `, [userId]);

    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch applications.' });
  }
});

export default router;
