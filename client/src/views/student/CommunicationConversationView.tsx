import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Check,
  Award,
  Users,
  Briefcase,
  Coffee,
  Presentation,
  ShieldAlert
} from 'lucide-react';
import './CommunicationConversationView.css';

interface CommunicationConversationViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
  initialMode?: 'daily' | 'professional' | 'placement' | 'group_discussion' | 'presentation';
}

export const CommunicationConversationView: React.FC<CommunicationConversationViewProps> = ({
  onNavigate,
  initialLanguage = 'en',
  initialMode = 'placement'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [mode, setMode] = useState<string>(initialMode);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'ai' | 'student';
    text: string;
    grammarCorrection?: string | null;
    vocabularyNote?: string | null;
    relevanceScore?: number;
  }>>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [sessionScorecard, setSessionScorecard] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startSession(languageCode, mode);
  }, [languageCode, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async (lang: string, sessionMode: string) => {
    try {
      setLoading(true);
      setSessionScorecard(null);
      setMessages([]);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ languageCode: lang, mode: sessionMode })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        if (data.initialMessage) {
          setMessages([{
            id: data.initialMessage.id,
            sender: 'ai',
            text: data.initialMessage.text
          }]);
        }
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !sessionId) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const tempId = `msg-${Date.now()}`;
    const optimisticTurn = {
      id: tempId,
      sender: 'student' as const,
      text
    };
    setMessages(prev => [...prev, optimisticTurn]);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/conversation/${sessionId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageText: text })
      });

      if (res.ok) {
        const data = await res.json();
        // Update student turn with grammar/vocab feedback & append AI turn
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? {
            ...m,
            grammarCorrection: data.studentTurn?.grammarCorrection,
            vocabularyNote: data.studentTurn?.vocabularyNote,
            relevanceScore: data.studentTurn?.relevanceScore
          } : m);
          return [...updated, {
            id: data.aiReply.id,
            sender: 'ai',
            text: data.aiReply.text
          }];
        });
      }
    } catch (err) {
      console.error('Failed to send turn:', err);
    } finally {
      setSending(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/conversation/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ durationSeconds: 300 })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionScorecard(data);
      }
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  const modes = [
    { id: 'placement', label: 'Placement Interview', icon: Briefcase },
    { id: 'professional', label: 'Daily Standup / PR', icon: Clock },
    { id: 'daily', label: 'Casual Workplace', icon: Coffee },
    { id: 'group_discussion', label: 'Group Discussion', icon: Users },
    { id: 'presentation', label: 'Tech Talk Q&A', icon: Presentation }
  ];

  return (
    <div className="comm-chat-container">
      {/* Header & Modes Selector */}
      <div className="comm-chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('communication-dashboard')}
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{languageCode === 'en' ? '🇬🇧 English' : languageCode === 'ja' ? '🇯🇵 日本語' : '🇩🇪 Deutsch'}</span>
              <span style={{ fontSize: '12px', background: 'rgba(168,85,246,0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px' }}>
                AI Trainer Active
              </span>
            </div>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="comm-modes-row">
          {modes.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className={`comm-mode-btn ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <Icon size={14} /> {m.label}
              </button>
            );
          })}
        </div>

        {/* End Session Button */}
        <div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleEndSession}
            style={{ fontSize: '12px', padding: '6px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Finish Session & Get Scorecard
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="comm-chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`comm-message-row ${m.sender}`}>
            <div
              className="comm-message-avatar"
              style={{
                background: m.sender === 'ai' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: m.sender === 'ai' ? '#c084fc' : '#38bdf8'
              }}
            >
              {m.sender === 'ai' ? '🤖' : '🎓'}
            </div>

            <div className={`comm-bubble ${m.sender}`}>
              <div>{m.text}</div>

              {/* In-line feedback chips on student messages */}
              {m.sender === 'student' && (m.grammarCorrection || m.vocabularyNote || m.relevanceScore) && (
                <div className="comm-turn-coaching">
                  {m.grammarCorrection && (
                    <div className="comm-turn-coach-item" style={{ color: '#fde047' }}>
                      <span>📝 Grammar tip:</span> {m.grammarCorrection}
                    </div>
                  )}
                  {m.vocabularyNote && (
                    <div className="comm-turn-coach-item" style={{ color: '#bae6fd' }}>
                      <span>💡 Vocabulary:</span> {m.vocabularyNote}
                    </div>
                  )}
                  {m.relevanceScore !== undefined && (
                    <div className="comm-turn-coach-item" style={{ color: '#86efac' }}>
                      <span>🎯 Relevance:</span> {m.relevanceScore}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="comm-message-row ai">
            <div className="comm-message-avatar" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
              🤖
            </div>
            <div className="comm-bubble ai" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              AI Coach is formulating follow-up questions...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scorecard Modal / Card when finished */}
      {sessionScorecard && (
        <div style={{ background: '#1e293b', border: '1px solid #8b5cf6', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="comm-scorecard-level-badge">{sessionScorecard.levelAssigned?.levelName}</span>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{sessionScorecard.totalTurns} turns completed</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
              Session Score: {sessionScorecard.overallScore}%
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
              {sessionScorecard.feedback?.overallFeedback}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('communication-dashboard')}
            >
              Dashboard
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => startSession(languageCode, mode)}
            >
              New Session
            </button>
          </div>
        </div>
      )}

      {/* Composer Input Bar */}
      <div className="comm-chat-composer">
        <input
          type="text"
          className="comm-composer-input"
          placeholder={languageCode === 'ja' ? '日本語でメッセージを入力してください...' : languageCode === 'de' ? 'Antwort auf Deutsch eingeben...' : 'Type your answer or technical explanation in English...'}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
          disabled={sending}
        />
        <button
          className="comm-send-btn"
          disabled={!inputText.trim() || sending}
          onClick={handleSendMessage}
        >
          <Send size={15} /> Send
        </button>
      </div>
    </div>
  );
};
