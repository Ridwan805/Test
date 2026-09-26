import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardTopBar from '../components/dashboard/DashboardTopBar';
import '../components/dashboard/StudentDashboard.css';

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals for Invoices and Settings
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch('/api/dashboard/student', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.status === 401) {
        navigate('/login', { state: { from: '/dashboard' } });
        return;
      }

      if (!res.ok) {
        throw new Error('We could not load your dashboard.');
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'We could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --------------------------------------------------------------------------
  // Loading Skeleton State
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="student-dashboard-layout">
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <div className="dashboard-main-area">
          <DashboardTopBar
            user={user}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />
          <main className="dashboard-content-scroll">
            <div className="dashboard-skeleton-card" style={{ height: '110px' }}>
              <div className="skeleton-bar title" />
              <div className="skeleton-bar sub" />
            </div>
            <div className="dashboard-cards-grid">
              <div className="dashboard-skeleton-card" style={{ height: '220px' }}>
                <div className="skeleton-bar title" />
                <div className="skeleton-bar" />
                <div className="skeleton-bar" />
              </div>
              <div className="dashboard-skeleton-card" style={{ height: '220px' }}>
                <div className="skeleton-bar title" />
                <div className="skeleton-bar" />
                <div className="skeleton-bar" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------
  if (error || !dashboardData) {
    return (
      <div className="student-dashboard-layout">
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <div className="dashboard-main-area">
          <DashboardTopBar
            user={user}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />
          <main className="dashboard-content-scroll">
            <div className="dashboard-error-box">
              <div className="error-icon">⚠️</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.75rem' }}>
                We couldn't load your dashboard.
              </h2>
              <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Please check your network connection and try again.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={fetchDashboardData}
              >
                Try Again
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const {
    user: profileUser,
    currentLearning,
    progress,
    currentModulePerformance,
    completedItems = [],
    activeCourses = [],
    recentActivity = [],
    achievements = []
  } = dashboardData;

  const firstName = profileUser?.firstName || user?.first_name || 'Scholar';
  const initials = profileUser?.initials || (user?.first_name ? user.first_name[0].toUpperCase() : 'SC');

  const visibleCompleted = showAllCompleted ? completedItems : completedItems.slice(0, 4);
  const visibleActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 5);

  return (
    <div className="student-dashboard-layout">
      {/* LEFT SIDEBAR */}
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenInvoices={() => setInvoicesModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="dashboard-main-area">
        {/* TOP USER BAR */}
        <DashboardTopBar
          user={profileUser || user}
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className="dashboard-content-scroll">
          {/* ================================================================
              SECTION 1 — WELCOME CARD
              ================================================================ */}
          <section className="welcome-hero-card" aria-label="Welcome Card">
            <div className="welcome-left">
              <div className="welcome-avatar-circle" aria-hidden="true">
                {initials}
              </div>
              <div>
                <h1 className="welcome-greeting-title">Hello, {firstName}</h1>
                <p className="welcome-subtext">
                  Great to have you back! Continue your learning journey.
                </p>
              </div>
            </div>

            <div className="welcome-quote-box" aria-label="EcoIntuition Quote">
              <span className="quote-leaf-icon" aria-hidden="true">🌿</span>
              <p className="quote-text">
                “Learning today for a more sustainable tomorrow.”
              </p>
            </div>
          </section>

          {/* ================================================================
              ROW 1: CURRENTLY DOING (SEC 2) + BOOTCAMP PROGRESS (SEC 3)
              ================================================================ */}
          <div className="dashboard-cards-grid">
            {/* SECTION 2 — CURRENTLY DOING */}
            <div className="dash-card" aria-label="Currently Doing">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Currently Doing</h2>
                  <span className="dash-card-sub">Your active learning milestone</span>
                </div>
              </div>

              {currentLearning ? (
                <div className="currently-doing-body">
                  <div>
                    <span className="active-course-tag">{currentLearning.courseTitle}</span>
                    <h3 className="active-module-title">
                      Module {currentLearning.moduleNumber} — {currentLearning.moduleTitle}
                    </h3>

                    <div className="active-lesson-box">
                      <span className="active-lesson-label">Current Lesson</span>
                      <p className="active-lesson-name">
                        {currentLearning.lessonNumber ? `${currentLearning.lessonNumber}. ` : ''}
                        {currentLearning.lessonTitle}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={currentLearning.continueUrl}
                    className="btn-continue-learning"
                  >
                    <span>Continue Learning</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : (
                <div className="dashboard-empty-box">
                  <div className="empty-icon">📚</div>
                  <p style={{ fontWeight: 600, color: 'var(--color-brand)', marginBottom: '0.4rem' }}>
                    You haven't started a course yet.
                  </p>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Enroll in our introductory Python or economics bootcamps to begin.
                  </p>
                  <Link to="/bootcamp" className="btn btn-primary btn-sm">
                    Explore Bootcamps
                  </Link>
                </div>
              )}
            </div>

            {/* SECTION 3 — BOOTCAMP PROGRESS */}
            <div className="dash-card" aria-label="Bootcamp Progress">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Bootcamp Progress</h2>
                  <span className="dash-card-sub">Measured across active curriculum</span>
                </div>
              </div>

              <div className="progress-indicators-list">
                {/* Indicator 1: Current Module Progress */}
                <div className="progress-indicator-item">
                  <div className="indicator-top-row">
                    <span className="indicator-label">
                      Module {progress.currentModuleNumber || 1} Progress
                    </span>
                    <span className="indicator-score">
                      <strong>{progress.currentModuleCompleted}</strong> of {progress.currentModuleTotal} lessons completed
                    </span>
                  </div>
                  <div
                    className="indicator-track"
                    role="progressbar"
                    aria-valuenow={progress.currentModulePercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Current Module Progress"
                  >
                    <div
                      className="indicator-fill gold"
                      style={{ width: `${progress.currentModulePercentage}%` }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="indicator-pct-pill">{progress.currentModulePercentage}%</span>
                  </div>
                </div>

                {/* Indicator 2: Overall Bootcamp Progress */}
                <div className="progress-indicator-item">
                  <div className="indicator-top-row">
                    <span className="indicator-label">Overall Bootcamp Progress</span>
                    <span className="indicator-score">
                      <strong>{progress.completedLessons}</strong> of {progress.totalLessons} lessons completed
                    </span>
                  </div>
                  <div
                    className="indicator-track"
                    role="progressbar"
                    aria-valuenow={progress.overallCoursePercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Overall Course Progress"
                  >
                    <div
                      className="indicator-fill green"
                      style={{ width: `${progress.overallCoursePercentage}%` }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="indicator-pct-pill">{progress.overallCoursePercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================
              SECTION 6 — CURRENT MODULE PERFORMANCE (If graded module active)
              ================================================================ */}
          {currentModulePerformance && (
            <div className="dash-card" style={{ marginBottom: '2rem' }} aria-label="Current Module Performance">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">
                    Current Module Performance — Module {currentModulePerformance.moduleNumber} ({currentModulePerformance.moduleTitle})
                  </h2>
                  <span className="dash-card-sub">
                    Authoritative weighted assessment score (Homework 40% + Coding Quiz 60%)
                  </span>
                </div>
                <span className={`perf-status-pill ${currentModulePerformance.passed ? 'pass' : currentModulePerformance.moduleGrade >= 80 ? 'pass' : 'warning'}`}>
                  {currentModulePerformance.status}
                </span>
              </div>

              <div className="performance-stats-grid">
                <div className="perf-stat-box">
                  <span className="perf-stat-label">Lessons Completed</span>
                  <span className="perf-stat-value">
                    {currentModulePerformance.lessonsCompleted} / {currentModulePerformance.totalLessons}
                  </span>
                  <span className="perf-stat-sub">Theory & Examples</span>
                </div>

                <div className="perf-stat-box">
                  <span className="perf-stat-label">Homework Score (Best)</span>
                  <span className="perf-stat-value">
                    {currentModulePerformance.homeworkBestScore} / {currentModulePerformance.homeworkMaxPoints}
                  </span>
                  <span className="perf-stat-sub">
                    {currentModulePerformance.homeworkPercentage}% ({currentModulePerformance.homeworkAttempts} attempts)
                  </span>
                </div>

                <div className="perf-stat-box">
                  <span className="perf-stat-label">Coding Quiz (Best)</span>
                  <span className="perf-stat-value">
                    {currentModulePerformance.quizBestScore} / {currentModulePerformance.quizMaxPoints}
                  </span>
                  <span className="perf-stat-sub">
                    {currentModulePerformance.quizPercentage}% ({currentModulePerformance.quizAttempts} attempts)
                  </span>
                </div>

                <div className="perf-stat-box">
                  <span className="perf-stat-label">Module Grade</span>
                  <span className="perf-stat-value" style={{ color: currentModulePerformance.passed ? '#16A34A' : 'var(--color-brand)' }}>
                    {currentModulePerformance.moduleGrade}%
                  </span>
                  <span className="perf-stat-sub">
                    Passing Requirement: {currentModulePerformance.passingGrade}%
                  </span>
                </div>
              </div>

              <div className="perf-footer-row">
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  Need to improve your grade? You may retake homework or quizzes anytime.
                </span>
                <div className="perf-actions-group">
                  <Link to={currentModulePerformance.homeworkUrl} className="perf-action-btn">
                    Homework →
                  </Link>
                  <Link to={currentModulePerformance.quizUrl} className="perf-action-btn">
                    Coding Quiz →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ROW 2: COMPLETED ITEMS (SEC 4) + COURSE PROGRESS (SEC 5)
              ================================================================ */}
          <div className="dashboard-cards-grid">
            {/* SECTION 4 — COMPLETED COURSES & BOOTCAMP MODULES */}
            <div className="dash-card" aria-label="Completed Courses and Modules">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Completed Courses & Bootcamp Modules</h2>
                  <span className="dash-card-sub">
                    Here are the courses and modules you have successfully completed.
                  </span>
                </div>
                {completedItems.length > 4 && (
                  <button
                    type="button"
                    className="dash-card-action-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowAllCompleted(!showAllCompleted)}
                  >
                    {showAllCompleted ? 'Show Less' : 'View All →'}
                  </button>
                )}
              </div>

              {completedItems.length > 0 ? (
                <div className="completed-items-list">
                  {visibleCompleted.map((item) => (
                    <div key={item.id} className="completed-item-row">
                      <div className="completed-item-left">
                        <span className="completed-check-icon" aria-hidden="true">✓</span>
                        <div>
                          <h4 className="completed-item-title">{item.title}</h4>
                          <span className="completed-item-sub">{item.subtitle}</span>
                        </div>
                      </div>

                      <div className="completed-item-right">
                        <span className="completed-date">Completed {item.completionDate}</span>
                        <span className="status-badge-completed">Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-box">
                  <div className="empty-icon">🌱</div>
                  <p style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    No completed courses or modules yet.
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    Work through lessons and pass assessments with 80%+ to unlock completion badges.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 5 — COURSE PROGRESS */}
            <div className="dash-card" aria-label="Course Progress">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Course Progress</h2>
                  <span className="dash-card-sub">
                    Your ongoing courses and modules. Keep going!
                  </span>
                </div>
              </div>

              {activeCourses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {activeCourses.map((crs) => (
                    <div key={crs.id} className="course-progress-card">
                      <div className="course-progress-header-row">
                        <div className="course-progress-info">
                          <div className="course-icon-box" aria-hidden="true">
                            🐍
                          </div>
                          <div>
                            <span className="course-title-sub">{crs.courseType}</span>
                            <h3 className="course-title-main">{crs.title}</h3>
                            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                              Current: <strong>{crs.currentModule}</strong>
                            </span>
                          </div>
                        </div>

                        <Link
                          to={crs.targetUrl}
                          className="btn-open-course-arrow"
                          title="Open Course View"
                        >
                          →
                        </Link>
                      </div>

                      {/* Course progress track */}
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-brand)' }}>
                            {crs.progressPercentage}% Completed
                          </span>
                          <span style={{ color: '#64748B' }}>
                            {crs.completedLessons} of {crs.totalLessons} lessons completed
                          </span>
                        </div>
                        <div
                          className="indicator-track"
                          role="progressbar"
                          aria-valuenow={crs.progressPercentage}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className="indicator-fill green"
                            style={{ width: `${crs.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Modules Status Mini-Deck */}
                      <div className="modules-mini-deck">
                        {crs.modules?.map((m) => (
                          <div
                            key={m.moduleNumber}
                            className={`module-mini-item ${m.isLocked ? 'locked' : m.isCompleted ? 'completed' : 'active'}`}
                          >
                            <div className="module-mini-left">
                              <span className="module-mini-icon">
                                {m.isLocked ? '🔒' : m.isCompleted ? '✓' : '●'}
                              </span>
                              <span>Module {m.moduleNumber}: {m.title}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {m.isLocked ? 'Locked' : m.isCompleted ? 'Passed' : `${m.percentage}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-box">
                  <p>No active courses found.</p>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================
              ROW 3: RECENT ACTIVITY (SEC 7) + ACHIEVEMENTS (SEC 8)
              ================================================================ */}
          <div className="dashboard-cards-grid">
            {/* SECTION 7 — RECENT ACTIVITY */}
            <div className="dash-card" aria-label="Recent Activity">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Recent Activity</h2>
                  <span className="dash-card-sub">Your live learning actions</span>
                </div>
                {recentActivity.length > 5 && (
                  <button
                    type="button"
                    className="dash-card-action-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setShowAllActivity(!showAllActivity)}
                  >
                    {showAllActivity ? 'Show Less' : 'View All →'}
                  </button>
                )}
              </div>

              {recentActivity.length > 0 ? (
                <div className="activity-feed-list">
                  {visibleActivity.map((act) => (
                    <div key={act.id} className={`activity-feed-item ${act.type}`}>
                      <span className="activity-dot" aria-hidden="true">
                        {act.type === 'assessment' ? '🏆' : act.type === 'lesson_complete' ? '✓' : '📖'}
                      </span>
                      <div className="activity-item-content">
                        <p className="activity-item-title">{act.title}</p>
                        <span className="activity-item-detail">{act.detail}</span>
                      </div>
                      <span className="activity-item-time">{act.timeAgo}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-box">
                  <p>No recent activity recorded yet.</p>
                </div>
              )}
            </div>

            {/* SECTION 8 — ACHIEVEMENTS */}
            <div className="dash-card" aria-label="Achievements">
              <div className="dash-card-header">
                <div className="dash-card-title-group">
                  <h2 className="dash-card-title">Achievements</h2>
                  <span className="dash-card-sub">Milestones earned on your scholar track</span>
                </div>
              </div>

              <div className="achievements-grid">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className="achievement-badge-icon" aria-hidden="true">
                      {ach.badge || '🏅'}
                    </div>
                    <h3 className="achievement-title">{ach.title}</h3>
                    <p className="achievement-desc">{ach.description}</p>
                    <span className="achievement-status-tag">
                      {ach.unlocked ? '✓ Earned' : '🔒 Locked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --------------------------------------------------------------------
          INVOICES MODAL
          -------------------------------------------------------------------- */}
      {invoicesModalOpen && (
        <div className="dashboard-modal-backdrop" onClick={() => setInvoicesModalOpen(false)}>
          <div className="dashboard-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setInvoicesModalOpen(false)}
              aria-label="Close Modal"
            >
              ✕
            </button>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.5rem' }}>
              Scholar Invoices & Tuition
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Billing history and enrollment receipts for your scholar account.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Account Status:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16A34A' }}>Active Scholar</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Tuition Tier:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brand)' }}>Full Academic Scholarship</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>Outstanding Balance:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-brand)' }}>$0.00 USD</span>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.5' }}>
              All course modules, computational JupyterLite notebooks, and grading assessments are fully funded.
            </p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          SETTINGS MODAL
          -------------------------------------------------------------------- */}
      {settingsModalOpen && (
        <div className="dashboard-modal-backdrop" onClick={() => setSettingsModalOpen(false)}>
          <div className="dashboard-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-x"
              onClick={() => setSettingsModalOpen(false)}
              aria-label="Close Modal"
            >
              ✕
            </button>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.5rem' }}>
              Scholar Profile & Settings
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Account information registered with EcoIntuition Academy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={profileUser?.name || `${firstName} ${profileUser?.lastName || ''}`.trim()}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  readOnly
                  value={profileUser?.email || user?.email || ''}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.2rem' }}>
                  Role
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.is_staff ? 'Administrator / Staff' : 'Student Scholar'}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSettingsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
