import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

// Feature Components
import { SafeExamView } from './components/assessment/SafeExamView';
import { CourseViewer } from './components/learning/CourseViewer';
import { CodePlayground } from './components/coding/CodePlayground';

// Views - Student Core (Steps 1 - 10)
import { StudentDashboardView } from './views/student/StudentDashboardView';
import { SkillGapView } from './views/student/SkillGapView';
import { StudentReportView } from './views/student/StudentReportView';
import { SkillReportDashboardView } from './views/student/SkillReportDashboardView';
import { LearningRoadmapPlaceholderView } from './views/student/LearningRoadmapPlaceholderView';
import { LearningDashboardView } from './views/student/LearningDashboardView';
import { CourseOverviewView } from './views/student/CourseOverviewView';
import { LessonPlayerView } from './views/student/LessonPlayerView';
import { MyCoursesView } from './views/student/MyCoursesView';
import { MockTestListView } from './views/student/MockTestListView';
import { MockTestInstructionsView } from './views/student/MockTestInstructionsView';
import { MockTestExamView } from './views/student/MockTestExamView';
import { MockTestResultView } from './views/student/MockTestResultView';
import { MockTestReviewView } from './views/student/MockTestReviewView';
import { CodingDashboardView } from './views/student/CodingDashboardView';
import { CodingProblemListView } from './views/student/CodingProblemListView';
import { CodingProblemDetailView } from './views/student/CodingProblemDetailView';
import { CodingSubmissionResultView } from './views/student/CodingSubmissionResultView';
import { CommunicationDashboardView } from './views/student/CommunicationDashboardView';
import { CommunicationAssessmentView } from './views/student/CommunicationAssessmentView';
import { CommunicationSpeakingView } from './views/student/CommunicationSpeakingView';
import { CommunicationWritingView } from './views/student/CommunicationWritingView';
import { CommunicationConversationView } from './views/student/CommunicationConversationView';
import { CommunicationMockTestView } from './views/student/CommunicationMockTestView';
import { CommunicationPracticeHubView } from './views/student/CommunicationPracticeHubView';

// Views - Opportunities & Matching (Steps 11 - 12)
import { OpportunitiesMarketplaceView } from './views/student/OpportunitiesMarketplaceView';
import { OpportunityDetailView } from './views/student/OpportunityDetailView';
import { SavedOpportunitiesView } from './views/student/SavedOpportunitiesView';
import { ApplicationsTrackingView } from './views/student/ApplicationsTrackingView';
import { MatchedOpportunitiesView } from './views/student/MatchedOpportunitiesView';
import { MatchDetailExplanationView } from './views/student/MatchDetailExplanationView';
import { OpportunityPreferencesView } from './views/student/OpportunityPreferencesView';
import { MatchHistoryView } from './views/student/MatchHistoryView';

// Views - Step 13: AI Mock Interview System
import { MockInterviewDashboardView } from './views/student/MockInterviewDashboardView';
import { MockInterviewSetupView } from './views/student/MockInterviewSetupView';
import { MockInterviewSessionView } from './views/student/MockInterviewSessionView';
import { MockInterviewResultView } from './views/student/MockInterviewResultView';
import { MockInterviewHistoryView } from './views/student/MockInterviewHistoryView';
import { MockInterviewAnalyticsView } from './views/student/MockInterviewAnalyticsView';

// Views - Step 14: Live Mentor Support
import { StudentMentorSupportView } from './views/student/StudentMentorSupportView';
import { StudentMentorSessionsView } from './views/student/StudentMentorSessionsView';
import { MentorDashboardView } from './views/mentor/MentorDashboardView';
import { MentorSessionsView } from './views/mentor/MentorSessionsView';
import { MentorStudentFeedbackView } from './views/mentor/MentorStudentFeedbackView';

// Views - Step 15: Recruiter Dashboard
import { RecruiterDashboardView } from './views/recruiter/RecruiterDashboardView';
import { RecruiterCompanyProfileView } from './views/recruiter/RecruiterCompanyProfileView';
import { RecruiterCreateOpportunityView } from './views/recruiter/RecruiterCreateOpportunityView';
import { RecruiterOpportunitiesView } from './views/recruiter/RecruiterOpportunitiesView';
import { RecruiterApplicationsView } from './views/recruiter/RecruiterApplicationsView';
import { RecruiterCandidateSkillsView } from './views/recruiter/RecruiterCandidateSkillsView';
import { RecruiterInterviewsView } from './views/recruiter/RecruiterInterviewsView';

// Views - Step 16: College & Admin Governance
import { CollegeDashboardView } from './views/college/CollegeDashboardView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { AdminOpportunitiesView } from './views/admin/AdminOpportunitiesView';

// Views - Step 17: Notifications, Reports & Analytics
import { NotificationsView } from './views/common/NotificationsView';
import { NotificationPreferencesView } from './views/common/NotificationPreferencesView';
import { UnifiedReportsView } from './views/reports/UnifiedReportsView';
import { AnalyticsDashboardView } from './views/reports/AnalyticsDashboardView';

// Auth Views
import { LoginPage } from './views/auth/LoginPage';
import { RegisterPage } from './views/auth/RegisterPage';

const MainShell: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToast } = useNotification();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'register' ? 'register' : 'login';
  });
  const [extraData, setExtraData] = useState<any>(null);

  // Active Proctored Safe Exam State
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [isStartingExam, setIsStartingExam] = useState<boolean>(false);

  // Unauthenticated / Auth Checking State
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px hsla(265, 89%, 66%, 0.35)'
          }}
        >
          <span style={{ fontSize: '24px' }}>✨</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>SkillBridge AI</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>From Beginner to Placement Ready...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentView('dashboard')}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    setExtraData(data);
  };

  const handleStartAssessment = async () => {
    setIsStartingExam(true);
    try {
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetRole: 'Software Developer', currentLevel: 'Beginner' })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveExam(data);
        addToast('Safe Exam Mode Initiated', 'Full-screen proctored environment active. Window focus tracked.', 'info');
      } else {
        addToast('Error', data.error || 'Failed to start assessment.', 'error');
      }
    } catch (e: any) {
      addToast('Error', e.message, 'error');
    } finally {
      setIsStartingExam(false);
    }
  };

  const handleExamComplete = () => {
    setActiveExam(null);
    setCurrentView('skill-report');
    addToast('Assessment Submitted', 'AI Skill Report & Skill Gap Analysis generated.', 'success');
  };

  const role = user?.role || 'student';

  const renderContent = () => {
    // Shared Notifications & Preferences across all roles
    if (currentView === 'notifications') {
      return <NotificationsView onNavigate={handleNavigate} />;
    }
    if (currentView === 'notification-preferences') {
      return <NotificationPreferencesView onNavigate={handleNavigate} />;
    }
    if (currentView === 'unified-reports') {
      return <UnifiedReportsView onNavigate={handleNavigate} />;
    }
    if (currentView === 'analytics') {
      return <AnalyticsDashboardView onNavigate={handleNavigate} />;
    }

    // ========================================================================
    // ROLE: COLLEGE
    // ========================================================================
    if (role === 'college') {
      switch (currentView) {
        case 'college-dashboard':
        case 'college-students':
          return <CollegeDashboardView />;
        case 'admin-opportunities':
        case 'college-moderation':
          return <AdminOpportunitiesView onNavigate={handleNavigate} />;
        case 'college-reports':
          return <UnifiedReportsView onNavigate={handleNavigate} />;
        default:
          return <CollegeDashboardView />;
      }
    }

    // ========================================================================
    // ROLE: RECRUITER
    // ========================================================================
    if (role === 'recruiter') {
      switch (currentView) {
        case 'recruiter-dashboard':
          return <RecruiterDashboardView onNavigate={handleNavigate} />;
        case 'recruiter-opportunities':
          return <RecruiterOpportunitiesView onNavigate={handleNavigate} />;
        case 'recruiter-create-opportunity':
          return <RecruiterCreateOpportunityView onNavigate={handleNavigate} />;
        case 'recruiter-applications':
        case 'recruiter-pipeline':
          return (
            <RecruiterApplicationsView
              initialOpportunityId={extraData?.opportunityId}
              onNavigate={handleNavigate}
            />
          );
        case 'recruiter-candidate-skills':
          return (
            <RecruiterCandidateSkillsView
              candidateId={extraData?.candidateId || 'usr-student-1'}
              opportunityId={extraData?.opportunityId}
              onNavigate={handleNavigate}
            />
          );
        case 'recruiter-interviews':
          return (
            <RecruiterInterviewsView
              initialCandidateId={extraData?.candidateId}
              initialCandidateName={extraData?.candidateName}
              initialOpportunityId={extraData?.opportunityId}
              initialApplicationId={extraData?.applicationId}
              onNavigate={handleNavigate}
            />
          );
        case 'recruiter-company-profile':
          return <RecruiterCompanyProfileView onNavigate={handleNavigate} />;
        default:
          return <RecruiterDashboardView onNavigate={handleNavigate} />;
      }
    }

    // ========================================================================
    // ROLE: MENTOR
    // ========================================================================
    if (role === 'mentor') {
      switch (currentView) {
        case 'mentor-dashboard':
          return <MentorDashboardView />;
        case 'mentor-sessions':
          return <MentorSessionsView />;
        case 'mentor-feedback':
          return <MentorStudentFeedbackView />;
        default:
          return <MentorDashboardView />;
      }
    }

    // ========================================================================
    // ROLE: ADMIN
    // ========================================================================
    if (role === 'admin') {
      switch (currentView) {
        case 'admin-opportunities':
        case 'admin-moderation':
          return <AdminOpportunitiesView onNavigate={handleNavigate} />;
        default:
          return <AdminDashboardView />;
      }
    }

    // ========================================================================
    // ROLE: STUDENT (STEPS 1 - 18)
    // ========================================================================
    switch (currentView) {
      case 'dashboard':
      case 'roadmap':
        return (
          <StudentDashboardView
            onNavigate={handleNavigate}
            onStartAssessment={handleStartAssessment}
          />
        );

      case 'skills':
      case 'skill-gaps':
        return <SkillGapView onNavigate={handleNavigate} />;

      case 'learning':
        return <LearningDashboardView onNavigate={handleNavigate} />;

      case 'courses':
        return <MyCoursesView onNavigate={handleNavigate} />;

      case 'course-overview':
      case 'course-detail':
        return (
          <CourseOverviewView
            courseId={extraData?.courseId || 'crs-py-201'}
            onNavigate={handleNavigate}
          />
        );

      case 'lesson-player':
        return (
          <LessonPlayerView
            courseId={extraData?.courseId || 'crs-py-201'}
            lessonId={extraData?.lessonId || 'les-py-3'}
            onNavigate={handleNavigate}
          />
        );

      case 'course-viewer-legacy':
        return <CourseViewer initialCourseId={extraData?.courseId} />;

      case 'coding':
      case 'coding-dashboard':
        return <CodingDashboardView onNavigate={handleNavigate} />;

      case 'coding-problems':
      case 'problems':
        return <CodingProblemListView onNavigate={handleNavigate} />;

      case 'coding-problem-detail':
      case 'problem-detail':
        return (
          <CodingProblemDetailView
            problemId={extraData?.problemId || 'cp-1'}
            onNavigate={handleNavigate}
          />
        );

      case 'coding-submission-result':
      case 'submission-result':
        return (
          <CodingSubmissionResultView
            submissionId={extraData?.submissionId || ''}
            onNavigate={handleNavigate}
          />
        );

      case 'coding-playground-legacy':
        return <CodePlayground />;

      case 'languages':
      case 'language-hub':
      case 'communication':
      case 'communication-dashboard':
        return <CommunicationDashboardView onNavigate={handleNavigate} />;

      case 'communication-assessment':
        return (
          <CommunicationAssessmentView
            initialLanguage={extraData?.languageCode || 'en'}
            onNavigate={handleNavigate}
          />
        );

      case 'communication-speaking':
        return (
          <CommunicationSpeakingView
            initialLanguage={extraData?.languageCode || 'en'}
            onNavigate={handleNavigate}
          />
        );

      case 'communication-writing':
        return (
          <CommunicationWritingView
            initialLanguage={extraData?.languageCode || 'en'}
            onNavigate={handleNavigate}
          />
        );

      case 'communication-conversation':
        return (
          <CommunicationConversationView
            initialLanguage={extraData?.languageCode || 'en'}
            initialMode={extraData?.mode || 'placement'}
            onNavigate={handleNavigate}
          />
        );

      case 'communication-mock-test':
        return (
          <CommunicationMockTestView
            initialLanguage={extraData?.languageCode || 'en'}
            onNavigate={handleNavigate}
          />
        );

      case 'communication-practice-hub':
        return (
          <CommunicationPracticeHubView
            initialLanguage={extraData?.languageCode || 'en'}
            initialTab={extraData?.tab || 'grammar'}
            onNavigate={handleNavigate}
          />
        );

      case 'assessment':
        return (
          <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
            <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>AI Adaptive Baseline Assessment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              Our multi-category proctored exam dynamically evaluates technical fundamentals, data structures, and multilingual communication.
            </p>
            <button onClick={handleStartAssessment} disabled={isStartingExam} className="btn btn-primary btn-lg">
              {isStartingExam ? 'Configuring Exam Sandbox...' : 'Launch Safe Exam Environment'}
            </button>
          </div>
        );

      case 'opportunities':
      case 'internships':
      case 'jobs':
      case 'events':
        return (
          <OpportunitiesMarketplaceView
            initialTypeFilter={
              currentView === 'internships' ? 'INTERNSHIP' :
              currentView === 'jobs' ? 'JOB' :
              currentView === 'events' ? 'EVENT,HACKATHON,WORKSHOP,COMPETITION' :
              (extraData?.type || 'ALL')
            }
            onNavigate={handleNavigate}
          />
        );

      case 'opportunity-detail':
        return (
          <OpportunityDetailView
            id={extraData?.id || 'opp-1'}
            onNavigate={handleNavigate}
          />
        );

      case 'saved-opportunities':
      case 'saved':
        return <SavedOpportunitiesView onNavigate={handleNavigate} />;

      case 'applications':
      case 'my-applications':
        return <ApplicationsTrackingView onNavigate={handleNavigate} />;

      case 'matched-opportunities':
      case 'ai-matches':
      case 'student-matched-opportunities':
        return <MatchedOpportunitiesView onNavigate={handleNavigate} />;

      case 'matched-opportunity-detail':
      case 'match-detail':
        return (
          <MatchDetailExplanationView
            id={extraData?.id || 'opp-1'}
            initialTab={extraData?.tab || 'overview'}
            onNavigate={handleNavigate}
          />
        );

      case 'opportunity-preferences':
      case 'preferences':
        return <OpportunityPreferencesView onNavigate={handleNavigate} />;

      case 'match-history':
        return <MatchHistoryView onNavigate={handleNavigate} />;

      // Step 13: AI Mock Interview Views
      case 'mock-interview-dashboard':
      case 'interviews':
        return <MockInterviewDashboardView {...({ onNavigate: handleNavigate } as any)} />;

      case 'mock-interview-setup':
        return (
          <MockInterviewSetupView
            {...({
              initialTargetRole: extraData?.targetRole,
              onNavigate: handleNavigate
            } as any)}
          />
        );

      case 'mock-interview-session':
        return (
          <MockInterviewSessionView
            {...({
              sessionId: extraData?.sessionId || '',
              onNavigate: handleNavigate
            } as any)}
          />
        );

      case 'mock-interview-result':
        return (
          <MockInterviewResultView
            {...({
              sessionId: extraData?.sessionId || '',
              onNavigate: handleNavigate
            } as any)}
          />
        );

      case 'mock-interview-history':
        return <MockInterviewHistoryView {...({ onNavigate: handleNavigate } as any)} />;

      case 'mock-interview-analytics':
        return <MockInterviewAnalyticsView {...({ onNavigate: handleNavigate } as any)} />;

      // Step 14: Live Mentor Support Views
      case 'mentor-support':
      case 'mentorship':
        return <StudentMentorSupportView {...({ onNavigate: handleNavigate } as any)} />;

      case 'student-mentor-sessions':
        return <StudentMentorSessionsView {...({ onNavigate: handleNavigate } as any)} />;

      case 'admin-opportunities':
        return <AdminOpportunitiesView onNavigate={handleNavigate} />;

      case 'readiness':
        return <StudentReportView />;

      case 'report':
      case 'skill-report':
        return <SkillReportDashboardView onNavigate={handleNavigate} />;

      case 'learning-roadmap':
        return <LearningRoadmapPlaceholderView onNavigate={handleNavigate} />;

      case 'mock-tests':
        return <MockTestListView onNavigate={handleNavigate} />;

      case 'mock-test-instructions':
        return (
          <MockTestInstructionsView
            testId={extraData?.testId || 'mt-py-3'}
            onNavigate={handleNavigate}
          />
        );

      case 'mock-test-attempt':
        return (
          <MockTestExamView
            testId={extraData?.testId || 'mt-py-3'}
            attemptId={extraData?.attemptId || ''}
            onNavigate={handleNavigate}
          />
        );

      case 'mock-test-result':
        return (
          <MockTestResultView
            testId={extraData?.testId || 'mt-py-3'}
            attemptId={extraData?.attemptId || ''}
            onNavigate={handleNavigate}
          />
        );

      case 'mock-test-review':
        return (
          <MockTestReviewView
            testId={extraData?.testId || 'mt-py-3'}
            attemptId={extraData?.attemptId || ''}
            onNavigate={handleNavigate}
          />
        );

      default:
        return (
          <StudentDashboardView
            onNavigate={handleNavigate}
            onStartAssessment={handleStartAssessment}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Safe Exam Proctoring Fullscreen Overlay */}
      {activeExam && (
        <SafeExamView
          assessmentId={activeExam.assessmentId}
          attemptId={activeExam.attemptId}
          title={activeExam.title}
          durationMinutes={activeExam.durationMinutes}
          questions={activeExam.questions}
          onComplete={handleExamComplete}
          onExit={() => setActiveExam(null)}
        />
      )}

      {/* Main UI */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Navbar onNavigate={handleNavigate} />

        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar currentView={currentView} onNavigate={handleNavigate} />
          <main className="main-content">
            <div className="content-body">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainShell />
      </NotificationProvider>
    </AuthProvider>
  );
}
