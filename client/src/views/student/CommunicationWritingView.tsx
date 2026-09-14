import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import './CommunicationWritingView.css';

interface CommunicationWritingViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
}

const WRITING_PROMPTS: Record<'en' | 'ja' | 'de', Array<{ id: string; title: string; prompt: string }>> = {
  en: [
    {
      id: 'w1',
      title: 'Emergency Incident Rollback (BLUF)',
      prompt: 'Draft an incident email announcing an immediate database rollback due to connection pool exhaustion during peak load. Follow the BLUF (Bottom Line Up Front) principle.'
    },
    {
      id: 'w2',
      title: 'Pull Request Architecture Debrief',
      prompt: 'Summarize a GitHub PR that replaces synchronous RPC billing calls with an event-driven Kafka stream, detailing trade-offs and testing steps.'
    },
    {
      id: 'w3',
      title: 'Postmortem Root Cause Communication',
      prompt: 'Write a sprint postmortem explaining how an unindexed foreign key caused query latency spikes and how compound indices resolved it.'
    }
  ],
  ja: [
    {
      id: 'w_ja1',
      title: '本番障害と緊急ロールバック報告',
      prompt: '本番環境で502エラーが多発しているため、バージョン2.4.0へ即時ロールバックを実施する旨を、開発リード宛に丁寧なビジネスメールで報告してください。'
    },
    {
      id: 'w_ja2',
      title: 'プルリクエストの概要と確認依頼',
      prompt: '非同期処理のエラーハンドリングを強化したPRを作成しました。変更点とテスト結果をまとめ、コードレビューを依頼する文面を作成してください。'
    }
  ],
  de: [
    {
      id: 'w_de1',
      title: 'E-Mail: Vorfallmeldung & Rollback',
      prompt: 'Schreiben Sie eine formelle E-Mail an das Engineering-Team über einen sofortigen Rollback der Release v2.4.1 wegen Datenbanküberlastung.'
    },
    {
      id: 'w_de2',
      title: 'Pull-Request Zusammenfassung',
      prompt: 'Fassen Sie einen Pull-Request zusammen, der die Latenz durch Redis-Caching um 40% verringert hat, und bitten Sie um Feedback.'
    }
  ]
};

export const CommunicationWritingView: React.FC<CommunicationWritingViewProps> = ({
  onNavigate,
  initialLanguage = 'en'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const presets = WRITING_PROMPTS[languageCode] || WRITING_PROMPTS.en;
  const activePrompt = presets[selectedPromptIndex]?.prompt || '';

  const wordCount = languageCode === 'ja'
    ? Math.max(0, Math.round(text.trim().length / 2.5))
    : text.trim().split(/\s+/).filter(Boolean).length;

  const handleEvaluate = async () => {
    if (!text.trim() || wordCount < 5) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/writing/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          languageCode,
          prompt: activePrompt,
          answer: text.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error('Failed to evaluate writing:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRewrite = () => {
    if (evaluation?.suggestedRewrite) {
      navigator.clipboard.writeText(evaluation.suggestedRewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="comm-writing-container">
      {/* Header & Prompt Selector */}
      <div className="comm-writing-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>
              {languageCode === 'en' ? '🇬🇧' : languageCode === 'ja' ? '🇯🇵' : '🇩🇪'}
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Business & Technical Writing Lab
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['en', 'ja', 'de'] as const).map(l => (
              <button
                key={l}
                className={`comm-preset-btn ${languageCode === l ? 'active' : ''}`}
                onClick={() => { setLanguageCode(l); setSelectedPromptIndex(0); setEvaluation(null); }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="comm-speaking-presets">
          {presets.map((p, idx) => (
            <button
              key={p.id}
              className={`comm-preset-btn ${selectedPromptIndex === idx ? 'active' : ''}`}
              onClick={() => { setSelectedPromptIndex(idx); setEvaluation(null); }}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #ec4899' }}>
          <p style={{ fontSize: '15px', color: '#f1f5f9', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
            "{activePrompt}"
          </p>
        </div>

        {/* Writing Editor */}
        <div className="comm-writing-textarea-wrap">
          <textarea
            className="comm-writing-textarea"
            placeholder="Type your professional email, incident escalation, or PR description here..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="comm-writing-stats-bar">
            <span>
              {wordCount} words • {text.length} characters
              {wordCount < 10 && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>(Target: 15+ words)</span>}
            </span>
            <span>Focus on clear structure (BLUF, action items, metrics)</span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => { setText(''); setEvaluation(null); }}
          >
            <RotateCcw size={15} style={{ marginRight: '6px' }} /> Clear
          </button>
          <button
            className="btn btn-primary"
            disabled={submitting || wordCount < 5}
            onClick={handleEvaluate}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)' }}
          >
            <Sparkles size={16} /> {submitting ? 'Analyzing Draft...' : 'Submit for AI Feedback & Rewrite'}
          </button>
        </div>
      </div>

      {/* Evaluation & Side-by-Side Comparison */}
      {evaluation && (
        <div className="comm-writing-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="comm-scorecard-level-badge">{evaluation.levelAssigned?.levelName}</span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
                Professional Writing Scorecard
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '38px', fontWeight: 800, color: '#ec4899', lineHeight: 1 }}>
                {evaluation.overallScore}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Overall Writing Score</div>
            </div>
          </div>

          {/* 4 Rubric Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <RubricPill label="Task Completion (30%)" score={evaluation.breakdown.taskCompletion.score} color="#ec4899" />
            <RubricPill label="Grammar & Syntax (25%)" score={evaluation.breakdown.grammar.score} color="#fbbf24" />
            <RubricPill label="Vocabulary & Register (25%)" score={evaluation.breakdown.vocabulary.score} color="#a78bfa" />
            <RubricPill label="Clarity & Structure (20%)" score={evaluation.breakdown.clarity.score} color="#38bdf8" />
          </div>

          {/* Side-by-Side Rewrite View */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              Side-by-Side Comparison & Professional Polish
            </h3>
            <div className="comm-side-by-side-grid">
              <div className="comm-compare-box comm-original-box">
                <div className="comm-compare-title" style={{ color: '#94a3b8' }}>
                  <FileText size={16} /> Original Draft
                </div>
                <div className="comm-compare-text">{text}</div>
              </div>

              <div className="comm-compare-box comm-rewrite-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="comm-compare-title" style={{ color: '#ec4899' }}>
                    <Sparkles size={16} /> Improved Professional Rewrite (BLUF)
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyRewrite}
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="comm-compare-text" style={{ color: '#fdf2f8' }}>
                  {evaluation.suggestedRewrite}
                </div>
              </div>
            </div>
          </div>

          {/* Grammar Coaching & Vocabulary Upgrades */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {evaluation.grammarCorrections?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginBottom: '10px' }}>
                  Grammar & Syntax Coaching
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {evaluation.grammarCorrections.map((g: any, i: number) => (
                    <div key={i} className="comm-coach-chip">
                      <div className="comm-coach-orig">{g.original}</div>
                      <div className="comm-coach-sugg">→ {g.suggestion}</div>
                      <div className="comm-coach-reason">{g.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {evaluation.vocabularyEnhancements?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc', marginBottom: '10px' }}>
                  Technical Vocabulary Upgrades
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {evaluation.vocabularyEnhancements.map((v: any, i: number) => (
                    <div key={i} className="comm-coach-chip">
                      <div className="comm-coach-orig">{v.original}</div>
                      <div className="comm-coach-sugg" style={{ color: '#c084fc' }}>→ {v.upgraded}</div>
                      <div className="comm-coach-reason">{v.context}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Return CTA */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('communication-dashboard')}>
              Back to Dashboard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('communication-speaking', { languageCode })}
            >
              Practice in Speaking Studio <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function RubricPill({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
        <span>{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(5, score)}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}
