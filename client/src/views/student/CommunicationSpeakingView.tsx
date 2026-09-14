import React, { useState, useEffect } from 'react';
import {
  Mic,
  Square,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Volume2,
  Award,
  PenLine
} from 'lucide-react';
import './CommunicationSpeakingView.css';

interface CommunicationSpeakingViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
}

const PROMPT_PRESETS: Record<'en' | 'ja' | 'de', Array<{ id: string; title: string; prompt: string }>> = {
  en: [
    {
      id: 'p1',
      title: '60s Technical Elevator Pitch',
      prompt: 'Introduce yourself in 60 seconds: highlight your degree, your primary technical stack, and a flagship project you built.'
    },
    {
      id: 'p2',
      title: 'Architectural Trade-off',
      prompt: 'Explain why you would choose PostgreSQL over MongoDB for a financial transaction ledger, mentioning ACID compliance.'
    },
    {
      id: 'p3',
      title: 'STAR Conflict Resolution',
      prompt: 'Describe a situation where you had a technical disagreement with a teammate regarding system design and how you achieved alignment.'
    }
  ],
  ja: [
    {
      id: 'p_ja1',
      title: '自己紹介 (Self-Introduction)',
      prompt: '自己紹介をお願いします。専攻内容、得意なプログラミング言語、そして最近開発したWebアプリについて丁寧な敬語（です・ます）で説明してください。'
    },
    {
      id: 'p_ja2',
      title: 'バグ修正と報連相',
      prompt: '本番環境で不具合が発生した際、どのようにチームへ報告・連絡・相談し、修正を完了したか説明してください。'
    }
  ],
  de: [
    {
      id: 'p_de1',
      title: 'Selbstvorstellung im Tech-Interview',
      prompt: 'Stellen Sie sich bitte kurz vor: Ihr Studium, Ihre bevorzugten Technologien und ein interessantes Softwareprojekt.'
    },
    {
      id: 'p_de2',
      title: 'Fehlerbehebung & Architektur',
      prompt: 'Erklären Sie, wie Sie bei der Behebung eines schwierigen Datenbankfehlers vorgegangen sind und welche Maßnahmen Sie ergriffen haben.'
    }
  ]
};

export const CommunicationSpeakingView: React.FC<CommunicationSpeakingViewProps> = ({
  onNavigate,
  initialLanguage = 'en'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [waveform, setWaveform] = useState<number[]>([0.2, 0.4, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.2]);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  const presets = PROMPT_PRESETS[languageCode] || PROMPT_PRESETS.en;
  const activePrompt = presets[selectedPromptIndex]?.prompt || customPrompt || 'Explain your recent engineering project and its measurable impact.';

  // Recording timer
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        // Animate waveform
        setWaveform(prev => prev.map(() => Math.min(0.95, Math.max(0.15, Math.random()))));
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    setEvaluation(null);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    // Request simulated/client transcription
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/speaking/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          languageCode,
          durationSeconds: recordingSeconds > 0 ? recordingSeconds : 15
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript);
        if (data.waveformPoints) {
          setWaveform(data.waveformPoints.slice(0, 16));
        }
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    }
  };

  const handleEvaluateSpeaking = async () => {
    if (!transcript.trim()) return;
    try {
      setEvaluating(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/communication/speaking/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          languageCode,
          promptText: activePrompt,
          transcript: transcript.trim(),
          durationSeconds: Math.max(10, recordingSeconds)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="comm-speaking-container">
      {/* Privacy Banner */}
      <div className="comm-privacy-banner">
        <div className="comm-privacy-icon">🛡️</div>
        <div className="comm-privacy-text">
          <strong>SkillBridge Audio Privacy Protocol:</strong> Audio speech recognition is processed in-memory exclusively for real-time transcription and rubric evaluation. No raw audio recordings or continuous background listening data are stored on our servers.
        </div>
      </div>

      {/* Prompt Selection Card */}
      <div className="comm-speaking-prompt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>
              {languageCode === 'en' ? '🇬🇧' : languageCode === 'ja' ? '🇯🇵' : '🇩🇪'}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Speaking Prompt Selection
            </h2>
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

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
          <p style={{ fontSize: '15px', color: '#f1f5f9', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
            "{activePrompt}"
          </p>
        </div>
      </div>

      {/* Recorder Box */}
      <div className="comm-recorder-box">
        <div>
          <button
            className={`comm-record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
          >
            {isRecording ? <Square size={30} fill="#ffffff" /> : <Mic size={34} />}
          </button>
        </div>

        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: isRecording ? '#ef4444' : '#f8fafc' }}>
            {isRecording ? `Recording... (${recordingSeconds}s)` : transcript ? 'Speech Recorded' : 'Ready to Record'}
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {isRecording ? 'Speak clearly into your microphone. Click stop when finished.' : 'Click the microphone to begin voice response.'}
          </p>
        </div>

        {/* Waveform Visualization */}
        <div className="comm-waveform-container">
          {waveform.map((val, i) => (
            <div
              key={i}
              className="comm-wave-bar"
              style={{
                height: `${Math.round(val * 50) + 4}px`,
                background: isRecording ? '#ef4444' : '#38bdf8'
              }}
            />
          ))}
        </div>

        {/* Transcript Area */}
        <div className="comm-transcript-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
            <span>Transcript (Auto-Transcribed / Editable)</span>
            <span><PenLine size={13} style={{ display: 'inline', marginRight: '4px' }} /> Editable</span>
          </div>
          <textarea
            className="comm-transcript-textarea"
            placeholder="Your spoken transcript will appear here, or you can type directly..."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => { setTranscript(''); setEvaluation(null); setRecordingSeconds(0); }}
          >
            <RotateCcw size={15} style={{ marginRight: '6px' }} /> Reset
          </button>
          <button
            className="btn btn-primary"
            disabled={evaluating || !transcript.trim()}
            onClick={handleEvaluateSpeaking}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
          >
            <Sparkles size={16} /> {evaluating ? 'Evaluating Speech Rubric...' : 'Evaluate Spoken Answer'}
          </button>
        </div>
      </div>

      {/* Evaluation Results Scorecard */}
      {evaluation && (
        <div className="comm-spk-eval-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="comm-scorecard-level-badge">{evaluation.levelAssigned?.levelName}</span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
                6-Dimension Speech Rubric Scorecard
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '42px', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>
                {evaluation.overallScore}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Overall Articulation Score</div>
            </div>
          </div>

          {/* 6 Rubric Gauges */}
          <div className="comm-spk-rubric-grid">
            <RubricBox label="Relevance (25%)" score={evaluation.breakdown.relevance.score} color="#38bdf8" />
            <RubricBox label="Grammar (20%)" score={evaluation.breakdown.grammar.score} color="#fbbf24" />
            <RubricBox label="Vocabulary (15%)" score={evaluation.breakdown.vocabulary.score} color="#a78bfa" />
            <RubricBox label="Fluency (20%)" score={evaluation.breakdown.fluency.score} color="#34d399" />
            <RubricBox label="Pronunciation (10%)" score={evaluation.breakdown.pronunciation.score} color="#2dd4bf" />
            <RubricBox label="Completeness (10%)" score={evaluation.breakdown.completeness.score} color="#f472b6" />
          </div>

          {/* Strengths & Improvement Tips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Key Strengths
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {evaluation.strengths?.map((s: string, i: number) => (
                  <li key={i} style={{ fontSize: '13px', color: '#cbd5e1' }}>✓ {s}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> Articulation Tips
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {evaluation.tips?.map((t: string, i: number) => (
                  <li key={i} style={{ fontSize: '13px', color: '#cbd5e1' }}>• {t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('communication-dashboard')}>
              Back to Dashboard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('communication-conversation', { languageCode })}
            >
              Practice in AI Conversation Trainer <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function RubricBox({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="comm-rubric-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1' }}>
        <span>{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(5, score)}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}
