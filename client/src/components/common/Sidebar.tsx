import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Award,
  TrendingDown,
  BookOpen,
  Code2,
  Languages,
  ShieldCheck,
  Briefcase,
  Calendar,
  Layers,
  Video,
  CheckCircle2,
  FileText,
  UserCheck,
  Building,
  Users,
  Sliders,
  FileSpreadsheet,
  Sparkles,
  History,
  Bell,
  Plus,
  Activity
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  // Navigation Items by Role
  const studentItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Career Roadmap', icon: Compass },
    { id: 'skills', label: 'My Skills', icon: Award },
    { id: 'skill-gaps', label: 'Skill Gap Engine', icon: TrendingDown },
    { id: 'learning', label: 'Learning Platform', icon: BookOpen },
    { id: 'mock-tests', label: 'AI Mock Tests', icon: ShieldCheck },
    { id: 'coding', label: 'Coding Arena', icon: Code2 },
    { id: 'languages', label: 'Language Hub', icon: Languages },
    { id: 'matched-opportunities', label: 'AI Opportunity Matches', icon: Sparkles },
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase },
    { id: 'saved-opportunities', label: 'Saved Items', icon: Award },
    { id: 'applications', label: 'My Applications', icon: Layers },
    { id: 'opportunity-preferences', label: 'Match Preferences', icon: Sliders },
    { id: 'match-history', label: 'Match History', icon: History },
    { id: 'mock-interview-dashboard', label: 'AI Mock Interviews', icon: Video },
    { id: 'mentor-support', label: 'Live Mentor Support', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'unified-reports', label: 'Portfolio Reports', icon: FileText },
    { id: 'analytics', label: 'Placement Analytics', icon: Activity }
  ];

  const collegeItems = [
    { id: 'college-dashboard', label: 'Department Analytics', icon: LayoutDashboard },
    { id: 'college-students', label: 'Authorized Students', icon: Users },
    { id: 'admin-opportunities', label: 'Opportunity Moderation', icon: Briefcase },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'unified-reports', label: 'Department Reports', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Campus Analytics', icon: Activity }
  ];

  const recruiterItems = [
    { id: 'recruiter-dashboard', label: 'Hiring Dashboard', icon: LayoutDashboard },
    { id: 'recruiter-opportunities', label: 'My Postings', icon: Briefcase },
    { id: 'recruiter-create-opportunity', label: 'Post Opportunity', icon: Plus },
    { id: 'recruiter-applications', label: 'Applicant Pipeline', icon: Layers },
    { id: 'recruiter-interviews', label: 'Campus Interviews', icon: Calendar },
    { id: 'recruiter-company-profile', label: 'Company Profile', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'unified-reports', label: 'Hiring Reports', icon: FileText }
  ];

  const mentorItems = [
    { id: 'mentor-dashboard', label: 'Mentor Dashboard', icon: LayoutDashboard },
    { id: 'mentor-sessions', label: 'Live Sessions', icon: Video },
    { id: 'mentor-feedback', label: 'Student Feedback', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'unified-reports', label: 'Mentorship Reports', icon: FileText }
  ];

  const adminItems = [
    { id: 'admin-dashboard', label: 'Platform Overview', icon: LayoutDashboard },
    { id: 'admin-opportunities', label: 'Opportunity Moderation', icon: Briefcase },
    { id: 'admin-users', label: 'User Roles & RBAC', icon: Users },
    { id: 'admin-audit', label: 'Security & Audit Logs', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'unified-reports', label: 'Executive Reports', icon: FileText },
    { id: 'analytics', label: 'System Analytics', icon: Activity }
  ];

  let items = studentItems;
  if (role === 'college') items = collegeItems;
  else if (role === 'recruiter') items = recruiterItems;
  else if (role === 'mentor') items = mentorItems;
  else if (role === 'admin') items = adminItems;

  return (
    <aside
      className="sidebar"
      style={{
        width: '260px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 41px)',
        position: 'sticky',
        top: '41px',
        overflowY: 'auto',
        flexShrink: 0
      }}
    >
      <div style={{ padding: '20px 16px 10px 16px' }}>
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            fontWeight: 700,
            paddingLeft: '12px'
          }}
        >
          {role.toUpperCase()} NAVIGATION
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px 24px 12px' }}>
        {items.map(item => {
          const Icon = item.icon;
          const isActive =
            currentView === item.id ||
            (item.id === 'matched-opportunities' && ['matched-opportunities', 'matched-opportunity-detail'].includes(currentView)) ||
            (item.id === 'coding' && ['coding-problems', 'coding-problem-detail', 'coding-submission-result'].includes(currentView)) ||
            (item.id === 'mock-tests' && ['mock-test-instructions', 'mock-test-attempt', 'mock-test-result', 'mock-test-review'].includes(currentView)) ||
            (item.id === 'learning' && ['course-overview', 'course-detail', 'lesson-player'].includes(currentView)) ||
            (item.id === 'mock-interview-dashboard' && ['mock-interview-dashboard', 'mock-interview-setup', 'mock-interview-session', 'mock-interview-result', 'mock-interview-history', 'mock-interview-analytics', 'interviews'].includes(currentView)) ||
            (item.id === 'mentor-support' && ['mentor-support', 'student-mentor-sessions'].includes(currentView)) ||
            (item.id === 'recruiter-opportunities' && ['recruiter-opportunities', 'recruiter-create-opportunity'].includes(currentView)) ||
            (item.id === 'recruiter-applications' && ['recruiter-applications', 'recruiter-candidate-skills'].includes(currentView)) ||
            (item.id === 'notifications' && ['notifications', 'notification-preferences'].includes(currentView)) ||
            (item.id === 'unified-reports' && ['unified-reports', 'report', 'skill-report', 'readiness', 'college-reports'].includes(currentView));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'hsla(265, 89%, 66%, 0.15)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Role Footer Widget */}
      <div
        style={{
          marginTop: 'auto',
          padding: '16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-emerald)'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>SkillBridge AI Active</span>
        </div>
      </div>
    </aside>
  );
};
