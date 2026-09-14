import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';

const router = Router();

// ============================================================================
// STEP 15: RECRUITER DASHBOARD & HIRING PLATFORM ENDPOINTS
// ============================================================================

/**
 * Helper to get recruiter company
 */
function getRecruiterCompany(userId: string) {
  let comp = queryOne<any>('SELECT * FROM companies WHERE user_id = ?', [userId]);
  if (!comp) {
    comp = queryOne<any>('SELECT * FROM companies LIMIT 1') || {
      id: 'comp-1',
      name: 'Nexus Technologies',
      industry: 'Cloud Software & AI Systems',
      verification_status: 'VERIFIED'
    };
  }
  return comp;
}

/**
 * 15.2 Recruiter Dashboard Overview
 * GET /api/recruiter/dashboard
 */
router.get('/dashboard', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);

    // Active opportunities from marketplace
    const opportunities = queryAll<any>(
      `SELECT * FROM opportunities WHERE company_id = ? OR posted_by = ?`,
      [company.id, userId]
    );

    const activeOpportunities = opportunities.filter(o => o.status === 'PUBLISHED');

    // Applications for this company's opportunities
    const applications = queryAll<any>(`
      SELECT oa.*, o.title as opportunity_title, o.type as opportunity_type,
             u.name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             sp.career_interest, sp.department, sp.current_year, sp.career_readiness_score
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      JOIN users u ON oa.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE o.company_id = ? OR o.posted_by = ?
      ORDER BY oa.applied_at DESC
    `, [company.id, userId]);

    // Scheduled interviews
    const interviews = queryAll<any>(`
      SELECT ri.*, u.name as candidate_name, u.email as candidate_email, o.title as opportunity_title
      FROM recruiter_interviews ri
      JOIN users u ON ri.candidate_id = u.id
      LEFT JOIN opportunities o ON ri.opportunity_id = o.id
      WHERE ri.recruiter_id = ?
      ORDER BY ri.scheduled_date ASC
    `, [userId]);

    const shortlisted = applications.filter(a => a.status === 'SHORTLISTED');
    const selected = applications.filter(a => a.status === 'SELECTED');
    const pendingApps = applications.filter(a => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW');

    const summaryCards = {
      activeJobs: activeOpportunities.length,
      totalCandidates: applications.length,
      pendingApplications: pendingApps.length,
      shortlisted: shortlisted.length,
      selected: selected.length,
      upcomingInterviews: interviews.filter(i => i.status === 'SCHEDULED').length
    };

    res.json({
      success: true,
      message: 'Recruiter dashboard loaded successfully',
      data: {
        company,
        summaryCards,
        recentApplications: applications.slice(0, 10),
        upcomingInterviews: interviews.slice(0, 5),
        opportunities: opportunities.slice(0, 6)
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load recruiter dashboard', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.3 Company Profile Management
 * GET /api/recruiter/company-profile
 * PUT /api/recruiter/company-profile
 */
router.get('/company-profile', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);
    const recruiterUser = queryOne<any>('SELECT name, email, phone FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'Company profile loaded',
      data: {
        id: company.id,
        companyName: company.company_name || company.name,
        logoUrl: company.logo_url,
        industry: company.industry,
        website: company.website,
        description: company.description,
        location: company.location || 'Bengaluru, India',
        companySize: company.company_size || '50-200 Employees',
        contactEmail: company.company_email || company.contact_email || recruiterUser?.email,
        verificationStatus: company.verification_status || (company.verified ? 'VERIFIED' : 'PENDING_VERIFICATION'),
        recruiterName: company.recruiter_name || recruiterUser?.name,
        designation: company.designation || 'Head of University Talent'
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch company profile', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/company-profile', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);

    const {
      companyName,
      logoUrl,
      industry,
      website,
      description,
      location,
      companySize,
      contactEmail,
      recruiterName,
      designation
    } = req.body;

    execute(
      `UPDATE companies SET
        name = COALESCE(?, name),
        company_name = COALESCE(?, company_name),
        logo_url = COALESCE(?, logo_url),
        industry = COALESCE(?, industry),
        website = COALESCE(?, website),
        description = COALESCE(?, description),
        company_email = COALESCE(?, company_email),
        recruiter_name = COALESCE(?, recruiter_name),
        designation = COALESCE(?, designation)
      WHERE id = ?`,
      [companyName, companyName, logoUrl, industry, website, description, contactEmail, recruiterName, designation, company.id]
    );

    res.json({
      success: true,
      message: 'Company profile updated. (Note: Verification status can only be modified by Platform Administrators)',
      data: { id: company.id, companyName, industry, website },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update company profile', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.4 Create Opportunity (Posting begins as PENDING_VERIFICATION)
 * POST /api/recruiter/opportunities
 */
router.post('/opportunities', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);

    const {
      title,
      type = 'INTERNSHIP',
      description,
      requiredSkills = [],
      preferredSkills = [],
      eligibility = 'Graduating 2026 Batch',
      qualification = 'B.Tech / B.E.',
      branch = 'Computer Science, IT, Electronics',
      academicYear = 'Year 3 / Year 4',
      location = 'Remote / Bengaluru',
      workMode = 'REMOTE',
      stipend = '₹30,000 / month',
      salary = '₹8,00,000 / annum',
      duration = '6 Months',
      startDate = '2026-10-01',
      endDate = '2027-04-01',
      applicationDeadline = '2026-10-31',
      applyUrl = 'https://skillbridge.ai/apply',
      contactEmail = 'recruiting@alphascale.io'
    } = req.body;

    if (!title || !description) {
      res.status(400).json({ success: false, message: 'Opportunity title and description are required.', data: null, error: { code: 'VALIDATION_ERROR', details: 'Missing required title or description.' } });
      return;
    }

    const opportunityId = `opp-${uuidv4()}`;

    // Opportunities created by recruiters start as PENDING moderation
    execute(
      `INSERT INTO opportunities (
        id, title, company_name, type, description, required_skills_json, preferred_skills_json,
        eligibility_criteria, qualification, branch, location, work_mode, stipend, salary_range,
        duration, start_date, end_date, application_deadline, apply_url, contact_email,
        posted_by, company_id, status, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'PENDING')`,
      [
        opportunityId,
        title,
        company.company_name || company.name || 'AlphaScale Labs',
        type,
        description,
        JSON.stringify(requiredSkills),
        JSON.stringify(preferredSkills),
        eligibility,
        qualification,
        branch,
        location,
        workMode,
        stipend,
        salary,
        duration,
        startDate,
        endDate,
        applicationDeadline,
        applyUrl,
        contactEmail,
        userId,
        company.id
      ]
    );

    // Audit log
    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, details_json)
       VALUES (?, ?, 'CREATE_OPPORTUNITY', ?, ?)`,
      [`log-${uuidv4()}`, userId, opportunityId, JSON.stringify({ title, type, verificationStatus: 'PENDING' })]
    );

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully. It will become publicly visible once approved by College/Platform Admin.',
      data: {
        id: opportunityId,
        title,
        type,
        status: 'DRAFT',
        verificationStatus: 'PENDING'
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create opportunity', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.5 Recruiter Opportunity Management
 * GET /api/recruiter/opportunities
 * GET /api/recruiter/opportunities/:id
 * PUT /api/recruiter/opportunities/:id
 * DELETE /api/recruiter/opportunities/:id
 */
router.get('/opportunities', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);

    const list = queryAll<any>(`
      SELECT o.*,
        (SELECT COUNT(*) FROM opportunity_applications oa WHERE oa.opportunity_id = o.id) as applications_count,
        (SELECT COUNT(*) FROM opportunity_applications oa WHERE oa.opportunity_id = o.id AND oa.status = 'SHORTLISTED') as shortlisted_count
      FROM opportunities o
      WHERE o.company_id = ? OR o.posted_by = ?
      ORDER BY o.created_at DESC
    `, [company.id, userId]);

    res.json({
      success: true,
      message: 'Recruiter opportunities retrieved',
      data: list,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch opportunities', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.get('/opportunities/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const opp = queryOne<any>('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (!opp) {
      res.status(404).json({ success: false, message: 'Opportunity not found', data: null, error: { code: 'NOT_FOUND', details: 'Record not found.' } });
      return;
    }

    const applications = queryAll<any>(`
      SELECT oa.*, u.name as candidate_name, u.email as candidate_email, sp.career_interest, sp.career_readiness_score
      FROM opportunity_applications oa
      JOIN users u ON oa.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE oa.opportunity_id = ?
      ORDER BY oa.applied_at DESC
    `, [id]);

    res.json({
      success: true,
      message: 'Opportunity loaded',
      data: {
        opportunity: opp,
        applications
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch opportunity', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/opportunities/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { title, description, location, workMode, stipend, salary, applicationDeadline, status } = req.body;

    const opp = queryOne<any>('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (!opp) {
      res.status(404).json({ success: false, message: 'Opportunity not found', data: null, error: { code: 'NOT_FOUND', details: 'Record not found.' } });
      return;
    }

    // Recruiters cannot change verification_status (only admins can)
    execute(
      `UPDATE opportunities SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        location = COALESCE(?, location),
        work_mode = COALESCE(?, work_mode),
        stipend = COALESCE(?, stipend),
        salary = COALESCE(?, salary),
        application_deadline = COALESCE(?, application_deadline),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, description, location, workMode, stipend, salary, applicationDeadline, status, id]
    );

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      data: { id, title },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update opportunity', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.delete('/opportunities/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    execute(`UPDATE opportunities SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: 'Opportunity closed successfully',
      data: { id },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to close opportunity', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.6 Candidate Applications Management
 * GET /api/recruiter/applications
 * GET /api/recruiter/applications/:id
 * PUT /api/recruiter/applications/:id/status
 */
router.get('/applications', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const company = getRecruiterCompany(userId);
    const { status, opportunityId } = req.query;

    let sql = `
      SELECT oa.*, o.title as opportunity_title, o.type as opportunity_type,
             u.name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             sp.career_interest, sp.department, sp.current_year, sp.career_readiness_score
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      JOIN users u ON oa.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE (o.company_id = ? OR o.posted_by = ?)
    `;
    const params: any[] = [company.id, userId];

    if (status) {
      sql += ` AND oa.status = ?`;
      params.push(String(status).toUpperCase());
    }
    if (opportunityId) {
      sql += ` AND oa.opportunity_id = ?`;
      params.push(opportunityId);
    }

    sql += ` ORDER BY oa.applied_at DESC`;

    const apps = queryAll<any>(sql, params);

    res.json({
      success: true,
      message: 'Applications retrieved',
      data: apps,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch applications', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.get('/applications/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const app = queryOne<any>(`
      SELECT oa.*, o.title as opportunity_title, o.type as opportunity_type, o.required_skills_json,
             u.name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             sp.career_interest, sp.department, sp.current_year, sp.career_readiness_score, sp.resume_url
      FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      JOIN users u ON oa.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE oa.id = ?
    `, [id]);

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found', data: null, error: { code: 'NOT_FOUND', details: 'Application does not exist.' } });
      return;
    }

    const skills = queryAll<any>(`
      SELECT s.name, ss.score, ss.level
      FROM student_skills ss
      JOIN skills s ON ss.skill_id = s.id
      WHERE ss.user_id = ?
    `, [app.student_id]);

    res.json({
      success: true,
      message: 'Application loaded',
      data: {
        application: app,
        candidateSkills: skills
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch application details', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/applications/:id/status', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.id;

    const validStatuses = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid application status', data: null, error: { code: 'INVALID_STATUS', details: 'Status not permitted.' } });
      return;
    }

    const app = queryOne<any>('SELECT * FROM opportunity_applications WHERE id = ?', [id]);
    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found', data: null, error: { code: 'NOT_FOUND', details: 'Record not found.' } });
      return;
    }

    execute(
      `UPDATE opportunity_applications SET status = ?, notes = COALESCE(?, notes), last_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, notes, id]
    );

    // Audit log
    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, details_json)
       VALUES (?, ?, 'UPDATE_APPLICATION_STATUS', ?, ?)`,
      [`log-${uuidv4()}`, userId, id, JSON.stringify({ previousStatus: app.status, newStatus: status })]
    );

    // Notify candidate
    try {
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
         VALUES (?, ?, 'Application Status Update', ?, 'APPLICATION_UPDATE', ?, 0, CURRENT_TIMESTAMP)`,
        [`notif-${uuidv4()}`, app.student_id, `Your application status has been updated to: ${status}`, id]
      );
    } catch {}

    res.json({
      success: true,
      message: `Application status updated to ${status}`,
      data: { id, status },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update application status', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.7 Candidate Skill Comparison View
 * GET /api/recruiter/candidates/:id/skills
 */
router.get('/candidates/:id/skills', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const candidateId = req.params.id;
    const { opportunityId } = req.query;

    const candidate = queryOne<any>(`
      SELECT u.id, u.name, u.email, sp.department, sp.current_year, sp.career_interest, sp.career_readiness_score
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [candidateId]);

    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found', data: null, error: { code: 'NOT_FOUND', details: 'Candidate does not exist.' } });
      return;
    }

    // Candidate verified skills
    const studentSkills = queryAll<any>(`
      SELECT s.name, ss.verified_score as score, ss.current_level as level
      FROM student_skills ss
      JOIN skills s ON ss.skill_id = s.id
      WHERE ss.user_id = ?
    `, [candidateId]);

    let requiredSkills: string[] = ['Python', 'SQL', 'REST API', 'Data Structures'];
    if (opportunityId) {
      const opp = queryOne<any>('SELECT required_skills_json FROM opportunities WHERE id = ?', [opportunityId]);
      if (opp) {
        try {
          requiredSkills = JSON.parse(opp.required_skills_json || '[]');
        } catch {}
      }
    }

    const comparison = requiredSkills.map(reqSkill => {
      const found = studentSkills.find(sk => sk.name.toLowerCase() === reqSkill.toLowerCase());
      return {
        skill: reqSkill,
        candidateLevel: found ? found.level : 'Not Assessed',
        candidateScore: found ? found.score : 0,
        status: found && found.score >= 60 ? 'MATCHED' : found ? 'PARTIAL' : 'MISSING'
      };
    });

    const matchedCount = comparison.filter(c => c.status === 'MATCHED').length;
    const matchPercentage = Math.round((matchedCount / Math.max(1, comparison.length)) * 100);

    res.json({
      success: true,
      message: 'Candidate skill breakdown computed',
      data: {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          department: candidate.department,
          year: candidate.current_year,
          targetRole: candidate.career_interest,
          readinessScore: candidate.career_readiness_score
        },
        skillMatchPercentage: matchPercentage,
        comparison,
        codingEvidence: {
          problemsSolved: 24,
          streakDays: 12,
          preferredLanguage: 'Python'
        },
        communicationEvidence: {
          score: 82,
          fluencyLevel: 'Advanced',
          language: 'English'
        }
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch candidate skills', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 15.8 Recruiter Interview Scheduling
 * POST /api/recruiter/interviews
 * GET /api/recruiter/interviews
 * PUT /api/recruiter/interviews/:id
 * DELETE /api/recruiter/interviews/:id
 */
router.post('/interviews', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const recruiterId = req.user!.id;
    const {
      candidateId,
      opportunityId,
      applicationId,
      interviewType = 'TECHNICAL',
      scheduledDate,
      scheduledTime,
      durationMinutes = 45,
      meetingLink,
      instructions
    } = req.body;

    if (!candidateId || !scheduledDate || !scheduledTime) {
      res.status(400).json({ success: false, message: 'Candidate ID, scheduled date, and time are required.', data: null, error: { code: 'VALIDATION_ERROR', details: 'Missing required interview schedule parameters.' } });
      return;
    }

    const interviewId = `rec-int-${uuidv4()}`;
    const link = meetingLink || `https://meet.skillbridge.ai/room-${Math.floor(100000 + Math.random() * 900000)}`;

    execute(
      `INSERT INTO recruiter_interviews (
        id, recruiter_id, candidate_id, opportunity_id, application_id, interview_type,
        scheduled_date, scheduled_time, duration_minutes, meeting_link, instructions, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', CURRENT_TIMESTAMP)`,
      [
        interviewId,
        recruiterId,
        candidateId,
        opportunityId || null,
        applicationId || null,
        interviewType,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        link,
        instructions || 'Please be ready with a code editor for live demonstration.'
      ]
    );

    // Update application stage if applicationId exists
    if (applicationId) {
      execute(
        `UPDATE opportunity_applications SET status = 'INTERVIEW_SCHEDULED', last_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [applicationId]
      );
    }

    // Notify candidate
    try {
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
         VALUES (?, ?, 'Interview Scheduled by Recruiter', ?, 'INTERVIEW_SCHEDULED', ?, 0, CURRENT_TIMESTAMP)`,
        [
          `notif-${uuidv4()}`,
          candidateId,
          `An interview (${interviewType}) has been scheduled for ${scheduledDate} at ${scheduledTime}.`,
          interviewId
        ]
      );
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        id: interviewId,
        candidateId,
        interviewType,
        scheduledDate,
        scheduledTime,
        meetingLink: link
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to schedule interview', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.get('/interviews', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const recruiterId = req.user!.id;

    const interviews = queryAll<any>(`
      SELECT ri.*, u.name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             o.title as opportunity_title
      FROM recruiter_interviews ri
      JOIN users u ON ri.candidate_id = u.id
      LEFT JOIN opportunities o ON ri.opportunity_id = o.id
      WHERE ri.recruiter_id = ?
      ORDER BY ri.scheduled_date ASC
    `, [recruiterId]);

    res.json({
      success: true,
      message: 'Recruiter interviews retrieved',
      data: interviews,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interviews', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/interviews/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, meetingLink, instructions, status, notes } = req.body;

    execute(
      `UPDATE recruiter_interviews SET
        scheduled_date = COALESCE(?, scheduled_date),
        scheduled_time = COALESCE(?, scheduled_time),
        meeting_link = COALESCE(?, meeting_link),
        instructions = COALESCE(?, instructions),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [scheduledDate, scheduledTime, meetingLink, instructions, status, notes, id]
    );

    res.json({
      success: true,
      message: 'Interview updated',
      data: { id, status },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update interview', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.delete('/interviews/:id', authenticateToken, requireRole(['recruiter', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    execute(`UPDATE recruiter_interviews SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: 'Interview cancelled successfully',
      data: { id },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel interview', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

export default router;
