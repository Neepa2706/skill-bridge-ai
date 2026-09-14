import React, { useState, useEffect } from 'react';
import { CodingProblem, CodingStreakData } from '../../types';
import { Play, Send, Award, Flame, CheckCircle, XCircle, Clock, Cpu, Sparkles } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const CodePlayground: React.FC = () => {
  const { addToast } = useNotification();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [language, setLanguage] = useState<string>('javascript');
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tests' | 'ai-feedback'>('tests');
  const [streakData, setStreakData] = useState<CodingStreakData | null>(null);

  // Fetch problems and streak
  useEffect(() => {
    fetchProblems();
    fetchStreak();
  }, []);

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/coding/problems', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
        if (data.length > 0) {
          loadProblemDetails(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load problems:', e);
    }
  };

  const fetchStreak = async () => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/coding/streak', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStreakData(data);
      }
    } catch (e) {}
  };

  const loadProblemDetails = async (problemId: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/coding/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedProblem(data);
        const starter = data.starterCode?.[language] || '// Write your solution here\n';
        setCode(starter);
        setExecutionResult(null);
      }
    } catch (e) {
      console.error('Failed to load problem details:', e);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (selectedProblem?.starterCode?.[newLang]) {
      setCode(selectedProblem.starterCode[newLang]);
    } else {
      setCode(`// Write your ${newLang} solution here\n`);
    }
  };

  const handleRun = async () => {
    if (!selectedProblem) return;
    setIsRunning(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/coding/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language,
          code
        })
      });
      const data = await res.json();
      setExecutionResult(data);
      setActiveTab('tests');
      if (data.status === 'accepted') {
        addToast('Test Cases Passed', 'Baseline test cases passed successfully!', 'success');
      } else {
        addToast('Test Cases Failed', data.errorOutput || 'Outputs did not match expected values.', 'warning');
      }
    } catch (e: any) {
      addToast('Execution Error', e.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/coding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language,
          code
        })
      });
      const data = await res.json();
      setExecutionResult(data);
      setActiveTab(data.feedback ? 'ai-feedback' : 'tests');

      if (data.status === 'accepted') {
        addToast('Accepted!', `All test cases passed! Score: ${data.score}/100.`, 'success');
        fetchStreak();
        // Update problem list
        setProblems(prev => prev.map(p => p.id === selectedProblem.id ? { ...p, isSolved: true } : p));
      } else {
        addToast('Submission Failed', `Status: ${data.status.replace('_', ' ').toUpperCase()}`, 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Streak Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '6px' }}>Interactive Coding Arena</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Multi-language isolated execution sandbox with algorithmic complexity profiling and streak tracking.
          </p>
        </div>

        {streakData && (
          <div
            className="card card-glass"
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', borderRadius: 'var(--radius-full)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={24} color="#f97316" />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {streakData.currentStreak} Days
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CURRENT STREAK</div>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {streakData.longestStreak} Days Max
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LONGEST STREAK</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Problem List | Code Editor & Console */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Problems List */}
        <div className="card" style={{ padding: '16px', maxHeight: '820px', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '14px', color: 'var(--text-primary)' }}>
            CHALLENGES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {problems.map(p => {
              const isSelected = selectedProblem?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => loadProblemDetails(p.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'hsla(265, 89%, 66%, 0.15)' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</span>
                    {p.isSolved && <CheckCircle size={14} color="var(--accent-emerald)" />}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span
                      className={`badge ${p.difficulty === 'easy' ? 'badge-success' : p.difficulty === 'medium' ? 'badge-warning' : 'badge-critical'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {p.difficulty}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.topic}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Code Editor & Execution HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedProblem && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px' }}>{selectedProblem.title}</h2>
                <span className="badge badge-primary">{selectedProblem.points} Points</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                {selectedProblem.description}
              </p>
            </div>
          )}

          {/* Editor Container */}
          <div className="code-editor-wrapper">
            <div className="code-editor-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>LANGUAGE:</span>
                <select
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  className="select-field"
                  style={{ padding: '4px 10px', fontSize: '13px' }}
                >
                  <option value="javascript">JavaScript (ES6)</option>
                  <option value="python">Python 3</option>
                  <option value="sql">SQL (In-Memory SQLite)</option>
                  <option value="cpp">C++ (GCC)</option>
                  <option value="java">Java 17</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleRun}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-secondary btn-sm"
                >
                  <Play size={14} /> {isRunning ? 'Running...' : 'Run Code'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  <Send size={14} /> {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
                </button>
              </div>
            </div>

            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="code-textarea"
              spellCheck={false}
            />
          </div>

          {/* Execution Results Console & AI Feedback Tabs */}
          {executionResult && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setActiveTab('tests')}
                    className={`btn btn-sm ${activeTab === 'tests' ? 'btn-primary' : 'btn-outline'}`}
                  >
                    Test Cases ({executionResult.passedTests}/{executionResult.totalTests})
                  </button>
                  {executionResult.feedback && (
                    <button
                      onClick={() => setActiveTab('ai-feedback')}
                      className={`btn btn-sm ${activeTab === 'ai-feedback' ? 'btn-cyan' : 'btn-outline'}`}
                    >
                      <Sparkles size={13} /> AI Feedback & Complexity
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {executionResult.executionTimeMs} ms
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={13} /> {executionResult.memoryUsedKb} KB
                  </span>
                </div>
              </div>

              {/* Tab 1: Test Cases */}
              {activeTab === 'tests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {executionResult.testResults?.map((tr: any) => (
                    <div
                      key={tr.caseIndex}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: tr.passed ? 'hsla(152, 76%, 45%, 0.08)' : 'hsla(350, 89%, 60%, 0.08)',
                        border: `1px solid ${tr.passed ? 'hsla(152, 76%, 45%, 0.3)' : 'hsla(350, 89%, 60%, 0.3)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          Case {tr.caseIndex} {tr.isHidden ? '(Hidden Test Case)' : ''}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: tr.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                          {tr.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      {!tr.isHidden && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Input:</span> {tr.input}</div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Expected:</span> {tr.expected}</div>
                          <div><span style={{ color: tr.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>Output:</span> {tr.actual}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {executionResult.errorOutput && (
                    <div
                      style={{
                        padding: '12px',
                        background: 'hsla(350, 89%, 60%, 0.12)',
                        border: '1px solid var(--accent-rose)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--accent-rose)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px'
                      }}
                    >
                      {executionResult.errorOutput}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: AI Algorithmic Feedback */}
              {activeTab === 'ai-feedback' && executionResult.feedback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'hsla(188, 95%, 48%, 0.1)',
                      border: '1px solid hsla(188, 95%, 48%, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <Sparkles size={18} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        Complexity: {executionResult.feedback.complexitySummary}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Evaluated by SkillBridge AI Algorithmic Engine
                      </div>
                    </div>
                  </div>

                  {executionResult.feedback.hint && (
                    <div className="card" style={{ background: '#111827', padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-amber)' }}>💡 Engineering Hint:</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {executionResult.feedback.hint}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="card" style={{ background: '#111827', padding: '12px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-emerald)' }}>STRENGTHS</span>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {executionResult.feedback.strengths?.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="card" style={{ background: '#111827', padding: '12px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-cyan)' }}>SUGGESTIONS</span>
                      <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {executionResult.feedback.suggestions?.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
