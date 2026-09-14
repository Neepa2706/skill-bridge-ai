import React, { useState, useEffect, useRef } from 'react';
import { Languages, Send, Volume2, Mic, MicOff, CheckCircle2, Sparkles, Trophy } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const LanguagePartnerModal: React.FC = () => {
  const { addToast } = useNotification();
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'ja' | 'de'>('en');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'ai' | 'user';
    text: string;
    grammarNote?: string | null;
    vocabNote?: string | null;
  }>>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const langTracks = [
    { code: 'en' as const, name: 'English', flag: '🇬🇧', label: 'Workplace Fluency & Pitching' },
    { code: 'ja' as const, name: 'Japanese', flag: '🇯🇵', label: 'ビジネス日本語 (Business Keigo & IT)' },
    { code: 'de' as const, name: 'German', flag: '🇩🇪', label: 'Deutsch für Ingenieure (Engineering)' }
  ];

  // Start or switch language conversation
  useEffect(() => {
    startConversation(activeLanguage);
  }, [activeLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async (code: 'en' | 'ja' | 'de') => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/language/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ languageCode: code })
      });
      const data = await res.json();
      if (res.ok) {
        setConversationId(data.conversationId);
        setMessages([
          {
            id: data.initialMessage.id,
            sender: 'ai',
            text: data.initialMessage.messageText
          }
        ]);
        setEvaluationResult(null);
      }
    } catch (e) {
      console.error('Failed to start conversation:', e);
    }
  };

  const speakText = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'ja' ? 'ja-JP' : langCode === 'de' ? 'de-DE' : 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isSending) return;
    const userText = inputMessage;
    setInputMessage('');
    setIsSending(true);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user' as const,
      text: userText
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/language/conversation/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversationId,
          messageText: userText
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [
          ...prev,
          {
            id: data.aiMessage.id,
            sender: 'ai',
            text: data.aiMessage.messageText,
            grammarNote: data.aiMessage.grammarCorrection,
            vocabNote: data.aiMessage.vocabularyNote
          }
        ]);
        // Automatically speak response
        speakText(data.aiMessage.messageText, activeLanguage);
      }
    } catch (e: any) {
      addToast('Message Error', e.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleEvaluate = async () => {
    if (!conversationId) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/language/conversation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId })
      });
      const data = await res.json();
      if (res.ok) {
        setEvaluationResult(data.scorecard);
        addToast('Evaluation Ready', `Overall Conversation Score: ${data.scorecard.overallScore}%`, 'success');
      }
    } catch (e: any) {
      addToast('Evaluation Error', e.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>Multilingual Communication Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Interactive AI conversation partner for global career readiness in English, Japanese, and German.
          </p>
        </div>

        {/* Language Track Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {langTracks.map(lt => (
            <button
              key={lt.code}
              onClick={() => setActiveLanguage(lt.code)}
              className={`btn ${activeLanguage === lt.code ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px' }}
            >
              <span style={{ fontSize: '16px' }}>{lt.flag}</span>
              <span>{lt.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dialogue Panel & Scorecard */}
      <div style={{ display: 'grid', gridTemplateColumns: evaluationResult ? '1fr 360px' : '1fr', gap: '24px' }}>
        {/* Chat Console */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '620px',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: '#0d1322',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Languages size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>
                AI Conversation Partner ({activeLanguage.toUpperCase()})
              </span>
            </div>

            <button
              onClick={handleEvaluate}
              className="btn btn-cyan btn-sm"
              disabled={messages.length <= 1}
            >
              <Trophy size={14} /> Finish & Evaluate Dialogue
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map(m => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: isAi ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                      background: isAi ? 'var(--bg-card)' : 'var(--primary-gradient)',
                      border: isAi ? '1px solid var(--border-subtle)' : 'none',
                      color: isAi ? 'var(--text-primary)' : '#fff',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.7 }}>
                        {isAi ? 'SkillBridge Coach' : 'You'}
                      </span>
                      {isAi && (
                        <button
                          onClick={() => speakText(m.text, activeLanguage)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '2px' }}
                          title="Listen with Text-to-Speech"
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                    <div>{m.text}</div>
                  </div>

                  {/* Inline Grammar & Vocab notes if provided by AI */}
                  {m.grammarNote && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: 'hsla(38, 92%, 50%, 0.1)',
                        border: '1px solid hsla(38, 92%, 50%, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--accent-amber)'
                      }}
                    >
                      <strong>Grammar Insight:</strong> {m.grammarNote}
                    </div>
                  )}

                  {m.vocabNote && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: 'hsla(188, 95%, 48%, 0.1)',
                        border: '1px solid hsla(188, 95%, 48%, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      <strong>Vocabulary Upgrade:</strong> {m.vocabNote}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: '#090e1b',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                activeLanguage === 'ja'
                  ? '日本語で返信してみましょう (Type in Japanese or Romaji)...'
                  : activeLanguage === 'de'
                  ? 'Antworte auf Deutsch (Type your response in German)...'
                  : 'Type your response in professional English...'
              }
              className="input-field"
              disabled={isSending}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="btn btn-primary"
            >
              <Send size={16} /> {isSending ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Scorecard Panel (After Evaluation) */}
        {evaluationResult && (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '18px' }}>Conversation Scorecard</h2>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, hsla(265, 89%, 66%, 0.15) 0%, hsla(188, 95%, 48%, 0.15) 100%)',
                textAlign: 'center',
                border: '1px solid var(--border-bright)'
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {evaluationResult.overallScore}%
              </div>
              <span className="badge badge-success">Overall Fluency Rating</span>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Fluency & Flow:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{evaluationResult.fluencyScore}%</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill fill-cyan" style={{ width: `${evaluationResult.fluencyScore}%` }} /></div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Grammar Precision:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{evaluationResult.grammarScore}%</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill fill-emerald" style={{ width: `${evaluationResult.grammarScore}%` }} /></div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Vocabulary Breadth:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{evaluationResult.vocabularyScore}%</span>
                </div>
                <div className="progress-bar-bg"><div className="progress-bar-fill fill-primary" style={{ width: `${evaluationResult.vocabularyScore}%` }} /></div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                STRENGTHS
              </div>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                {evaluationResult.strengths?.map((s: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                ACTIONABLE IMPROVEMENTS
              </div>
              <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                {evaluationResult.improvements?.map((imp: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{imp}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
