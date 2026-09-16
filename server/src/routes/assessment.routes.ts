import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { generateAdaptiveAssessment } from '../services/ai/assessmentGenerator.js';
import { evaluateAssessmentSubmission } from '../services/ai/aiReportService.js';
import { detectSEB, generateSEBConfig } from '../services/proctoring/sebService.js';

const router = Router();

// Get assessment question bank / sample adaptive questions
router.get('/questions', authenticateToken, (req: Request, res: Response): void => {
  try {
    const targetRole = (req.query.targetRole as string) || 'Software Developer';
    const questions = queryAll(
      `SELECT q.id, q.question_text, q.question_type, q.options_json, q.difficulty, q.points, s.name as skill_name
       FROM questions q
       LEFT JOIN skills s ON q.skill_id = s.id
       LIMIT 10`
    );

    res.json({
      success: true,
      targetRole,
      count: questions.length,
      questions: questions.map(q => {
        let opts = [];
        try { opts = JSON.parse(q.options_json); } catch {}
        return {
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: opts,
          difficulty: q.difficulty,
          points: q.points,
          skillName: q.skill_name || 'Software Fundamentals'
        };
      })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch questions' });
  }
});

// Start AI Initial or Adaptive Assessment
router.post('/start', authenticateToken, requireRole(['student', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);

    const targetRole = req.body.targetRole || profile?.career_interest || 'Software Developer';
    const currentLevel = req.body.currentLevel || profile?.current_level || 'Beginner';
    const department = req.body.department || profile?.department || 'Computer Science & Engineering';

    let programmingLanguages: string[] = [];
    try {
      programmingLanguages = JSON.parse(profile?.programming_languages_json || '[]');
    } catch {}

    const genResult = await generateAdaptiveAssessment({
      targetRole,
      currentLevel,
      department,
      programmingLanguages
    });

    if (!genResult.success || !genResult.questions) {
      res.status(503).json({
        error: genResult.error || 'AI Assessment Service is unavailable. Please verify GEMINI_API_KEY and retry.',
        canRetry: true
      });
      return;
    }

    const questions = genResult.questions;
    const assessmentId = `asmt-${uuidv4()}`;

    execute(
      `INSERT INTO assessments (id, title, type, target_role_id, duration_minutes, passing_score)
       VALUES (?, ?, 'initial', ?, 30, 60.0)`,
      [assessmentId, `SkillBridge AI Assessment - ${targetRole}`, profile?.target_role_id || 'role-software-dev']
    );

    const skillList = queryAll('SELECT id, name FROM skills');
    const skillLookup: Record<string, string> = {};
    for (const s of skillList) skillLookup[s.name.toLowerCase()] = s.id;

    // Save questions to database
    for (const q of questions) {
      const skillId = (q.skillName && skillLookup[q.skillName.toLowerCase()]) || null;
      execute(
        `INSERT INTO questions (id, assessment_id, skill_id, question_text, question_type, options_json, correct_answer_json, explanation, difficulty, points)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id,
          assessmentId,
          skillId,
          q.questionText,
          q.questionType,
          JSON.stringify(q.options || []),
          JSON.stringify(q.correctAnswer),
          q.explanation || q.rubric || '',
          q.difficulty,
          q.points
        ]
      );
    }

    // Create attempt
    const attemptId = `atm-${uuidv4()}`;
    execute(
      `INSERT INTO assessment_attempts (id, assessment_id, user_id, status, total_score)
       VALUES (?, ?, ?, 'in_progress', ?)`,
      [attemptId, assessmentId, userId, questions.length * 10]
    );

    // Return sanitized questions (without correct answers)
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      starterCode: q.starterCode,
      codeLanguage: q.codeLanguage,
      skillName: q.skillName,
      category: q.category,
      difficulty: q.difficulty,
      points: q.points
    }));

    res.json({
      assessmentId,
      attemptId,
      title: `SkillBridge AI Assessment - ${targetRole}`,
      durationMinutes: 30,
      totalQuestions: sanitizedQuestions.length,
      questions: sanitizedQuestions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize assessment.' });
  }
});

// Submit Assessment & AI Evaluation
router.post('/submit', authenticateToken, requireRole(['student', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { attemptId, answers } = req.body; // answers: Record<questionId, string>

    if (!attemptId || !answers) {
      res.status(400).json({ error: 'Attempt ID and candidate answers are required.' });
      return;
    }

    const evalResult = await evaluateAssessmentSubmission(userId, attemptId, answers);

    if (!evalResult.success) {
      res.status(503).json({
        error: evalResult.error || 'AI Evaluation failed. Please ensure GEMINI_API_KEY is configured and retry.',
        canRetry: true
      });
      return;
    }

    res.json({
      message: 'Assessment evaluated and skill matrix updated successfully!',
      attemptId: evalResult.attemptId,
      reportId: evalResult.reportId,
      overallScore: evalResult.overallScore,
      overallLevel: evalResult.overallLevel,
      passed: (evalResult.overallScore || 0) >= 60,
      categoryScores: evalResult.categoryScores,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses,
      priorityImprovements: evalResult.priorityImprovements,
      recommendations: evalResult.recommendations,
      gaps: evalResult.gaps
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit assessment.' });
  }
});

// Get Latest Skill Report
router.get('/report', authenticateToken, requireRole(['student', 'admin', 'college']), (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;
    const report = queryOne('SELECT * FROM skill_reports WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1', [userId]);

    if (!report) {
      res.json({
        report: null,
        message: 'You have not completed an assessment yet. Complete your first AI assessment to receive recommendations.'
      });
      return;
    }

    res.json({
      report: {
        id: report.id,
        overallScore: report.overall_score,
        overallLevel: report.overall_level || 'Developing',
        summary: report.summary,
        categoryScores: JSON.parse(report.category_scores_json || '{}'),
        skillBreakdown: JSON.parse(report.skill_breakdown_json || '{}'),
        strengths: JSON.parse(report.strengths_json || '[]'),
        weaknesses: JSON.parse(report.weaknesses_json || '[]'),
        prioritySkills: JSON.parse(report.priority_skills_json || '[]'),
        recommendedNextSteps: JSON.parse(report.recommended_next_steps_json || '[]'),
        careerAlignment: JSON.parse(report.career_alignment_json || '{}'),
        generatedAt: report.generated_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch skill report.' });
  }
});

// Get Assessment History for Logged-In User
router.get('/history', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const attempts = queryAll(`
      SELECT aa.*, a.title as assessment_title, a.type as assessment_type
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.user_id = ?
      ORDER BY aa.started_at DESC
    `, [userId]);

    res.json({
      count: attempts.length,
      attempts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assessment history.' });
  }
});

// Proctoring Activity Log (Camera / Safe Exam integrity)
router.post('/proctor-log', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { attemptId, violationType, details, severity } = req.body;

    const logId = `plog-${uuidv4()}`;
    execute(
      `INSERT INTO proctoring_logs (id, attempt_id, user_id, violation_type, details, severity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, attemptId || 'global', userId, violationType || 'window_blur', details || '', severity || 'medium']
    );

    // Update violation counter on attempt if applicable
    if (attemptId) {
      execute(
        `UPDATE assessment_attempts 
         SET proctoring_violations_count = proctoring_violations_count + 1 
         WHERE id = ?`,
        [attemptId]
      );

      const attempt = queryOne('SELECT proctoring_violations_count FROM assessment_attempts WHERE id = ?', [attemptId]);
      const count = attempt?.proctoring_violations_count || 1;

      // Threshold: 5 violations triggers lock
      const shouldBlock = count >= 5;

      res.json({
        success: true,
        violationCount: count,
        warning: `Integrity signal recorded: ${violationType}. Total violations: ${count}/5.`,
        shouldBlock
      });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record proctoring log.' });
  }
});

// Safe Exam Browser (SEB) Client Status Verification
router.get('/seb-status', (req: Request, res: Response): void => {

  try {
    const status = detectSEB(req);
    res.json({
      success: true,
      isSEB: status.isSEB,
      version: status.version,
      hasRequestHash: status.hasRequestHash,
      hasConfigKeyHash: status.hasConfigKeyHash,
      userAgent: status.userAgent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to detect SEB status.' });
  }
});

// Download Safe Exam Browser (.seb) Configuration File
router.get('/seb-config', (req: Request, res: Response): void => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const startUrl = `${clientUrl}/?mode=seb&exam=initial`;
    const quitUrl = `${clientUrl}/`;
    const configXml = generateSEBConfig({
      startUrl,
      quitUrl,
      examTitle: 'SkillBridge AI - Proctored Adaptive Assessment'
    });

    res.setHeader('Content-Type', 'application/seb');
    res.setHeader('Content-Disposition', 'attachment; filename="SkillBridge-Assessment.seb"');
    res.send(configXml);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate SEB configuration.' });
  }
});

export default router;

