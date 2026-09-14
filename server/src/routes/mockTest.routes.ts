import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { evaluateAndScoreMockTestAttempt } from '../services/ai/mockTestScoringEngine.js';
import { generateLessonMockTest } from '../services/ai/aiMockTestGenerator.js';
import { evaluateShortAnswerWithAI } from '../services/ai/aiShortAnswerEvaluator.js';

const router = Router();

// =========================================================================
// 1. GET /student/mock-tests — List all available mock tests
// =========================================================================
router.get('/mock-tests', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;

    const tests = queryAll(`
      SELECT mt.*,
             c.title as course_title, c.difficulty as course_difficulty,
             m.title as module_title, m.sequence as module_sequence,
             l.title as lesson_title, l.sequence as lesson_sequence, l.content_type as lesson_content_type
      FROM mock_tests mt
      JOIN courses c ON mt.course_id = c.id
      JOIN modules m ON mt.module_id = m.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mt.status = 'published'
      ORDER BY c.title ASC, m.sequence ASC, l.sequence ASC
    `);

    // Fetch attempts for current student
    const studentAttempts = queryAll(`
      SELECT mta.*
      FROM mock_test_attempts mta
      WHERE mta.student_id = ?
      ORDER BY mta.created_at DESC
    `, [userId]);

    const attemptsByTest = new Map<string, any[]>();
    for (const att of studentAttempts) {
      if (!attemptsByTest.has(att.mock_test_id)) {
        attemptsByTest.set(att.mock_test_id, []);
      }
      attemptsByTest.get(att.mock_test_id)!.push(att);
    }

    const testSummaries = tests.map(t => {
      const atts = attemptsByTest.get(t.id) || [];
      const attemptCount = atts.length;

      let status = 'not_attempted';
      let bestScore = 0;
      let latestScore = 0;
      let latestAttemptId: string | null = null;
      let inProgressAttemptId: string | null = null;

      if (atts.length > 0) {
        const hasActive = atts.find(a => a.status === 'in_progress');
        if (hasActive) {
          status = 'in_progress';
          inProgressAttemptId = hasActive.id;
        } else {
          const hasPassed = atts.some(a => a.passed === 1);
          status = hasPassed ? 'passed' : 'failed';
        }

        const scores = atts.map(a => Number(a.percentage) || 0);
        bestScore = Math.max(...scores);
        latestScore = Number(atts[0].percentage) || 0;
        latestAttemptId = atts[0].id;
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        courseId: t.course_id,
        courseTitle: t.course_title,
        moduleId: t.module_id,
        moduleTitle: t.module_title,
        lessonId: t.lesson_id,
        lessonTitle: t.lesson_title,
        lessonContentType: t.lesson_content_type,
        difficulty: t.difficulty,
        durationMinutes: t.duration_minutes,
        totalQuestions: t.total_questions,
        totalMarks: t.total_marks,
        passingPercentage: t.passing_percentage,
        maxAttempts: t.max_attempts,
        attemptCount,
        attemptsRemaining: Math.max(0, t.max_attempts - attemptCount),
        status,
        bestScore,
        latestScore,
        latestAttemptId,
        inProgressAttemptId
      };
    });

    res.json(testSummaries);
  } catch (err: any) {
    console.error('[MockTest Routes] Error listing mock tests:', err);
    res.status(500).json({ error: err.message || 'Failed to list mock tests.' });
  }
});

// =========================================================================
// 2. GET /student/mock-tests/:testId — Test overview & metadata
// =========================================================================
router.get('/mock-tests/:testId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId;

    const test = queryOne(`
      SELECT mt.*,
             c.title as course_title,
             m.title as module_title,
             l.title as lesson_title, l.description as lesson_description
      FROM mock_tests mt
      JOIN courses c ON mt.course_id = c.id
      JOIN modules m ON mt.module_id = m.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mt.id = ?
    `, [testId]);

    if (!test) {
      res.status(404).json({ error: 'Mock test not found.' });
      return;
    }

    const attempts = queryAll(`
      SELECT id, attempt_number, started_at, submitted_at, time_taken_seconds,
             status, total_marks, earned_marks, percentage, passed, suspicious_event_count
      FROM mock_test_attempts
      WHERE mock_test_id = ? AND student_id = ?
      ORDER BY attempt_number DESC
    `, [testId, userId]);

    res.json({
      test,
      attempts,
      attemptCount: attempts.length,
      attemptsRemaining: Math.max(0, test.max_attempts - attempts.length),
      hasActiveAttempt: attempts.some(a => a.status === 'in_progress')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get mock test.' });
  }
});

// =========================================================================
// 3. GET /student/mock-tests/:testId/instructions — Instructions & rules
// =========================================================================
router.get('/mock-tests/:testId/instructions', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId;

    const test = queryOne(`
      SELECT mt.*,
             c.title as course_title,
             m.title as module_title,
             l.title as lesson_title
      FROM mock_tests mt
      JOIN courses c ON mt.course_id = c.id
      JOIN modules m ON mt.module_id = m.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mt.id = ?
    `, [testId]);

    if (!test) {
      res.status(404).json({ error: 'Mock test not found.' });
      return;
    }

    const pastAttempts = queryAll(`
      SELECT id, attempt_number, percentage, passed, status, created_at
      FROM mock_test_attempts
      WHERE mock_test_id = ? AND student_id = ?
      ORDER BY attempt_number DESC
    `, [testId, userId]);

    const activeAttempt = pastAttempts.find(a => a.status === 'in_progress');

    res.json({
      testId: test.id,
      title: test.title,
      description: test.description,
      courseTitle: test.course_title,
      moduleTitle: test.module_title,
      lessonTitle: test.lesson_title,
      difficulty: test.difficulty,
      totalQuestions: test.total_questions,
      totalMarks: test.total_marks,
      durationMinutes: test.duration_minutes,
      passingPercentage: test.passing_percentage,
      maxAttempts: test.max_attempts,
      attemptsUsed: pastAttempts.length,
      attemptsRemaining: Math.max(0, test.max_attempts - pastAttempts.length),
      canAttempt: pastAttempts.length < test.max_attempts || Boolean(activeAttempt),
      activeAttemptId: activeAttempt ? activeAttempt.id : null,
      rules: [
        'Full-Screen Recommended: Exam runs in focused assessment mode to simulate real hiring tests.',
        'Continuous Countdown Timer: The timer runs continuously on the server; answers are automatically submitted if time expires.',
        'Integrity Monitoring: Window focus, tab switching, and fullscreen exits are logged. Three violations will trigger automatic submission.',
        'Automatic Answer Saving: Every answer selection is saved immediately to prevent accidental data loss.',
        'Review and Explanations: Full question explanations and AI feedback will unlock immediately upon submission.'
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch instructions.' });
  }
});

// =========================================================================
// 4. POST /student/mock-tests/:testId/start — Start new attempt (or resume)
// =========================================================================
router.post('/mock-tests/:testId/start', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId;

    const test = queryOne(`
      SELECT * FROM mock_tests WHERE id = ? AND status = 'published'
    `, [testId]);

    if (!test) {
      res.status(404).json({ error: 'Mock test not found or unavailable.' });
      return;
    }

    // Check for existing in_progress attempt
    const activeAttempt = queryOne(`
      SELECT * FROM mock_test_attempts
      WHERE mock_test_id = ? AND student_id = ? AND status = 'in_progress'
      ORDER BY started_at DESC LIMIT 1
    `, [testId, userId]);

    let attemptId = '';
    let attemptNumber = 1;

    if (activeAttempt) {
      attemptId = activeAttempt.id;
      attemptNumber = activeAttempt.attempt_number;
    } else {
      // Check max attempts
      const pastAttempts = queryAll(`
        SELECT id FROM mock_test_attempts WHERE mock_test_id = ? AND student_id = ?
      `, [testId, userId]);

      if (pastAttempts.length >= test.max_attempts) {
        res.status(400).json({
          error: `Maximum attempts limit (${test.max_attempts}) reached for this mock test.`
        });
        return;
      }

      attemptNumber = pastAttempts.length + 1;
      attemptId = `atm-mt-${uuidv4().substring(0, 8)}`;

      const startedAtIso = new Date().toISOString();
      execute(`
        INSERT INTO mock_test_attempts (
          id, mock_test_id, student_id, attempt_number, started_at,
          status, total_marks, earned_marks, percentage, passed, suspicious_event_count
        ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, 0.0, 0.0, 0, 0)
      `, [attemptId, testId, userId, attemptNumber, startedAtIso, test.total_marks]);

      // Log activity
      execute(`
        INSERT INTO assessment_activity_logs (id, attempt_id, student_id, activity_type, severity, metadata_json)
        VALUES (?, ?, ?, 'TEST_STARTED', 'info', ?)
      `, [uuidv4(), attemptId, userId, JSON.stringify({ attemptNumber, testId })]);
    }

    // Return sanitized questions (STRIP correct_answer and explanation!)
    const rawQuestions = queryAll(`
      SELECT id, mock_test_id, question_type, question_text, options_json, marks, skill_id, difficulty, order_index
      FROM mock_test_questions
      WHERE mock_test_id = ?
      ORDER BY order_index ASC
    `, [testId]);

    const questions = rawQuestions.map(q => ({
      id: q.id,
      mockTestId: q.mock_test_id,
      questionType: q.question_type,
      questionText: q.question_text,
      options: JSON.parse(q.options_json || '[]'),
      marks: q.marks,
      skillId: q.skill_id,
      difficulty: q.difficulty,
      orderIndex: q.order_index
    }));

    res.json({
      attemptId,
      attemptNumber,
      testTitle: test.title,
      durationMinutes: test.duration_minutes,
      totalMarks: test.total_marks,
      totalQuestions: questions.length,
      passingPercentage: test.passing_percentage,
      questions
    });
  } catch (err: any) {
    console.error('[MockTest Routes] Start test error:', err);
    res.status(500).json({ error: err.message || 'Failed to start test.' });
  }
});

// =========================================================================
// 5. GET /student/mock-tests/:testId/attempt/:attemptId — Get active attempt state
// =========================================================================
router.get('/mock-tests/:testId/attempt/:attemptId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;

    const attempt = queryOne(`
      SELECT mta.*, mt.title as test_title, mt.duration_minutes, mt.total_marks as test_total_marks, mt.passing_percentage
      FROM mock_test_attempts mta
      JOIN mock_tests mt ON mta.mock_test_id = mt.id
      WHERE mta.id = ? AND mta.mock_test_id = ? AND mta.student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found or access denied.' });
      return;
    }

    // Calculate server remaining time
    const startedAtStr = (attempt.started_at || '').includes('T')
      ? attempt.started_at
      : (attempt.started_at || '').replace(' ', 'T') + 'Z';
    const startedAtMs = new Date(startedAtStr).getTime();
    const durationMs = (attempt.duration_minutes || 20) * 60 * 1000;
    const nowMs = Date.now();
    const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
    const timeRemainingSeconds = Math.max(0, Math.floor((durationMs - (nowMs - startedAtMs)) / 1000));

    // If time has expired and test is still in_progress, auto-submit
    if (timeRemainingSeconds <= 0 && attempt.status === 'in_progress') {
      execute(`UPDATE mock_test_attempts SET status = 'time_expired' WHERE id = ?`, [attemptId]);
      res.json({
        attemptId,
        status: 'time_expired',
        timeRemainingSeconds: 0,
        isExpired: true,
        message: 'Assessment time limit has expired.'
      });
      return;
    }

    // Fetch questions sanitized (NO correct_answer or explanation!)
    const rawQuestions = queryAll(`
      SELECT id, question_type, question_text, options_json, marks, skill_id, difficulty, order_index
      FROM mock_test_questions
      WHERE mock_test_id = ?
      ORDER BY order_index ASC
    `, [testId]);

    // Fetch saved answers
    const savedAnswers = queryAll(`
      SELECT question_id, answer_text, selected_option, is_marked_for_review
      FROM student_answers
      WHERE attempt_id = ?
    `, [attemptId]);

    const answersMap: Record<string, any> = {};
    for (const a of savedAnswers) {
      answersMap[a.question_id] = {
        selectedOption: a.selected_option,
        answerText: a.answer_text,
        isMarkedForReview: Boolean(a.is_marked_for_review)
      };
    }

    const questions = rawQuestions.map(q => ({
      id: q.id,
      questionType: q.question_type,
      questionText: q.question_text,
      options: JSON.parse(q.options_json || '[]'),
      marks: q.marks,
      skillId: q.skill_id,
      difficulty: q.difficulty,
      orderIndex: q.order_index
    }));

    res.json({
      attemptId,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      testTitle: attempt.test_title,
      durationMinutes: attempt.duration_minutes,
      timeRemainingSeconds,
      suspiciousEventCount: attempt.suspicious_event_count,
      questions,
      savedAnswers: answersMap
    });
  } catch (err: any) {
    console.error('[MockTest Routes] Get attempt error:', err);
    res.status(500).json({ error: err.message || 'Failed to get attempt.' });
  }
});

// =========================================================================
// 6. PUT /student/mock-tests/:testId/attempt/:attemptId/answer — Auto-save answer
// =========================================================================
router.put('/mock-tests/:testId/attempt/:attemptId/answer', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;
    const { questionId, selectedOption, answerText, isMarkedForReview } = req.body;

    if (!questionId) {
      res.status(400).json({ error: 'questionId is required.' });
      return;
    }

    const attempt = queryOne(`
      SELECT id, status FROM mock_test_attempts
      WHERE id = ? AND mock_test_id = ? AND student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found or access denied.' });
      return;
    }

    if (attempt.status !== 'in_progress') {
      res.status(400).json({ error: `Cannot modify answers for an attempt with status '${attempt.status}'.` });
      return;
    }

    const existingAns = queryOne(`
      SELECT id FROM student_answers WHERE attempt_id = ? AND question_id = ?
    `, [attemptId, questionId]);

    const formattedAnswer = typeof selectedOption === 'object' ? JSON.stringify(selectedOption) : (selectedOption ?? answerText ?? null);
    const marked = isMarkedForReview ? 1 : 0;

    if (existingAns) {
      execute(`
        UPDATE student_answers
        SET selected_option = ?, answer_text = ?, is_marked_for_review = ?, submitted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [formattedAnswer, answerText ?? formattedAnswer, marked, existingAns.id]);
    } else {
      execute(`
        INSERT INTO student_answers (id, attempt_id, question_id, selected_option, answer_text, is_marked_for_review)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [uuidv4(), attemptId, questionId, formattedAnswer, answerText ?? formattedAnswer, marked]);
    }

    res.json({
      success: true,
      questionId,
      savedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save answer.' });
  }
});

// =========================================================================
// 7. POST /student/mock-tests/:testId/attempt/:attemptId/activity-log — Security monitor
// =========================================================================
router.post('/mock-tests/:testId/attempt/:attemptId/activity-log', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;
    const { activityType, metadata = {}, severity = 'warning' } = req.body;

    const attempt = queryOne(`
      SELECT id, suspicious_event_count, status
      FROM mock_test_attempts
      WHERE id = ? AND mock_test_id = ? AND student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found.' });
      return;
    }

    const isSuspicious = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'].includes(activityType);
    const newCount = (attempt.suspicious_event_count || 0) + (isSuspicious ? 1 : 0);

    // Record activity
    execute(`
      INSERT INTO assessment_activity_logs (id, attempt_id, student_id, activity_type, severity, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [uuidv4(), attemptId, userId, activityType, severity, JSON.stringify(metadata)]);

    // Update attempt violation count
    execute(`
      UPDATE mock_test_attempts
      SET suspicious_event_count = ?
      WHERE id = ?
    `, [newCount, attemptId]);

    // Violation escalation rules:
    // Count 1: Warning
    // Count 2: Final Warning
    // Count 3+: Auto-submit or lock
    let action = 'none';
    if (newCount === 1) action = 'warning';
    else if (newCount === 2) action = 'final_warning';
    else if (newCount >= 3) action = 'auto_submitted';

    res.json({
      recorded: true,
      suspiciousEventCount: newCount,
      action,
      message: action === 'final_warning'
        ? 'Final Warning: Navigating away from the exam window one more time will result in automatic submission.'
        : action === 'warning'
        ? 'Exam Security Alert: Tab switching and focus loss are strictly recorded.'
        : 'Action logged.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log activity.' });
  }
});

// =========================================================================
// 8. POST /student/mock-tests/:testId/attempt/:attemptId/submit — Final submission
// =========================================================================
router.post('/mock-tests/:testId/attempt/:attemptId/submit', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;

    const attempt = queryOne(`
      SELECT * FROM mock_test_attempts
      WHERE id = ? AND mock_test_id = ? AND student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found or access denied.' });
      return;
    }

    // If already evaluated & submitted, return existing results
    if (attempt.status === 'submitted' && attempt.percentage !== null) {
      const existingResults = queryAll(`
        SELECT * FROM test_skill_results WHERE attempt_id = ?
      `, [attemptId]);

      res.json({
        alreadySubmitted: true,
        attemptId,
        percentage: attempt.percentage,
        passed: Boolean(attempt.passed),
        earnedMarks: attempt.earned_marks,
        totalMarks: attempt.total_marks,
        timeTakenSeconds: attempt.time_taken_seconds,
        aiFeedback: JSON.parse(attempt.ai_feedback_json || '{}'),
        skillResults: existingResults
      });
      return;
    }

    // Execute server-side scoring engine
    const evaluationResult = await evaluateAndScoreMockTestAttempt(attemptId);

    res.json(evaluationResult);
  } catch (err: any) {
    console.error('[MockTest Routes] Evaluation error:', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate test attempt.' });
  }
});

// =========================================================================
// 9. GET /student/mock-tests/:testId/result/:attemptId — Scorecard & Feedback
// =========================================================================
router.get('/mock-tests/:testId/result/:attemptId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;

    const attempt = queryOne(`
      SELECT mta.*, mt.title as test_title, mt.passing_percentage, mt.lesson_id, mt.course_id,
             l.title as lesson_title
      FROM mock_test_attempts mta
      JOIN mock_tests mt ON mta.mock_test_id = mt.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mta.id = ? AND mta.mock_test_id = ? AND mta.student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found.' });
      return;
    }

    const skillResults = queryAll(`
      SELECT tsr.*, s.name as skill_name
      FROM test_skill_results tsr
      LEFT JOIN skills s ON tsr.skill_id = s.id
      WHERE tsr.attempt_id = ?
    `, [attemptId]);

    // Question answers summary count
    const answers = queryAll(`
      SELECT evaluation_status, earned_marks
      FROM student_answers
      WHERE attempt_id = ?
    `, [attemptId]);

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const a of answers) {
      if (a.evaluation_status === 'correct' || a.evaluation_status === 'partially_correct') {
        correctCount++;
      } else if (a.evaluation_status === 'incorrect') {
        incorrectCount++;
      } else {
        unansweredCount++;
      }
    }

    const aiFeedback = JSON.parse(attempt.ai_feedback_json || '{}');

    // Check attempts remaining
    const totalAttempts = queryAll(`
      SELECT id FROM mock_test_attempts WHERE mock_test_id = ? AND student_id = ?
    `, [testId, userId]);

    const maxAttempts = Number(queryOne('SELECT max_attempts FROM mock_tests WHERE id = ?', [testId])?.max_attempts) || 3;
    const canRetry = totalAttempts.length < maxAttempts;

    res.json({
      attemptId,
      testId,
      testTitle: attempt.test_title,
      lessonId: attempt.lesson_id,
      lessonTitle: attempt.lesson_title,
      percentage: Number(attempt.percentage) || 0,
      passed: Boolean(attempt.passed),
      passingPercentage: attempt.passing_percentage,
      earnedMarks: attempt.earned_marks,
      totalMarks: attempt.total_marks,
      timeTakenSeconds: attempt.time_taken_seconds,
      correctCount,
      incorrectCount,
      unansweredCount,
      suspiciousEventCount: attempt.suspicious_event_count,
      aiFeedback,
      skillResults: skillResults.map(s => ({
        skillId: s.skill_id,
        skillName: s.skill_name || 'Programming Skill',
        earnedMarks: s.earned_marks,
        maximumMarks: s.maximum_marks,
        percentage: s.percentage,
        status: s.percentage >= 80 ? 'Mastered' : s.percentage >= 60 ? 'Developing' : 'Needs Practice'
      })),
      canRetry,
      attemptsRemaining: Math.max(0, maxAttempts - totalAttempts.length)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch result.' });
  }
});

// =========================================================================
// 10. GET /student/mock-tests/:testId/review/:attemptId — Full Review
// (Never exposed before submission!)
// =========================================================================
router.get('/mock-tests/:testId/review/:attemptId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { testId, attemptId } = req.params;

    const attempt = queryOne(`
      SELECT mta.*, mt.title as test_title, l.title as lesson_title
      FROM mock_test_attempts mta
      JOIN mock_tests mt ON mta.mock_test_id = mt.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mta.id = ? AND mta.mock_test_id = ? AND mta.student_id = ?
    `, [attemptId, testId, userId]);

    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found or access denied.' });
      return;
    }

    // STRICT RULE: Correct answers are never visible during active test
    if (attempt.status === 'in_progress') {
      res.status(403).json({
        error: 'Review is strictly prohibited while the assessment is in progress. Submit your test to unlock explanations.'
      });
      return;
    }

    const questions = queryAll(`
      SELECT q.*, s.name as skill_name,
             sa.selected_option as student_selected_option,
             sa.answer_text as student_answer_text,
             sa.earned_marks as student_earned_marks,
             sa.evaluation_status as student_evaluation_status,
             sa.ai_feedback as question_ai_feedback,
             sa.is_marked_for_review
      FROM mock_test_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      LEFT JOIN student_answers sa ON sa.question_id = q.id AND sa.attempt_id = ?
      WHERE q.mock_test_id = ?
      ORDER BY q.order_index ASC
    `, [attemptId, testId]);

    const reviewedQuestions = questions.map(q => {
      let options: string[] = [];
      try {
        options = JSON.parse(q.options_json || '[]');
      } catch {
        options = [];
      }

      return {
        questionId: q.id,
        questionType: q.question_type,
        questionText: q.question_text,
        options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        marks: q.marks,
        skillId: q.skill_id,
        skillName: q.skill_name || 'Programming Fundamentals',
        difficulty: q.difficulty,
        studentAnswer: q.student_selected_option || q.student_answer_text || null,
        earnedMarks: q.student_earned_marks ?? 0,
        evaluationStatus: q.student_evaluation_status || 'unanswered',
        aiFeedback: q.question_ai_feedback || null,
        isMarkedForReview: Boolean(q.is_marked_for_review)
      };
    });

    res.json({
      attemptId,
      testTitle: attempt.test_title,
      lessonTitle: attempt.lesson_title,
      percentage: attempt.percentage,
      passed: Boolean(attempt.passed),
      totalMarks: attempt.total_marks,
      earnedMarks: attempt.earned_marks,
      questions: reviewedQuestions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch review.' });
  }
});

// =========================================================================
// 11. POST /student/mock-tests/:testId/retry — Retry failed test
// =========================================================================
router.post('/mock-tests/:testId/retry', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId;

    const test = queryOne('SELECT * FROM mock_tests WHERE id = ?', [testId]);
    if (!test) {
      res.status(404).json({ error: 'Mock test not found.' });
      return;
    }

    const pastAttempts = queryAll(`
      SELECT id FROM mock_test_attempts WHERE mock_test_id = ? AND student_id = ?
    `, [testId, userId]);

    if (pastAttempts.length >= test.max_attempts) {
      res.status(400).json({
        error: `Maximum attempts limit (${test.max_attempts}) reached for this mock test.`
      });
      return;
    }

    const newAttemptNumber = pastAttempts.length + 1;
    const newAttemptId = `atm-mt-${uuidv4().substring(0, 8)}`;

    const startedAtIso = new Date().toISOString();
    execute(`
      INSERT INTO mock_test_attempts (
        id, mock_test_id, student_id, attempt_number, started_at,
        status, total_marks, earned_marks, percentage, passed, suspicious_event_count
      ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, 0.0, 0.0, 0, 0)
    `, [newAttemptId, testId, userId, newAttemptNumber, startedAtIso, test.total_marks]);

    execute(`
      INSERT INTO assessment_activity_logs (id, attempt_id, student_id, activity_type, severity, metadata_json)
      VALUES (?, ?, ?, 'TEST_STARTED', 'info', ?)
    `, [uuidv4(), newAttemptId, userId, JSON.stringify({ retry: true, attemptNumber: newAttemptNumber })]);

    res.json({
      attemptId: newAttemptId,
      attemptNumber: newAttemptNumber,
      message: 'New attempt initialized successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retry test.' });
  }
});

// =========================================================================
// 12. POST /student/mock-tests/evaluate-short-answer — Direct AI short answer test
// =========================================================================
router.post('/mock-tests/evaluate-short-answer', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { questionText, expectedAnswer, studentAnswer, maximumScore = 3, skillName } = req.body;

    if (!questionText || !studentAnswer) {
      res.status(400).json({ error: 'questionText and studentAnswer are required.' });
      return;
    }

    const result = await evaluateShortAnswerWithAI({
      questionText,
      expectedAnswer: expectedAnswer || '',
      studentAnswer,
      maximumScore: Number(maximumScore) || 3,
      skillName
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evaluation failed.' });
  }
});

// =========================================================================
// 13. POST /student/mock-tests/:testId/generate — Dynamic AI Generator
// =========================================================================
router.post('/mock-tests/:testId/generate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const testId = req.params.testId;

    const test = queryOne(`
      SELECT mt.*, c.title as course_title, m.title as module_title,
             l.title as lesson_title, l.description as lesson_description,
             l.learning_objectives_json, l.key_points_json
      FROM mock_tests mt
      JOIN courses c ON mt.course_id = c.id
      JOIN modules m ON mt.module_id = m.id
      JOIN lessons l ON mt.lesson_id = l.id
      WHERE mt.id = ?
    `, [testId]);

    if (!test) {
      res.status(404).json({ error: 'Mock test not found.' });
      return;
    }

    const profile = queryOne('SELECT self_declared_level FROM student_profiles WHERE user_id = ?', [userId]);

    const generated = await generateLessonMockTest({
      lessonId: test.lesson_id,
      lessonTitle: test.lesson_title,
      lessonDescription: test.lesson_description,
      courseTitle: test.course_title,
      moduleTitle: test.module_title,
      learningObjectives: JSON.parse(test.learning_objectives_json || '[]'),
      keyPoints: JSON.parse(test.key_points_json || '[]'),
      difficulty: test.difficulty,
      studentLevel: profile?.self_declared_level || 'Developing'
    });

    res.json({
      success: true,
      testTitle: generated.testTitle,
      questionCount: generated.questions.length,
      difficulty: generated.difficulty
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Generation failed.' });
  }
});

// =========================================================================
// 14. ADMIN APIS — Mock test authoring and candidate analytics
// =========================================================================
router.post('/admin/mock-tests', authenticateToken, requireRole(['admin', 'mentor']), (req: Request, res: Response): void => {
  try {
    const { title, description, courseId, moduleId, lessonId, difficulty, durationMinutes, totalMarks, passingPercentage, maxAttempts } = req.body;
    const id = `mt-${uuidv4().substring(0, 8)}`;

    execute(`
      INSERT INTO mock_tests (id, title, description, course_id, module_id, lesson_id, difficulty, duration_minutes, total_marks, passing_percentage, max_attempts, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `, [id, title, description, courseId, moduleId, lessonId, difficulty || 'medium', durationMinutes || 20, totalMarks || 20, passingPercentage || 60, maxAttempts || 3]);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create mock test.' });
  }
});

router.get('/admin/mock-tests/:testId/results', authenticateToken, requireRole(['admin', 'mentor', 'college']), (req: Request, res: Response): void => {
  try {
    const testId = req.params.testId;
    const results = queryAll(`
      SELECT mta.*, u.name as student_name, u.email as student_email
      FROM mock_test_attempts mta
      JOIN users u ON mta.student_id = u.id
      WHERE mta.mock_test_id = ?
      ORDER BY mta.created_at DESC
    `, [testId]);

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch results.' });
  }
});

export default router;
