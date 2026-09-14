/**
 * SkillBridge AI - Communication Scoring & Skill Evidence Engine
 * Step 10: Communication and Language Learning System
 */

import { execute, queryOne, queryAll } from '../../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface SkillBridgeLevelInfo {
  level: number;
  levelName: string;
  badge: string;
  description: string;
}

export interface SpeakingRubricInput {
  relevanceScore: number;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  completenessScore: number;
}

export interface SpeakingEvaluationResult {
  overallScore: number;
  breakdown: {
    relevance: { score: number; weight: number };
    grammar: { score: number; weight: number };
    vocabulary: { score: number; weight: number };
    fluency: { score: number; weight: number };
    pronunciation: { score: number; weight: number };
    completeness: { score: number; weight: number };
  };
  levelAssigned: SkillBridgeLevelInfo;
  strengths: string[];
  improvements: string[];
  tips: string[];
}

export interface WritingRubricInput {
  taskCompletionScore: number;
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  wordCount: number;
}

export interface WritingEvaluationResult {
  overallScore: number;
  breakdown: {
    taskCompletion: { score: number; weight: number };
    grammar: { score: number; weight: number };
    vocabulary: { score: number; weight: number };
    clarity: { score: number; weight: number };
  };
  levelAssigned: SkillBridgeLevelInfo;
  grammarCorrections: Array<{ original: string; suggestion: string; reason: string }>;
  vocabularyEnhancements: Array<{ original: string; upgraded: string; context: string }>;
  suggestedRewrite: string;
  strengths: string[];
  improvements: string[];
}

/**
 * Strict server-side score clamping between 0 and 100
 */
export function clampScore(score: number): number {
  const num = Number(score);
  if (isNaN(num)) return 0;
  const clamped = Math.min(100, Math.max(0, num));
  return Math.round(clamped * 10) / 10;
}

/**
 * Maps numerical scores to SkillBridge internal communication levels (1 - 5)
 */
export function getSkillBridgeLevel(score: number): SkillBridgeLevelInfo {
  const s = clampScore(score);
  if (s >= 85.0) {
    return {
      level: 5,
      levelName: 'Level 5 — Advanced',
      badge: '🏆 Advanced',
      description: 'Fluent technical debate, flawless articulation, high-stakes interview readiness.'
    };
  }
  if (s >= 70.0) {
    return {
      level: 4,
      levelName: 'Level 4 — Proficient',
      badge: '💼 Proficient',
      description: 'Confident technical standups, structured STAR responses, minimal hesitation.'
    };
  }
  if (s >= 55.0) {
    return {
      level: 3,
      levelName: 'Level 3 — Developing',
      badge: '📈 Developing',
      description: 'Solid core vocabulary and grammar; occasional hesitation in spontaneous dialogue.'
    };
  }
  if (s >= 40.0) {
    return {
      level: 2,
      levelName: 'Level 2 — Foundation',
      badge: '🌱 Foundation',
      description: 'Basic professional phrases and sentences; requires guidance for complex explanations.'
    };
  }
  return {
    level: 1,
    levelName: 'Level 1 — Beginner',
    badge: '🐣 Beginner',
    description: 'Starting vocabulary, basic greetings, and simple grammatical introductions.'
  };
}

/**
 * Evaluates speaking responses using the 6-dimension weighted rubric
 * Weights: Relevance (25%), Grammar (20%), Vocabulary (15%), Fluency (20%), Pronunciation (10%), Completeness (10%)
 */
export function evaluateSpeakingResponse(
  input: SpeakingRubricInput,
  languageCode: 'en' | 'ja' | 'de'
): SpeakingEvaluationResult {
  const rel = clampScore(input.relevanceScore);
  const gram = clampScore(input.grammarScore);
  const voc = clampScore(input.vocabularyScore);
  const flu = clampScore(input.fluencyScore);
  const pro = clampScore(input.pronunciationScore);
  const comp = clampScore(input.completenessScore);

  const weightedOverall = clampScore(
    rel * 0.25 +
    gram * 0.20 +
    voc * 0.15 +
    flu * 0.20 +
    pro * 0.10 +
    comp * 0.10
  );

  const levelInfo = getSkillBridgeLevel(weightedOverall);

  const strengths: string[] = [];
  const improvements: string[] = [];
  const tips: string[] = [];

  if (rel >= 70) strengths.push('Directly addressed the technical prompt with high topical relevance.');
  else improvements.push('Focus on directly answering the core technical prompt before adding tangents.');

  if (flu >= 70) strengths.push('Maintained a steady, confident conversational pace with natural sentence flow.');
  else improvements.push('Practice pausing deliberately instead of using filler syllables (um, like, eh).');

  if (gram >= 70) strengths.push('Accurate grammatical tense usage in describing technical systems and tasks.');
  else improvements.push('Review past simple vs present perfect distinctions when recounting completed projects.');

  if (voc >= 70) strengths.push('Employed precise domain terminology and effective action verbs.');
  else improvements.push('Incorporate high-impact engineering verbs (e.g., spearheaded, mitigated, optimized).');

  if (pro >= 70) strengths.push('Crisp articulation and clear consonant/vowel phonation.');
  else improvements.push('Slow down slightly on multisyllabic terms to ensure every syllable is audible.');

  if (comp >= 70) strengths.push('Delivered a complete, satisfying answer covering context and outcomes.');
  else improvements.push('Conclude responses with a clear summary or tangible takeaway.');

  // Language specific tips
  if (languageCode === 'ja') {
    tips.push('Maintain consistent desu/masu (丁寧語) endings throughout the answer.');
    tips.push('Use transitional phrases like「例えば」(for example) to structure technical examples.');
  } else if (languageCode === 'de') {
    tips.push('Remember the Verb-Second (V2) rule in main clauses and verb-end order in subordinate clauses.');
    tips.push('Use specific compound nouns like "Fehlerbehebung" or "Softwarearchitektur".');
  } else {
    tips.push('Adopt the STAR method (Situation, Task, Action, Result) for behavioral questions.');
    tips.push('Aim for a crisp 60-90 second response window for typical interview answers.');
  }

  return {
    overallScore: weightedOverall,
    breakdown: {
      relevance: { score: rel, weight: 0.25 },
      grammar: { score: gram, weight: 0.20 },
      vocabulary: { score: voc, weight: 0.15 },
      fluency: { score: flu, weight: 0.20 },
      pronunciation: { score: pro, weight: 0.10 },
      completeness: { score: comp, weight: 0.10 }
    },
    levelAssigned: levelInfo,
    strengths: strengths.length > 0 ? strengths : ['Good initial attempt; completed audio submission successfully.'],
    improvements: improvements.length > 0 ? improvements : ['Continue daily practice to build spontaneous fluency.'],
    tips
  };
}

/**
 * Evaluates writing responses using the 4-dimension weighted rubric
 * Weights: Task Completion (30%), Grammar (25%), Vocabulary (25%), Clarity (20%)
 */
export function evaluateWritingResponse(
  input: WritingRubricInput,
  languageCode: 'en' | 'ja' | 'de',
  originalText: string,
  prompt: string
): WritingEvaluationResult {
  const task = clampScore(input.taskCompletionScore);
  const gram = clampScore(input.grammarScore);
  const voc = clampScore(input.vocabularyScore);
  const clar = clampScore(input.clarityScore);

  const weightedOverall = clampScore(
    task * 0.30 +
    gram * 0.25 +
    voc * 0.25 +
    clar * 0.20
  );

  const levelInfo = getSkillBridgeLevel(weightedOverall);

  // Default suggested rewrite based on language
  let suggestedRewrite = '';
  const grammarCorrections: Array<{ original: string; suggestion: string; reason: string }> = [];
  const vocabularyEnhancements: Array<{ original: string; upgraded: string; context: string }> = [];

  if (languageCode === 'ja') {
    suggestedRewrite = `拝啓\n\nお疲れ様です。Alex Riveraです。\n\n本件についてご報告いたします。${prompt}に関して、現在の進捗状況および今後の対応計画をまとめました。\n\n詳細な仕様書および検証結果はリポジトリに反映済みです。ご確認のほど、よろしくお願い申し上げます。\n\n敬具`;
    grammarCorrections.push({
      original: 'ですけど',
      suggestion: 'ですが / ございますが',
      reason: 'Use formal conjunctions in business communications.'
    });
    vocabularyEnhancements.push({
      original: '直しました',
      upgraded: '修正を完了いたしました',
      context: 'Demonstrates professional polish in team updates.'
    });
  } else if (languageCode === 'de') {
    suggestedRewrite = `Sehr geehrtes Team,\n\nhiermit möchte ich Ihnen ein kurzes Update bezüglich ${prompt} geben.\n\nDie Implementierung wurde erfolgreich abgeschlossen und die Integrationstests zeigen eine signifikante Stabilität. Als nächste Schritte stehen die Abnahme und das Deployment an.\n\nMit freundlichen Grüßen\nAlex Rivera`;
    grammarCorrections.push({
      original: 'Wir haben machen',
      suggestion: 'Wir haben implementiert / durchgeführt',
      reason: 'Correct auxiliary verb agreement and past participle form.'
    });
    vocabularyEnhancements.push({
      original: 'Problem',
      upgraded: 'Herausforderung / Fehlerursache',
      context: 'Conveys technical precision in sprint debriefs.'
    });
  } else {
    suggestedRewrite = `Hi Team,\n\nBLUF: Regarding ${prompt}, the current deployment and verification milestones have been reviewed.\n\nKey Highlights:\n- Identified and resolved the root cause bottleneck.\n- Verified system stability across automated regression test suites.\n\nNext Steps:\n1. Monitor production telemetry for 24 hours.\n2. Circulate post-implementation review by EOD.\n\nBest regards,\nAlex Rivera`;
    grammarCorrections.push({
      original: 'has error',
      suggestion: 'is throwing an unhandled exception / returning 500 status',
      reason: 'Precision in technical error nomenclature.'
    });
    vocabularyEnhancements.push({
      original: 'worked on',
      upgraded: 'architected / spearheaded',
      context: 'Action-oriented language shows engineering leadership.'
    });
  }

  const strengths = [
    'Conveyed the core message clearly to the target recipient.',
    'Organized points with logical progression.'
  ];
  const improvements = [
    'Adopt the BLUF (Bottom Line Up Front) principle for faster decision-making.',
    'Incorporate quantifiable metrics where appropriate.'
  ];

  return {
    overallScore: weightedOverall,
    breakdown: {
      taskCompletion: { score: task, weight: 0.30 },
      grammar: { score: gram, weight: 0.25 },
      vocabulary: { score: voc, weight: 0.25 },
      clarity: { score: clar, weight: 0.20 }
    },
    levelAssigned: levelInfo,
    grammarCorrections,
    vocabularyEnhancements,
    suggestedRewrite,
    strengths,
    improvements
  };
}

/**
 * Logs verified communication skill evidence to student_skill_history
 * and updates student_languages mastery record
 */
export function logCommunicationEvidence(params: {
  studentId: string;
  languageCode: 'en' | 'ja' | 'de';
  score: number;
  source: 'communication_assessment' | 'speaking_practice' | 'writing_practice' | 'conversation_mock_test';
  assessmentId?: string;
  subSkills?: {
    speaking?: number;
    listening?: number;
    reading?: number;
    writing?: number;
    grammar?: number;
    vocabulary?: number;
    pronunciation?: number;
    conversation?: number;
  };
}) {
  const { studentId, languageCode, score, source, assessmentId, subSkills } = params;
  const clampedScore = clampScore(score);
  const langId = `lang-${languageCode}`;
  const skillId = `skl-${languageCode}`;
  const levelInfo = getSkillBridgeLevel(clampedScore);

  // 1. Insert skill history entry
  execute(
    `INSERT INTO student_skill_history (
      id, user_id, skill_id, level, score, confidence, source, assessment_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      uuidv4(),
      studentId,
      skillId,
      levelInfo.levelName,
      clampedScore,
      clampedScore >= 75 ? 'High' : 'Medium',
      source,
      assessmentId || null
    ]
  );

  // 2. Query or insert student_languages track
  const existingLang = queryOne<{
    id: string;
    overall_score: number;
    completed_lessons_count: number;
    practice_sessions_count: number;
    speaking_score: number;
    listening_score: number;
    reading_score: number;
    writing_score: number;
    grammar_score: number;
    vocabulary_score: number;
    pronunciation_score: number;
    conversation_score: number;
  }>(
    `SELECT * FROM student_languages WHERE student_id = ? AND language_id = ?`,
    [studentId, langId]
  );

  if (existingLang) {
    // Calculate new rolling average score
    const newOverall = clampScore(existingLang.overall_score * 0.4 + clampedScore * 0.6);
    const newLevel = getSkillBridgeLevel(newOverall);

    const speaking = subSkills?.speaking !== undefined ? clampScore(subSkills.speaking) : existingLang.speaking_score;
    const listening = subSkills?.listening !== undefined ? clampScore(subSkills.listening) : existingLang.listening_score;
    const reading = subSkills?.reading !== undefined ? clampScore(subSkills.reading) : existingLang.reading_score;
    const writing = subSkills?.writing !== undefined ? clampScore(subSkills.writing) : existingLang.writing_score;
    const grammar = subSkills?.grammar !== undefined ? clampScore(subSkills.grammar) : existingLang.grammar_score;
    const vocabulary = subSkills?.vocabulary !== undefined ? clampScore(subSkills.vocabulary) : existingLang.vocabulary_score;
    const pronunciation = subSkills?.pronunciation !== undefined ? clampScore(subSkills.pronunciation) : existingLang.pronunciation_score;
    const conversation = subSkills?.conversation !== undefined ? clampScore(subSkills.conversation) : existingLang.conversation_score;

    execute(
      `UPDATE student_languages SET
        current_level = ?,
        level_name = ?,
        overall_score = ?,
        speaking_score = ?,
        listening_score = ?,
        reading_score = ?,
        writing_score = ?,
        grammar_score = ?,
        vocabulary_score = ?,
        pronunciation_score = ?,
        conversation_score = ?,
        practice_sessions_count = practice_sessions_count + 1,
        last_activity_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        newLevel.level,
        newLevel.levelName,
        newOverall,
        speaking,
        listening,
        reading,
        writing,
        grammar,
        vocabulary,
        pronunciation,
        conversation,
        existingLang.id
      ]
    );
  } else {
    // Insert new track
    execute(
      `INSERT INTO student_languages (
        id, student_id, language_id, current_level, level_name, overall_score,
        speaking_score, listening_score, reading_score, writing_score,
        grammar_score, vocabulary_score, pronunciation_score, conversation_score,
        completed_lessons_count, practice_sessions_count, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)`,
      [
        uuidv4(),
        studentId,
        langId,
        levelInfo.level,
        levelInfo.levelName,
        clampedScore,
        subSkills?.speaking || clampedScore,
        subSkills?.listening || clampedScore,
        subSkills?.reading || clampedScore,
        subSkills?.writing || clampedScore,
        subSkills?.grammar || clampedScore,
        subSkills?.vocabulary || clampedScore,
        subSkills?.pronunciation || clampedScore,
        subSkills?.conversation || clampedScore
      ]
    );
  }
}

/**
 * Updates student communication streak, calendar, and milestone badges
 */
export function recordCommunicationActivity(studentId: string): {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  newBadgesAwarded: Array<{ id: string; title: string; desc: string }>;
} {
  const today = new Date().toISOString().split('T')[0];

  const streakRecord = queryOne<{
    id: string;
    current_streak: number;
    longest_streak: number;
    total_active_days: number;
    last_activity_date: string | null;
    streak_calendar_json: string;
    badges_json: string;
  }>(
    `SELECT * FROM communication_streaks WHERE student_id = ?`,
    [studentId]
  );

  let currentStreak = 1;
  let longestStreak = 1;
  let totalActiveDays = 1;
  let calendar: Array<{ date: string; count: number }> = [];
  let badges: Array<{ id: string; title: string; desc: string }> = [];
  const newBadgesAwarded: Array<{ id: string; title: string; desc: string }> = [];

  if (streakRecord) {
    try {
      calendar = JSON.parse(streakRecord.streak_calendar_json || '[]');
      badges = JSON.parse(streakRecord.badges_json || '[]');
    } catch (e) {
      calendar = [];
      badges = [];
    }

    currentStreak = streakRecord.current_streak;
    longestStreak = streakRecord.longest_streak;
    totalActiveDays = streakRecord.total_active_days;

    const lastDate = streakRecord.last_activity_date;
    if (lastDate === today) {
      // Already active today; increment day count in calendar
      const dayEntry = calendar.find(c => c.date === today);
      if (dayEntry) {
        dayEntry.count += 1;
      } else {
        calendar.push({ date: today, count: 1 });
      }
    } else {
      // Check if consecutive
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        currentStreak += 1;
      } else {
        // Streak broke, reset to 1
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      totalActiveDays += 1;

      calendar.push({ date: today, count: 1 });
      if (calendar.length > 30) calendar = calendar.slice(-30);
    }
  } else {
    calendar.push({ date: today, count: 1 });
  }

  // Check milestone badges
  const checkAndAwardBadge = (id: string, title: string, desc: string) => {
    if (!badges.some(b => b.id === id)) {
      const badgeObj = { id, title, desc };
      badges.push(badgeObj);
      newBadgesAwarded.push(badgeObj);
    }
  };

  if (currentStreak >= 3) {
    checkAndAwardBadge('b-comm-3', '🗣️ Fluent Voice', 'Maintained 3 consecutive days of speaking and conversation practice.');
  }
  if (currentStreak >= 7) {
    checkAndAwardBadge('b-comm-7', '🔥 Week of Fluency', 'Completed a full 7-day communication streak.');
  }
  if (totalActiveDays >= 5) {
    checkAndAwardBadge('b-practice-5', '🎯 Dedicated Articulator', 'Completed practice activities on 5 distinct days.');
  }
  if (totalActiveDays >= 14) {
    checkAndAwardBadge('b-practice-14', '🚀 Placement Articulator', 'Achieved 14 days of dedicated career communication prep.');
  }

  execute(
    `INSERT INTO communication_streaks (
      id, student_id, user_id, current_streak, longest_streak, total_active_days,
      last_activity_date, streak_calendar_json, badges_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id) DO UPDATE SET
      current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak,
      total_active_days = excluded.total_active_days,
      last_activity_date = excluded.last_activity_date,
      streak_calendar_json = excluded.streak_calendar_json,
      badges_json = excluded.badges_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      streakRecord?.id || `cstrk-${studentId}`,
      studentId,
      studentId,
      currentStreak,
      longestStreak,
      totalActiveDays,
      today,
      JSON.stringify(calendar),
      JSON.stringify(badges)
    ]
  );

  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    newBadgesAwarded
  };
}
