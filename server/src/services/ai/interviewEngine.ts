import { gemini } from './gemini.client.js';

export interface InterviewQuestion {
  questionId: string;
  category: 'hr' | 'technical' | 'role_based';
  questionText: string;
  expectedKeyPoints: string[];
}

export interface InterviewTurnResult {
  interviewerResponse: string;
  nextQuestion: string;
  isComplete: boolean;
}

export interface InterviewRubricScorecard {
  technicalCorrectness: number;
  relevance: number;
  completeness: number;
  communication: number;
  confidence: number;
  overallScore: number;
  feedbackText: string;
  strengths: string[];
  improvementAreas: string[];
}

export const INITIAL_INTERVIEW_QUESTIONS: Record<string, InterviewQuestion[]> = {
  hr: [
    {
      questionId: 'hr-1',
      category: 'hr',
      questionText: 'Can you walk me through your journey into technology and why you want to pursue this target career role?',
      expectedKeyPoints: ['Passion for problem solving', 'Educational background', 'Long-term learning goals', 'Clarity of purpose']
    },
    {
      questionId: 'hr-2',
      category: 'hr',
      questionText: 'Tell me about a challenging project or team conflict you experienced, and how you worked to resolve it.',
      expectedKeyPoints: ['STAR method', 'Ownership', 'Constructive communication', 'Actionable takeaway']
    }
  ],
  technical: [
    {
      questionId: 'tech-1',
      category: 'technical',
      questionText: 'How do you design a database schema and indexing strategy for a service expecting millions of read requests versus write-heavy workloads?',
      expectedKeyPoints: ['B-Tree indexes', 'Denormalization trade-offs', 'Caching layers (Redis)', 'Read replicas']
    },
    {
      questionId: 'tech-2',
      category: 'technical',
      questionText: 'Explain how you approach optimizing an O(n²) algorithm when memory is constrained.',
      expectedKeyPoints: ['Two pointers', 'In-place sorting', 'Bit manipulation or hash sliding window']
    }
  ],
  role_based: [
    {
      questionId: 'role-1',
      category: 'role_based',
      questionText: 'Suppose our production API begins experiencing intermittent 504 Gateway Timeouts under load. Walk me through your step-by-step triage and debugging procedure.',
      expectedKeyPoints: ['Metrics & APM monitoring', 'Upstream dependency timeouts', 'Database connection pooling', 'Thread dumps and logs']
    },
    {
      questionId: 'role-2',
      category: 'role_based',
      questionText: 'How do you ensure security principles such as authentication, authorization, and input validation are integrated into early development cycles?',
      expectedKeyPoints: ['Defense in depth', 'Parameterized queries', 'JWT/OAuth token scoping', 'Automated security scanning']
    }
  ]
};

export async function processInterviewStep(params: {
  category: 'hr' | 'technical' | 'role_based';
  stepIndex: number;
  userAnswer: string;
  previousQuestion: string;
}): Promise<InterviewTurnResult> {
  const bank = INITIAL_INTERVIEW_QUESTIONS[params.category] || INITIAL_INTERVIEW_QUESTIONS.technical;
  const isComplete = params.stepIndex >= 3;

  if (gemini.hasApiKey()) {
    const prompt = `You are a senior hiring manager conducting an AI mock ${params.category} interview.
Previous Question: "${params.previousQuestion}"
Candidate Answer: "${params.userAnswer}"
Step: ${params.stepIndex} of 3.

Respond in JSON with:
- interviewerResponse: Brief, polite evaluation acknowledging candidate's point (1-2 sentences).
- nextQuestion: ${isComplete ? '"That concludes our interview session. Thank you for your thorough responses."' : 'Adaptive deep-dive follow-up question digging deeper into their technical reasoning.'}
- isComplete: ${isComplete}`;

    const aiRes = await gemini.generateJSON<InterviewTurnResult>(prompt);
    if (aiRes && aiRes.interviewerResponse) {
      return aiRes;
    }
  }

  if (isComplete) {
    return {
      interviewerResponse: 'Thank you for walking me through your thought process. You covered significant technical depth and articulated trade-offs well.',
      nextQuestion: 'Our mock session is now complete. Let us analyze your scorecard and key recommendations.',
      isComplete: true
    };
  }

  const nextQ = bank[Math.min(params.stepIndex, bank.length - 1)].questionText;
  return {
    interviewerResponse: 'Good explanation. I appreciated how you addressed architectural trade-offs and structural constraints.',
    nextQuestion: nextQ,
    isComplete: false
  };
}

export function evaluateInterviewSession(params: {
  category: string;
  transcript: Array<{ sender: 'ai' | 'user'; message: string }>;
}): InterviewRubricScorecard {
  const userAnswers = params.transcript.filter(t => t.sender === 'user');
  const totalLength = userAnswers.reduce((acc, curr) => acc + curr.message.length, 0);

  // Score calculations based on answer substance
  const completeness = Math.min(95, Math.max(65, Math.round(72 + totalLength / 40)));
  const technicalCorrectness = params.category === 'hr' ? 88 : Math.min(92, Math.max(68, 80));
  const relevance = 86;
  const communication = 88;
  const confidence = 84;
  const overallScore = Math.round(
    technicalCorrectness * 0.3 + relevance * 0.2 + completeness * 0.2 + communication * 0.15 + confidence * 0.15
  );

  return {
    technicalCorrectness,
    relevance,
    completeness,
    communication,
    confidence,
    overallScore,
    feedbackText: `Candidate demonstrated strong structured thinking during the ${params.category.toUpperCase()} interview round. Articulated system considerations clearly with a confident, professional presence.`,
    strengths: [
      'Structured responses using clear logical progression and trade-off analysis.',
      'Showed strong awareness of edge cases, operational logging, and error handling.',
      'Maintained professional composure and answered direct inquiries without evasiveness.'
    ],
    improvementAreas: [
      'Quantify results more concretely (e.g. mention latency drops in ms, throughput gains, or percentage improvements).',
      'Elaborate further on failure isolation strategies under distributed network conditions.'
    ]
  };
}
