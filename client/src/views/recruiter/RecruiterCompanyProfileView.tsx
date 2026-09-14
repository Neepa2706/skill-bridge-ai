import React, { useState, useEffect } from 'react';
import { Building, ShieldCheck, Globe, MapPin, Users, Mail, User, Briefcase, Save, ArrowLeft } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './RecruiterCompanyProfileView.css';

interface RecruiterCompanyProfileViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const RecruiterCompanyProfileView: React.FC<RecruiterCompanyProfileViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    companyName: '',
    logoUrl: '',
    industry: '',
    website: '',
    description: '',
    location: '',
    companySize: '',
    contactEmail: '',
    verificationStatus: 'PENDING_VERIFICATION',
    recruiterName: '',
    designation: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/company-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setProfile(json.data);
      }
    } catch (e: any) {
      addToast('Error', 'Failed to load company profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/recruiter/company-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Profile Updated', 'Company profile saved successfully.', 'success');
      } else {
        addToast('Error', json.message || 'Failed to update profile', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p>Loading company profile...</p>
      </div>
    );
  }

  const isVerified = profile.verificationStatus === 'VERIFIED';

  return (
    <div className="recruiter-profile-container">
      {onNavigate && (
        <button
          onClick={() => onNavigate('recruiter-dashboard')}
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      )}

      {/* Profile Header */}
      <div className="recruiter-profile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '28px',
              fontWeight: 800
            }}
          >
            {profile.companyName ? profile.companyName.charAt(0).toUpperCase() : <Building size={32} />}
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
              {profile.companyName || 'Company Profile'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {profile.industry || 'Industry Sector'} • {profile.location || 'Location'}
            </p>
          </div>
        </div>

        <div>
          {isVerified ? (
            <span className="company-badge-verified">
              <ShieldCheck size={16} /> College & Platform Verified
            </span>
          ) : (
            <span className="company-badge-pending">
              Verification Pending Admin Review
            </span>
          )}
        </div>
      </div>

      {/* Verification Notice */}
      <div className="verification-notice">
        <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Official Campus Partner Verification</strong>
          <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>
            To safeguard students and prevent fraudulent campus recruitment drives, company credentials, corporate domain, and placement authorization are verified by College Administrators. Verification status cannot be self-edited.
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          Organization Details
        </h2>

        <div className="profile-grid">
          <div className="profile-field-group">
            <label>Company Name</label>
            <input
              type="text"
              className="profile-input"
              value={profile.companyName || ''}
              onChange={e => setProfile({ ...profile, companyName: e.target.value })}
              required
            />
          </div>

          <div className="profile-field-group">
            <label>Industry / Domain</label>
            <input
              type="text"
              className="profile-input"
              value={profile.industry || ''}
              onChange={e => setProfile({ ...profile, industry: e.target.value })}
              placeholder="e.g. Cloud Computing, AI / ML, FinTech"
              required
            />
          </div>

          <div className="profile-field-group">
            <label>Website URL</label>
            <input
              type="url"
              className="profile-input"
              value={profile.website || ''}
              onChange={e => setProfile({ ...profile, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="profile-field-group">
            <label>Headquarters / Location</label>
            <input
              type="text"
              className="profile-input"
              value={profile.location || ''}
              onChange={e => setProfile({ ...profile, location: e.target.value })}
              placeholder="e.g. Bengaluru, India / Remote"
            />
          </div>

          <div className="profile-field-group">
            <label>Company Size</label>
            <input
              type="text"
              className="profile-input"
              value={profile.companySize || ''}
              onChange={e => setProfile({ ...profile, companySize: e.target.value })}
              placeholder="e.g. 50-200 Employees"
            />
          </div>

          <div className="profile-field-group">
            <label>Official Hiring Email</label>
            <input
              type="email"
              className="profile-input"
              value={profile.contactEmail || ''}
              onChange={e => setProfile({ ...profile, contactEmail: e.target.value })}
              placeholder="talent@company.com"
            />
          </div>
        </div>

        <div className="profile-field-group">
          <label>Company Description & Overview</label>
          <textarea
            className="profile-input"
            rows={4}
            value={profile.description || ''}
            onChange={e => setProfile({ ...profile, description: e.target.value })}
            placeholder="Describe your organization's mission, engineering culture, and technology stack..."
          />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginTop: '12px' }}>
          Recruiter Point of Contact
        </h2>

        <div className="profile-grid">
          <div className="profile-field-group">
            <label>Full Name</label>
            <input
              type="text"
              className="profile-input"
              value={profile.recruiterName || ''}
              onChange={e => setProfile({ ...profile, recruiterName: e.target.value })}
            />
          </div>

          <div className="profile-field-group">
            <label>Corporate Designation</label>
            <input
              type="text"
              className="profile-input"
              value={profile.designation || ''}
              onChange={e => setProfile({ ...profile, designation: e.target.value })}
              placeholder="e.g. Lead Technical Recruiter"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '160px' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
