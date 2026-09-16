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

  let rawQuestions: any[] | null = null;

  // Attempt live AI generation if Gemini is configured
  if (gemini.hasApiKey()) {
    try {
      const aiResult = await gemini.generateJSONWithResult<any[]>(userPrompt, systemPrompt);
      if (aiResult.success && Array.isArray(aiResult.data) && aiResult.data.length > 0) {
        rawQuestions = aiResult.data;
      }
    } catch (err) {
      console.warn('[AssessmentGenerator] Gemini generation failed, falling back to curated adaptive bank:', err);
    }
  }

  // Fallback to high-quality curated adaptive question bank if AI is offline or unavailable
  if (!rawQuestions || rawQuestions.length === 0) {
    rawQuestions = getCuratedAdaptiveQuestions(role, level, department);
  }

  // Validate and format questions
  const formatted: GeneratedQuestion[] = rawQuestions.map((q, idx) => {
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
      id: q.id || `q-${uuidv4()}`,
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

/**
 * Curated, high-quality question bank spanning Programming, Logic, Problem Solving, and Communication.
 * Guarantees zero downtime and instant availability for all candidates.
 */
function getCuratedAdaptiveQuestions(role: string, level: string, department: string): any[] {
  return [
    {
      questionText: "In Python and modern memory architectures, which statement regarding mutable vs immutable objects is correct?",
      questionType: "mcq",
      category: "programming",
      skillName: "Python Programming & Memory Model",
      difficulty: "medium",
      points: 10,
      options: [
        "Integers, strings, and tuples are immutable, meaning modifying them creates a new memory reference.",
        "Lists and dictionaries are immutable, preventing in-place item reassignment.",
        "Passing a list into a function automatically clones it by value, preventing side-effects.",
        "Tuples can have new elements appended dynamically using the .append() method."
      ],
      correctAnswer: "Integers, strings, and tuples are immutable, meaning modifying them creates a new memory reference.",
      explanation: "In Python, primitive types like int, str, and tuple are immutable. Any modification rebinds the identifier to a new object in memory. Lists and dicts are mutable and modified in place."
    },
    {
      questionText: "Write a function `two_sum(nums, target)` that returns the indices of the two numbers in `nums` such that they add up to `target`. Assume each input has exactly one solution.",
      questionType: "coding",
      category: "programming",
      skillName: "Algorithms & Hash Maps",
      difficulty: "medium",
      points: 10,
      codeLanguage: "python",
      starterCode: "def two_sum(nums, target):\n    # Return a tuple or list of the two zero-based indices\n    # e.g., for nums=[2, 7, 11, 15], target=9 -> [0, 1]\n    seen = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in seen:\n            return [seen[complement], i]\n        seen[n] = i\n    return []",
      correctAnswer: "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i\n    return []",
      explanation: "A single-pass hash map achieves O(n) time complexity and O(n) space complexity by storing each element's complement.",
      rubric: "10 points for O(n) hash table approach with correct indices; 6 points for O(n^2) nested loop; 0 points for unhandled logic."
    },
    {
      questionText: "Consider the series: 2, 6, 12, 20, 30, ?. What is the next number in this sequence, and what is the underlying rule?",
      questionType: "mcq",
      category: "logical_reasoning",
      skillName: "Logical Reasoning & Pattern Analysis",
      difficulty: "medium",
      points: 10,
      options: [
        "42 (Differences are consecutive even numbers: +4, +6, +8, +10, +12, or n * (n + 1))",
        "40 (Each number is multiplied by 1.5 rounded to nearest integer)",
        "44 (Differences increase exponentially by powers of 2)",
        "38 (Add previous two terms divided by two)"
      ],
      correctAnswer: "42 (Differences are consecutive even numbers: +4, +6, +8, +10, +12, or n * (n + 1))",
      explanation: "The differences are: 6-2=4, 12-6=6, 20-12=8, 30-20=10. The next difference is 12, giving 30+12 = 42. Alternatively, n*(n+1) for n=1..6 gives 2, 6, 12, 20, 30, 42."
    },
    {
      questionText: "When designing a low-latency caching layer for user sessions, why is a Hash Table / Key-Value store preferred over a balanced Binary Search Tree (AVL / Red-Black)?",
      questionType: "mcq",
      category: "problem_solving",
      skillName: "Data Structures & System Design",
      difficulty: "medium",
      points: 10,
      options: [
        "Hash tables provide average O(1) lookup and insertion, whereas balanced BSTs require O(log N) operations.",
        "Balanced BSTs require more network bandwidth per socket connection.",
        "Hash tables guarantee zero memory fragmentation across Linux kernels.",
        "BSTs cannot store string keys or complex serializable values."
      ],
      correctAnswer: "Hash tables provide average O(1) lookup and insertion, whereas balanced BSTs require O(log N) operations.",
      explanation: "A hash table computes a hash code directly into a bucket array for average O(1) time complexity, whereas tree traversals require log2(N) pointer dereferences."
    },
    {
      questionText: "Describe step-by-step how you would architect an idempotent API endpoint for processing student mock test submissions to prevent duplicate records if a network disconnect occurs during submission.",
      questionType: "short_answer",
      category: "problem_solving",
      skillName: "API Architecture & Idempotency",
      difficulty: "medium",
      points: 10,
      correctAnswer: "Client generates a unique idempotency key or attemptId. Server verifies if attemptId is already completed or locked in database; if previously processed, return the cached result without re-executing grading. Use atomic transactions or database row locks.",
      explanation: "Idempotency ensures that identical retries cause no unintended state mutation.",
      rubric: "Look for mention of unique idempotency token/attempt ID, database lock or status check ('in_progress' vs 'completed'), atomic transaction, and returning cached status."
    },
    {
      questionText: "During a major sprint deadline, you discover that a third-party dependency used in your team's microservice has a critical security vulnerability. How do you communicate this issue to your project lead and prioritize remediation?",
      questionType: "short_answer",
      category: "communication",
      skillName: "Technical Communication & Incident Management",
      difficulty: "medium",
      points: 10,
      correctAnswer: "Immediately alert the tech lead with a clear summary: describe the vulnerability severity (CVE), affected endpoints, blast radius, potential exploit vectors, and propose 2 actionable options (patching version, applying a temporary WAF rule or proxy mitigation).",
      explanation: "Effective engineering communication is prompt, structured with severity and impact, and offers solutions rather than just raising alarms.",
      rubric: "Assess whether the answer includes immediate structured notification, impact assessment, and proposed mitigation options."
    }
  ];
}

