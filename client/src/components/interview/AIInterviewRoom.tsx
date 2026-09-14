import React, { useState, useEffect } from 'react';
import { Video, Mic, Volume2, Award, Calendar, CheckCircle2, User, Sparkles } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const AIInterviewRoom: React.FC = () => {
  const { addToast } = useNotification();
  const [mode, setMode] = useState<'ai_mock' | 'live_mentor'>('ai_mock');
  const [category, setCategory] = useState<'hr' | 'technical' | 'role_based'>('technical');
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [dialogueHistory, setDialogueHistory] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // Live Mentors List
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/interview/mentors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMentors(data);
        if (data.length > 0) {
          setSelectedMentor(data[0]);
          setSelectedSlot(data[0].availableSlots?.[0] || '');
        }
      }
    } catch (e) {
      console.error('Failed to load mentors:', e);
    }
  };

  const startAiInterview = async () => {
    setIsProcessing(true);
    setScorecard(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/interview/ai/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, targetRole: 'Software Developer' })
      });
      const data = await res.json();
      if (res.ok) {
        setInterviewId(data.interviewId);
        setStepIndex(data.stepIndex);
        setCurrentQuestion(data.currentQuestion);
        setDialogueHistory([{ sender: 'ai', text: data.currentQuestion }]);

        if (voiceEnabled && 'speechSynthesis' in window) {
          speakQuestion(data.currentQuestion);
        }
      }
    } catch (e: any) {
      addToast('Start Error', e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  const handleSendAnswer = async () => {
    if (!candidateAnswer.trim() || !interviewId || isProcessing) return;
    const ans = candidateAnswer;
    setCandidateAnswer('');
    setIsProcessing(true);

    const updatedHistory = [...dialogueHistory, { sender: 'user' as const, text: ans }];
    setDialogueHistory(updatedHistory);

    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/interview/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          interviewId,
          candidateAnswer: ans,
          stepIndex,
          previousQuestion: currentQuestion
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.isComplete) {
          // Finish session
          finishInterview();
        } else {
          setStepIndex(data.nextStepIndex);
          setCurrentQuestion(data.nextQuestion);
          setDialogueHistory(prev => [...prev, { sender: 'ai', text: data.nextQuestion }]);
          if (voiceEnabled) speakQuestion(data.nextQuestion);
        }
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const finishInterview = async () => {
    if (!interviewId) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/interview/ai/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interviewId })
      });
      const data = await res.json();
      if (res.ok) {
        setScorecard(data.rubric);
        addToast('Interview Complete', `Overall Score: ${data.rubric.overallScore}%`, 'success');
      }
    } catch (e: any) {
      addToast('Evaluation Error', e.message, 'error');
    }
  };

  const handleBookMentor = async () => {
    if (!selectedMentor || !selectedSlot) return;
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/interview/mentor/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          slotTime: selectedSlot,
          roleTarget: 'Software Developer'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBookingSuccess(data);
        addToast('Booking Confirmed', data.message, 'success');
      }
    } catch (e: any) {
      addToast('Booking Error', e.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>Interview Readiness Platform</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Practice adaptive AI clone technical interviews or book live sessions with industry principal architects.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setMode('ai_mock')}
            className={`btn ${mode === 'ai_mock' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Sparkles size={16} /> AI Mock Interviewer
          </button>
          <button
            onClick={() => setMode('live_mentor')}
            className={`btn ${mode === 'live_mentor' ? 'btn-cyan' : 'btn-outline'}`}
          >
            <User size={16} /> Live Mentor Sessions
          </button>
        </div>
      </div>

      {/* MODE 1: AI MOCK INTERVIEW */}
      {mode === 'ai_mock' && (
        <div style={{ display: 'grid', gridTemplateColumns: scorecard ? '1fr 380px' : '1fr', gap: '24px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category Selector & Voice Toggle */}
            {!interviewId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Select Interview Track</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                    The AI clone interviewer evaluates technical correctness, system invariants, response relevance, and communication delivery.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[
                      { id: 'technical' as const, title: 'Technical System Design', desc: 'Architecture, DSA & Databases' },
                      { id: 'hr' as const, title: 'HR & Behavioral', desc: 'STAR technique & Culture Fit' },
                      { id: 'role_based' as const, title: 'Role-Based Triage', desc: 'Debugging & Production Incidents' }
                    ].map(t => (
                      <div
                        key={t.id}
                        onClick={() => setCategory(t.id)}
                        style={{
                          padding: '16px',
                          borderRadius: 'var(--radius-md)',
                          background: category === t.id ? 'hsla(265, 89%, 66%, 0.15)' : 'var(--bg-surface)',
                          border: `1.5px solid ${category === t.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{t.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={voiceEnabled}
                        onChange={e => setVoiceEnabled(e.target.checked)}
                      />
                      <span>Enable Voice Clone Speech Synthesis</span>
                    </label>
                  </div>

                  <button onClick={startAiInterview} className="btn btn-primary btn-lg" disabled={isProcessing}>
                    <Video size={18} /> {isProcessing ? 'Launching Room...' : 'Enter AI Mock Interview Room'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Active Interview HUD */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-primary">Round {stepIndex} of 3</span>
                    <span className="badge badge-cyan">{category.toUpperCase()} INTERVIEW</span>
                  </div>

                  <button
                    onClick={finishInterview}
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--accent-rose)' }}
                  >
                    End Interview Early
                  </button>
                </div>

                {/* AI Interviewer Avatar & Audio Visualizer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    background: '#0d1322',
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px'
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--primary-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 16px hsla(265, 89%, 66%, 0.4)'
                    }}
                  >
                    <Sparkles size={28} color="#fff" />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>SkillBridge AI Interviewer</span>
                      <span className="badge badge-success" style={{ fontSize: '10px' }}>Voice Active</span>
                    </div>
                    <div className="audio-waveform">
                      <div className="audio-bar" style={{ animationDelay: '0s' }} />
                      <div className="audio-bar" style={{ animationDelay: '0.2s' }} />
                      <div className="audio-bar" style={{ animationDelay: '0.4s' }} />
                      <div className="audio-bar" style={{ animationDelay: '0.1s' }} />
                      <div className="audio-bar" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>

                {/* Question & Transcript */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
                  {dialogueHistory.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        background: d.sender === 'ai' ? 'hsla(265, 89%, 66%, 0.08)' : 'var(--bg-surface)',
                        border: `1px solid ${d.sender === 'ai' ? 'hsla(265, 89%, 66%, 0.25)' : 'var(--border-subtle)'}`,
                        lineHeight: 1.6
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '12px', color: d.sender === 'ai' ? 'var(--primary)' : 'var(--accent-cyan)', marginBottom: '4px' }}>
                        {d.sender === 'ai' ? 'INTERVIEWER PROMPT:' : 'CANDIDATE RESPONSE:'}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{d.text}</div>
                    </div>
                  ))}
                </div>

                {/* Candidate Response Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    rows={4}
                    value={candidateAnswer}
                    onChange={e => setCandidateAnswer(e.target.value)}
                    placeholder="Type your structured answer here (highlight trade-offs, architecture decisions, and metrics)..."
                    className="input-field"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '14px' }}
                    disabled={isProcessing}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={handleSendAnswer}
                      disabled={!candidateAnswer.trim() || isProcessing}
                      className="btn btn-primary"
                    >
                      {isProcessing ? 'Evaluating Answer...' : 'Submit Response & Continue'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scorecard Panel */}
          {scorecard && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '18px' }}>Mock Interview Scorecard</h2>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, hsla(152, 76%, 45%, 0.15) 0%, hsla(265, 89%, 66%, 0.15) 100%)',
                  textAlign: 'center',
                  border: '1px solid hsla(152, 76%, 45%, 0.4)'
                }}
              >
                <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {scorecard.overallScore}%
                </div>
                <span className="badge badge-success">Overall Interview Rubric</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Technical Correctness:</span>
                    <span style={{ fontWeight: 700 }}>{scorecard.technicalCorrectness}%</span>
                  </div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill fill-emerald" style={{ width: `${scorecard.technicalCorrectness}%` }} /></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Relevance & Framing:</span>
                    <span style={{ fontWeight: 700 }}>{scorecard.relevance}%</span>
                  </div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill fill-cyan" style={{ width: `${scorecard.relevance}%` }} /></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Communication & STAR:</span>
                    <span style={{ fontWeight: 700 }}>{scorecard.communication}%</span>
                  </div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill fill-primary" style={{ width: `${scorecard.communication}%` }} /></div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)' }}>STRENGTHS</span>
                <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', marginTop: '4px' }}>
                  {scorecard.strengths?.map((s: string, idx: number) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)' }}>RECOMMENDATIONS</span>
                <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', marginTop: '4px' }}>
                  {scorecard.improvementAreas?.map((a: string, idx: number) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: LIVE MENTOR SESSIONS */}
      {mode === 'live_mentor' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {mentors.map(m => (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-gradient)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  <img src={m.avatar_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px' }}>{m.name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{m.current_company}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⭐ {m.rating} Rating • {m.years_experience} Years Exp</div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {m.bio}
              </p>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>EXPERTISE:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {m.expertise?.map((e: string, idx: number) => (
                    <span key={idx} className="badge badge-primary" style={{ fontSize: '11px' }}>{e}</span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Select Available Slot:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {m.availableSlots?.map((slot: string, idx: number) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: selectedSlot === slot ? 'hsla(265, 89%, 66%, 0.15)' : 'var(--bg-surface)',
                        border: `1px solid ${selectedSlot === slot ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      <input
                        type="radio"
                        name="slot"
                        checked={selectedSlot === slot}
                        onChange={() => {
                          setSelectedMentor(m);
                          setSelectedSlot(slot);
                        }}
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBookMentor}
                className="btn btn-cyan"
                style={{ marginTop: 'auto' }}
              >
                <Calendar size={16} /> Book 1-on-1 Mock Session
              </button>
            </div>
          ))}

          {bookingSuccess && (
            <div
              className="card"
              style={{
                gridColumn: '1 / -1',
                background: 'hsla(152, 76%, 45%, 0.12)',
                border: '1.5px solid var(--accent-emerald)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <CheckCircle2 size={24} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '18px', color: 'var(--accent-emerald)' }}>Live Mentor Session Confirmed!</h3>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                {bookingSuccess.message}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live Room URL:</span>
                <a
                  href={bookingSuccess.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  {bookingSuccess.meetingLink}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
