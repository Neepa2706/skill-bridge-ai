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
  Briefcase,
  Play,
  Pause,
  Video,
  BookOpen,
  Mic,
  MicOff,
  Volume2,
  HelpCircle,
  FileText
} from 'lucide-react';
import './CommunicationMockTestView.css';

interface CommunicationMockTestViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
}

interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  instructor: string;
  topic: string;
  description: string;
  keyPoints: string[];
}

interface PrepLesson {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  steps: string[];
  samplePhrase: string;
}

const VIDEO_MASTERCLASSES: VideoLesson[] = [
  {
    id: 'vid-1',
    title: 'Mastering the Placement Technical Interview',
    duration: '8:45',
    instructor: 'Dr. Sarah Lin (Executive Speech Coach)',
    topic: 'Structure & Executive Presence',
    description: 'Learn how recruiters and hiring managers grade technical responses. Master the 3-part answer blueprint.',
    keyPoints: [
      'Hook the interviewer in the first 10 seconds with a concise thesis.',
      'Use the STAR method (Situation, Task, Action, Result) for behavioral prompts.',
      'Quantify results: mention metrics, latency gains, or user impact.'
    ]
  },
  {
    id: 'vid-2',
    title: 'Pronunciation, Cadence & Accent Neutralization',
    duration: '6:30',
    instructor: 'Marcus Vance (Senior Talent Lead)',
    topic: 'Vocal Clarity & Pacing',
    description: 'Master optimal speaking speed (120–150 words per minute) and eliminate filler words ("um", "like", "you know").',
    keyPoints: [
      'Optimal speaking speed is 120-150 WPM—do not rush through technical terms.',
      'Pause intentionally for 1.5 seconds instead of using filler sounds.',
      'Enunciate end consonants (t, d, k) for crisp digital microphone capture.'
    ]
  },
  {
    id: 'vid-3',
    title: 'Explaining Architecture & Answering Curveballs',
    duration: '7:15',
    instructor: 'Priya Sharma (Staff Systems Engineer)',
    topic: 'Technical Trade-offs & Conflict',
    description: 'Demonstrate active listening and articulate complex trade-offs without getting bogged down in implementation minutiae.',
    keyPoints: [
      'Acknowledge constraints before jumping directly into code.',
      'Compare 2 alternative solutions and state clearly why you chose one.',
      'Frame disagreements as collaborative engineering exploration.'
    ]
  }
];

const PREPARATION_LESSONS: PrepLesson[] = [
  {
    id: 'les-1',
    title: 'The STAR Technique for Engineering Interviews',
    category: 'Behavioral Framework',
    readTime: '3 min read',
    summary: 'The universal structured response technique expected by top tech recruiters.',
    steps: [
      'Situation: Set the context briefly (15-20 seconds). Company, project, or course scope.',
      'Task: Clearly define your specific responsibility or the architectural bottleneck.',
      'Action: Describe what YOU did technically (tools, algorithms, refactoring steps).',
      'Result: State the outcome with concrete metrics (e.g. 40% faster queries, zero downtime).'
    ],
    samplePhrase: '"In my distributed systems project (S), we faced high Redis latency (T). I implemented a local LRU cache layer with write-through invalidation (A), reducing p99 latency by 65% (R)."'
  },
  {
    id: 'les-2',
    title: 'Rhythm, Speaking Pace & WPM Control',
    category: 'Vocal Delivery',
    readTime: '4 min read',
    summary: 'How speech speed directly influences interviewer perception of your confidence and mastery.',
    steps: [
      'Benchmark: Normal conversational English is 120-150 words per minute.',
      'Fast Speaking (>175 WPM): Often sounds anxious or rehearsed; audio codecs may drop syllables.',
      'Slow Speaking (<95 WPM): Can cause interviewer attention drift.',
      'The Breath Check: Inhale deeply before starting your sentence to project diaphragm resonance.'
    ],
    samplePhrase: '"Speak at a steady cadence. Place micro-pauses after commas and full stops to allow the listener to absorb key technical terms."'
  },
  {
    id: 'les-3',
    title: 'Handling Unknowns & Live Debugging Communication',
    category: 'Problem Solving',
    readTime: '3 min read',
    summary: 'What to say aloud when you encounter a problem you have not seen before.',
    steps: [
      'Never go silent for more than 4 seconds without signaling your thought process.',
      'Think aloud: "Let me verify the boundary conditions first—for instance, what happens if the input array is empty?"',
      'State your assumptions explicitly: "Assuming the data fits in memory, a hash map provides O(1) lookups."'
    ],
    samplePhrase: '"I am considering two approaches: a recursive traversal or an iterative stack. Given the recursion limit, the iterative approach is safer for production."'
  }
];

export const CommunicationMockTestView: React.FC<CommunicationMockTestViewProps> = ({
  onNavigate,
  initialLanguage = 'en'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [inExam, setInExam] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'prep' | 'videos' | 'rubric' | 'mic-check'>('prep');
  const [activeVideo, setActiveVideo] = useState<VideoLesson>(VIDEO_MASTERCLASSES[0]);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [promptData, setPromptData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string }>>([]);
  const [inputText, setInputText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins

  // Mic warm-up state
  const [micActive, setMicActive] = useState<boolean>(false);
  const [speechWpm, setSpeechWpm] = useState<number>(0);
  const [micTranscript, setMicTranscript] = useState<string>('');

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
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text }]);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/conversation/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: data.aiMessage.id,
          sender: 'ai',
          text: data.aiMessage.text
        }]);
      }
    } catch (err) {
      console.error('Failed to send interview message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitExam = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/conversation/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExamResult(data);
      }
    } catch (err) {
      console.error('Failed to finalize exam:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Mic test trigger
  const toggleMicTest = () => {
    if (micActive) {
      setMicActive(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. You can still type during the test.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageCode === 'ja' ? 'ja-JP' : languageCode === 'de' ? 'de-DE' : 'en-US';

      const startTime = Date.now();
      let wordCount = 0;

      recognition.onstart = () => {
        setMicActive(true);
        setMicTranscript('Listening... Speak a sentence aloud to measure your WPM.');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMicTranscript(transcript);
        const words = transcript.trim().split(/\s+/).filter(Boolean);
        wordCount = words.length;
        const elapsedMinutes = Math.max(0.1, (Date.now() - startTime) / 60000);
        setSpeechWpm(Math.round(wordCount / elapsedMinutes));
      };

      recognition.onerror = () => {
        setMicActive(false);
      };

      recognition.onend = () => {
        setMicActive(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Mic check error:', e);
      setMicActive(false);
    }
  };

  // 1. Exam Result View
  if (examResult) {
    const feedback = examResult.evaluation || {};
    return (
      <div className="comm-mock-container">
        <div className="comm-mock-briefing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fbbf24' }}>
            <Award size={32} color="#fbbf24" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: '8px 0' }}>
            Placement Mock Examination Completed
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '540px' }}>
            Your interview transcript has been evaluated against placement hiring rubrics.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%', maxWidth: '600px', margin: '20px 0' }}>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#fbbf24' }}>
                {feedback.overallScore ?? 84}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Interview Score</div>
            </div>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8' }}>
                {feedback.cefrLevel || 'B2+'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Fluency Tier</div>
            </div>
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#4ade80' }}>
                {messages.length}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Turns Completed</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('communication-dashboard')}>
              Return to Communication Hub
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setInExam(false);
                setExamResult(null);
                setMessages([]);
              }}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              Take Another Examination
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
            placeholder="Type your interview response or speak..."
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

  // 3. Pre-Exam Preparation Hub (Lessons, Videos & Instructions)
  return (
    <div className="comm-mock-container">
      <div className="comm-mock-briefing-card">
        {/* Header */}
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

        {/* Pre-Exam Preparation Navigation Tabs */}
        <div className="comm-prep-tabs">
          <button
            className={`comm-prep-tab ${activeTab === 'prep' ? 'active' : ''}`}
            onClick={() => setActiveTab('prep')}
          >
            <BookOpen size={16} /> 1. Preparation Lessons
          </button>
          <button
            className={`comm-prep-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <Video size={16} /> 2. Masterclass Videos
          </button>
          <button
            className={`comm-prep-tab ${activeTab === 'mic-check' ? 'active' : ''}`}
            onClick={() => setActiveTab('mic-check')}
          >
            <Mic size={16} /> 3. Voice & WPM Check
          </button>
          <button
            className={`comm-prep-tab ${activeTab === 'rubric' ? 'active' : ''}`}
            onClick={() => setActiveTab('rubric')}
          >
            <FileText size={16} /> 4. Exam Rubric & Start
          </button>
        </div>

        {/* TAB 1: Structured Lessons */}
        {activeTab === 'prep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              Review these 3 essential communication frameworks before starting your proctored assessment.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {PREPARATION_LESSONS.map(lesson => (
                <div key={lesson.id} className="comm-lesson-card">
                  <div className="comm-lesson-header">
                    <span className="comm-lesson-tag">{lesson.category}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{lesson.readTime}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {lesson.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    {lesson.summary}
                  </p>
                  <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
                      Key Technique Steps:
                    </div>
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {lesson.steps.map((st, sIdx) => (
                        <li key={sIdx}>{st}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontStyle: 'italic' }}>
                      💡 Exemplary Response: {lesson.samplePhrase}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab('videos')}>
                Proceed to Video Masterclasses <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Video Masterclasses */}
        {activeTab === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Active Video Player Screen */}
            <div style={{ background: '#090d18', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
              <div style={{ position: 'relative', width: '100%', height: '320px', background: 'radial-gradient(circle at center, #1e293b 0%, #030712 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '20px', maxWidth: '500px' }}>
                  <div
                    onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      cursor: 'pointer',
                      boxShadow: '0 0 24px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    {isPlayingVideo ? <Pause size={28} color="#000" /> : <Play size={28} color="#000" style={{ marginLeft: '4px' }} />}
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                    {activeVideo.title}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    {activeVideo.description}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', marginTop: '12px', fontSize: '12px', color: '#fbbf24' }}>
                    <Volume2 size={14} /> {isPlayingVideo ? 'Masterclass Audio Playing (320kbps)' : `Duration: ${activeVideo.duration} • Click Play to Start`}
                  </div>
                </div>
              </div>

              {/* Video Takeaways Bar */}
              <div style={{ padding: '20px 24px', background: '#0f172a', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Key Interviewer Expectations Covered in this Video:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                  {activeVideo.keyPoints.map((kp, kpIdx) => (
                    <div key={kpIdx} style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle2 size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{kp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Video Selector Row */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px' }}>
                Select Masterclass Episode:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {VIDEO_MASTERCLASSES.map(v => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setActiveVideo(v);
                      setIsPlayingVideo(true);
                    }}
                    style={{
                      background: activeVideo.id === v.id ? 'rgba(245, 158, 11, 0.12)' : '#0f172a',
                      border: `1.5px solid ${activeVideo.id === v.id ? '#fbbf24' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>{v.duration}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{v.topic}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab('mic-check')}>
                Proceed to Voice & WPM Check <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Mic & Speaking Speed (WPM) Check */}
        {activeTab === 'mic-check' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0f172a', padding: '24px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: micActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                {micActive ? <Mic size={28} color="#ef4444" className="pulse" /> : <MicOff size={28} color="#94a3b8" />}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: '0 0 6px 0' }}>
                Interactive Speaking Speed & Microphone Warm-up
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '520px', margin: '0 auto 16px auto' }}>
                Test your microphone and live speaking rate. Recommended conversational rate for placement interviews: <strong>120 – 150 Words Per Minute</strong>.
              </p>

              {/* Sample Practice Text */}
              <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px dashed rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '8px', maxWidth: '640px', margin: '0 auto 16px auto', textAlign: 'left' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Practice Aloud:
                </span>
                <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                  "Hello, my name is Alex. I am excited to discuss my recent project where I designed a scalable REST API using Node.js and TypeScript, handling over ten thousand concurrent requests with sub-second response times."
                </p>
              </div>

              {/* Live WPM Indicator */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '20px', background: '#090d18', padding: '10px 24px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Detected Speed</span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: speechWpm >= 120 && speechWpm <= 160 ? '#4ade80' : speechWpm > 160 ? '#f87171' : '#fbbf24' }}>
                    {speechWpm} WPM
                  </span>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Speed Assessment</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {speechWpm === 0 ? 'Speak to measure' : speechWpm >= 120 && speechWpm <= 160 ? '🟢 Optimal Pace' : speechWpm > 160 ? '🟡 Fast (Slow down)' : '🟡 Slow (Pick up pace)'}
                  </span>
                </div>
              </div>

              {micTranscript && (
                <div style={{ fontSize: '12px', color: '#38bdf8', maxWidth: '540px', margin: '0 auto 16px auto', fontFamily: 'monospace' }}>
                  "{micTranscript}"
                </div>
              )}

              <div>
                <button
                  className={`btn ${micActive ? 'btn-critical' : 'btn-primary'}`}
                  onClick={toggleMicTest}
                  style={{ gap: '8px' }}
                >
                  {micActive ? <><MicOff size={16} /> Stop Microphone Test</> : <><Mic size={16} /> Start Microphone Warm-up</>}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setActiveTab('rubric')}>
                Review Exam Instructions & Launch <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Scenario Briefing & Launch */}
        {activeTab === 'rubric' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderLeft: '4px solid #fbbf24', borderRadius: '8px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Simulated Job Scenario
              </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                <ShieldCheck size={16} color="#4ade80" /> Lessons completed • Safe proctoring active
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
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
        )}
      </div>
    </div>
  );
};
