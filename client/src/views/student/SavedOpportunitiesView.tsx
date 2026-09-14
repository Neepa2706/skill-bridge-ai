import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import './SavedOpportunitiesView.css';
import './OpportunitiesMarketplaceView.css';

interface SavedOpportunity {
  saved_record_id: string;
  saved_at: string;
  id: string;
  title: string;
  type: string;
  company_name: string;
  company_logo: string | null;
  short_description: string | null;
  description: string;
  required_skills: string[];
  location: string;
  work_mode: string;
  stipend: string | null;
  salary_range: string | null;
  application_deadline: string;
  apply_url: string | null;
  application_status: string | null;
  relevance_score: number;
  is_expired: boolean;
  days_remaining: number;
  deadline_badge: string;
  deadline_variant: 'danger' | 'warning' | 'info' | 'neutral';
}

interface SavedOpportunitiesViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const SavedOpportunitiesView: React.FC<SavedOpportunitiesViewProps> = ({ onNavigate }) => {
  const [savedItems, setSavedItems] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/saved-opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch saved opportunities');
      const data = await res.json();
      setSavedItems(data);
    } catch (err: any) {
      setError(err.message || 'Error loading saved items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleRemove = async (oppId: string) => {
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch(`/api/opportunities/${oppId}/save`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedItems(prev => prev.filter(item => item.id !== oppId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const urgentCount = savedItems.filter(item => !item.is_expired && item.days_remaining <= 3).length;

  return (
    <div className="saved-opps-view">
      <button onClick={() => onNavigate('opportunities')} className="opp-back-btn">
        <ArrowLeft className="w-4 h-4" />
        Back to Opportunities
      </button>

      <div className="saved-header">
        <h1>
          <Bookmark className="w-6 h-6 text-rose-400 fill-rose-500/20" />
          Saved Opportunities
        </h1>
        <p>Bookmarked internships, jobs, and hackathons with deadline reminders.</p>
      </div>

      {urgentCount > 0 && (
        <div className="saved-urgent-banner">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong>Deadline Alert:</strong> You have {urgentCount} saved {urgentCount === 1 ? 'opportunity' : 'opportunities'} closing within the next 3 days! Complete your applications soon.
          </span>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          <p>Loading your saved opportunities...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && savedItems.length > 0 && (
        <div className="opp-grid">
          {savedItems.map(opp => (
            <div key={opp.id} className="opp-card">
              <div className="opp-card-top">
                {opp.company_logo ? (
                  <img
                    src={opp.company_logo}
                    alt={opp.company_name}
                    className="opp-company-logo"
                    onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="opp-company-logo-fallback">{opp.company_name.charAt(0)}</div>
                )}

                <div className="opp-title-info">
                  <h3
                    className="opp-card-title"
                    onClick={() => onNavigate('opportunity-detail', { id: opp.id })}
                  >
                    {opp.title}
                  </h3>
                  <div className="opp-company-row">
                    <span className="opp-company-name">{opp.company_name}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(opp.id)}
                  className="opp-bookmark-btn"
                  title="Remove from Saved"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                </button>
              </div>

              <div className="opp-badge-row">
                <span className="opp-pill type">{opp.type.replace('_', ' ')}</span>
                <span className="opp-pill workmode">{opp.work_mode}</span>
                <span className="opp-pill location">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {opp.location}
                </span>
                {(opp.stipend || opp.salary_range) && (
                  <span className="opp-pill comp">
                    {opp.stipend || opp.salary_range}
                  </span>
                )}
                <span className={`opp-deadline-badge ${opp.deadline_variant}`}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {opp.deadline_badge}
                </span>
              </div>

              <p className="opp-card-desc">
                {opp.short_description || opp.description}
              </p>

              <div className="opp-card-footer">
                <div className="flex items-center gap-2">
                  <span className="opp-relevance-chip high">
                    <Sparkles className="w-3.5 h-3.5" />
                    {opp.relevance_score}% Match
                  </span>

                  {opp.application_status && (
                    <span className="opp-app-status-badge">
                      {opp.application_status}
                    </span>
                  )}
                </div>

                <div className="opp-card-btns">
                  <button
                    type="button"
                    onClick={() => onNavigate('opportunity-detail', { id: opp.id })}
                    className="opp-btn-view"
                  >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && savedItems.length === 0 && (
        <div className="opp-empty">
          <div className="opp-empty-icon">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3>No saved opportunities yet</h3>
          <p>
            When you see an internship, job, or event you want to revisit later, click the bookmark icon to save it here.
          </p>
          <button
            onClick={() => onNavigate('opportunities')}
            className="btn btn-primary"
          >
            Explore Opportunities
          </button>
        </div>
      )}
    </div>
  );
};
export default SavedOpportunitiesView;
