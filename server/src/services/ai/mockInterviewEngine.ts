/**
 * Step 13: AI Mock Interview Engine
 * Provides safe question synthesis, multi-turn conversational follow-ups,
 * and transparent 0-100 rubric-based answer evaluations.
 */

import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne } from '../../db/database.js';

export interface QuestionSpec {
  id: string;
  text: string;
  type: string;
  category: string;
  difficulty: string;
  role: string;
  sampleKeyPoints: string[];
}

export interface AnswerEvaluationResult {
  score: number;
  technicalScore: number;
  communicationScore: number;
  hrScore: number;
  problemSolvingScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missingPoints: string[];
  suggestedStructure: string;
  improvementAdvice: string;
  shouldGenerateFollowUp: boolean;
  followUpQuestionText?: string;
  followUpQuestionType?: string;
}

// Curated question bank covering all supported roles and types
const QUESTION_BANK: QuestionSpec[] = [
  // --- PYTHON DEVELOPER ---
  {
    id: 'py-1',
    text: 'Explain how Python manages memory, specifically focusing on reference counting and garbage collection cycles.',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'Python Developer',
    sampleKeyPoints: ['reference counting', 'ob_refcnt', 'cyclic garbage collector', 'generations', 'deallocation']
  },
  {
    id: 'py-2',
    text: 'What is the Global Interpreter Lock (GIL) in CPython, and how does it affect multithreading in CPU-bound vs I/O-bound applications?',
    type: 'TECHNICAL',
    category: 'Coding concepts',
    difficulty: 'ADVANCED',
    role: 'Python Developer',
    sampleKeyPoints: ['mutex', 'CPython bytecode', 'CPU-bound concurrency', 'multiprocessing', 'I/O releases GIL']
  },
  {
    id: 'py-3',
    text: 'How do Python decorators work internally, and how would you implement a parameterized timing decorator?',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'BEGINNER',
    role: 'Python Developer',
    sampleKeyPoints: ['first-class functions', 'closures', 'functools.wraps', 'wrapper function', 'arguments forwarding']
  },
  {
    id: 'py-4',
    text: 'How do generators and the yield keyword differ from regular functions in terms of memory efficiency and execution state?',
    type: 'TECHNICAL',
    category: 'Coding concepts',
    difficulty: 'INTERMEDIATE',
    role: 'Python Developer',
    sampleKeyPoints: ['lazy evaluation', 'generator iterator', 'yield statement', 'stack frame suspension', 'memory footprint']
  },

  // --- JAVA DEVELOPER ---
  {
    id: 'java-1',
    text: 'Explain the difference between HashMap and ConcurrentHashMap in Java. How does ConcurrentHashMap achieve thread safety without locking the entire table?',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'Java Developer',
    sampleKeyPoints: ['synchronized', 'segment locking', 'CAS operations', 'Node treeification', 'concurrency level']
  },
  {
    id: 'java-2',
    text: 'How does the Java Garbage Collector manage the Heap memory, and what are the differences between Young Generation and Old Generation?',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'ADVANCED',
    role: 'Java Developer',
    sampleKeyPoints: ['Eden space', 'Survivor spaces', 'Tenured space', 'Minor GC vs Major GC', 'G1 GC / ZGC']
  },
  {
    id: 'java-3',
    text: 'What is Dependency Injection in Spring Boot, and what are the key differences between Constructor Injection and Field Injection?',
    type: 'TECHNICAL',
    category: 'Coding concepts',
    difficulty: 'BEGINNER',
    role: 'Java Developer',
    sampleKeyPoints: ['IoC container', 'immutability', 'testability', '@Autowired', 'null safety']
  },

  // --- WEB DEVELOPER ---
  {
    id: 'web-1',
    text: 'Explain the Critical Rendering Path in modern web browsers and how you would optimize First Contentful Paint (FCP).',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'Web Developer',
    sampleKeyPoints: ['DOM tree', 'CSSOM tree', 'render tree', 'reflow and repaint', 'critical CSS / defer scripts']
  },
  {
    id: 'web-2',
    text: 'How does the JavaScript Event Loop handle microtasks vs macrotasks when processing asynchronous operations?',
    type: 'TECHNICAL',
    category: 'Coding concepts',
    difficulty: 'ADVANCED',
    role: 'Web Developer',
    sampleKeyPoints: ['call stack', 'callback queue', 'microtask queue', 'Promises', 'setTimeout / event loop tick']
  },
  {
    id: 'web-3',
    text: 'What are the main security vulnerabilities addressed by CORS, and how does a browser preflight request work?',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'BEGINNER',
    role: 'Web Developer',
    sampleKeyPoints: ['Same-Origin Policy', 'Access-Control-Allow-Origin', 'OPTIONS request', 'headers', 'credentials']
  },

  // --- DATA ANALYST / DATA SCIENTIST ---
  {
    id: 'data-1',
    text: 'How do you identify and handle missing values and outliers in a large tabular dataset before running statistical analysis?',
    type: 'ROLE_SPECIFIC',
    category: 'Problem solving',
    difficulty: 'BEGINNER',
    role: 'Data Analyst',
    sampleKeyPoints: ['imputation techniques', 'mean/median/mode', 'IQR method', 'Z-score', 'domain business rules']
  },
  {
    id: 'data-2',
    text: 'Explain the bias-variance tradeoff in predictive modeling and what strategies you employ to mitigate overfitting.',
    type: 'ROLE_SPECIFIC',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'Data Scientist',
    sampleKeyPoints: ['underfitting vs overfitting', 'regularization (L1/L2)', 'cross-validation', 'ensemble methods', 'model complexity']
  },
  {
    id: 'data-3',
    text: 'How would you design an A/B test for a new feature, ensuring statistical significance and guarding against false positives?',
    type: 'ROLE_SPECIFIC',
    category: 'Problem solving',
    difficulty: 'ADVANCED',
    role: 'Data Analyst',
    sampleKeyPoints: ['hypothesis formulation', 'sample size determination', 'p-value & alpha level', 'p-hacking prevention', 'confidence interval']
  },

  // --- AI / ML ENGINEER ---
  {
    id: 'ai-1',
    text: 'Explain the vanishing gradient problem in deep neural networks and how modern architectures like ResNet address it.',
    type: 'ROLE_SPECIFIC',
    category: 'Technical knowledge',
    difficulty: 'ADVANCED',
    role: 'AI/ML Engineer',
    sampleKeyPoints: ['backpropagation chain rule', 'activation functions', 'ReLU', 'residual skip connections', 'gradient flow']
  },
  {
    id: 'ai-2',
    text: 'How does self-attention in the Transformer architecture calculate token interactions, and why does it scale quadratically with sequence length?',
    type: 'ROLE_SPECIFIC',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'AI/ML Engineer',
    sampleKeyPoints: ['Query, Key, Value matrices', 'scaled dot-product', 'softmax', 'sequence length N^2', 'parallelization']
  },

  // --- SOFTWARE ENGINEER & CLOUD ENGINEER ---
  {
    id: 'se-1',
    text: 'How would you design a rate limiter for a high-traffic public REST API? What algorithms and storage would you choose?',
    type: 'TECHNICAL',
    category: 'Problem solving',
    difficulty: 'ADVANCED',
    role: 'Software Engineer',
    sampleKeyPoints: ['Token Bucket', 'Leaky Bucket', 'Sliding Window Counter', 'Redis memory store', 'HTTP 429 Too Many Requests']
  },
  {
    id: 'cloud-1',
    text: 'What are the key differences between containerization with Docker and traditional Virtual Machines? How do containers share kernel resources?',
    type: 'TECHNICAL',
    category: 'Technical knowledge',
    difficulty: 'INTERMEDIATE',
    role: 'Cloud Engineer',
    sampleKeyPoints: ['cgroups', 'namespaces', 'host OS kernel', 'hypervisor overhead', 'image layering']
  },
  {
    id: 'cloud-2',
    text: 'How do you design an auto-scaling, fault-tolerant architecture across multiple availability zones for a stateful web service?',
    type: 'TECHNICAL',
    category: 'Problem solving',
    difficulty: 'ADVANCED',
    role: 'Cloud Engineer',
    sampleKeyPoints: ['Load Balancer', 'Health checks', 'stateless compute layer', 'managed database read replicas', 'multi-AZ replication']
  },

  // --- BEHAVIORAL & HR QUESTIONS ---
  {
    id: 'hr-1',
    text: 'Tell me about yourself, your technical background, and what motivated you to pursue a career in software development.',
    type: 'HR',
    category: 'HR questions',
    difficulty: 'BEGINNER',
    role: 'General Placement',
    sampleKeyPoints: ['academic foundation', 'key projects', 'problem-solving passion', 'career goals', 'concise delivery']
  },
  {
    id: 'hr-2',
    text: 'Describe a situation where you had a disagreement with a team member or peer regarding a technical design. How did you resolve it?',
    type: 'BEHAVIORAL',
    category: 'Behavioral questions',
    difficulty: 'INTERMEDIATE',
    role: 'General Placement',
    sampleKeyPoints: ['Situation', 'Task', 'Action with active listening', 'data-driven decision', 'Result & mutual respect']
  },
  {
    id: 'hr-3',
    text: 'Tell me about a project that failed or did not meet expectations. What went wrong, and what key lessons did you take away?',
    type: 'BEHAVIORAL',
    category: 'Behavioral questions',
    difficulty: 'INTERMEDIATE',
    role: 'General Placement',
    sampleKeyPoints: ['accountability', 'root cause analysis', 'learning mindset', 'process improvement', 'resilience']
  },
  {
    id: 'hr-4',
    text: 'Where do you see your technical and professional development progressing over the next 3 to 5 years?',
    type: 'HR',
    category: 'HR questions',
    difficulty: 'BEGINNER',
    role: 'General Placement',
    sampleKeyPoints: ['mastering core stack', 'mentorship/leadership growth', 'system architecture', 'continuous learning']
  },

  // --- COMMUNICATION & SITUATIONAL ---
  {
    id: 'comm-1',
    text: 'How would you explain a complex technical concept—such as an API or Database Index—to a non-technical business stakeholder?',
    type: 'COMMUNICATION',
    category: 'Communication',
    difficulty: 'BEGINNER',
    role: 'General Placement',
    sampleKeyPoints: ['real-world analogy', 'plain language without jargon', 'focus on business value', 'active checking for comprehension']
  },
  {
    id: 'comm-2',
    text: 'If a production issue occurs right before a major product demo, how would you communicate the status to leadership and organize your team?',
    type: 'COMMUNICATION',
    category: 'Situational questions',
    difficulty: 'INTERMEDIATE',
    role: 'General Placement',
    sampleKeyPoints: ['transparent triage', 'calm and urgent communication', 'workaround vs fix', 'regular ETA updates', 'post-mortem']
  }
];

/**
 * Generate questions tailored to interview setup and student profile
 */
export function generateInterviewQuestions(
  studentId: string,
  targetRole: string,
  interviewType: string,
  difficulty: string,
  questionCount: number = 5
): Array<{ questionId: string; questionText: string; questionType: string; sequenceNumber: number }> {
  // 1. Filter bank by role, type, and difficulty
  let pool = QUESTION_BANK.filter(q => {
    // Type match
    if (interviewType !== 'MIXED') {
      if (interviewType === 'TECHNICAL' && q.type !== 'TECHNICAL' && q.type !== 'ROLE_SPECIFIC') return false;
      if (interviewType === 'HR' && q.type !== 'HR') return false;
      if (interviewType === 'BEHAVIORAL' && q.type !== 'BEHAVIORAL') return false;
      if (interviewType === 'COMMUNICATION' && q.type !== 'COMMUNICATION') return false;
      if (interviewType === 'ROLE_SPECIFIC' && q.type !== 'ROLE_SPECIFIC' && q.role !== targetRole) return false;
    }
    return true;
  });

  // Prefer matching targetRole or general placement
  const roleMatched = pool.filter(q => q.role === targetRole || q.role === 'General Placement');
  if (roleMatched.length >= 3) {
    pool = roleMatched;
  }

  // Shuffle pool
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  // If still fewer than requested, backfill with general technical / HR questions
  if (selected.length < questionCount) {
    const fallbackPool = QUESTION_BANK.filter(q => !selected.some(s => s.id === q.id));
    for (const fb of fallbackPool) {
      if (selected.length >= questionCount) break;
      selected.push(fb);
    }
  }

  return selected.map((q, idx) => ({
    questionId: q.id,
    questionText: q.text,
    questionType: q.type,
    sequenceNumber: idx + 1
  }));
}

/**
 * Evaluate student answer against rubric (scores 0 - 100)
 */
export function evaluateInterviewAnswer(
  questionText: string,
  questionType: string,
  answerText: string,
  followUpCount: number = 0
): AnswerEvaluationResult {
  const trimmed = (answerText || '').trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Edge case: Empty or minimal answer
  if (!trimmed || wordCount < 5) {
    return {
      score: 15,
      technicalScore: 15,
      communicationScore: 20,
      hrScore: 15,
      problemSolvingScore: 10,
      feedback: 'Answer is too brief or incomplete to demonstrate comprehensive understanding.',
      strengths: ['Attempted the question'],
      weaknesses: ['Lacks depth and explanation', 'Missing core conceptual definitions', 'No supporting technical details'],
      missingPoints: ['Definition of fundamental concepts', 'Real-world practical examples', 'System trade-offs'],
      suggestedStructure: 'Direct Definition -> Key Architecture/Components -> Practical Example -> Trade-offs',
      improvementAdvice: 'Elaborate your thoughts by defining the concept first, then outlining how it operates under realistic production scenarios.',
      shouldGenerateFollowUp: followUpCount < 2,
      followUpQuestionText: `Could you elaborate with a concrete example on how ${questionText.slice(0, 40)}... would apply in practice?`,
      followUpQuestionType: questionType
    };
  }

  // Match question against bank key points
  const matchedQuestion = QUESTION_BANK.find(q => questionText.includes(q.text.slice(0, 30)));
  const keyPoints = matchedQuestion ? matchedQuestion.sampleKeyPoints : ['concept definition', 'practical application', 'trade-offs'];

  let matchedKeyPointsCount = 0;
  const lowerAnswer = trimmed.toLowerCase();
  for (const kp of keyPoints) {
    if (lowerAnswer.includes(kp.toLowerCase()) || lowerAnswer.includes(kp.split(' ')[0].toLowerCase())) {
      matchedKeyPointsCount++;
    }
  }

  const keywordCoverageRatio = matchedKeyPointsCount / Math.max(1, keyPoints.length);

  // Rubric weights based on interview type
  let techBase = 60;
  let commBase = 65;
  let hrBase = 60;
  let probBase = 60;

  // Length and structure bonus
  if (wordCount > 60) {
    techBase += 10;
    commBase += 10;
    probBase += 10;
  }
  if (wordCount > 120) {
    techBase += 5;
    commBase += 5;
  }

  // Keyword depth bonus
  techBase += Math.round(keywordCoverageRatio * 20);
  probBase += Math.round(keywordCoverageRatio * 15);

  // Type specific rubric tuning
  if (questionType === 'HR' || questionType === 'BEHAVIORAL') {
    hrBase = Math.min(100, hrBase + 20 + Math.round(keywordCoverageRatio * 15));
    if (lowerAnswer.includes('result') || lowerAnswer.includes('learned') || lowerAnswer.includes('situation')) {
      hrBase = Math.min(100, hrBase + 10);
      commBase = Math.min(100, commBase + 8);
    }
  } else if (questionType === 'COMMUNICATION') {
    commBase = Math.min(100, commBase + 20);
  } else {
    // Technical & Problem Solving
    techBase = Math.min(100, techBase + 5);
  }

  // Compute clamped scores (0–100)
  const technicalScore = Math.max(0, Math.min(100, techBase));
  const communicationScore = Math.max(0, Math.min(100, commBase));
  const hrScore = Math.max(0, Math.min(100, hrBase));
  const problemSolvingScore = Math.max(0, Math.min(100, probBase));

  let overallScore = 0;
  if (questionType === 'TECHNICAL' || questionType === 'CODING_CONCEPTS') {
    overallScore = Math.round(technicalScore * 0.45 + problemSolvingScore * 0.25 + communicationScore * 0.20 + hrScore * 0.10);
  } else if (questionType === 'HR' || questionType === 'BEHAVIORAL') {
    overallScore = Math.round(hrScore * 0.45 + communicationScore * 0.30 + problemSolvingScore * 0.15 + technicalScore * 0.10);
  } else if (questionType === 'COMMUNICATION') {
    overallScore = Math.round(communicationScore * 0.50 + hrScore * 0.25 + problemSolvingScore * 0.15 + technicalScore * 0.10);
  } else {
    overallScore = Math.round((technicalScore + communicationScore + hrScore + problemSolvingScore) / 4);
  }
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Determine strengths, weaknesses, and missing points
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingPoints: string[] = [];

  if (keywordCoverageRatio > 0.4) {
    strengths.push('Demonstrated strong command of core domain terminology');
  }
  if (wordCount >= 50) {
    strengths.push('Good descriptive explanation with contextual detail');
  }
  if (lowerAnswer.includes('example') || lowerAnswer.includes('such as') || lowerAnswer.includes('for instance')) {
    strengths.push('Effective use of illustrative examples to anchor theoretical concepts');
  }
  if (strengths.length === 0) {
    strengths.push('Addressed the prompt directly');
  }

  if (keywordCoverageRatio < 0.6) {
    weaknesses.push('Could provide more granular details on internal mechanisms');
  }
  if (!lowerAnswer.includes('trade-off') && !lowerAnswer.includes('however') && !lowerAnswer.includes('limitation')) {
    weaknesses.push('Did not explicitly discuss architectural or runtime trade-offs');
  }
  if (wordCount < 40) {
    weaknesses.push('Response could be expanded with more structured points');
  }

  for (const kp of keyPoints) {
    if (!lowerAnswer.includes(kp.toLowerCase()) && !lowerAnswer.includes(kp.split(' ')[0].toLowerCase())) {
      missingPoints.push(`Discussion of ${kp}`);
    }
  }

  // Generate Follow-up Question if answer is moderate and under limit (max 2 follow-ups)
  const shouldGenerateFollowUp = followUpCount < 2 && (overallScore < 85 || keywordCoverageRatio < 0.7);
  let followUpQuestionText: string | undefined;

  if (shouldGenerateFollowUp) {
    if (questionType === 'TECHNICAL' || questionType === 'ROLE_SPECIFIC') {
      followUpQuestionText = `Follow-Up: How would you monitor or profile this behavior in a high-concurrency production environment?`;
    } else if (questionType === 'HR' || questionType === 'BEHAVIORAL') {
      followUpQuestionText = `Follow-Up: Looking back on that experience, what is one key metric or outcome that proved your approach succeeded?`;
    } else {
      followUpQuestionText = `Follow-Up: How would you adapt that explanation if your stakeholder requested technical implementation constraints?`;
    }
  }

  return {
    score: overallScore,
    technicalScore,
    communicationScore,
    hrScore,
    problemSolvingScore,
    feedback: overallScore >= 75
      ? 'Strong, articulate answer demonstrating solid conceptual grasp and clear structural delivery.'
      : 'Good foundational attempt. Expanding on concrete edge cases and practical system trade-offs will elevate your response.',
    strengths,
    weaknesses,
    missingPoints: missingPoints.slice(0, 3),
    suggestedStructure: questionType === 'HR' || questionType === 'BEHAVIORAL'
      ? 'Situation -> Task -> Action -> Quantifiable Result'
      : 'Core Definition -> Underlying Mechanism -> Practical Use Case -> Performance & Memory Trade-offs',
    improvementAdvice: 'Structure your thoughts by stating the outcome or definition first, followed by clear chronological or architectural points.',
    shouldGenerateFollowUp,
    followUpQuestionText,
    followUpQuestionType: questionType
  };
}

/**
 * Score categorization label helper
 */
export function getScoreCategoryLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  return 'Beginner Practice Required';
}
