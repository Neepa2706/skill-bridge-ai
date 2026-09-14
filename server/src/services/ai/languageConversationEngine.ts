import { gemini } from './gemini.client.js';

export interface ConversationTurnResult {
  replyText: string;
  grammarCorrection?: string | null;
  vocabularyNote?: string | null;
  relevanceScore: number;
}

export interface ConversationEvaluationResult {
  overallScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  conversationContinuity: number;
  strengths: string[];
  improvements: string[];
  summaryFeedback: string;
}

const LANGUAGE_PROMPTS: Record<string, { role: string; intro: string }> = {
  en: {
    role: 'You are an articulate, encouraging professional English communication mentor for corporate and technical environments.',
    intro: 'Hello! I am your SkillBridge English Communication Partner. Tell me about your background and what technical role you are targeting!'
  },
  ja: {
    role: 'You are a polite, natural Japanese business conversation partner (日本語ビジネス会話メンター). You communicate in polite Japanese (丁寧語・敬語) with hiragana/romaji assistance when helpful.',
    intro: 'こんにちは！SkillBridge日本語パートナーです。自己紹介と、どのようなITの仕事に興味があるか教えていただけますか？ (Konnichiwa! Could you introduce yourself and tell me what IT role you are interested in?)'
  },
  de: {
    role: 'You are a professional, helpful German communication coach for tech and business (Deutsch für den Beruf).',
    intro: 'Guten Tag! Ich bin dein SkillBridge Deutsch-Sprachpartner. Erzähle mir bitte kurz über dich und deine beruflichen Ziele im Tech-Bereich!'
  }
};

export async function processConversationTurn(params: {
  languageCode: 'en' | 'ja' | 'de';
  userMessage: string;
  conversationHistory: Array<{ sender: 'ai' | 'user'; message: string }>;
}): Promise<ConversationTurnResult> {
  const langConfig = LANGUAGE_PROMPTS[params.languageCode] || LANGUAGE_PROMPTS.en;

  if (gemini.hasApiKey()) {
    const historyText = params.conversationHistory
      .slice(-6)
      .map(m => `${m.sender.toUpperCase()}: ${m.message}`)
      .join('\n');

    const prompt = `System: ${langConfig.role}
Target Language: ${params.languageCode.toUpperCase()}
Recent Dialogue:
${historyText}
USER: ${params.userMessage}

Respond naturally in ${params.languageCode}. Continue the dialogue dynamically with an engaging follow-up question.
Also evaluate their message and return a JSON object with:
- replyText: your natural in-character conversational response
- grammarCorrection: a gentle, constructive grammar fix or null if perfect
- vocabularyNote: a more professional or nuanced vocabulary alternative
- relevanceScore: number from 1 to 100 on how relevant and coherent their response was.`;

    const aiRes = await gemini.generateJSON<ConversationTurnResult>(prompt);
    if (aiRes && aiRes.replyText) {
      return aiRes;
    }
  }

  // Deterministic multilingual responses
  const userTextLower = params.userMessage.toLowerCase();

  if (params.languageCode === 'ja') {
    if (userTextLower.includes('エンジニア') || userTextLower.includes('developer') || userTextLower.includes('software') || userTextLower.includes('python')) {
      return {
        replyText: '素晴らしいですね！ソフトウェア開発において、これまでどのようなプロジェクトやプログラミング言語に挑戦してきましたか？ (Subarashii desu ne! What projects or programming languages have you worked on so far in software development?)',
        grammarCorrection: '「〜を勉強しています」を使うと、より自然な丁寧語になります。',
        vocabularyNote: '「IT業界 (IT gyoukai - IT industry)」や「開発経験 (kaihatsu keiken - development experience)」を活用するとプロフェッショナルです。',
        relevanceScore: 92
      };
    }
    return {
      replyText: '教えていただきありがとうございます！将来、日本のグローバル企業やテックチームで働くことについて、どのような期待をお持ちですか？ (Thank you for sharing! What expectations do you have about working in a global Japanese tech team?)',
      grammarCorrection: null,
      vocabularyNote: '「意欲 (iyoku - enthusiasm/motivation)」や「貢献 (kouken - contribution)」という表現も練習してみましょう。',
      relevanceScore: 88
    };
  }

  if (params.languageCode === 'de') {
    if (userTextLower.includes('entwickler') || userTextLower.includes('developer') || userTextLower.includes('student') || userTextLower.includes('ai')) {
      return {
        replyText: 'Sehr interessant! Welche Technologien und Programmiersprachen begeistern dich im Moment am meisten?',
        grammarCorrection: 'Achte auf die Satzstellung nach Konjunktionen wie "weil" oder "dass" (Verb ans Satzende).',
        vocabularyNote: 'Nutze Fachbegriffe wie "die Softwarearchitektur", "die Codequalität" oder "das Projektmanagement".',
        relevanceScore: 90
      };
    }
    return {
      replyText: 'Vielen Dank für deine Antwort! Wie möchtest du deine Sprachkenntnisse in einem deutschsprachigen Team oder Unternehmen am besten einsetzen?',
      grammarCorrection: null,
      vocabularyNote: 'Wortschatz-Tipp: "die Zusammenarbeit" (collaboration) und "die Herausforderung" (challenge).',
      relevanceScore: 86
    };
  }

  // English fallback
  if (userTextLower.includes('ai') || userTextLower.includes('data') || userTextLower.includes('software') || userTextLower.includes('developer')) {
    return {
      replyText: 'That sounds like an exciting technical journey! What specific project or engineering challenge have you built that you feel most proud of?',
      grammarCorrection: 'Ensure consistent verb tenses when describing ongoing studies versus completed past projects.',
      vocabularyNote: 'Consider powerful action verbs like "spearheaded", "architected", or "optimized" when discussing project achievements.',
      relevanceScore: 94
    };
  }

  return {
    replyText: 'That is great context. When collaborating on complex codebases, how do you communicate technical blockers or architecture decisions with your team?',
    grammarCorrection: null,
    vocabularyNote: 'Tip: Phrases like "cross-functional alignment" and "iterative delivery" make your technical communication stand out to recruiters.',
    relevanceScore: 88
  };
}

export function evaluateConversation(messages: Array<{ sender: 'ai' | 'user'; message: string }>): ConversationEvaluationResult {
  const userMessages = messages.filter(m => m.sender === 'user');
  const userWordCount = userMessages.reduce((sum, m) => sum + m.message.split(/\s+/).length, 0);

  const fluencyScore = Math.min(95, Math.max(65, Math.round(70 + userWordCount * 1.5)));
  const grammarScore = 84;
  const vocabularyScore = 82;
  const conversationContinuity = 90;
  const overallScore = Math.round((fluencyScore * 0.35 + grammarScore * 0.25 + vocabularyScore * 0.25 + conversationContinuity * 0.15));

  return {
    overallScore,
    fluencyScore,
    grammarScore,
    vocabularyScore,
    conversationContinuity,
    strengths: [
      'Responded with good dialogue continuity and clear conversational intent.',
      'Appropriately utilized technical context and professional tone.'
    ],
    improvements: [
      'Expand on specific project outcomes and metrics when answering open-ended inquiries.',
      'Incorporate more specialized industry vocabulary to boost professional fluency.'
    ],
    summaryFeedback: `Candidate demonstrated solid conversational engagement with a total fluency rating of ${fluencyScore}% and strong conversational continuity.`
  };
}
