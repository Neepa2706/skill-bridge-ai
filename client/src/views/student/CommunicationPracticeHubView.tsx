import React, { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  BookMarked,
  Headphones,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Volume2
} from 'lucide-react';
import './CommunicationPracticeHubView.css';

interface CommunicationPracticeHubViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
  initialTab?: 'grammar' | 'vocabulary' | 'reading' | 'listening';
}

export const CommunicationPracticeHubView: React.FC<CommunicationPracticeHubViewProps> = ({
  onNavigate,
  initialLanguage = 'en',
  initialTab = 'grammar'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [activeTab, setActiveTab] = useState<'grammar' | 'vocabulary' | 'reading' | 'listening'>(initialTab);
  const [selectedDrillAnswer, setSelectedDrillAnswer] = useState<number | null>(null);
  const [drillChecked, setDrillChecked] = useState<boolean>(false);

  // Vocabulary Flashcards
  const vocabCards: Record<'en' | 'ja' | 'de', Array<{ word: string; meaning: string; example: string }>> = {
    en: [
      { word: 'Spearheaded', meaning: 'Led an initiative from conception to delivery.', example: 'Spearheaded the migration of the core authentication pipeline to OAuth2.' },
      { word: 'Mitigated', meaning: 'Reduced severity, vulnerability, or failure probability.', example: 'Mitigated DDoS risks by configuring token-bucket rate limiting in Redis.' },
      { word: 'Streamlined', meaning: 'Optimized a process to reduce steps and overhead.', example: 'Streamlined continuous integration build durations from 20 to 5 minutes.' },
      { word: 'Diagnosed', meaning: 'Investigated and pinpointed the root cause of an issue.', example: 'Diagnosed a circular reference memory leak via heap profile snapshots.' },
      { word: 'Idempotent', meaning: 'Yields identical system state when invoked multiple times.', example: 'Payment charge endpoints must be idempotent to prevent double billing.' },
      { word: 'Benchmarked', meaning: 'Measured execution performance against baselines.', example: 'Benchmarked PostgreSQL connection pool scaling up to 10,000 active sockets.' }
    ],
    ja: [
      { word: 'デプロイ (Depuroi)', meaning: 'Deploying software artifacts to servers.', example: '金曜日の午後は本番環境へのデプロイを避けます。' },
      { word: '仕様書 (Shiyousho)', meaning: 'Technical specifications document.', example: '新機能の仕様書を確認し、見積もりを提出しました。' },
      { word: '報・連・相 (Hou-Ren-So)', meaning: 'Report, communicate, and consult.', example: '問題が発生した際は、速やかに報連相を行います。' },
      { word: '不具合 / バグ (Fuguai / Bagu)', meaning: 'Software bug or defect.', example: 'データベースの接続タイムアウト不具合を修正しました。' },
      { word: 'お疲れ様です (Otsukaresama desu)', meaning: 'Standard professional greeting for colleagues.', example: '皆さん、本日もお疲れ様でした。' },
      { word: '合意形成 (Goui keisei)', meaning: 'Building technical consensus across teams.', example: 'マイクロサービス分割に向けてアーキテクチャの合意形成を図る。' }
    ],
    de: [
      { word: 'Die Softwareentwicklung', meaning: 'Software development.', example: 'Moderne Softwareentwicklung erfordert sauberen Code und Tests.' },
      { word: 'Die Schnittstelle', meaning: 'API or Interface.', example: 'Die REST-Schnittstelle liefert JSON-Daten innerhalb von 50 ms.' },
      { word: 'Die Fehlerbehebung', meaning: 'Troubleshooting / bug fixing.', example: 'Die Fehlerbehebung wurde im aktuellen Sprint erfolgreich abgeschlossen.' },
      { word: 'Der Quellcode', meaning: 'Source code.', example: 'Der Quellcode wird im Git-Repository versioniert.' },
      { word: 'Die Skalierbarkeit', meaning: 'Scalability.', example: 'Horizontale Skalierbarkeit ist essenziell für verteilte Webservices.' },
      { word: 'Die Abnahme', meaning: 'Formal acceptance / sign-off.', example: 'Vor der Abnahme durch den Kunden führen wir End-to-End-Tests durch.' }
    ]
  };

  const cards = vocabCards[languageCode] || vocabCards.en;

  return (
    <div className="comm-hub-container">
      {/* Header */}
      <div className="comm-hub-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('communication-dashboard')}
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Communication Practice Drills Hub
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Targeted micro-drills to sharpen grammar, expand vocabulary, and analyze engineering RFCs.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['en', 'ja', 'de'] as const).map(l => (
            <button
              key={l}
              className={`comm-preset-btn ${languageCode === l ? 'active' : ''}`}
              onClick={() => { setLanguageCode(l); setDrillChecked(false); setSelectedDrillAnswer(null); }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="comm-hub-tabs">
        <button
          className={`comm-hub-tab-btn ${activeTab === 'grammar' ? 'active' : ''}`}
          onClick={() => { setActiveTab('grammar'); setDrillChecked(false); }}
        >
          <CheckCircle2 size={16} /> Grammar Precision
        </button>
        <button
          className={`comm-hub-tab-btn ${activeTab === 'vocabulary' ? 'active' : ''}`}
          onClick={() => setActiveTab('vocabulary')}
        >
          <Sparkles size={16} /> Placement Vocabulary
        </button>
        <button
          className={`comm-hub-tab-btn ${activeTab === 'reading' ? 'active' : ''}`}
          onClick={() => setActiveTab('reading')}
        >
          <BookMarked size={16} /> Technical Reading Labs
        </button>
        <button
          className={`comm-hub-tab-btn ${activeTab === 'listening' ? 'active' : ''}`}
          onClick={() => setActiveTab('listening')}
        >
          <Headphones size={16} /> Standup Listening
        </button>
      </div>

      {/* Tab 1: Grammar Drill */}
      {activeTab === 'grammar' && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Interactive Grammar Drill ({languageCode.toUpperCase()})
            </span>
          </div>

          <div style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.4 }}>
            {languageCode === 'ja'
              ? '丁寧語の文法問題：過去のプロジェクト成果を面接官に報告する際、最も適切な動詞表現を選んでください。'
              : languageCode === 'de'
              ? 'Deutsche Grammatik (V2-Regel): Welcher Satz mit "Gestern" an Position 1 ist korrekt?'
              : 'Choose the correct verb form for technical milestone reporting: "Last week, our distributed database team ___ zero deadlock anomalies during peak throughput."'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(languageCode === 'ja'
              ? ['開発するです。', '開発いたしました。', '開発しただった。', '開発しているでした。']
              : languageCode === 'de'
              ? ['Gestern wir haben die API optimiert.', 'Gestern haben wir die API optimiert.', 'Gestern optimiert haben wir die API.', 'Gestern haben die API wir optimiert.']
              : ['has observed', 'observed', 'was observing', 'is observed']
            ).map((opt, idx) => {
              const isSelected = selectedDrillAnswer === idx;
              const isCorrect = idx === 1;
              return (
                <button
                  key={idx}
                  className={`comm-asmt-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => { setSelectedDrillAnswer(idx); setDrillChecked(false); }}
                  style={{
                    borderColor: drillChecked && isSelected
                      ? (isCorrect ? '#4ade80' : '#f87171')
                      : undefined
                  }}
                >
                  <div className="comm-asmt-opt-indicator">{String.fromCharCode(65 + idx)}</div>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {drillChecked && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px 20px', borderRadius: '12px', borderLeft: selectedDrillAnswer === 1 ? '4px solid #4ade80' : '4px solid #f87171' }}>
              <div style={{ fontWeight: 700, color: selectedDrillAnswer === 1 ? '#4ade80' : '#f87171', marginBottom: '4px' }}>
                {selectedDrillAnswer === 1 ? '✓ Correct Answer!' : '✗ Incorrect choice'}
              </div>
              <p style={{ fontSize: '13.5px', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                {languageCode === 'ja'
                  ? '「〜いたしました」は謙譲語を用いた自然で品格のあるビジネス表現です。'
                  : languageCode === 'de'
                  ? 'Nach der V2-Regel muss das konjugierte Verb "haben" an der 2. Position stehen, wenn "Gestern" die 1. Position besetzt.'
                  : 'Past simple ("observed") must be used with specific completed past time markers like "last week".'}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setSelectedDrillAnswer(null); setDrillChecked(false); }}
            >
              <RotateCcw size={15} style={{ marginRight: '6px' }} /> Try Again
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedDrillAnswer === null}
              onClick={() => setDrillChecked(true)}
            >
              Check Answer
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Vocabulary Flashcards */}
      {activeTab === 'vocabulary' && (
        <div>
          <div style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '14px' }}>
            High-impact action verbs and precision terminology for {languageCode === 'en' ? 'English' : languageCode === 'ja' ? 'Japanese' : 'German'}:
          </div>
          <div className="comm-flashcards-grid">
            {cards.map((c, i) => (
              <div key={i} className="comm-flashcard">
                <div className="comm-card-word">{c.word}</div>
                <div className="comm-card-meaning">{c.meaning}</div>
                <div className="comm-card-example">"{c.example}"</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Reading RFC Lab */}
      {activeTab === 'reading' && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Architecture RFC Reading Lab ({languageCode.toUpperCase()})
          </span>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderLeft: '4px solid #34d399', padding: '16px 20px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6, color: '#e2e8f0' }}>
            {languageCode === 'ja'
              ? '【RFC-204: データベースのコネクションプール最適化】高負荷時の502エラーを回避するため、同時接続数を20から80へ引き上げます。トレードオフとして、データベースサーバーのメモリ消費量が約1.2GB増加するため、監視アラートの閾値を再設定します。'
              : languageCode === 'de'
              ? '【RFC-302: Einführung von Event-Driven Architecture】Zur Entkopplung des Checkout-Dienstes ersetzen wir synchrone HTTP-Aufrufe durch Kafka-Topics. Vorteil: Ausfallsicherheit. Nachteil: Eventuelle Konsistenz (Eventual Consistency) erfordert WebSocket-Polling auf der Bestätigungsseite.'
              : 'RFC-412: Decoupling Notification Engine with SQS. We propose replacing synchronous email dispatch with an Amazon SQS FIFO queue. While this guarantees at-least-once delivery, downstream consumers must implement deduplication logic using message ID hashing.'}
          </div>

          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            {languageCode === 'ja'
              ? 'このRFCでコネクションプールを引き上げる際のトレードオフは何ですか？'
              : languageCode === 'de'
              ? 'Welche Herausforderung bringt die Eventual Consistency für die Benutzeroberfläche mit sich?'
              : 'What requirement is placed on downstream consumers in RFC-412?'}
          </div>

          <div style={{ fontSize: '14px', color: '#38bdf8', padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px' }}>
            💡 <strong>Key Architectural Takeaway:</strong> Engineering RFCs require reading beyond features to evaluate memory footprints, consistency guarantees, and downstream idempotency.
          </div>
        </div>
      )}

      {/* Tab 4: Standup Listening Simulations */}
      {activeTab === 'listening' && (
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Agile Standup Audio Simulation ({languageCode.toUpperCase()})
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '18px 22px', borderRadius: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#38bdf8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🔊
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Sprint Standup Announcement</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Speaker: Engineering Team Lead (Duration: 12s)</div>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px 20px', borderRadius: '10px', fontStyle: 'italic', color: '#cbd5e1', fontSize: '14.5px', lineHeight: 1.6 }}>
            {languageCode === 'ja'
              ? '「皆さん、お疲れ様です。本日の午後3時からステージング環境のカーネルアップデートを実施します。3時から3時半の間はステージングへのデプロイを一時停止してください。」'
              : languageCode === 'de'
              ? '„Guten Morgen Team. Bitte beachtet, dass wir heute um 14 Uhr ein wichtiges Code-Review für das Zahlungsmodul durchführen. Bitte haltet euch diesen Termin frei.“'
              : '"Hey team, heads up: the staging Kubernetes cluster is getting a rolling patch at 3 PM today. Please hold off on staging deployments between 3:00 and 3:30 PM."'}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
            Comprehension Check: What action is requested between 3:00 PM and 3:30 PM?
          </div>
          <div style={{ fontSize: '13.5px', color: '#4ade80' }}>
            ✓ Engineers must pause all deployments to the staging cluster during the kernel patch window.
          </div>
        </div>
      )}
    </div>
  );
};
