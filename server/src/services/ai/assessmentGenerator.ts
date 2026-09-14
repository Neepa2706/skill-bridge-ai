import { v4 as uuidv4 } from 'uuid';
import { gemini } from './gemini.client.js';

export type AssessmentCategory = 'programming' | 'logical_reasoning' | 'problem_solving' | 'communication';

export interface GeneratedQuestion {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'multiple_choice' | 'short_answer' | 'coding';
  options?: string[];
  starterCode?: string;
  codeLanguage?: string;
  correctAnswer: string;
  explanation?: string;
  rubric?: string;
  skillName: string;
  category: AssessmentCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface AssessmentGenerationParams {
  targetRole: string;
  currentLevel: string;
  department?: string;
  technicalInterests?: string[];
  programmingLanguages?: string[];
}

export interface AssessmentGenerationResult {
  success: boolean;
  questions?: GeneratedQuestion[];
  error?: string;
}

/**
 * Generates dynamic, AI-powered questions based on user's department,
 * target role, and experience level across Programming, Logic, Problem Solving, and Communication.
 */
export async function generateAdaptiveAssessment(params: AssessmentGenerationParams): Promise<AssessmentGenerationResult> {
  const department = params.department || 'Computer Science & Engineering';
  const role = params.targetRole || 'Software Developer';
  const level = params.currentLevel || 'Beginner';
  const languages = params.programmingLanguages?.length ? params.programmingLanguages.join(', ') : 'Python, JavaScript, SQL';

  const systemPrompt = `You are the lead AI Assessment Architect for SkillBridge AI.
Generate comprehensive, real-time technical assessments tailored to a student's exact academic background and career goals.
You MUST return ONLY valid JSON matching the specified schema. No markdown backticks, no conversational preamble.`;

  const userPrompt = `Generate exactly 6 real assessment questions tailored for a candidate with:
- Academic Department: ${department}
- Target Career Role: ${role}
- Experience Level: ${level}
- Primary Languages / Interests: ${languages}

The 6 questions MUST represent these 4 mandatory domains:
1. Programming (2 questions):
   - Question 1: Multiple choice ('mcq') on language syntax, memory, or runtime behavior.
   - Question 2: Practical Coding ('coding') with a function signature, starter code, and problem statement.
2. Logical Reasoning (1 question):
   - Question 3: Multiple choice ('mcq') testing algorithmic deduction, series, or discrete math logic.
3. Problem Solving (2 questions):
   - Question 4: Multiple choice ('mcq') evaluating data structures or system design trade-offs.
   - Question 5: Short Answer ('short_answer') asking the candidate to describe step-by-step how they would solve a real-world problem or design an algorithm.
4. Communication (1 question):
   - Question 6: Short Answer ('short_answer') or scenario testing professional technical communication, team collaboration, or communicating trade-offs to stakeholders.

Return a JSON array of objects with these exact keys:
[
  {
    "questionText": "Full question statement here",
    "questionType": "mcq" | "short_answer" | "coding",
    "category": "programming" | "logical_reasoning" | "problem_solving" | "communication",
    "skillName": "Specific skill name (e.g., 'Python Programming', 'Logical Reasoning', 'Data Structures & Algorithms', 'Technical Communication')",
    "difficulty": "easy" | "medium" | "hard",
    "points": 10,
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"], // Required for mcq, omit or empty for others
    "starterCode": "def solution():\\n    # Write your solution here\\n    pass", // Required for coding
    "codeLanguage": "python", // Required for coding
    "correctAnswer": "Exact string of correct choice for mcq, reference solution for coding, or exemplary answer for short_answer",
    "explanation": "Detailed rationale explaining the correct answer",
    "rubric": "Evaluation guidelines for AI scoring of short answers or coding"
  }
]`;

  const aiResult = await gemini.generateJSONWithResult<any[]>(userPrompt, systemPrompt);

  if (!aiResult.success || !aiResult.data || !Array.isArray(aiResult.data) || aiResult.data.length === 0) {
    return {
      success: false,
      error: aiResult.error || 'AI generation service failed to return questions. Please check GEMINI_API_KEY configuration and try again.'
    };
  }

  // Validate and format questions
  const formatted: GeneratedQuestion[] = aiResult.data.map((q, idx) => {
    const rawType = String(q.questionType || '').toLowerCase();
    const type: GeneratedQuestion['questionType'] =
      rawType === 'coding' ? 'coding' :
      rawType === 'short_answer' ? 'short_answer' : 'mcq';

    const rawCategory = String(q.category || '').toLowerCase();
    const category: AssessmentCategory =
      rawCategory.includes('logic') ? 'logical_reasoning' :
      rawCategory.includes('problem') ? 'problem_solving' :
      rawCategory.includes('comm') ? 'communication' : 'programming';

    let options: string[] | undefined = undefined;
    if (type === 'mcq') {
      options = Array.isArray(q.options) && q.options.length >= 2
        ? q.options.map(String)
        : ['True', 'False'];
    }

    return {
      id: `q-${uuidv4()}`,
      questionText: String(q.questionText || `Question ${idx + 1}`),
      questionType: type,
      options,
      starterCode: q.starterCode ? String(q.starterCode) : undefined,
      codeLanguage: q.codeLanguage ? String(q.codeLanguage) : 'python',
      correctAnswer: String(q.correctAnswer || ''),
      explanation: q.explanation ? String(q.explanation) : undefined,
      rubric: q.rubric ? String(q.rubric) : undefined,
      skillName: String(q.skillName || (category === 'programming' ? 'Programming & Syntax' : category === 'logical_reasoning' ? 'Logical Deduction' : category === 'problem_solving' ? 'Problem Solving & Systems' : 'Technical Communication')),
      category,
      difficulty: q.difficulty === 'hard' ? 'hard' : q.difficulty === 'easy' ? 'easy' : 'medium',
      points: Number(q.points) || 10
    };
  });

  return {
    success: true,
    questions: formatted
  };
}
