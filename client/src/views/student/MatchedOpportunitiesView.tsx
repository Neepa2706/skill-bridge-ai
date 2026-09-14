import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  History,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  TrendingUp,
  Layers,
  Award,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import './MatchedOpportunitiesView.css';

interface MatchedOpportunitiesViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const MatchedOpportunitiesView: React.FC<MatchedOpportunitiesViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    bestMatch: 0,
    skillsMatched: 0,
    skillsToImprove: 0,
    eligibleOpportunities: 0,
    applicationsPending: 0
  });
  const [recommendationSummary, setRecommendationSummary] = useState<string>('');
  const [disclaimer, setDisclaimer] = useState<string>('This score indicates profile similarity, not selection probability.');
  const [notice, setNotice] = useState<string>('');

  // Filters State
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [workModeFilter, setWorkModeFilter] = useState<string>('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('score_desc');

  const categories = [
    { id: 'ALL', label: 'All Matches' },
    { id: 'BEST_MATCHES', label: 'Best Matches (80%+)' },
    { id: 'STRONG_MATCHES', label: 'Strong Matches' },
    { id: 'BEGINNER_FRIENDLY', label: 'Beginner Friendly' },
    { id: 'SKILL_BUILDING', label: 'Skill Building' },
    { id: 'DEADLINE_SOON', label: 'Deadline Soon' },
    { id: 'REMOTE', label: 'Remote' },
    { id: 'SAVED', label: 'Saved' }
  ];

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const params = new URLSearchParams();
      if (activeCategory !== 'ALL') params.append('category', activeCategory);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (workModeFilter !== 'ALL') params.append('workMode', workModeFilter);
      if (eligibilityFilter !== 'ALL') params.append('eligibility', eligibilityFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`/api/student/matched-opportunities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOpportunities(data.opportunities || []);
        if (data.summary) setSummary(data.summary);
        if (data.recommendationSummary) setRecommendationSummary(data.recommendationSummary);
        if (data.disclaimer) setDisclaimer(data.disclaimer);
        if (data.notice) setNotice(data.notice);
      } else {
        addToast('Error', data.error || 'Failed to load matches.', 'error');
      }
    } catch (e: any) {
      addToast('Network Error', e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [activeCategory, typeFilter, workModeFilter, eligibilityFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMatches();
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/recalculate-matches', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Matches Updated', 'Your recommendations were updated based on your latest profile and verified skills.', 'success');
        fetchMatches();
      } else {
        addToast('Error', data.error || 'Failed to recalculate matches.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleToggleSave = async (opportunityId: string, currentSaved: boolean) => {
    try {
      const token = localStorage.getItem('sb_token');
      const method = currentSaved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/opportunities/${opportunityId}/save`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOpportunities(prev =>
          prev.map(opp =>
            opp.id === opportunityId ? { ...opp, isSaved: !currentSaved } : opp
          )
        );
        addToast(
          currentSaved ? 'Removed from Saved' : 'Opportunity Saved',
          currentSaved ? 'Removed from your bookmarks' : 'Added to your bookmarked opportunities',
          'info'
        );
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    }
  };

  const getTierClass = (score: number) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'partial';
    return 'low';
  };

  const formatDeadline = (dateStr: string) => {
    if (!dateStr) return 'Open';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="matched-opportunities-container">
      {/* Header & Main Actions */}
      <div className="matched-header">
        <div className="matched-title-group">
          <h1>
            <Sparkles style={{ color: 'var(--primary)', width: 28, height: 28 }} />
            AI Opportunity Matches
            <span className="matched-title-badge">Step 12 Active</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: 4 }}>
            Tailored career matches computed against your AI skill report, coding arena track record, and preferences.
          </p>
        </div>

        <div className="matched-header-actions">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw className={isRecalculating ? 'spin' : ''} style={{ width: 16, height: 16 }} />
            {isRecalculating ? 'Recalculating...' : 'Recalculate My Matches'}
          </button>
          <button
            onClick={() => onNavigate('opportunity-preferences')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Sliders style={{ width: 16, height: 16 }} />
            Matching Preferences
          </button>
          <button
            onClick={() => onNavigate('match-history')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <History style={{ width: 16, height: 16 }} />
            Match History
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer Alert */}
      <div className="disclaimer-banner">
        <span className="disclaimer-badge">Notice</span>
        <p>
          <strong>{disclaimer}</strong> {notice || 'AI recommendations are suggestions based on your profile and opportunity requirements. They do not guarantee selection, interview calls, or placement.'}
        </p>
      </div>

      {/* Executive Recommendation Banner */}
      {recommendationSummary && (
        <div className="recommendation-summary-card">
          <div className="recommendation-content">
            <div className="recommendation-icon">
              <Sparkles style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h3>AI Matching Summary</h3>
              <p>{recommendationSummary}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('learning')}
            className="btn btn-secondary"
            style={{ whiteSpace: 'nowrap', fontSize: '13px' }}
          >
            Explore Learning Hub
          </button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="matching-metrics-grid">
        <div className="matching-metric-card">
          <div className="metric-icon-box emerald">
            <TrendingUp style={{ width: 22, height: 22 }} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{summary.bestMatch}%</span>
            <span className="metric-label">Best Match</span>
          </div>
        </div>

        <div className="matching-metric-card">
          <div className="metric-icon-box indigo">
            <CheckCircle2 style={{ width: 22, height: 22 }} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{summary.skillsMatched}</span>
            <span className="metric-label">Skills Matched</span>
          </div>
        </div>

        <div className="matching-metric-card">
          <div className="metric-icon-box amber">
            <AlertTriangle style={{ width: 22, height: 22 }} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{summary.skillsToImprove}</span>
            <span className="metric-label">Skills to Improve</span>
          </div>
        </div>

        <div className="matching-metric-card">
          <div className="metric-icon-box cyan">
            <Award style={{ width: 22, height: 22 }} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{summary.eligibleOpportunities}</span>
            <span className="metric-label">Eligible Opportunities</span>
          </div>
        </div>

        <div className="matching-metric-card">
          <div className="metric-icon-box purple">
            <Layers style={{ width: 22, height: 22 }} />
          </div>
          <div className="metric-data">
            <span className="metric-value">{summary.applicationsPending}</span>
            <span className="metric-label">Applications Pending</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs-wrapper">
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`category-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="filter-search-toolbar">
        <form onSubmit={handleSearchSubmit} className="search-input-row">
          <div className="matched-search-box">
            <Search style={{ width: 18, height: 18 }} />
            <input
              type="text"
              placeholder="Search by role, company name, or target skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div className="filter-selects-row">
          <select
            className="matched-filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="INTERNSHIP">Internships</option>
            <option value="JOB">Full-Time Jobs</option>
            <option value="HIRING_DRIVE">Hiring Drives</option>
            <option value="PLACEMENT_DRIVE">Placement Drives</option>
            <option value="HACKATHON">Hackathons</option>
            <option value="WORKSHOP">Workshops</option>
          </select>

          <select
            className="matched-filter-select"
            value={workModeFilter}
            onChange={e => setWorkModeFilter(e.target.value)}
          >
            <option value="ALL">All Work Modes</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>

          <select
            className="matched-filter-select"
            value={eligibilityFilter}
            onChange={e => setEligibilityFilter(e.target.value)}
          >
            <option value="ALL">All Eligibility</option>
            <option value="Eligible">Eligible Only</option>
            <option value="Possibly Eligible">Eligible + Possibly</option>
          </select>

          <select
            className="matched-filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ marginLeft: 'auto' }}
          >
            <option value="score_desc">Sort: Highest Match</option>
            <option value="deadline_soon">Sort: Deadline Soon</option>
            <option value="newest">Sort: Recently Added</option>
            <option value="score_asc">Sort: Lowest Match</option>
          </select>
        </div>
      </div>

      {/* Opportunities List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="spin" style={{ display: 'inline-block', marginBottom: '12px' }}>
            <RefreshCw style={{ width: 32, height: 32, color: 'var(--primary)' }} />
          </div>
          <p>Evaluating profile against verified opportunity criteria...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="empty-matches-state">
          <Briefcase style={{ width: 48, height: 48, color: 'var(--text-muted)' }} />
          <h3>No Opportunities Match Your Current Filter</h3>
          <p>
            Try broadening your search query or reset your filters. You can also recalculate your matches after completing courses.
          </p>
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setTypeFilter('ALL');
              setWorkModeFilter('ALL');
              setEligibilityFilter('ALL');
              setSearchQuery('');
            }}
            className="btn btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="opportunities-grid">
          {opportunities.map(opp => {
            const tier = getTierClass(opp.matchingScore);
            return (
              <div key={opp.id} className="ai-opp-card">
                <div>
                  <div className="card-top-row">
                    <div className="company-brand-info">
                      {opp.companyLogo ? (
                        <img src={opp.companyLogo} alt={opp.companyName} className="company-logo-avatar" />
                      ) : (
                        <div className="company-initial-avatar">
                          {opp.companyName.charAt(0)}
                        </div>
                      )}
                      <div className="company-title-meta">
                        <h4>{opp.companyName}</h4>
                        <span className="opp-type-pill">{opp.type.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="match-score-badge-wrap">
                      <div className={`match-score-pill ${tier}`}>
                        <Sparkles style={{ width: 14, height: 14 }} />
                        {opp.matchingScore}%
                      </div>
                      <span className={`match-tier-caption ${tier}`}>
                        {opp.matchCategoryLabel}
                      </span>
                    </div>
                  </div>

                  <div className="card-body" style={{ marginTop: '14px' }}>
                    <h3>{opp.title}</h3>
                    <p>{opp.shortDescription || opp.explanation}</p>

                    {/* Matched vs Improve Skills */}
                    <div className="skills-comparison-chips">
                      {opp.matchedSkills && opp.matchedSkills.length > 0 && (
                        <div className="skill-chip-group">
                          <span className="chip-group-label">Matched:</span>
                          {opp.matchedSkills.slice(0, 3).map((s: string, idx: number) => (
                            <span key={idx} className="skill-chip matched">
                              ✓ {s}
                            </span>
                          ))}
                          {opp.matchedSkills.length > 3 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              +{opp.matchedSkills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {opp.missingSkills && opp.missingSkills.length > 0 && (
                        <div className="skill-chip-group">
                          <span className="chip-group-label">Improve:</span>
                          {opp.missingSkills.slice(0, 2).map((s: string, idx: number) => (
                            <span key={idx} className="skill-chip improve">
                              △ {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Meta details */}
                  <div className="card-meta-row">
                    <div className="meta-item">
                      <MapPin style={{ width: 14, height: 14 }} />
                      <span>{opp.location} • {opp.workMode}</span>
                    </div>

                    <div className="meta-item" style={{ marginLeft: 'auto' }}>
                      <Calendar style={{ width: 14, height: 14 }} />
                      <span>Apply by {formatDeadline(opp.deadline)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span className={`eligibility-pill ${
                      opp.eligibilityStatus === 'Eligible' ? 'eligible' :
                      opp.eligibilityStatus === 'Possibly Eligible' ? 'possibly' : 'not-eligible'
                    }`}>
                      {opp.eligibilityStatus}
                    </span>

                    {(opp.stipend || opp.salaryRange) && (
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {opp.stipend || opp.salaryRange}
                      </span>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="card-actions-row" style={{ marginTop: '14px' }}>
                    <button
                      onClick={() => onNavigate('matched-opportunity-detail', { id: opp.id })}
                      className="btn btn-primary btn-details"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      View Match Details
                      <ArrowRight style={{ width: 15, height: 15 }} />
                    </button>

                    <button
                      onClick={() => handleToggleSave(opp.id, opp.isSaved)}
                      className="btn btn-secondary"
                      title={opp.isSaved ? 'Remove from Saved' : 'Save Opportunity'}
                      style={{ padding: '8px 12px' }}
                    >
                      {opp.isSaved ? (
                        <BookmarkCheck style={{ width: 16, height: 16, color: 'var(--accent-emerald)' }} />
                      ) : (
                        <Bookmark style={{ width: 16, height: 16 }} />
                      )}
                    </button>

                    <button
                      onClick={() => onNavigate('matched-opportunity-detail', { id: opp.id, tab: 'preparation' })}
                      className="btn btn-secondary"
                      title="View Preparation Plan"
                      style={{ padding: '8px 12px' }}
                    >
                      <BookOpen style={{ width: 16, height: 16 }} />
                    </button>

                    {opp.applyUrl && (
                      <a
                        href={opp.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        title="Open External Apply Link"
                        style={{ padding: '8px 12px' }}
                      >
                        <ExternalLink style={{ width: 16, height: 16 }} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
