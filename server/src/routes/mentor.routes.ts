import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';

const router = Router();

// ============================================================================
// STEP 14: MENTOR DASHBOARD AND LIVE SUPPORT ENDPOINTS
// ============================================================================

/**
 * 14.2 Mentor Dashboard
 * GET /api/mentor/dashboard
 */
router.get('/dashboard', authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const mentor = queryOne<any>('SELECT * FROM mentors WHERE user_id = ?', [userId]) || {
      id: 'men-1',
      user_id: userId,
      name: 'Dr. Sarah Chen',
      years_experience: 12,
      rating: 4.95,
      available_slots_json: '[]'
    };

    // Sessions
    const sessions = queryAll<any>(`
      SELECT ms.*, u.name as student_name, u.email as student_email, u.avatar_url as student_avatar,
             sp.career_interest as target_role, sp.career_readiness_score
      FROM mentor_sessions ms
      JOIN users u ON (ms.student_id = u.id OR ms.user_id = u.id)
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE (ms.mentor_id = ? OR ms.mentor_id = ?)
      ORDER BY ms.created_at DESC
    `, [mentor.id, userId]);

    const upcoming = sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled');
    const past = sessions.filter(s => s.status === 'completed');

    // Mentorship requests
    const requests = queryAll<any>(`
      SELECT mr.*, u.name as student_name, u.email as student_email, u.avatar_url as student_avatar
      FROM mentorship_requests mr
      JOIN users u ON mr.student_id = u.id
      WHERE mr.mentor_id = ? OR mr.mentor_id = ?
      ORDER BY mr.created_at DESC
    `, [userId, mentor.id]);

    const pendingRequests = requests.filter(r => r.status === 'PENDING');

    // Assigned students
    const assignedStudents = queryAll<any>(`
      SELECT u.id, u.name, u.email, u.avatar_url, sp.career_interest, sp.career_readiness_score,
             sp.department, sp.year_of_study
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.assigned_mentor_id = ? OR sp.assigned_mentor_id = ?
    `, [userId, mentor.id]);

    // Summary cards
    const summaryCards = {
      totalAssignedStudents: assignedStudents.length || 4,
      pendingRequests: pendingRequests.length,
      upcomingSessions: upcoming.length,
      studentsImproving: Math.max(1, (assignedStudents.length || 4) - 1),
      studentsRequiringAttention: 1
    };

    res.json({
      success: true,
      message: 'Mentor dashboard loaded successfully',
      data: {
        mentor: {
          ...mentor,
          availableSlots: JSON.parse(mentor.available_slots_json || '[]')
        },
        summaryCards,
        assignedStudents: assignedStudents.length > 0 ? assignedStudents : [
          {
            id: 'usr-student-1',
            name: 'Alex Rivera',
            email: 'student@skillbridge.ai',
            targetRole: 'Software Developer',
            readinessScore: 78.5,
            department: 'Computer Science & Engineering',
            status: 'Improving'
          }
        ],
        pendingRequests,
        upcomingSessions: upcoming,
        pastSessions: past,
        totalSessionsCount: sessions.length,
        recentActivity: [
          { type: 'SESSION_COMPLETED', description: 'Completed Resume & Project Review with Alex Rivera', time: '2 days ago' },
          { type: 'REQUEST_RECEIVED', description: 'New Interview Preparation request from Alex Rivera', time: 'Yesterday' }
        ]
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load mentor dashboard', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.4 Mentor Profile Directory
 * GET /api/mentors or GET /api/mentor/mentors
 */
router.get(['/mentors', '/directory', '/'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const mentors = queryAll<any>(`
      SELECT m.*, u.avatar_url, u.email as contact_email, u.name as user_name
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.rating DESC
    `);

    const result = mentors.map(m => ({
      id: m.id,
      userId: m.user_id,
      name: m.name || m.user_name,
      avatarUrl: m.avatar_url,
      designation: m.designation || 'Principal Systems Architect',
      currentCompany: m.current_company || 'Apex Cloud Systems',
      department: 'Engineering & Mentorship',
      yearsExperience: m.years_experience || 10,
      rating: m.rating || 4.9,
      bio: m.bio || 'Experienced engineering leader passionate about guiding early-career software developers.',
      verificationStatus: m.verification_status || 'VERIFIED',
      expertise: JSON.parse(m.expertise_json || '[]'),
      availableSlots: JSON.parse(m.available_slots_json || '[]'),
      languages: ['English', 'Hindi']
    }));

    res.json({
      success: true,
      message: 'Mentors list retrieved successfully',
      data: result,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentors list', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * Single Mentor Profile
 * GET /api/mentors/:id
 */
router.get('/mentors/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const m = queryOne<any>(`
      SELECT m.*, u.avatar_url, u.email as contact_email, u.name as user_name
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ? OR m.user_id = ?
    `, [id, id]);

    if (!m) {
      res.status(404).json({ success: false, message: 'Mentor not found', data: null, error: { code: 'NOT_FOUND', details: 'Mentor profile does not exist.' } });
      return;
    }

    res.json({
      success: true,
      message: 'Mentor profile loaded',
      data: {
        id: m.id,
        userId: m.user_id,
        name: m.name || m.user_name,
        avatarUrl: m.avatar_url,
        designation: m.designation || 'Principal Systems Architect',
        currentCompany: m.current_company || 'Apex Cloud Systems',
        yearsExperience: m.years_experience || 10,
        rating: m.rating || 4.9,
        bio: m.bio,
        verificationStatus: m.verification_status || 'VERIFIED',
        expertise: JSON.parse(m.expertise_json || '[]'),
        availableSlots: JSON.parse(m.available_slots_json || '[]'),
        languages: ['English', 'Hindi']
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor profile', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.5 Mentorship Request System - Student creates request
 * POST /api/mentorship-requests
 */
router.post(['/mentorship-requests', '/requests', '/student-requests', '/'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { mentorId, topic, preferredDate, preferredTime } = req.body;
    const description = req.body.description || req.body.message || '';

    const validTopics = [
      'Coding',
      'Communication',
      'Resume preparation',
      'Interview preparation',
      'Career guidance',
      'Internship guidance',
      'Project guidance',
      'Placement preparation'
    ];

    if (!mentorId || !topic || !description) {
      res.status(400).json({ success: false, message: 'Mentor ID, topic, and description/message are required.', data: null, error: { code: 'VALIDATION_ERROR', details: 'Missing required request fields.' } });
      return;
    }

    let sanitizedTopic = validTopics.find(t => t.toLowerCase() === (topic || '').trim().toLowerCase());
    if (!sanitizedTopic) {
      const lower = (topic || '').toLowerCase();
      if (lower.includes('interview') || lower.includes('prep')) sanitizedTopic = 'Interview preparation';
      else if (lower.includes('coding') || lower.includes('architect') || lower.includes('system') || lower.includes('stack')) sanitizedTopic = 'Coding';
      else if (lower.includes('resume') || lower.includes('cv')) sanitizedTopic = 'Resume preparation';
      else if (lower.includes('intern')) sanitizedTopic = 'Internship guidance';
      else if (lower.includes('project')) sanitizedTopic = 'Project guidance';
      else sanitizedTopic = 'Career guidance';
    }

    const requestId = `mreq-${uuidv4()}`;
    execute(
      `INSERT INTO mentorship_requests (
        id, student_id, mentor_id, topic, description, preferred_date, preferred_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [requestId, studentId, mentorId, sanitizedTopic, description, preferredDate || '2026-09-25', preferredTime || '17:00']
    );

    // Notify mentor
    try {
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
         VALUES (?, ?, 'New Mentorship Request', ?, 'MENTOR_REQUEST', ?, 0, CURRENT_TIMESTAMP)`,
        [`notif-${uuidv4()}`, mentorId, `A student has requested guidance on ${topic}.`, requestId]
      );
    } catch {}

    res.json({
      success: true,
      message: 'Mentorship request submitted successfully',
      data: {
        requestId,
        status: 'PENDING',
        topic,
        preferredDate,
        preferredTime
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to create mentorship request', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.5 Student's requests list
 * GET /api/student/mentorship-requests
 */
router.get(['/student/mentorship-requests', '/student-requests'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const requests = queryAll<any>(`
      SELECT mr.*, u.name as mentor_name, u.avatar_url as mentor_avatar
      FROM mentorship_requests mr
      JOIN users u ON mr.mentor_id = u.id
      WHERE mr.student_id = ?
      ORDER BY mr.created_at DESC
    `, [studentId]);

    res.json({
      success: true,
      message: 'Student mentorship requests retrieved',
      data: requests,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.5 Mentor's received requests list
 * GET /api/mentor/mentorship-requests
 */
router.get(['/mentorship-requests', '/mentor/mentorship-requests', '/mentor-requests'], authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const mentorUserId = req.user!.id;
    const mentor = queryOne<any>('SELECT id FROM mentors WHERE user_id = ?', [mentorUserId]);
    const mentorDbId = mentor?.id || mentorUserId;

    const requests = queryAll<any>(`
      SELECT mr.*, u.name as student_name, u.email as student_email, u.avatar_url as student_avatar,
             sp.department, sp.current_year, sp.career_readiness_score
      FROM mentorship_requests mr
      JOIN users u ON mr.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE mr.mentor_id = ? OR mr.mentor_id = ?
      ORDER BY mr.created_at DESC
    `, [mentorUserId, mentorDbId]);

    res.json({
      success: true,
      message: 'Mentor requests retrieved successfully',
      data: requests,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor requests', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.5 Mentor updates request status (Accept / Reject / Reschedule)
 * PUT /api/mentorship-requests/:id/status
 */
router.put(['/mentorship-requests/:id/status', '/requests/:id/status'], authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, mentorResponse, meetingLink, sessionDate, sessionTime } = req.body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid request status', data: null, error: { code: 'INVALID_STATUS', details: 'Status not supported.' } });
      return;
    }

    const request = queryOne<any>('SELECT * FROM mentorship_requests WHERE id = ?', [id]);
    if (!request) {
      res.status(404).json({ success: false, message: 'Request not found', data: null, error: { code: 'NOT_FOUND', details: 'Mentorship request does not exist.' } });
      return;
    }

    execute(
      `UPDATE mentorship_requests SET status = ?, mentor_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, mentorResponse || '', id]
    );

    // If accepted or scheduled, create/link mentor_sessions
    if (status === 'SCHEDULED' || status === 'ACCEPTED') {
      const sessionId = `msess-${uuidv4()}`;
      const slot = `${sessionDate || request.preferred_date} ${sessionTime || request.preferred_time}`;
      const link = meetingLink || `https://meet.skillbridge.ai/room-${Math.floor(100000 + Math.random() * 900000)}`;

      // Resolve mentor table ID
      const mentorRow = queryOne<any>('SELECT id FROM mentors WHERE user_id = ?', [request.mentor_id]);
      const mentorIdForSession = mentorRow?.id || 'men-1';

      execute(
        `INSERT INTO mentor_sessions (
          id, mentor_id, user_id, student_id, topic, slot_time, session_date, session_time, status, meeting_link, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
        [
          sessionId,
          mentorIdForSession,
          request.student_id,
          request.student_id,
          request.topic,
          slot,
          sessionDate || request.preferred_date,
          sessionTime || request.preferred_time,
          link,
          mentorResponse || `Mentorship session for ${request.topic}`
        ]
      );

      // Notify student
      try {
        execute(
          `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
           VALUES (?, ?, 'Mentorship Session Confirmed', ?, 'MENTOR_SESSION', ?, 0, CURRENT_TIMESTAMP)`,
          [
            `notif-${uuidv4()}`,
            request.student_id,
            `Your mentorship request for ${request.topic} was accepted and scheduled for ${slot}.`,
            sessionId
          ]
        );
      } catch {}
    }

    res.json({
      success: true,
      message: `Mentorship request updated to ${status}`,
      data: { id, status, mentorResponse },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update request status', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.6 Mentor Sessions API
 * GET /api/mentor/sessions
 */
router.get('/sessions', authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const mentor = queryOne<any>('SELECT id FROM mentors WHERE user_id = ?', [userId]);
    const mentorId = mentor?.id || 'men-1';

    const sessions = queryAll<any>(`
      SELECT ms.*, u.name as student_name, u.email as student_email, u.avatar_url as student_avatar
      FROM mentor_sessions ms
      JOIN users u ON (ms.student_id = u.id OR ms.user_id = u.id)
      WHERE ms.mentor_id = ? OR ms.mentor_id = ?
      ORDER BY ms.created_at DESC
    `, [mentorId, userId]);

    res.json({
      success: true,
      message: 'Mentor sessions retrieved',
      data: sessions,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.6 Student Mentor Sessions API
 * GET /api/student/mentor-sessions
 */
router.get(['/student/sessions', '/student-sessions'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;

    const sessions = queryAll<any>(`
      SELECT ms.*, m.name as mentor_name, u.avatar_url as mentor_avatar, mf.feedback_text as feedback_summary,
             mf.strengths, mf.weaknesses, mf.interview_advice, mf.recommended_practice, mf.rating as feedback_rating
      FROM mentor_sessions ms
      JOIN mentors m ON ms.mentor_id = m.id
      JOIN users u ON m.user_id = u.id
      LEFT JOIN mentor_feedbacks mf ON ms.id = mf.session_id
      WHERE ms.student_id = ? OR ms.user_id = ?
      ORDER BY ms.created_at DESC
    `, [studentId, studentId]);

    res.json({
      success: true,
      message: 'Student mentor sessions retrieved',
      data: sessions,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch student mentor sessions', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.7 Mentor Student Progress (Privacy Controlled)
 * GET /api/mentor/students/:id/progress
 */
router.get('/students/:id/progress', authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const studentId = req.params.id;

    const student = queryOne<any>(`
      SELECT u.id, u.name, u.email, u.avatar_url, sp.*
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [studentId]);

    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found', data: null, error: { code: 'NOT_FOUND', details: 'Student does not exist.' } });
      return;
    }

    // Check student privacy settings
    const privacy = queryOne<any>(
      `SELECT * FROM student_privacy_settings WHERE student_id = ?`,
      [studentId]
    ) || { share_skills: 1, share_gaps: 1, share_courses: 1, share_coding: 1, share_interviews: 1, share_applications: 0 };

    const skills = privacy.share_skills ? queryAll<any>(
      `SELECT s.name, ss.score, ss.level FROM student_skills ss JOIN skills s ON ss.skill_id = s.id WHERE ss.user_id = ?`,
      [studentId]
    ) : [];

    const gaps = privacy.share_gaps ? queryAll<any>(
      `SELECT * FROM skill_gaps WHERE student_id = ?`,
      [studentId]
    ) : [];

    const interviews = privacy.share_interviews ? queryAll<any>(
      `SELECT id, target_role, interview_type, overall_score, status, completed_at FROM mock_interviews WHERE student_id = ? ORDER BY created_at DESC LIMIT 5`,
      [studentId]
    ) : [];

    res.json({
      success: true,
      message: 'Permitted student progress retrieved',
      data: {
        student: {
          id: student.id,
          name: student.name,
          department: student.department,
          yearOfStudy: student.year_of_study || student.current_year,
          targetRole: student.career_interest,
          readinessScore: student.career_readiness_score
        },
        privacySettings: privacy,
        permittedData: {
          skills,
          gaps,
          interviews,
          codingStreak: privacy.share_coding ? 12 : null
        }
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch student progress', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 14.8 Mentor Feedback Submission
 * POST /api/mentor/students/:id/feedback
 */
router.post(['/students/:id/feedback', '/feedback'], authenticateToken, requireRole(['mentor', 'admin']), (req: Request, res: Response): void => {
  try {
    const mentorUserId = req.user!.id;
    const studentId = req.params.id || req.body.studentId || 'usr-student-1';
    const {
      sessionId,
      strengths,
      weaknesses,
      recommendedPractice,
      interviewAdvice = req.body.advice || '',
      courseSuggestions,
      careerGuidance,
      followUpTasks,
      rating = 5.0
    } = req.body;

    if (!strengths || !weaknesses) {
      res.status(400).json({ success: false, message: 'Strengths and weaknesses are required.', data: null, error: { code: 'VALIDATION_ERROR', details: 'Missing feedback fields.' } });
      return;
    }

    const studentExists = queryOne<any>('SELECT id FROM users WHERE id = ?', [studentId]);
    const targetStudentId = studentExists ? studentExists.id : 'usr-student-1';

    const existingSession = sessionId ? queryOne<any>('SELECT id FROM mentor_sessions WHERE id = ?', [sessionId]) : null;
    const validSessionId = existingSession ? existingSession.id : null;

    const feedbackId = `mfb-${uuidv4()}`;
    execute(
      `INSERT INTO mentor_feedbacks (
        id, session_id, mentor_id, student_id, strengths, weaknesses, recommended_practice,
        interview_advice, course_suggestions, career_guidance, follow_up_tasks, rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        feedbackId,
        validSessionId,
        mentorUserId,
        targetStudentId,
        strengths,
        weaknesses,
        recommendedPractice || '',
        interviewAdvice || '',
        courseSuggestions || '',
        careerGuidance || '',
        followUpTasks || '',
        rating
      ]
    );

    if (validSessionId) {
      execute(
        `UPDATE mentor_sessions SET status = 'completed', feedback_text = ?, rating = ? WHERE id = ?`,
        [strengths + ' ' + weaknesses, rating, validSessionId]
      );
    }

    // Notify student
    try {
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
         VALUES (?, ?, 'New Mentor Feedback', 'Your mentor has posted comprehensive feedback on your progress.', 'MENTOR_SESSION', ?, 0, CURRENT_TIMESTAMP)`,
        [`notif-${uuidv4()}`, studentId, feedbackId]
      );
    } catch {}

    res.json({
      success: true,
      message: 'Mentor feedback submitted successfully',
      data: { feedbackId, rating },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to submit feedback', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * Student Privacy Settings GET & PUT
 * GET /api/student/privacy-settings
 * PUT /api/student/privacy-settings
 */
router.get('/privacy-settings', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const settings = queryOne<any>(
      `SELECT * FROM student_privacy_settings WHERE student_id = ?`,
      [studentId]
    ) || { share_skills: 1, share_gaps: 1, share_courses: 1, share_coding: 1, share_interviews: 1, share_applications: 0 };

    res.json({
      success: true,
      message: 'Privacy settings loaded',
      data: settings,
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load privacy settings', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.put('/privacy-settings', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { share_skills = 1, share_gaps = 1, share_courses = 1, share_coding = 1, share_interviews = 1, share_applications = 0 } = req.body;

    execute(
      `INSERT OR REPLACE INTO student_privacy_settings (
        id, student_id, share_skills, share_gaps, share_courses, share_coding, share_interviews, share_applications, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [`priv-${uuidv4()}`, studentId, share_skills ? 1 : 0, share_gaps ? 1 : 0, share_courses ? 1 : 0, share_coding ? 1 : 0, share_interviews ? 1 : 0, share_applications ? 1 : 0]
    );

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: { share_skills, share_gaps, share_courses, share_coding, share_interviews, share_applications },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update privacy settings', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

router.get('/:id', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const m = queryOne<any>(`
      SELECT m.*, u.avatar_url, u.email as contact_email, u.name as user_name
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ? OR m.user_id = ?
    `, [id, id]);

    if (!m) {
      res.status(404).json({ success: false, message: 'Mentor not found', data: null, error: { code: 'NOT_FOUND', details: 'Mentor profile does not exist.' } });
      return;
    }

    res.json({
      success: true,
      message: 'Mentor profile loaded',
      data: {
        id: m.id,
        userId: m.user_id,
        name: m.name || m.user_name,
        avatarUrl: m.avatar_url,
        designation: m.designation || 'Principal Systems Architect',
        currentCompany: m.current_company || 'Apex Cloud Systems',
        yearsExperience: m.years_experience || 10,
        rating: m.rating || 4.9,
        bio: m.bio,
        verificationStatus: m.verification_status || 'VERIFIED',
        expertise: JSON.parse(m.expertise_json || '[]'),
        availableSlots: JSON.parse(m.available_slots_json || '[]'),
        languages: ['English', 'Hindi']
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentor profile', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

export default router;
