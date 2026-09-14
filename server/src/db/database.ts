import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../skillbridge.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Safe migrations for auth schema evolution
  const safeMigrations = [
    "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';",
    "ALTER TABLE users ADD COLUMN profile_completed INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN last_login DATETIME;",
    "ALTER TABLE student_profiles ADD COLUMN degree TEXT;",
    "ALTER TABLE student_profiles ADD COLUMN current_year INTEGER DEFAULT 1;",
    "ALTER TABLE student_profiles ADD COLUMN section TEXT;",
    "ALTER TABLE student_profiles ADD COLUMN graduation_year INTEGER;",
    "ALTER TABLE student_profiles ADD COLUMN self_declared_level TEXT DEFAULT 'Beginner';",
    "ALTER TABLE colleges ADD COLUMN institution_name TEXT;",
    "ALTER TABLE colleges ADD COLUMN contact_person_name TEXT;",
    "ALTER TABLE colleges ADD COLUMN designation TEXT;",
    "ALTER TABLE colleges ADD COLUMN phone TEXT;",
    "ALTER TABLE colleges ADD COLUMN verification_status TEXT DEFAULT 'pending_verification';",
    "ALTER TABLE companies ADD COLUMN company_name TEXT;",
    "ALTER TABLE companies ADD COLUMN company_email TEXT;",
    "ALTER TABLE companies ADD COLUMN recruiter_name TEXT;",
    "ALTER TABLE companies ADD COLUMN designation TEXT;",
    "ALTER TABLE companies ADD COLUMN phone TEXT;",
    "ALTER TABLE companies ADD COLUMN verification_status TEXT DEFAULT 'pending_verification';",
    "ALTER TABLE mentors ADD COLUMN designation TEXT;",
    "ALTER TABLE mentors ADD COLUMN phone TEXT;",
    "ALTER TABLE mentors ADD COLUMN verification_status TEXT DEFAULT 'pending_verification';",
    "ALTER TABLE skill_reports ADD COLUMN version INTEGER DEFAULT 1;",
    "ALTER TABLE skill_reports ADD COLUMN overall_level TEXT DEFAULT 'Developing';",
    "ALTER TABLE skill_reports ADD COLUMN summary TEXT;",
    "ALTER TABLE skill_reports ADD COLUMN category_scores_json TEXT DEFAULT '{}';",
    "ALTER TABLE skill_reports ADD COLUMN career_alignment_json TEXT DEFAULT '{}';",
    "ALTER TABLE skill_reports ADD COLUMN priority_improvements_json TEXT DEFAULT '[]';",
    "ALTER TABLE skill_reports ADD COLUMN visibility TEXT DEFAULT 'private';",
    "ALTER TABLE student_profiles ADD COLUMN onboarding_completed INTEGER DEFAULT 1;",
    "ALTER TABLE student_profiles ADD COLUMN onboarding_step INTEGER DEFAULT 4;",
    "ALTER TABLE student_profiles ADD COLUMN target_roles_json TEXT DEFAULT '[]';",
    "ALTER TABLE student_profiles ADD COLUMN career_interests_json TEXT DEFAULT '[]';",
    "ALTER TABLE student_profiles ADD COLUMN technical_skills_json TEXT DEFAULT '[]';",
    "ALTER TABLE student_profiles ADD COLUMN coding_experience TEXT DEFAULT 'Regularly practice';",
    "ALTER TABLE student_profiles ADD COLUMN preferred_programming_language TEXT DEFAULT 'Python';",
    "ALTER TABLE student_profiles ADD COLUMN communication_confidence TEXT DEFAULT 'Intermediate';",
    "ALTER TABLE student_profiles ADD COLUMN daily_learning_time TEXT DEFAULT '1–2 hours';",
    "ALTER TABLE student_profiles ADD COLUMN placement_readiness_target TEXT DEFAULT 'Within 6 months';",
    "ALTER TABLE industry_requirements ADD COLUMN importance TEXT DEFAULT 'High';",
    "ALTER TABLE industry_requirements ADD COLUMN priority TEXT DEFAULT 'High';",
    "ALTER TABLE courses ADD COLUMN provider TEXT DEFAULT 'SkillBridge Academy';",
    "ALTER TABLE courses ADD COLUMN format TEXT DEFAULT 'Interactive';",
    "ALTER TABLE courses ADD COLUMN language TEXT DEFAULT 'English';",
    "ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'published';",
    "ALTER TABLE courses ADD COLUMN estimated_duration TEXT DEFAULT '18 Hours';",
    "ALTER TABLE modules ADD COLUMN sequence INTEGER DEFAULT 1;",
    "ALTER TABLE modules ADD COLUMN estimated_duration TEXT DEFAULT '4 Hours';",
    "ALTER TABLE lessons ADD COLUMN description TEXT;",
    "ALTER TABLE lessons ADD COLUMN video_url TEXT;",
    "ALTER TABLE lessons ADD COLUMN duration INTEGER DEFAULT 15;",
    "ALTER TABLE lessons ADD COLUMN sequence INTEGER DEFAULT 1;",
    "ALTER TABLE lessons ADD COLUMN status TEXT DEFAULT 'active';",
    "ALTER TABLE lessons ADD COLUMN learning_objectives_json TEXT DEFAULT '[]';",
    "ALTER TABLE lessons ADD COLUMN examples_json TEXT DEFAULT '[]';",
    "ALTER TABLE lessons ADD COLUMN key_points_json TEXT DEFAULT '[]';",
    "ALTER TABLE lessons ADD COLUMN related_skills_json TEXT DEFAULT '[]';",
    "ALTER TABLE course_enrollments ADD COLUMN student_id TEXT;",
    "ALTER TABLE course_enrollments ADD COLUMN last_accessed_at DATETIME;",
    "ALTER TABLE lesson_progress ADD COLUMN student_id TEXT;",
    "ALTER TABLE lesson_progress ADD COLUMN progress_percentage REAL DEFAULT 0.0;",
    "ALTER TABLE lesson_progress ADD COLUMN playback_position REAL DEFAULT 0.0;",
    "ALTER TABLE lesson_progress ADD COLUMN read_position REAL DEFAULT 0.0;",
    "ALTER TABLE lesson_progress ADD COLUMN completed INTEGER DEFAULT 0;",
    "ALTER TABLE lesson_progress ADD COLUMN completed_at DATETIME;",
    "ALTER TABLE learning_activities ADD COLUMN student_id TEXT;",
    "ALTER TABLE learning_activities ADD COLUMN course_id TEXT;",
    "ALTER TABLE learning_activities ADD COLUMN module_id TEXT;",
    "ALTER TABLE learning_activities ADD COLUMN lesson_id TEXT;",
    "ALTER TABLE learning_activities ADD COLUMN duration INTEGER DEFAULT 0;",
    "ALTER TABLE learning_activities ADD COLUMN metadata_json TEXT DEFAULT '{}';",
    "ALTER TABLE coding_submissions ADD COLUMN test_results_json TEXT DEFAULT '[]';",
    "ALTER TABLE coding_submissions ADD COLUMN ai_feedback_json TEXT DEFAULT '{}';",
    "ALTER TABLE coding_submissions ADD COLUMN user_id TEXT;",
    "UPDATE coding_submissions SET user_id = student_id WHERE user_id IS NULL;",
    "ALTER TABLE coding_streaks ADD COLUMN user_id TEXT;",
    "UPDATE coding_streaks SET user_id = student_id WHERE user_id IS NULL;",
    "ALTER TABLE notifications ADD COLUMN related_entity_id TEXT;",
    "ALTER TABLE notifications ADD COLUMN read_at DATETIME;",
    "ALTER TABLE student_profiles ADD COLUMN assigned_mentor_id TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN topic TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN session_date TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN session_time TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN student_id TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN feedback_text TEXT;",
    "ALTER TABLE mentor_sessions ADD COLUMN rating REAL;",
    `CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      skill_covered TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      reason TEXT NOT NULL,
      learning_objective TEXT NOT NULL,
      estimated_duration TEXT NOT NULL,
      status TEXT DEFAULT 'recommended' CHECK (status IN ('recommended', 'started', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(user_id, course_id)
    );`
  ];

  for (const sql of safeMigrations) {
    try {
      db.exec(sql);
    } catch (e) {
      // Column or table already altered/exists
    }
  }

  // Upgrade lessons table to support all Step 7 content_types ('video', 'article', 'interactive', 'coding', 'project')
  try {
    const lessonSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='lessons'").get() as any;
    if (lessonSql && lessonSql.sql && !lessonSql.sql.includes("'article'")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE lessons_new (
          id TEXT PRIMARY KEY,
          module_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          content_type TEXT DEFAULT 'article',
          content TEXT NOT NULL,
          video_url TEXT,
          duration INTEGER DEFAULT 15,
          duration_minutes INTEGER DEFAULT 15,
          sequence INTEGER DEFAULT 1,
          order_index INTEGER DEFAULT 1,
          status TEXT DEFAULT 'active',
          practice_prompt TEXT,
          practice_starter_code TEXT,
          practice_expected_output TEXT,
          learning_objectives_json TEXT DEFAULT '[]',
          examples_json TEXT DEFAULT '[]',
          key_points_json TEXT DEFAULT '[]',
          related_skills_json TEXT DEFAULT '[]',
          FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
        );
        INSERT INTO lessons_new (id, module_id, title, content_type, content, practice_prompt, practice_starter_code, practice_expected_output, order_index, sequence, duration, duration_minutes)
        SELECT id, module_id, title, content_type, content, practice_prompt, practice_starter_code, practice_expected_output, order_index, COALESCE(order_index, 1), COALESCE(duration_minutes, 15), COALESCE(duration_minutes, 15) FROM lessons;
        DROP TABLE lessons;
        ALTER TABLE lessons_new RENAME TO lessons;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.warn('[Database] lessons table migration notice:', e);
  }

  // Upgrade learning_activities table to support Step 7 activity types & columns
  try {
    const actSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='learning_activities'").get() as any;
    if (actSql && actSql.sql && actSql.sql.includes("CHECK (activity_type IN ('lesson', 'practice'")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE learning_activities_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          student_id TEXT,
          activity_type TEXT NOT NULL,
          course_id TEXT,
          module_id TEXT,
          lesson_id TEXT,
          reference_id TEXT,
          title TEXT,
          duration INTEGER DEFAULT 0,
          duration_minutes INTEGER DEFAULT 0,
          metadata_json TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO learning_activities_new (id, user_id, student_id, activity_type, reference_id, title, duration_minutes, completed_at, created_at)
        SELECT id, user_id, user_id, activity_type, reference_id, title, duration_minutes, completed_at, completed_at FROM learning_activities;
        DROP TABLE learning_activities;
        ALTER TABLE learning_activities_new RENAME TO learning_activities;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.warn('[Database] learning_activities migration notice:', e);
  }

  // Upgrade notifications table to support Step 17 types
  try {
    const notifSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").get() as any;
    if (notifSql && notifSql.sql && notifSql.sql.includes("CHECK (type IN ('course'")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE notifications_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'SYSTEM_ALERT',
          related_entity_id TEXT,
          is_read INTEGER DEFAULT 0,
          read_at DATETIME,
          link_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO notifications_new (id, user_id, title, message, type, is_read, link_url, created_at)
        SELECT id, user_id, title, message, type, is_read, link_url, created_at FROM notifications;
        DROP TABLE notifications;
        ALTER TABLE notifications_new RENAME TO notifications;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.warn('[Database] notifications migration notice:', e);
  }

  // Upgrade coding_problems & coding_streaks to Step 9 schema if legacy columns exist
  try {
    const cpSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='coding_problems'").get() as any;
    if (cpSql && cpSql.sql && !cpSql.sql.includes("supported_languages_json")) {
      db.exec(`
        DROP TABLE IF EXISTS coding_test_cases;
        DROP TABLE IF EXISTS coding_problems;
      `);
    }
    const csSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='coding_streaks'").get() as any;
    if (csSql && csSql.sql && !csSql.sql.includes("student_id")) {
      db.exec(`DROP TABLE IF EXISTS coding_streaks;`);
    }
  } catch (e) {
    console.warn('[Database] coding tables migration notice:', e);
  }

  // Ensure password_resets table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure email_verifications table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure skill_report_items table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_report_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      score REAL NOT NULL,
      level TEXT NOT NULL,
      confidence TEXT NOT NULL CHECK (confidence IN ('Low', 'Medium', 'High')),
      evidence_json TEXT NOT NULL DEFAULT '[]',
      priority TEXT DEFAULT 'Medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES skill_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );
  `);

  // Ensure student_skill_history table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_skill_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      level TEXT NOT NULL,
      score REAL NOT NULL,
      confidence TEXT NOT NULL,
      source TEXT NOT NULL,
      assessment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );
  `);

  // Step 6: Learning Roadmaps & Prerequisites Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_skills (
      course_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      relationship_type TEXT DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'prerequisite', 'secondary')),
      PRIMARY KEY (course_id, skill_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_prerequisites (
      course_id TEXT NOT NULL,
      prerequisite_course_id TEXT NOT NULL,
      PRIMARY KEY (course_id, prerequisite_course_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_roadmaps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_role_id TEXT NOT NULL,
      target_role_title TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
      estimated_weeks INTEGER DEFAULT 16,
      total_stages INTEGER DEFAULT 6,
      completed_stages INTEGER DEFAULT 0,
      summary TEXT,
      daily_time_minutes INTEGER DEFAULT 60,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_role_id) REFERENCES target_roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_stages (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      objective TEXT NOT NULL,
      estimated_weeks INTEGER DEFAULT 2,
      status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'skipped')),
      reason TEXT,
      skills_json TEXT DEFAULT '[]',
      FOREIGN KEY (roadmap_id) REFERENCES learning_roadmaps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_courses (
      id TEXT PRIMARY KEY,
      stage_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      sequence INTEGER DEFAULT 1,
      priority TEXT DEFAULT 'High' CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
      reason TEXT,
      FOREIGN KEY (stage_id) REFERENCES roadmap_stages(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      roadmap_id TEXT,
      status TEXT DEFAULT 'enrolled' CHECK (status IN ('recommended', 'enrolled', 'in_progress', 'completed', 'paused', 'skipped')),
      progress_percentage REAL DEFAULT 0.0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (roadmap_id) REFERENCES learning_roadmaps(id) ON DELETE SET NULL,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS learning_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('lesson', 'practice', 'quiz', 'project', 'reading', 'video')),
      reference_id TEXT,
      title TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 15,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_streaks (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      current_streak INTEGER DEFAULT 1,
      longest_streak INTEGER DEFAULT 1,
      last_activity_date TEXT,
      streak_calendar_json TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_skills (
      lesson_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      PRIMARY KEY (lesson_id, skill_id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lesson_prerequisites (
      lesson_id TEXT NOT NULL,
      prerequisite_lesson_id TEXT NOT NULL,
      PRIMARY KEY (lesson_id, prerequisite_lesson_id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
      FOREIGN KEY (prerequisite_lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    -- Step 8: Lesson-wise AI Mock Test & Assessment System Tables
    CREATE TABLE IF NOT EXISTS mock_tests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      course_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
      duration_minutes INTEGER DEFAULT 20,
      total_questions INTEGER DEFAULT 10,
      total_marks INTEGER DEFAULT 20,
      passing_percentage REAL DEFAULT 60.0,
      max_attempts INTEGER DEFAULT 3,
      status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mock_test_questions (
      id TEXT PRIMARY KEY,
      mock_test_id TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'CODING')),
      question_text TEXT NOT NULL,
      options_json TEXT DEFAULT '[]',
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      marks INTEGER DEFAULT 2,
      skill_id TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
      order_index INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mock_test_attempts (
      id TEXT PRIMARY KEY,
      mock_test_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      time_taken_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'time_expired', 'auto_submitted', 'abandoned')),
      total_marks INTEGER DEFAULT 20,
      earned_marks REAL DEFAULT 0.0,
      percentage REAL DEFAULT 0.0,
      passed INTEGER DEFAULT 0,
      suspicious_event_count INTEGER DEFAULT 0,
      ai_feedback_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer_text TEXT,
      selected_option TEXT,
      is_marked_for_review INTEGER DEFAULT 0,
      earned_marks REAL DEFAULT 0.0,
      evaluation_status TEXT DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'evaluated', 'correct', 'incorrect', 'partially_correct')),
      ai_feedback TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES mock_test_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES mock_test_questions(id) ON DELETE CASCADE,
      UNIQUE(attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS test_skill_results (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      earned_marks REAL DEFAULT 0.0,
      maximum_marks REAL DEFAULT 0.0,
      percentage REAL DEFAULT 0.0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      unanswered_count INTEGER DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES mock_test_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_activity_logs (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('TEST_STARTED', 'ANSWER_SAVED', 'TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'WARNING_SHOWN', 'TEST_SUBMITTED', 'TIME_EXPIRED', 'AUTO_SUBMITTED')),
      activity_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata_json TEXT DEFAULT '{}',
      severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
      FOREIGN KEY (attempt_id) REFERENCES mock_test_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mock_tests_lesson ON mock_tests(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_mock_tests_course ON mock_tests(course_id);
    CREATE INDEX IF NOT EXISTS idx_mock_test_questions_test ON mock_test_questions(mock_test_id);
    CREATE INDEX IF NOT EXISTS idx_mock_attempts_student ON mock_test_attempts(student_id, mock_test_id);
    CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON student_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_test_skill_results_attempt ON test_skill_results(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_attempt ON assessment_activity_logs(attempt_id);

    -- Step 9: Coding Practice & Auto-Evaluation System Tables
    CREATE TABLE IF NOT EXISTS coding_problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
      topic TEXT NOT NULL,
      supported_languages_json TEXT DEFAULT '["python","c","cpp"]',
      input_format TEXT,
      output_format TEXT,
      constraints TEXT,
      sample_input TEXT,
      sample_output TEXT,
      explanation TEXT,
      starter_code_json TEXT DEFAULT '{}',
      function_signature TEXT,
      time_limit_ms INTEGER DEFAULT 2000,
      memory_limit_mb INTEGER DEFAULT 128,
      status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coding_test_cases (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL,
      input TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      marks INTEGER DEFAULT 10,
      order_index INTEGER DEFAULT 1,
      FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_submissions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      user_id TEXT,
      problem_id TEXT NOT NULL,
      language TEXT NOT NULL,
      source_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'PARTIAL_SUCCESS', 'SYSTEM_ERROR')),
      score REAL DEFAULT 0.0,
      passed_test_cases INTEGER DEFAULT 0,
      total_test_cases INTEGER DEFAULT 0,
      execution_time_ms INTEGER DEFAULT 0,
      memory_used_mb REAL DEFAULT 0.0,
      compiler_output TEXT,
      runtime_output TEXT,
      test_results_json TEXT DEFAULT '[]',
      ai_feedback_json TEXT DEFAULT '{}',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_skill_evidence (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      problem_id TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      score REAL NOT NULL,
      difficulty TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
      FOREIGN KEY (submission_id) REFERENCES coding_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_hint_requests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      problem_id TEXT NOT NULL,
      hint_level INTEGER NOT NULL CHECK (hint_level IN (1, 2, 3, 4)),
      request_text TEXT,
      response_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coding_activities (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      problem_id TEXT,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('PROBLEM_VIEWED', 'CODE_STARTED', 'CODE_RUN', 'CODE_SUBMITTED', 'HINT_REQUESTED', 'PROBLEM_SOLVED', 'PROBLEM_FAILED')),
      duration_seconds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS coding_streaks (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_active_days INTEGER DEFAULT 0,
      last_activity_date TEXT,
      streak_calendar_json TEXT DEFAULT '[]',
      badges_json TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_coding_problems_diff ON coding_problems(difficulty);
    CREATE INDEX IF NOT EXISTS idx_coding_problems_topic ON coding_problems(topic);
    CREATE INDEX IF NOT EXISTS idx_coding_test_cases_prob ON coding_test_cases(problem_id);
    CREATE INDEX IF NOT EXISTS idx_coding_subs_student ON coding_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_coding_subs_problem ON coding_submissions(problem_id);
    CREATE INDEX IF NOT EXISTS idx_coding_evidence_student ON coding_skill_evidence(student_id);
    CREATE INDEX IF NOT EXISTS idx_coding_hints_student ON coding_hint_requests(student_id, problem_id);
    CREATE INDEX IF NOT EXISTS idx_coding_activities_student ON coding_activities(student_id);

    -- Step 10: Communication and Language Learning System Tables
    CREATE TABLE IF NOT EXISTS communication_languages (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      native_name TEXT NOT NULL,
      flag_emoji TEXT NOT NULL,
      description TEXT,
      difficulty_rating TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'coming_soon', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_languages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
      level_name TEXT DEFAULT 'Level 1 — Beginner',
      overall_score REAL DEFAULT 0.0,
      speaking_score REAL DEFAULT 0.0,
      listening_score REAL DEFAULT 0.0,
      reading_score REAL DEFAULT 0.0,
      writing_score REAL DEFAULT 0.0,
      grammar_score REAL DEFAULT 0.0,
      vocabulary_score REAL DEFAULT 0.0,
      pronunciation_score REAL DEFAULT 0.0,
      conversation_score REAL DEFAULT 0.0,
      completed_lessons_count INTEGER DEFAULT 0,
      practice_sessions_count INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE,
      UNIQUE(student_id, language_id)
    );

    CREATE TABLE IF NOT EXISTS communication_lessons (
      id TEXT PRIMARY KEY,
      language_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
      lesson_type TEXT NOT NULL CHECK (lesson_type IN ('speaking', 'writing', 'grammar', 'vocabulary', 'reading', 'listening', 'conversation')),
      content_json TEXT DEFAULT '{}',
      order_index INTEGER DEFAULT 1,
      status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communication_activities (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      lesson_id TEXT,
      activity_type TEXT NOT NULL CHECK (activity_type IN ('LESSON_COMPLETED', 'SPEAKING_PRACTICE', 'WRITING_PRACTICE', 'GRAMMAR_PRACTICE', 'VOCABULARY_PRACTICE', 'READING_PRACTICE', 'LISTENING_PRACTICE', 'CONVERSATION_SESSION', 'ASSESSMENT_COMPLETED', 'MOCK_TEST_COMPLETED')),
      score REAL DEFAULT 0.0,
      duration_seconds INTEGER DEFAULT 0,
      metadata_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES communication_lessons(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS communication_assessments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL CHECK (assessment_type IN ('DIAGNOSTIC_BASELINE', 'MODULE_ASSESSMENT', 'CONVERSATION_MOCK_TEST')),
      overall_score REAL DEFAULT 0.0,
      speaking_score REAL DEFAULT 0.0,
      listening_score REAL DEFAULT 0.0,
      reading_score REAL DEFAULT 0.0,
      writing_score REAL DEFAULT 0.0,
      grammar_score REAL DEFAULT 0.0,
      vocabulary_score REAL DEFAULT 0.0,
      pronunciation_score REAL DEFAULT 0.0,
      conversation_score REAL DEFAULT 0.0,
      level INTEGER DEFAULT 1,
      level_name TEXT DEFAULT 'Level 1 — Beginner',
      ai_evaluation_json TEXT DEFAULT '{}',
      questions_json TEXT DEFAULT '[]',
      answers_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communication_skill_results (
      id TEXT PRIMARY KEY,
      assessment_id TEXT,
      student_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      category TEXT NOT NULL,
      score REAL NOT NULL,
      confidence TEXT DEFAULT 'High',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assessment_id) REFERENCES communication_assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS speaking_responses (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      activity_id TEXT,
      prompt_text TEXT NOT NULL,
      audio_reference TEXT,
      transcript TEXT NOT NULL,
      transcription_confidence REAL DEFAULT 0.9,
      duration_seconds INTEGER DEFAULT 0,
      relevance_score REAL DEFAULT 0.0,
      grammar_score REAL DEFAULT 0.0,
      vocabulary_score REAL DEFAULT 0.0,
      fluency_score REAL DEFAULT 0.0,
      pronunciation_score REAL DEFAULT 0.0,
      completeness_score REAL DEFAULT 0.0,
      overall_score REAL DEFAULT 0.0,
      feedback_json TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS writing_responses (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      activity_id TEXT,
      prompt TEXT NOT NULL,
      answer TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      overall_score REAL DEFAULT 0.0,
      grammar_score REAL DEFAULT 0.0,
      vocabulary_score REAL DEFAULT 0.0,
      clarity_score REAL DEFAULT 0.0,
      ai_feedback_json TEXT DEFAULT '{}',
      suggested_answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      language_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('daily', 'professional', 'placement', 'group_discussion', 'presentation')),
      topic TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
      total_messages INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      overall_score REAL DEFAULT 0.0,
      feedback_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (language_id) REFERENCES communication_languages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversation_session_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sender TEXT NOT NULL CHECK (sender IN ('ai', 'student', 'system')),
      message_text TEXT NOT NULL,
      transcript_reference TEXT,
      grammar_correction TEXT,
      vocabulary_note TEXT,
      relevance_score REAL DEFAULT 90.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES conversation_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communication_feedback (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      activity_id TEXT,
      feedback_type TEXT NOT NULL CHECK (feedback_type IN ('speaking', 'writing', 'conversation', 'assessment', 'mock_test')),
      feedback_json TEXT DEFAULT '{}',
      recommendations_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS communication_streaks (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_active_days INTEGER DEFAULT 0,
      last_activity_date TEXT,
      streak_calendar_json TEXT DEFAULT '[]',
      badges_json TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_student_lang ON student_languages(student_id, language_id);
    CREATE INDEX IF NOT EXISTS idx_comm_lessons_lang ON communication_lessons(language_id, category);
    CREATE INDEX IF NOT EXISTS idx_comm_activities_student ON communication_activities(student_id);
    CREATE INDEX IF NOT EXISTS idx_comm_assess_student ON communication_assessments(student_id);
    CREATE INDEX IF NOT EXISTS idx_conv_sessions_student ON conversation_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_conv_sess_messages_session ON conversation_session_messages(session_id);

    -- Step 11: Opportunity Marketplace Tables
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('INTERNSHIP', 'JOB', 'HIRING_DRIVE', 'PLACEMENT_DRIVE', 'EVENT', 'HACKATHON', 'WORKSHOP', 'COMPETITION')),
      company_name TEXT NOT NULL,
      company_logo TEXT,
      description TEXT NOT NULL,
      short_description TEXT,
      required_skills_json TEXT DEFAULT '[]',
      preferred_skills_json TEXT DEFAULT '[]',
      eligibility_criteria TEXT,
      qualification TEXT,
      branch TEXT,
      minimum_year INTEGER DEFAULT 1,
      maximum_year INTEGER DEFAULT 4,
      location TEXT NOT NULL,
      work_mode TEXT NOT NULL CHECK (work_mode IN ('ONSITE', 'REMOTE', 'HYBRID')),
      stipend TEXT,
      salary_range TEXT,
      duration TEXT,
      start_date DATETIME,
      end_date DATETIME,
      application_deadline DATETIME NOT NULL,
      apply_url TEXT,
      registration_url TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      posted_by TEXT,
      company_id TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'EXPIRED', 'REJECTED')),
      verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'FLAGGED')),
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS saved_opportunities (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      UNIQUE(student_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS opportunity_applications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('INTERESTED', 'SAVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN')),
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      application_reference TEXT,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      UNIQUE(student_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS opportunity_reports (
      id TEXT PRIMARY KEY,
      reported_by TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_opp_type_status ON opportunities(type, status, verification_status);
    CREATE INDEX IF NOT EXISTS idx_opp_deadline ON opportunities(application_deadline);
    CREATE INDEX IF NOT EXISTS idx_saved_opp_student ON saved_opportunities(student_id);
    CREATE INDEX IF NOT EXISTS idx_opp_app_student ON opportunity_applications(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_opp_reports_status ON opportunity_reports(status);

    -- Step 12: AI Student-Opportunity Matching System Tables
    CREATE TABLE IF NOT EXISTS student_opportunity_preferences (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      preferred_roles_json TEXT DEFAULT '[]',
      preferred_skills_json TEXT DEFAULT '[]',
      preferred_locations_json TEXT DEFAULT '[]',
      preferred_work_modes_json TEXT DEFAULT '[]',
      preferred_types_json TEXT DEFAULT '[]',
      minimum_stipend INTEGER DEFAULT 0,
      minimum_salary INTEGER DEFAULT 0,
      preferred_industries_json TEXT DEFAULT '[]',
      available_from TEXT,
      preferred_duration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS opportunity_match_results (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      matching_score REAL NOT NULL,
      match_category TEXT NOT NULL,
      matched_skills_json TEXT DEFAULT '[]',
      partial_skills_json TEXT DEFAULT '[]',
      missing_skills_json TEXT DEFAULT '[]',
      optional_skills_json TEXT DEFAULT '[]',
      skill_comparison_json TEXT DEFAULT '[]',
      eligibility_status TEXT NOT NULL,
      eligibility_reasons_json TEXT DEFAULT '[]',
      factor_breakdown_json TEXT DEFAULT '{}',
      explanation TEXT NOT NULL,
      why_matched_json TEXT DEFAULT '[]',
      improvement_suggestions_json TEXT DEFAULT '{}',
      engine_version TEXT DEFAULT 'v1.2.0-hybrid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      UNIQUE(student_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS opportunity_preparation_plans (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      title TEXT NOT NULL,
      steps_json TEXT NOT NULL DEFAULT '[]',
      progress_percentage INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      UNIQUE(student_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS opportunity_match_history (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      matching_score REAL NOT NULL,
      match_category TEXT NOT NULL,
      matched_skills_json TEXT DEFAULT '[]',
      missing_skills_json TEXT DEFAULT '[]',
      eligibility_status TEXT NOT NULL,
      explanation TEXT,
      engine_version TEXT DEFAULT 'v1.2.0-hybrid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_match_res_student ON opportunity_match_results(student_id, matching_score DESC);
    CREATE INDEX IF NOT EXISTS idx_match_res_opp ON opportunity_match_results(opportunity_id);
    CREATE INDEX IF NOT EXISTS idx_prep_plans_student ON opportunity_preparation_plans(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_match_hist_student ON opportunity_match_history(student_id, created_at DESC);

    -- Step 13: AI Mock Interview System Tables
    CREATE TABLE IF NOT EXISTS mock_interviews (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      interview_type TEXT NOT NULL CHECK (interview_type IN ('TECHNICAL', 'HR', 'BEHAVIORAL', 'COMMUNICATION', 'ROLE_SPECIFIC', 'MIXED')),
      target_role TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
      mode TEXT NOT NULL DEFAULT 'TEXT' CHECK (mode IN ('TEXT', 'VOICE')),
      question_count INTEGER NOT NULL DEFAULT 5,
      duration INTEGER NOT NULL DEFAULT 15,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
      overall_score REAL DEFAULT 0.0,
      technical_score REAL DEFAULT 0.0,
      communication_score REAL DEFAULT 0.0,
      hr_score REAL DEFAULT 0.0,
      problem_solving_score REAL DEFAULT 0.0,
      questions_attempted INTEGER DEFAULT 0,
      questions_skipped INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      strengths_json TEXT DEFAULT '[]',
      weaknesses_json TEXT DEFAULT '[]',
      feedback_summary TEXT,
      recommended_courses_json TEXT DEFAULT '[]',
      recommended_coding_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      question_id TEXT,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      is_follow_up INTEGER DEFAULT 0,
      parent_question_id TEXT,
      follow_up_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interview_id) REFERENCES mock_interviews(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interview_answers (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      audio_url TEXT,
      score REAL DEFAULT 0.0,
      technical_score REAL DEFAULT 0.0,
      communication_score REAL DEFAULT 0.0,
      hr_score REAL DEFAULT 0.0,
      problem_solving_score REAL DEFAULT 0.0,
      feedback TEXT,
      strengths_json TEXT DEFAULT '[]',
      weaknesses_json TEXT DEFAULT '[]',
      missing_points_json TEXT DEFAULT '[]',
      suggested_structure TEXT,
      improvement_advice TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (interview_id) REFERENCES mock_interviews(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Step 14: Mentorship Support & Privacy Tables
    CREATE TABLE IF NOT EXISTS mentorship_requests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      mentor_id TEXT NOT NULL,
      topic TEXT NOT NULL CHECK (topic IN ('Coding', 'Communication', 'Resume preparation', 'Interview preparation', 'Career guidance', 'Internship guidance', 'Project guidance', 'Placement preparation')),
      description TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
      mentor_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_privacy_settings (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      share_skills INTEGER DEFAULT 1,
      share_gaps INTEGER DEFAULT 1,
      share_courses INTEGER DEFAULT 1,
      share_coding INTEGER DEFAULT 1,
      share_interviews INTEGER DEFAULT 1,
      share_applications INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mentor_feedbacks (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      mentor_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      strengths TEXT NOT NULL,
      weaknesses TEXT NOT NULL,
      recommended_practice TEXT,
      interview_advice TEXT,
      course_suggestions TEXT,
      career_guidance TEXT,
      follow_up_tasks TEXT,
      rating REAL DEFAULT 5.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES mentor_sessions(id) ON DELETE SET NULL,
      FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Step 15: Recruiter Scheduled Interviews Table
    CREATE TABLE IF NOT EXISTS recruiter_interviews (
      id TEXT PRIMARY KEY,
      recruiter_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      opportunity_id TEXT,
      application_id TEXT,
      interview_type TEXT NOT NULL CHECK (interview_type IN ('TECHNICAL', 'HR', 'MANAGERIAL', 'COMMUNICATION', 'FINAL')),
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      meeting_link TEXT,
      instructions TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
      FOREIGN KEY (application_id) REFERENCES opportunity_applications(id) ON DELETE SET NULL
    );

    -- Step 17: User Notification Preferences & Reports Tables
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      email_alerts INTEGER DEFAULT 1,
      in_app_alerts INTEGER DEFAULT 1,
      opportunity_alerts INTEGER DEFAULT 1,
      interview_alerts INTEGER DEFAULT 1,
      mentorship_alerts INTEGER DEFAULT 1,
      system_alerts INTEGER DEFAULT 1,
      course_reminders INTEGER DEFAULT 1,
      test_reminders INTEGER DEFAULT 1,
      application_updates INTEGER DEFAULT 1,
      mentor_messages INTEGER DEFAULT 1,
      interview_reminders INTEGER DEFAULT 1,
      system_announcements INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      report_type TEXT NOT NULL,
      title TEXT NOT NULL,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mock_int_student ON mock_interviews(student_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_int_ques_int ON interview_questions(interview_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_int_ans_int ON interview_answers(interview_id);
    CREATE INDEX IF NOT EXISTS idx_mentor_req_stu ON mentorship_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_mentor_req_men ON mentorship_requests(mentor_id);
    CREATE INDEX IF NOT EXISTS idx_rec_int_rec ON recruiter_interviews(recruiter_id);
    CREATE INDEX IF NOT EXISTS idx_rec_int_can ON recruiter_interviews(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
  `);

  // Safe migrations for notification preferences
  const notifCols = ['email_alerts', 'in_app_alerts', 'interview_alerts', 'mentorship_alerts', 'system_alerts'];
  for (const col of notifCols) {
    try {
      db.exec(`ALTER TABLE notification_preferences ADD COLUMN ${col} INTEGER DEFAULT 1;`);
    } catch {
      // Column may already exist
    }
  }

  console.log('[Database] Relational schema, Steps 8-12, and Steps 13-18 schema initialized successfully.');
}

/**
 * Helper to query multiple rows
 */
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  const safeParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  return stmt.all(...safeParams) as T[];
}

/**
 * Helper to query a single row
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const safeParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  const rows = stmt.all(...safeParams) as T[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to execute INSERT, UPDATE, DELETE
 */
export function execute(sql: string, params: any[] = []) {
  const safeParams = params.map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  return stmt.run(...safeParams);
}

/**
 * Resets all user-specific data from the database, ensuring clean state
 * while keeping educational courses, modules, lessons, skills, and target roles intact.
 */
export function resetUserData(devOnly = true): { success: boolean; clearedTables: string[] } {
  if (devOnly && process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is forbidden in production environments.');
  }

  const tablesToClear = [
    'recommendations',
    'answers',
    'proctoring_logs',
    'assessment_attempts',
    'skill_report_items',
    'skill_reports',
    'student_skills',
    'student_skill_history',
    'skill_gaps',
    'lesson_progress',
    'learning_activities',
    'course_enrollments',
    'test_attempts',
    'roadmap_courses',
    'roadmap_stages',
    'learning_roadmaps',
    'coding_submissions',
    'coding_streaks',
    'conversations',
    'conversation_turns',
    'writing_submissions',
    'applications',
    'saved_opportunities',
    'opportunity_matches',
    'notifications',
    'notification_preferences',
    'audit_logs',
    'password_resets',
    'email_verifications',
    'student_profiles',
    'colleges',
    'companies',
    'mentors',
    'users'
  ];

  db.exec('PRAGMA foreign_keys = OFF;');
  const cleared: string[] = [];
  for (const table of tablesToClear) {
    try {
      db.exec(`DELETE FROM ${table};`);
      cleared.push(table);
    } catch (err: any) {
      // Table might not exist yet
    }
  }
  db.exec('PRAGMA foreign_keys = ON;');

  console.log(`[Database] User data reset successfully. Cleared ${cleared.length} tables.`);
  return { success: true, clearedTables: cleared };
}
