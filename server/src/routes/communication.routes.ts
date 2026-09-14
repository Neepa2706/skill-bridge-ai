/**
 * SkillBridge AI - Communication & Language Learning Routes
 * Step 10: Communication and Language Learning System
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { transcribeAudio } from '../services/audio/speechService.js';
import {
  clampScore,
  getSkillBridgeLevel,
  evaluateSpeakingResponse,
  evaluateWritingResponse,
  logCommunicationEvidence,
  recordCommunicationActivity
} from '../services/ai/communicationScoringEngine.js';
import {
  getAssessmentQuestions,
  evaluateDiagnosticAssessment,
  generateConversationTurn
} from '../services/ai/communicationAiService.js';

const router = Router();

// ============================================================================
// 1. COMMUNICATION DASHBOARD OVERVIEW
// GET /student/communication/dashboard or /api/student/communication/dashboard
// ============================================================================
router.get(['/', '/dashboard'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const requestedLangCode = (req.query.lang as string) || 'en';

    // 1. Fetch supported languages
    const languages = queryAll<{
      id: string;
      code: string;
      name: string;
      native_name: string;
      flag_emoji: string;
      description: string;
      difficulty_rating: string;
    }>(`SELECT * FROM communication_languages WHERE status = 'active' ORDER BY code ASC`);

    // 2. Fetch student progress for all languages
    const studentTracks = queryAll<{
      language_id: string;
      current_level: number;
      level_name: string;
      overall_score: number;
      speaking_score: number;
      listening_score: number;
      reading_score: number;
      writing_score: number;
      grammar_score: number;
      vocabulary_score: number;
      pronunciation_score: number;
      conversation_score: number;
      completed_lessons_count: number;
      practice_sessions_count: number;
      last_activity_at: string;
    }>(`SELECT * FROM student_languages WHERE student_id = ?`, [studentId]);

    const trackMap = new Map(studentTracks.map(t => [t.language_id, t]));

    // Format language overview cards
    const languageCards = languages.map(lang => {
      const track = trackMap.get(lang.id);
      return {
        id: lang.id,
        code: lang.code,
        name: lang.name,
        nativeName: lang.native_name,
        flagEmoji: lang.flag_emoji,
        description: lang.description,
        difficultyRating: lang.difficulty_rating,
        currentLevel: track ? track.current_level : 1,
        levelName: track ? track.level_name : 'Level 1 — Beginner',
        overallScore: track ? track.overall_score : 0,
        completedLessons: track ? track.completed_lessons_count : 0,
        practiceSessions: track ? track.practice_sessions_count : 0,
        isStarted: !!track
      };
    });

    // 3. Active Language Details
    const activeLang = languages.find(l => l.code === requestedLangCode) || languages[0] || {
      id: 'lang-en',
      code: 'en',
      name: 'English',
      native_name: 'English',
      flag_emoji: '🇬🇧',
      description: 'Global business and placement readiness.',
      difficulty_rating: 'medium'
    };

    let activeTrack = trackMap.get(activeLang.id);
    if (!activeTrack) {
      // Default initial baseline track
      activeTrack = {
        language_id: activeLang.id,
        current_level: 1,
        level_name: 'Level 1 — Beginner',
        overall_score: 0,
        speaking_score: 0,
        listening_score: 0,
        reading_score: 0,
        writing_score: 0,
        grammar_score: 0,
        vocabulary_score: 0,
        pronunciation_score: 0,
        conversation_score: 0,
        completed_lessons_count: 0,
        practice_sessions_count: 0,
        last_activity_at: new Date().toISOString()
      };
    }

    // 4. Streak & Badges
    const streakRow = queryOne<{
      current_streak: number;
      longest_streak: number;
      total_active_days: number;
      last_activity_date: string;
      streak_calendar_json: string;
      badges_json: string;
    }>(`SELECT * FROM communication_streaks WHERE student_id = ?`, [studentId]);

    const streak = {
      currentStreak: streakRow?.current_streak || 0,
      longestStreak: streakRow?.longest_streak || 0,
      totalActiveDays: streakRow?.total_active_days || 0,
      lastActivityDate: streakRow?.last_activity_date || null,
      calendar: JSON.parse(streakRow?.streak_calendar_json || '[]'),
      badges: JSON.parse(streakRow?.badges_json || '[]')
    };

    // 5. Lessons for active language
    const lessons = queryAll<{
      id: string;
      language_id: string;
      title: string;
      description: string;
      category: string;
      skill_id: string;
      difficulty: string;
      lesson_type: string;
      content_json: string;
      order_index: number;
    }>(
      `SELECT * FROM communication_lessons WHERE language_id = ? ORDER BY order_index ASC`,
      [activeLang.id]
    );

    // 6. Recommended next lesson
    const recommendedLesson = lessons.find((_, index) => index >= activeTrack!.completed_lessons_count) || lessons[0] || null;

    // 7. Recent Practice Activities
    const recentActivities = queryAll<{
      id: string;
      activity_type: string;
      score: number;
      duration_seconds: number;
      created_at: string;
    }>(
      `SELECT id, activity_type, score, duration_seconds, created_at
       FROM communication_activities
       WHERE student_id = ? AND language_id = ?
       ORDER BY created_at DESC LIMIT 6`,
      [studentId, activeLang.id]
    );

    res.json({
      languages: languageCards,
      activeLanguage: {
        ...activeLang,
        track: {
          currentLevel: activeTrack.current_level,
          levelName: activeTrack.level_name,
          overallScore: activeTrack.overall_score,
          subSkills: {
            speaking: activeTrack.speaking_score,
            listening: activeTrack.listening_score,
            reading: activeTrack.reading_score,
            writing: activeTrack.writing_score,
            grammar: activeTrack.grammar_score,
            vocabulary: activeTrack.vocabulary_score,
            pronunciation: activeTrack.pronunciation_score,
            conversation: activeTrack.conversation_score
          },
          completedLessonsCount: activeTrack.completed_lessons_count,
          practiceSessionsCount: activeTrack.practice_sessions_count,
          lastActivityAt: activeTrack.last_activity_at
        }
      },
      streak,
      recommendedLesson: recommendedLesson ? {
        id: recommendedLesson.id,
        title: recommendedLesson.title,
        description: recommendedLesson.description,
        category: recommendedLesson.category,
        difficulty: recommendedLesson.difficulty,
        lessonType: recommendedLesson.lesson_type,
        orderIndex: recommendedLesson.order_index
      } : null,
      lessonsCount: lessons.length,
      allLessons: lessons,
      recentActivities
    });
  } catch (err: any) {
    console.error('[Communication Dashboard Error]', err);
    res.status(500).json({ error: err.message || 'Failed to load communication dashboard.' });
  }
});

// ============================================================================
// 2. SUPPORTED LANGUAGES
// GET /languages or /api/student/communication/languages
// ============================================================================
router.get('/languages', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const languages = queryAll(`SELECT * FROM communication_languages WHERE status = 'active' ORDER BY code ASC`);
    const studentTracks = queryAll(`SELECT * FROM student_languages WHERE student_id = ?`, [studentId]);
    const trackMap = new Map(studentTracks.map(t => [t.language_id, t]));

    const result = languages.map(lang => {
      const track = trackMap.get(lang.id);
      return {
        id: lang.id,
        code: lang.code,
        name: lang.name,
        nativeName: lang.native_name,
        flagEmoji: lang.flag_emoji,
        description: lang.description,
        difficultyRating: lang.difficulty_rating,
        currentLevel: track ? track.current_level : 1,
        levelName: track ? track.level_name : 'Level 1 — Beginner',
        overallScore: track ? track.overall_score : 0,
        completedLessonsCount: track ? track.completed_lessons_count : 0,
        practiceSessionsCount: track ? track.practice_sessions_count : 0,
        isStarted: !!track
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch languages.' });
  }
});

router.post(['/language/switch', '/switch-language'], authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { languageCode } = req.body;

    if (!['en', 'ja', 'de'].includes(languageCode)) {
      res.status(400).json({ error: 'Unsupported language code. Supported: en, ja, de' });
      return;
    }

    const lang = queryOne<{
      id: string;
      code: string;
      name: string;
      native_name: string;
      flag_emoji: string;
      description: string;
      difficulty_rating: string;
    }>(`SELECT * FROM communication_languages WHERE code = ?`, [languageCode]);

    if (!lang) {
      res.status(404).json({ error: 'Language not found.' });
      return;
    }

    let studentTrack = queryOne<{
      id: string;
      language_id: string;
      current_level: number;
      level_name: string;
      overall_score: number;
      speaking_score: number;
      listening_score: number;
      reading_score: number;
      writing_score: number;
      grammar_score: number;
      vocabulary_score: number;
      pronunciation_score: number;
      conversation_score: number;
      completed_lessons_count: number;
      practice_sessions_count: number;
      last_activity_at: string;
    }>(`SELECT * FROM student_languages WHERE student_id = ? AND language_id = ?`, [studentId, lang.id]);

    if (!studentTrack) {
      const trackId = `stlang-${uuidv4()}`;
      execute(
        `INSERT INTO student_languages (
          id, student_id, language_id, current_level, level_name, overall_score,
          speaking_score, listening_score, reading_score, writing_score,
          grammar_score, vocabulary_score, pronunciation_score, conversation_score,
          completed_lessons_count, practice_sessions_count, last_activity_at
        ) VALUES (?, ?, ?, 1, 'Level 1 — Beginner', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)`,
        [trackId, studentId, lang.id]
      );
      studentTrack = queryOne(`SELECT * FROM student_languages WHERE id = ?`, [trackId]);
    }

    res.json({
      success: true,
      message: `Active language switched to ${lang.name} (${lang.code})`,
      language: {
        id: lang.id,
        code: lang.code,
        name: lang.name,
        nativeName: lang.native_name,
        flagEmoji: lang.flag_emoji,
        description: lang.description,
        difficultyRating: lang.difficulty_rating,
        currentLevel: studentTrack?.current_level || 1,
        levelName: studentTrack?.level_name || 'Level 1 — Beginner',
        overallScore: studentTrack?.overall_score || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to switch language.' });
  }
});

router.get('/activities', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const langCode = req.query.lang as string;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let sql = `
      SELECT a.id, a.language_id, l.code as language_code, l.name as language_name,
             a.lesson_id, cl.title as lesson_title, a.activity_type,
             a.score, a.duration_seconds, a.status, a.created_at
      FROM communication_activities a
      JOIN communication_languages l ON a.language_id = l.id
      LEFT JOIN communication_lessons cl ON a.lesson_id = cl.id
      WHERE a.student_id = ?
    `;
    const params: any[] = [studentId];

    if (langCode && ['en', 'ja', 'de'].includes(langCode)) {
      sql += ` AND l.code = ?`;
      params.push(langCode);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(limit);

    const activities = queryAll(sql, params);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch communication activities.' });
  }
});

// ============================================================================
// 3. LESSONS CATALOG & LESSON DETAIL
// GET /lessons & GET /lessons/:lessonId
// ============================================================================
router.get('/lessons', authenticateToken, (req: Request, res: Response): void => {
  try {
    const langCode = (req.query.lang as string) || 'en';
    const category = req.query.category as string;
    const difficulty = req.query.difficulty as string;

    const lang = queryOne<{ id: string }>(`SELECT id FROM communication_languages WHERE code = ?`, [langCode]);
    if (!lang) {
      res.status(404).json({ error: `Language '${langCode}' not supported.` });
      return;
    }

    let sql = `SELECT id, language_id, title, description, category, skill_id, difficulty, lesson_type, order_index, created_at FROM communication_lessons WHERE language_id = ?`;
    const params: any[] = [lang.id];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (difficulty) {
      sql += ` AND difficulty = ?`;
      params.push(difficulty);
    }
    sql += ` ORDER BY order_index ASC`;

    const lessons = queryAll(sql, params);
    res.json(lessons);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch lessons.' });
  }
});

router.get('/lessons/:lessonId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const { lessonId } = req.params;
    const lesson = queryOne<{
      id: string;
      language_id: string;
      title: string;
      description: string;
      category: string;
      skill_id: string;
      difficulty: string;
      lesson_type: string;
      content_json: string;
      order_index: number;
    }>(`SELECT * FROM communication_lessons WHERE id = ?`, [lessonId]);

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    const language = queryOne(`SELECT * FROM communication_languages WHERE id = ?`, [lesson.language_id]);

    res.json({
      ...lesson,
      language,
      content: JSON.parse(lesson.content_json || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch lesson detail.' });
  }
});

router.post('/lessons/:lessonId/complete', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { lessonId } = req.params;
    const { score = 100, durationSeconds = 900 } = req.body;

    const lesson = queryOne<{ id: string; language_id: string; skill_id: string }>(
      `SELECT * FROM communication_lessons WHERE id = ?`,
      [lessonId]
    );

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    // Record activity
    const activityId = `act-${uuidv4()}`;
    execute(
      `INSERT INTO communication_activities (
        id, student_id, language_id, lesson_id, activity_type, score, duration_seconds, status
      ) VALUES (?, ?, ?, ?, 'LESSON_COMPLETED', ?, ?, 'completed')`,
      [activityId, studentId, lesson.language_id, lessonId, clampScore(score), durationSeconds]
    );

    // Update student progress count
    execute(
      `UPDATE student_languages
       SET completed_lessons_count = completed_lessons_count + 1,
           practice_sessions_count = practice_sessions_count + 1,
           last_activity_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND language_id = ?`,
      [studentId, lesson.language_id]
    );

    // Streak update
    const streakUpdate = recordCommunicationActivity(studentId);

    // Log evidence if score >= 70
    if (score >= 70) {
      const langRow = queryOne<{ code: string }>(`SELECT code FROM communication_languages WHERE id = ?`, [lesson.language_id]);
      if (langRow) {
        logCommunicationEvidence({
          studentId,
          languageCode: langRow.code as any,
          score: clampScore(score),
          source: 'speaking_practice'
        });
      }
    }

    res.json({
      success: true,
      message: 'Lesson marked as completed.',
      activityId,
      streak: streakUpdate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete lesson.' });
  }
});

// ============================================================================
// 4. DIAGNOSTIC BASELINE ASSESSMENT
// GET /assessments/questions & POST /assessments/submit
// ============================================================================
router.get('/assessments/questions', authenticateToken, (req: Request, res: Response): void => {
  try {
    const langCode = (req.query.lang as 'en' | 'ja' | 'de') || 'en';
    const questions = getAssessmentQuestions(langCode);

    // Return questions with options (omitting correctIndex to prevent client cheats)
    const sanitized = questions.map(q => ({
      id: q.id,
      category: q.category,
      prompt: q.prompt,
      contextText: q.contextText || null,
      options: q.options,
      difficulty: q.difficulty
    }));

    res.json({
      languageCode: langCode,
      totalQuestions: sanitized.length,
      questions: sanitized
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assessment questions.' });
  }
});

router.post('/assessments/submit', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { languageCode = 'en', answers = [], durationSeconds = 600 } = req.body;
    const safeAnswers = Array.isArray(answers) ? answers : [];

    const validLangs = ['en', 'ja', 'de'];
    const langCode = validLangs.includes(languageCode) ? languageCode : 'en';

    // 1. Evaluate answers
    const report = evaluateDiagnosticAssessment({
      languageCode: langCode as any,
      answers: safeAnswers
    });

    const langId = `lang-${langCode}`;
    const assessmentId = `asmt-${uuidv4()}`;

    // 2. Save assessment
    execute(
      `INSERT INTO communication_assessments (
        id, student_id, language_id, assessment_type, overall_score,
        speaking_score, listening_score, reading_score, writing_score,
        grammar_score, vocabulary_score, pronunciation_score, conversation_score,
        level, level_name, ai_evaluation_json, answers_json, status, completed_at
      ) VALUES (?, ?, ?, 'DIAGNOSTIC_BASELINE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)`,
      [
        assessmentId,
        studentId,
        langId,
        report.overallScore,
        report.speakingScore,
        report.listeningScore,
        report.readingScore,
        report.writingScore,
        report.grammarScore,
        report.vocabularyScore,
        report.pronunciationScore,
        report.conversationScore,
        report.level,
        report.levelName,
        JSON.stringify({
          summary: report.summary,
          strengths: report.strengths,
          growthAreas: report.growthAreas,
          recommendations: report.recommendations
        }),
        JSON.stringify(answers)
      ]
    );

    // 3. Save sub-skill results
    const subSkillMetrics = [
      { cat: 'grammar', score: report.grammarScore },
      { cat: 'vocabulary', score: report.vocabularyScore },
      { cat: 'reading', score: report.readingScore },
      { cat: 'listening', score: report.listeningScore },
      { cat: 'speaking', score: report.speakingScore },
      { cat: 'writing', score: report.writingScore },
      { cat: 'pronunciation', score: report.pronunciationScore },
      { cat: 'conversation', score: report.conversationScore }
    ];

    for (const sm of subSkillMetrics) {
      execute(
        `INSERT INTO communication_skill_results (
          id, assessment_id, student_id, skill_id, category, score, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), assessmentId, studentId, `skl-${langCode}`, sm.cat, sm.score, 'High']
      );
    }

    // 4. Log verified skill history & update student_languages
    logCommunicationEvidence({
      studentId,
      languageCode: langCode as any,
      score: report.overallScore,
      source: 'communication_assessment',
      assessmentId,
      subSkills: {
        speaking: report.speakingScore,
        listening: report.listeningScore,
        reading: report.readingScore,
        writing: report.writingScore,
        grammar: report.grammarScore,
        vocabulary: report.vocabularyScore,
        pronunciation: report.pronunciationScore,
        conversation: report.conversationScore
      }
    });

    // 5. Update streak
    const streakUpdate = recordCommunicationActivity(studentId);

    res.json({
      success: true,
      assessmentId,
      languageCode: langCode,
      report,
      streak: streakUpdate
    });
  } catch (err: any) {
    console.error('[Assessment Submit Error]', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate assessment.' });
  }
});

// ============================================================================
// 5. SPEAKING PRACTICE & SPEECH EVALUATION
// POST /speaking/transcribe & POST /speaking/evaluate
// ============================================================================
router.post('/speaking/transcribe', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { languageCode = 'en', audioBase64, fallbackTranscript, durationSeconds } = req.body;
    const result = await transcribeAudio({
      languageCode: ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en',
      audioBase64,
      fallbackTranscript,
      durationSeconds
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to transcribe audio.' });
  }
});

router.post('/speaking/evaluate', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const {
      languageCode = 'en',
      promptText,
      transcript,
      durationSeconds = 25,
      relevanceScore = 85,
      grammarScore = 80,
      vocabularyScore = 75,
      fluencyScore = 80,
      pronunciationScore = 78,
      completenessScore = 82
    } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      res.status(400).json({ error: 'Spoken transcript is required for speech evaluation.' });
      return;
    }

    const langCode = ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en';

    // 1. Evaluate with 6-dimension rubric
    const evalResult = evaluateSpeakingResponse(
      {
        relevanceScore: Number(relevanceScore),
        grammarScore: Number(grammarScore),
        vocabularyScore: Number(vocabularyScore),
        fluencyScore: Number(fluencyScore),
        pronunciationScore: Number(pronunciationScore),
        completenessScore: Number(completenessScore)
      },
      langCode as any
    );

    const langId = `lang-${langCode}`;
    const responseId = `spk-${uuidv4()}`;

    // 2. Save response
    execute(
      `INSERT INTO speaking_responses (
        id, student_id, language_id, prompt_text, transcript,
        duration_seconds, relevance_score, grammar_score, vocabulary_score,
        fluency_score, pronunciation_score, completeness_score, overall_score,
        feedback_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        responseId,
        studentId,
        langId,
        promptText || 'Open speaking practice',
        transcript.trim(),
        durationSeconds,
        evalResult.breakdown.relevance.score,
        evalResult.breakdown.grammar.score,
        evalResult.breakdown.vocabulary.score,
        evalResult.breakdown.fluency.score,
        evalResult.breakdown.pronunciation.score,
        evalResult.breakdown.completeness.score,
        evalResult.overallScore,
        JSON.stringify({
          strengths: evalResult.strengths,
          improvements: evalResult.improvements,
          tips: evalResult.tips
        })
      ]
    );

    // 3. Log evidence & streak
    logCommunicationEvidence({
      studentId,
      languageCode: langCode as any,
      score: evalResult.overallScore,
      source: 'speaking_practice',
      subSkills: {
        speaking: evalResult.overallScore,
        grammar: evalResult.breakdown.grammar.score,
        vocabulary: evalResult.breakdown.vocabulary.score,
        pronunciation: evalResult.breakdown.pronunciation.score
      }
    });

    const streakUpdate = recordCommunicationActivity(studentId);

    res.json({
      success: true,
      responseId,
      transcript: transcript.trim(),
      evaluation: evalResult,
      streak: streakUpdate
    });
  } catch (err: any) {
    console.error('[Speaking Evaluate Error]', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate speech.' });
  }
});

// ============================================================================
// 6. WRITING PRACTICE & FEEDBACK
// POST /writing/evaluate
// ============================================================================
router.post('/writing/evaluate', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const {
      languageCode = 'en',
      prompt,
      answer,
      lessonId
    } = req.body;

    if (!prompt || !answer || answer.trim().length < 5) {
      res.status(400).json({ error: 'Prompt and a substantive written answer are required.' });
      return;
    }

    const langCode = ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en';
    const cleanAnswer = answer.trim();
    const wordCount = langCode === 'ja'
      ? Math.max(1, Math.round(cleanAnswer.length / 2.5))
      : cleanAnswer.split(/\s+/).filter(Boolean).length;

    // Determine heuristic scores based on content depth
    const lengthFactor = Math.min(100, Math.max(50, wordCount * 2));
    const taskScore = clampScore(75 + (lengthFactor > 80 ? 15 : 5));
    const gramScore = clampScore(74);
    const vocScore = clampScore(72);
    const clarScore = clampScore(76);

    const evalResult = evaluateWritingResponse(
      {
        taskCompletionScore: taskScore,
        grammarScore: gramScore,
        vocabularyScore: vocScore,
        clarityScore: clarScore,
        wordCount
      },
      langCode as any,
      cleanAnswer,
      prompt
    );

    const langId = `lang-${langCode}`;
    const responseId = `wrt-${uuidv4()}`;

    // Save writing response
    execute(
      `INSERT INTO writing_responses (
        id, student_id, language_id, activity_id, prompt, answer,
        word_count, overall_score, grammar_score, vocabulary_score,
        clarity_score, ai_feedback_json, suggested_answer, created_at
      ) VALUES (?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        responseId,
        studentId,
        langId,
        prompt,
        cleanAnswer,
        wordCount,
        evalResult.overallScore,
        evalResult.breakdown.grammar.score,
        evalResult.breakdown.vocabulary.score,
        evalResult.breakdown.clarity.score,
        JSON.stringify({
          strengths: evalResult.strengths,
          improvements: evalResult.improvements,
          grammarCorrections: evalResult.grammarCorrections,
          vocabularyEnhancements: evalResult.vocabularyEnhancements
        }),
        evalResult.suggestedRewrite
      ]
    );

    // Log evidence & streak
    logCommunicationEvidence({
      studentId,
      languageCode: langCode as any,
      score: evalResult.overallScore,
      source: 'writing_practice',
      subSkills: {
        writing: evalResult.overallScore,
        grammar: evalResult.breakdown.grammar.score,
        vocabulary: evalResult.breakdown.vocabulary.score
      }
    });

    const streakUpdate = recordCommunicationActivity(studentId);

    res.json({
      success: true,
      responseId,
      wordCount,
      evaluation: evalResult,
      streak: streakUpdate
    });
  } catch (err: any) {
    console.error('[Writing Evaluate Error]', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate writing submission.' });
  }
});

// ============================================================================
// 7. INTERACTIVE AI CONVERSATION TRAINER
// POST /conversation/start, POST /conversation/:sessionId/turn, POST /conversation/:sessionId/end
// ============================================================================
router.post('/conversation/start', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const {
      languageCode = 'en',
      mode = 'placement',
      topic
    } = req.body;

    const validModes = ['daily', 'professional', 'placement', 'group_discussion', 'presentation'];
    const activeMode = validModes.includes(mode) ? mode : 'placement';
    const langCode = ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en';
    const langId = `lang-${langCode}`;

    const defaultTopics: Record<string, Record<string, string>> = {
      en: {
        placement: 'Technical Architecture & Behavioral STAR Questions',
        professional: 'Sprint Standup & Microservices Refactoring Discussion',
        daily: 'Casual Engineering Lunch & Tech Passions',
        group_discussion: 'Monolith vs Serverless Trade-offs in High-Scale Systems',
        presentation: 'Tech Talk: Designing Scalable Real-time Web Applications'
      },
      ja: {
        placement: '技術自己紹介とプロジェクトの深掘り面接 (Technical Self-Introduction)',
        professional: 'デイリースクラムとバグ報告の打ち合わせ (Daily Standup & Bug Triage)',
        daily: 'オフィスでの日常会話と挨拶 (Daily Office Communication)',
        group_discussion: 'クラウド移行に関するチーム議論 (Cloud Migration Strategy)',
        presentation: '新機能提案のプレゼンテーション (Feature Pitch Presentation)'
      },
      de: {
        placement: 'Technisches Vorstellungsgespräch & Projektvorstellung',
        professional: 'Daily Scrum & Code-Review Feedback Besprechung',
        daily: 'Kaffeepause & lockeres Gespräch über neue Technologien',
        group_discussion: 'Diskussion über synchrone vs. asynchrone Systemarchitekturen',
        presentation: 'Vortrag: CI/CD Automatisierung und Testabdeckung'
      }
    };

    const selectedTopic = topic || defaultTopics[langCode]?.[activeMode] || 'Professional Tech Conversation';
    const sessionId = `conv-${uuidv4()}`;

    // Opening greetings
    let openingGreeting = '';
    if (langCode === 'ja') {
      openingGreeting = `こんにちは！SkillBridge AI日本語会話トレーナーです。【${selectedTopic}】のセッションを開始します。まずは自己紹介と、最近取り組んでいる技術について教えていただけますか？ (Hello! Let's begin your Japanese practice. Could you introduce yourself?)`;
    } else if (langCode === 'de') {
      openingGreeting = `Guten Tag! Willkommen zu deiner SkillBridge Deutsch-Session zum Thema: "${selectedTopic}". Bitte stell dich kurz vor und erzähle mir von deinem Lieblingsprojekt!`;
    } else {
      openingGreeting = `Hello! Welcome to your SkillBridge Communication Trainer for "${selectedTopic}". Let's begin: could you introduce yourself, highlighting your primary technical stack and a project you are proud of?`;
    }

    execute(
      `INSERT INTO conversation_sessions (
        id, student_id, language_id, mode, topic, difficulty,
        total_messages, duration_seconds, overall_score, status, started_at
      ) VALUES (?, ?, ?, ?, ?, 'medium', 1, 0, 0, 'active', CURRENT_TIMESTAMP)`,
      [sessionId, studentId, langId, activeMode, selectedTopic]
    );

    const msgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_session_messages (
        id, session_id, sender, message_text, transcript_reference, grammar_correction, vocabulary_note, relevance_score
      ) VALUES (?, ?, 'ai', ?, null, null, null, 100)`,
      [msgId, sessionId, openingGreeting]
    );

    res.json({
      sessionId,
      languageCode: langCode,
      mode: activeMode,
      topic: selectedTopic,
      initialMessage: {
        id: msgId,
        sender: 'ai',
        text: openingGreeting,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start conversation session.' });
  }
});

router.get('/conversation/:sessionId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { sessionId } = req.params;

    const session = queryOne<{
      id: string;
      student_id: string;
      language_id: string;
      mode: string;
      topic: string;
      difficulty: string;
      total_messages: number;
      duration_seconds: number;
      overall_score: number;
      status: string;
      started_at: string;
      ended_at: string;
    }>(`SELECT * FROM conversation_sessions WHERE id = ?`, [sessionId]);

    if (!session) {
      res.status(404).json({ error: 'Conversation session not found.' });
      return;
    }

    if (session.student_id !== studentId) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this conversation session.' });
      return;
    }

    const messages = queryAll<{
      id: string;
      sender: string;
      message_text: string;
      grammar_correction: string | null;
      vocabulary_note: string | null;
      relevance_score: number;
      created_at: string;
    }>(
      `SELECT id, sender, message_text, grammar_correction, vocabulary_note, relevance_score, created_at
       FROM conversation_session_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      session,
      messages: messages.map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.message_text,
        grammarCorrection: m.grammar_correction,
        vocabularyNote: m.vocabulary_note,
        relevanceScore: m.relevance_score,
        createdAt: m.created_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch conversation session.' });
  }
});

router.post('/conversation/:sessionId/turn', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { sessionId } = req.params;
    const { messageText } = req.body;

    if (!messageText || messageText.trim().length === 0) {
      res.status(400).json({ error: 'Message text cannot be empty.' });
      return;
    }

    const session = queryOne<{
      id: string;
      student_id: string;
      language_id: string;
      mode: string;
      topic: string;
      status: string;
    }>(`SELECT * FROM conversation_sessions WHERE id = ?`, [sessionId]);

    if (!session) {
      res.status(404).json({ error: 'Conversation session not found.' });
      return;
    }

    if (session.student_id !== studentId) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this conversation session.' });
      return;
    }

    if (session.status === 'completed' || session.status === 'abandoned') {
      res.status(400).json({ error: 'This conversation session has already ended.' });
      return;
    }

    const langRow = queryOne<{ code: string }>(`SELECT code FROM communication_languages WHERE id = ?`, [session.language_id]);
    const langCode = (langRow?.code as 'en' | 'ja' | 'de') || 'en';

    // 1. Fetch dialogue history
    const historyRows = queryAll<{ sender: string; message_text: string }>(
      `SELECT sender, message_text FROM conversation_session_messages WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );

    const history = historyRows.map(h => ({
      sender: h.sender as 'ai' | 'student',
      text: h.message_text
    }));

    // 2. Generate AI turn
    const turnReply = await generateConversationTurn({
      languageCode: langCode,
      mode: session.mode as any,
      topic: session.topic,
      studentMessage: messageText.trim(),
      history
    });

    // 3. Save student message
    const studentMsgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_session_messages (
        id, session_id, sender, message_text, transcript_reference, grammar_correction, vocabulary_note, relevance_score
      ) VALUES (?, ?, 'student', ?, null, ?, ?, ?)`,
      [studentMsgId, sessionId, messageText.trim(), turnReply.grammarCorrection, turnReply.vocabularyNote, turnReply.relevanceScore]
    );

    // 4. Save AI reply
    const aiMsgId = `cmsg-${uuidv4()}`;
    execute(
      `INSERT INTO conversation_session_messages (
        id, session_id, sender, message_text, transcript_reference, grammar_correction, vocabulary_note, relevance_score
      ) VALUES (?, ?, 'ai', ?, null, null, null, 100)`,
      [aiMsgId, sessionId, turnReply.replyText]
    );

    // 5. Update session turns count
    execute(
      `UPDATE conversation_sessions SET total_messages = total_messages + 2 WHERE id = ?`,
      [sessionId]
    );

    res.json({
      sessionId,
      studentTurn: {
        id: studentMsgId,
        text: messageText.trim(),
        grammarCorrection: turnReply.grammarCorrection,
        vocabularyNote: turnReply.vocabularyNote,
        relevanceScore: turnReply.relevanceScore
      },
      aiReply: {
        id: aiMsgId,
        text: turnReply.replyText
      }
    });
  } catch (err: any) {
    console.error('[Conversation Turn Error]', err);
    res.status(500).json({ error: err.message || 'Failed to process conversation turn.' });
  }
});

router.post('/conversation/:sessionId/end', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { sessionId } = req.params;
    const { durationSeconds = 300 } = req.body;

    const session = queryOne<{
      id: string;
      student_id: string;
      language_id: string;
      mode: string;
      topic: string;
      total_messages: number;
      duration_seconds: number;
      status: string;
      overall_score: number;
      feedback_json: string;
    }>(`SELECT * FROM conversation_sessions WHERE id = ?`, [sessionId]);

    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    if (session.student_id !== studentId) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this conversation session.' });
      return;
    }

    if (session.status === 'completed') {
      let cachedFeedback: any = {};
      try {
        cachedFeedback = JSON.parse(session.feedback_json || '{}');
      } catch (e) {}
      const levelInfo = getSkillBridgeLevel(session.overall_score);
      res.json({
        success: true,
        sessionId,
        overallScore: session.overall_score,
        levelAssigned: levelInfo,
        totalTurns: Math.floor(session.total_messages / 2),
        durationSeconds: session.duration_seconds || durationSeconds,
        feedback: cachedFeedback,
        streak: { currentStreak: 1 }
      });
      return;
    }

    const langRow = queryOne<{ code: string }>(`SELECT code FROM communication_languages WHERE id = ?`, [session.language_id]);
    const langCode = (langRow?.code as 'en' | 'ja' | 'de') || 'en';

    // Calculate score based on messages count and student relevance
    const studentMessages = queryAll<{ relevance_score: number }>(
      `SELECT relevance_score FROM conversation_session_messages WHERE session_id = ? AND sender = 'student'`,
      [sessionId]
    );

    let avgRelevance = 80;
    if (studentMessages.length > 0) {
      const sum = studentMessages.reduce((acc, m) => acc + (m.relevance_score || 80), 0);
      avgRelevance = clampScore(sum / studentMessages.length);
    }

    const overallScore = clampScore(avgRelevance * 0.7 + Math.min(30, studentMessages.length * 6));
    const levelInfo = getSkillBridgeLevel(overallScore);

    const feedback = {
      overallFeedback: `Completed ${studentMessages.length} conversational turns in ${session.mode.toUpperCase()} mode. Demonstrates active engagement and topical relevance.`,
      strengths: [
        'Maintained active turn-taking without abandonment.',
        'Replied directly to follow-up interview questions.'
      ],
      improvements: [
        'Practice expanding technical explanations using the STAR framework.',
        'Review vocabulary coaching chips after each session.'
      ]
    };

    execute(
      `UPDATE conversation_sessions SET
        status = 'completed',
        duration_seconds = ?,
        overall_score = ?,
        feedback_json = ?,
        ended_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [durationSeconds, overallScore, JSON.stringify(feedback), sessionId]
    );

    // Log evidence & streak
    logCommunicationEvidence({
      studentId,
      languageCode: langCode,
      score: overallScore,
      source: 'conversation_mock_test',
      subSkills: {
        conversation: overallScore,
        speaking: overallScore,
        listening: overallScore
      }
    });

    const streakUpdate = recordCommunicationActivity(studentId);

    res.json({
      success: true,
      sessionId,
      overallScore,
      levelAssigned: levelInfo,
      totalTurns: studentMessages.length,
      durationSeconds,
      feedback,
      streak: streakUpdate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete conversation session.' });
  }
});

// ============================================================================
// 8. CONVERSATION MOCK TEST SYSTEM
// GET /mock-test/prompt & POST /mock-test/submit
// ============================================================================
router.get('/mock-test/prompt', authenticateToken, (req: Request, res: Response): void => {
  try {
    const langCode = (req.query.lang as 'en' | 'ja' | 'de') || 'en';

    const prompts: Record<string, {
      title: string;
      role: string;
      durationMinutes: number;
      scenario: string;
      keyObjectives: string[];
      evaluationCriteria: string[];
    }> = {
      en: {
        title: 'Full Technical & Behavioral Placement Interview',
        role: 'Senior Engineering Hiring Manager',
        durationMinutes: 15,
        scenario: 'You are interviewing for an Associate Software Engineer role. The manager will probe your system project architecture, debugging methodology, and a high-stakes team conflict.',
        keyObjectives: [
          'Deliver a crisp 90-second self-introduction',
          'Explain an asynchronous bottleneck you diagnosed and resolved',
          'Use the STAR framework for a behavioral conflict scenario'
        ],
        evaluationCriteria: [
          'Relevance & Depth (25%)',
          'Grammar & Accuracy (20%)',
          'Technical Vocabulary (20%)',
          'Fluency & Continuity (20%)',
          'Pronunciation & Articulation (15%)'
        ]
      },
      ja: {
        title: 'IT企業・新卒採用 技術面接シミュレーション',
        role: 'シニアエンジニア面接官 (Senior Tech Interviewer)',
        durationMinutes: 15,
        scenario: '日本のIT企業での採用面接です。自己紹介、これまでの開発経験、チームでの報連相の実践について質問されます。',
        keyObjectives: [
          '丁寧な敬語（です・ます）による明瞭な自己紹介',
          '開発したWebアプリやアルゴリズムの工夫点の説明',
          'チーム開発における報・連・相の具体的なエピソード'
        ],
        evaluationCriteria: [
          'ビジネス敬語・言葉遣い (25%)',
          '質問への的確な回答 (25%)',
          'IT用語・技術的説明力 (25%)',
          '会話のテンポと発音 (25%)'
        ]
      },
      de: {
        title: 'Technisches Vorstellungsgespräch für Ingenieure',
        role: 'Engineering Team Lead (DACH Region)',
        durationMinutes: 15,
        scenario: 'Vorstellungsgespräch für ein Software-Engineering-Praktikum oder eine Junior-Stelle. Fokus auf Architekturentscheidungen und agiler Zusammenarbeit.',
        keyObjectives: [
          'Strukturierte Selbstvorstellung auf Deutsch',
          'Erklärung von Architektur-Entscheidungen und Trade-offs',
          'Umgang mit Feedback im Code-Review'
        ],
        evaluationCriteria: [
          'Grammatik & Satzbau (V2-Regel) (25%)',
          'Technischer Fachwortschatz (25%)',
          'Präzision & Fachliche Tiefe (25%)',
          'Sprachfluss & Aussprache (25%)'
        ]
      }
    };

    res.json(prompts[langCode] || prompts.en);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch mock test prompt.' });
  }
});

router.post('/mock-test/submit', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const { languageCode = 'en', sessionId, durationSeconds = 600 } = req.body;

    const langCode = ['en', 'ja', 'de'].includes(languageCode) ? languageCode : 'en';
    const langId = `lang-${langCode}`;

    if (sessionId) {
      const session = queryOne<{ id: string; student_id: string }>(
        `SELECT id, student_id FROM conversation_sessions WHERE id = ?`,
        [sessionId]
      );
      if (session && session.student_id !== studentId) {
        res.status(403).json({ error: 'Forbidden: Session belongs to another student.' });
        return;
      }
    }

    // Compute mock test result
    const messages = queryAll<{ sender: string; relevance_score: number }>(
      `SELECT sender, relevance_score FROM conversation_session_messages WHERE session_id = ? AND sender = 'student'`,
      [sessionId]
    );

    let avgScore = 75;
    if (messages.length > 0) {
      const sum = messages.reduce((acc, m) => acc + (m.relevance_score || 75), 0);
      avgScore = clampScore(sum / messages.length);
    }

    const overallScore = clampScore(avgScore * 0.8 + Math.min(20, messages.length * 4));
    const levelInfo = getSkillBridgeLevel(overallScore);
    const mockTestId = `comm-mock-${uuidv4()}`;

    // Save as mock test assessment
    execute(
      `INSERT INTO communication_assessments (
        id, student_id, language_id, assessment_type, overall_score,
        speaking_score, listening_score, reading_score, writing_score,
        grammar_score, vocabulary_score, pronunciation_score, conversation_score,
        level, level_name, ai_evaluation_json, status, completed_at
      ) VALUES (?, ?, ?, 'CONVERSATION_MOCK_TEST', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)`,
      [
        mockTestId,
        studentId,
        langId,
        overallScore,
        clampScore(overallScore * 0.98),
        clampScore(overallScore * 1.02),
        clampScore(overallScore * 0.95),
        clampScore(overallScore * 0.93),
        clampScore(overallScore * 0.96),
        clampScore(overallScore * 0.97),
        clampScore(overallScore * 0.92),
        overallScore,
        levelInfo.level,
        levelInfo.levelName,
        JSON.stringify({
          summary: `Mock Test completed with ${messages.length} assessed interview turns. Demonstrated ${levelInfo.levelName} proficiency.`,
          strengths: ['Effective answer structure under mock interview constraints.', 'Engaged with follow-up questions accurately.'],
          recommendations: ['Practice 60-second answers to maintain interviewer engagement.', 'Maintain daily 10-minute conversational streak.']
        })
      ]
    );

    // Log evidence & streak
    logCommunicationEvidence({
      studentId,
      languageCode: langCode,
      score: overallScore,
      source: 'conversation_mock_test',
      assessmentId: mockTestId
    });

    const streakUpdate = recordCommunicationActivity(studentId);

    res.json({
      success: true,
      mockTestId,
      overallScore,
      levelAssigned: levelInfo,
      turnsAssessed: messages.length,
      durationSeconds,
      streak: streakUpdate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit mock test.' });
  }
});

// ============================================================================
// 9. STREAK & BADGES
// GET /streak or /api/student/communication/streak
// ============================================================================
router.get('/streak', authenticateToken, (req: Request, res: Response): void => {
  try {
    const studentId = req.user!.id;
    const streakRow = queryOne<{
      current_streak: number;
      longest_streak: number;
      total_active_days: number;
      last_activity_date: string;
      streak_calendar_json: string;
      badges_json: string;
    }>(`SELECT * FROM communication_streaks WHERE student_id = ?`, [studentId]);

    res.json({
      currentStreak: streakRow?.current_streak || 0,
      longestStreak: streakRow?.longest_streak || 0,
      totalActiveDays: streakRow?.total_active_days || 0,
      lastActivityDate: streakRow?.last_activity_date || null,
      calendar: JSON.parse(streakRow?.streak_calendar_json || '[]'),
      badges: JSON.parse(streakRow?.badges_json || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch streak.' });
  }
});

// ============================================================================
// 10. ADMIN STATS
// GET /admin/stats
// ============================================================================
router.get('/admin/stats', authenticateToken, (req: Request, res: Response): void => {
  try {
    const totalStudents = queryOne<{ count: number }>(`SELECT COUNT(DISTINCT student_id) as count FROM student_languages`)?.count || 0;
    const totalActivities = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM communication_activities`)?.count || 0;
    const totalAssessments = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM communication_assessments`)?.count || 0;
    const totalConversations = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM conversation_sessions`)?.count || 0;

    res.json({
      totalStudents,
      totalActivities,
      totalAssessments,
      totalConversations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin stats.' });
  }
});

export default router;
