import { gemini } from './gemini.client.js';

export interface ShortAnswerEvaluationResult {
  score: number;
  maximumScore: number;
  correctness: 'correct' | 'partially_correct' | 'incorrect';
  feedback: string;
  missingConcepts: string[];
  suggestedImprovement: string;
}

/**
 * Evaluates a student's short answer response using Gemini 1.5 Flash
 * with a deterministic, rule-based fallback when offline or unavailable.
 */
export async function evaluateShortAnswerWithAI(params: {
  questionText: string;
  expectedAnswer: string;
  studentAnswer: string;
  maximumScore: number;
  skillName?: string;
  keyConcepts?: string[];
}): Promise<ShortAnswerEvaluationResult> {
  const { questionText, expectedAnswer, studentAnswer, maximumScore, skillName, keyConcepts = [] } = params;

  // Edge case: Empty or trivially short answer
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return {
      score: 0,
      maximumScore,
      correctness: 'incorrect',
      feedback: 'No answer was provided.',
      missingConcepts: keyConcepts.length > 0 ? keyConcepts : ['All core concepts missing'],
      suggestedImprovement: `Review the lesson material to understand: ${expectedAnswer.slice(0, 100)}...`
    };
  }

  const cleanStudent = studentAnswer.trim();

  // Try Gemini AI evaluation if available
  try {
    const prompt = `You are an expert technical educator evaluating a student's short answer in an assessment on ${skillName || 'Computer Science'}.

Question: "${questionText}"
Expected Model Solution: "${expectedAnswer}"
Key Concepts Tested: ${JSON.stringify(keyConcepts)}
Student's Answer: "${cleanStudent}"
Maximum Score: ${maximumScore}

Evaluate the student's answer fairly and rigorously.
Consider:
1. Conceptual correctness and technical accuracy
2. Presence of key concepts/keywords
3. Completeness of explanation

Return ONLY valid JSON matching this exact structure:
{
  "score": <number between 0 and ${maximumScore}>,
  "maximumScore": ${maximumScore},
  "correctness": <"correct" | "partially_correct" | "incorrect">,
  "feedback": "<concise 1-2 sentence constructive explanation of what was right/wrong>",
  "missingConcepts": ["<concept1>", "<concept2>"],
  "suggestedImprovement": "<actionable 1 sentence advice>"
}`;

    const parsed = await gemini.generateJSON<any>(prompt);
    if (parsed) {
      const validatedScore = Math.max(0, Math.min(maximumScore, Number(parsed.score) || 0));
        let correctness: 'correct' | 'partially_correct' | 'incorrect' = 'incorrect';
        if (validatedScore >= maximumScore * 0.8) {
          correctness = 'correct';
        } else if (validatedScore > 0) {
          correctness = 'partially_correct';
        }

      return {
        score: Math.round(validatedScore * 10) / 10,
        maximumScore,
        correctness,
        feedback: String(parsed.feedback || 'Answer evaluated.').trim(),
        missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts : [],
        suggestedImprovement: String(parsed.suggestedImprovement || 'Review lesson key points.').trim()
      };
    }
  } catch (err) {
    console.warn('[AI Evaluator] Gemini evaluation failed, falling back to deterministic evaluator:', err);
  }

  // Deterministic rule-based evaluation fallback
  return evaluateShortAnswerDeterministically(cleanStudent, expectedAnswer, maximumScore, keyConcepts);
}

/**
 * Deterministic semantic keyword & concept matcher fallback
 */
function evaluateShortAnswerDeterministically(
  studentAnswer: string,
  expectedAnswer: string,
  maximumScore: number,
  keyConcepts: string[]
): ShortAnswerEvaluationResult {
  const studentLower = studentAnswer.toLowerCase();
  const expectedLower = expectedAnswer.toLowerCase();

  // Extract meaningful words from expected answer
  const stopWords = new Set(['the', 'and', 'with', 'that', 'this', 'from', 'have', 'for', 'are', 'which', 'what', 'into']);
  const expectedTokens = expectedLower
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 3 && !stopWords.has(t));

  const matchedTokens = expectedTokens.filter(token => studentLower.includes(token));
  const tokenMatchRatio = expectedTokens.length > 0 ? matchedTokens.length / expectedTokens.length : 0;

  // Check key concepts
  const missing: string[] = [];
  let conceptMatchCount = 0;
  for (const concept of keyConcepts) {
    if (studentLower.includes(concept.toLowerCase())) {
      conceptMatchCount++;
    } else {
      missing.push(concept);
    }
  }

  const conceptRatio = keyConcepts.length > 0 ? conceptMatchCount / keyConcepts.length : tokenMatchRatio;
  const overallRatio = Math.max(tokenMatchRatio, conceptRatio);

  let rawScore = 0;
  let correctness: 'correct' | 'partially_correct' | 'incorrect' = 'incorrect';
  let feedback = '';
  let suggested = '';

  if (overallRatio >= 0.7 || studentLower === expectedLower) {
    rawScore = maximumScore;
    correctness = 'correct';
    feedback = 'Excellent answer! You captured the essential concepts accurately and clearly.';
    suggested = 'Keep applying these core principles in hands-on coding.';
  } else if (overallRatio >= 0.35 || cleanWordOverlap(studentLower, expectedLower) >= 0.4) {
    rawScore = Math.max(1, Math.round(maximumScore * 0.6 * 10) / 10);
    correctness = 'partially_correct';
    feedback = 'Good start. You understand the foundational idea, but missed some key technical details.';
    suggested = `Ensure you clearly mention: ${missing.slice(0, 2).join(', ') || 'the mechanism and terminology'}.`;
  } else {
    rawScore = 0;
    correctness = 'incorrect';
    feedback = 'The response does not sufficiently address the question or missing crucial principles.';
    suggested = 'Revisit the lesson definitions and key takeaways before re-attempting.';
  }

  return {
    score: Math.min(maximumScore, Math.max(0, rawScore)),
    maximumScore,
    correctness,
    feedback,
    missingConcepts: missing.length > 0 ? missing : (overallRatio < 0.7 ? ['Detailed explanation', 'Key terminology'] : []),
    suggestedImprovement: suggested
  };
}

function cleanWordOverlap(strA: string, strB: string): number {
  const setA = new Set(strA.split(/\s+/).filter(w => w.length > 3));
  const setB = new Set(strB.split(/\s+/).filter(w => w.length > 3));
  if (setB.size === 0) return 0;
  let matches = 0;
  for (const w of setA) {
    if (setB.has(w)) matches++;
  }
  return matches / setB.size;
}
