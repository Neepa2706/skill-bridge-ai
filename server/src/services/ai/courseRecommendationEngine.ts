import { queryAll, queryOne, execute } from '../../db/database.js';
import { SkillGapItem } from './skillGapEngine.js';
import { v4 as uuidv4 } from 'uuid';

export interface PersonalizedCourseRecommendation {
  id: string;
  courseId: string;
  courseTitle: string;
  skillCovered: string;
  difficulty: string;
  reason: string;
  learningObjective: string;
  estimatedDuration: string;
  status: 'recommended' | 'started' | 'completed';
  thumbnail?: string;
  category?: string;
}

export interface CourseRecommendationResult {
  recommendations: PersonalizedCourseRecommendation[];
  reasoning: string;
}

/**
 * Generates personalized course recommendations based on actual assessment results,
 * low-scoring skills, department, current level, and target role.
 * Stores them in the database for the user.
 */
export function generatePersonalizedRecommendationsForStudent(
  userId: string,
  gaps: SkillGapItem[],
  categoryScores?: { programming: number; logicalReasoning: number; communication: number; problemSolving: number }
): CourseRecommendationResult {
  if (!gaps || gaps.length === 0) {
    return {
      recommendations: [],
      reasoning: 'Complete your first AI assessment to receive personalized course recommendations.'
    };
  }

  const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);

  const allCourses = queryAll(`
    SELECT c.*, s.name as primary_skill_name 
    FROM courses c 
    LEFT JOIN skills s ON c.primary_skill_id = s.id
  `);

  const enrollments = queryAll(`
    SELECT course_id, status FROM course_enrollments WHERE user_id = ? OR student_id = ?
  `, [userId, userId]);
  const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));

  // Sort gaps by priority and gap percentage
  const sortedGaps = [...gaps].sort((a, b) => {
    if (a.gapStatus === 'critical' && b.gapStatus !== 'critical') return -1;
    if (b.gapStatus === 'critical' && a.gapStatus !== 'critical') return 1;
    return b.gapPercentage - a.gapPercentage;
  });

  const recommendations: PersonalizedCourseRecommendation[] = [];

  for (const course of allCourses) {
    if (enrolledCourseIds.has(course.id)) continue;

    const courseTitle = course.title;
    const skillName = course.primary_skill_name || course.category;
    const skillLower = skillName.toLowerCase();
    const titleLower = courseTitle.toLowerCase();

    // Check if this course directly bridges one of the student's gaps
    const matchingGap = sortedGaps.find(g =>
      skillLower.includes(g.skillName.toLowerCase()) ||
      titleLower.includes(g.skillName.toLowerCase()) ||
      (g.skillName.toLowerCase().includes('python') && titleLower.includes('python')) ||
      (g.skillName.toLowerCase().includes('algorithm') && titleLower.includes('data structure')) ||
      (g.skillName.toLowerCase().includes('sql') && titleLower.includes('sql')) ||
      (g.skillName.toLowerCase().includes('problem solving') && titleLower.includes('algorithm'))
    );

    if (matchingGap || (categoryScores && categoryScores.programming < 60 && titleLower.includes('python'))) {
      const currentScore = matchingGap ? Math.round(matchingGap.currentLevel) : 50;
      const targetScore = matchingGap ? Math.round(matchingGap.requiredLevel) : 75;
      const department = profile?.department || 'your department';
      const targetRole = profile?.career_interest || 'Software Developer';

      let reason = `Recommended because your verified score in ${matchingGap?.skillName || 'Programming'} is ${currentScore}%, which is below the ${targetScore}% benchmark for ${targetRole}.`;
      if (matchingGap?.gapStatus === 'critical') {
        reason = `High Priority: You have a critical gap in ${matchingGap.skillName} (${currentScore}% vs ${targetScore}% required). This course builds foundational competency tailored for ${department} students.`;
      }

      let learningObjective = `Master core principles, algorithmic patterns, and production techniques in ${matchingGap?.skillName || skillName}.`;
      if (titleLower.includes('python')) {
        learningObjective = 'Build solid Python fundamentals, data structures, and idiomatic coding practices required for placement screening.';
      } else if (titleLower.includes('data structure') || titleLower.includes('algorithm')) {
        learningObjective = 'Gain intuitive mastery over two-pointers, sliding windows, recursion, and balanced trees to pass technical interviews.';
      } else if (titleLower.includes('sql') || titleLower.includes('database')) {
        learningObjective = 'Design robust normalized schemas, optimize queries with indexing, and handle multi-table transactional logic.';
      }

      const recId = `rec-${uuidv4()}`;
      const rec: PersonalizedCourseRecommendation = {
        id: recId,
        courseId: course.id,
        courseTitle: course.title,
        skillCovered: matchingGap?.skillName || skillName,
        difficulty: course.difficulty || 'Beginner',
        reason,
        learningObjective,
        estimatedDuration: course.estimated_hours ? `${course.estimated_hours} Hours` : '12 Hours',
        status: 'recommended',
        thumbnail: course.thumbnail,
        category: course.category
      };

      recommendations.push(rec);

      // Upsert into recommendations table
      execute(
        `INSERT OR REPLACE INTO recommendations (
          id, user_id, course_id, course_title, skill_covered, difficulty,
          reason, learning_objective, estimated_duration, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'recommended', CURRENT_TIMESTAMP)`,
        [
          recId,
          userId,
          course.id,
          course.title,
          rec.skillCovered,
          rec.difficulty,
          rec.reason,
          rec.learningObjective,
          rec.estimatedDuration
        ]
      );
    }
  }

  return {
    recommendations,
    reasoning: recommendations.length > 0
      ? `Generated ${recommendations.length} personalized recommendation(s) addressing your verified skill gaps.`
      : 'No critical gaps identified. You are currently aligned with target benchmarks.'
  };
}

/**
 * Retrieves stored recommendations for a student from the database
 */
export function getStoredRecommendationsForStudent(userId: string): PersonalizedCourseRecommendation[] {
  const rows = queryAll(`
    SELECT r.*, c.thumbnail, c.category, ce.status as enrollment_status, ce.progress_percentage
    FROM recommendations r
    JOIN courses c ON r.course_id = c.id
    LEFT JOIN course_enrollments ce ON (ce.user_id = r.user_id AND ce.course_id = r.course_id)
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `, [userId]);

  return rows.map(r => ({
    id: r.id,
    courseId: r.course_id,
    courseTitle: r.course_title,
    skillCovered: r.skill_covered,
    difficulty: r.difficulty,
    reason: r.reason,
    learningObjective: r.learning_objective,
    estimatedDuration: r.estimated_duration,
    status: r.enrollment_status === 'in_progress' ? 'started' : r.enrollment_status === 'completed' ? 'completed' : r.status,
    thumbnail: r.thumbnail,
    category: r.category
  }));
}

/**
 * Backward compatibility alias for existing router calls
 */
export function recommendCoursesForStudent(
  gaps: SkillGapItem[],
  completedCourseIds: string[] = []
) {
  if (!gaps || gaps.length === 0) {
    return {
      requiredCourses: [],
      recommendedCourses: [],
      advancedCourses: [],
      reasoning: 'Complete your first AI assessment to receive recommendations.'
    };
  }

  const allCourses = queryAll(`
    SELECT c.*, s.name as primary_skill_name 
    FROM courses c 
    LEFT JOIN skills s ON c.primary_skill_id = s.id
  `);

  const criticalSkills = new Set(gaps.filter(g => g.gapStatus === 'critical').map(g => g.skillName.toLowerCase()));
  const improvementSkills = new Set(gaps.filter(g => g.gapStatus === 'needs_improvement').map(g => g.skillName.toLowerCase()));

  const required: any[] = [];
  const recommended: any[] = [];
  const advanced: any[] = [];

  for (const course of allCourses) {
    const isCompleted = completedCourseIds.includes(course.id);
    const skillNameLower = (course.primary_skill_name || '').toLowerCase();
    const courseTitleLower = (course.title || '').toLowerCase();

    const matchesCritical = Array.from(criticalSkills).some(s => skillNameLower.includes(s) || courseTitleLower.includes(s));
    const matchesImprovement = Array.from(improvementSkills).some(s => skillNameLower.includes(s) || courseTitleLower.includes(s));

    const courseData = {
      ...course,
      isCompleted,
      targetRoles: JSON.parse(course.target_role_ids_json || '[]')
    };

    if (matchesCritical) {
      if (!isCompleted) required.push(courseData);
    } else if (matchesImprovement) {
      if (!isCompleted) recommended.push(courseData);
    } else {
      advanced.push(courseData);
    }
  }

  return {
    requiredCourses: required,
    recommendedCourses: recommended,
    advancedCourses: advanced,
    reasoning: `Recommended ${required.length} course(s) targeting verified gaps.`
  };
}
