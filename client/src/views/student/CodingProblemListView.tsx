import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Filter,
  ArrowRight,
  Code2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import './CodingProblemListView.css';

interface CodingProblemListViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const CodingProblemListView: React.FC<CodingProblemListViewProps> = ({ onNavigate }) => {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [language, setLanguage] = useState('all');
  const [topic, setTopic] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProblems();
  }, [difficulty, language, topic, statusFilter]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const params = new URLSearchParams();
      if (difficulty !== 'all') params.append('difficulty', difficulty);
      if (language !== 'all') params.append('language', language);
      if (topic !== 'all') params.append('topic', topic);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/student/coding/problems?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setProblems(json);
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProblems();
  };

  // Filter client side on instant search input
  const filteredProblems = problems.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.topic.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="problem-list-container">
      {/* Header */}
      <div className="problem-list-header">
        <div>
          <h1 className="problem-list-title">Algorithmic Problem Catalog</h1>
          <p className="problem-list-subtitle">
            Curated hands-on coding challenges mapped to campus placement rounds and technical interview patterns.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('coding')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Coding Dashboard
        </button>
      </div>

      {/* Filter Card */}
      <div className="filter-bar-card">
        <div className="filter-row-top">
          <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by problem title, topic, or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          {/* Topic Selector */}
          <select
            className="topic-select"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          >
            <option value="all">All Topics</option>
            <option value="Conditional Statements">Conditional Statements</option>
            <option value="Arrays & Loops">Arrays & Loops</option>
            <option value="Strings & Two-Pointer">Strings & Two-Pointer</option>
            <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
          </select>
        </div>

        {/* Secondary Filter Pills */}
        <div className="filter-pills-row">
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginRight: '4px' }}>DIFFICULTY:</span>
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button
              key={d}
              className={`filter-pill ${difficulty === d ? 'active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d.toUpperCase()}
            </button>
          ))}

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, margin: '0 4px 0 12px' }}>STATUS:</span>
          {['all', 'unsolved', 'solved'].map(s => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.toUpperCase()}
            </button>
          ))}

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, margin: '0 4px 0 12px' }}>LANGUAGE:</span>
          {['all', 'python', 'c', 'cpp'].map(l => (
            <button
              key={l}
              className={`filter-pill ${language === l ? 'active' : ''}`}
              onClick={() => setLanguage(l)}
            >
              {l === 'cpp' ? 'C++' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="problems-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '2px solid #a855f7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px' }}>Loading problems...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <Code2 size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <p style={{ fontSize: '16px', color: '#94a3b8' }}>No challenges found matching your filters.</p>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setDifficulty('all'); setTopic('all'); setStatusFilter('all'); setSearch(''); setLanguage('all'); }}
              style={{ marginTop: '10px' }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <table className="problems-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>Status</th>
                <th>Title</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Languages</th>
                <th>Best Score</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map(p => (
                <tr
                  key={p.id}
                  className="problem-row"
                  onClick={() => onNavigate('coding-problem-detail', { problemId: p.id })}
                >
                  <td style={{ textAlign: 'center' }}>
                    {p.isSolved ? (
                      <CheckCircle2 size={18} color="#22c55e" />
                    ) : (
                      <Circle size={18} color="#475569" />
                    )}
                  </td>
                  <td>
                    <div className="problem-title-cell">{p.title}</div>
                  </td>
                  <td>
                    <span className="problem-topic-tag">{p.topic}</span>
                  </td>
                  <td>
                    <span className={`diff-badge ${p.difficulty}`}>
                      {p.difficulty.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="lang-chip-list">
                      {p.supportedLanguages?.map((l: string) => (
                        <span key={l} className="lang-chip">{l === 'cpp' ? 'C++' : l}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {p.bestScore > 0 ? (
                      <span style={{ fontWeight: 700, color: p.bestScore === 100 ? '#4ade80' : '#facc15' }}>
                        {p.bestScore}%
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`btn btn-sm ${p.isSolved ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('coding-problem-detail', { problemId: p.id });
                      }}
                    >
                      {p.isSolved ? 'Review' : 'Solve'} <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
