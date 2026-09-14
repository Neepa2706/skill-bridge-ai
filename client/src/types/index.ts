export type UserRole = 'student' | 'college' | 'recruiter' | 'mentor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  college_name: string;
  department: string;
  year_of_study: number;
  education_details?: string;
  career_interest: string;
  target_role_id: string;
  current_level: string;
  programming_languages_json?: string;
  communication_languages_json?: string;
  learning_preferences_json?: string;
  programmingLanguages?: string[];
  communicationLanguages?: string[];
  learningPreferences?: string[];
  career_readiness_score: number;
}

export interface SkillItem {
  id: string;
  name: string;
  category: 'technical' | 'coding' | 'communication' | 'general';
  current_level: number;
  verified_score: number;
  last_assessed_at?: string;
}

export interface SkillGapItem {
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gapStatus: 'critical' | 'needs_improvement' | 'good';
  gapPercentage: number;
  priorityOrder: number;
  recommendation: string;
}

export interface GapAnalysis {
  targetRoleTitle: string;
  readinessScore: number;
  gaps: SkillGapItem[];
  criticalCount: number;
  needsImprovementCount: number;
  goodCount: number;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  actionLabel: string;
  route: string;
}

export interface CodingStreakData {
  currentStreak: number;
  longestStreak: number;
  badges: Array<{ id: string; title: string; desc: string }>;
  calendar: Array<{ date: string; count: number }>;
}

export interface CourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnail: string;
  estimated_hours: number;
  tier: 'required' | 'recommended' | 'advanced';
  primary_skill_name?: string;
  modulesCount?: number;
  lessonsCount?: number;
  completedLessonsCount?: number;
  progressPercentage?: number;
}

export interface LessonItem {
  id: string;
  module_id: string;
  title: string;
  content: string;
  practice_prompt?: string;
  practice_starter_code?: string;
  order_index: number;
  progress?: {
    is_completed: number;
    content_completed: number;
    practice_completed: number;
    test_passed: number;
    time_spent_seconds: number;
  };
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  description: string;
  points: number;
  isSolved?: boolean;
  starterCode?: Record<string, string>;
  publicTestCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface OpportunityItem {
  id: string;
  title: string;
  company_name?: string;
  company_id?: string;
  role?: string;
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  eligibility?: string;
  duration?: string;
  stipend?: string;
  salary_range?: string;
  location: string;
  work_mode: string;
  deadline?: string;
  matchScore: number;
  matchExplanation: string;
  strongMatches: string[];
  missingSkills: string[];
  isRecommended: boolean;
  isApplied?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link_url?: string;
  created_at: string;
}
