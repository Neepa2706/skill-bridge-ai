-- SkillBridge AI Relational SQLite Schema
-- Foreign keys enabled in SQLite via PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'college', 'recruiter', 'mentor', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  auth_provider TEXT DEFAULT 'email',
  email_verified INTEGER DEFAULT 0,
  account_status TEXT DEFAULT 'active',
  profile_completed INTEGER DEFAULT 0,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  college_name TEXT,
  department TEXT,
  degree TEXT,
  current_year INTEGER DEFAULT 1,
  section TEXT,
  graduation_year INTEGER,
  year_of_study INTEGER DEFAULT 1,
  education_details TEXT,
  career_interest TEXT,
  target_role_id TEXT,
  self_declared_level TEXT DEFAULT 'Beginner',
  current_level TEXT DEFAULT 'Beginner',
  programming_languages_json TEXT DEFAULT '[]',
  communication_languages_json TEXT DEFAULT '[]',
  learning_preferences_json TEXT DEFAULT '[]',
  resume_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  career_readiness_score REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS colleges (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  institution_name TEXT,
  code TEXT UNIQUE,
  contact_email TEXT,
  contact_person_name TEXT,
  designation TEXT,
  phone TEXT,
  address TEXT,
  established_year INTEGER,
  verification_status TEXT DEFAULT 'pending_verification',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  hod_name TEXT,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  company_name TEXT,
  company_email TEXT,
  recruiter_name TEXT,
  designation TEXT,
  phone TEXT,
  website TEXT,
  industry TEXT,
  description TEXT,
  logo_url TEXT,
  verified INTEGER DEFAULT 1,
  verification_status TEXT DEFAULT 'pending_verification',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  designation TEXT,
  phone TEXT,
  expertise_json TEXT DEFAULT '[]',
  bio TEXT,
  years_experience INTEGER DEFAULT 3,
  current_company TEXT,
  rating REAL DEFAULT 4.9,
  hourly_rate REAL DEFAULT 0,
  available_slots_json TEXT DEFAULT '[]',
  verification_status TEXT DEFAULT 'pending_verification',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'coding', 'communication', 'general')),
  description TEXT,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS target_roles (
  id TEXT PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  min_readiness_score REAL DEFAULT 75.0
);

CREATE TABLE IF NOT EXISTS industry_requirements (
  id TEXT PRIMARY KEY,
  target_role_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  required_level REAL NOT NULL DEFAULT 70.0,
  weight REAL DEFAULT 1.0,
  is_mandatory INTEGER DEFAULT 1,
  FOREIGN KEY (target_role_id) REFERENCES target_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  current_level REAL DEFAULT 0.0,
  verified_score REAL DEFAULT 0.0,
  last_assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('initial', 'lesson_test', 'language_test', 'mock_exam', 'coding_test')),
  target_role_id TEXT,
  duration_minutes INTEGER DEFAULT 30,
  passing_score REAL DEFAULT 60.0,
  category TEXT DEFAULT 'general',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_role_id) REFERENCES target_roles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT,
  lesson_id TEXT,
  skill_id TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'multiple_choice', 'boolean', 'scenario', 'coding', 'short_answer')),
  options_json TEXT NOT NULL DEFAULT '[]',
  correct_answer_json TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  points INTEGER DEFAULT 10,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score REAL DEFAULT 0.0,
  total_score REAL DEFAULT 100.0,
  percentage REAL DEFAULT 0.0,
  passed INTEGER DEFAULT 0,
  proctoring_violations_count INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  user_answer_json TEXT,
  is_correct INTEGER DEFAULT 0,
  points_awarded REAL DEFAULT 0.0,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proctoring_logs (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  details TEXT,
  severity TEXT DEFAULT 'medium',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_id TEXT,
  version INTEGER DEFAULT 1,
  overall_score REAL NOT NULL,
  overall_level TEXT DEFAULT 'Developing',
  summary TEXT,
  category_scores_json TEXT DEFAULT '{}',
  skill_breakdown_json TEXT NOT NULL DEFAULT '{}',
  strengths_json TEXT NOT NULL DEFAULT '[]',
  weaknesses_json TEXT NOT NULL DEFAULT '[]',
  priority_skills_json TEXT NOT NULL DEFAULT '[]',
  recommended_next_steps_json TEXT NOT NULL DEFAULT '[]',
  career_alignment_json TEXT DEFAULT '{}',
  visibility TEXT DEFAULT 'private',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS skill_gaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_role_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  current_level REAL DEFAULT 0.0,
  required_level REAL DEFAULT 70.0,
  gap_status TEXT NOT NULL CHECK (gap_status IN ('critical', 'needs_improvement', 'good')),
  gap_percentage REAL DEFAULT 0.0,
  priority_order INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_role_id) REFERENCES target_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE(user_id, target_role_id, skill_id)
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_role_ids_json TEXT DEFAULT '[]',
  primary_skill_id TEXT,
  difficulty TEXT DEFAULT 'Beginner',
  thumbnail TEXT,
  estimated_hours REAL DEFAULT 10.0,
  tier TEXT DEFAULT 'required' CHECK (tier IN ('required', 'recommended', 'advanced')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (primary_skill_id) REFERENCES skills(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 1,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'interactive', 'notes')),
  content TEXT NOT NULL,
  practice_prompt TEXT,
  practice_starter_code TEXT,
  practice_expected_output TEXT,
  order_index INTEGER DEFAULT 1,
  duration_minutes INTEGER DEFAULT 15,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  content_completed INTEGER DEFAULT 0,
  practice_completed INTEGER DEFAULT 0,
  test_passed INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS lesson_tests (
  id TEXT PRIMARY KEY,
  lesson_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  passing_score REAL DEFAULT 70.0,
  duration_minutes INTEGER DEFAULT 15,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score REAL DEFAULT 0.0,
  total_points REAL DEFAULT 100.0,
  percentage REAL DEFAULT 0.0,
  passed INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES lesson_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS recommendations (
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

CREATE TABLE IF NOT EXISTS coding_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  starter_code_json TEXT NOT NULL DEFAULT '{}',
  solution_code TEXT,
  test_cases_json TEXT NOT NULL DEFAULT '[]',
  hidden_test_cases_json TEXT NOT NULL DEFAULT '[]',
  points INTEGER DEFAULT 20,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compile_error')),
  execution_time_ms INTEGER DEFAULT 0,
  memory_used_kb INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  error_output TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coding_streaks (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  streak_calendar_json TEXT DEFAULT '[]',
  badges_json TEXT DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS language_tracks (
  id TEXT PRIMARY KEY,
  language_code TEXT UNIQUE NOT NULL,
  language_name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  fluency_score REAL DEFAULT 0,
  grammar_score REAL DEFAULT 0,
  vocabulary_score REAL DEFAULT 0,
  overall_score REAL DEFAULT 0,
  feedback_json TEXT DEFAULT '{}',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES language_tracks(language_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('ai', 'user')),
  message_text TEXT NOT NULL,
  grammar_notes TEXT,
  vocabulary_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  eligibility TEXT,
  duration TEXT,
  stipend TEXT,
  location TEXT,
  work_mode TEXT CHECK (work_mode IN ('remote', 'hybrid', 'on-site')),
  start_date TEXT,
  deadline TEXT,
  application_url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('hackathon', 'workshop', 'webinar', 'seminar', 'competition', 'career_fair')),
  date TEXT NOT NULL,
  time TEXT,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  eligibility TEXT,
  deadline TEXT,
  registration_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  preferred_skills_json TEXT DEFAULT '[]',
  eligibility TEXT,
  experience_level TEXT,
  location TEXT,
  work_mode TEXT CHECK (work_mode IN ('remote', 'hybrid', 'on-site')),
  salary_range TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('internship', 'job')),
  opportunity_id TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'applied' CHECK (current_stage IN ('eligible', 'applied', 'assessment', 'coding_round', 'shortlisted', 'interview', 'selected', 'offer', 'joined', 'rejected')),
  match_score REAL DEFAULT 0.0,
  match_reason TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ai_mock', 'live_mentor')),
  interview_category TEXT NOT NULL CHECK (interview_category IN ('hr', 'technical', 'role_based')),
  target_role TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  transcript_json TEXT DEFAULT '[]',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentor_sessions (
  id TEXT PRIMARY KEY,
  interview_id TEXT,
  mentor_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  meeting_link TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE SET NULL,
  FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_feedback (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('ai', 'mentor')),
  reviewer_name TEXT NOT NULL,
  technical_correctness REAL DEFAULT 0.0,
  relevance REAL DEFAULT 0.0,
  completeness REAL DEFAULT 0.0,
  communication REAL DEFAULT 0.0,
  confidence REAL DEFAULT 0.0,
  overall_score REAL DEFAULT 0.0,
  feedback_text TEXT NOT NULL,
  strengths_json TEXT DEFAULT '[]',
  improvement_areas_json TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
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

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('student_portfolio', 'college_department', 'recruiter_candidate')),
  title TEXT NOT NULL,
  data_json TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details_json TEXT DEFAULT '{}',
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
