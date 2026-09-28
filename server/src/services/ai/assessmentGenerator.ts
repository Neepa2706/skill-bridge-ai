import { v4 as uuidv4 } from 'uuid';
import { gemini } from './gemini.client.js';

export type AssessmentCategory = 'programming' | 'logical_reasoning' | 'problem_solving' | 'communication';

export interface GeneratedQuestion {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'multiple_choice' | 'short_answer' | 'coding' | 'fluency';
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
 * target role, and experience level across Multiple Programming Languages
 * (Python, JavaScript/TypeScript, Java, C++, SQL), Logic, Problem Solving, and Direct Speaking Fluency.
 */
export async function generateAdaptiveAssessment(params: AssessmentGenerationParams): Promise<AssessmentGenerationResult> {
  const department = params.department || 'Computer Science & Engineering';
  const role = params.targetRole || 'Software Developer';
  const level = params.currentLevel || 'Beginner';
  const languages = params.programmingLanguages?.length ? params.programmingLanguages.join(', ') : 'Python, JavaScript, Java, C++, SQL';

  const systemPrompt = `You are the lead AI Assessment Architect for SkillBridge AI.
Generate comprehensive, real-time technical assessments tailored to a student's exact academic background and career goals.
You MUST test multiple programming languages (Python, JavaScript/TypeScript, Java, C++, SQL) as well as technical communication and direct speaking fluency.
You MUST return ONLY valid JSON matching the specified schema. No markdown backticks, no conversational preamble.`;

  const userPrompt = `Generate comprehensive assessment questions tailored for a candidate with:
- Academic Department: ${department}
- Target Career Role: ${role}
- Experience Level: ${level}
- Primary Languages / Interests: ${languages}

The assessment MUST comprehensively test:
1. Python Programming & Memory Model
2. JavaScript / TypeScript & Modern Async Runtime
3. Java & Object-Oriented System Design
4. C++ & Systems Memory Management
5. SQL & Database Query Architecture
6. Logical Reasoning & Pattern Analysis
7. Problem Solving & Distributed Architecture
8. Hands-on Multi-Language Coding Sandbox
9. Technical & Workplace Stakeholder Communication
10. Direct Speaking & Fluency Test (Speaking directly into microphone)

Return a JSON array of objects with keys: questionText, questionType ("mcq" | "short_answer" | "coding" | "fluency"), category, skillName, difficulty, points, options, starterCode, codeLanguage, correctAnswer, explanation, rubric.`;

  let rawQuestions: any[] | null = null;

  // Attempt live AI generation if Gemini is configured
  if (gemini.hasApiKey()) {
    try {
      const aiResult = await gemini.generateJSONWithResult<any[]>(userPrompt, systemPrompt);
      if (aiResult.success && Array.isArray(aiResult.data) && aiResult.data.length >= 6) {
        rawQuestions = aiResult.data;
      }
    } catch (err) {
      console.warn('[AssessmentGenerator] Gemini generation failed, falling back to comprehensive multi-language question bank:', err);
    }
  }

  // Fallback to high-quality curated multi-language adaptive bank
  if (!rawQuestions || rawQuestions.length === 0) {
    rawQuestions = getCuratedAdaptiveQuestions(role, level, department);
  }

  // Validate and format questions
  const formatted: GeneratedQuestion[] = rawQuestions.map((q, idx) => {
    const rawType = String(q.questionType || '').toLowerCase();
    const type: GeneratedQuestion['questionType'] =
      rawType === 'coding' ? 'coding' :
      rawType === 'fluency' || rawType === 'speaking' ? 'fluency' :
      rawType === 'short_answer' ? 'short_answer' : 'mcq';

    const rawCategory = String(q.category || '').toLowerCase();
    const category: AssessmentCategory =
      rawCategory.includes('logic') ? 'logical_reasoning' :
      rawCategory.includes('problem') ? 'problem_solving' :
      rawCategory.includes('comm') || type === 'fluency' ? 'communication' : 'programming';

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
      skillName: String(q.skillName || (
        type === 'fluency' ? 'Verbal Fluency & Pronunciation' :
        category === 'programming' ? 'Programming & Multi-Language Syntax' :
        category === 'logical_reasoning' ? 'Logical Deduction' :
        category === 'problem_solving' ? 'Problem Solving & Systems' : 'Technical Communication'
      )),
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
 * Comprehensive curated question bank covering Multiple Programming Languages:
 * Python, JavaScript/TypeScript, Java, C++, SQL, Algorithms, Logic,
 * Technical Communication, and Direct Speaking Fluency.
 */
function getCuratedAdaptiveQuestions(role: string, level: string, department: string): any[] {
  return [
    // 1. Python Programming
    {
      questionText: "In Python memory architecture, which statement regarding mutable vs immutable objects is correct?",
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

    // 2. JavaScript / TypeScript
    {
      questionText: "In the JavaScript / Node.js V8 event loop, what is the exact execution order of microtasks vs macrotasks?",
      questionType: "mcq",
      category: "programming",
      skillName: "JavaScript / TypeScript Event Loop",
      difficulty: "medium",
      points: 10,
      options: [
        "The microtask queue (Promise callbacks, queueMicrotask) is completely drained immediately after the current synchronous script and before the next macrotask (setTimeout, setInterval).",
        "Macrotasks always execute before any Promise.then() callback.",
        "setTimeout(fn, 0) executes with higher priority than process.nextTick() and Promise microtasks.",
        "Async/await pauses the entire Node.js operating system thread until an HTTP request finishes."
      ],
      correctAnswer: "The microtask queue (Promise callbacks, queueMicrotask) is completely drained immediately after the current synchronous script and before the next macrotask (setTimeout, setInterval).",
      explanation: "V8 processes all pending microtasks (resolved Promises, queueMicrotask) immediately after the synchronous frame finishes and before picking the next timer/macrotask from the event queue."
    },

    // 3. Java & Object-Oriented Design
    {
      questionText: "In Java, what is the fundamental difference between an Abstract Class and an Interface (Java 8+)?",
      questionType: "mcq",
      category: "programming",
      skillName: "Java & Object-Oriented Principles",
      difficulty: "medium",
      points: 10,
      options: [
        "An abstract class can maintain state with instance fields and constructors; an interface can define default methods and static constants but cannot maintain mutable instance state.",
        "Interfaces can have private constructors to prevent instantiation.",
        "A Java class can extend multiple abstract classes but only implement a single interface.",
        "Abstract classes cannot declare non-abstract (concrete) methods."
      ],
      correctAnswer: "An abstract class can maintain state with instance fields and constructors; an interface can define default methods and static constants but cannot maintain mutable instance state.",
      explanation: "Java supports single class inheritance (one abstract class with instance state/constructors) and multiple interface implementation. Interfaces cannot hold instance variables."
    },

    // 4. C++ & Systems Memory
    {
      questionText: "In Modern C++ (C++11/C++20), which smart pointer guarantees exclusive ownership of a dynamically allocated heap object and automatically frees memory upon leaving scope?",
      questionType: "mcq",
      category: "programming",
      skillName: "C++ & Systems Memory Management",
      difficulty: "medium",
      points: 10,
      options: [
        "std::unique_ptr (implements strict move-only semantics and zero reference count overhead)",
        "std::shared_ptr (maintains an atomic control block for multi-threaded reference counting)",
        "std::weak_ptr (holds a non-owning observer reference to break circular dependencies)",
        "raw pointer with manual delete keyword called inside an exception handler"
      ],
      correctAnswer: "std::unique_ptr (implements strict move-only semantics and zero reference count overhead)",
      explanation: "std::unique_ptr embodies RAII for single exclusive ownership without reference counting overhead, moving ownership via std::move."
    },

    // 5. SQL & Relational Databases
    {
      questionText: "In SQL and relational database engines (PostgreSQL / MySQL), which index type is best suited for range queries (e.g., WHERE age BETWEEN 20 AND 30)?",
      questionType: "mcq",
      category: "programming",
      skillName: "SQL & Database Indexing",
      difficulty: "medium",
      points: 10,
      options: [
        "B-Tree Index (stores sorted keys allowing efficient O(log N) range scans and ordering)",
        "Hash Index (only supports exact O(1) equality lookups using hash buckets)",
        "Full-Text GIN Index (designed specifically for inverted lexeme parsing)",
        "Bitmap Index on high-cardinality unique primary keys"
      ],
      correctAnswer: "B-Tree Index (stores sorted keys allowing efficient O(log N) range scans and ordering)",
      explanation: "B-Tree indexes maintain sorted leaf nodes connected in a doubly linked list, making contiguous range traversal (BETWEEN, <, >) fast and efficient."
    },

    // 6. Logical Reasoning & Pattern Analysis
    {
      questionText: "Consider the numeric progression: 2, 6, 12, 20, 30, ?. What is the next number in this sequence, and what is the underlying rule?",
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

    // 7. Problem Solving & Systems Architecture
    {
      questionText: "When designing a low-latency caching layer for user sessions, why is a Key-Value In-Memory store (e.g., Redis) preferred over a traditional disk-based relational query?",
      questionType: "mcq",
      category: "problem_solving",
      skillName: "Data Structures & System Design",
      difficulty: "medium",
      points: 10,
      options: [
        "In-memory hash tables provide average O(1) read/write latency with microsecond retrieval times without disk I/O seek overhead.",
        "In-memory stores consume zero server RAM across clustered environments.",
        "Disk databases require more TCP packet serialization headers.",
        "Relational databases cannot index UUID or string primary keys."
      ],
      correctAnswer: "In-memory hash tables provide average O(1) read/write latency with microsecond retrieval times without disk I/O seek overhead.",
      explanation: "RAM access is orders of magnitude faster than NVMe/HDD storage, giving key-value caches sub-millisecond response times."
    },

    // 8. Hands-on Multi-Language Coding Challenge
    {
      questionText: "Write a function `two_sum(nums, target)` that returns the indices of two numbers that add up to `target`. You can write your solution in Python, JavaScript, Java, or C++.",
      questionType: "coding",
      category: "programming",
      skillName: "Multi-Language Algorithms & Hash Maps",
      difficulty: "medium",
      points: 10,
      codeLanguage: "python",
      starterCode: "# Select your preferred programming language\ndef two_sum(nums, target):\n    # Return a list of the two zero-based indices\n    # e.g., for nums=[2, 7, 11, 15], target=9 -> [0, 1]\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n    return []",
      correctAnswer: "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i\n    return []",
      explanation: "A single-pass hash map achieves O(n) time complexity and O(n) space complexity by storing each element's complement.",
      rubric: "10 points for O(n) hash table approach with correct indices; 6 points for O(n^2) nested loop; 0 points for unhandled logic."
    },

    // 9. Technical & Workplace Stakeholder Communication
    {
      questionText: "During a major sprint deadline, you discover that a third-party dependency in your team's microservice has a critical security vulnerability. How do you communicate this issue to your engineering lead and prioritize remediation?",
      questionType: "short_answer",
      category: "communication",
      skillName: "Technical Communication & Incident Management",
      difficulty: "medium",
      points: 10,
      correctAnswer: "Immediately alert the tech lead with a clear summary: describe the vulnerability severity (CVE), affected endpoints, blast radius, potential exploit vectors, and propose 2 actionable options (patching version, applying a temporary WAF rule or proxy mitigation).",
      explanation: "Effective engineering communication is prompt, structured with severity and impact, and offers solutions rather than just raising alarms.",
      rubric: "Assess whether the answer includes immediate structured notification, impact assessment, and proposed mitigation options."
    },

    // 10. Direct Speaking & Fluency Test (Live Voice Recording)
    {
      questionText: "FLUENCY & SPEAKING TEST: Speak directly into your microphone for 30 to 60 seconds.\nPrompt: Describe an engineering project you built or an interesting algorithm you implemented. Explain your architectural choices and how you resolved an unexpected technical challenge.\n(Your speaking speed in WPM, pronunciation clarity, and fluency will be recorded in real-time).",
      questionType: "fluency",
      category: "communication",
      skillName: "Verbal Fluency & Technical Pronunciation",
      difficulty: "medium",
      points: 10,
      correctAnswer: "A clear, well-paced explanation (120-150 WPM) describing project architecture, key technical choices, and problem resolution with accurate pronunciation.",
      explanation: "Evaluates conversational speed (WPM), pronunciation clarity, vocabulary range, and verbal confidence.",
      rubric: "10 points: Clear pronunciation, fluent cadence (120-160 WPM), structured thought; 7 points: understandable with minor hesitation; 4 points: rushed (>180 WPM) or very slow (<90 WPM) speech."
    }
  ];
}
