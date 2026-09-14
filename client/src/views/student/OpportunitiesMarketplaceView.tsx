import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Bookmark,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Layers,
  Award,
  Zap,
  RotateCcw,
  SlidersHorizontal,
  BookmarkCheck
} from 'lucide-react';
import './OpportunitiesMarketplaceView.css';

interface Opportunity {
  id: string;
  title: string;
  type: string;
  company_name: string;
  company_logo: string | null;
  description: string;
  short_description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  eligibility_criteria: string | null;
  qualification: string | null;
  branch: string | null;
  minimum_year: number;
  maximum_year: number;
  location: string;
  work_mode: string;
  stipend: string | null;
  salary_range: string | null;
  duration: string | null;
  application_deadline: string;
  apply_url: string | null;
  verification_status: string;
  is_featured: number;
  is_saved: boolean;
  application_status: string | null;
  relevance_score: number;
  is_eligible: boolean;
  matched_skills: string[];
  missing_skills: string[];
  is_expired: boolean;
  days_remaining: number;
  deadline_badge: string;
  deadline_variant: 'danger' | 'warning' | 'info' | 'neutral';
}

interface SummaryMetrics {
  totalOpportunities: number;
  internshipsCount: number;
  jobsCount: number;
  drivesCount: number;
  eventsCount: number;
}

interface OpportunitiesMarketplaceViewProps {
  onNavigate: (view: string, data?: any) => void;
  initialTypeFilter?: string;
}

export const OpportunitiesMarketplaceView: React.FC<OpportunitiesMarketplaceViewProps> = ({
  onNavigate,
  initialTypeFilter = 'ALL'
}) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [workModeFilter, setWorkModeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [compensationFilter, setCompensationFilter] = useState('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState('active');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState<SummaryMetrics>({
    totalOpportunities: 0,
    internshipsCount: 0,
    jobsCount: 0,
    drivesCount: 0,
    eventsCount: 0
  });

  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sb_token');
      const params = new URLSearchParams();
      if (search.trim()) params.append('q', search.trim());
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (workModeFilter !== 'ALL') params.append('workMode', workModeFilter);
      if (locationFilter !== 'ALL') params.append('location', locationFilter);
      if (skillFilter !== 'ALL') params.append('skill', skillFilter);
      if (compensationFilter !== 'ALL') params.append('compensation', compensationFilter);
      if (deadlineFilter !== 'all') params.append('deadline', deadlineFilter);
      params.append('sort', sortBy);
      params.append('page', String(page));
      params.append('limit', '30');

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/opportunities?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load opportunities (${res.status})`);
      }
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setTotalPages(data.totalPages || 1);
      if (data.summaryMetrics) {
        setMetrics(data.summaryMetrics);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching opportunities');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, workModeFilter, locationFilter, skillFilter, compensationFilter, deadlineFilter, sortBy, page]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleToggleSave = async (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    const token = localStorage.getItem('sb_token');
    if (!token) {
      alert('Please log in to bookmark opportunities.');
      return;
    }

    setSavingId(opp.id);
    try {
      const method = opp.is_saved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/opportunities/${opp.id}/save`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOpportunities(prev =>
          prev.map(item => (item.id === opp.id ? { ...item, is_saved: !item.is_saved } : item))
        );
      }
    } catch (err) {
      console.error('Error toggling save', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setWorkModeFilter('ALL');
    setLocationFilter('ALL');
    setSkillFilter('ALL');
    setCompensationFilter('ALL');
    setDeadlineFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const popularSkills = ['Python', 'React', 'JavaScript', 'SQL', 'Docker', 'Machine Learning', 'Linux', 'Communication'];

  return (
    <div className="opp-marketplace">
      {/* Header Area */}
      <div className="opp-header">
        <div className="opp-header-top">
          <div className="opp-title-area">
            <h1>
              <Briefcase className="w-7 h-7 text-indigo-400" />
              Opportunities
              <span className="opp-title-badge">Marketplace</span>
            </h1>
            <p className="opp-subtitle">
              Discover verified internships, jobs, hiring drives, hackathons, and technical events curated for your learning pathway and placement readiness.
            </p>
          </div>

          <div className="opp-header-actions">
            <button
              onClick={() => onNavigate('matched-opportunities')}
              className="opp-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-gradient)', color: 'white', fontWeight: 700 }}
              title="View AI Matched Opportunities"
            >
              <Sparkles className="w-4 h-4" />
              AI Matches
            </button>
            <button
              onClick={() => onNavigate('saved-opportunities')}
              className="opp-btn-secondary"
              title="View Bookmarked Opportunities"
            >
              <Bookmark className="w-4 h-4 text-rose-400" />
              Saved Items
            </button>
            <button
              onClick={() => onNavigate('applications')}
              className="opp-btn-secondary"
              title="Track Your Application Pipeline"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              My Applications
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="opp-metrics-grid">
          <div
            className={`opp-metric-card ${typeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('ALL'); setPage(1); }}
          >
            <div className="opp-metric-icon indigo">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="opp-metric-label">All Opportunities</div>
              <div className="opp-metric-value">{metrics.totalOpportunities}</div>
            </div>
          </div>

          <div
            className={`opp-metric-card ${typeFilter === 'INTERNSHIP' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('INTERNSHIP'); setPage(1); }}
          >
            <div className="opp-metric-icon emerald">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="opp-metric-label">Internships</div>
              <div className="opp-metric-value">{metrics.internshipsCount}</div>
            </div>
          </div>

          <div
            className={`opp-metric-card ${typeFilter === 'JOB' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('JOB'); setPage(1); }}
          >
            <div className="opp-metric-icon amber">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="opp-metric-label">Jobs & Freshers</div>
              <div className="opp-metric-value">{metrics.jobsCount}</div>
            </div>
          </div>

          <div
            className={`opp-metric-card ${typeFilter === 'HIRING_DRIVE' || typeFilter === 'PLACEMENT_DRIVE' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('HIRING_DRIVE,PLACEMENT_DRIVE'); setPage(1); }}
          >
            <div className="opp-metric-icon purple">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="opp-metric-label">Campus & Drives</div>
              <div className="opp-metric-value">{metrics.drivesCount}</div>
            </div>
          </div>

          <div
            className={`opp-metric-card ${typeFilter === 'EVENT' || typeFilter === 'HACKATHON' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('EVENT,HACKATHON,WORKSHOP,COMPETITION'); setPage(1); }}
          >
            <div className="opp-metric-icon cyan">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="opp-metric-label">Events & Contests</div>
              <div className="opp-metric-value">{metrics.eventsCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Control Panel */}
      <div className="opp-control-panel">
        <div className="opp-search-row">
          <div className="opp-search-input-wrapper">
            <Search className="w-4 h-4 opp-search-icon" />
            <input
              type="text"
              placeholder="Search by role title, company name, skills (e.g., Python, React)..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="opp-search-input"
            />
          </div>

          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="opp-sort-select"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="deadline_soon">Sort: Closing Soonest</option>
            <option value="most_relevant">Sort: Best Skill Match</option>
            <option value="featured">Sort: Featured Openings</option>
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="opp-filter-row">
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="opp-filter-select"
          >
            <option value="ALL">All Types</option>
            <option value="INTERNSHIP">Internships</option>
            <option value="JOB">Full-time Jobs</option>
            <option value="HIRING_DRIVE">Hiring Drives</option>
            <option value="PLACEMENT_DRIVE">Placement Drives</option>
            <option value="EVENT">Career Events</option>
            <option value="HACKATHON">Hackathons</option>
            <option value="WORKSHOP">Workshops</option>
            <option value="COMPETITION">Coding Competitions</option>
          </select>

          <select
            value={workModeFilter}
            onChange={e => { setWorkModeFilter(e.target.value); setPage(1); }}
            className="opp-filter-select"
          >
            <option value="ALL">All Modes</option>
            <option value="REMOTE">Remote / WFH</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>

          <select
            value={compensationFilter}
            onChange={e => { setCompensationFilter(e.target.value); setPage(1); }}
            className="opp-filter-select"
          >
            <option value="ALL">All Compensation</option>
            <option value="paid">Paid (Stipend / Salary)</option>
            <option value="stipend">Stipend Offered</option>
            <option value="salary">Full-time CTC</option>
          </select>

          <select
            value={deadlineFilter}
            onChange={e => { setDeadlineFilter(e.target.value); setPage(1); }}
            className="opp-filter-select"
          >
            <option value="active">Active Deadlines</option>
            <option value="closing_soon">Closing Soon (≤ 3 Days)</option>
            <option value="expired">Expired Only</option>
            <option value="all">Include Expired</option>
          </select>

          {/* Quick Skill Chips */}
          {popularSkills.slice(0, 4).map(skill => (
            <button
              key={skill}
              type="button"
              className={`opp-quick-chip ${skillFilter === skill ? 'active' : ''}`}
              onClick={() => {
                setSkillFilter(prev => (prev === skill ? 'ALL' : skill));
                setPage(1);
              }}
            >
              {skill}
            </button>
          ))}

          {(search || typeFilter !== 'ALL' || workModeFilter !== 'ALL' || skillFilter !== 'ALL' || compensationFilter !== 'ALL' || deadlineFilter !== 'active' || sortBy !== 'newest') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="opp-reset-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          <p>Filtering verified opportunities matching your profile...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '24px' }}>
          <p style={{ fontWeight: 600 }}>Error loading opportunities: {error}</p>
          <button onClick={() => fetchOpportunities()} className="btn btn-sm btn-outline" style={{ marginTop: '10px' }}>Try Again</button>
        </div>
      )}

      {/* Opportunity Cards Grid */}
      {!loading && !error && opportunities.length > 0 && (
        <div className="opp-grid">
          {opportunities.map(opp => (
            <div
              key={opp.id}
              className={`opp-card ${opp.is_featured ? 'featured' : ''}`}
              onClick={() => onNavigate('opportunity-detail', { id: opp.id })}
            >
              <div className="opp-card-top">
                {opp.company_logo ? (
                  <img
                    src={opp.company_logo}
                    alt={opp.company_name}
                    className="opp-company-logo"
                    onError={e => {
                      // fallback if image breaks
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="opp-company-logo-fallback">
                    {opp.company_name.charAt(0)}
                  </div>
                )}

                <div className="opp-title-info">
                  <h3
                    className="opp-card-title"
                    title={opp.title}
                  >
                    {opp.title}
                  </h3>
                  <div className="opp-company-row">
                    <span className="opp-company-name">{opp.company_name}</span>
                    {opp.verification_status === 'VERIFIED' && (
                      <span className="opp-verified-badge" title="Verified by SkillBridge Admin">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`opp-bookmark-btn ${opp.is_saved ? 'saved' : ''}`}
                  onClick={e => handleToggleSave(e, opp)}
                  title={opp.is_saved ? 'Remove Bookmark' : 'Save Opportunity'}
                  disabled={savingId === opp.id}
                >
                  {opp.is_saved ? (
                    <BookmarkCheck className="w-5 h-5 fill-rose-500 text-rose-500" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Badges & Meta */}
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

              {/* Description Snippet */}
              <p className="opp-card-desc">
                {opp.short_description || opp.description}
              </p>

              {/* Required Skills Chips */}
              <div className="opp-skills-list">
                {opp.required_skills.slice(0, 4).map(skill => {
                  const isMatched = opp.matched_skills.includes(skill);
                  return (
                    <span
                      key={skill}
                      className={`opp-skill-tag ${isMatched ? 'matched' : ''}`}
                      title={isMatched ? 'Verified in your profile' : 'Required skill'}
                    >
                      {isMatched && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {skill}
                    </span>
                  );
                })}
                {opp.required_skills.length > 4 && (
                  <span className="opp-skill-tag">+{opp.required_skills.length - 4} more</span>
                )}
              </div>

              {/* Card Footer */}
              <div className="opp-card-footer">
                <div className="flex items-center gap-2">
                  <span
                    className={`opp-relevance-chip ${
                      opp.relevance_score >= 80 ? 'high' : opp.relevance_score >= 60 ? 'medium' : 'low'
                    }`}
                    title="Profile & Skills Relevance Score"
                  >
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

      {/* Empty State */}
      {!loading && !error && opportunities.length === 0 && (
        <div className="opp-empty">
          <div className="opp-empty-icon">
            <Search className="w-6 h-6" />
          </div>
          <h3>No matching opportunities found</h3>
          <p>
            Try adjusting your search keywords, broadening your location, or resetting the active filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-primary"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="opp-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="opp-page-btn"
          >
            Previous
          </button>
          <span className="opp-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="opp-page-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
export default OpportunitiesMarketplaceView;
