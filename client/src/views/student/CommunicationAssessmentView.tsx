import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  ChevronRight,
  Check,
  TrendingUp
} from 'lucide-react';
import './CommunicationAssessmentView.css';

interface CommunicationAssessmentViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialLanguage?: 'en' | 'ja' | 'de';
}

export const CommunicationAssessmentView: React.FC<CommunicationAssessmentViewProps> = ({
  onNavigate,
  initialLanguage = 'en'
}) => {
  const [languageCode, setLanguageCode] = useState<'en' | 'ja' | 'de'>(initialLanguage);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [report, setReport] = useState<any | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins

  useEffect(() => {
    fetchQuestions(languageCode);
  }, [languageCode]);

  useEffect(() => {
    if (report || loading || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [report, loading, secondsRemaining]);

  const fetchQuestions = async (lang: string) => {
    try {
      setLoading(true);
      setReport(null);
      setSelectedAnswers({});
      setCurrentIndex(0);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/communication/assessments/questions?lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to load assessment questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitAssessment = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('sb_token');
      const answersPayload = Object.entries(selectedAnswers).map(([qId, idx]) => ({
        questionId: qId,
        selectedIndex: idx
      }));

      const res = await fetch('/api/student/communication/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          languageCode,
          answers: answersPayload,
          durationSeconds: 900 - secondsRemaining
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (err) {
      console.error('Failed to submit assessment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="comm-asmt-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Generating Adaptive Baseline Assessment...</p>
      </div>
    );
  }

  // If Completed -> Show Results Scorecard
  if (report) {
    return (
      <div className="comm-asmt-container">
        <div className="comm-asmt-scorecard">
          <div className="comm-scorecard-hero">
            <span className="comm-scorecard-level-badge">{report.levelName}</span>
            <div className="comm-scorecard-number">{report.overallScore}%</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Diagnostic Baseline Assessment Complete
            </h1>
            <p style={{ fontSize: '14.5px', color: '#94a3b8', maxWidth: '640px' }}>
              {report.summary}
            </p>
          </div>

          {/* Sub-Skills Breakdown Grid */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
              Evaluated Communication Dimensions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <ScoreCardGauge label="Reading Comprehension" score={report.readingScore} color="#34d399" />
              <ScoreCardGauge label="Grammar Accuracy" score={report.grammarScore} color="#fbbf24" />
              <ScoreCardGauge label="Technical Vocabulary" score={report.vocabularyScore} color="#a78bfa" />
              <ScoreCardGauge label="Listening Retention" score={report.listeningScore} color="#38bdf8" />
              <ScoreCardGauge label="Speaking Baseline" score={report.speakingScore} color="#818cf8" />
              <ScoreCardGauge label="Writing Structure" score={report.writingScore} color="#f472b6" />
            </div>
          </div>

          {/* Strengths & Growth Areas */}
          <div className="comm-report-grid">
            <div className="comm-report-box">
              <div className="comm-report-box-title" style={{ color: '#4ade80' }}>
                <CheckCircle2 size={18} /> Verified Strengths
              </div>
              <ul className="comm-bullet-list">
                {report.strengths?.map((str: string, i: number) => (
                  <li key={i} className="comm-bullet-item">
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓</span> {str}
                  </li>
                ))}
              </ul>
            </div>

            <div className="comm-report-box">
              <div className="comm-report-box-title" style={{ color: '#f59e0b' }}>
                <AlertCircle size={18} /> Targeted Growth Areas
              </div>
              <ul className="comm-bullet-list">
                {report.growthAreas?.map((ga: string, i: number) => (
                  <li key={i} className="comm-bullet-item">
                    <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>•</span> {ga}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="comm-report-box" style={{ background: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
            <div className="comm-report-box-title" style={{ color: '#38bdf8' }}>
              <Sparkles size={18} /> Personalized Next Steps
            </div>
            <ul className="comm-bullet-list">
              {report.recommendations?.map((rec: string, i: number) => (
                <li key={i} className="comm-bullet-item">
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>→</span> {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('communication-dashboard', { lang: languageCode })}
            >
              Return to Dashboard
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('communication-speaking', { languageCode })}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Start Speaking Practice <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Assessment Question Player
  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isAnswered = currentQ && selectedAnswers[currentQ.id] !== undefined;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="comm-asmt-container">
      {/* Header */}
      <div className="comm-asmt-header">
        <div className="comm-asmt-title-grp">
          <span className="comm-asmt-badge">Adaptive Assessment</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
            {languageCode === 'en' ? '🇬🇧 English' : languageCode === 'ja' ? '🇯🇵 Japanese' : '🇩🇪 German'}
          </span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#fbbf24', fontWeight: 600 }}>
          <Clock size={16} /> {formatTime(secondsRemaining)}
        </div>

        <div className="comm-asmt-progress-wrap">
          <div className="comm-asmt-progress-bar">
            <div className="comm-asmt-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="comm-asmt-question-card">
          <span className={`comm-asmt-cat-pill cat-${currentQ.category}`}>
            {currentQ.category}
          </span>

          {currentQ.contextText && (
            <div className="comm-asmt-context-box">
              {currentQ.contextText}
            </div>
          )}

          <div className="comm-asmt-prompt-text">
            {currentQ.prompt}
          </div>

          <div className="comm-asmt-options-list">
            {currentQ.options?.map((opt: string, idx: number) => {
              const isSelected = selectedAnswers[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  className={`comm-asmt-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(currentQ.id, idx)}
                >
                  <div className="comm-asmt-opt-indicator">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="comm-asmt-actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Previous
            </button>

            {isLastQuestion ? (
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSubmitAssessment}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submitting ? 'Evaluating Assessment...' : 'Submit Assessment'} <Check size={16} />
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next Question <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function ScoreCardGauge({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
        <span>{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(4, score)}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}
