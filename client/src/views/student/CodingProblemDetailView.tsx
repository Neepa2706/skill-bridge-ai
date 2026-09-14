import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Send,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Copy,
  Check,
  Code2
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './CodingProblemDetailView.css';

interface CodingProblemDetailViewProps {
  problemId: string;
  onNavigate: (view: string, data?: any) => void;
}

export const CodingProblemDetailView: React.FC<CodingProblemDetailViewProps> = ({
  problemId,
  onNavigate
}) => {
  const { addToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<any>(null);
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'tests' | 'output'>('tests');

  // AI Hints state
  const [activeHintLevel, setActiveHintLevel] = useState<number | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintData, setHintData] = useState<Record<number, any>>({});
  const [copiedInput, setCopiedInput] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchProblemDetails();
  }, [problemId]);

  const fetchProblemDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/coding/problems/${problemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setProblem(json);
        const starter = json.starterCode?.[language] || '# Write your Python solution here\n';
        setCode(starter);

        // Fetch previously unlocked hints if any
        try {
          const hintsRes = await fetch(`/api/student/coding/problems/${problemId}/hints`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (hintsRes.ok) {
            const hintsJson = await hintsRes.json();
            if (hintsJson && Object.keys(hintsJson).length > 0) {
              setHintData(hintsJson);
            }
          }
        } catch {}
      } else {
        addToast('Error', 'Failed to load problem specifications.', 'error');
      }
    } catch (err: any) {
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (problem?.starterCode?.[newLang]) {
      setCode(problem.starterCode[newLang]);
    } else {
      setCode(`// Write your ${newLang} solution here\n`);
    }
  };

  const handleResetCode = () => {
    if (problem?.starterCode?.[language]) {
      setCode(problem.starterCode[language]);
      addToast('Code Reset', `Restored starter code for ${language.toUpperCase()}.`, 'info');
    }
  };

  // Support Tab key indentation inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const updated = code.substring(0, start) + '    ' + code.substring(end);
      setCode(updated);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
    // Ctrl + Enter to Run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  };

  // Run Code against public sample test cases
  const handleRunCode = async () => {
    if (!code.trim()) {
      addToast('Code Empty', 'Write your solution before running.', 'warning');
      return;
    }

    setIsRunning(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/coding/problems/${problemId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language, code })
      });
      const data = await res.json();
      setRunResult(data);
      setSelectedCaseIdx(0);
      setActiveConsoleTab(data.errorOutput ? 'output' : 'tests');

      if (data.status === 'ACCEPTED') {
        addToast('Sample Cases Passed! 🎉', 'All public test cases executed successfully.', 'success');
      } else if (data.status === 'COMPILATION_ERROR') {
        addToast('Compilation / Syntax Error', 'Check console output for details.', 'error');
      } else if (data.status === 'TIME_LIMIT_EXCEEDED') {
        addToast('Time Limit Exceeded', 'Process exceeded 2000ms CPU budget.', 'warning');
      } else {
        addToast('Output Mismatch', 'Outputs did not match sample expected values.', 'warning');
      }
    } catch (err: any) {
      addToast('Execution Error', err.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code against all test cases
  const handleSubmitCode = async () => {
    if (!code.trim()) {
      addToast('Code Empty', 'Please write your code before submitting.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/coding/problems/${problemId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language, code })
      });
      const data = await res.json();

      if (res.ok && data.submissionId) {
        addToast(
          data.status === 'ACCEPTED' ? 'Accepted! 🎉' : 'Submission Evaluated',
          `Score: ${data.score}% (${data.passedTests}/${data.totalTests} tests passed).`,
          data.status === 'ACCEPTED' ? 'success' : 'info'
        );
        onNavigate('coding-submission-result', { submissionId: data.submissionId });
      } else {
        addToast('Submission Failed', data.error || 'Evaluation error.', 'error');
      }
    } catch (err: any) {
      addToast('Submission Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request AI Hint
  const handleFetchHint = async (level: number) => {
    if (hintData[level]) {
      setActiveHintLevel(level);
      return;
    }

    setHintLoading(true);
    setActiveHintLevel(level);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/student/coding/problems/${problemId}/ai-hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hintLevel: level, userCode: code, language })
      });
      if (res.ok) {
        const json = await res.json();
        setHintData(prev => ({ ...prev, [level]: json }));
      }
    } catch (err) {
      console.error('Failed to get hint:', err);
    } finally {
      setHintLoading(false);
    }
  };

  const copySampleInput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  if (loading) {
    return (
      <div className="problem-workspace-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#94a3b8' }}>Configuring Code Sandbox...</p>
      </div>
    );
  }

  const lineCount = Math.max(1, code.split('\n').length);
  const linesArray = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Active test case in console
  const activeCase = runResult?.testResults?.[selectedCaseIdx] || problem?.publicTestCases?.[selectedCaseIdx];

  return (
    <div className="problem-workspace-container">
      {/* 1. Breadcrumbs Nav */}
      <div className="workspace-nav-bar">
        <div className="workspace-breadcrumbs">
          <span onClick={() => onNavigate('coding')}>Coding Dashboard</span>
          <span>/</span>
          <span onClick={() => onNavigate('coding-problems')}>Problems</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{problem?.title}</span>
        </div>

        <div className="workspace-problem-badge">
          <span className={`diff-badge ${problem?.difficulty}`}>
            {problem?.difficulty?.toUpperCase()}
          </span>
          {problem?.isSolved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Solved
            </span>
          )}
        </div>
      </div>

      {/* 2. Workspace Split Grid */}
      <div className="workspace-grid">
        {/* LEFT PANEL: Problem Specification & AI Hints */}
        <div className="problem-spec-panel">
          <div>
            <div className="spec-header-row">
              <h1 className="spec-title">{problem?.title}</h1>
            </div>
            <div className="spec-meta-tags">
              <span className="problem-topic-tag">{problem?.topic}</span>
              <div className="spec-limits-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {problem?.timeLimitMs}ms limit
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={12} /> {problem?.memoryLimitMb}MB limit
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="spec-section-heading">Problem Description</div>
            <p className="spec-body-text">{problem?.description}</p>
          </div>

          <div>
            <div className="spec-section-heading">Input Format</div>
            <p className="spec-body-text">{problem?.inputFormat}</p>
          </div>

          <div>
            <div className="spec-section-heading">Output Format</div>
            <p className="spec-body-text">{problem?.outputFormat}</p>
          </div>

          {problem?.constraints && (
            <div>
              <div className="spec-section-heading">Constraints</div>
              <p className="spec-body-text" style={{ fontFamily: 'Fira Code, monospace', fontSize: '13px' }}>
                {problem?.constraints}
              </p>
            </div>
          )}

          {/* Sample I/O Box */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="spec-section-heading">Sample Input</div>
              <button
                onClick={() => copySampleInput(problem?.sampleInput || '')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
              >
                {copiedInput ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                {copiedInput ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="spec-io-box">{problem?.sampleInput}</div>

            <div className="spec-section-heading" style={{ marginTop: '12px' }}>Sample Output</div>
            <div className="spec-io-box">{problem?.sampleOutput}</div>
          </div>

          {problem?.explanation && (
            <div>
              <div className="spec-section-heading">Explanation</div>
              <p className="spec-body-text">{problem?.explanation}</p>
            </div>
          )}

          {/* AI Hints Section */}
          <div className="ai-hints-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c4b5fd', fontSize: '13px', fontWeight: 700 }}>
              <Sparkles size={16} /> Need Guidance? AI Progressive Hints
            </div>
            <div className="hint-levels-pills">
              {[1, 2, 3, 4].map(lvl => (
                <button
                  key={lvl}
                  className={`hint-btn ${activeHintLevel === lvl ? 'active' : ''}`}
                  onClick={() => handleFetchHint(lvl)}
                >
                  Hint {lvl} {lvl === 1 ? '(Clue)' : lvl === 2 ? '(Approach)' : lvl === 3 ? '(Algorithm)' : '(Solution)'}
                </button>
              ))}
            </div>

            {/* Hint Display Box */}
            {activeHintLevel && (
              <div className="hint-content-box">
                {hintLoading ? (
                  <div style={{ color: '#c4b5fd', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Generating Hint {activeHintLevel}...
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5f3ff', marginBottom: '6px' }}>
                      {hintData[activeHintLevel]?.title || `Hint Level ${activeHintLevel}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {hintData[activeHintLevel]?.hint}
                    </div>
                    {hintData[activeHintLevel]?.complexityAdvice && (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
                        ⚡ {hintData[activeHintLevel].complexityAdvice}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Editor & Console */}
        <div className="editor-workspace-panel">
          {/* Editor Toolbar */}
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8' }}>Language:</span>
              <select
                className="language-dropdown"
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
              >
                <option value="python">Python 3.14 (Sandboxed)</option>
                <option value="c">C (GCC / Clang)</option>
                <option value="cpp">C++ (G++ 17)</option>
              </select>
            </div>

            <div className="editor-toolbar-right">
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleResetCode}
                title="Reset to starter code"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <RotateCcw size={13} /> Reset
              </button>

              <button
                className="btn btn-sm btn-secondary"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Play size={14} color="#22c55e" /> {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                className="btn btn-sm btn-primary"
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Send size={14} /> {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {/* Code Textarea Area with Line Numbers */}
          <div className="code-editor-area">
            <div className="line-numbers">
              {linesArray.map(n => (
                <div key={n}>{n}</div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              className="code-textarea"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="# Write your program here..."
            />
          </div>

          {/* Bottom Execution Console */}
          <div className="execution-console">
            <div className="console-header-tabs">
              <div style={{ display: 'flex', gap: '4px' }}>
                <div
                  className={`console-tab ${activeConsoleTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('tests')}
                >
                  Test Cases {runResult?.passedTests !== undefined && `(${runResult.passedTests}/${runResult.totalTests})`}
                </div>
                <div
                  className={`console-tab ${activeConsoleTab === 'output' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('output')}
                >
                  Console Output {runResult?.errorOutput && '⚠️'}
                </div>
              </div>

              {runResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#8b949e' }}>
                  <span>⏱️ {runResult.executionTimeMs}ms</span>
                  <span>💾 {runResult.memoryUsedMb}MB</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: runResult.status === 'ACCEPTED' ? '#4ade80' : '#f87171'
                    }}
                  >
                    {runResult.status}
                  </span>
                </div>
              )}
            </div>

            <div className="console-body">
              {activeConsoleTab === 'tests' ? (
                <div>
                  {/* Test Case Selector Chips */}
                  <div className="test-case-selector">
                    {(runResult?.testResults || problem?.publicTestCases || []).map((tc: any, idx: number) => {
                      const isPassed = tc.passed;
                      return (
                        <div
                          key={idx}
                          className={`case-chip ${selectedCaseIdx === idx ? 'active' : ''} ${tc.passed !== undefined ? (isPassed ? 'passed' : 'failed') : ''}`}
                          onClick={() => setSelectedCaseIdx(idx)}
                        >
                          {tc.passed !== undefined && (isPassed ? <CheckCircle2 size={13} color="#22c55e" /> : <XCircle size={13} color="#ef4444" />)}
                          Case {idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Input vs Expected vs Actual */}
                  {activeCase && (
                    <div className="io-comparison-grid">
                      <div>
                        <div className="io-block-title">Input</div>
                        <div className="io-block-content">{activeCase.input}</div>
                      </div>

                      <div>
                        <div className="io-block-title">Expected Output</div>
                        <div className="io-block-content">{activeCase.expected || activeCase.expectedOutput}</div>
                      </div>

                      {activeCase.actual !== undefined && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div className="io-block-title">Your Output</div>
                          <div
                            className="io-block-content"
                            style={{
                              borderColor: activeCase.passed ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                            }}
                          >
                            {activeCase.actual || '(Empty Output)'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Raw Console Output Tab */
                <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '12px', color: '#e6edf3', whiteSpace: 'pre-wrap' }}>
                  {runResult?.errorOutput || runResult?.compilerOutput || runResult?.runtimeOutput ? (
                    <div style={{ color: '#f87171' }}>
                      {runResult.compilerOutput || runResult.runtimeOutput || runResult.errorOutput}
                    </div>
                  ) : runResult ? (
                    <div style={{ color: '#4ade80' }}>
                      {runResult.userFriendlyMessage}
                    </div>
                  ) : (
                    <div style={{ color: '#6e7681' }}>
                      Run your code to view compiler traces, process output, and execution logs.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
