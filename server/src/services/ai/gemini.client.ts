/**
 * Gemini AI Client for SkillBridge AI
 * Real-time generative AI engine for assessments, evaluation, and personalization.
 */

export interface AIMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AIResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export class GeminiClient {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
  }

  public getApiKey(): string | null {
    return this.apiKey || process.env.GEMINI_API_KEY || null;
  }

  public setApiKey(key: string | null): void {
    this.apiKey = key ? key.trim() : null;
  }

  public hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Send a prompt to Gemini 1.5 Flash with detailed status result
   */
  public async generateContentWithStatus(prompt: string, systemInstruction?: string): Promise<{ text: string | null; error?: string }> {
    const key = this.getApiKey();
    if (!key) {
      return { text: null, error: 'GEMINI_API_KEY is not configured. Please provide an API key in server/.env or settings.' };
    }

    // Sandbox Test Mode: support reproducible end-to-end integration testing and offline sandbox
    if (key === 'test-sandbox-key' || key === 'test-mock-key' || key.startsWith('test-mock-')) {
      if (prompt.includes('Respond with "OK"')) {
        return { text: 'OK' };
      }
      if (prompt.includes('Generate exactly 6 real assessment questions') || prompt.includes('Assessment Architect')) {
        return {
          text: JSON.stringify([
            {
              questionText: "What is the primary difference between a process and a thread in modern operating systems?",
              questionType: "mcq",
              category: "programming",
              skillName: "Systems & Memory Architecture",
              difficulty: "medium",
              points: 10,
              options: [
                "Processes share memory space by default; threads have independent memory",
                "Threads share the process memory address space; processes have isolated address spaces",
                "Processes cannot communicate; threads communicate via sockets only",
                "Threads are managed strictly by hardware; processes by the OS kernel"
              ],
              correctAnswer: "Threads share the process memory address space; processes have isolated address spaces",
              explanation: "Threads of the same process share code, data, and OS resources, while processes have separate virtual memory spaces."
            },
            {
              questionText: "Implement a function `findFirstUnique(arr)` that returns the first non-repeating element in an array of integers in O(n) time.",
              questionType: "coding",
              category: "programming",
              skillName: "Data Structures & Algorithms",
              difficulty: "medium",
              points: 10,
              starterCode: "function findFirstUnique(arr) {\n  // Return first unique integer, or null\n}",
              codeLanguage: "javascript",
              correctAnswer: "function findFirstUnique(arr) {\n  const counts = new Map();\n  for (const n of arr) counts.set(n, (counts.get(n) || 0) + 1);\n  for (const n of arr) if (counts.get(n) === 1) return n;\n  return null;\n}",
              explanation: "Use a frequency hash map to tally occurrences in first pass, then check order in second pass."
            },
            {
              questionText: "In a propositional logic deduction: If all microservices are healthy, the API gateway latency is low. The gateway latency is NOT low. What can be soundly deduced?",
              questionType: "mcq",
              category: "logical_reasoning",
              skillName: "Logical Deduction",
              difficulty: "easy",
              points: 10,
              options: [
                "All microservices are healthy",
                "At least one microservice is unhealthy",
                "The network switch is offline",
                "No conclusion can be made"
              ],
              correctAnswer: "At least one microservice is unhealthy",
              explanation: "By Modus Tollens (P -> Q, ~Q therefore ~P), if all healthy -> low latency, not low latency means not all healthy."
            },
            {
              questionText: "When designing a distributed caching layer for 10 million daily active users, which cache invalidation strategy best guarantees read freshness while preventing cache stampedes?",
              questionType: "mcq",
              category: "problem_solving",
              skillName: "Distributed Systems Design",
              difficulty: "hard",
              points: 10,
              options: [
                "Cache-aside with probabilistic early expiration / mutex locking",
                "Write-through caching with infinite TTL",
                "Full database polling on every cache miss",
                "Random key eviction without TTL"
              ],
              correctAnswer: "Cache-aside with probabilistic early expiration / mutex locking",
              explanation: "Probabilistic early expiration and mutex locks ensure only one worker repopulates hot expired keys, preventing stampedes."
            },
            {
              questionText: "A database transaction is experiencing deadlock under high concurrent traffic. Explain step-by-step how you would diagnose the root cause and refactor the transaction sequence.",
              questionType: "short_answer",
              category: "problem_solving",
              skillName: "Concurrency & Database Design",
              difficulty: "medium",
              points: 10,
              correctAnswer: "1. Inspect DB lock dependency graphs and slow query logs. 2. Ensure all transactions acquire locks in identical deterministic order. 3. Minimize lock hold time by executing computation before entering transactions. 4. Implement idempotent retries with exponential backoff.",
              explanation: "Ordering lock acquisition and shortening transaction scopes eliminates cyclic wait conditions."
            },
            {
              questionText: "You need to inform a non-technical product manager that a major feature must be delayed by two weeks due to critical security refactoring. How would you communicate this effectively?",
              questionType: "short_answer",
              category: "communication",
              skillName: "Stakeholder Communication",
              difficulty: "medium",
              points: 10,
              correctAnswer: "Use BLUF: State the revised launch date upfront, clearly articulate the business risk of launching without the fix (data vulnerability), outline the remediation milestones, and offer a partial beta or phased release alternative.",
              explanation: "Clear, transparent communication focuses on business impact, solutions, and alternatives rather than defensive technical jargon."
            }
          ])
        };
      }
      if (prompt.includes('Evaluate the candidate') || prompt.includes('Assessment Evaluator')) {
        return {
          text: JSON.stringify({
            programmingScore: 85,
            logicalReasoningScore: 90,
            communicationScore: 80,
            problemSolvingScore: 82,
            overallScore: 84,
            overallLevel: "Proficient",
            strengths: [
              "Demonstrates strong mastery of memory management and process vs thread isolation",
              "Accurate algorithmic problem formulation using frequency maps in linear time",
              "Sound formal logical reasoning and Modus Tollens deduction"
            ],
            weaknesses: [
              "Could elaborate deeper on probabilistic early expiration algorithms like XFetch",
              "Consider discussing database lock isolation levels (e.g. Read Committed snapshot isolation)"
            ],
            priorityImprovements: [
              "Study distributed caching stampede mitigations in high-throughput systems",
              "Practice advanced transaction isolation and optimistic concurrency control"
            ],
            questionResults: [
              { questionId: "q1", score: 10, isCorrect: true, feedback: "Excellent explanation of virtual memory address isolation." },
              { questionId: "q2", score: 10, isCorrect: true, feedback: "Optimal O(n) hash map time complexity implemented." },
              { questionId: "q3", score: 10, isCorrect: true, feedback: "Correct application of Modus Tollens." },
              { questionId: "q4", score: 8, isCorrect: true, feedback: "Good identification of probabilistic cache invalidation." },
              { questionId: "q5", score: 8, isCorrect: true, feedback: "Sound lock ordering strategy; consider snapshot isolation." },
              { questionId: "q6", score: 8, isCorrect: true, feedback: "Professional stakeholder communication structure using BLUF." }
            ]
          })
        };
      }
      return { text: "OK" };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const payload = {
        contents: [
          ...(systemInstruction ? [{ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] }] : []),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          maxOutputTokens: 3000
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errDetails = `API returned status ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error?.message) errDetails = errBody.error.message;
        } catch {}
        console.warn(`[GeminiClient] API error: ${errDetails}`);
        return { text: null, error: errDetails };
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { text: candidateText || null };
    } catch (err: any) {
      console.warn('[GeminiClient] Request failed:', err);
      return { text: null, error: err.message || 'Network error communicating with Gemini API' };
    }
  }

  /**
   * Send a prompt to Gemini 1.5 Flash returning raw text string or null
   */
  public async generateContent(prompt: string, systemInstruction?: string): Promise<string | null> {
    const res = await this.generateContentWithStatus(prompt, systemInstruction);
    return res.text;
  }

  /**
   * Generate structured JSON with Gemini returning AIResult container
   */
  public async generateJSONWithResult<T = any>(prompt: string, systemInstruction?: string): Promise<AIResult<T>> {
    const { text, error } = await this.generateContentWithStatus(
      `${prompt}\n\nIMPORTANT: Respond ONLY with valid, parsable JSON. Do not include markdown code block backticks if possible, or format as \`\`\`json { ... } \`\`\`. Do not include conversational filler.`,
      systemInstruction
    );

    if (error || !text) {
      return { success: false, data: null, error: error || 'No response returned from AI engine.' };
    }

    try {
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleanJson) as T;
      return { success: true, data: parsed };
    } catch (e: any) {
      console.warn('[GeminiClient] Could not parse JSON response:', e, 'Raw output was:', text.substring(0, 300));
      return { success: false, data: null, error: `Invalid JSON structure returned by AI: ${e.message}` };
    }
  }

  /**
   * Generate structured JSON with Gemini returning parsed object or null
   */
  public async generateJSON<T = any>(prompt: string, systemInstruction?: string): Promise<T | null> {
    const res = await this.generateJSONWithResult<T>(prompt, systemInstruction);
    return res.data;
  }
}

export const gemini = new GeminiClient();
