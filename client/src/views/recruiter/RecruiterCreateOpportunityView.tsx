import React, { useState } from 'react';
import { Briefcase, ArrowLeft, Send, Sparkles, Building, MapPin, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './RecruiterCreateOpportunityView.css';

interface RecruiterCreateOpportunityViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterCreateOpportunityView: React.FC<RecruiterCreateOpportunityViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('INTERNSHIP');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('Python, Data Structures, SQL, REST APIs');
  const [preferredSkills, setPreferredSkills] = useState('Docker, AWS, React, Git');
  const [eligibility, setEligibility] = useState('CGPA >= 7.0, 2026 Graduating Batch');
  const [qualification, setQualification] = useState('B.Tech / B.E. / M.Tech / MCA');
  const [branch, setBranch] = useState('Computer Science, IT, Electronics');
  const [academicYear, setAcademicYear] = useState('Year 3 / Year 4');
  const [location, setLocation] = useState('Bengaluru / Hybrid');
  const [workMode, setWorkMode] = useState('HYBRID');
  const [stipend, setStipend] = useState('₹35,000 / month');
  const [salary, setSalary] = useState('₹10,00,000 - ₹14,00,000 / year');
  const [duration, setDuration] = useState('6 Months');
  const [applicationDeadline, setApplicationDeadline] = useState('2026-11-30');
  const [applyUrl, setApplyUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const parsedRequiredSkills = requiredSkills.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast('Validation Error', 'Title and description are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          type,
          description,
          requiredSkills: parsedRequiredSkills,
          preferredSkills: preferredSkills.split(',').map(s => s.trim()).filter(Boolean),
          eligibility,
          qualification,
          branch,
          academicYear,
          location,
          workMode,
          stipend: type === 'JOB' ? undefined : stipend,
          salary: type === 'INTERNSHIP' ? undefined : salary,
          duration,
          applicationDeadline,
          applyUrl,
          contactEmail
        })
      });

      const json = await res.json();
      if (res.ok) {
        addToast(
          'Opportunity Submitted for Review',
          'Your posting is now pending verification by Platform & College Admins before public listing.',
          'success'
        );
        if (onNavigate) {
          onNavigate('recruiter-opportunities');
        }
      } else {
        addToast('Error', json.message || 'Failed to create opportunity', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-opp-container">
      {onNavigate && (
        <button
          onClick={() => onNavigate('recruiter-opportunities')}
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={14} /> Back to Opportunities
        </button>
      )}

      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>
          Post Campus Opportunity
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Publish verified internships, jobs, hiring challenges, or workshops to eligible college students.
        </p>
      </div>

      {/* Admin Review Notice */}
      <div
        style={{
          background: 'hsla(40, 95%, 55%, 0.1)',
          border: '1px solid hsla(40, 95%, 55%, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}
      >
        <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#f59e0b' }}>Campus Placement Integrity Policy:</strong> All newly posted opportunities initially hold a <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>PENDING_VERIFICATION</span> status. Once reviewed by the College TPO or Platform Admin, your posting will be published to student marketplaces and matching algorithms.
        </div>
      </div>

      <div className="create-opp-grid">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>OPPORTUNITY TITLE</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Software Development Engineer - Backend Intern"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>OPPORTUNITY TYPE</label>
              <select
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="INTERNSHIP">Internship</option>
                <option value="JOB">Full-Time Job</option>
                <option value="HIRING_DRIVE">Placement Drive</option>
                <option value="HACKATHON">Hackathon</option>
                <option value="WORKSHOP">Workshop</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>JOB / ROLE DESCRIPTION</label>
            <textarea
              className="input"
              rows={5}
              style={{ width: '100%', marginTop: '4px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Outline candidate responsibilities, day-to-day projects, tech stack, and growth opportunities..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>REQUIRED SKILLS (COMMA SEPARATED)</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={requiredSkills}
                onChange={e => setRequiredSkills(e.target.value)}
                placeholder="Python, SQL, DSA, System Design"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>PREFERRED SKILLS</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={preferredSkills}
                onChange={e => setPreferredSkills(e.target.value)}
                placeholder="Docker, Redis, AWS, Next.js"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>LOCATION</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>WORK MODE</label>
              <select
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={workMode}
                onChange={e => setWorkMode(e.target.value)}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {type === 'JOB' ? 'SALARY (CTC)' : 'STIPEND'}
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={type === 'JOB' ? salary : stipend}
                onChange={e => type === 'JOB' ? setSalary(e.target.value) : setStipend(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>ELIGIBILITY CRITERIA</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={eligibility}
                onChange={e => setEligibility(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TARGET BRANCHES</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={branch}
                onChange={e => setBranch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>APPLICATION DEADLINE</label>
              <input
                type="date"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={applicationDeadline}
                onChange={e => setApplicationDeadline(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>EXTERNAL APPLY URL (OPTIONAL)</label>
              <input
                type="url"
                className="input"
                style={{ width: '100%', marginTop: '4px' }}
                value={applyUrl}
                onChange={e => setApplyUrl(e.target.value)}
                placeholder="https://company.careers/apply"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('recruiter-opportunities')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ minWidth: '180px' }}
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit for Moderation'}
            </button>
          </div>
        </form>

        {/* Live Student Preview Card */}
        <div className="opp-preview-sticky">
          <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--primary)" /> LIVE STUDENT VIEW PREVIEW
          </div>
          <div className="card" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="badge" style={{ background: 'hsla(265, 89%, 66%, 0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                {type}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {workMode}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              {title || 'Untitled Opportunity'}
            </h3>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Building size={14} /> Your Company Name • <MapPin size={14} /> {location}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {description || 'Provide a detailed description to see the preview text rendered here for students.'}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {parsedRequiredSkills.slice(0, 4).map((s, idx) => (
                <span key={idx} className="badge badge-subtle" style={{ fontSize: '11px' }}>
                  {s}
                </span>
              ))}
              {parsedRequiredSkills.length > 4 && (
                <span className="badge badge-subtle" style={{ fontSize: '11px' }}>
                  +{parsedRequiredSkills.length - 4} more
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>COMPENSATION</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  {type === 'JOB' ? salary : stipend}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DEADLINE</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {applicationDeadline || 'No date set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
