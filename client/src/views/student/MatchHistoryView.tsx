import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  History,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import './MatchHistoryView.css';

interface MatchHistoryViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/match-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.history || []);
      } else {
        addToast('Error', data.error || 'Failed to load match history.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <p>Loading historical match calculations...</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      {/* Header */}
      <div className="history-header">
        <div>
          <button
            onClick={() => onNavigate('matched-opportunities')}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back to AI Matches
          </button>
          <h1>
            <History style={{ color: 'var(--primary)', width: 26, height: 26 }} />
            AI Match Evolution History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Audit trail of how your matching scores changed after completing coursework, assessments, and profile updates.
          </p>
        </div>

        <button
          onClick={() => onNavigate('matched-opportunities')}
          className="btn btn-primary"
        >
          View Current Matches
        </button>
      </div>

      {/* Mandatory Notice */}
      <div className="disclaimer-banner">
        <span className="disclaimer-badge">Notice</span>
        <p>
          Historical matching scores reflect the profile standing and opportunity criteria evaluated at that timestamp.
          Scores indicate profile similarity, not selection probability.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="empty-matches-state">
          <History style={{ width: 44, height: 44, color: 'var(--text-muted)' }} />
          <h3>No Match History Recorded Yet</h3>
          <p>
            Your match history begins once you recalculate recommendations or complete coursework modules.
          </p>
          <button
            onClick={() => onNavigate('matched-opportunities')}
            className="btn btn-secondary"
          >
            Go to Matched Opportunities
          </button>
        </div>
      ) : (
        <div className="timeline-list">
          {history.map((item, idx) => (
            <div key={item.id || idx} className="timeline-item">
              <div className="timeline-marker">
                {item.matchingScore}%
              </div>

              <div className="timeline-card">
                <div className="timeline-card-header">
                  <div>
                    <h3>{item.opportunityTitle}</h3>
                    <div className="timeline-company">
                      {item.companyName} • {item.opportunityType?.replace('_', ' ')} • {item.location}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="opp-type-pill">{item.matchCategoryLabel}</span>
                    <div className="timeline-timestamp">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>

                <p className="timeline-explanation">{item.explanation}</p>

                <div className="timeline-skills-row">
                  {item.matchedSkills && item.matchedSkills.length > 0 && (
                    <>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Matched:</span>
                      {item.matchedSkills.slice(0, 4).map((s: string, sIdx: number) => (
                        <span key={sIdx} className="skill-chip matched" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          ✓ {s}
                        </span>
                      ))}
                    </>
                  )}

                  {item.missingSkills && item.missingSkills.length > 0 && (
                    <>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginLeft: '6px' }}>Gap:</span>
                      {item.missingSkills.slice(0, 2).map((s: string, sIdx: number) => (
                        <span key={sIdx} className="skill-chip improve" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          △ {s}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Engine: {item.engineVersion || 'v1.2.0-hybrid'}
                  </span>

                  <button
                    onClick={() => onNavigate('matched-opportunity-detail', { id: item.opportunityId })}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Match Analysis <ArrowRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
