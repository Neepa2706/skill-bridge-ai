import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { executeCodeInSandbox } from '../services/sandbox/secureCodeRunner.js';
import { generateCodingHint } from '../services/ai/codingHintAssistant.js';
import { generateCodingFeedback } from '../services/ai/codingFeedbackEngine.js';

const router = Router();

// ============================================================================
// 1. CODING DASHBOARD OVERVIEW
// GET /student/coding or /api/student/coding or /api/coding
// ============================================================================
router.get(['/', '/dashboard'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;

    // Get student profile
    const profile = queryOne('SELECT current_level, target_role_id FROM student_profiles WHERE user_id = ?', [studentId]);
    const codingLevel = profile?.current_level || 'Beginner';

    // Get streak record
    const streak = queryOne('SELECT * FROM coding_streaks WHERE student_id = ?', [studentId]);
    const currentStreak = streak?.current_streak || 0;
    const longestStreak = streak?.longest_streak || 0;
    const totalActiveDays = streak?.total_active_days || 0;
    const lastActivityDate = streak?.last_activity_date || null;
    const calendar = JSON.parse(streak?.streak_calendar_json || '[]');
    const badges = JSON.parse(streak?.badges_json || '[]');

    // Get solved problems
    const solvedRows = queryAll(
      `SELECT DISTINCT problem_id FROM coding_submissions WHERE student_id = ? AND status = 'ACCEPTED'`,
      [studentId]
    );
    const solvedProblemIds = new Set(solvedRows.map(r => r.problem_id));

    // Get total submissions & accuracy
    const allSubmissions = queryAll(
      `SELECT status, score FROM coding_submissions WHERE student_id = ?`,
      [studentId]
    );
    const totalSubmissions = allSubmissions.length;
    const acceptedSubmissions = allSubmissions.filter(s => s.status === 'ACCEPTED').length;
    const accuracyRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // Difficulty breakdown of solved problems
    const allProblems = queryAll('SELECT id, title, difficulty, topic FROM coding_problems WHERE status = ?', ['published']);
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const p of allProblems) {
      if (solvedProblemIds.has(p.id)) {
        if (p.difficulty === 'easy') easySolved++;
        else if (p.difficulty === 'medium') mediumSolved++;
        else if (p.difficulty === 'hard') hardSolved++;
      }
    }

    // Recent submissions
    const recentSubmissions = queryAll(
      `SELECT s.id, s.problem_id, p.title as problem_title, p.difficulty, s.language, s.status, s.score, s.execution_time_ms, s.submitted_at
       FROM coding_submissions s
       JOIN coding_problems p ON s.problem_id = p.id
       WHERE s.student_id = ?
       ORDER BY s.submitted_at DESC
       LIMIT 5`,
      [studentId]
    );

    // Recommended problems (unsolved first, matching level)
    const recommendedProblems = allProblems
      .filter(p => !solvedProblemIds.has(p.id))
      .slice(0, 4)
      .map(p => ({
        ...p,
        isSolved: false
      }));

    // Continue practice problem
    const continueProblem = recommendedProblems[0] || allProblems[0] || null;

    res.json({
      codingLevel,
      currentStreak,
      longestStreak,
      totalActiveDays,
      lastActivityDate,
      calendar,
      badges,
      problemsSolved: solvedProblemIds.size,
      totalProblems: allProblems.length,
      totalSubmissions,
      accuracyRate,
      difficultyBreakdown: {
        easy: easySolved,
        medium: mediumSolved,
        hard: hardSolved
      },
      recentActivity: recentSubmissions,
      recommendedProblems,
      continueProblem
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load coding dashboard.' });
  }
});

// ============================================================================
// 2. CODING PROBLEMS CATALOG
// GET /problems
// ============================================================================
router.get('/problems', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { language, difficulty, topic, status, search, recommended } = req.query;

    let sql = `SELECT id, title, description, difficulty, topic, supported_languages_json, time_limit_ms, memory_limit_mb, created_at FROM coding_problems WHERE status = 'published'`;
    const params: any[] = [];

    if (difficulty && difficulty !== 'all') {
      sql += ` AND difficulty = ?`;
      params.push(difficulty);
    }

    if (topic && topic !== 'all') {
      sql += ` AND topic = ?`;
      params.push(topic);
    }

    if (search) {
      sql += ` AND (title LIKE ? OR description LIKE ? OR topic LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END ASC, created_at ASC`;

    const rawProblems = queryAll(sql, params);

    // Get solved set and attempts count
    const studentSubs = queryAll(
      `SELECT problem_id, status, score FROM coding_submissions WHERE student_id = ?`,
      [studentId]
    );

    const solvedSet = new Set<string>();
    const bestScores: Record<string, number> = {};
    const attemptCounts: Record<string, number> = {};

    for (const sub of studentSubs) {
      attemptCounts[sub.problem_id] = (attemptCounts[sub.problem_id] || 0) + 1;
      if (sub.status === 'ACCEPTED') {
        solvedSet.add(sub.problem_id);
      }
      bestScores[sub.problem_id] = Math.max(bestScores[sub.problem_id] || 0, sub.score || 0);
    }

    let results = rawProblems.map(p => {
      let langs: string[] = ['python', 'c', 'cpp'];
      try {
        langs = JSON.parse(p.supported_languages_json || '["python","c","cpp"]');
      } catch {}

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        topic: p.topic,
        supportedLanguages: langs,
        timeLimitMs: p.time_limit_ms,
        memoryLimitMb: p.memory_limit_mb,
        isSolved: solvedSet.has(p.id),
        bestScore: bestScores[p.id] || 0,
        attemptsCount: attemptCounts[p.id] || 0
      };
    });

    // Language filter (client or query)
    if (language && language !== 'all') {
      results = results.filter(p => p.supportedLanguages.includes(String(language).toLowerCase()));
    }

    // Status filter
    if (status === 'solved') {
      results = results.filter(p => p.isSolved);
    } else if (status === 'unsolved') {
      results = results.filter(p => !p.isSolved);
    }

    // Recommended filter
    if (recommended === 'true') {
      results = results.filter(p => !p.isSolved);
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list coding problems.' });
  }
});

// ============================================================================
// 3. PROBLEM DETAILS (PRIVATE TEST CASES STRICTLY MASKED)
// GET /problems/:problemId
// ============================================================================
router.get('/problems/:problemId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { problemId } = req.params;

    const problem = queryOne('SELECT * FROM coding_problems WHERE id = ?', [problemId]);
    if (!problem) {
      res.status(404).json({ error: 'Coding problem not found.' });
      return;
    }

    // Fetch ONLY public test cases for the problem specifications
    const publicCases = queryAll(
      `SELECT id, input, expected_output, marks, order_index FROM coding_test_cases WHERE problem_id = ? AND is_public = 1 ORDER BY order_index ASC`,
      [problemId]
    );

    // Parse starter code
    let starterCode: Record<string, string> = {};
    try {
      starterCode = JSON.parse(problem.starter_code_json || '{}');
    } catch {}

    // Parse supported languages
    let supportedLanguages: string[] = ['python', 'c', 'cpp'];
    try {
      supportedLanguages = JSON.parse(problem.supported_languages_json || '["python","c","cpp"]');
    } catch {}

    // Check student status
    const studentSubs = queryAll(
      `SELECT status, score FROM coding_submissions WHERE student_id = ? AND problem_id = ?`,
      [studentId, problemId]
    );
    const isSolved = studentSubs.some(s => s.status === 'ACCEPTED');
    const bestScore = studentSubs.reduce((acc, s) => Math.max(acc, s.score || 0), 0);

    // Log activity: PROBLEM_VIEWED
    execute(
      `INSERT INTO coding_activities (id, student_id, problem_id, activity_type, duration_seconds) VALUES (?, ?, ?, ?, ?)`,
      [`act-${uuidv4()}`, studentId, problemId, 'PROBLEM_VIEWED', 0]
    );

    res.json({
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      topic: problem.topic,
      supportedLanguages,
      inputFormat: problem.input_format,
      outputFormat: problem.output_format,
      constraints: problem.constraints,
      sampleInput: problem.sample_input,
      sampleOutput: problem.sample_output,
      explanation: problem.explanation,
      starterCode,
      functionSignature: problem.function_signature,
      timeLimitMs: problem.time_limit_ms,
      memoryLimitMb: problem.memory_limit_mb,
      publicTestCases: publicCases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expected_output,
        marks: tc.marks,
        orderIndex: tc.order_index
      })),
      isSolved,
      bestScore
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch problem details.' });
  }
});

// ============================================================================
// 4. RUN CODE (DRY RUN AGAINST PUBLIC TEST CASES ONLY)
// POST /problems/:problemId/run or POST /run
// ============================================================================
router.post(['/problems/:problemId/run', '/run'], authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const problemId = req.params.problemId || req.body.problemId;
    const { language, code } = req.body;

    if (!language || !code || code.trim().length === 0) {
      res.status(400).json({ error: 'Language and code are required.' });
      return;
    }

    // Fetch problem
    const problem = queryOne('SELECT * FROM coding_problems WHERE id = ?', [problemId]);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }

    // Fetch ONLY public test cases
    const testCases = queryAll(
      `SELECT input, expected_output, is_public FROM coding_test_cases WHERE problem_id = ? AND is_public = 1 ORDER BY order_index ASC`,
      [problemId]
    );

    if (testCases.length === 0) {
      // Fallback to sample input/output if no test cases defined
      testCases.push({
        input: problem.sample_input || '',
        expected_output: problem.sample_output || '',
        is_public: 1
      });
    }

    // Execute in secure sandbox
    const result = await executeCodeInSandbox({
      language,
      code,
      testCases: testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expected_output,
        isPublic: true
      })),
      timeLimitMs: problem.time_limit_ms || 2000,
      memoryLimitMb: problem.memory_limit_mb || 128,
      isSubmission: false
    });

    // Log activity: CODE_RUN
    execute(
      `INSERT INTO coding_activities (id, student_id, problem_id, activity_type, duration_seconds) VALUES (?, ?, ?, ?, ?)`,
      [`act-${uuidv4()}`, studentId, problemId, 'CODE_RUN', Math.round(result.executionTimeMs / 1000)]
    );

    res.json({
      status: result.status,
      score: result.score,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      executionTimeMs: result.executionTimeMs,
      memoryUsedMb: result.memoryUsedMb,
      compilerOutput: result.compilerOutput,
      runtimeOutput: result.runtimeOutput,
      errorOutput: result.errorOutput,
      testResults: result.testResults,
      userFriendlyMessage: result.userFriendlyMessage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Execution failed.' });
  }
});

// ============================================================================
// 5. SUBMIT CODE (EVALUATES PUBLIC + PRIVATE BENCHMARKS)
// POST /problems/:problemId/submit or POST /submit
// ============================================================================
router.post(['/problems/:problemId/submit', '/submit'], authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const problemId = req.params.problemId || req.body.problemId;
    const { language, code } = req.body;

    if (!language || !code || code.trim().length === 0) {
      res.status(400).json({ error: 'Language and source code are required.' });
      return;
    }

    // Fetch problem
    const problem = queryOne('SELECT * FROM coding_problems WHERE id = ?', [problemId]);
    if (!problem) {
      res.status(404).json({ error: 'Coding challenge not found.' });
      return;
    }

    // Fetch ALL test cases (both public and hidden private)
    const allCases = queryAll(
      `SELECT id, input, expected_output, is_public, marks FROM coding_test_cases WHERE problem_id = ? ORDER BY order_index ASC`,
      [problemId]
    );

    if (allCases.length === 0) {
      allCases.push({
        id: 'tc-default',
        input: problem.sample_input || '',
        expected_output: problem.sample_output || '',
        is_public: 1,
        marks: 10
      });
    }

    // Execute in isolated sandbox against ALL test cases
    const execution = await executeCodeInSandbox({
      language,
      code,
      testCases: allCases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expected_output,
        isPublic: Boolean(tc.is_public),
        marks: tc.marks
      })),
      timeLimitMs: problem.time_limit_ms || 2000,
      memoryLimitMb: problem.memory_limit_mb || 128,
      isSubmission: true
    });

    const submissionId = `sub-${uuidv4()}`;
    const isAccepted = execution.status === 'ACCEPTED';

    // 1. Generate AI Diagnostic Feedback
    const aiFeedback = await generateCodingFeedback({
      problemTitle: problem.title,
      topic: problem.topic,
      difficulty: problem.difficulty,
      language,
      code,
      status: execution.status,
      passedTests: execution.passedTests,
      totalTests: execution.totalTests,
      executionTimeMs: execution.executionTimeMs,
      memoryUsedMb: execution.memoryUsedMb,
      compilerOutput: execution.compilerOutput,
      runtimeOutput: execution.runtimeOutput
    });

    // 2. Save complete submission record with test results and AI feedback
    execute(
      `INSERT INTO coding_submissions (
        id, student_id, user_id, problem_id, language, source_code, status, score,
        passed_test_cases, total_test_cases, execution_time_ms, memory_used_mb,
        compiler_output, runtime_output, test_results_json, ai_feedback_json, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        submissionId,
        studentId,
        studentId,
        problemId,
        language,
        code,
        execution.status,
        execution.score,
        execution.passedTests,
        execution.totalTests,
        execution.executionTimeMs,
        execution.memoryUsedMb,
        execution.compilerOutput || null,
        execution.runtimeOutput || null,
        JSON.stringify(execution.testResults),
        JSON.stringify(aiFeedback)
      ]
    );

    // 3. Log activity
    execute(
      `INSERT INTO coding_activities (id, student_id, problem_id, activity_type, duration_seconds) VALUES (?, ?, ?, ?, ?)`,
      [`act-${uuidv4()}`, studentId, problemId, isAccepted ? 'PROBLEM_SOLVED' : 'CODE_SUBMITTED', Math.round(execution.executionTimeMs / 1000)]
    );

    // 4. Update Coding Streak if meaningful submission or solved
    let streakInfo: any = null;
    if (isAccepted || execution.score > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const streakRecord = queryOne('SELECT * FROM coding_streaks WHERE student_id = ? OR user_id = ?', [studentId, studentId]);

      let currentStreak = streakRecord?.current_streak || 0;
      let longestStreak = streakRecord?.longest_streak || 0;
      let totalActiveDays = streakRecord?.total_active_days || 0;
      let calendar: Array<{ date: string; count: number }> = JSON.parse(streakRecord?.streak_calendar_json || '[]');
      let badges: Array<{ id: string; title: string; desc: string }> = JSON.parse(streakRecord?.badges_json || '[]');

      const lastDate = streakRecord?.last_activity_date;

      if (!lastDate) {
        currentStreak = 1;
        totalActiveDays = 1;
      } else {
        const last = new Date(lastDate);
        const today = new Date(todayStr);
        const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 1) {
          currentStreak += 1;
          totalActiveDays += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
          totalActiveDays += 1;
        }
        // Same day: streak stays the same, calendar count increments
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Update calendar activity
      const existingEntry = calendar.find(c => c.date === todayStr);
      if (existingEntry) {
        existingEntry.count += 1;
      } else {
        calendar.push({ date: todayStr, count: 1 });
      }

      // Check for Milestone Badges
      if (currentStreak >= 3 && !badges.find(b => b.id === 'b-streak-3')) {
        badges.push({ id: 'b-streak-3', title: '🔥 3-Day Flame Streak', desc: 'Maintained consistency for 3 continuous coding days.' });
      }
      if (currentStreak >= 7 && !badges.find(b => b.id === 'b-streak-7')) {
        badges.push({ id: 'b-streak-7', title: '⚡ 7-Day Algorithm Master', desc: 'Solved coding challenges for 7 continuous days.' });
      }
      if (isAccepted && !badges.find(b => b.id === 'b-first-solve')) {
        badges.push({ id: 'b-first-solve', title: '⭐ First Breakthrough', desc: 'Solved your first algorithmic challenge with 100% accuracy.' });
      }

      execute(
        `INSERT OR REPLACE INTO coding_streaks (
          id, student_id, user_id, current_streak, longest_streak, total_active_days,
          last_activity_date, streak_calendar_json, badges_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          streakRecord?.id || `strk-${uuidv4()}`,
          studentId,
          studentId,
          currentStreak,
          longestStreak,
          totalActiveDays,
          todayStr,
          JSON.stringify(calendar),
          JSON.stringify(badges)
        ]
      );

      streakInfo = {
        currentStreak,
        longestStreak,
        totalActiveDays,
        badges
      };

      // 5. Update Coding Skill Evidence
      const topicLower = problem.topic.toLowerCase();
      let primarySkillId = 'skl-py';
      if (topicLower.includes('array') || topicLower.includes('data structure') || topicLower.includes('pointer') || topicLower.includes('search') || topicLower.includes('sort')) {
        primarySkillId = 'skl-dsa';
      } else if (topicLower.includes('logic') || topicLower.includes('conditional') || topicLower.includes('operator')) {
        primarySkillId = 'skl-ps';
      }

      execute(
        `INSERT INTO coding_skill_evidence (id, student_id, problem_id, submission_id, skill_id, score, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`cse-${uuidv4()}`, studentId, problemId, submissionId, primarySkillId, execution.score, problem.difficulty]
      );

      // Record in student_skill_history (Step 5 integration)
      execute(
        `INSERT INTO student_skill_history (id, user_id, skill_id, level, score, confidence, source, assessment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ssh-${uuidv4()}`,
          studentId,
          primarySkillId,
          execution.score >= 80 ? 'Proficient' : 'Developing',
          execution.score,
          'High',
          'coding_challenge',
          problemId
        ]
      );

      // Dispatch Notification
      execute(
        `INSERT INTO notifications (id, user_id, title, message, type, link_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `notif-${uuidv4()}`,
          studentId,
          isAccepted ? `Challenge Solved: ${problem.title} 🎉` : `Coding Attempt Evaluated`,
          isAccepted
            ? `Outstanding! You passed all test cases for "${problem.title}". Score: 100%.`
            : `Your solution for "${problem.title}" scored ${execution.score}%. Check AI diagnostic feedback.`,
          'test',
          `/student/coding/submissions/${submissionId}`
        ]
      );
    }

    res.json({
      submissionId,
      status: execution.status,
      score: execution.score,
      passedTests: execution.passedTests,
      totalTests: execution.totalTests,
      executionTimeMs: execution.executionTimeMs,
      memoryUsedMb: execution.memoryUsedMb,
      compilerOutput: execution.compilerOutput,
      runtimeOutput: execution.runtimeOutput,
      errorOutput: execution.errorOutput,
      userFriendlyMessage: execution.userFriendlyMessage,
      testResults: execution.testResults,
      streak: streakInfo,
      feedback: aiFeedback
    });
  } catch (err: any) {
    console.error('[Coding Submit Error]', err);
    res.status(500).json({ error: err.message || 'Submission failed.' });
  }
});

// ============================================================================
// 6. SUBMISSION HISTORY & DETAILS
// GET /submissions and GET /submissions/:submissionId
// ============================================================================
router.get('/submissions', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { problemId } = req.query;

    let sql = `
      SELECT s.id, s.problem_id, p.title as problem_title, p.difficulty, p.topic,
             s.language, s.status, s.score, s.passed_test_cases, s.total_test_cases,
             s.execution_time_ms, s.memory_used_mb, s.submitted_at
      FROM coding_submissions s
      JOIN coding_problems p ON s.problem_id = p.id
      WHERE s.student_id = ?
    `;
    const params: any[] = [studentId];

    if (problemId) {
      sql += ` AND s.problem_id = ?`;
      params.push(problemId);
    }

    sql += ` ORDER BY s.submitted_at DESC LIMIT 30`;

    const submissions = queryAll(sql, params);
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submissions.' });
  }
});

router.get('/submissions/:submissionId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { submissionId } = req.params;

    const sub = queryOne(
      `SELECT s.*, p.title as problem_title, p.difficulty, p.topic, p.description, p.sample_input, p.sample_output
       FROM coding_submissions s
       JOIN coding_problems p ON s.problem_id = p.id
       WHERE s.id = ?`,
      [submissionId]
    );

    if (!sub) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    // Ownership check: students cannot view other students' submissions unless admin
    if (sub.student_id !== studentId && sub.user_id !== studentId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this submission.' });
      return;
    }

    // Use cached feedback if present, or generate on-demand
    let feedback = null;
    try {
      if (sub.ai_feedback_json && sub.ai_feedback_json !== '{}') {
        feedback = JSON.parse(sub.ai_feedback_json);
      }
    } catch {}

    if (!feedback) {
      feedback = await generateCodingFeedback({
        problemTitle: sub.problem_title,
        topic: sub.topic,
        difficulty: sub.difficulty,
        language: sub.language,
        code: sub.source_code,
        status: sub.status,
        passedTests: sub.passed_test_cases,
        totalTests: sub.total_test_cases,
        executionTimeMs: sub.execution_time_ms,
        memoryUsedMb: sub.memory_used_mb,
        compilerOutput: sub.compiler_output,
        runtimeOutput: sub.runtime_output
      });

      try {
        execute(`UPDATE coding_submissions SET ai_feedback_json = ? WHERE id = ?`, [JSON.stringify(feedback), submissionId]);
      } catch {}
    }

    let testResults = [];
    try {
      testResults = JSON.parse(sub.test_results_json || '[]');
    } catch {}

    res.json({
      id: sub.id,
      problemId: sub.problem_id,
      problemTitle: sub.problem_title,
      difficulty: sub.difficulty,
      topic: sub.topic,
      language: sub.language,
      sourceCode: sub.source_code,
      status: sub.status,
      score: sub.score,
      passedTests: sub.passed_test_cases,
      totalTests: sub.total_test_cases,
      executionTimeMs: sub.execution_time_ms,
      memoryUsedMb: sub.memory_used_mb,
      compilerOutput: sub.compiler_output,
      runtimeOutput: sub.runtime_output,
      submittedAt: sub.submitted_at,
      testResults,
      feedback
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submission details.' });
  }
});

// ============================================================================
// 7. AI HINT ASSISTANT (PROGRESSIVE DISCLOSURE 1-4)
// GET /problems/:problemId/hints & POST /problems/:problemId/hints
// ============================================================================
router.get(['/problems/:problemId/hints', '/problems/:problemId/ai-hints'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { problemId } = req.params;

    const rows = queryAll(
      `SELECT hint_level, response_text, created_at FROM coding_hint_requests
       WHERE student_id = ? AND problem_id = ?
       ORDER BY hint_level ASC, created_at DESC`,
      [studentId, problemId]
    );

    const hintsByLevel: Record<number, any> = {};
    for (const row of rows) {
      if (!hintsByLevel[row.hint_level]) {
        hintsByLevel[row.hint_level] = {
          hintLevel: row.hint_level,
          hint: row.response_text,
          createdAt: row.created_at
        };
      }
    }

    res.json(hintsByLevel);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch hints.' });
  }
});

router.post(['/problems/:problemId/ai-hint', '/problems/:problemId/hints'], authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { problemId } = req.params;
    const { hintLevel = 1, userCode = '', language = 'python' } = req.body;

    const level = Number(hintLevel);
    if (![1, 2, 3, 4].includes(level)) {
      res.status(400).json({ error: 'Invalid hint level. Supported levels: 1, 2, 3, 4.' });
      return;
    }

    const problem = queryOne('SELECT * FROM coding_problems WHERE id = ?', [problemId]);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found.' });
      return;
    }

    const hint = await generateCodingHint({
      problemId: problem.id,
      problemTitle: problem.title,
      problemDescription: problem.description,
      topic: problem.topic,
      difficulty: problem.difficulty,
      hintLevel: level as 1 | 2 | 3 | 4,
      userCode,
      language
    });

    // Save hint request in audit log
    execute(
      `INSERT INTO coding_hint_requests (id, student_id, problem_id, hint_level, request_text, response_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`hint-${uuidv4()}`, studentId, problemId, level, userCode.substring(0, 500), hint.hint]
    );

    // Log activity
    execute(
      `INSERT INTO coding_activities (id, student_id, problem_id, activity_type, duration_seconds) VALUES (?, ?, ?, ?, ?)`,
      [`act-${uuidv4()}`, studentId, problemId, 'HINT_REQUESTED', 0]
    );

    res.json(hint);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate AI hint.' });
  }
});

// ============================================================================
// 8. CODING STREAK & BADGES
// GET /streak
// ============================================================================
router.get('/streak', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const streak = queryOne('SELECT * FROM coding_streaks WHERE student_id = ?', [studentId]);

    res.json({
      currentStreak: streak?.current_streak || 0,
      longestStreak: streak?.longest_streak || 0,
      totalActiveDays: streak?.total_active_days || 0,
      lastActivityDate: streak?.last_activity_date || null,
      calendar: JSON.parse(streak?.streak_calendar_json || '[]'),
      badges: JSON.parse(streak?.badges_json || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch streak.' });
  }
});

// ============================================================================
// 9. CODING SKILLS EVIDENCE
// GET /skills
// ============================================================================
router.get('/skills', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const skills = queryAll(
      `SELECT cse.skill_id, sk.name as skill_name, sk.category,
              COUNT(cse.id) as problems_solved,
              AVG(cse.score) as average_score,
              MAX(cse.score) as best_score,
              MAX(cse.created_at) as last_practiced
       FROM coding_skill_evidence cse
       JOIN skills sk ON cse.skill_id = sk.id
       WHERE cse.student_id = ?
       GROUP BY cse.skill_id`,
      [studentId]
    );

    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch coding skills.' });
  }
});

// ============================================================================
// 10. AI RECOMMENDATIONS
// GET /recommendations
// ============================================================================
router.get('/recommendations', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const solvedRows = queryAll(
      `SELECT DISTINCT problem_id FROM coding_submissions WHERE student_id = ? AND status = 'ACCEPTED'`,
      [studentId]
    );
    const solvedSet = new Set(solvedRows.map(r => r.problem_id));

    const problems = queryAll(
      `SELECT id, title, difficulty, topic, supported_languages_json, description
       FROM coding_problems
       WHERE status = 'published'
       ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC`
    );

    const recommended = problems
      .filter(p => !solvedSet.has(p.id))
      .slice(0, 3)
      .map(p => ({
        ...p,
        supportedLanguages: JSON.parse(p.supported_languages_json || '["python","c","cpp"]')
      }));

    res.json(recommended);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recommendations.' });
  }
});

// ============================================================================
// 11. LOG CODING ACTIVITY
// POST /activity
// ============================================================================
router.post('/activity', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { problemId, activityType, durationSeconds = 0 } = req.body;

    if (!activityType) {
      res.status(400).json({ error: 'activityType is required.' });
      return;
    }

    execute(
      `INSERT INTO coding_activities (id, student_id, problem_id, activity_type, duration_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [`act-${uuidv4()}`, studentId, problemId || null, activityType, durationSeconds]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to log activity.' });
  }
});

// ============================================================================
// 12. ADMIN APIS (CREATE, UPDATE, DELETE PROBLEMS & TEST CASES)
// ============================================================================
router.post('/admin/problems', authenticateToken, (req: Request, res: Response): void => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }

    const {
      title, description, difficulty = 'easy', topic,
      supportedLanguages = ['python', 'c', 'cpp'],
      inputFormat, outputFormat, constraints, sampleInput, sampleOutput,
      explanation, starterCode = {}, functionSignature, timeLimitMs = 2000,
      memoryLimitMb = 128
    } = req.body;

    const problemId = `cp-${uuidv4().substring(0, 8)}`;
    execute(
      `INSERT INTO coding_problems (
        id, title, description, difficulty, topic, supported_languages_json,
        input_format, output_format, constraints, sample_input, sample_output,
        explanation, starter_code_json, function_signature, time_limit_ms,
        memory_limit_mb, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
      [
        problemId, title, description, difficulty, topic,
        JSON.stringify(supportedLanguages), inputFormat, outputFormat, constraints,
        sampleInput, sampleOutput, explanation, JSON.stringify(starterCode),
        functionSignature, timeLimitMs, memoryLimitMb, req.user!.id
      ]
    );

    res.status(201).json({ id: problemId, message: 'Problem created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create problem.' });
  }
});

export default router;
