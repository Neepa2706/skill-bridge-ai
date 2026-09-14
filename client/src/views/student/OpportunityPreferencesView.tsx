import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Sliders,
  Save,
  ArrowLeft,
  Briefcase,
  MapPin,
  Laptop,
  Coins,
  Building,
  Calendar,
  Check,
  Plus,
  X,
  Sparkles
} from 'lucide-react';
import './OpportunityPreferencesView.css';

interface OpportunityPreferencesViewProps {
  onNavigate: (view: string, data?: any) => void;
}

const COMMON_ROLES = [
  'Software Developer',
  'Python Backend Developer',
  'Full Stack Engineer',
  'Frontend React Developer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Cloud Infrastructure Intern',
  'Systems Software Engineer',
  'DevOps Engineer'
];

const COMMON_SKILLS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'SQL',
  'REST API',
  'React',
  'Node.js',
  'C++',
  'Docker',
  'AWS',
  'Linux',
  'Git',
  'Data Structures & Algorithms',
  'Problem Solving'
];

const COMMON_LOCATIONS = [
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi-NCR',
  'Chennai',
  'Remote',
  'Pan-India Virtual'
];

const COMMON_INDUSTRIES = [
  'Cloud Software & AI Systems',
  'FinTech',
  'SaaS',
  'Enterprise Software',
  'E-Commerce',
  'Healthcare Tech',
  'EdTech'
];

export const OpportunityPreferencesView: React.FC<OpportunityPreferencesViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [customRoleInput, setCustomRoleInput] = useState<string>('');

  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState<string>('');

  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [customLocationInput, setCustomLocationInput] = useState<string>('');

  const [preferredWorkModes, setPreferredWorkModes] = useState<string[]>(['REMOTE', 'HYBRID']);
  const [preferredTypes, setPreferredTypes] = useState<string[]>(['INTERNSHIP', 'JOB']);

  const [minimumStipend, setMinimumStipend] = useState<number>(20000);
  const [minimumSalary, setMinimumSalary] = useState<number>(600000);

  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState<string>('2026-06-01');
  const [preferredDuration, setPreferredDuration] = useState<string>('6 Months');

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/opportunity-preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.preferences) {
        const p = data.preferences;
        setPreferredRoles(p.preferredRoles || []);
        setPreferredSkills(p.preferredSkills || []);
        setPreferredLocations(p.preferredLocations || []);
        setPreferredWorkModes(p.preferredWorkModes || ['REMOTE', 'HYBRID']);
        setPreferredTypes(p.preferredTypes || ['INTERNSHIP', 'JOB']);
        setMinimumStipend(p.minimumStipend || 20000);
        setMinimumSalary(p.minimumSalary || 600000);
        setPreferredIndustries(p.preferredIndustries || []);
        setAvailableFrom(p.availableFrom || '2026-06-01');
        setPreferredDuration(p.preferredDuration || '6 Months');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/student/opportunity-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          preferredRoles,
          preferredSkills,
          preferredLocations,
          preferredWorkModes,
          preferredTypes,
          minimumStipend,
          minimumSalary,
          preferredIndustries,
          availableFrom,
          preferredDuration
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast('Preferences Saved', 'Your matching criteria have been updated and recommendations recalculated.', 'success');
      } else {
        addToast('Error', data.error || 'Failed to save preferences.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustomItem = (
    list: string[],
    setList: (l: string[]) => void,
    val: string,
    setVal: (v: string) => void
  ) => {
    if (val.trim() && !list.includes(val.trim())) {
      setList([...list, val.trim()]);
      setVal('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <p>Loading your matching preferences...</p>
      </div>
    );
  }

  return (
    <div className="preferences-container">
      {/* Header */}
      <div className="preferences-header">
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
            <Sliders style={{ color: 'var(--primary)', width: 26, height: 26 }} />
            Opportunity Matching Preferences
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Customize your placement targets to fine-tune AI recommendations and suitability scores.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save style={{ width: 16, height: 16 }} />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Target Roles Card */}
      <div className="preferences-card">
        <h3>
          <Briefcase style={{ width: 18, height: 18, color: 'var(--primary)' }} />
          Target Job & Internship Roles
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Select the roles you are actively seeking placement opportunities in:
        </p>

        <div className="tag-selector-wrap">
          {COMMON_ROLES.map(role => (
            <button
              key={role}
              onClick={() => toggleItem(preferredRoles, setPreferredRoles, role)}
              className={`selectable-tag ${preferredRoles.includes(role) ? 'selected' : ''}`}
            >
              {preferredRoles.includes(role) && <Check style={{ width: 13, height: 13 }} />}
              {role}
            </button>
          ))}
        </div>

        <div className="tag-input-row">
          <input
            type="text"
            placeholder="Add custom role (e.g. SRE Intern)..."
            value={customRoleInput}
            onChange={e => setCustomRoleInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomItem(preferredRoles, setPreferredRoles, customRoleInput, setCustomRoleInput);
              }
            }}
          />
          <button
            onClick={() => addCustomItem(preferredRoles, setPreferredRoles, customRoleInput, setCustomRoleInput)}
            className="btn btn-secondary"
          >
            <Plus style={{ width: 15, height: 15 }} /> Add Role
          </button>
        </div>
      </div>

      {/* Target Skills Card */}
      <div className="preferences-card">
        <h3>
          <Sparkles style={{ width: 18, height: 18, color: 'var(--accent-emerald)' }} />
          Preferred Technical Skills
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Highlight the skills and stacks you prefer using in your next project or internship:
        </p>

        <div className="tag-selector-wrap">
          {COMMON_SKILLS.map(skill => (
            <button
              key={skill}
              onClick={() => toggleItem(preferredSkills, setPreferredSkills, skill)}
              className={`selectable-tag ${preferredSkills.includes(skill) ? 'selected' : ''}`}
            >
              {preferredSkills.includes(skill) && <Check style={{ width: 13, height: 13 }} />}
              {skill}
            </button>
          ))}
        </div>

        <div className="tag-input-row">
          <input
            type="text"
            placeholder="Add additional skill (e.g. GraphQL, Next.js)..."
            value={customSkillInput}
            onChange={e => setCustomSkillInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomItem(preferredSkills, setPreferredSkills, customSkillInput, setCustomSkillInput);
              }
            }}
          />
          <button
            onClick={() => addCustomItem(preferredSkills, setPreferredSkills, customSkillInput, setCustomSkillInput)}
            className="btn btn-secondary"
          >
            <Plus style={{ width: 15, height: 15 }} /> Add Skill
          </button>
        </div>
      </div>

      {/* Location & Work Mode Preferences */}
      <div className="preferences-card">
        <h3>
          <MapPin style={{ width: 18, height: 18, color: 'var(--accent-cyan)' }} />
          Location & Work Mode
        </h3>

        <div className="form-field" style={{ marginBottom: '14px' }}>
          <label>Preferred Work Modes</label>
          <div className="tag-selector-wrap">
            {['REMOTE', 'HYBRID', 'ONSITE'].map(mode => (
              <button
                key={mode}
                onClick={() => toggleItem(preferredWorkModes, setPreferredWorkModes, mode)}
                className={`selectable-tag ${preferredWorkModes.includes(mode) ? 'selected' : ''}`}
              >
                {preferredWorkModes.includes(mode) && <Check style={{ width: 13, height: 13 }} />}
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Preferred Geographic Hubs</label>
          <div className="tag-selector-wrap">
            {COMMON_LOCATIONS.map(loc => (
              <button
                key={loc}
                onClick={() => toggleItem(preferredLocations, setPreferredLocations, loc)}
                className={`selectable-tag ${preferredLocations.includes(loc) ? 'selected' : ''}`}
              >
                {preferredLocations.includes(loc) && <Check style={{ width: 13, height: 13 }} />}
                {loc}
              </button>
            ))}
          </div>

          <div className="tag-input-row" style={{ marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Add location (e.g. Chandigarh, Ahmedabad)..."
              value={customLocationInput}
              onChange={e => setCustomLocationInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomItem(preferredLocations, setPreferredLocations, customLocationInput, setCustomLocationInput);
                }
              }}
            />
            <button
              onClick={() => addCustomItem(preferredLocations, setPreferredLocations, customLocationInput, setCustomLocationInput)}
              className="btn btn-secondary"
            >
              <Plus style={{ width: 15, height: 15 }} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Compensation & Types */}
      <div className="preferences-card">
        <h3>
          <Coins style={{ width: 18, height: 18, color: 'var(--accent-amber)' }} />
          Compensation Expectations & Opportunity Types
        </h3>

        <div className="form-field" style={{ marginBottom: '18px' }}>
          <label>Opportunity Types of Interest</label>
          <div className="tag-selector-wrap">
            {[
              { id: 'INTERNSHIP', label: 'Internships' },
              { id: 'JOB', label: 'Full-Time Jobs' },
              { id: 'HIRING_DRIVE', label: 'Hiring Drives' },
              { id: 'PLACEMENT_DRIVE', label: 'Placement Drives' },
              { id: 'HACKATHON', label: 'Hackathons' },
              { id: 'WORKSHOP', label: 'Workshops' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => toggleItem(preferredTypes, setPreferredTypes, t.id)}
                className={`selectable-tag ${preferredTypes.includes(t.id) ? 'selected' : ''}`}
              >
                {preferredTypes.includes(t.id) && <Check style={{ width: 13, height: 13 }} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="slider-group">
            <div className="slider-labels-row">
              <span>Minimum Monthly Stipend</span>
              <strong style={{ color: 'var(--accent-emerald)' }}>₹{minimumStipend.toLocaleString()} / month</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100000"
              step="5000"
              value={minimumStipend}
              onChange={e => setMinimumStipend(parseInt(e.target.value, 10))}
              className="preference-slider"
            />
          </div>

          <div className="slider-group">
            <div className="slider-labels-row">
              <span>Minimum Full-Time Salary (CTC)</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>₹{(minimumSalary / 100000).toFixed(1)} LPA</strong>
            </div>
            <input
              type="range"
              min="300000"
              max="2500000"
              step="100000"
              value={minimumSalary}
              onChange={e => setMinimumSalary(parseInt(e.target.value, 10))}
              className="preference-slider"
            />
          </div>
        </div>
      </div>

      {/* Timeline & Duration */}
      <div className="preferences-card">
        <h3>
          <Calendar style={{ width: 18, height: 18, color: '#c084fc' }} />
          Availability & Placement Timeline
        </h3>

        <div className="form-grid-2">
          <div className="form-field">
            <label>Available to Join From</label>
            <input
              type="date"
              value={availableFrom}
              onChange={e => setAvailableFrom(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Preferred Work Duration</label>
            <select
              value={preferredDuration}
              onChange={e => setPreferredDuration(e.target.value)}
            >
              <option value="2 Months (Summer)">2 Months (Summer)</option>
              <option value="3 Months">3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="1 Year">1 Year</option>
              <option value="Full Time Placement">Full Time Placement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={() => onNavigate('matched-opportunities')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save style={{ width: 16, height: 16 }} />
          {isSaving ? 'Saving...' : 'Save & Recalculate Matches'}
        </button>
      </div>
    </div>
  );
};
