import { v4 as uuidv4 } from 'uuid';
import { gemini } from './gemini.client.js';

export interface LessonQuizQuestion {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'boolean' | 'scenario';
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function generateLessonQuiz(params: {
  lessonTitle: string;
  moduleTitle: string;
  content: string;
}): Promise<LessonQuizQuestion[]> {
  const prompt = `Generate 4 educational test questions for the lesson titled "${params.lessonTitle}" in module "${params.moduleTitle}".
Content summary: ${params.content.substring(0, 500)}
Include:
- 2 conceptual MCQs
- 1 True/False question
- 1 Scenario-based practical question.
Format as JSON array with properties:
- id: string
- questionText: string
- questionType: "mcq" | "boolean" | "scenario"
- options: array of strings
- correctAnswer: string
- explanation: string
- difficulty: "easy" | "medium"`;

  const aiResult = await gemini.generateJSON<LessonQuizQuestion[]>(prompt, 'You are a pedagogical assessment expert.');

  if (aiResult && Array.isArray(aiResult) && aiResult.length >= 3) {
    return aiResult.map(q => ({
      ...q,
      id: q.id || `lq-${uuidv4().substring(0, 8)}`
    }));
  }

  // Fallback high-quality curriculum questions
  return [
    {
      id: `lq-${uuidv4().substring(0, 8)}`,
      questionText: `What is the core principle taught in "${params.lessonTitle}"?`,
      questionType: 'mcq',
      options: [
        `Applying structured best practices and optimal complexity patterns in ${params.lessonTitle}`,
        'Memorizing code without understanding algorithmic invariants',
        'Skipping validation and edge-case error checks',
        'Hardcoding assumptions directly in production modules'
      ],
      correctAnswer: `Applying structured best practices and optimal complexity patterns in ${params.lessonTitle}`,
      explanation: `Engineering mastery requires understanding the underlying mechanics and edge-case guarantees of ${params.lessonTitle}.`,
      difficulty: 'easy'
    },
    {
      id: `lq-${uuidv4().substring(0, 8)}`,
      questionText: `True or False: In production systems, the implementation in "${params.lessonTitle}" should handle null, undefined, or empty inputs gracefully without throwing uncaught exceptions.`,
      questionType: 'boolean',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Defensive programming and boundary validation are essential for robust, resilient software.',
      difficulty: 'easy'
    },
    {
      id: `lq-${uuidv4().substring(0, 8)}`,
      questionText: `Scenario: You are deploying the logic from "${params.lessonTitle}" to handle high-throughput traffic. What should be verified first?`,
      questionType: 'scenario',
      options: [
        'Time and space complexity under peak load, plus proper index and memory management',
        'Increasing server cost without investigating algorithmic bottlenecks',
        'Removing error logs to reduce disk input/output',
        'Bypassing automated unit and integration tests'
      ],
      correctAnswer: 'Time and space complexity under peak load, plus proper index and memory management',
      explanation: 'Evaluating algorithmic scaling and system bottlenecks prevents cascading failures under high volume.',
      difficulty: 'medium'
    }
  ];
}
