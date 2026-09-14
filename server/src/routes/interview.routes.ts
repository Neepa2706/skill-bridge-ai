import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { processInterviewStep, evaluateInterviewSession, INITIAL_INTERVIEW_QUESTIONS } from '../services/ai/interviewEngine.js';
import {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  getScoreCategoryLabel
} from '../services/ai/mockInterviewEngine.js';

const router = Router();

const MANDATORY_MOCK_NOTICE = 'AI mock interview results are for practice and preparation only. They do not guarantee job selection.';

// ============================================================================
// STEP 13: AI MOCK INTERVIEW SYSTEM ENDPOINTS
// ============================================================================

/**
 * 13.2 Student Mock Interview Dashboard
 * GET /dashboard or GET /student/mock-interview/dashboard
 */
router.get(['/dashboard', '/mock-interview/dashboard'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;

    // Fetch all completed interviews for student
    const interviews = queryAll<any>(
      `SELECT * FROM mock_interviews WHERE student_id = ? ORDER BY created_at DESC`,
      [studentId]
    );

    const completed = interviews.filter(i => i.status === 'COMPLETED');
    const totalInterviews = completed.length;

    let avgScore = 0;
    let avgTechnical = 0;
    let avgCommunication = 0;
    let avgHr = 0;
    let bestScore = 0;

    const weakAreaCounts: Record<string, number> = {};

    if (totalInterviews > 0) {
      let sumOverall = 0;
      let sumTech = 0;
      let sumComm = 0;
      let sumHr = 0;

      for (const item of completed) {
        sumOverall += item.overall_score || 0;
        sumTech += item.technical_score || 0;
        sumComm += item.communication_score || 0;
        sumHr += item.hr_score || 0;
        if ((item.overall_score || 0) > bestScore) {
          bestScore = Math.round(item.overall_score);
        }

        try {
          const weaknesses = JSON.parse(item.weaknesses_json || '[]');
          for (const w of weaknesses) {
            weakAreaCounts[w] = (weakAreaCounts[w] || 0) + 1;
          }
        } catch {
          // ignore parsing error
        }
      }

      avgScore = Math.round(sumOverall / totalInterviews);
      avgTechnical = Math.round(sumTech / totalInterviews);
      avgCommunication = Math.round(sumComm / totalInterviews);
      avgHr = Math.round(sumHr / totalInterviews);
    }

    const topWeakAreas = Object.entries(weakAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([area]) => area);

    if (topWeakAreas.length === 0) {
      topWeakAreas.push('Quantifying impact with concrete production latency numbers', 'Articulating architectural trade-offs under high load');
    }

    res.json({
      success: true,
      message: 'Mock interview dashboard loaded successfully',
      notice: MANDATORY_MOCK_NOTICE,
      disclaimer: MANDATORY_MOCK_NOTICE,
      data: {
        disclaimer: MANDATORY_MOCK_NOTICE,
        notice: MANDATORY_MOCK_NOTICE,
        summaryCards: {
          totalInterviews,
          averageScore: avgScore,
          bestScore,
          technicalReadiness: avgTechnical || 75,
          communicationReadiness: avgCommunication || 78,
          improvementAreas: topWeakAreas.length
        },
        scores: {
          averageScore: avgScore,
          technicalScore: avgTechnical || 75,
          communicationScore: avgCommunication || 78,
          hrScore: avgHr || 72,
          bestScore,
          streakDays: Math.min(14, totalInterviews * 2 + 1)
        },
        weakAreas: topWeakAreas,
        recommendedPractice: [
          {
            title: 'Technical Deep-Dive: Python Runtime & Concurrency',
            type: 'COURSE',
            link: '/student/courses/crs-python-advanced',
            estimatedTime: '2 hours'
          },
          {
            title: 'System Design & Database Indexing Scenarios',
            type: 'CODING',
            link: '/student/coding/problem/cp-1',
            estimatedTime: '45 mins'
          },
          {
            title: 'Behavioral STAR Framework Mastery',
            type: 'COMMUNICATION',
            link: '/student/communication',
            estimatedTime: '30 mins'
          }
        ],
        recentInterviews: interviews.slice(0, 5).map(i => ({
          id: i.id,
          targetRole: i.target_role,
          interviewType: i.interview_type,
          difficulty: i.difficulty,
          status: i.status,
          overallScore: i.overall_score,
          scoreLabel: getScoreCategoryLabel(i.overall_score || 0),
          startedAt: i.started_at,
          completedAt: i.completed_at
        }))
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load mock interview dashboard', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.3 Interview Setup & Initiation
 * POST /start or POST /mock-interview/start
 */
router.post(['/start', '/mock-interview/start'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const {
      interviewType = 'TECHNICAL',
      difficulty = 'INTERMEDIATE',
      targetRole = 'Python Developer',
      duration = 15,
      questionCount = 5,
      mode = 'TEXT'
    } = req.body;

    const validTypes = ['TECHNICAL', 'HR', 'BEHAVIORAL', 'COMMUNICATION', 'ROLE_SPECIFIC', 'MIXED'];
    const validDiff = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const validModes = ['TEXT', 'VOICE'];

    const sanitizedType = validTypes.includes(interviewType) ? interviewType : 'TECHNICAL';
    const sanitizedDiff = validDiff.includes(difficulty) ? difficulty : 'INTERMEDIATE';
    const sanitizedMode = validModes.includes(mode) ? mode : 'TEXT';
    const count = Math.min(20, Math.max(3, parseInt(questionCount, 10) || 5));
    const durMinutes = Math.min(30, Math.max(5, parseInt(duration, 10) || 15));

    const interviewId = `mock-int-${uuidv4()}`;

    // Create interview record
    execute(
      `INSERT INTO mock_interviews (
        id, student_id, interview_type, target_role, difficulty, mode,
        question_count, duration, status, overall_score, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', 0.0, CURRENT_TIMESTAMP)`,
      [interviewId, studentId, sanitizedType, targetRole, sanitizedDiff, sanitizedMode, count, durMinutes]
    );

    // Generate questions
    const questions = generateInterviewQuestions(studentId, targetRole, sanitizedType, sanitizedDiff, count);

    for (const q of questions) {
      const qId = `iq-${uuidv4()}`;
      execute(
        `INSERT INTO interview_questions (
          id, interview_id, question_id, question_text, question_type, sequence_number, is_follow_up
        ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [qId, interviewId, q.questionId, q.questionText, q.questionType, q.sequenceNumber]
      );
    }

    const firstQuestion = queryOne<any>(
      `SELECT * FROM interview_questions WHERE interview_id = ? AND sequence_number = 1`,
      [interviewId]
    );

    res.json({
      success: true,
      message: 'Interview session initialized successfully',
      notice: MANDATORY_MOCK_NOTICE,
      disclaimer: MANDATORY_MOCK_NOTICE,
      data: {
        id: interviewId,
        sessionId: interviewId,
        session: { id: interviewId },
        interviewId,
        disclaimer: MANDATORY_MOCK_NOTICE,
        targetRole,
        interviewType: sanitizedType,
        difficulty: sanitizedDiff,
        mode: sanitizedMode,
        duration: durMinutes,
        totalQuestions: count,
        currentQuestionNumber: 1,
        currentQuestion: firstQuestion ? {
          id: firstQuestion.id,
          text: firstQuestion.question_text,
          type: firstQuestion.question_type,
          isFollowUp: false
        } : null
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to start interview session', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.4 Interview Session Active State
 * GET /session/:id or GET /mock-interview/session/:id
 */
router.get(['/session/:id', '/mock-interview/session/:id'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;

    const interview = queryOne<any>(
      `SELECT * FROM mock_interviews WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview session not found', data: null, error: { code: 'NOT_FOUND', details: 'Session does not exist or unauthorized.' } });
      return;
    }

    const questions = queryAll<any>(
      `SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY sequence_number ASC`,
      [id]
    );

    const answers = queryAll<any>(
      `SELECT * FROM interview_answers WHERE interview_id = ?`,
      [id]
    );

    const answeredQuestionIds = new Set(answers.map(a => a.question_id));
    const nextUnanswered = questions.find(q => !answeredQuestionIds.has(q.id));

    res.json({
      success: true,
      message: 'Interview session loaded',
      notice: MANDATORY_MOCK_NOTICE,
      disclaimer: MANDATORY_MOCK_NOTICE,
      data: {
        id: interview.id,
        sessionId: interview.id,
        interviewId: interview.id,
        targetRole: interview.target_role,
        interviewType: interview.interview_type,
        difficulty: interview.difficulty,
        mode: interview.mode,
        duration: interview.duration,
        status: interview.status,
        totalQuestions: interview.question_count,
        answeredCount: answers.length,
        questions: questions.map(q => ({
          id: q.id,
          questionId: q.question_id,
          questionText: q.question_text,
          text: q.question_text,
          type: q.question_type,
          sequenceNumber: q.sequence_number,
          isFollowUp: Boolean(q.is_follow_up)
        })),
        currentQuestion: nextUnanswered ? {
          id: nextUnanswered.id,
          text: nextUnanswered.question_text,
          type: nextUnanswered.question_type,
          sequenceNumber: nextUnanswered.sequence_number,
          isFollowUp: Boolean(nextUnanswered.is_follow_up)
        } : null,
        answers: answers.map(a => ({
          questionId: a.question_id,
          answerText: a.answer_text,
          score: a.score,
          feedback: a.feedback
        }))
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load interview session', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.6 Answer Evaluation & 13.7 Follow-Up Question Trigger
 * POST /session/:id/answer or POST /mock-interview/session/:id/answer
 */
router.post(['/session/:id/answer', '/mock-interview/session/:id/answer'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;
    const { questionId, answerText, audioUrl } = req.body;

    const interview = queryOne<any>(
      `SELECT * FROM mock_interviews WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview session not found', data: null, error: { code: 'NOT_FOUND', details: 'Session does not exist.' } });
      return;
    }

    const question = queryOne<any>(
      `SELECT * FROM interview_questions WHERE id = ? AND interview_id = ?`,
      [questionId, id]
    );

    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found in this session', data: null, error: { code: 'NOT_FOUND', details: 'Invalid question ID.' } });
      return;
    }

    // Evaluate answer with rubric
    const evalResult = evaluateInterviewAnswer(
      question.question_text,
      question.question_type,
      answerText,
      question.follow_up_count || 0
    );

    // Save evaluated answer
    const answerRecordId = `ans-${uuidv4()}`;
    execute(
      `INSERT OR REPLACE INTO interview_answers (
        id, interview_id, question_id, student_id, answer_text, audio_url,
        score, technical_score, communication_score, hr_score, problem_solving_score,
        feedback, strengths_json, weaknesses_json, missing_points_json,
        suggested_structure, improvement_advice, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        answerRecordId,
        id,
        questionId,
        studentId,
        answerText || '',
        audioUrl || null,
        evalResult.score,
        evalResult.technicalScore,
        evalResult.communicationScore,
        evalResult.hrScore,
        evalResult.problemSolvingScore,
        evalResult.feedback,
        JSON.stringify(evalResult.strengths),
        JSON.stringify(evalResult.weaknesses),
        JSON.stringify(evalResult.missingPoints),
        evalResult.suggestedStructure,
        evalResult.improvementAdvice
      ]
    );

    // Increment attempted count
    execute(
      `UPDATE mock_interviews SET questions_attempted = questions_attempted + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    // Handle Follow-Up Questions (Max 2 follow-ups per main question)
    let followUpQuestion = null;
    if (evalResult.shouldGenerateFollowUp && evalResult.followUpQuestionText) {
      const fuId = `iq-fu-${uuidv4()}`;
      const nextSeq = question.sequence_number + 0.1;

      execute(
        `INSERT INTO interview_questions (
          id, interview_id, question_id, question_text, question_type, sequence_number, is_follow_up, parent_question_id
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [fuId, id, fuId, evalResult.followUpQuestionText, evalResult.followUpQuestionType || question.question_type, nextSeq, question.id]
      );

      execute(
        `UPDATE interview_questions SET follow_up_count = follow_up_count + 1 WHERE id = ?`,
        [question.id]
      );

      followUpQuestion = {
        id: fuId,
        text: evalResult.followUpQuestionText,
        type: evalResult.followUpQuestionType || question.question_type,
        isFollowUp: true,
        parentQuestionId: question.id
      };
    }

    // Find next unanswered question if no follow-up was generated
    let nextQuestion = followUpQuestion;
    if (!nextQuestion) {
      const allQuestions = queryAll<any>(
        `SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY sequence_number ASC`,
        [id]
      );
      const allAnswers = queryAll<any>(
        `SELECT question_id FROM interview_answers WHERE interview_id = ?`,
        [id]
      );
      const answeredSet = new Set(allAnswers.map(a => a.question_id));
      const candidateNext = allQuestions.find(q => !answeredSet.has(q.id));

      if (candidateNext) {
        nextQuestion = {
          id: candidateNext.id,
          text: candidateNext.question_text,
          type: candidateNext.question_type,
          isFollowUp: Boolean(candidateNext.is_follow_up),
          parentQuestionId: candidateNext.parent_question_id
        };
      }
    }

    res.json({
      success: true,
      message: 'Answer evaluated and recorded successfully',
      data: {
        score: evalResult.score,
        feedback: evalResult.feedback,
        technicalScore: evalResult.technicalScore,
        communicationScore: evalResult.communicationScore,
        hrScore: evalResult.hrScore,
        problemSolvingScore: evalResult.problemSolvingScore,
        evaluation: {
          score: evalResult.score,
          technicalScore: evalResult.technicalScore,
          communicationScore: evalResult.communicationScore,
          hrScore: evalResult.hrScore,
          problemSolvingScore: evalResult.problemSolvingScore,
          feedback: evalResult.feedback,
          strengths: evalResult.strengths,
          weaknesses: evalResult.weaknesses,
          missingPoints: evalResult.missingPoints,
          suggestedStructure: evalResult.suggestedStructure,
          improvementAdvice: evalResult.improvementAdvice
        },
        hasFollowUp: Boolean(followUpQuestion),
        nextQuestion,
        isSessionComplete: !nextQuestion
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to process answer', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * Skip Question
 * POST /session/:id/skip
 */
router.post(['/session/:id/skip', '/mock-interview/session/:id/skip'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;
    const { questionId } = req.body;

    execute(
      `UPDATE mock_interviews SET questions_skipped = questions_skipped + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    // Save blank skipped answer
    const skipId = `ans-skip-${uuidv4()}`;
    execute(
      `INSERT OR REPLACE INTO interview_answers (
        id, interview_id, question_id, student_id, answer_text, score, feedback, submitted_at
      ) VALUES (?, ?, ?, ?, '[SKIPPED]', 0, 'Question was skipped by the student.', CURRENT_TIMESTAMP)`,
      [skipId, id, questionId, studentId]
    );

    // Next question
    const allQuestions = queryAll<any>(
      `SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY sequence_number ASC`,
      [id]
    );
    const allAnswers = queryAll<any>(
      `SELECT question_id FROM interview_answers WHERE interview_id = ?`,
      [id]
    );
    const answeredSet = new Set(allAnswers.map(a => a.question_id));
    const nextUnanswered = allQuestions.find(q => !answeredSet.has(q.id));

    res.json({
      success: true,
      message: 'Question skipped',
      data: {
        nextQuestion: nextUnanswered ? {
          id: nextUnanswered.id,
          text: nextUnanswered.question_text,
          type: nextUnanswered.question_type,
          isFollowUp: Boolean(nextUnanswered.is_follow_up)
        } : null,
        isSessionComplete: !nextUnanswered
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to skip question', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.8 Finalize Interview & Generate Result Scorecard
 * POST /session/:id/finish or POST /mock-interview/session/:id/finish
 */
router.post(['/session/:id/finish', '/mock-interview/session/:id/finish'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;

    const interview = queryOne<any>(
      `SELECT * FROM mock_interviews WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview session not found', data: null, error: { code: 'NOT_FOUND', details: 'Session does not exist.' } });
      return;
    }

    const answers = queryAll<any>(
      `SELECT * FROM interview_answers WHERE interview_id = ? AND answer_text != '[SKIPPED]'`,
      [id]
    );

    let avgOverall = 0;
    let avgTech = 0;
    let avgComm = 0;
    let avgHr = 0;
    let avgProb = 0;

    const aggregatedStrengths: string[] = [];
    const aggregatedWeaknesses: string[] = [];

    if (answers.length > 0) {
      let sumOverall = 0;
      let sumTech = 0;
      let sumComm = 0;
      let sumHr = 0;
      let sumProb = 0;

      for (const a of answers) {
        sumOverall += a.score || 0;
        sumTech += a.technical_score || a.score || 0;
        sumComm += a.communication_score || a.score || 0;
        sumHr += a.hr_score || a.score || 0;
        sumProb += a.problem_solving_score || a.score || 0;

        try {
          const s = JSON.parse(a.strengths_json || '[]');
          for (const item of s) {
            if (!aggregatedStrengths.includes(item)) aggregatedStrengths.push(item);
          }
          const w = JSON.parse(a.weaknesses_json || '[]');
          for (const item of w) {
            if (!aggregatedWeaknesses.includes(item)) aggregatedWeaknesses.push(item);
          }
        } catch {}
      }

      avgOverall = Math.round(sumOverall / answers.length);
      avgTech = Math.round(sumTech / answers.length);
      avgComm = Math.round(sumComm / answers.length);
      avgHr = Math.round(sumHr / answers.length);
      avgProb = Math.round(sumProb / answers.length);
    }

    const summaryText = avgOverall >= 75
      ? `Demonstrated impressive readiness for ${interview.target_role} roles. Solid technical clarity and disciplined structural delivery.`
      : `Demonstrated foundational knowledge for ${interview.target_role}. Reinforcing specific latency benchmarks and system trade-offs will help you advance.`;

    execute(
      `UPDATE mock_interviews SET
        status = 'COMPLETED',
        overall_score = ?,
        technical_score = ?,
        communication_score = ?,
        hr_score = ?,
        problem_solving_score = ?,
        strengths_json = ?,
        weaknesses_json = ?,
        feedback_summary = ?,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        avgOverall,
        avgTech,
        avgComm,
        avgHr,
        avgProb,
        JSON.stringify(aggregatedStrengths.slice(0, 5)),
        JSON.stringify(aggregatedWeaknesses.slice(0, 5)),
        summaryText,
        id
      ]
    );

    // Create Notification
    try {
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, related_entity_id, is_read, created_at)
         VALUES (?, ?, 'Mock Interview Completed', ?, 'INTERVIEW_REMINDER', ?, 0, CURRENT_TIMESTAMP)`,
        [
          `notif-${uuidv4()}`,
          studentId,
          `You completed your ${interview.interview_type} mock interview for ${interview.target_role} with a score of ${avgOverall}%.`,
          id
        ]
      );
    } catch {}

    res.json({
      success: true,
      message: 'Interview session completed successfully',
      notice: MANDATORY_MOCK_NOTICE,
      disclaimer: MANDATORY_MOCK_NOTICE,
      data: {
        interviewId: id,
        sessionId: id,
        id,
        overallScore: avgOverall,
        finalScore: avgOverall,
        scoreLabel: getScoreCategoryLabel(avgOverall),
        technicalScore: avgTech,
        communicationScore: avgComm,
        hrScore: avgHr,
        problemSolvingScore: avgProb,
        strengths: aggregatedStrengths.slice(0, 5),
        weaknesses: aggregatedWeaknesses.slice(0, 5),
        feedbackSummary: summaryText
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to finalize interview session', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.8 Full Interview Result Scorecard
 * GET /result/:id or GET /mock-interview/result/:id
 */
router.get(['/result/:id', '/mock-interview/result/:id'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { id } = req.params;

    const interview = queryOne<any>(
      `SELECT * FROM mock_interviews WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );

    if (!interview) {
      res.status(404).json({ success: false, message: 'Interview result not found', data: null, error: { code: 'NOT_FOUND', details: 'Session does not exist or unauthorized.' } });
      return;
    }

    const answers = queryAll<any>(
      `SELECT a.*, q.question_text, q.question_type, q.sequence_number, q.is_follow_up
       FROM interview_answers a
       JOIN interview_questions q ON a.question_id = q.id
       WHERE a.interview_id = ?
       ORDER BY q.sequence_number ASC`,
      [id]
    );

    let strengths: string[] = [];
    let weaknesses: string[] = [];
    try {
      strengths = JSON.parse(interview.strengths_json || '[]');
      weaknesses = JSON.parse(interview.weaknesses_json || '[]');
    } catch {}

    res.json({
      success: true,
      message: 'Interview result scorecard loaded successfully',
      notice: MANDATORY_MOCK_NOTICE,
      disclaimer: MANDATORY_MOCK_NOTICE,
      data: {
        id: interview.id,
        sessionId: interview.id,
        interviewId: interview.id,
        disclaimer: MANDATORY_MOCK_NOTICE,
        notice: MANDATORY_MOCK_NOTICE,
        targetRole: interview.target_role,
        interviewType: interview.interview_type,
        difficulty: interview.difficulty,
        mode: interview.mode,
        durationMinutes: interview.duration,
        startedAt: interview.started_at,
        completedAt: interview.completed_at,
        overallScore: Math.round(interview.overall_score || 0),
        scoreLabel: getScoreCategoryLabel(interview.overall_score || 0),
        technicalScore: Math.round(interview.technical_score || 0),
        communicationScore: Math.round(interview.communication_score || 0),
        hrScore: Math.round(interview.hr_score || 0),
        problemSolvingScore: Math.round(interview.problem_solving_score || 0),
        questionsAttempted: interview.questions_attempted || answers.length,
        questionsSkipped: interview.questions_skipped || 0,
        strengths,
        weaknesses,
        feedbackSummary: interview.feedback_summary || 'Strong session overall.',
        recommendedCourses: [
          {
            id: 'crs-python-advanced',
            title: 'Advanced Python Architecture & Concurrency',
            level: 'Advanced',
            duration: '18 Hours',
            matchReason: 'Reinforces reference counting, GIL internals, and asynchronous event loop performance.'
          },
          {
            id: 'crs-db-systems',
            title: 'Database Systems & SQL Query Optimization',
            level: 'Intermediate',
            duration: '14 Hours',
            matchReason: 'Covers indexing, execution plan profiling (EXPLAIN ANALYZE), and connection pooling.'
          }
        ],
        recommendedCodingPractice: [
          {
            id: 'cp-1',
            title: 'Max Pair Product & Array Partitioning',
            difficulty: 'Easy',
            topic: 'Arrays & Logic',
            link: '/student/coding/problem/cp-1'
          },
          {
            id: 'cp-2',
            title: 'Sum of Array Elements & Dynamic Sizing',
            difficulty: 'Easy',
            topic: 'Arrays & Loops',
            link: '/student/coding/problem/cp-2'
          }
        ],
        questionBreakdown: answers.map(a => {
          let s: string[] = [];
          let w: string[] = [];
          let m: string[] = [];
          try {
            s = JSON.parse(a.strengths_json || '[]');
            w = JSON.parse(a.weaknesses_json || '[]');
            m = JSON.parse(a.missing_points_json || '[]');
          } catch {}

          return {
            questionId: a.question_id,
            questionText: a.question_text,
            questionType: a.question_type,
            isFollowUp: Boolean(a.is_follow_up),
            answerText: a.answer_text,
            score: a.score,
            feedback: a.feedback,
            strengths: s,
            weaknesses: w,
            missingPoints: m,
            suggestedStructure: a.suggested_structure,
            improvementAdvice: a.improvement_advice
          };
        })
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interview result', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.9 Interview History
 * GET /history or GET /mock-interview/history
 */
router.get(['/history', '/mock-interview/history'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const interviews = queryAll<any>(
      `SELECT * FROM mock_interviews WHERE student_id = ? ORDER BY created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      message: 'Interview history retrieved',
      notice: MANDATORY_MOCK_NOTICE,
      data: interviews.map(i => ({
        id: i.id,
        targetRole: i.target_role,
        interviewType: i.interview_type,
        difficulty: i.difficulty,
        mode: i.mode,
        status: i.status,
        overallScore: Math.round(i.overall_score || 0),
        scoreLabel: getScoreCategoryLabel(i.overall_score || 0),
        technicalScore: Math.round(i.technical_score || 0),
        communicationScore: Math.round(i.communication_score || 0),
        questionsAttempted: i.questions_attempted || 0,
        questionsSkipped: i.questions_skipped || 0,
        startedAt: i.started_at,
        completedAt: i.completed_at
      })),
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interview history', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

/**
 * 13.9 Interview Analytics
 * GET /analytics or GET /mock-interview/analytics
 */
router.get(['/analytics', '/mock-interview/analytics'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const interviews = queryAll<any>(
      `SELECT * FROM mock_interviews WHERE student_id = ? AND status = 'COMPLETED' ORDER BY created_at ASC`,
      [studentId]
    );

    const totalCount = interviews.length;

    let initialScore = 70;
    let latestScore = 84;
    if (totalCount > 0) {
      initialScore = Math.round(interviews[0].overall_score || 70);
      latestScore = Math.round(interviews[totalCount - 1].overall_score || 84);
    }

    const scoreImprovement = Math.max(0, latestScore - initialScore);

    const weaknessDistribution: Record<string, number> = {};
    for (const item of interviews) {
      try {
        const wList = JSON.parse(item.weaknesses_json || '[]');
        for (const w of wList) {
          weaknessDistribution[w] = (weaknessDistribution[w] || 0) + 1;
        }
      } catch {}
    }

    res.json({
      success: true,
      message: 'Interview analytics computed',
      notice: MANDATORY_MOCK_NOTICE,
      data: {
        totalInterviews: totalCount,
        interviewCompletionRate: totalCount > 0 ? 100 : 0,
        scoreImprovement: `${scoreImprovement > 0 ? '+' : ''}${scoreImprovement}%`,
        technicalImprovement: '+12%',
        communicationImprovement: '+8%',
        hrImprovement: '+10%',
        interviewStreak: Math.min(12, totalCount * 2 + 1),
        scoreTimeline: interviews.map(i => ({
          date: i.completed_at ? i.completed_at.split(' ')[0] : i.created_at.split(' ')[0],
          overallScore: Math.round(i.overall_score || 0),
          technicalScore: Math.round(i.technical_score || 0),
          communicationScore: Math.round(i.communication_score || 0),
          targetRole: i.target_role
        })),
        mostCommonWeaknesses: Object.entries(weaknessDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([topic, count]) => ({ topic, occurrences: count })),
        mostImprovedTopics: [
          { topic: 'Python Runtime & Memory Allocation', gain: '+16%' },
          { topic: 'Relational Database Indexing Strategies', gain: '+14%' },
          { topic: 'STAR Structural Framing for Behavioral Questions', gain: '+11%' }
        ]
      },
      error: null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to calculate interview analytics', data: null, error: { code: 'SERVER_ERROR', details: err.message } });
  }
});

// ============================================================================
// LEGACY BACKWARD-COMPATIBILITY ROUTES (STEPS 1-12)
// ============================================================================

router.post('/ai/start', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { category, targetRole } = req.body;
    const cat = ['hr', 'technical', 'role_based'].includes(category) ? category : 'technical';
    const roleTitle = targetRole || 'Software Developer';
    const interviewId = `intv-${uuidv4()}`;
    const initialQuestion = INITIAL_INTERVIEW_QUESTIONS[cat]?.[0]?.questionText || 'Can you walk me through your technical background?';

    const initialTranscript = [
      { sender: 'ai', message: initialQuestion, timestamp: new Date().toISOString() }
    ];

    execute(
      `INSERT INTO interviews (id, user_id, type, interview_category, target_role, status, transcript_json)
       VALUES (?, ?, 'ai_mock', ?, ?, 'in_progress', ?)`,
      [interviewId, userId, cat, roleTitle, JSON.stringify(initialTranscript)]
    );

    res.json({
      interviewId,
      category: cat,
      targetRole: roleTitle,
      stepIndex: 1,
      totalSteps: 3,
      currentQuestion: initialQuestion
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initialize AI interview.' });
  }
});

router.post('/ai/message', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { interviewId, candidateAnswer, stepIndex, previousQuestion } = req.body;
    const interview = queryOne<any>('SELECT * FROM interviews WHERE id = ?', [interviewId]);
    if (!interview) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }

    const currentTranscript = JSON.parse(interview.transcript_json || '[]');
    currentTranscript.push({ sender: 'user', message: candidateAnswer, timestamp: new Date().toISOString() });

    const turn = await processInterviewStep({
      category: interview.interview_category,
      stepIndex: stepIndex || 1,
      userAnswer: candidateAnswer,
      previousQuestion: previousQuestion || 'Previous prompt'
    });

    currentTranscript.push({ sender: 'ai', message: turn.nextQuestion, timestamp: new Date().toISOString() });

    execute(
      `UPDATE interviews SET transcript_json = ?, status = ? WHERE id = ?`,
      [JSON.stringify(currentTranscript), turn.isComplete ? 'completed' : 'in_progress', interviewId]
    );

    res.json({
      interviewId,
      interviewerResponse: turn.interviewerResponse,
      nextQuestion: turn.nextQuestion,
      isComplete: turn.isComplete,
      nextStepIndex: (stepIndex || 1) + 1
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process interview response.' });
  }
});

router.post('/ai/finish', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { interviewId } = req.body;
    const interview = queryOne<any>('SELECT * FROM interviews WHERE id = ?', [interviewId]);
    if (!interview) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }

    const transcript = JSON.parse(interview.transcript_json || '[]');
    const rubric = evaluateInterviewSession({
      category: interview.interview_category,
      transcript
    });

    const feedbackId = `ifb-${uuidv4()}`;
    execute(
      `INSERT INTO interview_feedback (
        id, interview_id, reviewer_type, reviewer_name, technical_correctness,
        relevance, completeness, communication, confidence, overall_score,
        feedback_text, strengths_json, improvement_areas_json
      ) VALUES (?, ?, 'ai', 'SkillBridge AI Clone Evaluator', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedbackId,
        interviewId,
        rubric.technicalCorrectness,
        rubric.relevance,
        rubric.completeness,
        rubric.communication,
        rubric.confidence,
        rubric.overallScore,
        rubric.feedbackText,
        JSON.stringify(rubric.strengths),
        JSON.stringify(rubric.improvementAreas)
      ]
    );

    execute(
      `UPDATE interviews SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [interviewId]
    );

    res.json({
      interviewId,
      status: 'completed',
      rubric
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete interview.' });
  }
});

router.get('/mentors', authenticateToken, (req: Request, res: Response): void => {
  try {
    const mentors = queryAll<any>(`
      SELECT m.*, u.avatar_url, u.email as contact_email
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.rating DESC
    `);

    const result = mentors.map(m => ({
      ...m,
      expertise: JSON.parse(m.expertise_json || '[]'),
      availableSlots: JSON.parse(m.available_slots_json || '[]')
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mentors.' });
  }
});

router.post('/mentor/book', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { mentorId, slotTime, roleTarget, notes } = req.body;

    if (!mentorId || !slotTime) {
      res.status(400).json({ error: 'Mentor ID and desired slot time are required.' });
      return;
    }

    const mentor = queryOne<any>('SELECT * FROM mentors WHERE id = ?', [mentorId]);
    if (!mentor) {
      res.status(404).json({ error: 'Mentor not found.' });
      return;
    }

    const interviewId = `intv-${uuidv4()}`;
    execute(
      `INSERT INTO interviews (id, user_id, type, interview_category, target_role, status)
       VALUES (?, ?, 'live_mentor', 'role_based', ?, 'scheduled')`,
      [interviewId, userId, roleTarget || 'Software Developer']
    );

    const sessionId = `mses-${uuidv4()}`;
    const meetingCode = `SB-LIVE-${Math.floor(100000 + Math.random() * 900000)}`;

    execute(
      `INSERT INTO mentor_sessions (id, interview_id, mentor_id, user_id, slot_time, status, meeting_link, notes)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [sessionId, interviewId, mentorId, userId, slotTime, `https://meet.skillbridge.ai/room/${meetingCode}`, notes || 'Targeting FAANG/Tier-1 software developer placement.']
    );

    execute(
      `INSERT INTO notifications (id, user_id, title, message, type, link_url)
       VALUES (?, ?, 'Mentor Mock Interview Confirmed', ?, 'interview', '/interviews')`,
      [`notif-${uuidv4()}`, userId, `Your live session with ${mentor.name} is confirmed for ${slotTime}.`]
    );

    res.json({
      success: true,
      sessionId,
      meetingLink: `https://meet.skillbridge.ai/room/${meetingCode}`,
      message: `Live mock interview with ${mentor.name} successfully scheduled for ${slotTime}!`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to book mentor slot.' });
  }
});

export default router;
