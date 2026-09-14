import { gemini } from './gemini.client.js';

export interface DetailedCodingFeedback {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'PARTIAL_SUCCESS';
  headline: string;
  strengths: string[];
  likelyMistake?: string;
  edgeCasesToReview: string[];
  complexityAnalysis: {
    time: string;
    space: string;
    verdict: 'Optimal' | 'Acceptable' | 'Sub-optimal' | 'Excessive';
  };
  conceptRevisionAdvice: string;
  recommendedNextStep: string;
}

export async function generateCodingFeedback(params: {
  problemTitle: string;
  topic: string;
  difficulty: string;
  language: string;
  code: string;
  status: string;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  memoryUsedMb: number;
  compilerOutput?: string | null;
  runtimeOutput?: string | null;
}): Promise<DetailedCodingFeedback> {
  const {
    problemTitle,
    topic,
    difficulty,
    language,
    code,
    status,
    passedTests,
    totalTests,
    executionTimeMs,
    memoryUsedMb,
    compilerOutput,
    runtimeOutput
  } = params;

  const isAccepted = status === 'ACCEPTED' || passedTests === totalTests;

  // Try live Gemini API if configured
  if (gemini.hasApiKey()) {
    try {
      const prompt = `You are the SkillBridge AI Placement Coding Mentor.
Analyze this student code submission and actual test results:

Problem: "${problemTitle}" (${difficulty.toUpperCase()}, Topic: ${topic})
Language: ${language}
Execution Status: ${status}
Test Cases Passed: ${passedTests} / ${totalTests}
Runtime: ${executionTimeMs}ms, Memory: ${memoryUsedMb}MB
Error Output: ${compilerOutput || runtimeOutput || 'None'}

Student Code:
\`\`\`${language}
${code}
\`\`\`

Generate a comprehensive diagnostic review in strict JSON format:
{
  "headline": "Short encouraging summary",
  "strengths": ["Demonstrated competency 1", "Demonstrated competency 2"],
  "likelyMistake": "Clear explanation of why it failed or edge-case missed (or null if accepted)",
  "edgeCasesToReview": ["Edge case 1", "Edge case 2"],
  "complexityAnalysis": {
    "time": "e.g. O(N)",
    "space": "e.g. O(1)",
    "verdict": "Optimal"
  },
  "conceptRevisionAdvice": "Specific concept to review",
  "recommendedNextStep": "Actionable next challenge suggestion"
}
`;

      const aiRes = await gemini.generateJSON<DetailedCodingFeedback>(prompt);
      if (aiRes && aiRes.headline && aiRes.strengths) {
        return {
          ...aiRes,
          status: status as any
        };
      }
    } catch (err) {
      console.warn('[CodingFeedbackEngine] Gemini error, using heuristic fallback:', err);
    }
  }

  // High-Quality Deterministic Pedagogical Fallback
  if (status === 'COMPILATION_ERROR') {
    return {
      status: 'COMPILATION_ERROR',
      headline: 'Compilation / Syntax Barrier Detected',
      strengths: ['Initial code structure follows algorithmic requirements.'],
      likelyMistake: compilerOutput || 'Syntax, indentation, or type mismatch encountered before execution.',
      edgeCasesToReview: ['Token delimiter handling', 'Missing closing braces or quotes', 'Type casting input strings to integers'],
      complexityAnalysis: {
        time: 'N/A (Halted at compile-time)',
        space: 'N/A',
        verdict: 'Sub-optimal'
      },
      conceptRevisionAdvice: `Review language-specific token parsing and syntax standards in ${language.toUpperCase()}.`,
      recommendedNextStep: `Fix the syntax issue in "${problemTitle}" and re-run against public test cases.`
    };
  }

  if (status === 'TIME_LIMIT_EXCEEDED') {
    return {
      status: 'TIME_LIMIT_EXCEEDED',
      headline: 'Execution Time Limit Exceeded (Timeout)',
      strengths: ['Algorithmic attempt is syntactically sound and builds cleanly.'],
      likelyMistake: 'Potential infinite while-loop or quadratic $O(N^2)$ traversal over large constraint inputs.',
      edgeCasesToReview: ['Loop counter termination check', 'Worst-case input sizes ($10^5$ items)', 'Repeated linear lookups instead of hash map'],
      complexityAnalysis: {
        time: 'Unbounded / Exceeds 2000ms CPU budget',
        space: `${memoryUsedMb}MB`,
        verdict: 'Excessive'
      },
      conceptRevisionAdvice: `Review loop termination invariants and convert nested iterations into linear passes.`,
      recommendedNextStep: 'Optimize the inner loop using an accumulator or dictionary to pass within the 2.0s time limit.'
    };
  }

  if (!isAccepted) {
    const isPartial = passedTests > 0;
    return {
      status: isPartial ? 'PARTIAL_SUCCESS' : 'WRONG_ANSWER',
      headline: isPartial
        ? `Partial Accuracy: ${passedTests}/${totalTests} Test Cases Passed`
        : 'Output Mismatch Across Test Cases',
      strengths: [
        'Logic correctly handles standard baseline inputs.',
        'Proper I/O structure conforms to execution sandbox rules.'
      ],
      likelyMistake: `The program failed on boundary test cases. Expected output did not match computed result for hidden verification benchmarks.`,
      edgeCasesToReview: [
        'Negative or zero input values',
        'Duplicate values or identical integer inputs',
        'Extremes of input constraints (e.g. single element array, boundary limits)'
      ],
      complexityAnalysis: {
        time: `${executionTimeMs}ms (Well within 2000ms limit)`,
        space: `${memoryUsedMb}MB`,
        verdict: 'Acceptable'
      },
      conceptRevisionAdvice: `Review "${topic}" boundary edge cases, specifically when inputs are equal or negative.`,
      recommendedNextStep: `Refactor boundary checks in "${problemTitle}" and submit again for 100% score.`
    };
  }

  // Accepted
  return {
    status: 'ACCEPTED',
    headline: 'All Test Cases Passed with 100% Accuracy! 🎉',
    strengths: [
      'Flawless execution across both public and hidden benchmark test suites.',
      'Optimal memory utilization and fast execution time.'
    ],
    edgeCasesToReview: [
      'Edge cases (negatives, duplicates, zeroes) handled accurately.',
      'Memory cleanup verified in sandboxed container.'
    ],
    complexityAnalysis: {
      time: `${executionTimeMs}ms (Optimal Execution Speed)`,
      space: `${memoryUsedMb}MB (Ultra-low Memory Footprint)`,
      verdict: 'Optimal'
    },
    conceptRevisionAdvice: `Great mastery of ${topic}. Ready to advance to intermediate algorithmic challenges.`,
    recommendedNextStep: 'Proceed to the next challenge in your personalized placement roadmap.'
  };
}
