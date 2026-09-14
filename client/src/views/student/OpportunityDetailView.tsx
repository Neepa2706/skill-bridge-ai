import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Flag,
  Sparkles,
  Layers,
  GraduationCap,
  Mail,
  Phone,
  Info,
  X
} from 'lucide-react';
import './OpportunityDetailView.css';

interface OpportunityDetail {
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
  start_date: string | null;
  end_date: string | null;
  application_deadline: string;
  apply_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  verification_status: string;
  is_saved: boolean;
  application_status: string | null;
  application_details?: {
    application_id: string;
    status: string;
    notes?: string;
    application_reference?: string;
  };
  relevance_score: number;
  is_eligible: boolean;
  matched_skills: string[];
  missing_skills: string[];
  eligibility_reasons: string[];
  is_expired: boolean;
  days_remaining: number;
  deadline_badge: string;
  deadline_variant: 'danger' | 'warning' | 'info' | 'neutral';
}

interface OpportunityDetailViewProps {
  id: string;
  onNavigate: (view: string, data?: any) => void;
}

export const OpportunityDetailView: React.FC<OpportunityDetailViewProps> = ({ id, onNavigate }) => {
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackStatus, setTrackStatus] = useState('APPLIED');
  const [trackNotes, setTrackNotes] = useState('');
  const [trackReference, setTrackReference] = useState('');
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Expired Link');
  const [reportDesc, setReportDesc] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('sb_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/opportunities/${id}`, { headers });
        if (!res.ok) {
          throw new Error(`Opportunity not found or unavailable (${res.status})`);
        }
        const data = await res.json();
        setOpp(data);
        if (data.application_details) {
          setTrackStatus(data.application_details.status || 'APPLIED');
          setTrackNotes(data.application_details.notes || '');
          setTrackReference(data.application_details.application_reference || '');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error fetching opportunity details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleToggleSave = async () => {
    if (!opp) return;
    const token = localStorage.getItem('sb_token');
    if (!token) {
      alert('Please log in to bookmark this opportunity.');
      return;
    }

    setIsSaving(true);
    try {
      const method = opp.is_saved ? 'DELETE' : 'POST';
      const res = await fetch(`/api/opportunities/${opp.id}/save`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOpp(prev => (prev ? { ...prev, is_saved: !prev.is_saved } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyClick = () => {
    if (!opp) return;
    if (opp.apply_url) {
      window.open(opp.apply_url, '_blank', 'noopener,noreferrer');
    }
    // Open tracking dialog so student can choose to track their external application
    setShowTrackModal(true);
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opp) return;
    const token = localStorage.getItem('sb_token');
    if (!token) {
      alert('Please log in to track applications.');
      return;
    }

    setIsSubmittingTracking(true);
    try {
      const res = await fetch('/api/opportunities/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          opportunity_id: opp.id,
          status: trackStatus,
          notes: trackNotes,
          application_reference: trackReference || null
        })
      });
      if (res.ok) {
        setOpp(prev =>
          prev
            ? {
                ...prev,
                application_status: trackStatus,
                application_details: {
                  application_id: prev.application_details?.application_id || 'new',
                  status: trackStatus,
                  notes: trackNotes,
                  application_reference: trackReference
                }
              }
            : null
        );
        setShowTrackModal(false);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update tracking');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opp) return;
    const token = localStorage.getItem('sb_token');
    if (!token) {
      alert('Please log in to submit a report.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch(`/api/opportunities/${opp.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: reportReason,
          description: reportDesc
        })
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
        }, 1500);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="opp-detail-view" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }}></div>
        <p style={{ color: '#94a3b8' }}>Loading opportunity details...</p>
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="opp-detail-view">
        <button onClick={() => onNavigate('opportunities')} className="opp-back-btn">
          <ArrowLeft className="w-4 h-4" />
          Back to Opportunities
        </button>
        <div className="card" style={{ padding: '32px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <h3>Unable to load opportunity</h3>
          <p>{error || 'This listing may have been unlisted or removed.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="opp-detail-view">
      {/* Back button */}
      <button onClick={() => onNavigate('opportunities')} className="opp-back-btn">
        <ArrowLeft className="w-4 h-4" />
        Back to Opportunities
      </button>

      {/* Expired Warning Alert */}
      {opp.is_expired && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          color: '#f87171'
        }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <strong>Application Deadline Passed:</strong> The official deadline for this opportunity was on {new Date(opp.application_deadline).toLocaleDateString()}. The application portal may now be closed, but you can still record or update your status in your personal tracking pipeline if you applied previously.
          </div>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="opp-detail-hero">
        <div className="opp-detail-main">
          {opp.company_logo ? (
            <img
              src={opp.company_logo}
              alt={opp.company_name}
              className="opp-detail-logo"
              onError={e => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="opp-detail-logo-fallback">
              {opp.company_name.charAt(0)}
            </div>
          )}

          <div className="opp-detail-titles">
            <h1>{opp.title}</h1>
            <div className="opp-detail-company-line">
              <span className="opp-detail-company-name">{opp.company_name}</span>
              {opp.verification_status === 'VERIFIED' && (
                <span className="opp-verified-badge" title="Verified by SkillBridge Admin">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  Verified Organization
                </span>
              )}
            </div>

            <div className="opp-detail-tags">
              <span className="opp-pill type">{opp.type.replace('_', ' ')}</span>
              <span className="opp-pill workmode">{opp.work_mode}</span>
              <span className="opp-pill location">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                {opp.location}
              </span>
              {(opp.stipend || opp.salary_range) && (
                <span className="opp-pill comp">
                  {opp.stipend || opp.salary_range}
                </span>
              )}
              <span className={`opp-deadline-badge ${opp.deadline_variant}`}>
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {opp.deadline_badge}
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="opp-detail-actions">
          {opp.apply_url ? (
            <button
              onClick={handleApplyClick}
              className="opp-apply-btn"
              style={opp.is_expired ? { background: '#475569', boxShadow: 'none' } : undefined}
            >
              {opp.is_expired ? 'Deadline Passed — External Portal' : 'Apply on Company Site'}
              <ExternalLink className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowTrackModal(true)}
              className="opp-apply-btn"
              style={opp.is_expired ? { background: '#475569', boxShadow: 'none' } : undefined}
            >
              {opp.is_expired ? 'Deadline Passed — Track Pipeline' : 'Apply & Track Pipeline'}
              <Layers className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowTrackModal(true)}
            className="opp-track-btn"
          >
            <Layers className="w-4 h-4" />
            {opp.application_status ? `Status: ${opp.application_status}` : 'Track Application'}
          </button>

          <div className="opp-aux-actions">
            <button
              onClick={handleToggleSave}
              className={`opp-aux-btn ${opp.is_saved ? 'saved' : ''}`}
              disabled={isSaving}
            >
              {opp.is_saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {opp.is_saved ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="opp-aux-btn"
            >
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* Profile Relevance & Eligibility Banner */}
      <div className="opp-relevance-banner">
        <div className="opp-relevance-banner-header">
          <div className="opp-relevance-banner-title">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            SkillBridge Profile Relevance Evaluation
          </div>
          <div className="opp-match-percent">
            {opp.relevance_score}% Match
          </div>
        </div>

        <div className="opp-relevance-reasons">
          {opp.eligibility_reasons.map((reason, idx) => (
            <div key={idx} className="opp-reason-item">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>

        <div className="opp-skill-match-row">
          {opp.matched_skills.map(sk => (
            <span key={sk} className="opp-badge-matched">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {sk} (Verified)
            </span>
          ))}

          {opp.missing_skills.map(sk => (
            <span key={sk} className="opp-badge-missing">
              <AlertCircle className="w-3.5 h-3.5" />
              {sk} (Recommended for Practice)
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid: Description & Sidebar */}
      <div className="opp-detail-grid">
        {/* Left Column: Descriptions & Details */}
        <div className="opp-detail-content">
          <div className="opp-section-card">
            <h2 className="opp-section-title">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Role Description & Key Responsibilities
            </h2>
            <div className="opp-prose">
              {opp.description}
            </div>
          </div>

          <div className="opp-section-card">
            <h2 className="opp-section-title">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              Eligibility & Candidate Requirements
            </h2>
            <div className="opp-prose">
              {opp.eligibility_criteria || 'Open to all students matching qualification criteria.'}
            </div>
            {opp.qualification && (
              <p style={{ marginTop: '14px', fontSize: '13px', color: '#cbd5e1' }}>
                <strong style={{ color: '#fff' }}>Preferred Degree/Course:</strong> {opp.qualification}
              </p>
            )}
            {opp.branch && (
              <p style={{ marginTop: '6px', fontSize: '13px', color: '#cbd5e1' }}>
                <strong style={{ color: '#fff' }}>Eligible Disciplines:</strong> {opp.branch}
              </p>
            )}
          </div>

          <div className="opp-section-card">
            <h2 className="opp-section-title">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Required & Preferred Skills
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Core Required Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {opp.required_skills.map(sk => (
                  <span key={sk} className="opp-skill-tag matched" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {opp.preferred_skills.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Preferred / Bonus Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {opp.preferred_skills.map(sk => (
                    <span key={sk} className="opp-skill-tag" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata Sidebar */}
        <div className="opp-detail-sidebar">
          <div className="opp-section-card">
            <h3 className="opp-section-title">
              <Info className="w-5 h-5 text-indigo-400" />
              Opportunity Summary
            </h3>
            <div className="opp-info-list">
              <div className="opp-info-item">
                <div className="opp-info-icon">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="opp-info-label">Application Deadline</div>
                  <div className="opp-info-val">
                    {new Date(opp.application_deadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {opp.duration && (
                <div className="opp-info-item">
                  <div className="opp-info-icon">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="opp-info-label">Duration</div>
                    <div className="opp-info-val">{opp.duration}</div>
                  </div>
                </div>
              )}

              {(opp.stipend || opp.salary_range) && (
                <div className="opp-info-item">
                  <div className="opp-info-icon">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="opp-info-label">Compensation</div>
                    <div className="opp-info-val">{opp.stipend || opp.salary_range}</div>
                  </div>
                </div>
              )}

              <div className="opp-info-item">
                <div className="opp-info-icon">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="opp-info-label">Location & Mode</div>
                  <div className="opp-info-val">{opp.location} ({opp.work_mode})</div>
                </div>
              </div>

              {opp.contact_email && (
                <div className="opp-info-item">
                  <div className="opp-info-icon">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="opp-info-label">Recruiter Contact</div>
                    <div className="opp-info-val" style={{ wordBreak: 'break-all', fontSize: '13px' }}>
                      {opp.contact_email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track Application Modal */}
      {showTrackModal && (
        <div className="opp-modal-backdrop">
          <div className="opp-modal-content">
            <div className="opp-modal-header">
              <h3>
                <Layers className="w-5 h-5 text-indigo-400" />
                Track Application in Pipeline
              </h3>
              <button onClick={() => setShowTrackModal(false)} className="opp-modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTracking}>
              <div className="opp-modal-body">
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                  Did you apply or plan to apply? Record your current status in your personal SkillBridge career pipeline to keep track of interviews and deadlines.
                </p>

                <div className="opp-form-group">
                  <label>Application Stage</label>
                  <select
                    value={trackStatus}
                    onChange={e => setTrackStatus(e.target.value)}
                    className="opp-form-control"
                  >
                    <option value="INTERESTED">Interested (Planning to Apply)</option>
                    <option value="SAVED">Saved for Later</option>
                    <option value="APPLIED">Applied (Submitted on Portal)</option>
                    <option value="SHORTLISTED">Shortlisted / Screening Passed</option>
                    <option value="INTERVIEW">Interview Scheduled</option>
                    <option value="SELECTED">Selected / Received Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                </div>

                <div className="opp-form-group">
                  <label>Application Reference / Job ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., REQ-2026-9812"
                    value={trackReference}
                    onChange={e => setTrackReference(e.target.value)}
                    className="opp-form-control"
                  />
                </div>

                <div className="opp-form-group">
                  <label>Personal Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g., Submitted customized resume. Interview scheduled on Tuesday at 3 PM."
                    value={trackNotes}
                    onChange={e => setTrackNotes(e.target.value)}
                    className="opp-form-control"
                  />
                </div>
              </div>

              <div className="opp-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowTrackModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTracking}
                  className="btn btn-primary"
                >
                  {isSubmittingTracking ? 'Saving...' : 'Save to Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Opportunity Modal */}
      {showReportModal && (
        <div className="opp-modal-backdrop">
          <div className="opp-modal-content">
            <div className="opp-modal-header">
              <h3>
                <Flag className="w-5 h-5 text-rose-400" />
                Report Opportunity
              </h3>
              <button onClick={() => setShowReportModal(false)} className="opp-modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#34d399' }}>
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                <h4>Report Submitted</h4>
                <p style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  Our moderation team will review this listing promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport}>
                <div className="opp-modal-body">
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Help us maintain verified, high-quality opportunities on SkillBridge.
                  </p>

                  <div className="opp-form-group">
                    <label>Reason for Report</label>
                    <select
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      className="opp-form-control"
                    >
                      <option value="Expired Link">Application Link Expired or Broken</option>
                      <option value="Scam / Fraud">Suspicious Posting or Fraudulent Request</option>
                      <option value="Incorrect Details">Incorrect Compensation or Eligibility Details</option>
                      <option value="Duplicate Listing">Duplicate Listing</option>
                      <option value="Other">Other Issue</option>
                    </select>
                  </div>

                  <div className="opp-form-group">
                    <label>Additional Details</label>
                    <textarea
                      rows={3}
                      placeholder="Please describe what is incorrect or broken..."
                      value={reportDesc}
                      onChange={e => setReportDesc(e.target.value)}
                      className="opp-form-control"
                    />
                  </div>
                </div>

                <div className="opp-modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="btn btn-primary"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default OpportunityDetailView;
