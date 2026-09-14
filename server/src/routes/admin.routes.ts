import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';

const router = Router();

// ============================================================================
// STEP 16: COLLEGE & ADMIN DASHBOARD / OVERSIGHT / RBAC
// ============================================================================

/**
 * 16.1 Admin System Metrics & Overview
 * GET /api/admin/metrics
 */
router.get('/metrics', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const totalUsers = queryOne<any>('SELECT COUNT(*) as count FROM users')?.count || 0;
    const studentsCount = queryOne<any>("SELECT COUNT(*) as count FROM users WHERE role = 'student'")?.count || 0;
    const collegesCount = queryOne<any>("SELECT COUNT(*) as count FROM users WHERE role = 'college'")?.count || 0;
    const recruitersCount = queryOne<any>("SELECT COUNT(*) as count FROM users WHERE role = 'recruiter'")?.count || 0;
    const mentorsCount = queryOne<any>("SELECT COUNT(*) as count FROM users WHERE role = 'mentor'")?.count || 0;

    const totalAssessments = queryOne<any>('SELECT COUNT(*) as count FROM assessment_attempts')?.count || 0;
    const totalSubmissions = queryOne<any>('SELECT COUNT(*) as count FROM submissions')?.count || 0;
    const totalCourses = queryOne<any>('SELECT COUNT(*) as count FROM courses')?.count || 0;
    const totalViolations = queryOne<any>('SELECT COUNT(*) as count FROM proctoring_logs')?.count || 0;

    const pendingOpportunitiesCount = queryOne<any>(
      "SELECT COUNT(*) as count FROM opportunities WHERE verification_status = 'PENDING' OR status = 'DRAFT'"
    )?.count || 0;

    const pendingCompaniesCount = queryOne<any>(
      "SELECT COUNT(*) as count FROM companies WHERE verification_status = 'PENDING_VERIFICATION' OR verified = 0"
    )?.count || 0;

    const recentAuditLogs = queryAll<any>('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 15');
    const recentViolations = queryAll<any>('SELECT * FROM proctoring_logs ORDER BY timestamp DESC LIMIT 10');

    res.json({
      success: true,
      message: 'Admin metrics retrieved',
      data: {
        metrics: {
          totalUsers,
          studentsCount,
          collegesCount,
          recruitersCount,
          mentorsCount,
          totalAssessments,
          totalSubmissions,
          totalCourses,
          totalViolations,
          pendingOpportunitiesCount,
          pendingCompaniesCount
        },
        auditLogs: recentAuditLogs,
        proctoringViolations: recentViolations,
        systemHealth: {
          database: 'SQLite (Native Node v24)',
          aiEngines: 'Active (Mock Interview, Assessment, Matching)',
          sandboxSecurity: 'Active Safe Exam & Docker Support',
          proctoringMode: 'Vision HUD & Window Focus Monitoring'
        }
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin metrics', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 16.2 Opportunity Moderation Queue
 * GET /api/admin/moderation/opportunities
 * PUT /api/admin/moderation/opportunities/:id
 */
router.get('/moderation/opportunities', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT o.*, u.name as posted_by_name, u.email as posted_by_email, c.name as company_canonical_name, c.verification_status as company_verification_status
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      LEFT JOIN companies c ON o.company_id = c.id
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE o.verification_status = ? OR o.status = ?`;
      params.push(status, status);
    }
    sql += ` ORDER BY o.created_at DESC`;

    const list = queryAll<any>(sql, params);
    res.json({
      success: true,
      message: 'Opportunity moderation queue loaded',
      data: list,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch moderation queue', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/moderation/opportunities/:id', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'APPROVE', 'REJECT', 'FLAG'
    const adminId = req.user!.id;

    const opp = queryOne<any>('SELECT * FROM opportunities WHERE id = ?', [id]);
    if (!opp) {
      res.status(404).json({ success: false, message: 'Opportunity not found', data: null, error: { code: 'NOT_FOUND', details: 'Record not found.' } });
      return;
    }

    let newStatus = opp.status;
    let newVerification = opp.verification_status;

    if (action === 'APPROVE') {
      newStatus = 'PUBLISHED';
      newVerification = 'VERIFIED';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      newVerification = 'REJECTED';
    } else if (action === 'FLAG') {
      newStatus = 'FLAGGED';
      newVerification = 'FLAGGED';
    } else {
      res.status(400).json({ success: false, message: 'Invalid moderation action', data: null, error: { code: 'INVALID_ACTION', details: 'Permitted: APPROVE, REJECT, FLAG' } });
      return;
    }

    execute(
      `UPDATE opportunities SET status = ?, verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, newVerification, id]
    );

    // Audit log
    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, details_json)
       VALUES (?, ?, 'MODERATE_OPPORTUNITY', ?, ?)`,
      [`log-${uuidv4()}`, adminId, id, JSON.stringify({ action, notes, previousStatus: opp.status, newStatus })]
    );

    // Notify the posting recruiter
    if (opp.posted_by) {
      try {
        execute(
          `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
           VALUES (?, ?, 'Opportunity Moderation Update', ?, 'OPPORTUNITY_UPDATE', ?, 0, CURRENT_TIMESTAMP)`,
          [
            `notif-${uuidv4()}`,
            opp.posted_by,
            `Your opportunity "${opp.title}" has been ${action === 'APPROVE' ? 'approved and published' : action.toLowerCase() + 'ed'}. ${notes ? `Notes: ${notes}` : ''}`,
            id
          ]
        );
      } catch {}
    }

    res.json({
      success: true,
      message: `Opportunity ${action} successful.`,
      data: { id, status: newStatus, verificationStatus: newVerification },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update opportunity moderation', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 16.3 Company Partner Verification
 * GET /api/admin/companies
 * PUT /api/admin/companies/:id/verify
 */
router.get('/companies', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const list = queryAll<any>(`
      SELECT c.*, u.name as recruiter_user_name, u.email as recruiter_email,
        (SELECT COUNT(*) FROM opportunities o WHERE o.company_id = c.id) as opportunities_count
      FROM companies c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      message: 'Companies retrieved',
      data: list,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/companies/:id/verify', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'VERIFIED', 'PENDING_VERIFICATION', 'REJECTED'
    const adminId = req.user!.id;

    const company = queryOne<any>('SELECT * FROM companies WHERE id = ?', [id]);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found', data: null, error: { code: 'NOT_FOUND', details: 'Record not found.' } });
      return;
    }

    const isVerified = status === 'VERIFIED' ? 1 : 0;
    execute(
      `UPDATE companies SET verification_status = ?, verified = ? WHERE id = ?`,
      [status, isVerified, id]
    );

    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, details_json)
       VALUES (?, ?, 'VERIFY_COMPANY', ?, ?)`,
      [`log-${uuidv4()}`, adminId, id, JSON.stringify({ status, companyName: company.name })]
    );

    res.json({
      success: true,
      message: `Company accreditation status set to ${status}.`,
      data: { id, status },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update company verification', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 16.4 User & Student Account Administration
 * GET /api/admin/users
 * GET /api/admin/students
 * PUT /api/admin/users/:id/role
 * PUT /api/admin/users/:id/status
 * POST /api/admin/mentors/assign
 */
router.get('/users', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const users = queryAll<any>(`
      SELECT id, name, email, role, phone,
             (CASE WHEN account_status = 'suspended' THEN 0 ELSE 1 END) as is_active,
             account_status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json({
      success: true,
      message: 'Users listed',
      data: users,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list users', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.get('/students', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const { department, search } = req.query;

    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
             (CASE WHEN u.account_status = 'suspended' THEN 0 ELSE 1 END) as is_active,
             sp.college_name, sp.department, sp.current_year as year_of_study,
             sp.career_interest, sp.career_readiness_score, sp.current_level
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'student'
    `;
    const params: any[] = [];

    if (department && department !== 'All') {
      sql += ` AND LOWER(sp.department) = LOWER(?)`;
      params.push(department);
    }

    if (search) {
      sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
      params.push(`%${String(search).toLowerCase()}%`, `%${String(search).toLowerCase()}%`);
    }

    sql += ` ORDER BY sp.career_readiness_score DESC`;

    const students = queryAll<any>(sql, params);
    res.json({
      success: true,
      message: 'Students retrieved',
      data: students,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list students', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/users/:id/role', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const validRoles = ['student', 'college', 'recruiter', 'mentor', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role specified', data: null, error: { code: 'INVALID_ROLE', details: 'Role not permitted.' } });
      return;
    }

    execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      data: { id: userId, role },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update user role', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/users/:id/status', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.params.id;
    const { isActive } = req.body; // boolean

    execute("UPDATE users SET account_status = ? WHERE id = ?", [isActive ? 'active' : 'suspended', userId]);
    res.json({
      success: true,
      message: `User account status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}.`,
      data: { id: userId, isActive },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update user status', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.post('/mentors/assign', authenticateToken, requireRole(['admin', 'college']), (req: Request, res: Response): void => {
  try {
    const { studentId, mentorId, topic, notes } = req.body;
    const assignerId = req.user!.id;

    if (!studentId || !mentorId) {
      res.status(400).json({ success: false, message: 'Student ID and Mentor ID are required.', data: null, error: { code: 'VALIDATION_ERROR', details: 'Missing parameters.' } });
      return;
    }

    const requestId = `req-${uuidv4()}`;
    execute(
      `INSERT INTO mentorship_requests (id, student_id, mentor_id, topic, message, preferred_time, status)
       VALUES (?, ?, ?, ?, ?, 'Assigned by Campus Placement Office', 'ACCEPTED')`,
      [requestId, studentId, mentorId, topic || 'Placement Preparation Coaching', notes || 'Direct placement guidance allocation']
    );

    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, details_json)
       VALUES (?, ?, 'ASSIGN_MENTOR', ?, ?)`,
      [`log-${uuidv4()}`, assignerId, requestId, JSON.stringify({ studentId, mentorId, topic })]
    );

    res.json({
      success: true,
      message: 'Mentor allocated to student successfully.',
      data: { requestId, studentId, mentorId },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to assign mentor', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 16.5 Security & Audit Logs
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', authenticateToken, requireRole(['admin']), (req: Request, res: Response): void => {
  try {
    const logs = queryAll<any>(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      message: 'Audit logs retrieved',
      data: logs,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

export default router;
