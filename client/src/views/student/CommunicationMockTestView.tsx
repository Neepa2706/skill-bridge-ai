import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Send,
  Sparkles,
  Briefcase
} from 'lucide-react';
import './CommunicationMockTestView.css';

interface CommunicationMockTestViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
}

export const CommunicationMockTestView: React.FC<CommunicationMockTestViewProps> = ({
  onNavigate,
  initialLanguage = 'en'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [inExam, setInExam] = useState<boolean>(false);
  const [promptData, setPromptData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string }>>([]);
  const [inputText, setInputText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPrompt(languageCode);
  }, [languageCode]);

  useEffect(() => {
    let timer: any = null;
    if (inExam && !examResult && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inExam, examResult, secondsRemaining]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPrompt = async (lang: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/mock-test/prompt?lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPromptData(data);
      }
    } catch (err) {
      console.error('Failed to load mock test prompt:', err);
    }
  };

  const handleStartExam = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          languageCode,
          mode: 'placement',
          topic: promptData?.title || 'Placement Interview Mock Test'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        setMessages([{
          id: data.initialMessage.id,
          sender: 'ai',
          text: data.initialMessage.text
        }]);
        setInExam(true);
        setSecondsRemaining(900);
      }
    } catch (err) {
      console.error('Failed to launch mock test:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || submitting) return;
    const text = inputText.trim();
    setInputText('');
    setSubmitting(true);

    const tempId = `msg-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, sender: 'student', text }]);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/conversation/${sessionId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageText: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: data.aiReply.id, sender: 'ai', text: data.aiReply.text }]);
      }
    } catch (err) {
      console.error('Turn failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExam = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/mock-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          languageCode,
          sessionId,
          durationSeconds: 900 - secondsRemaining
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExamResult(data);
      }
    } catch (err) {
      console.error('Failed to submit mock test:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Result Scorecard
  if (examResult) {
    return (
      <div className="comm-mock-container">
        <div className="comm-mock-briefing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            🏆
          </div>
          <span className="comm-scorecard-level-badge">{examResult.levelAssigned?.levelName}</span>
          <div style={{ fontSize: '56px', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
            {examResult.overallScore}%
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Placement Interview Mock Test Completed
          </h1>
          <p style={{ fontSize: '14.5px', color: '#cbd5e1', maxWidth: '600px' }}>
            Your interview turns have been formally evaluated against international engineering placement standards. Verified skill history has been updated.
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('communication-dashboard')}>
              Return to Dashboard
            </button>
            <button className="btn btn-primary" onClick={() => { setExamResult(null); setInExam(false); }}>
              Attempt Another Mock Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Exam Chat Interface
  if (inExam) {
    return (
      <div className="comm-mock-container">
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="#fbbf24" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              {promptData?.title || 'Placement Interview'} ({languageCode.toUpperCase()})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> {formatTime(secondsRemaining)}
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmitExam}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              Submit & Conclude Exam
            </button>
          </div>
        </div>

        {/* Message stream */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px', minHeight: '380px', maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m) => (
            <div key={m.id} className={`comm-message-row ${m.sender}`}>
              <div className="comm-message-avatar" style={{ background: m.sender === 'ai' ? 'rgba(245,158,11,0.2)' : 'rgba(56,189,248,0.2)' }}>
                {m.sender === 'ai' ? '👔' : '🎓'}
              </div>
              <div className={`comm-bubble ${m.sender}`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="comm-chat-composer">
          <input
            type="text"
            className="comm-composer-input"
            placeholder="Type your interview response..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
          />
          <button className="comm-send-btn" disabled={!inputText.trim() || submitting} onClick={handleSendMessage}>
            <Send size={15} /> Send
          </button>
        </div>
      </div>
    );
  }

  // 3. Pre-Exam Briefing
  return (
    <div className="comm-mock-container">
      <div className="comm-mock-briefing-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="comm-hero-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}>
              <Award size={14} /> Full Placement Simulation
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
              {promptData?.title || 'Placement Interview Mock Test'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['en', 'ja', 'de'] as const).map(l => (
              <button
                key={l}
                className={`comm-preset-btn ${languageCode === l ? 'active' : ''}`}
                onClick={() => setLanguageCode(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderLeft: '4px solid #fbbf24', borderRadius: '8px', padding: '16px 20px' }}>
          <p style={{ fontSize: '15px', color: '#f1f5f9', margin: 0, lineHeight: 1.6 }}>
            {promptData?.scenario}
          </p>
        </div>

        {/* Objectives */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
            Core Mock Test Objectives
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {promptData?.keyObjectives?.map((obj: string, i: number) => (
              <li key={i} style={{ fontSize: '14px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#fbbf24" /> {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* Criteria */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
            Official Evaluation Criteria
          </h3>
          <div className="comm-mock-criteria-list">
            {promptData?.evaluationCriteria?.map((crit: string, i: number) => (
              <div key={i} className="comm-mock-crit-item">
                {crit}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('communication-dashboard')}>
            Back to Dashboard
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStartExam}
            style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '15px' }}
          >
            Launch Mock Interview <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
