import { v4 as uuidv4 } from 'uuid';
import { gemini } from './gemini.client.js';

export interface GeneratedMockQuestion {
  questionId: string;
  questionType: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'CODING';
  questionText: string;
  options: string[];
  correctAnswer: string; // JSON string for MSQ (e.g. '["A", "B"]'), string for others
  marks: number;
  skillId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface GeneratedMockTestPayload {
  testTitle: string;
  lessonId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  durationMinutes: number;
  passingPercentage: number;
  questions: GeneratedMockQuestion[];
}

export interface MockTestGeneratorParams {
  lessonId: string;
  lessonTitle: string;
  lessonDescription?: string;
  courseTitle: string;
  moduleTitle: string;
  learningObjectives?: string[];
  keyPoints?: string[];
  skills?: Array<{ id: string; name: string }>;
  difficulty?: 'easy' | 'medium' | 'hard';
  studentLevel?: string;
  previousMistakes?: string[];
  totalQuestions?: number;
}

/**
 * AI-powered mock test generator for lessons.
 * Strictly grounds questions in the lesson's title, syllabus, objectives, and skills.
 */
export async function generateLessonMockTest(params: MockTestGeneratorParams): Promise<GeneratedMockTestPayload> {
  const {
    lessonId,
    lessonTitle,
    lessonDescription = '',
    courseTitle,
    moduleTitle,
    learningObjectives = [],
    keyPoints = [],
    skills = [],
    difficulty = 'medium',
    studentLevel = 'Developing',
    previousMistakes = [],
    totalQuestions = 6
  } = params;

  const primarySkill = skills[0] || { id: 'skl-py', name: 'Python Programming' };

  // Attempt generation with Gemini 1.5 Flash
  try {
    const prompt = `You are an elite pedagogical AI test creator for SkillBridge AI — "From Beginner to Placement Ready".
Create a rigorous, highly educational ${difficulty.toUpperCase()} mock test for this exact lesson:

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Description: ${lessonDescription}
Learning Objectives: ${JSON.stringify(learningObjectives)}
Key Points: ${JSON.stringify(keyPoints)}
Assessed Skills: ${JSON.stringify(skills)}
Candidate Current Level: ${studentLevel}
Previous Areas of Weakness to Target: ${JSON.stringify(previousMistakes)}
Total Questions Desired: ${totalQuestions}

Generate a balanced assessment with question types:
- MCQ (Multiple Choice, exactly 1 correct answer)
- MSQ (Multiple Select, 2+ correct answers in an array string)
- TRUE_FALSE (Boolean choice)
- SHORT_ANSWER (Conceptual explanation)

STRICT RULES:
1. Every question MUST directly test concepts taught in this lesson.
2. Provide concise, clear explanations for why the correct answer is right.
3. For MSQ, correctAnswer must be a JSON array string of exact option strings, e.g. '["Option A", "Option C"]'.
4. For MCQ & TRUE_FALSE, correctAnswer must be the exact string of the correct option.
5. For SHORT_ANSWER, options should be empty array [] and correctAnswer must be the ideal model solution.

Return ONLY a valid JSON object matching this structure:
{
  "testTitle": "${lessonTitle} — AI Knowledge Assessment",
  "lessonId": "${lessonId}",
  "difficulty": "${difficulty}",
  "durationMinutes": 15,
  "passingPercentage": 60,
  "questions": [
    {
      "questionId": "q1",
      "questionType": "MCQ",
      "questionText": "...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "marks": 2,
      "skillId": "${primarySkill.id}",
      "difficulty": "${difficulty}",
      "explanation": "..."
    }
  ]
}`;

    const parsed = await gemini.generateJSON<any>(prompt);
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return {
        testTitle: parsed.testTitle || `${lessonTitle} AI Mock Test`,
        lessonId,
        difficulty,
        durationMinutes: Number(parsed.durationMinutes) || 15,
        passingPercentage: Number(parsed.passingPercentage) || 60,
        questions: parsed.questions.map((q: any, idx: number) => ({
          questionId: `q-${uuidv4().substring(0, 8)}`,
          questionType: (['MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'CODING'].includes(q.questionType) ? q.questionType : 'MCQ'),
          questionText: String(q.questionText || `Question ${idx + 1}`),
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: typeof q.correctAnswer === 'object' ? JSON.stringify(q.correctAnswer) : String(q.correctAnswer),
          marks: Number(q.marks) || 2,
          skillId: q.skillId || primarySkill.id,
          difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : difficulty),
          explanation: String(q.explanation || 'Verified from lesson curriculum.')
        }))
      };
    }
  } catch (err) {
    console.warn('[AI Mock Test Generator] Gemini call failed, falling back to deterministic generator:', err);
  }

  // High-fidelity pedagogical fallback based on lesson topic
  return buildDeterministicMockTest(params, primarySkill);
}

/**
 * Deterministic fallback questions generator
 */
function buildDeterministicMockTest(params: MockTestGeneratorParams, primarySkill: { id: string; name: string }): GeneratedMockTestPayload {
  const { lessonId, lessonTitle, difficulty = 'medium' } = params;
  const titleLower = lessonTitle.toLowerCase();

  let questions: GeneratedMockQuestion[] = [];

  if (titleLower.includes('control flow') || titleLower.includes('conditional') || titleLower.includes('loop')) {
    questions = [
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MCQ',
        questionText: 'What is the output of the following Python snippet?\n\nx = 10\nif x > 5:\n    print("High")\nelif x == 10:\n    print("Equal")\nelse:\n    print("Low")',
        options: ['High', 'Equal', 'High followed by Equal', 'Low'],
        correctAnswer: 'High',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'In an if-elif-else chain, execution terminates as soon as the first truthy condition (x > 5) evaluates to True.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MSQ',
        questionText: 'Which of the following statements about loops in Python are correct? (Select all that apply)',
        options: [
          'A while loop executes as long as its conditional expression evaluates to True.',
          'The `break` statement terminates the innermost active loop immediately.',
          'The `continue` statement skips to the next iteration of the loop.',
          'A for loop in Python can only iterate over integer numerical ranges.'
        ],
        correctAnswer: JSON.stringify([
          'A while loop executes as long as its conditional expression evaluates to True.',
          'The `break` statement terminates the innermost active loop immediately.',
          'The `continue` statement skips to the next iteration of the loop.'
        ]),
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: 'Python for loops can iterate over any iterable (lists, tuples, dictionaries, strings, generators), not just numerical ranges.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'TRUE_FALSE',
        questionText: 'In Python, the `else` block attached to a `for` or `while` loop executes if the loop terminates normally without encountering a `break` statement.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: 'Python loop `else` clauses execute upon exhausting the iterable or when the while condition becomes False, but are skipped if `break` is triggered.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'SHORT_ANSWER',
        questionText: 'Explain the difference between `break` and `continue` keywords inside a loop.',
        options: [],
        correctAnswer: '`break` immediately exits and terminates the entire loop execution, transferring control outside the loop block. In contrast, `continue` only skips the rest of the current iteration and jumps directly to the beginning of the next cycle.',
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: '`break` terminates the loop completely, whereas `continue` only skips the remaining statements of the current iteration.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MCQ',
        questionText: 'What will `list(range(2, 10, 3))` produce in Python 3?',
        options: ['[2, 5, 8]', '[2, 3, 4, 5, 6, 7, 8, 9]', '[2, 6, 10]', '[5, 8]'],
        correctAnswer: '[2, 5, 8]',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'range(start, stop, step) starts at 2, steps by 3 (2, 5, 8), and halts before reaching the stop value 10.'
      }
    ];
  } else if (titleLower.includes('variable') || titleLower.includes('data type') || titleLower.includes('memory')) {
    questions = [
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MCQ',
        questionText: 'Which of the following built-in types in Python is IMMUTABLE?',
        options: ['tuple', 'list', 'dict', 'set'],
        correctAnswer: 'tuple',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'Tuples, integers, floats, strings, and frozensets are immutable in Python; once allocated in memory, their contents cannot be modified in-place.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'TRUE_FALSE',
        questionText: 'In Python, variables do not store raw values directly; instead, they hold reference pointers to memory objects.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'Python uses a reference model where variables are named tags bound to object locations in heap memory.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MSQ',
        questionText: 'Which of the following operations produce a boolean value in Python? (Select all that apply)',
        options: [
          '5 in [1, 2, 3, 4, 5]',
          'type("SkillBridge") is str',
          'bool(0)',
          '10 / 2'
        ],
        correctAnswer: JSON.stringify([
          '5 in [1, 2, 3, 4, 5]',
          'type("SkillBridge") is str',
          'bool(0)'
        ]),
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: '10 / 2 evaluates to the float 5.0, whereas membership checks, identity checks, and bool() return True or False.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'SHORT_ANSWER',
        questionText: 'What is dynamic typing in Python and how does it differ from statically typed languages?',
        options: [],
        correctAnswer: 'Dynamic typing means variable types are checked and bound at runtime rather than at compile time. In Python, a variable can reference an integer at one moment and a string later without declaring explicit type annotations.',
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: 'Dynamic typing allows variables to be rebound to objects of different types during program execution without static type declarations.'
      }
    ];
  } else {
    // General Python / Programming test
    questions = [
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MCQ',
        questionText: `What is the primary role of ${lessonTitle} in professional software engineering?`,
        options: [
          'Structuring clean, reusable, and maintainable application code',
          'Bypassing operating system memory limits',
          'Eliminating all runtime hardware constraints',
          'Forcing manual memory deallocation in Python'
        ],
        correctAnswer: 'Structuring clean, reusable, and maintainable application code',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'Understanding the core concepts enables developers to construct predictable, scalable enterprise software.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'TRUE_FALSE',
        questionText: `Writing modular code aligned with ${lessonTitle} principles significantly reduces technical debt and simplifies automated unit testing.`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 2,
        skillId: primarySkill.id,
        difficulty: 'easy',
        explanation: 'Modularity and clean separation of concerns make code independently testable and maintainable.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'SHORT_ANSWER',
        questionText: `Summarize the most important takeaway from ${lessonTitle} and how you would apply it in a project.`,
        options: [],
        correctAnswer: `The primary takeaway is applying structured principles to solve algorithmic and architectural requirements cleanly with clear variable management, error handling, and separation of concerns.`,
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: 'Connecting lesson principles to concrete real-world implementation is the foundation of career readiness.'
      },
      {
        questionId: `q-${uuidv4().substring(0, 8)}`,
        questionType: 'MSQ',
        questionText: 'Which practices are recommended when writing production Python code? (Select all that apply)',
        options: [
          'Using descriptive, meaningful variable and function names',
          'Writing comprehensive docstrings and type annotations',
          'Hardcoding API secrets and database passwords directly in source files',
          'Structuring modular functions with single responsibility'
        ],
        correctAnswer: JSON.stringify([
          'Using descriptive, meaningful variable and function names',
          'Writing comprehensive docstrings and type annotations',
          'Structuring modular functions with single responsibility'
        ]),
        marks: 3,
        skillId: primarySkill.id,
        difficulty: 'medium',
        explanation: 'Production standards mandate clean naming, documentation, single-responsibility functions, and externalized configuration.'
      }
    ];
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return {
    testTitle: `${lessonTitle} — AI Knowledge Assessment`,
    lessonId,
    difficulty,
    durationMinutes: 15,
    passingPercentage: 60,
    questions
  };
}
