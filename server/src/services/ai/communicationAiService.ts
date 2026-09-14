/**
 * SkillBridge AI - Multilingual AI Communication & Assessment Service
 * Step 10: Communication and Language Learning System
 */

import { gemini } from './gemini.client.js';
import {
  clampScore,
  getSkillBridgeLevel,
  evaluateSpeakingResponse,
  evaluateWritingResponse,
  logCommunicationEvidence,
  recordCommunicationActivity
} from './communicationScoringEngine.js';

export interface AssessmentQuestion {
  id: string;
  category: 'grammar' | 'vocabulary' | 'reading' | 'listening';
  prompt: string;
  contextText?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AssessmentReport {
  overallScore: number;
  level: number;
  levelName: string;
  speakingScore: number;
  listeningScore: number;
  readingScore: number;
  writingScore: number;
  grammarScore: number;
  vocabularyScore: number;
  pronunciationScore: number;
  conversationScore: number;
  summary: string;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
}

export interface ConversationTurnReply {
  replyText: string;
  grammarCorrection: string | null;
  vocabularyNote: string | null;
  relevanceScore: number;
  suggestedFollowUp?: string;
}

// Curated 12-question diagnostic baselines for English, Japanese, and German
const ASSESSMENT_BANK: Record<'en' | 'ja' | 'de', AssessmentQuestion[]> = {
  en: [
    // Grammar
    {
      id: 'en-q1',
      category: 'grammar',
      prompt: 'Choose the correct verb form: "Over the past six months, our engineering team ___ three major distributed services."',
      options: ['deploys', 'has deployed', 'deploying', 'was deploy'],
      correctIndex: 1,
      explanation: '"Over the past six months" indicates an action spanning an unfinished time frame up to the present, requiring the present perfect ("has deployed").',
      difficulty: 'medium'
    },
    {
      id: 'en-q2',
      category: 'grammar',
      prompt: 'Select the sentence with correct conditional structure for hypothetical system design:',
      options: [
        'If we would scale horizontally, we will handle more throughput.',
        'If we scaled horizontally, we would handle significantly more throughput.',
        'If we scale horizontally, we would handled more throughput.',
        'If we had scale horizontally, we will handle more throughput.'
      ],
      correctIndex: 1,
      explanation: 'Second conditional uses past simple in the if-clause ("scaled") and "would + base verb" in the main clause ("would handle").',
      difficulty: 'medium'
    },
    {
      id: 'en-q3',
      category: 'grammar',
      prompt: 'Identify the error-free technical explanation:',
      options: [
        'Neither the load balancer nor the web servers was responding to health checks.',
        'Neither the load balancer nor the web servers were responding to health checks.',
        'Neither the load balancer nor the web servers is responding to health checks.',
        'Neither the load balancer nor the web servers having responded to health checks.'
      ],
      correctIndex: 1,
      explanation: 'With "neither... nor...", the verb agrees in number with the subject closest to it ("the web servers" is plural -> "were responding").',
      difficulty: 'hard'
    },
    // Vocabulary
    {
      id: 'en-q4',
      category: 'vocabulary',
      prompt: 'Which verb best conveys proactive leadership: "I ___ the migration of our monolithic API to microservices"?',
      options: ['did', 'spearheaded', 'happened', 'looked at'],
      correctIndex: 1,
      explanation: '"Spearheaded" is an impactful action verb indicating initiated and led an important project.',
      difficulty: 'easy'
    },
    {
      id: 'en-q5',
      category: 'vocabulary',
      prompt: 'What does "idempotent" mean in the context of RESTful API operations?',
      options: [
        'An operation that must run in parallel across multiple threads.',
        'An operation that produces the same system state whether called once or multiple times.',
        'An operation that only accepts encrypted JSON payloads.',
        'An operation that cannot be logged.'
      ],
      correctIndex: 1,
      explanation: 'Idempotency ensures making identical requests multiple times has the exact same effect as making a single request.',
      difficulty: 'medium'
    },
    {
      id: 'en-q6',
      category: 'vocabulary',
      prompt: 'Select the best antonym for "redundant" in system architecture:',
      options: ['Duplicate', 'Single point of failure', 'Resilient', 'Replicated'],
      correctIndex: 1,
      explanation: 'Redundancy provides backup copies; a "single point of failure" has zero backup and represents the direct vulnerability.',
      difficulty: 'medium'
    },
    // Reading
    {
      id: 'en-q7',
      category: 'reading',
      contextText: 'Architecture Decision Record: We selected PostgreSQL over DynamoDB for our core financial ledger. While DynamoDB offers seamless horizontal scale, PostgreSQL provides ACID transactions with strict serializable isolation levels, preventing duplicate deduction anomalies during concurrent withdrawals.',
      prompt: 'What was the determining factor for choosing PostgreSQL?',
      options: [
        'DynamoDB was too expensive for initial deployment.',
        'ACID transactions and serializable isolation to prevent duplicate deductions.',
        'PostgreSQL handles faster horizontal sharding.',
        'PostgreSQL requires zero schema definition.'
      ],
      correctIndex: 1,
      explanation: 'The ADR explicitly highlights ACID transactions with strict serializability to prevent concurrency anomalies.',
      difficulty: 'medium'
    },
    {
      id: 'en-q8',
      category: 'reading',
      contextText: 'Postmortem: A cascading outage occurred at 13:45 UTC when the connection pool timed out. Without an exponential backoff circuit breaker, repeated client retries saturated the primary database cluster, escalating a localized glitch into global service downtime.',
      prompt: 'What architectural safeguard would have prevented the cascade?',
      options: [
        'Disabling all client authentication.',
        'An exponential backoff circuit breaker on client retries.',
        'Removing the connection pool altogether.',
        'Increasing client request frequency.'
      ],
      correctIndex: 1,
      explanation: 'The report states the absence of an exponential backoff circuit breaker led to retry storm saturation.',
      difficulty: 'hard'
    },
    {
      id: 'en-q9',
      category: 'reading',
      contextText: 'Sprint Goal: Deliver the OAuth2 PKCE authorization flow for the mobile client. This flow enhances security for public clients by removing the need to embed client secrets in the client binary.',
      prompt: 'Why is PKCE particularly recommended for mobile applications?',
      options: [
        'It increases the download size of the application.',
        'It eliminates the dangerous requirement of storing client secrets in distributed binaries.',
        'It bypasses SSL certificate pinning.',
        'It avoids using tokens.'
      ],
      correctIndex: 1,
      explanation: 'Public clients (like native mobile apps) cannot securely hide static secrets; PKCE eliminates this need.',
      difficulty: 'medium'
    },
    // Listening
    {
      id: 'en-q10',
      category: 'listening',
      contextText: '[Simulated Audio: "Team, during tomorrow morning\'s deployment window from 4 AM to 5 AM UTC, database replicas will temporarily lag by up to 2 seconds. Read-heavy analytics jobs must be deferred until 6 AM."]',
      prompt: 'According to the standup announcement, when should read-heavy analytics queries be executed?',
      options: ['Immediately during the 4 AM window', 'After 6 AM UTC', 'During the 5 AM lag window', 'Never on database replicas'],
      correctIndex: 1,
      explanation: 'The speaker directed that analytics jobs must be deferred until 6 AM to avoid replication lag issues.',
      difficulty: 'easy'
    },
    {
      id: 'en-q11',
      category: 'listening',
      contextText: '[Simulated Audio: "In our behavioral interview, I am looking for your personal ownership. Even when talking about your team, use \'I\' to delineate the specific algorithm or PR you owned."]',
      prompt: 'What advice does the engineering interviewer emphasize for behavioral rounds?',
      options: [
        'Always speak only in passive voice.',
        'Clarify your specific personal contribution and ownership using "I".',
        'Avoid mentioning any individual PRs.',
        'Only discuss executive management decisions.'
      ],
      correctIndex: 1,
      explanation: 'Interviewers seek clear delineation of the candidate\'s own contribution.',
      difficulty: 'medium'
    },
    {
      id: 'en-q12',
      category: 'listening',
      contextText: '[Simulated Audio: "We noticed memory spikes occurring specifically when the garbage collector runs mark-and-sweep on circular buffer references. We need to nullify detached DOM nodes."]',
      prompt: 'What is identified as the root cause of the memory spikes?',
      options: [
        'Exhausted hard drive space.',
        'Circular buffer references during garbage collector passes on unreferenced nodes.',
        'Overclocked CPU cores.',
        'Missing CSS stylesheets.'
      ],
      correctIndex: 1,
      explanation: 'The speaker highlighted garbage collector sweeps over circular references.',
      difficulty: 'hard'
    }
  ],

  ja: [
    // Japanese diagnostic
    {
      id: 'ja-q1',
      category: 'grammar',
      prompt: '空欄に入る最も適切な助詞を選んでください：「私は大学___コンピュータサイエンスを専攻しています。」',
      options: ['に', 'で', 'を', 'へ'],
      correctIndex: 1,
      explanation: '場所で動作や専攻活動を行う場合は助詞「で」を用います。',
      difficulty: 'easy'
    },
    {
      id: 'ja-q2',
      category: 'grammar',
      prompt: 'ビジネスでの丁寧な表現として最も適切なものを選んでください：「この仕様書を___いただけますでしょうか。」',
      options: ['見て', 'ご確認', '見る', '見られて'],
      correctIndex: 1,
      explanation: '「ご確認いただく」はビジネスで相手に確認を依頼する際の標準的な敬語表現です。',
      difficulty: 'medium'
    },
    {
      id: 'ja-q3',
      category: 'grammar',
      prompt: '完了したプロジェクトの報告として最も自然な敬語はどれですか：',
      options: [
        '先週、APIの最適化を完了いたしました。',
        '先週、APIの最適化を完了するです。',
        '先週、APIの最適化を完了したでしょう。',
        '先週、APIの最適化を完了しているでした。'
      ],
      correctIndex: 0,
      explanation: '「完了いたしました」は謙譲の「いたす」を用いた自然で正確な報告表現です。',
      difficulty: 'medium'
    },
    // Vocabulary
    {
      id: 'ja-q4',
      category: 'vocabulary',
      prompt: 'ITの現場で「本番サーバーに新しいコードを反映すること」を何と呼びますか：',
      options: ['バックアップ (Backup)', 'デプロイ (Deploy)', 'コミット (Commit)', 'リファクタ (Refactor)'],
      correctIndex: 1,
      explanation: '本番環境やステージング環境への成果物反映は「デプロイ (Deploy)」と呼びます。',
      difficulty: 'easy'
    },
    {
      id: 'ja-q5',
      category: 'vocabulary',
      prompt: '日本のビジネス文化における「報・連・相 (ホウレンソウ)」の組み合わせとして正しいものはどれですか：',
      options: [
        '報告・連絡・相談',
        '訪問・練習・参加',
        '翻訳・連載・総合',
        '計画・連絡・送金'
      ],
      correctIndex: 0,
      explanation: '「報告 (Houkoku)」「連絡 (Renraku)」「相談 (Soudan)」が日本の職場の基本コミュニケーションです。',
      difficulty: 'easy'
    },
    {
      id: 'ja-q6',
      category: 'vocabulary',
      prompt: '「不具合や欠陥を修正する作業」を指す最も適切な語彙を選んでください：',
      options: ['要件定義', 'バグ修正 / デバッグ', '仕様変更', 'キックオフ'],
      correctIndex: 1,
      explanation: 'ソフトウェアの欠陥修正は「バグ修正」または「デバッグ」と表現します。',
      difficulty: 'medium'
    },
    // Reading
    {
      id: 'ja-q7',
      category: 'reading',
      contextText: '業務連絡：明日の午前10時より、ステージング環境のデータベース移行作業を行います。作業中はAPI接続が一時的に遮断されるため、開発チームは事前ローカル環境でのテスト実行をお願いいたします。',
      prompt: '明日の午前10時に開発チームがとるべき対応は何ですか：',
      options: [
        'ステージング環境に直接アクセスする',
        'ローカル環境でテストを実行する',
        '本番サーバーを再起動する',
        '業務を中止する'
      ],
      correctIndex: 1,
      explanation: '本文に「開発チームは事前ローカル環境でのテスト実行をお願いいたします」と記載されています。',
      difficulty: 'easy'
    },
    {
      id: 'ja-q8',
      category: 'reading',
      contextText: '障害報告書：今回のレスポンス遅延は、インデックスが未設定の外部キー検索に対して、同時アクセス数が急増したことが主因です。テーブルに複合インデックスを追加した結果、クエリ実行時間が平均85%改善されました。',
      prompt: '遅延の原因を解決するために実施された対策は何ですか：',
      options: [
        'サーバー台数を減らした',
        '複合インデックスを追加した',
        '外部キーを全て削除した',
        'アクセスを拒否した'
      ],
      correctIndex: 1,
      explanation: '「テーブルに複合インデックスを追加した結果、クエリ実行時間が改善」と明記されています。',
      difficulty: 'medium'
    },
    {
      id: 'ja-q9',
      category: 'reading',
      contextText: '面接ガイド：技術面接では、単に技術用語を並べるのではなく、「なぜその技術を選定したのか」「どのような技術的トレードオフが存在したか」を論理的に説明できることが高く評価されます。',
      prompt: 'この企業が技術面接で重視しているポイントは何ですか：',
      options: [
        'できるだけ多くの技術用語を暗記すること',
        '技術選定の理由やトレードオフを論理的に説明すること',
        '質問に答えず自慢話のみをすること',
        '短い返答だけで終わらせること'
      ],
      correctIndex: 1,
      explanation: '「なぜその技術を選定したのか、トレードオフを論理的に説明できること」が評価基準です。',
      difficulty: 'medium'
    },
    // Listening
    {
      id: 'ja-q10',
      category: 'listening',
      contextText: '[音声シミュレーション：「お疲れ様です。本日のデイリースクラムですが、定刻の11時ではなく、クライアントミーティング終了後の11時半から開始します。」]',
      prompt: '本日のデイリースクラムは何時に始まりますか：',
      options: ['10時30分', '11時00分', '11時30分', '12時00分'],
      correctIndex: 2,
      explanation: '「11時半から開始します」とアナウンスされています。',
      difficulty: 'easy'
    },
    {
      id: 'ja-q11',
      category: 'listening',
      contextText: '[音声シミュレーション：「コードレビューありがとうございます。ご指摘いただいた非同期処理のエラーハンドリング部分を修正し、プルリクエストを更新しました。」]',
      prompt: '話者はコードレビューを受けてどのような対応を行いましたか：',
      options: [
        'プルリクエストを削除した',
        '非同期処理のエラーハンドリングを修正してPRを更新した',
        'レビューの指摘を無視した',
        '新しいリポジトリを作成した'
      ],
      correctIndex: 1,
      explanation: '非同期処理のエラーハンドリングを修正し、PRを更新したと伝えています。',
      difficulty: 'medium'
    },
    {
      id: 'ja-q12',
      category: 'listening',
      contextText: '[音声シミュレーション：「来期から導入するマイクロサービス化に向けて、まずは認証サービスを切り離すPoCを今週中に完了させたいと考えています。」]',
      prompt: '今週中に完了を目指しているPoCの対象は何ですか：',
      options: ['決済サービス', '認証サービス', '通知サービス', '検索サービス'],
      correctIndex: 1,
      explanation: '「認証サービスを切り離すPoCを今週中に完了させたい」と述べています。',
      difficulty: 'medium'
    }
  ],

  de: [
    // German diagnostic
    {
      id: 'de-q1',
      category: 'grammar',
      prompt: 'Wählen Sie das richtige konjugierte Verb: "Heute ___ der Softwareentwickler die Schnittstelle."',
      options: ['implementieren', 'implementiert', 'implementierst', 'implementierte'],
      correctIndex: 1,
      explanation: 'In der 3. Person Singular Präsens (der Entwickler) lautet die Endung "-t" ("implementiert"). Gemäß V2-Regel steht das Verb an Position 2.',
      difficulty: 'easy'
    },
    {
      id: 'de-q2',
      category: 'grammar',
      prompt: 'Welcher Nebensatz mit "weil" ist grammatikalisch korrekt?',
      options: [
        '...weil ich die Datenbank optimieren möchte.',
        '...weil ich möchte die Datenbank optimieren.',
        '...weil möchte ich optimieren die Datenbank.',
        '...weil die Datenbank ich optimieren möchte.'
      ],
      correctIndex: 0,
      explanation: 'Im Nebensatz mit "weil" stehen die konjugierten Verben ganz am Ende ("...optimieren möchte").',
      difficulty: 'medium'
    },
    {
      id: 'de-q3',
      category: 'grammar',
      prompt: 'Setzen Sie ins Perfekt: "Wir haben den Fehler gestern erfolgreich ___."',
      options: ['beheben', 'behoben', 'gebehebt', 'behebt'],
      correctIndex: 1,
      explanation: 'Das Partizip II von "beheben" ist unregelmäßig und lautet "behoben" ("haben behoben").',
      difficulty: 'medium'
    },
    // Vocabulary
    {
      id: 'de-q4',
      category: 'vocabulary',
      prompt: 'Was bedeutet der deutsche Begriff "die Schnittstelle"?',
      options: ['Database', 'Interface / API', 'Hard drive', 'Keyboard'],
      correctIndex: 1,
      explanation: '"Die Schnittstelle" ist der deutsche Fachbegriff für "Interface" oder "API".',
      difficulty: 'easy'
    },
    {
      id: 'de-q5',
      category: 'vocabulary',
      prompt: 'Welches Wort beschreibt das Auffinden und Beseitigen von Softwareproblemen?',
      options: ['Die Fehlerbehebung', 'Die Softwarelizenz', 'Das Handbuch', 'Die Bildschirmauflösung'],
      correctIndex: 0,
      explanation: '"Die Fehlerbehebung" entspricht dem englischen "troubleshooting" oder "bug fixing".',
      difficulty: 'easy'
    },
    {
      id: 'de-q6',
      category: 'vocabulary',
      prompt: 'Welches deutsche Nomen bezeichnet den "Quellcode" eines Programms?',
      options: ['Der Bildschirmschoner', 'Der Quellcode / Quelltext', 'Die Festplatte', 'Der Druckertreiber'],
      correctIndex: 1,
      explanation: '"Der Quellcode" bzw. "Quelltext" ist das direkte deutsche Pendant zu "source code".',
      difficulty: 'easy'
    },
    // Reading
    {
      id: 'de-q7',
      category: 'reading',
      contextText: 'Sprint-Mitteilung: Um die Latenz unserer Webanwendung zu verringern, haben wir Redis als Caching-Schicht integriert. Häufig abgefragte Benutzerdaten werden nun im Arbeitsspeicher gehalten.',
      prompt: 'Welche Technologie wurde zur Latenzreduzierung integriert?',
      options: ['MongoDB', 'Redis', 'PostgreSQL', 'Docker'],
      correctIndex: 1,
      explanation: 'Der Text besagt eindeutig: "haben wir Redis als Caching-Schicht integriert".',
      difficulty: 'easy'
    },
    {
      id: 'de-q8',
      category: 'reading',
      contextText: 'Stellenanzeige: Für unseren Standort in München suchen wir einen Backend-Entwickler. Neben soliden Kenntnissen in Python setzen wir eigenverantwortliches Arbeiten und Freude an agilen Methoden wie Scrum voraus.',
      prompt: 'Welche Arbeitsweise wird in der Stellenanzeige explizit vorausgesetzt?',
      options: ['Reine Einzelarbeit ohne Teamkontakt', 'Eigenverantwortliches Arbeiten und agile Methoden wie Scrum', 'Ausschließlich Wasserfallmodell', 'Verzicht auf Code-Reviews'],
      correctIndex: 1,
      explanation: 'Die Anzeige nennt: "eigenverantwortliches Arbeiten und Freude an agilen Methoden wie Scrum".',
      difficulty: 'medium'
    },
    {
      id: 'de-q9',
      category: 'reading',
      contextText: 'Sicherheitsrichtlinie: Passwörter dürfen niemals im Klartext in der Datenbank gespeichert werden. Vor dem Speichern muss ein kryptografischer Hash mit Salt (z.B. Argon2 oder bcrypt) generiert werden.',
      prompt: 'Was verlangt die Sicherheitsrichtlinie vor der Speicherung von Passwörtern?',
      options: [
        'Speicherung als unverschlüsselter Klartext',
        'Generierung eines kryptografischen Hashs mit Salt (z.B. bcrypt)',
        'Versand per E-Mail an den Administrator',
        'Löschung aller Benutzerkonten'
      ],
      correctIndex: 1,
      explanation: 'Die Richtlinie fordert einen kryptografischen Hash mit Salt vor dem Abspeichern.',
      difficulty: 'medium'
    },
    // Listening
    {
      id: 'de-q10',
      category: 'listening',
      contextText: '[Audiosimulation: "Guten Morgen zusammen. Bitte beachtet, dass unser wöchentliches Retrospektive-Meeting heute um eine Stunde nach hinten verschoben wird – also um 15 Uhr statt um 14 Uhr."]',
      prompt: 'Wann findet das Retrospektive-Meeting heute statt?',
      options: ['13:00 Uhr', '14:00 Uhr', '15:00 Uhr', '16:00 Uhr'],
      correctIndex: 2,
      explanation: 'Der Sprecher kündigt an: "also um 15 Uhr statt um 14 Uhr".',
      difficulty: 'easy'
    },
    {
      id: 'de-q11',
      category: 'listening',
      contextText: '[Audiosimulation: "Ich habe den Unit-Test für den Warenkorb ergänzt. Alle 42 Testfälle laufen jetzt grün durch."]',
      prompt: 'Wie ist der aktuelle Status der Unit-Tests für den Warenkorb?',
      options: ['Alle 42 Tests schlagen fehl', 'Alle 42 Testfälle laufen erfolgreich (grün) durch', 'Die Tests wurden gelöscht', 'Es gibt nur einen Testfall'],
      correctIndex: 1,
      explanation: 'Der Entwickler berichtet: "Alle 42 Testfälle laufen jetzt grün durch".',
      difficulty: 'easy'
    },
    {
      id: 'de-q12',
      category: 'listening',
      contextText: '[Audiosimulation: "Im Vorstellungsgespräch ist es wichtig, dass Sie Ihre Rolle im Projekt genau definieren: Was war Ihr Beitrag, welche Bibliotheken haben Sie genutzt und wie haben Sie Probleme gelöst?"]',
      prompt: 'Was sollten Bewerber im Vorstellungsgespräch laut Aussage verdeutlichen?',
      options: [
        'Nur die Fehler anderer Teammitglieder aufzählen',
        'Den eigenen konkreten Beitrag, genutzte Bibliotheken und Problemlösungen darstellen',
        'Möglichst wenig über technische Details sprechen',
        'Keine Fragen beantworten'
      ],
      correctIndex: 1,
      explanation: 'Eigener Beitrag, Technologien und Problemlösungskompetenz stehen im Mittelpunkt.',
      difficulty: 'medium'
    }
  ]
};

/**
 * Returns diagnostic questions for a language
 */
export function getAssessmentQuestions(languageCode: 'en' | 'ja' | 'de'): AssessmentQuestion[] {
  return ASSESSMENT_BANK[languageCode] || ASSESSMENT_BANK.en;
}

/**
 * Evaluates completed diagnostic assessment
 */
export function evaluateDiagnosticAssessment(params: {
  languageCode: 'en' | 'ja' | 'de';
  answers: Array<{ questionId: string; selectedIndex: number }>;
}): AssessmentReport {
  const { languageCode, answers } = params;
  const safeAnswers = Array.isArray(answers) ? answers : [];
  const questions = getAssessmentQuestions(languageCode);

  let grammarCorrect = 0, grammarTotal = 0;
  let vocabCorrect = 0, vocabTotal = 0;
  let readingCorrect = 0, readingTotal = 0;
  let listeningCorrect = 0, listeningTotal = 0;

  for (const q of questions) {
    if (q.category === 'grammar') grammarTotal++;
    else if (q.category === 'vocabulary') vocabTotal++;
    else if (q.category === 'reading') readingTotal++;
    else if (q.category === 'listening') listeningTotal++;

    const studentAnswer = safeAnswers.find(a => a.questionId === q.id);
    if (studentAnswer && studentAnswer.selectedIndex === q.correctIndex) {
      if (q.category === 'grammar') grammarCorrect++;
      else if (q.category === 'vocabulary') vocabCorrect++;
      else if (q.category === 'reading') readingCorrect++;
      else if (q.category === 'listening') listeningCorrect++;
    }
  }

  const grammarScore = clampScore(grammarTotal > 0 ? (grammarCorrect / grammarTotal) * 100 : 70);
  const vocabularyScore = clampScore(vocabTotal > 0 ? (vocabCorrect / vocabTotal) * 100 : 70);
  const readingScore = clampScore(readingTotal > 0 ? (readingCorrect / readingTotal) * 100 : 70);
  const listeningScore = clampScore(listeningTotal > 0 ? (listeningCorrect / listeningTotal) * 100 : 70);

  // Derive estimated speaking, writing, pronunciation, conversation baselines
  const speakingScore = clampScore((grammarScore * 0.4 + vocabularyScore * 0.4 + listeningScore * 0.2) * 0.95);
  const writingScore = clampScore((grammarScore * 0.5 + vocabularyScore * 0.3 + readingScore * 0.2));
  const pronunciationScore = clampScore((listeningScore * 0.6 + speakingScore * 0.4) * 0.92);
  const conversationScore = clampScore((speakingScore * 0.5 + listeningScore * 0.5));

  const overallScore = clampScore(
    grammarScore * 0.15 +
    vocabularyScore * 0.15 +
    readingScore * 0.15 +
    listeningScore * 0.15 +
    speakingScore * 0.15 +
    writingScore * 0.10 +
    pronunciationScore * 0.05 +
    conversationScore * 0.10
  );

  const levelInfo = getSkillBridgeLevel(overallScore);

  const strengths: string[] = [];
  const growthAreas: string[] = [];
  const recommendations: string[] = [];

  if (readingScore >= 75) strengths.push('Strong reading comprehension of technical documentation and specs.');
  else growthAreas.push('Improve technical reading speed and architectural RFC comprehension.');

  if (grammarScore >= 75) strengths.push('Accurate grammatical foundations and proper verb conjugations.');
  else growthAreas.push('Reinforce tense consistency and complex sentence structures.');

  if (vocabularyScore >= 75) strengths.push('Rich engineering vocabulary and precise action verbs.');
  else growthAreas.push('Expand professional tech lexicon and industry terminology.');

  if (listeningScore >= 75) strengths.push('High listening comprehension in sprint standups and technical debriefs.');
  else growthAreas.push('Practice listening to fast-paced agile standups and requirement briefs.');

  if (strengths.length === 0) {
    const sorted = [
      { name: 'technical reading comprehension', score: readingScore },
      { name: 'core grammar foundations', score: grammarScore },
      { name: 'technical vocabulary recognition', score: vocabularyScore },
      { name: 'listening retention', score: listeningScore }
    ].sort((a, b) => b.score - a.score);

    strengths.push(`Demonstrated promising baseline proficiency in ${sorted[0].name}.`);
    strengths.push('Conscientiously completed all 12 diagnostic assessment questions.');
  }

  recommendations.push(`Target: Advance to Level ${Math.min(5, levelInfo.level + 1)} in ${languageCode.toUpperCase()}.`);
  recommendations.push('Complete 15 minutes of interactive AI conversation practice daily.');
  recommendations.push('Record 2 speaking practice prompts weekly to refine pronunciation confidence.');

  return {
    overallScore,
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    speakingScore,
    listeningScore,
    readingScore,
    writingScore,
    grammarScore,
    vocabularyScore,
    pronunciationScore,
    conversationScore,
    summary: `SkillBridge Assessment completed for ${languageCode.toUpperCase()}. Assigned ${levelInfo.levelName} with an overall readiness score of ${overallScore}%.`,
    strengths,
    growthAreas,
    recommendations
  };
}

/**
 * Multilingual AI conversation trainer with continuous follow-up questions
 * Modes: daily, professional, placement, group_discussion, presentation
 */
export async function generateConversationTurn(params: {
  languageCode: 'en' | 'ja' | 'de';
  mode: 'daily' | 'professional' | 'placement' | 'group_discussion' | 'presentation';
  topic: string;
  studentMessage: string;
  history: Array<{ sender: 'ai' | 'student'; text: string }>;
}): Promise<ConversationTurnReply> {
  const { languageCode, mode, topic, studentMessage, history } = params;

  const modePrompts: Record<string, string> = {
    daily: 'Conduct natural daily conversation with warmth, polite expressions, and everyday workplace rapport.',
    professional: 'Act as a professional engineering colleague in standups, code reviews, and architecture discussions.',
    placement: 'Act as a senior tech lead conducting a technical and behavioral placement interview with probing follow-ups.',
    group_discussion: 'Moderate a dynamic multi-participant group discussion, challenging arguments and asking for counter-perspectives.',
    presentation: 'Act as an audience member evaluating an engineering tech talk or project presentation, asking insightful Q&A questions.'
  };

  const modePrompt = modePrompts[mode] || modePrompts.professional;

  if (gemini.hasApiKey()) {
    try {
      const historyContext = history.slice(-6).map(h => `${h.sender.toUpperCase()}: ${h.text}`).join('\n');
      const prompt = `System: You are an expert AI Communication and Language Learning Coach on SkillBridge AI.
Target Language: ${languageCode.toUpperCase()}
Mode: ${mode.toUpperCase()} (${modePrompt})
Topic: ${topic}

Recent Conversation History:
${historyContext}
STUDENT: ${studentMessage}

Task:
1. Provide a natural, encouraging, and in-character conversational response in ${languageCode}.
2. ALWAYS ask a thoughtful, relevant follow-up question directly building on what the student said.
3. Check the student's message for grammar and vocabulary. Provide constructive, encouraging feedback.
4. Score the relevance of the student's message from 50 to 100.

Return JSON format:
{
  "replyText": "your response in ${languageCode} with follow-up question",
  "grammarCorrection": "constructive tip or null if grammatically solid",
  "vocabularyNote": "enriching vocabulary suggestion or null",
  "relevanceScore": 85
}`;

      const aiResponse = await gemini.generateJSON<ConversationTurnReply>(prompt);
      if (aiResponse && aiResponse.replyText) {
        return {
          replyText: aiResponse.replyText,
          grammarCorrection: aiResponse.grammarCorrection || null,
          vocabularyNote: aiResponse.vocabularyNote || null,
          relevanceScore: clampScore(aiResponse.relevanceScore || 85)
        };
      }
    } catch (e) {
      console.warn('[Conversation AI] Gemini call failed, using high-quality deterministic fallback:', e);
    }
  }

  // Deterministic multilingual responses
  return getDeterministicConversationReply(languageCode, mode, topic, studentMessage, history.length);
}

function getDeterministicConversationReply(
  languageCode: 'en' | 'ja' | 'de',
  mode: string,
  topic: string,
  message: string,
  turnCount: number
): ConversationTurnReply {
  const lower = message.toLowerCase();

  if (languageCode === 'ja') {
    if (lower.includes('プロジェクト') || lower.includes('開発') || lower.includes('python') || lower.includes('react')) {
      return {
        replyText: '詳しく教えていただきありがとうございます！そのプロジェクトにおいて、最も苦労した技術的な課題やデバッグの経験はありますか？ (Thank you for detailing that! What was the most challenging technical hurdle or debugging experience in that project?)',
        grammarCorrection: '「〜について話します」よりも「〜についてご説明いたします」を使うと、面接で好印象です。',
        vocabularyNote: '「ボトルネックの解消 (eliminating bottlenecks)」や「スケーラビリティ (scalability)」を活用してみましょう。',
        relevanceScore: 94
      };
    }
    return {
      replyText: 'なるほど、よく分かりました。チームで開発を進める際、他のメンバーとの意見の食い違いやコンフリクトをどのように解決していますか？ (I see, very clear. When developing in a team, how do you resolve differences of opinion or merge conflicts?)',
      grammarCorrection: null,
      vocabularyNote: '「合意形成 (consensus building)」や「協調性 (cooperativeness)」がキーワードです。',
      relevanceScore: 88
    };
  }

  if (languageCode === 'de') {
    if (lower.includes('projekt') || lower.includes('entwickelt') || lower.includes('datenbank') || lower.includes('api')) {
      return {
        replyText: 'Sehr spannend! Welche architektonischen Überlegungen waren ausschlaggebend für die Wahl dieses Tech-Stacks? Gab es Alternativen, die du verworfen hast?',
        grammarCorrection: 'Achte auf die korrekte Bildung des Perfekts: "Ich habe implementiert" statt "Ich habe implementiere".',
        vocabularyNote: 'Profi-Wortschatz: "die Skalierbarkeit" (scalability) und "der Architektur-Trade-off".',
        relevanceScore: 92
      };
    }
    return {
      replyText: 'Vielen Dank für deine Ausführung. Wie gehst du vor, wenn du in einem agilen Team mit unvollständigen Anforderungen konfrontiert wirst?',
      grammarCorrection: null,
      vocabularyNote: 'Tipp: Begriffe wie "das Refinement", "die Klärung der Akzeptanzkriterien" und "die Rücksprache".',
      relevanceScore: 88
    };
  }

  // English fallback
  if (lower.includes('project') || lower.includes('system') || lower.includes('built') || lower.includes('api') || lower.includes('database')) {
    return {
      replyText: "That's a very compelling technical highlight. Could you walk me through the key trade-offs you considered, and how you measured the performance impact of your solution?",
      grammarCorrection: "Ensure you use the past simple for specific past milestones (e.g., 'We optimized the query last week').",
      vocabularyNote: "Consider substituting 'worked on' with precise action verbs like 'spearheaded', 'architected', or 'benchmarked'.",
      relevanceScore: 95
    };
  }

  return {
    replyText: "Thank you for elaborating on that. In a high-velocity production environment, how do you prioritize critical bug fixes against feature delivery when deadlines are approaching?",
    grammarCorrection: null,
    vocabularyNote: "Great flow! You can incorporate industry phrases like 'triage severity', 'BLUF updates', and 'technical debt'.",
    relevanceScore: 90
  };
}
