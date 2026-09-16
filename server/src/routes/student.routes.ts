import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { computeSkillGaps } from '../services/ai/skillGapEngine.js';
import { generateStudentReport } from '../services/ai/reportGenerator.js';
import { getSkillLevel, generateSkillReportForUser } from '../services/ai/aiReportService.js';
import { getStoredRecommendationsForStudent } from '../services/ai/courseRecommendationEngine.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Student Dashboard Summary
router.get('/dashboard', authenticateToken, requireRole(['student', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const user = queryOne('SELECT id, name, email, avatar_url FROM users WHERE id = ?', [userId]);
    const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);

    const attemptCount = queryOne('SELECT COUNT(*) as count FROM assessment_attempts WHERE user_id = ? AND status = \'completed\'', [userId])?.count || 0;
    const hasCompletedAssessment = attemptCount > 0;

    // Student Skills
    const skills = queryAll(`
      SELECT s.id, s.name, s.category, ss.current_level, ss.verified_score, ss.last_assessed_at
      FROM student_skills ss
      JOIN skills s ON ss.skill_id = s.id
      WHERE ss.user_id = ?
      ORDER BY ss.verified_score DESC
    `, [userId]);

    // Skill map & Gap Analysis
    let gapAnalysis = null;
    let careerReadinessScore = 0;

    if (hasCompletedAssessment && skills.length > 0) {
      const skillMap: Record<string, number> = {};
      for (const s of skills) {
        skillMap[s.name] = s.verified_score;
      }
      const targetRoleId = profile?.target_role_id || 'role-software-dev';
      gapAnalysis = computeSkillGaps(skillMap, targetRoleId);
      careerReadinessScore = profile?.career_readiness_score || gapAnalysis.readinessScore || 0;
    }

    // Continue Learning: find most recent incomplete lesson from enrolled courses
    const recentProgress = queryOne(`
      SELECT lp.*, l.title as lesson_title, l.module_id, m.course_id, c.title as course_title, c.thumbnail, c.difficulty as course_difficulty
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE lp.user_id = ? AND lp.is_completed = 0
      ORDER BY lp.last_accessed_at DESC LIMIT 1
    `, [userId]);

    const continueLearning = recentProgress || null;

    // Coding Streak
    const streak = queryOne('SELECT * FROM coding_streaks WHERE user_id = ?', [userId]);
    const codingStreak = streak ? {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      badges: JSON.parse(streak.badges_json || '[]'),
      calendar: JSON.parse(streak.streak_calendar_json || '[]')
    } : {
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      calendar: []
    };

    // Stored personalized recommendations
    const recommendations = getStoredRecommendationsForStudent(userId);

    // Recommended Opportunities
    const topInternships = queryAll(`
      SELECT i.*, c.name as company_name, c.logo_url
      FROM internships i
      JOIN companies c ON i.company_id = c.id
      LIMIT 2
    `);

    // Notifications count
    const unreadNotifs = queryOne(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `, [userId]);

    res.json({
      user,
      profile: {
        ...profile,
        programmingLanguages: JSON.parse(profile?.programming_languages_json || '[]'),
        communicationLanguages: JSON.parse(profile?.communication_languages_json || '[]')
      },
      hasCompletedAssessment,
      careerReadinessScore,
      skills,
      gapAnalysis,
      continueLearning,
      codingStreak,
      recommendations,
      recommendedOpportunities: topInternships,
      unreadNotificationsCount: unreadNotifs?.count || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load dashboard data.' });
  }
});

// Dynamic Career Roadmap Engine
router.get('/roadmap', authenticateToken, requireRole(['student', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    const attemptCount = queryOne('SELECT COUNT(*) as count FROM assessment_attempts WHERE user_id = ? AND status = \'completed\'', [userId])?.count || 0;
    const completedLessons = queryOne('SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = ? AND is_completed = 1', [userId])?.count || 0;
    const passedTests = queryOne('SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = ? AND test_passed = 1', [userId])?.count || 0;
    const submissions = queryOne('SELECT COUNT(*) as count FROM coding_submissions WHERE user_id = ?', [userId])?.count || 0;
    const applications = queryOne('SELECT COUNT(*) as count FROM applications WHERE user_id = ?', [userId])?.count || 0;
    const interviews = queryOne('SELECT COUNT(*) as count FROM mock_interview_sessions WHERE user_id = ?', [userId])?.count || 0;

    const readinessScore = profile?.career_readiness_score || 0;

    const roadmapSteps = [
      {
        id: 'step-assess',
        title: 'ASSESS',
        description: 'Comprehensive initial AI skill baseline evaluation across Tech, Coding & Languages.',
        status: attemptCount > 0 ? 'completed' : 'in_progress',
        actionLabel: attemptCount > 0 ? 'View Skill Report' : 'Start Assessment',
        route: attemptCount > 0 ? '/assessment/report' : '/assessment'
      },
      {
        id: 'step-gap',
        title: 'UNDERSTAND SKILL GAP',
        description: 'AI maps your verified skill matrix against target industry benchmarks.',
        status: attemptCount > 0 ? 'completed' : 'upcoming',
        actionLabel: 'Explore Gaps',
        route: '/skill-gaps'
      },
      {
        id: 'step-learn',
        title: 'LEARN',
        description: 'Structured course curriculum targeting your critical and improvement skill gaps.',
        status: completedLessons > 0 ? 'in_progress' : 'upcoming',
        actionLabel: 'Continue Learning',
        route: '/learning'
      },
      {
        id: 'step-practice',
        title: 'PRACTICE',
        description: 'Interactive coding challenges, sandbox testing, and daily streak maintenance.',
        status: submissions > 0 ? 'in_progress' : 'upcoming',
        actionLabel: 'Enter Coding Arena',
        route: '/coding'
      },
      {
        id: 'step-test',
        title: 'TEST',
        description: 'Safe proctored lesson tests and verified integrity exams.',
        status: passedTests > 0 ? 'completed' : 'upcoming',
        actionLabel: 'Take Tests',
        route: '/learning'
      },
      {
        id: 'step-improve',
        title: 'IMPROVE',
        description: 'Multilingual conversational AI practice in English, Japanese, and German.',
        status: 'in_progress',
        actionLabel: 'Language Hub',
        route: '/languages'
      },
      {
        id: 'step-internship',
        title: 'INTERNSHIP',
        description: 'Industry verified internship positions matching verified skill profile.',
        status: applications > 0 ? 'completed' : 'in_progress',
        actionLabel: 'View Internships',
        route: '/internships'
      },
      {
        id: 'step-interview',
        title: 'MOCK INTERVIEW',
        description: 'Simulate HR, Technical, and live expert mentor interview sessions.',
        status: interviews > 0 ? 'completed' : 'in_progress',
        actionLabel: 'Practice Interview',
        route: '/interviews'
      },
      {
        id: 'step-job',
        title: 'JOB',
        description: 'Full-time graduate placement roles and enterprise hiring drives.',
        status: readinessScore >= 75 ? 'in_progress' : 'upcoming',
        actionLabel: 'Explore Jobs',
        route: '/jobs'
      },
      {
        id: 'step-placement',
        title: 'PLACEMENT',
        description: 'Verified readiness dossier and enterprise recruitment pipeline.',
        status: readinessScore >= 75 ? 'in_progress' : 'upcoming',
        actionLabel: 'Placement Readiness',
        route: '/readiness'
      }
    ];

    res.json({
      readinessScore,
      steps: roadmapSteps
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load roadmap.' });
  }
});

// Full Student Report Generation
router.get('/report', authenticateToken, requireRole(['student', 'college', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const reportData = generateStudentReport(userId);
    res.json(reportData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate report.' });
  }
});

// ==========================================
// STEP 5: AI SKILL REPORT & SKILL GAP ROUTES
// ==========================================

// 1. Generate / Regenerate AI Skill Report
router.post('/skill-report/generate', authenticateToken, requireRole(['student', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const assessmentId = req.body?.assessmentId;
    const reportData = await generateSkillReportForUser(userId, assessmentId);
    res.json({
      message: 'AI Skill Report & Gap Analysis generated successfully.',
      report: reportData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate AI skill report.' });
  }
});

// 2. Retrieve Latest AI Skill Report (or specific version)
router.get('/skill-report', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const requestUser = req.user!;
    const targetUserId = (req.query.userId as string) || requestUser.id;

    // Role-based authorization & privacy checks
    if (targetUserId !== requestUser.id && requestUser.role !== 'admin' && requestUser.role !== 'college') {
      res.status(403).json({ error: 'Access denied. You may only view your own verified skill report.' });
      return;
    }

    const versionQuery = req.query.version ? Number(req.query.version) : null;
    let reportRow = versionQuery
      ? queryOne('SELECT * FROM skill_reports WHERE user_id = ? AND version = ?', [targetUserId, versionQuery])
      : queryOne('SELECT * FROM skill_reports WHERE user_id = ? ORDER BY COALESCE(version, 1) DESC, generated_at DESC LIMIT 1', [targetUserId]);

    // If report does not exist yet for this student, return null
    if (!reportRow) {
      res.json(null);
      return;
    }

    // Check visibility if college or non-owner
    if (targetUserId !== requestUser.id && requestUser.role === 'college' && reportRow.visibility === 'private') {
      res.status(403).json({ error: 'This candidate report is currently set to private.' });
      return;
    }

    // Retrieve skills with evidence items
    const items = queryAll(`
      SELECT sri.*, s.name as skill_name, s.category as skill_category
      FROM skill_report_items sri
      JOIN skills s ON sri.skill_id = s.id
      WHERE sri.report_id = ?
    `, [reportRow.id]);

    const formattedSkills = items.map(it => ({
      skillId: it.skill_id,
      skillName: it.skill_name,
      category: it.skill_category,
      score: it.score,
      level: it.level,
      levelNumber: getSkillLevel(it.score).levelNumber,
      confidence: it.confidence,
      evidence: JSON.parse(it.evidence_json || '[]'),
      improvementStatus: it.score >= 70 ? 'Proficient' : it.score < 60 ? 'Needs Practice' : 'Developing',
      priority: it.priority
    }));

    // Retrieve skill gaps
    const gaps = queryAll(`
      SELECT sg.*, s.name as skill_name, tr.title as role_title
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      JOIN target_roles tr ON sg.target_role_id = tr.id
      WHERE sg.user_id = ?
      ORDER BY sg.priority_order ASC
    `, [targetUserId]);

    // Retrieve career alignment JSON
    let careerAlignment = {};
    try { careerAlignment = JSON.parse(reportRow.career_alignment_json || '{}'); } catch(e) {}

    // Retrieve history progression
    const historyRows = queryAll(`
      SELECT ssh.*, s.name as skill_name
      FROM student_skill_history ssh
      JOIN skills s ON ssh.skill_id = s.id
      WHERE ssh.user_id = ?
      ORDER BY ssh.created_at ASC
    `, [targetUserId]);

    const skillGrowthMap: Record<string, any> = {};
    for (const h of historyRows) {
      if (!skillGrowthMap[h.skill_name]) {
        skillGrowthMap[h.skill_name] = {
          skillName: h.skill_name,
          initialScore: h.score,
          initialLevel: h.level,
          currentScore: h.score,
          currentLevel: h.level,
          targetLevel: 'Proficient'
        };
      } else {
        skillGrowthMap[h.skill_name].currentScore = h.score;
        skillGrowthMap[h.skill_name].currentLevel = h.level;
      }
    }

    res.json({
      reportId: reportRow.id,
      version: reportRow.version || 1,
      overallScore: reportRow.overall_score,
      overallLevel: reportRow.overall_level || 'Developing',
      summary: reportRow.summary,
      categoryScores: JSON.parse(reportRow.category_scores_json || '{}'),
      skills: formattedSkills.length > 0 ? formattedSkills : JSON.parse(reportRow.skill_breakdown_json || '[]'),
      strengths: JSON.parse(reportRow.strengths_json || '[]'),
      areasToImprove: JSON.parse(reportRow.weaknesses_json || '[]'),
      skillGaps: gaps.map(g => ({
        skillName: g.skill_name,
        currentScore: g.current_level,
        currentLevelNumber: getSkillLevel(g.current_level).levelNumber,
        requiredScore: g.required_level,
        requiredLevelNumber: getSkillLevel(g.required_level).levelNumber,
        gapSize: g.gap_status === 'critical' ? 'Critical' : g.gap_percentage > 15 ? 'High' : g.gap_percentage > 5 ? 'Medium' : 'Low',
        priority: g.gap_status === 'critical' ? 'Critical' : 'High',
        isMandatory: true,
        recommendation: `Target benchmark is ${g.required_level}%. Focus on hands-on practice.`
      })),
      careerAlignment,
      priorityImprovements: (() => {
        let list = [];
        try { list = JSON.parse(reportRow.priority_improvements_json || '[]'); } catch(e) {}
        if (Array.isArray(list) && list.length > 0) return list;
        let pSkills = [];
        try { pSkills = JSON.parse(reportRow.priority_skills_json || '[]'); } catch(e) {}
        if (Array.isArray(pSkills) && pSkills.length > 0) {
          return pSkills.map((s: string, idx: number) => ({
            rank: idx + 1,
            skillName: s,
            currentLevel: 'Developing',
            targetLevel: 'Proficient',
            priority: idx === 0 ? 'Critical' : 'High',
            actionPlan: `Master core interview patterns and real-world architectures in ${s}.`
          }));
        }
        return [
          { rank: 1, skillName: 'Data Structures & Algorithms', currentLevel: 'Developing', targetLevel: 'Proficient', priority: 'High', actionPlan: 'Advance problem solving patterns.' },
          { rank: 2, skillName: 'Web & API Architecture', currentLevel: 'Developing', targetLevel: 'Proficient', priority: 'Medium', actionPlan: 'Master distributed systems design.' }
        ];
      })(),
      skillGrowthHistory: Object.values(skillGrowthMap).slice(0, 5),
      generatedAt: reportRow.generated_at,
      visibility: reportRow.visibility || 'private'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve skill report.' });
  }
});

// 3. Retrieve Individual Skills Breakdown with Evidence
router.get('/skill-report/skills', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const latestReport = queryOne('SELECT id FROM skill_reports WHERE user_id = ? ORDER BY version DESC LIMIT 1', [userId]);
    if (!latestReport) {
      res.json({ skills: [] });
      return;
    }
    const items = queryAll(`
      SELECT sri.*, s.name as skill_name, s.category as skill_category
      FROM skill_report_items sri
      JOIN skills s ON sri.skill_id = s.id
      WHERE sri.report_id = ?
    `, [latestReport.id]);

    res.json({
      skills: items.map(it => ({
        skillId: it.skill_id,
        skillName: it.skill_name,
        category: it.skill_category,
        score: it.score,
        level: it.level,
        confidence: it.confidence,
        evidence: JSON.parse(it.evidence_json || '[]'),
        priority: it.priority
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch report skills.' });
  }
});

// 4. Retrieve Skill Gaps Matrix
router.get('/skill-report/gaps', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const gaps = queryAll(`
      SELECT sg.*, s.name as skill_name, tr.title as role_title
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      JOIN target_roles tr ON sg.target_role_id = tr.id
      WHERE sg.user_id = ?
      ORDER BY sg.priority_order ASC
    `, [userId]);

    res.json({ gaps });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch skill gaps.' });
  }
});

// 5. Retrieve Career Alignment & Alternative Suggestions
router.get('/skill-report/career-alignment', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const report = queryOne('SELECT career_alignment_json FROM skill_reports WHERE user_id = ? ORDER BY version DESC LIMIT 1', [userId]);
    const alignment = report ? JSON.parse(report.career_alignment_json || '{}') : {};
    res.json({ careerAlignment: alignment });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch career alignment.' });
  }
});

// 6. Retrieve Historical Skill Progression
router.get('/skill-history', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const history = queryAll(`
      SELECT ssh.*, s.name as skill_name, s.category as skill_category
      FROM student_skill_history ssh
      JOIN skills s ON ssh.skill_id = s.id
      WHERE ssh.user_id = ?
      ORDER BY ssh.created_at ASC
    `, [userId]);

    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch skill history.' });
  }
});

// 7. Update Report Privacy / Visibility
router.patch('/skill-report/privacy', authenticateToken, requireRole(['student', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { visibility } = req.body;
    const allowed = ['private', 'college_visible', 'mentor_visible', 'recruiter_visible'];
    if (!allowed.includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility level.' });
      return;
    }
    execute(`
      UPDATE skill_reports SET visibility = ? WHERE user_id = ?
    `, [visibility, userId]);

    res.json({ success: true, visibility, message: `Report visibility updated to "${visibility}".` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update privacy settings.' });
  }
});

// 8. Downloadable PDF / Printable Dossier
router.get('/skill-report/pdf', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const user = queryOne('SELECT name, email FROM users WHERE id = ?', [userId]);
    const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    const report = queryOne('SELECT * FROM skill_reports WHERE user_id = ? ORDER BY version DESC LIMIT 1', [userId]);

    if (!report) {
      res.status(404).json({ error: 'No skill report available to export.' });
      return;
    }

    const catScores = JSON.parse(report.category_scores_json || '{}');
    const strengths = JSON.parse(report.strengths_json || '[]');
    const areas = JSON.parse(report.weaknesses_json || '[]');
    const alignment = JSON.parse(report.career_alignment_json || '{}');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SkillBridge AI — Skill Report Dossier</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
          .header { border-bottom: 3px solid #7c3aed; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { font-size: 24px; font-weight: 800; color: #7c3aed; }
          .tagline { font-size: 13px; color: #64748b; }
          .badge { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
          .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
          .metric-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .metric-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .section { margin-top: 32px; }
          .section-title { font-size: 16px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; color: #0f172a; }
          .card { background: #f8fafc; border-left: 4px solid #7c3aed; padding: 12px 16px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
          .card-title { font-weight: 700; font-size: 14px; }
          .card-desc { font-size: 13px; color: #475569; margin-top: 4px; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">SkillBridge AI</div>
            <div class="tagline">Official Diagnostic Skill Report & Gap Analysis — Version ${report.version || 1}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 14px;">${user?.name || 'Student Candidate'}</div>
            <div style="font-size: 12px; color: #64748b;">${profile?.college_name || 'Institution of Technology'}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Generated: ${new Date(report.generated_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div class="grid">
          <div class="metric">
            <div class="metric-lbl">Overall Readiness</div>
            <div class="metric-val" style="color: #7c3aed;">${report.overall_score} / 100</div>
            <span class="badge" style="background: #ede9fe; color: #6d28d9; margin-top: 6px; display: inline-block;">${report.overall_level}</span>
          </div>
          <div class="metric">
            <div class="metric-lbl">Technical Skills</div>
            <div class="metric-val">${catScores.technical || 65}%</div>
          </div>
          <div class="metric">
            <div class="metric-lbl">Coding Skills</div>
            <div class="metric-val">${catScores.coding || 60}%</div>
          </div>
          <div class="metric">
            <div class="metric-lbl">Communication</div>
            <div class="metric-val">${catScores.communication || 70}%</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Diagnostic Position Summary</div>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">${report.summary}</p>
        </div>

        <div class="section">
          <div class="section-title">Verified Strengths 💪</div>
          ${strengths.slice(0, 3).map((s: any) => `
            <div class="card" style="border-left-color: #10b981;">
              <div class="card-title">${s.title} (${s.skillName})</div>
              <div class="card-desc">${s.description}</div>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Priority Areas to Improve 🎯</div>
          ${areas.slice(0, 3).map((a: any) => `
            <div class="card" style="border-left-color: #f59e0b;">
              <div class="card-title">${a.title} (${a.skillName})</div>
              <div class="card-desc">${a.description}</div>
              <div style="font-size: 12px; font-weight: 600; color: #d97706; margin-top: 4px;">Recommended: ${a.recommendedAction}</div>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Target Career Alignment</div>
          <p style="font-size: 13px; color: #475569;">
            Target Role: <strong>${profile?.career_interest || 'Software Developer'}</strong> (${alignment.alignmentPercentage || 60}% Alignment).
          </p>
        </div>

        <div class="footer">
          SkillBridge AI &bull; From Beginner to Placement Ready &bull; Confidential Candidate Report &bull; https://skillbridge.ai
        </div>

        <script>
          if (window.location.search.includes('print=true')) {
            window.onload = function() { window.print(); };
          }
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export PDF.' });
  }
});

// ==========================================
// RECOMMENDATIONS & PROGRESS APIS
// ==========================================

// Get Personalized Recommendations for Logged-In Student
router.get('/recommendations', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const recommendations = getStoredRecommendationsForStudent(userId);
    res.json({
      recommendations,
      count: recommendations.length,
      hasRecommendations: recommendations.length > 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recommendations.' });
  }
});

// Start a Recommended Course
router.post('/recommendations/:id/start', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const recId = req.params.id;

    const rec = queryOne('SELECT * FROM recommendations WHERE (id = ? OR course_id = ?) AND user_id = ?', [recId, recId, userId]);
    if (!rec) {
      res.status(404).json({ error: 'Recommendation not found.' });
      return;
    }

    const courseId = rec.course_id;

    // Check or create enrollment
    let enrollment = queryOne('SELECT * FROM course_enrollments WHERE (user_id = ? OR student_id = ?) AND course_id = ?', [userId, userId, courseId]);
    if (!enrollment) {
      const enrId = `enr-${uuidv4()}`;
      execute(`
        INSERT INTO course_enrollments (id, user_id, student_id, course_id, status, progress_percentage, started_at, last_accessed_at)
        VALUES (?, ?, ?, ?, 'in_progress', 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [enrId, userId, userId, courseId]);
      enrollment = queryOne('SELECT * FROM course_enrollments WHERE id = ?', [enrId]);
    } else if (enrollment.status === 'recommended') {
      execute(`
        UPDATE course_enrollments SET status = 'in_progress', last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [enrollment.id]);
    }

    // Update recommendation status
    execute('UPDATE recommendations SET status = \'started\', updated_at = CURRENT_TIMESTAMP WHERE id = ?', [rec.id]);

    // Find first lesson for this course
    const firstLesson = queryOne(`
      SELECT l.id, l.title, m.id as module_id
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = ?
      ORDER BY m.order_index ASC, l.order_index ASC
      LIMIT 1
    `, [courseId]);

    res.json({
      success: true,
      message: `Course "${rec.course_title}" started successfully!`,
      courseId,
      courseTitle: rec.course_title,
      firstLessonId: firstLesson?.id || null,
      enrollment
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start course.' });
  }
});

// ==========================================
// SECURE USER HISTORY DELETION
// ==========================================
router.delete('/history', authenticateToken, requireRole(['student', 'admin']), (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;

    const safeExec = (sql: string, params: any[]) => {
      try {
        execute(sql, params);
      } catch (err: any) {
        // Table might not exist or be unused
      }
    };

    // Delete user-specific attempts, recommendations, and reports
    safeExec('DELETE FROM recommendations WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM answers WHERE attempt_id IN (SELECT id FROM assessment_attempts WHERE user_id = ?)', [userId]);
    safeExec('DELETE FROM proctoring_logs WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM assessment_attempts WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM skill_report_items WHERE report_id IN (SELECT id FROM skill_reports WHERE user_id = ?)', [userId]);
    safeExec('DELETE FROM skill_reports WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM student_skills WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM student_skill_history WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM skill_gaps WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM course_enrollments WHERE user_id = ? OR student_id = ?', [userId, userId]);
    safeExec('DELETE FROM lesson_progress WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM learning_activities WHERE user_id = ? OR student_id = ?', [userId, userId]);
    safeExec('DELETE FROM test_attempts WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM coding_submissions WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM coding_streaks WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM conversation_turns WHERE session_id IN (SELECT id FROM conversations WHERE user_id = ?)', [userId]);
    safeExec('DELETE FROM conversations WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM writing_submissions WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM applications WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM saved_opportunities WHERE user_id = ?', [userId]);
    safeExec('DELETE FROM notifications WHERE user_id = ?', [userId]);

    // Reset readiness score, college name, and level in student_profiles
    execute(`
      UPDATE student_profiles 
      SET career_readiness_score = 0, current_level = 'Beginner', college_name = '', department = '', education_details = '', updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `, [userId]);


    console.log(`[History] Deleted all history records for user: ${userId}`);

    res.json({
      success: true,
      message: 'Your personal assessment, learning, and skill history has been securely cleared.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete personal history.' });
  }
});

export default router;

