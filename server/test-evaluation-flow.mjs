/**
 * Test script for Assessment Submission, Evaluation, Report Generation & Course Starting
 */

import { execute, queryOne, queryAll, initDatabase, resetUserData } from './dist/db/database.js';
import { evaluateAssessmentSubmission } from './dist/services/ai/aiReportService.js';
import { generatePersonalizedRecommendationsForStudent } from './dist/services/ai/courseRecommendationEngine.js';
import { v4 as uuidv4 } from 'uuid';

console.log('--- TESTING EVALUATION & RECOMMENDATIONS PIPELINE ---');

initDatabase();
resetUserData(false);

// 1. Create a student user and profile
const userId = 'usr-test-eval-1';
execute(`
  INSERT INTO users (id, name, email, password_hash, role, account_status, email_verified, created_at)
  VALUES (?, 'Charlie Dev', 'charlie@example.com', 'hash123', 'student', 'active', 1, CURRENT_TIMESTAMP)
`, [userId]);

execute(`
  INSERT INTO student_profiles (
    id, user_id, college_name, department, current_year, graduation_year,
    target_role_id, career_interest, current_level, career_readiness_score, created_at
  ) VALUES (?, ?, 'Apex University', 'Computer Science', 3, 2027, 'role-software-dev', 'Software Engineer', 'Beginner', 0, CURRENT_TIMESTAMP)
`, [`prof-${userId}`, userId]);

// 2. Create an assessment and questions
const assessmentId = `asm-test-${uuidv4().substring(0, 6)}`;
execute(`
  INSERT INTO assessments (id, title, type, category, target_role_id, duration_minutes, passing_score, created_at)
  VALUES (?, 'AI Adaptive Baseline Assessment', 'initial', 'technical', 'role-software-dev', 30, 60, CURRENT_TIMESTAMP)
`, [assessmentId]);

const sDsa = queryOne("SELECT id FROM skills WHERE name = 'Data Structures & Algorithms'")?.id || 'sk-dsa';
const sPy = queryOne("SELECT id FROM skills WHERE name = 'Python'")?.id || 'sk-py';

const q1 = `q-${uuidv4().substring(0, 6)}`;
execute(`
  INSERT INTO questions (id, assessment_id, skill_id, question_text, question_type, difficulty, points, options_json, correct_answer_json, explanation)
  VALUES (?, ?, ?, 'What is the time complexity of searching in a balanced BST?', 'mcq', 'medium', 10, '["O(1)","O(log n)","O(n)","O(n^2)"]', '"O(log n)"', 'Balanced BSTs halve the search space at each step.')
`, [q1, assessmentId, sDsa]);

const q2 = `q-${uuidv4().substring(0, 6)}`;
execute(`
  INSERT INTO questions (id, assessment_id, skill_id, question_text, question_type, difficulty, points, options_json, correct_answer_json, explanation)
  VALUES (?, ?, ?, 'Explain the difference between mutable and immutable data structures in Python.', 'short_answer', 'medium', 10, '[]', '"Mutable objects can be changed after creation, immutable objects cannot."', 'Lists and dicts are mutable, while tuples and strings are immutable.')
`, [q2, assessmentId, sPy]);

// 3. Create assessment attempt
const attemptId = `atm-${uuidv4().substring(0, 6)}`;
execute(`
  INSERT INTO assessment_attempts (id, user_id, assessment_id, status, started_at)
  VALUES (?, ?, ?, 'in_progress', CURRENT_TIMESTAMP)
`, [attemptId, userId, assessmentId]);

import { gemini } from './dist/services/ai/gemini.client.js';

// Simulate Gemini returning verified evaluation
gemini.generateJSONWithResult = async () => ({
  success: true,
  data: {
    programmingScore: 78,
    logicalReasoningScore: 82,
    communicationScore: 70,
    problemSolvingScore: 75,
    overallScore: 76,
    overallLevel: 'Proficient',
    strengths: [
      'Solid algorithmic complexity analysis and data structure fundamentals',
      'Accurate understanding of mutable vs immutable state in Python'
    ],
    weaknesses: [
      'Edge-case boundary testing in dynamic scenarios',
      'Advanced recursion time-complexity optimization'
    ],
    priorityImprovements: [
      'Complete Algorithmic Problem Solving track',
      'Practice data structure edge cases daily'
    ],
    questionResults: [
      { questionId: q1, score: 10, isCorrect: true, feedback: 'Accurately identified O(log n) balanced search complexity.' },
      { questionId: q2, score: 10, isCorrect: true, feedback: 'Clear and correct distinction between mutable lists and immutable tuples.' }
    ]
  }
});
const answers = {
  [q1]: 'O(log n)',
  [q2]: 'Mutable objects like lists can be modified in-place, whereas immutable objects like tuples cannot be changed.'
};

console.log('Evaluating submission for Charlie...');
const evalResult = await evaluateAssessmentSubmission(userId, attemptId, answers);

console.log('Evaluation Result Success:', evalResult.success);
console.log('Overall Score:', evalResult.overallScore);
console.log('Category Scores:', evalResult.categoryScores);
console.log('Strengths:', evalResult.strengths);
console.log('Weaknesses:', evalResult.weaknesses);
console.log('Generated Recommendations count:', evalResult.recommendations?.length);

if (!evalResult.success) {
  console.error('Evaluation failed:', evalResult.error);
  process.exit(1);
}

// 5. Verify database records
const report = queryOne('SELECT * FROM skill_reports WHERE user_id = ?', [userId]);
if (!report) {
  console.error('❌ Skill report record was not created!');
  process.exit(1);
}
console.log('✓ Verified skill_reports row created in DB');

const recs = queryAll('SELECT * FROM recommendations WHERE user_id = ?', [userId]);
console.log(`✓ Stored ${recs.length} personalized recommendations in recommendations table`);

const gaps = queryAll('SELECT * FROM skill_gaps WHERE user_id = ?', [userId]);
console.log(`✓ Stored ${gaps.length} diagnosed skill gaps in skill_gaps table`);

const studentProfile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
console.log(`✓ Student career_readiness_score updated to: ${studentProfile.career_readiness_score}%`);

if (studentProfile.career_readiness_score <= 0) {
  console.error('❌ Career readiness score was not updated!');
  process.exit(1);
}

console.log('\n✅ EVALUATION & RECOMMENDATION PIPELINE TEST PASSED FULLY!\n');
process.exit(0);
