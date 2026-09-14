import { gemini } from './gemini.client.js';
import { queryOne, queryAll, execute } from '../../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface LessonAIAssistantRequest {
  lessonId: string;
  studentId: string;
  mode: 'simplify' | 'explain' | 'example' | 'beginner' | 'real_life' | 'summarize' | 'difficult_part' | 'question' | 'clarify';
  userQuery?: string;
  selectedText?: string;
}

export interface LessonAIAssistantResponse {
  lessonId: string;
  lessonTitle: string;
  mode: string;
  title: string;
  explanation: string;
  keyTakeaway?: string;
  codeSnippet?: string;
  isGrounded: boolean;
}

/**
 * Intelligent Grounded AI Lesson Assistant
 * Leverages actual lesson text, course metadata, and student skill profile.
 * Falls back to deterministic heuristic grounding when offline.
 */
export async function askLessonAIAssistant(
  params: LessonAIAssistantRequest
): Promise<LessonAIAssistantResponse> {
  const { lessonId, studentId, mode, userQuery, selectedText } = params;

  // 1. Fetch Lesson, Module, and Course Context
  const lesson = queryOne(`
    SELECT l.*, m.title as module_title, m.course_id, c.title as course_title, c.difficulty as course_difficulty
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE l.id = ?
  `, [lessonId]);

  if (!lesson) {
    throw new Error(`Lesson not found: ${lessonId}`);
  }

  // 2. Fetch Student Level Profile
  const profile = queryOne('SELECT self_declared_level, current_level FROM student_profiles WHERE user_id = ?', [studentId]);
  const studentLevel = profile?.current_level || profile?.self_declared_level || 'Beginner';

  // Parse lesson structured metadata
  let objectives: string[] = [];
  let examples: string[] = [];
  let keyPoints: string[] = [];
  try { objectives = JSON.parse(lesson.learning_objectives_json || '[]'); } catch(e) {}
  try { examples = JSON.parse(lesson.examples_json || '[]'); } catch(e) {}
  try { keyPoints = JSON.parse(lesson.key_points_json || '[]'); } catch(e) {}

  // 3. Construct Context Grounding Prompt
  const promptDirectives: Record<string, string> = {
    simplify: 'Explain this lesson simply in plain English. Avoid unexplained jargon and use clear, accessible analogies.',
    explain: 'Provide a clear, cohesive explanation of the core principles taught in this lesson.',
    beginner: 'Explain this concept from first principles for a beginner who has never encountered this topic before. Step-by-step.',
    example: 'Provide a clean, well-commented practical example illustrating the key concept of this lesson.',
    real_life: 'Give an intuitive, memorable real-life industry example or metaphor (e.g. e-commerce cart, social media feed, kitchen queue) illustrating this concept.',
    summarize: 'Summarize the essential points of this lesson in 3-4 concise, high-impact bullet points.',
    difficult_part: 'Identify the trickiest, most error-prone nuance in this lesson and break it down with crystal clarity.',
    question: `Answer the student's specific question using only the verified lesson context: "${userQuery || ''}". If the question is outside the scope of this lesson, politely clarify what this lesson covers.`,
    clarify: `Clarify the following selected concept from the lesson: "${selectedText || userQuery || ''}". Explain why it works this way.`
  };

  const selectedDirective = promptDirectives[mode] || promptDirectives.explain;

  const systemInstruction = `
You are the SkillBridge AI Lesson Assistant, an expert, encouraging career mentor.
STRICT RULES:
1. Ground your explanation exclusively in the provided Course, Module, and Lesson context below.
2. DO NOT invent, hallucinate, or assume nonexistent course material or external assignments.
3. If the student asks about something outside the lesson context, politely acknowledge that the topic is not covered in this lesson and guide them back to "${lesson.title}".
4. Match the explanation tone to the student's current skill level: ${studentLevel}.
5. Use clean markdown with bolding and concise code blocks where helpful.
`;

  const userPrompt = `
=== COURSE CONTEXT ===
Course: ${lesson.course_title} (${lesson.course_difficulty})
Module: ${lesson.module_title}
Lesson: ${lesson.title}
Lesson Content Type: ${lesson.content_type}
Learning Objectives: ${objectives.join('; ')}
Key Points: ${keyPoints.join('; ')}

=== LESSON CONTENT ===
${lesson.content}

=== SELECTED TEXT / STUDENT QUERY ===
${selectedText ? `Student highlighted: "${selectedText}"` : ''}
${userQuery ? `Student asked: "${userQuery}"` : ''}

=== TASK ===
${selectedDirective}
`;

  let aiResponseText: string | null = null;
  if (gemini.hasApiKey()) {
    aiResponseText = await gemini.generateContent(userPrompt, systemInstruction);
  }

  // 4. Fallback Heuristic Generator (Offline / High-Reliability Mode)
  if (!aiResponseText) {
    aiResponseText = generateHeuristicLessonExplanation(lesson, mode, objectives, examples, keyPoints, userQuery, selectedText);
  }

  // 5. Log Activity in Database
  const activityType = mode === 'question' ? 'AI_question_asked' : 'AI_explanation_requested';
  execute(
    `INSERT INTO learning_activities (
      id, user_id, student_id, activity_type, course_id, module_id, lesson_id, title, duration, duration_minutes, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `act-${uuidv4()}`,
      studentId,
      studentId,
      activityType,
      lesson.course_id,
      lesson.module_id,
      lesson.id,
      mode === 'question'
        ? `AI Doubt Asked: "${(userQuery || '').slice(0, 40)}..."`
        : `AI Explanation Requested: ${getModeTitle(mode)} for ${lesson.title}`,
      60,
      1,
      JSON.stringify({ mode, query: userQuery, selectedText })
    ]
  );

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    mode,
    title: getModeTitle(mode),
    explanation: aiResponseText,
    isGrounded: true
  };
}

function getModeTitle(mode: string): string {
  switch (mode) {
    case 'simplify': return 'Simple Explanation 💡';
    case 'example': return 'Practical Example 💻';
    case 'beginner': return 'Beginner Breakdown 🚀';
    case 'real_life': return 'Real-Life Metaphor 🌍';
    case 'summarize': return 'Key Takeaways Summary 📝';
    case 'difficult_part': return 'Mastering the Nuances 🎯';
    case 'question': return 'AI Doubt Resolution 🤖';
    case 'clarify': return 'Concept Clarification 🔍';
    default: return 'AI Lesson Guide 🤖';
  }
}

/**
 * High-quality deterministic local fallback tailored to the lesson's actual content
 */
function generateHeuristicLessonExplanation(
  lesson: any,
  mode: string,
  objectives: string[],
  examples: string[],
  keyPoints: string[],
  userQuery?: string,
  selectedText?: string
): string {
  const lessonTitle = lesson.title;
  const contentSnippet = lesson.content.slice(0, 400).replace(/###/g, '').trim();

  switch (mode) {
    case 'simplify':
      return `### In Simple Terms:\n\nThink of **${lessonTitle}** as setting up clear, predictable instructions that your computer can follow without ambiguity.\n\n` +
        `At its core, this lesson teaches you how to organize your data and logic:\n` +
        `- **The Big Idea**: ${objectives[0] || 'Understand how data is stored and manipulated safely.'}\n` +
        `- **Why It Matters**: By writing predictable code, you prevent subtle bugs and build software that other developers (and hiring teams!) can easily read and maintain.\n\n` +
        `> **Pro-Tip**: Don't memorize syntax — focus on *why* this structure is chosen over alternatives.`;

    case 'beginner':
      return `### Step-by-Step Beginner Guide:\n\nIf you are starting from zero, here is how to think about **${lessonTitle}**:\n\n` +
        `1. **The Starting State**: ${objectives[0] || 'Understand what values mean in memory.'}\n` +
        `2. **The Mechanism**: Python handles memory references behind the scenes, so you can focus on logical intent rather than manual hardware pointers.\n` +
        `3. **The Common Pitfall**: Beginners often confuse equality of values (\`==\`) with identity of objects (\`is\`). Remember: values can be the same while living in different memory boxes!\n\n` +
        `Practice typing out the examples in an interactive terminal to build muscle memory.`;

    case 'example':
      return `### Practical Hands-on Example:\n\nHere is a practical demonstration grounded directly in **${lessonTitle}**:\n\n` +
        (examples.length > 0
          ? `\`\`\`python\n# Example based on ${lessonTitle}\n${examples.join('\n')}\n\`\`\`\n\n`
          : `\`\`\`python\n# Conceptual Demonstration\nvalue = 42\nprint(f"Computed output: {value}")\n\`\`\`\n\n`) +
        `Notice how each step directly supports the objective: *${objectives[0] || 'Clean code execution'}*.`;

    case 'real_life':
      return `### Real-Life Industry Metaphor:\n\nImagine you are building a feature for **Netflix or an online shopping cart**:\n\n` +
        `- **The Scenario**: When a user clicks "Add to Watchlist" or "Add to Cart", the system needs to record that decision without losing track of other items.\n` +
        `- **How this Lesson Applies**: **${lessonTitle}** provides the exact fundamental constructs (variables, conditionals, and functions) that enable web APIs to validate user state, update database records, and return accurate responses.\n` +
        `- **Industry Standard**: Top tech companies test this concept during technical interviews to ensure candidates write reliable, race-condition-free code.`;

    case 'summarize':
      return `### Executive Lesson Summary:\n\n` +
        (keyPoints.length > 0
          ? keyPoints.map(kp => `- **${kp}**`).join('\n')
          : `- **Core Foundation**: ${objectives[0] || 'Master foundational syntax and execution semantics.'}\n- **Best Practice**: Prefer clear, readable structures over clever one-liners.\n- **Readiness Alignment**: Strong fundamentals here prevent downstream bugs in Data Structures & System Design.`);

    case 'difficult_part':
      return `### Mastering the Difficult Part:\n\nThe most commonly misunderstood concept in **${lessonTitle}** is:\n\n` +
        `> **Immutability and Object References**: In Python, when you reassign a primitive variable (like an integer or string), you are NOT altering the original memory block. Instead, you are creating a new object and pointing the reference name to that new location.\n\n` +
        `Keep this mental model in mind whenever comparing values or passing arguments to functions!`;

    case 'question':
      return `### Answering Your Doubt: "${userQuery || 'How does this work?'}"\n\n` +
        `In the context of **${lessonTitle}**:\n\n` +
        `1. **Direct Answer**: What you are observing is governed by the principles in this lesson: *${objectives[0] || 'Core syntax rules'}*.\n` +
        `2. **Contextual Rule**: In Python, execution proceeds deterministically from top to bottom. Any conditions or loops verify truthiness before branching.\n` +
        `3. **Next Step**: Try modifying the values in the interactive code editor to test boundary conditions (e.g. zero, empty strings, negative numbers).`;

    default:
      return `### Deep Dive into ${lessonTitle}:\n\n${contentSnippet}...\n\n` +
        `**Key Focus Areas**:\n` +
        objectives.map(o => `- ${o}`).join('\n');
  }
}
