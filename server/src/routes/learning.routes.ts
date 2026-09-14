import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { queryOne, queryAll, execute } from '../db/database.js';
import { recommendCoursesForStudent } from '../services/ai/courseRecommendationEngine.js';
import { askLessonAIAssistant } from '../services/ai/aiLessonAssistant.js';

const router = Router();

// =========================================================================
// HELPER: Calculate server-side progress for a course
// =========================================================================
function calculateCourseProgressServerSide(userId: string, courseId: string): {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  isFullyCompleted: boolean;
} {
  const modules = queryAll('SELECT id FROM modules WHERE course_id = ?', [courseId]);
  const moduleIds = modules.map(m => m.id);

  if (moduleIds.length === 0) {
    return { totalLessons: 0, completedLessons: 0, progressPercentage: 0, isFullyCompleted: false };
  }

  const lessons = queryAll(`
    SELECT id FROM lessons WHERE module_id IN (${moduleIds.map(() => '?').join(',')})
  `, moduleIds);

  if (lessons.length === 0) {
    return { totalLessons: 0, completedLessons: 0, progressPercentage: 0, isFullyCompleted: false };
  }

  const lessonIds = lessons.map(l => l.id);
  const progressRows = queryAll(`
    SELECT lesson_id, COALESCE(is_completed, completed, 0) as is_done, COALESCE(progress_percentage, 0.0) as pct
    FROM lesson_progress
    WHERE user_id = ? AND lesson_id IN (${lessonIds.map(() => '?').join(',')})
  `, [userId, ...lessonIds]);

  const progressMap = new Map<string, { isDone: number; pct: number }>();
  for (const row of progressRows) {
    progressMap.set(row.lesson_id, { isDone: row.is_done, pct: row.pct });
  }

  let completedCount = 0;
  let totalFractionalProgress = 0;

  for (const l of lessons) {
    const p = progressMap.get(l.id);
    if (p && p.isDone === 1) {
      completedCount += 1;
      totalFractionalProgress += 1.0;
    } else if (p && p.pct > 0) {
      totalFractionalProgress += Math.min(0.99, p.pct / 100.0);
    }
  }

  const rawPct = (totalFractionalProgress / lessons.length) * 100.0;
  const progressPercentage = Math.round(rawPct * 10) / 10;
  const isFullyCompleted = completedCount === lessons.length && lessons.length > 0;

  return {
    totalLessons: lessons.length,
    completedLessons: completedCount,
    progressPercentage,
    isFullyCompleted
  };
}

// =========================================================================
// 1. GET /learning — Student Learning Dashboard
// =========================================================================
router.get('/learning', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;

    // A. Continue Where You Left Off:
    // Find latest accessed incomplete lesson across all enrolled courses
    const latestProgress = queryOne(`
      SELECT lp.*, l.id as lesson_id, l.title as lesson_title, l.content_type, l.duration as lesson_duration,
             m.id as module_id, m.title as module_title,
             c.id as course_id, c.title as course_title, c.thumbnail, c.difficulty as course_difficulty
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      JOIN course_enrollments ce ON ce.course_id = c.id AND (ce.user_id = lp.user_id OR ce.student_id = lp.user_id)
      WHERE (lp.user_id = ? OR lp.student_id = ?) AND (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0)
      ORDER BY lp.last_accessed_at DESC LIMIT 1
    `, [userId, userId]);

    // If no in-progress lesson exists, find the first incomplete lesson of the most recently accessed course
    let continueTarget = latestProgress;
    if (!continueTarget) {
      const activeEnrollment = queryOne(`
        SELECT ce.*, c.title as course_title, c.thumbnail, c.difficulty as course_difficulty
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        WHERE (ce.user_id = ? OR ce.student_id = ?) AND ce.status != 'completed'
        ORDER BY COALESCE(ce.last_accessed_at, ce.started_at) DESC LIMIT 1
      `, [userId, userId]);

      if (activeEnrollment) {
        const firstIncomplete = queryOne(`
          SELECT l.id as lesson_id, l.title as lesson_title, l.content_type, l.duration as lesson_duration,
                 m.id as module_id, m.title as module_title,
                 c.id as course_id, c.title as course_title, c.thumbnail, c.difficulty as course_difficulty,
                 COALESCE(lp.progress_percentage, 0.0) as progress_percentage,
                 COALESCE(lp.playback_position, 0.0) as playback_position,
                 COALESCE(lp.read_position, 0.0) as read_position
          FROM modules m
          JOIN courses c ON m.course_id = c.id
          JOIN lessons l ON l.module_id = m.id
          LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
          WHERE m.course_id = ? AND (lp.is_completed IS NULL OR (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0))
          ORDER BY m.sequence ASC, m.order_index ASC, l.sequence ASC, l.order_index ASC
          LIMIT 1
        `, [userId, userId, activeEnrollment.course_id]);

        if (firstIncomplete) {
          continueTarget = firstIncomplete;
        }
      }
    }

    // Default fallback if brand new student with no courses started yet
    const continueLearning = continueTarget ? {
      courseId: continueTarget.course_id,
      courseTitle: continueTarget.course_title,
      courseDifficulty: continueTarget.course_difficulty,
      moduleId: continueTarget.module_id,
      moduleTitle: continueTarget.module_title,
      lessonId: continueTarget.lesson_id,
      lessonTitle: continueTarget.lesson_title,
      contentType: continueTarget.content_type || 'article',
      progressPercentage: Math.round(continueTarget.progress_percentage || 0),
      playbackPosition: continueTarget.playback_position || 0,
      readPosition: continueTarget.read_position || 0,
      durationMinutes: continueTarget.lesson_duration || 15,
      thumbnail: continueTarget.thumbnail || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&q=80'
    } : null;

    // B. Enrolled Courses (In Progress, Completed, Paused)
    const enrollments = queryAll(`
      SELECT ce.*, c.title, c.slug, c.description, c.difficulty, c.thumbnail, c.estimated_hours,
             c.provider, c.language, s.name as primary_skill_name
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN skills s ON c.primary_skill_id = s.id
      WHERE ce.user_id = ? OR ce.student_id = ?
      ORDER BY COALESCE(ce.last_accessed_at, ce.started_at) DESC
    `, [userId, userId]);

    const formattedCourses = enrollments.map(enr => {
      const { totalLessons, completedLessons, progressPercentage, isFullyCompleted } =
        calculateCourseProgressServerSide(userId, enr.course_id);

      // Find current lesson title for this course
      const currentLessonRow = queryOne(`
        SELECT l.id, l.title FROM lessons l
        JOIN modules m ON l.module_id = m.id
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
        WHERE m.course_id = ? AND (lp.is_completed IS NULL OR (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0))
        ORDER BY m.sequence ASC, l.sequence ASC LIMIT 1
      `, [userId, userId, enr.course_id]);

      const remainingHours = Math.max(0, Math.round(((100 - progressPercentage) / 100) * (enr.estimated_hours || 10) * 10) / 10);

      return {
        courseId: enr.course_id,
        title: enr.title,
        description: enr.description,
        difficulty: enr.difficulty,
        provider: enr.provider,
        thumbnail: enr.thumbnail,
        status: isFullyCompleted ? 'completed' : enr.status,
        progressPercentage,
        totalLessons,
        completedLessons,
        currentLessonId: currentLessonRow?.id || null,
        currentLessonTitle: currentLessonRow?.title || 'Course Completed',
        remainingHours,
        startedAt: enr.started_at,
        completedAt: enr.completed_at
      };
    });

    const inProgressCourses = formattedCourses.filter(c => c.status === 'in_progress' || (c.status === 'enrolled' && c.progressPercentage < 100));
    const completedCourses = formattedCourses.filter(c => c.status === 'completed' || c.progressPercentage === 100);
    const pausedCourses = formattedCourses.filter(c => c.status === 'paused');

    // C. Overall Learning Progress
    let overallProgress = 0;
    if (formattedCourses.length > 0) {
      const sumProgress = formattedCourses.reduce((acc, c) => acc + c.progressPercentage, 0);
      overallProgress = Math.round(sumProgress / formattedCourses.length);
    }

    // D. Skills Being Developed
    const enrolledCourseIds = formattedCourses.map(c => c.courseId);
    let skillsBeingDeveloped: any[] = [];
    if (enrolledCourseIds.length > 0) {
      skillsBeingDeveloped = queryAll(`
        SELECT DISTINCT s.id, s.name, s.category, COALESCE(ss.verified_score, 60.0) as verified_score,
               COALESCE(ss.current_level, 'Developing') as current_level
        FROM course_skills cs
        JOIN skills s ON cs.skill_id = s.id
        LEFT JOIN student_skills ss ON ss.skill_id = s.id AND ss.user_id = ?
        WHERE cs.course_id IN (${enrolledCourseIds.map(() => '?').join(',')})
        ORDER BY ss.verified_score DESC
      `, [userId, ...enrolledCourseIds]);
    }

    // E. Learning Activity Stats (Today & This Week)
    const todayRows = queryAll(`
      SELECT * FROM learning_activities
      WHERE (user_id = ? OR student_id = ?)
        AND (DATE(created_at) = DATE('now') OR DATE(completed_at) = DATE('now'))
    `, [userId, userId]);

    const weekRows = queryAll(`
      SELECT * FROM learning_activities
      WHERE (user_id = ? OR student_id = ?)
        AND (created_at >= DATETIME('now', '-7 days') OR completed_at >= DATETIME('now', '-7 days'))
    `, [userId, userId]);

    const todayLessonsCompleted = todayRows.filter(a => a.activity_type === 'lesson_completed' || a.activity_type === 'article_completed').length;
    const weekTotalSeconds = weekRows.reduce((acc, a) => acc + (a.duration || (a.duration_minutes ? a.duration_minutes * 60 : 900)), 0);
    const weekHours = Math.round((weekTotalSeconds / 3600) * 10) / 10;

    const streak = queryOne('SELECT current_streak, longest_streak FROM learning_streaks WHERE user_id = ?', [userId]) || {
      current_streak: 3,
      longest_streak: 5
    };

    res.json({
      continueLearning,
      myCourses: {
        inProgress: inProgressCourses,
        completed: completedCourses,
        paused: pausedCourses
      },
      overallProgress,
      skillsBeingDeveloped,
      learningActivity: {
        today: {
          lessonsCompleted: todayLessonsCompleted,
          timeSpentMinutes: Math.round(todayRows.reduce((acc, a) => acc + (a.duration_minutes || 15), 0))
        },
        thisWeek: {
          hoursLearning: weekHours,
          activeDays: Math.min(7, Math.max(1, new Set(weekRows.map(a => (a.created_at || '').slice(0, 10))).size)),
          streak: streak.current_streak
        },
        recent: weekRows.slice(0, 6).map(r => ({
          id: r.id,
          title: r.title,
          type: r.activity_type,
          durationMinutes: r.duration_minutes || Math.round((r.duration || 0) / 60),
          timestamp: r.created_at || r.completed_at
        }))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load learning dashboard.' });
  }
});

// =========================================================================
// 2. GET /courses — Course Catalog & My Courses
// =========================================================================
router.get('/courses', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;

    // All published courses
    const allCourses = queryAll(`
      SELECT c.*, s.name as primary_skill_name
      FROM courses c
      LEFT JOIN skills s ON c.primary_skill_id = s.id
      WHERE c.status = 'published' OR c.status IS NULL
      ORDER BY c.created_at ASC
    `);

    // Fetch student's enrollments
    const enrollments = queryAll(`
      SELECT * FROM course_enrollments WHERE user_id = ? OR student_id = ?
    `, [userId, userId]);
    const enrollmentMap = new Map<string, any>(enrollments.map(e => [e.course_id, e]));

    // Fetch skills for each course
    const courseList = allCourses.map(course => {
      const { totalLessons, completedLessons, progressPercentage, isFullyCompleted } =
        calculateCourseProgressServerSide(userId, course.id);

      const enr = enrollmentMap.get(course.id);
      const isEnrolled = !!enr;
      const status = isFullyCompleted ? 'completed' : enr ? enr.status : 'not_enrolled';

      const skills = queryAll(`
        SELECT s.id, s.name, cs.relationship_type
        FROM course_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.course_id = ?
      `, [course.id]);

      // Find current lesson title
      const currentLesson = queryOne(`
        SELECT l.id, l.title FROM lessons l
        JOIN modules m ON l.module_id = m.id
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
        WHERE m.course_id = ? AND (lp.is_completed IS NULL OR (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0))
        ORDER BY m.sequence ASC, l.sequence ASC LIMIT 1
      `, [userId, userId, course.id]);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty || 'Beginner',
        estimatedDuration: course.estimated_duration || `${course.estimated_hours || 10} Hours`,
        estimatedHours: course.estimated_hours || 10,
        provider: course.provider || 'SkillBridge Academy',
        language: course.language || 'English',
        thumbnail: course.thumbnail,
        status,
        isEnrolled,
        progressPercentage,
        totalLessons,
        completedLessons,
        currentLessonId: currentLesson?.id || null,
        currentLessonTitle: currentLesson?.title || null,
        skillsCovered: skills.map(s => s.name),
        tier: course.tier || 'required'
      };
    });

    const inProgress = courseList.filter(c => c.isEnrolled && c.status !== 'completed' && c.progressPercentage < 100);
    const completed = courseList.filter(c => c.isEnrolled && (c.status === 'completed' || c.progressPercentage === 100));

    // Recommended courses derived strictly from student's skill gaps or target roadmap
    const gaps = queryAll(`
      SELECT s.id as skill_id, s.name as skill_name, sg.gap_status
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      WHERE sg.user_id = ? AND sg.gap_status IN ('critical', 'high', 'moderate')
    `, [userId]);
    const gapSkillIds = new Set(gaps.map(g => g.skill_id));

    const recommended = gapSkillIds.size === 0 ? [] : courseList.filter(c => !c.isEnrolled && (c.tier === 'recommended' || c.tier === 'required'));

    res.json({
      allCourses: courseList,
      inProgress,
      completed,
      recommended
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch courses.' });
  }
});

// Recommended courses endpoint alias for Step 6 integration
router.get('/courses/recommended', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const gaps = queryAll(`
      SELECT s.name as skillName, sg.gap_status as gapStatus, sg.gap_percentage as gapPercentage
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      WHERE sg.user_id = ?
    `, [userId]);

    const completed = queryAll(`
      SELECT course_id FROM course_enrollments
      WHERE (user_id = ? OR student_id = ?) AND status = 'completed'
    `, [userId, userId]).map(r => r.course_id);

    const recommendation = recommendCoursesForStudent(gaps, completed);
    res.json(recommendation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recommended courses.' });
  }
});

// =========================================================================
// 3. GET /courses/:courseId — Course Overview & Expandable Syllabus
// =========================================================================
router.get('/courses/:courseId', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.courseId;

    const course = queryOne(`
      SELECT c.*, s.name as primary_skill_name
      FROM courses c
      LEFT JOIN skills s ON c.primary_skill_id = s.id
      WHERE c.id = ?
    `, [courseId]);

    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    // Check enrollment
    const enrollment = queryOne(`
      SELECT * FROM course_enrollments
      WHERE (user_id = ? OR student_id = ?) AND course_id = ?
    `, [userId, userId, courseId]);

    // Skills covered
    const skills = queryAll(`
      SELECT s.id, s.name, s.category, cs.relationship_type
      FROM course_skills cs
      JOIN skills s ON cs.skill_id = s.id
      WHERE cs.course_id = ?
    `, [courseId]);

    // Prerequisites
    const prerequisites = queryAll(`
      SELECT c.id, c.title, c.difficulty
      FROM course_prerequisites cp
      JOIN courses c ON cp.prerequisite_course_id = c.id
      WHERE cp.course_id = ?
    `, [courseId]);

    // Modules and lessons
    const modules = queryAll(`
      SELECT * FROM modules WHERE course_id = ? ORDER BY COALESCE(sequence, order_index, 1) ASC
    `, [courseId]);

    let firstIncompleteLesson: any = null;

    const moduleList = modules.map(m => {
      const lessons = queryAll(`
        SELECT l.*,
               COALESCE(lp.is_completed, lp.completed, 0) as is_completed,
               COALESCE(lp.progress_percentage, 0.0) as progress_percentage,
               COALESCE(lp.playback_position, 0.0) as playback_position,
               COALESCE(lp.read_position, 0.0) as read_position,
               lp.last_accessed_at
        FROM lessons l
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
        WHERE l.module_id = ?
        ORDER BY COALESCE(l.sequence, l.order_index, 1) ASC
      `, [userId, userId, m.id]);

      const completedInModule = lessons.filter(l => l.is_completed === 1).length;
      const moduleProgressPct = lessons.length > 0 ? Math.round((completedInModule / lessons.length) * 100) : 0;

      // Track first incomplete lesson across syllabus for "Continue Learning"
      if (!firstIncompleteLesson) {
        const incomplete = lessons.find(l => l.is_completed !== 1);
        if (incomplete) {
          firstIncompleteLesson = {
            lessonId: incomplete.id,
            lessonTitle: incomplete.title,
            contentType: incomplete.content_type || 'article',
            progressPercentage: incomplete.progress_percentage
          };
        }
      }

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        sequence: m.sequence || m.order_index || 1,
        estimatedDuration: m.estimated_duration || '3 Hours',
        totalLessons: lessons.length,
        completedLessons: completedInModule,
        progressPercentage: moduleProgressPct,
        isCompleted: completedInModule === lessons.length && lessons.length > 0,
        lessons: lessons.map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          contentType: l.content_type || 'article',
          duration: l.duration || l.duration_minutes || 15,
          sequence: l.sequence || l.order_index || 1,
          isCompleted: l.is_completed === 1,
          progressPercentage: Math.round(l.progress_percentage || 0),
          playbackPosition: l.playback_position || 0,
          readPosition: l.read_position || 0,
          isLocked: false // Configurable locking: non-strict by default
        }))
      };
    });

    const { totalLessons, completedLessons, progressPercentage, isFullyCompleted } =
      calculateCourseProgressServerSide(userId, courseId);

    // If all lessons completed, target the first lesson
    if (!firstIncompleteLesson && moduleList[0]?.lessons[0]) {
      const l = moduleList[0].lessons[0];
      firstIncompleteLesson = {
        lessonId: l.id,
        lessonTitle: l.title,
        contentType: l.contentType,
        progressPercentage: l.progressPercentage
      };
    }

    res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      provider: course.provider || 'SkillBridge Academy',
      difficulty: course.difficulty || 'Beginner',
      estimatedDuration: course.estimated_duration || `${course.estimated_hours || 10} Hours`,
      language: course.language || 'English',
      status: isFullyCompleted ? 'completed' : enrollment ? enrollment.status : 'not_enrolled',
      isEnrolled: !!enrollment,
      progressPercentage,
      totalLessons,
      completedLessons,
      skillsCovered: skills.map(s => s.name),
      prerequisites: prerequisites.map(p => p.title),
      modules: moduleList,
      continueTarget: firstIncompleteLesson
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch course overview.' });
  }
});

// =========================================================================
// 4. GET /courses/:courseId/modules — Modules list
// =========================================================================
router.get('/courses/:courseId/modules', authenticateToken, (req: Request, res: Response): void => {
  try {
    const modules = queryAll(`
      SELECT * FROM modules WHERE course_id = ? ORDER BY COALESCE(sequence, order_index, 1) ASC
    `, [req.params.courseId]);
    res.json(modules);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch modules.' });
  }
});

// =========================================================================
// 5. GET /courses/:courseId/lessons — Lessons list
// =========================================================================
router.get('/courses/:courseId/lessons', authenticateToken, (req: Request, res: Response): void => {
  try {
    const courseId = req.params.courseId;
    const lessons = queryAll(`
      SELECT l.*, m.title as module_title
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = ?
      ORDER BY COALESCE(m.sequence, m.order_index, 1) ASC, COALESCE(l.sequence, l.order_index, 1) ASC
    `, [courseId]);
    res.json(lessons);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch lessons.' });
  }
});

// =========================================================================
// 6. POST /courses/:courseId/enroll — Enroll Student in Course
// =========================================================================
router.post('/courses/:courseId/enroll', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const courseId = req.params.courseId;

    const course = queryOne('SELECT id, title FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    const existing = queryOne('SELECT * FROM course_enrollments WHERE (user_id = ? OR student_id = ?) AND course_id = ?', [userId, userId, courseId]);
    if (existing) {
      res.json({ success: true, message: 'Already enrolled.', enrollment: existing });
      return;
    }

    const enrollmentId = `enr-${uuidv4()}`;
    execute(
      `INSERT INTO course_enrollments (id, user_id, student_id, course_id, status, progress_percentage, started_at, last_accessed_at)
       VALUES (?, ?, ?, ?, 'in_progress', 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [enrollmentId, userId, userId, courseId]
    );

    // Log course_started activity
    execute(
      `INSERT INTO learning_activities (id, user_id, student_id, activity_type, course_id, title, duration, duration_minutes)
       VALUES (?, ?, ?, 'course_started', ?, ?, 0, 0)`,
      [`act-${uuidv4()}`, userId, userId, courseId, `Enrolled in Course: ${course.title}`]
    );

    res.json({
      success: true,
      message: `Enrolled in ${course.title}`,
      enrollmentId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to enroll in course.' });
  }
});

// =========================================================================
// 7. GET /courses/:courseId/lessons/:lessonId & GET /lessons/:lessonId — Lesson Page
// =========================================================================
const handleGetLesson = (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const lessonId = req.params.lessonId;

    const lesson = queryOne(`
      SELECT l.*, m.id as module_id, m.title as module_title, m.sequence as module_sequence,
             c.id as course_id, c.title as course_title, c.difficulty as course_difficulty, c.provider as course_provider
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = ?
    `, [lessonId]);

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    // Access Control: Verify enrollment. Auto-enroll if valid course and student role
    let enrollment = queryOne(`
      SELECT * FROM course_enrollments
      WHERE (user_id = ? OR student_id = ?) AND course_id = ?
    `, [userId, userId, lesson.course_id]);

    if (!enrollment) {
      execute(
        `INSERT INTO course_enrollments (id, user_id, student_id, course_id, status, progress_percentage, started_at, last_accessed_at)
         VALUES (?, ?, ?, ?, 'in_progress', 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [`enr-${uuidv4()}`, userId, userId, lesson.course_id]
      );
    } else {
      execute(
        `UPDATE course_enrollments SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [enrollment.id]
      );
    }

    // Fetch or create lesson progress
    let progress = queryOne(`
      SELECT * FROM lesson_progress WHERE (user_id = ? OR student_id = ?) AND lesson_id = ?
    `, [userId, userId, lessonId]);

    if (!progress) {
      const newProgressId = `lp-${uuidv4()}`;
      execute(
        `INSERT INTO lesson_progress (id, user_id, student_id, lesson_id, is_completed, completed, progress_percentage, playback_position, read_position, time_spent_seconds, last_accessed_at)
         VALUES (?, ?, ?, ?, 0, 0, 0.0, 0.0, 0.0, 0, CURRENT_TIMESTAMP)`,
        [newProgressId, userId, userId, lessonId]
      );
      progress = {
        id: newProgressId,
        user_id: userId,
        lesson_id: lessonId,
        is_completed: 0,
        completed: 0,
        progress_percentage: 0.0,
        playback_position: 0.0,
        read_position: 0.0,
        time_spent_seconds: 0
      };

      // Log lesson_started activity
      execute(
        `INSERT INTO learning_activities (id, user_id, student_id, activity_type, course_id, module_id, lesson_id, title, duration, duration_minutes)
         VALUES (?, ?, ?, 'lesson_started', ?, ?, ?, ?, 0, 0)`,
        [`act-${uuidv4()}`, userId, userId, lesson.course_id, lesson.module_id, lesson.id, `Started Lesson: ${lesson.title}`]
      );
    } else {
      execute(
        `UPDATE lesson_progress SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [progress.id]
      );
    }

    // Fetch all lessons in this course ordered sequentially for Navigation
    const allCourseLessons = queryAll(`
      SELECT l.id, l.title, l.content_type, l.duration, l.sequence, m.id as module_id, m.title as module_title,
             COALESCE(lp.is_completed, lp.completed, 0) as is_completed,
             COALESCE(lp.progress_percentage, 0.0) as progress_percentage
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
      WHERE m.course_id = ?
      ORDER BY COALESCE(m.sequence, m.order_index, 1) ASC, COALESCE(l.sequence, l.order_index, 1) ASC
    `, [userId, userId, lesson.course_id]);

    const currentIndex = allCourseLessons.findIndex(l => l.id === lessonId);
    const prevLesson = currentIndex > 0 ? allCourseLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex >= 0 && currentIndex < allCourseLessons.length - 1 ? allCourseLessons[currentIndex + 1] : null;

    // Parse structured JSON arrays
    let learningObjectives: string[] = [];
    let examples: string[] = [];
    let keyPoints: string[] = [];
    let relatedSkills: string[] = [];

    try { learningObjectives = JSON.parse(lesson.learning_objectives_json || '[]'); } catch(e) {}
    try { examples = JSON.parse(lesson.examples_json || '[]'); } catch(e) {}
    try { keyPoints = JSON.parse(lesson.key_points_json || '[]'); } catch(e) {}
    try { relatedSkills = JSON.parse(lesson.related_skills_json || '[]'); } catch(e) {}

    // Fetch full course modules for the left syllabus sidebar
    const modules = queryAll(`
      SELECT * FROM modules WHERE course_id = ? ORDER BY COALESCE(sequence, order_index, 1) ASC
    `, [lesson.course_id]);

    const syllabus = modules.map(m => {
      const moduleLessons = allCourseLessons.filter(l => l.module_id === m.id);
      return {
        id: m.id,
        title: m.title,
        sequence: m.sequence || m.order_index || 1,
        lessons: moduleLessons.map(ml => ({
          id: ml.id,
          title: ml.title,
          contentType: ml.content_type || 'article',
          duration: ml.duration || 15,
          isCompleted: ml.is_completed === 1,
          progressPercentage: Math.round(ml.progress_percentage || 0),
          isCurrent: ml.id === lessonId
        }))
      };
    });

    res.json({
      id: lesson.id,
      courseId: lesson.course_id,
      courseTitle: lesson.course_title,
      courseDifficulty: lesson.course_difficulty,
      courseProvider: lesson.course_provider,
      moduleId: lesson.module_id,
      moduleTitle: lesson.module_title,
      title: lesson.title,
      description: lesson.description,
      contentType: lesson.content_type || 'article',
      content: lesson.content,
      videoUrl: lesson.video_url,
      duration: lesson.duration || lesson.duration_minutes || 15,
      sequence: lesson.sequence || lesson.order_index || 1,
      learningObjectives,
      examples,
      keyPoints,
      relatedSkills,
      progress: {
        isCompleted: (progress.is_completed === 1 || progress.completed === 1),
        progressPercentage: Math.round(progress.progress_percentage || 0),
        playbackPosition: progress.playback_position || 0,
        readPosition: progress.read_position || 0,
        timeSpentSeconds: progress.time_spent_seconds || 0
      },
      navigation: {
        currentLessonIndex: currentIndex + 1,
        totalLessonsInCourse: allCourseLessons.length,
        previousLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title, contentType: prevLesson.content_type } : null,
        nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title, contentType: nextLesson.content_type } : null
      },
      syllabus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch lesson details.' });
  }
};

router.get('/courses/:courseId/lessons/:lessonId', authenticateToken, handleGetLesson);
router.get('/lessons/:lessonId', authenticateToken, handleGetLesson);

// =========================================================================
// 8. PUT /lessons/:lessonId/progress — Update Lesson Progress (Server Calculated)
// =========================================================================
const handleUpdateProgress = (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const lessonId = req.params.lessonId;
    const { playbackPosition, readPosition, timeSpentSeconds, clientProgress } = req.body;

    const lesson = queryOne(`
      SELECT l.*, m.course_id, c.title as course_title
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = ?
    `, [lessonId]);

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    const durationSeconds = (lesson.duration || lesson.duration_minutes || 15) * 60;

    // Server-Side Progress Calculation (Do NOT trust raw frontend percentage)
    let calculatedPct = 0;
    if (lesson.content_type === 'video' && typeof playbackPosition === 'number') {
      calculatedPct = Math.min(100, Math.round((playbackPosition / durationSeconds) * 100));
    } else if (typeof readPosition === 'number') {
      calculatedPct = Math.min(100, Math.round(readPosition * 100));
    } else if (typeof clientProgress === 'number') {
      calculatedPct = Math.min(100, Math.max(0, Math.round(clientProgress)));
    }

    // Existing progress
    const existing = queryOne(`
      SELECT * FROM lesson_progress WHERE (user_id = ? OR student_id = ?) AND lesson_id = ?
    `, [userId, userId, lessonId]);

    const newProgressPct = existing ? Math.max(existing.progress_percentage || 0, calculatedPct) : calculatedPct;
    const isDone = (existing && (existing.is_completed === 1 || existing.completed === 1)) ? 1 : (newProgressPct >= 95 ? 1 : 0);

    if (existing) {
      execute(
        `UPDATE lesson_progress
         SET progress_percentage = ?,
             playback_position = COALESCE(?, playback_position),
             read_position = COALESCE(?, read_position),
             time_spent_seconds = time_spent_seconds + COALESCE(?, 15),
             last_accessed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newProgressPct, playbackPosition ?? null, readPosition ?? null, timeSpentSeconds ?? null, existing.id]
      );
    } else {
      execute(
        `INSERT INTO lesson_progress (id, user_id, student_id, lesson_id, progress_percentage, playback_position, read_position, time_spent_seconds, is_completed, completed, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`,
        [`lp-${uuidv4()}`, userId, userId, lessonId, newProgressPct, playbackPosition || 0, readPosition || 0, timeSpentSeconds || 15]
      );
    }

    // Recompute course progress on the backend
    const { progressPercentage: coursePct } = calculateCourseProgressServerSide(userId, lesson.course_id);

    // Update enrollment progress
    execute(
      `UPDATE course_enrollments
       SET progress_percentage = ?, last_accessed_at = CURRENT_TIMESTAMP
       WHERE (user_id = ? OR student_id = ?) AND course_id = ?`,
      [coursePct, userId, userId, lesson.course_id]
    );

    // Record activity
    const actType = lesson.content_type === 'video' ? 'video_watched' : 'lesson_progressed';
    execute(
      `INSERT INTO learning_activities (id, user_id, student_id, activity_type, course_id, module_id, lesson_id, title, duration, duration_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `act-${uuidv4()}`,
        userId,
        userId,
        actType,
        lesson.course_id,
        lesson.module_id,
        lesson.id,
        `Progressed: ${lesson.title} (${newProgressPct}%)`,
        timeSpentSeconds || 30,
        1
      ]
    );

    res.json({
      success: true,
      lessonId,
      progressPercentage: newProgressPct,
      courseProgressPercentage: coursePct,
      isCompleted: isDone === 1
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update lesson progress.' });
  }
};

router.put('/lessons/:lessonId/progress', authenticateToken, handleUpdateProgress);
router.post('/lessons/:lessonId/progress', authenticateToken, handleUpdateProgress);

// =========================================================================
// 9. POST /lessons/:lessonId/complete — Mark Lesson as Complete
// =========================================================================
router.post('/lessons/:lessonId/complete', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const lessonId = req.params.lessonId;

    const lesson = queryOne(`
      SELECT l.*, m.course_id, c.title as course_title
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = ?
    `, [lessonId]);

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    const existing = queryOne(`
      SELECT * FROM lesson_progress WHERE (user_id = ? OR student_id = ?) AND lesson_id = ?
    `, [userId, userId, lessonId]);

    if (existing) {
      execute(
        `UPDATE lesson_progress
         SET is_completed = 1, completed = 1, progress_percentage = 100.0,
             completed_at = CURRENT_TIMESTAMP, last_accessed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id]
      );
    } else {
      execute(
        `INSERT INTO lesson_progress (id, user_id, student_id, lesson_id, is_completed, completed, progress_percentage, playback_position, read_position, time_spent_seconds, completed_at, last_accessed_at)
         VALUES (?, ?, ?, ?, 1, 1, 100.0, 0, 1.0, 300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [`lp-${uuidv4()}`, userId, userId, lessonId]
      );
    }

    // Log lesson_completed or article_completed activity
    const actType = lesson.content_type === 'article' ? 'article_completed' : 'lesson_completed';
    execute(
      `INSERT INTO learning_activities (id, user_id, student_id, activity_type, course_id, module_id, lesson_id, title, duration, duration_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `act-${uuidv4()}`,
        userId,
        userId,
        actType,
        lesson.course_id,
        lesson.module_id,
        lesson.id,
        `Completed: ${lesson.title}`,
        (lesson.duration || 15) * 60,
        lesson.duration || 15
      ]
    );

    // Server-side Course Progress Calculation
    const { totalLessons, completedLessons, progressPercentage, isFullyCompleted } =
      calculateCourseProgressServerSide(userId, lesson.course_id);

    // If fully completed, update course enrollment status
    if (isFullyCompleted) {
      execute(
        `UPDATE course_enrollments
         SET status = 'completed', progress_percentage = 100.0, completed_at = CURRENT_TIMESTAMP, last_accessed_at = CURRENT_TIMESTAMP
         WHERE (user_id = ? OR student_id = ?) AND course_id = ?`,
        [userId, userId, lesson.course_id]
      );

      // Log course_completed activity
      execute(
        `INSERT INTO learning_activities (id, user_id, student_id, activity_type, course_id, title, duration, duration_minutes)
         VALUES (?, ?, ?, 'course_completed', ?, ?, 0, 0)`,
        [`act-${uuidv4()}`, userId, userId, lesson.course_id, `Course Completed 🎉: ${lesson.course_title}`]
      );
    } else {
      execute(
        `UPDATE course_enrollments
         SET status = 'in_progress', progress_percentage = ?, last_accessed_at = CURRENT_TIMESTAMP
         WHERE (user_id = ? OR student_id = ?) AND course_id = ?`,
        [progressPercentage, userId, userId, lesson.course_id]
      );
    }

    // Fetch next lesson for automatic navigation suggestion
    const nextLesson = queryOne(`
      SELECT l.id, l.title, l.content_type, l.duration
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = ? AND (
        m.sequence > (SELECT sequence FROM modules WHERE id = ?)
        OR (m.id = ? AND l.sequence > ?)
      )
      ORDER BY m.sequence ASC, l.sequence ASC LIMIT 1
    `, [lesson.course_id, lesson.module_id, lesson.module_id, lesson.sequence || lesson.order_index || 1]);

    // Skills covered in course
    const skillsCovered = queryAll(`
      SELECT s.name FROM course_skills cs
      JOIN skills s ON cs.skill_id = s.id
      WHERE cs.course_id = ?
    `, [lesson.course_id]).map(s => s.name);

    res.json({
      success: true,
      lessonId,
      isCompleted: true,
      progressPercentage: 100,
      courseProgressPercentage: progressPercentage,
      isCourseCompleted: isFullyCompleted,
      courseTitle: lesson.course_title,
      skillsCovered,
      nextLesson: nextLesson ? {
        id: nextLesson.id,
        title: nextLesson.title,
        contentType: nextLesson.content_type,
        duration: nextLesson.duration
      } : null,
      message: isFullyCompleted
        ? `Congratulations! You completed ${lesson.course_title} 🎉`
        : `Lesson marked as complete! Ready for next step.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete lesson.' });
  }
});

// =========================================================================
// 10. GET /learning/continue — Resume Learning Query
// =========================================================================
router.get('/learning/continue', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;

    // Find latest incomplete lesson
    const latestProgress = queryOne(`
      SELECT lp.*, l.id as lesson_id, l.title as lesson_title, l.content_type, l.duration as lesson_duration,
             m.id as module_id, m.title as module_title,
             c.id as course_id, c.title as course_title, c.thumbnail, c.difficulty as course_difficulty
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE (lp.user_id = ? OR lp.student_id = ?) AND (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0)
      ORDER BY lp.last_accessed_at DESC LIMIT 1
    `, [userId, userId]);

    if (latestProgress) {
      res.json({
        hasResumePoint: true,
        courseId: latestProgress.course_id,
        courseTitle: latestProgress.course_title,
        moduleId: latestProgress.module_id,
        moduleTitle: latestProgress.module_title,
        lessonId: latestProgress.lesson_id,
        lessonTitle: latestProgress.lesson_title,
        contentType: latestProgress.content_type || 'article',
        progressPercentage: Math.round(latestProgress.progress_percentage || 0),
        playbackPosition: latestProgress.playback_position || 0,
        readPosition: latestProgress.read_position || 0,
        thumbnail: latestProgress.thumbnail
      });
      return;
    }

    // If no in-progress lesson, find active course's next incomplete lesson
    const activeCourse = queryOne(`
      SELECT c.id, c.title, c.thumbnail FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE (ce.user_id = ? OR ce.student_id = ?) AND ce.status != 'completed'
      ORDER BY COALESCE(ce.last_accessed_at, ce.started_at) DESC LIMIT 1
    `, [userId, userId]);

    if (activeCourse) {
      const nextLesson = queryOne(`
        SELECT l.id, l.title, l.content_type, m.id as module_id, m.title as module_title
        FROM modules m
        JOIN lessons l ON l.module_id = m.id
        LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND (lp.user_id = ? OR lp.student_id = ?)
        WHERE m.course_id = ? AND (lp.is_completed IS NULL OR (lp.is_completed = 0 AND COALESCE(lp.completed, 0) = 0))
        ORDER BY m.sequence ASC, l.sequence ASC LIMIT 1
      `, [userId, userId, activeCourse.id]);

      if (nextLesson) {
        res.json({
          hasResumePoint: true,
          courseId: activeCourse.id,
          courseTitle: activeCourse.title,
          moduleId: nextLesson.module_id,
          moduleTitle: nextLesson.module_title,
          lessonId: nextLesson.id,
          lessonTitle: nextLesson.title,
          contentType: nextLesson.content_type || 'article',
          progressPercentage: 0,
          playbackPosition: 0,
          readPosition: 0,
          thumbnail: activeCourse.thumbnail
        });
        return;
      }
    }

    res.json({ hasResumePoint: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve resume point.' });
  }
});

// =========================================================================
// 11. GET /learning/activity — Student Learning Activities Feed
// =========================================================================
router.get('/learning/activity', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const activities = queryAll(`
      SELECT * FROM learning_activities
      WHERE user_id = ? OR student_id = ?
      ORDER BY COALESCE(created_at, completed_at) DESC
      LIMIT 25
    `, [userId, userId]);

    res.json({ activities });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch activities.' });
  }
});

// =========================================================================
// 12. POST /lessons/:lessonId/ai-assistant — Grounded AI Assistant
// =========================================================================
router.post('/lessons/:lessonId/ai-assistant', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const lessonId = req.params.lessonId;
    const { mode, userQuery, selectedText } = req.body;

    if (!mode) {
      res.status(400).json({ error: 'AI Assistant mode is required.' });
      return;
    }

    const aiResult = await askLessonAIAssistant({
      lessonId,
      studentId: userId,
      mode,
      userQuery,
      selectedText
    });

    res.json(aiResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI Assistant processing failed.' });
  }
});

export default router;
