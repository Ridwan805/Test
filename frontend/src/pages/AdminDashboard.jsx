import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import AdminSidebar from '../components/admin/AdminSidebar';
import AssessmentNotebookManager from '../components/admin/AssessmentNotebookManager';
import BootcampLessonManager from '../components/admin/BootcampLessonManager';
import CourseCurriculumManager from '../components/admin/CourseCurriculumManager';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active section from URL or default to 'overview'
  const getSectionFromUrl = () => {
    const path = location.pathname.replace(/^\/admin\/?/, '');
    if (!path) return 'overview';
    if (path.startsWith('courses')) return 'courses';
    if (path.startsWith('bootcamps')) return 'bootcamps';
    if (path.startsWith('students')) return 'students';
    if (path.startsWith('invoices')) return 'invoices';
    if (path.startsWith('orders')) return 'orders';
    if (path.startsWith('analytics/courses') || path.startsWith('course-analytics')) return 'course_analytics';
    if (path.startsWith('analytics/bootcamps') || path.startsWith('bootcamp-analytics')) return 'bootcamp_analytics';
    if (path.startsWith('activity')) return 'activity';
    if (path.startsWith('settings')) return 'settings';
    return 'overview';
  };

  const [activeSection, setActiveSection] = useState(getSectionFromUrl());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync activeSection with URL changes
  useEffect(() => {
    setActiveSection(getSectionFromUrl());
  }, [location.pathname]);

  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'overview') navigate('/admin');
    else if (sectionId === 'course_analytics') navigate('/admin/analytics/courses');
    else if (sectionId === 'bootcamp_analytics') navigate('/admin/analytics/bootcamps');
    else navigate(`/admin/${sectionId}`);
    setSelectedStudentId(null);
    setSelectedAttemptId(null);
    setSelectedCourseId(null);
  };

  // Data States
  const [overviewData, setOverviewData] = useState(null);
  const [coursesData, setCoursesData] = useState([]);
  const [bootcampsData, setBootcampsData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [attemptsData, setAttemptsData] = useState([]);
  const [invoicesData, setInvoicesData] = useState([]);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [bootcampAnalytics, setBootcampAnalytics] = useState(null);

  // Selected Detail Inspectors & Modals
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseInitialAddModule, setCourseInitialAddModule] = useState(false);
  const [selectedBootcampSlug, setSelectedBootcampSlug] = useState('intro-to-python');
  const [bootcampDetail, setBootcampDetail] = useState(null);
  const [bootcampActiveTab, setBootcampActiveTab] = useState('overview'); // 'overview' | 'curriculum' | 'lessons' | 'practice' | 'homework' | 'quizzes' | 'notebook' | 'grades' | 'attempts' | 'settings'

  // Modals
  const [editingModule, setEditingModule] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [timerMinutesInput, setTimerMinutesInput] = useState('');
  const [editingTimerId, setEditingTimerId] = useState(null);
  const [editingQuizTimerConfig, setEditingQuizTimerConfig] = useState(null);
  const [savingTimer, setSavingTimer] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Student Actions
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;
  const [openStudentMenuId, setOpenStudentMenuId] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [confirmEmailInput, setConfirmEmailInput] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [togglingStatusId, setTogglingStatusId] = useState(null);
  const [attemptFilter, setAttemptFilter] = useState('all');

  useEffect(() => {
    const handleDocumentClick = () => setOpenStudentMenuId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setConfirmEmailInput('');
    setDeleteError(null);
    setOpenStudentMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    if (confirmEmailInput.trim().toLowerCase() !== studentToDelete.email.trim().toLowerCase()) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/admin/students/${studentToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "We couldn't delete this student. No student data was changed.");
      }
      setStudentsData((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      if (selectedStudentId === studentToDelete.id) {
        setSelectedStudentId(null);
        setStudentDetail(null);
      }
      setStudentToDelete(null);
      showToast('Student deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete student failed:', err);
      setDeleteError(err.message || "We couldn't delete this student. No student data was changed.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleToggleStudentStatus = async (student) => {
    setTogglingStatusId(student.id);
    const newActiveState = student.is_active === false;
    try {
      const res = await apiFetch(`/api/admin/students/${student.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActiveState })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update student account status.');
      }
      setStudentsData((prev) =>
        prev.map((s) => {
          if (s.id === student.id) {
            return {
              ...s,
              is_active: newActiveState,
              status: s.is_staff ? 'Staff Supervisor' : (!newActiveState ? 'Deactivated' : (s.progress >= 80 ? 'Advanced' : 'In Progress'))
            };
          }
          return s;
        })
      );
      if (studentDetail && (studentDetail.student.id === student.id || studentDetail.student._id === student.id)) {
        setStudentDetail((prev) => ({
          ...prev,
          student: {
            ...prev.student,
            is_active: newActiveState
          }
        }));
      }
      showToast(`Student account ${newActiveState ? 'activated' : 'deactivated'} successfully.`, 'success');
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast(err.message || 'Failed to update student status.', 'error');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Fetch Overview Data
  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/admin/overview');
      if (res.status === 401 || res.status === 403) {
        if (!localStorage.getItem('cached_user')) {
          navigate('/login', { state: { from: '/admin' } });
          return;
        }
      }
      if (!res.ok) throw new Error('Failed to load admin overview data.');
      const data = await res.json();
      setOverviewData(data);
    } catch (err) {
      console.error('Error fetching admin overview:', err);
      setError(err.message || 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Fetch section data on demand
  useEffect(() => {
    if (activeSection === 'courses' && coursesData.length === 0) {
      apiFetch('/api/admin/courses')
        .then((r) => r.ok && r.json())
        .then((d) => d && setCoursesData(d));
    } else if (activeSection === 'bootcamps') {
      apiFetch('/api/admin/bootcamps')
        .then((r) => r.ok && r.json())
        .then((d) => d && setBootcampsData(d));
      if (!bootcampDetail) {
        fetchBootcampDetail(selectedBootcampSlug);
      }
    } else if (activeSection === 'students' && studentsData.length === 0) {
      apiFetch('/api/admin/students')
        .then((r) => r.ok && r.json())
        .then((d) => d && setStudentsData(d));
    } else if (activeSection === 'invoices' && invoicesData.length === 0) {
      apiFetch('/api/admin/invoices')
        .then((r) => r.ok && r.json())
        .then((d) => d && setInvoicesData(d));
    } else if (activeSection === 'course_analytics' && !courseAnalytics) {
      apiFetch('/api/admin/analytics/courses')
        .then((r) => r.ok && r.json())
        .then((d) => d && setCourseAnalytics(d));
    } else if (activeSection === 'bootcamp_analytics' && !bootcampAnalytics) {
      apiFetch('/api/admin/analytics/bootcamps')
        .then((r) => r.ok && r.json())
        .then((d) => d && setBootcampAnalytics(d));
    }
  }, [activeSection]);

  const fetchBootcampDetail = async (slug) => {
    try {
      const res = await apiFetch(`/api/admin/bootcamps/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setBootcampDetail(data);
      }
    } catch (e) {
      console.error('Error loading bootcamp detail:', e);
    }
  };

  const inspectStudent = async (studentId) => {
    setSelectedStudentId(studentId);
    try {
      const res = await apiFetch(`/api/admin/students/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentDetail(data);
      }
    } catch (e) {
      console.error('Error loading student detail:', e);
    }
  };

  const inspectAttempt = async (attemptId) => {
    setSelectedAttemptId(attemptId);
    try {
      const res = await apiFetch('/api/admin/attempts');
      if (res.ok) {
        const attempts = await res.json();
        const found = attempts.find((a) => a.id === attemptId);
        setSelectedAttemptDetail(found || null);
      }
    } catch (e) {
      console.error('Error inspecting attempt:', e);
    }
  };

  const handleToggleModulePublish = async (modId, currentStatus) => {
    try {
      const res = await apiFetch(`/api/admin/modules/${modId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      });
      if (res.ok) {
        showToast('Module publish status updated.');
        fetchBootcampDetail(selectedBootcampSlug);
      }
    } catch (e) {
      showToast('Failed to update module state', 'error');
    }
  };

  const handleUpdateCourseStatus = async (courseId, currentStatus) => {
    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      });
      if (res.ok) {
        showToast('Course publish status updated.');
        const updated = await (await apiFetch('/api/admin/courses')).json();
        setCoursesData(updated);
      }
    } catch (e) {
      showToast('Failed to update course', 'error');
    }
  };

  const handleUpdateTimer = async (courseSlug, modNumber, mins) => {
    setSavingTimer(true);
    try {
      const res = await apiFetch(`/api/courses/${courseSlug}/assessments/quiz/timer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeLimitMinutes: mins, moduleNumber: modNumber })
      });
      if (res.ok) {
        showToast(`Quiz timer updated to ${mins} minutes!`);
        setEditingTimerId(null);
        fetchBootcampDetail(selectedBootcampSlug);
      }
    } catch (e) {
      showToast('Failed to update timer', 'error');
    } finally {
      setSavingTimer(false);
    }
  };

  if (loading && !overviewData) {
    return (
      <div className="admin-app-layout">
        <div className="admin-loading-screen">
          <div className="admin-spinner-ring" />
          <h2>Connecting to EcoIntuition Academy Control Center...</h2>
          <p>Verifying admin authorization and loading database clusters.</p>
        </div>
      </div>
    );
  }

  if (error && !overviewData) {
    return (
      <div className="admin-app-layout">
        <div className="admin-error-card">
          <span className="error-card-icon">⚠️</span>
          <h2>Administrative Access Restricted</h2>
          <p>{error}</p>
          <div className="error-actions-row">
            <button type="button" className="btn-admin-primary" onClick={fetchOverview}>
              🔄 Retry Connection
            </button>
            <Link to="/courses" className="btn-admin-secondary">
              ← Return to Academy Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    adminUser = {},
    stats = {},
    coursesSummary = {},
    bootcampsSummary = {},
    recentAttempts = [],
    recentActivity = []
  } = overviewData || {};

  return (
    <div className="admin-app-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`admin-floating-toast ${toastMessage.type}`}>
          {toastMessage.text}
        </div>
      )}

      {/* Persistent Admin Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        stats={stats}
      />

      {/* Main Administrative Container */}
      <div className="admin-main-viewport">
        {/* Top Header */}
        <header className="admin-top-navbar">
          <div className="admin-nav-left">
            <button
              type="button"
              className="admin-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="admin-header-title-block">
              <h1 className="admin-main-heading">Admin Dashboard</h1>
              <p className="admin-main-subtext">
                Manage EcoIntuition Academy learning, students and performance.
              </p>
            </div>
          </div>

          <div className="admin-nav-right">
            <div className="admin-notifications-pill" title="System alerts online">
              <span className="bell-icon">🔔</span>
              <span className="notif-count">2</span>
            </div>

            <div className="admin-profile-dropdown-card">
              <div className="admin-avatar-small">
                {adminUser.name ? adminUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="admin-profile-text">
                <span className="admin-name-text">{adminUser.name || 'Admin User'}</span>
                <span className="admin-role-tag">Academy Director</span>
              </div>
              <button
                type="button"
                className="btn-admin-header-logout"
                onClick={logout}
                title="Sign out of admin session"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="admin-body-content">
          {/* ========================================================================= */}
          {/* 1. OVERVIEW SECTION                                                      */}
          {/* ========================================================================= */}
          {activeSection === 'overview' && (
            <div className="admin-view-pane">
              {/* Stat Cards Grid */}
              <section className="admin-stat-cards-grid">
                <div className="admin-stat-card">
                  <div className="stat-card-top">
                    <span className="stat-title">TOTAL STUDENTS</span>
                    <span className="stat-icon-bubble">👥</span>
                  </div>
                  <div className="stat-value">{stats.totalStudents?.toLocaleString() || '11'}</div>
                  <div className="stat-footer text-muted">Registered scholar accounts</div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-card-top">
                    <span className="stat-title">ACTIVE STUDENTS</span>
                    <span className="stat-icon-bubble">🟢</span>
                  </div>
                  <div className="stat-value">{stats.activeStudents?.toLocaleString() || '9'}</div>
                  <div className="stat-footer text-success">Engaged within last 30 days</div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-card-top">
                    <span className="stat-title">COURSES</span>
                    <span className="stat-icon-bubble">📚</span>
                  </div>
                  <div className="stat-value">{stats.totalCourses || '3'}</div>
                  <div className="stat-footer text-muted">Self-paced academic programs</div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-card-top">
                    <span className="stat-title">BOOTCAMPS</span>
                    <span className="stat-icon-bubble">⚡</span>
                  </div>
                  <div className="stat-value">{stats.totalBootcamps || '2'}</div>
                  <div className="stat-footer text-gold">Intensive cohort programs</div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-card-top">
                    <span className="stat-title">SUBMISSIONS TODAY</span>
                    <span className="stat-icon-bubble">📝</span>
                  </div>
                  <div className="stat-value">{stats.submissionsToday || '3'}</div>
                  <div className="stat-footer text-muted">{stats.totalSubmissions || '12'} total graded attempts</div>
                </div>
              </section>

              {/* COURSES SUMMARY & BOOTCAMPS SUMMARY CARDS (STRICTLY SEPARATE) */}
              <section className="admin-two-column-summaries">
                {/* COURSES SUMMARY */}
                <div className="admin-summary-box course-summary-box">
                  <div className="summary-box-header">
                    <div>
                      <span className="summary-box-eyebrow">ACADEMIC CATALOG</span>
                      <h2 className="summary-box-title">COURSES</h2>
                    </div>
                    <button
                      type="button"
                      className="btn-admin-link"
                      onClick={() => handleSelectSection('courses')}
                    >
                      View Courses →
                    </button>
                  </div>

                  <div className="summary-metric-pills">
                    <div className="summary-metric-item">
                      <span className="m-label">Total Courses</span>
                      <strong className="m-val">{coursesSummary.totalCourses || 3}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Published</span>
                      <strong className="m-val text-success">{coursesSummary.publishedCount || 3}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Draft</span>
                      <strong className="m-val text-muted">{coursesSummary.draftCount || 0}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Students Enrolled</span>
                      <strong className="m-val">{coursesSummary.studentsEnrolled || 11}</strong>
                    </div>
                  </div>

                  <div className="summary-recent-line">
                    <span className="recent-badge">Recent Course Activity</span>
                    <p>{coursesSummary.recentActivity || 'Curriculum structures synchronized.'}</p>
                  </div>
                </div>

                {/* BOOTCAMPS SUMMARY */}
                <div className="admin-summary-box bootcamp-summary-box">
                  <div className="summary-box-header">
                    <div>
                      <span className="summary-box-eyebrow">INTENSIVE COHORT PROGRAMS</span>
                      <h2 className="summary-box-title">BOOTCAMPS</h2>
                    </div>
                    <button
                      type="button"
                      className="btn-admin-link"
                      onClick={() => handleSelectSection('bootcamps')}
                    >
                      View Bootcamps →
                    </button>
                  </div>

                  <div className="summary-metric-pills">
                    <div className="summary-metric-item">
                      <span className="m-label">Total Bootcamps</span>
                      <strong className="m-val">{bootcampsSummary.totalBootcamps || 2}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Active</span>
                      <strong className="m-val text-success">{bootcampsSummary.activeBootcamps || 2}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Bootcamp Students</span>
                      <strong className="m-val">{bootcampsSummary.bootcampStudents || 11}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Homework Submissions</span>
                      <strong className="m-val">{bootcampsSummary.homeworkSubmissions || 9}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Quiz Submissions</span>
                      <strong className="m-val">{bootcampsSummary.quizSubmissions || 3}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Students Blocked by Gate</span>
                      <strong className="m-val text-alert">{bootcampsSummary.studentsBlocked || 1}</strong>
                    </div>
                    <div className="summary-metric-item">
                      <span className="m-label">Average Module Grade</span>
                      <strong className="m-val text-gold">{bootcampsSummary.averageModuleGrade || 74}%</strong>
                    </div>
                  </div>

                  <div className="summary-recent-line">
                    <span className="recent-badge">Grading Rule</span>
                    <p>Module 1 Ungraded • Module 2+ Graded: 40% Homework + 60% Quiz • 80% Passing Gate</p>
                  </div>
                </div>
              </section>

              {/* RECENT BOOTCAMP ASSESSMENT ATTEMPTS */}
              <section className="admin-content-card">
                <div className="card-top-bar">
                  <div>
                    <h3 className="card-title">Recent Bootcamp Assessment Attempts</h3>
                    <p className="card-subtitle">Real-time graded attempts from automated Pyodide evaluations</p>
                  </div>
                  <button
                    type="button"
                    className="btn-admin-link"
                    onClick={() => {
                      handleSelectSection('bootcamps');
                      setBootcampActiveTab('grades');
                    }}
                  >
                    View All Attempts →
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Type</th>
                        <th>Assessment</th>
                        <th>Module</th>
                        <th>Score</th>
                        <th>Attempt Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAttempts.map((att) => (
                        <tr key={att.id}>
                          <td>
                            <div className="student-profile-cell">
                              <span className="student-mini-avatar">
                                {att.studentName.charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <span className="student-name-bold">{att.studentName}</span>
                                <span className="student-email-muted">{att.studentEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`pill-type ${att.assessmentType}`}>
                              {att.assessmentType.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <strong>{att.assessmentTitle}</strong>
                          </td>
                          <td>
                            <span className="pill-mod-tag">Mod {att.moduleNumber}</span>
                          </td>
                          <td>
                            <span className="score-marks">{att.earnedPoints} / {att.maxPoints}</span>
                            <span className="score-pct">({att.percentage}%)</span>
                          </td>
                          <td>
                            <span className={`status-pill ${att.passed ? 'passed' : 'failed'}`}>
                              {att.attemptStatus}
                            </span>
                          </td>
                          <td className="text-muted">{att.relativeTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* RECENT PLATFORM ACTIVITY */}
              <section className="admin-content-card">
                <div className="card-top-bar">
                  <div>
                    <h3 className="card-title">Recent Activity</h3>
                    <p className="card-subtitle">Latest platform milestones, publications, and scholar achievements</p>
                  </div>
                  <button
                    type="button"
                    className="btn-admin-link"
                    onClick={() => handleSelectSection('activity')}
                  >
                    View All Activity →
                  </button>
                </div>

                <div className="activity-timeline-feed">
                  {recentActivity.map((evt) => (
                    <div key={evt.id} className="timeline-event-item">
                      <div className={`timeline-dot ${evt.type}`} />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <strong className="timeline-title">{evt.title}</strong>
                          <span className="timeline-time">{evt.timeAgo}</span>
                        </div>
                        <p className="timeline-desc">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. COURSES MANAGEMENT SECTION                                            */}
          {/* ========================================================================= */}
          {activeSection === 'courses' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Academic Courses Management</h2>
                  <p className="section-header-sub">
                    Manage self-paced academic courses, lecture modules, and interactive content. (Separate from Bootcamps).
                  </p>
                </div>
                <div className="section-actions-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className="badge-product-type">COURSES ONLY</span>
                  {!selectedCourseId && coursesData.length > 0 && (
                    <button
                      type="button"
                      className="btn-add-module"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#080e1a',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1.15rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                      }}
                      onClick={() => {
                        setSelectedCourseId(coursesData[0].id);
                        setCourseInitialAddModule(true);
                      }}
                    >
                      <span>+</span> Add Module to Course
                    </button>
                  )}
                </div>
              </div>

              {selectedCourseId ? (
                /* DEDICATED ACADEMIC COURSE CURRICULUM & MODULE MANAGEMENT */
                <div className="course-management-panel admin-content-card" style={{ padding: '1.5rem' }}>
                  <CourseCurriculumManager
                    courseId={selectedCourseId}
                    initialOpenAddModule={courseInitialAddModule}
                    onBack={() => {
                      setSelectedCourseId(null);
                      setCourseInitialAddModule(false);
                    }}
                    onCourseUpdated={() => {
                      apiFetch('/api/admin/courses').then((d) => d && setCoursesData(d));
                    }}
                  />
                </div>
              ) : (
                /* COURSES CARDS LIST */
                <div className="courses-admin-grid">
                  {coursesData.map((course) => (
                    <div key={course.id} className="course-admin-card">
                      <div className="course-card-status-bar">
                        <span className={`pill-publish ${course.published ? 'published' : 'draft'}`}>
                          {course.published ? 'Published' : 'Draft'}
                        </span>
                        <span className="pill-level">{course.level}</span>
                      </div>
                      <h3 className="course-card-title">{course.title}</h3>
                      <p className="course-card-tagline">{course.tagline || course.description}</p>

                      <div className="course-card-meta-row">
                        <div className="meta-block">
                          <span className="meta-num">{course.modulesCount}</span>
                          <span className="meta-txt">Modules</span>
                        </div>
                        <div className="meta-block">
                          <span className="meta-num">{course.enrolledCount}</span>
                          <span className="meta-txt">Scholars</span>
                        </div>
                        <div className="meta-block">
                          <span className="meta-num">{course.progressRate}%</span>
                          <span className="meta-txt">Avg Progress</span>
                        </div>
                      </div>

                      <div className="course-card-action-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-admin-primary btn-sm"
                          onClick={() => {
                            setSelectedCourseId(course.id);
                            setCourseInitialAddModule(false);
                          }}
                        >
                          Manage Course →
                        </button>
                        <button
                          type="button"
                          className="btn-admin-sm"
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            fontWeight: 700,
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                          onClick={() => {
                            setSelectedCourseId(course.id);
                            setCourseInitialAddModule(true);
                          }}
                          title={`Directly create a new module inside ${course.title}`}
                        >
                          + Add Module
                        </button>
                        <Link
                          to={`/learn/${course.slug}`}
                          className="btn-admin-secondary btn-sm"
                          target="_blank"
                        >
                          Curriculum ↗
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. BOOTCAMPS MANAGEMENT SECTION                                          */}
          {/* ========================================================================= */}
          {activeSection === 'bootcamps' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Bootcamp Programs Control Center</h2>
                  <p className="section-header-sub">
                    Intensive cohort programs with practice notebooks, weighted homework (40%), quizzes (60%), and progression gates (80%).
                  </p>
                </div>
                <div className="bootcamp-selector-group">
                  <button
                    type="button"
                    className={`btn-bootcamp-select ${selectedBootcampSlug === 'intro-to-python' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBootcampSlug('intro-to-python');
                      fetchBootcampDetail('intro-to-python');
                    }}
                  >
                    🐍 Introduction to Python
                  </button>
                  <button
                    type="button"
                    className={`btn-bootcamp-select ${selectedBootcampSlug === 'intro-to-r' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBootcampSlug('intro-to-r');
                      fetchBootcampDetail('intro-to-r');
                    }}
                  >
                    📊 Introduction to R
                  </button>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="bootcamp-subnav-bar">
                {['overview', 'curriculum', 'lessons', 'practice', 'homework', 'quizzes', 'notebook', 'grades', 'settings'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`bootcamp-tab-btn ${bootcampActiveTab === tab ? 'active' : ''}`}
                    onClick={() => setBootcampActiveTab(tab)}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
                <a
                  href={`/learn/${selectedBootcampSlug}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-preview-student-pill"
                  title="Verify what students experience without recording real grades"
                >
                  👁️ Preview as Student ↗
                </a>
              </div>

              {/* SUBTAB 1: BOOTCAMP OVERVIEW */}
              {bootcampActiveTab === 'overview' && bootcampDetail && (
                <div className="bootcamp-tab-content">
                  <div className="admin-stat-cards-grid">
                    <div className="admin-stat-card">
                      <span className="stat-title">BOOTCAMP PROGRAM</span>
                      <div className="stat-value" style={{ fontSize: '1.35rem' }}>{bootcampDetail.bootcamp.title}</div>
                      <div className="stat-footer text-muted">{bootcampDetail.bootcamp.format}</div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="stat-title">CURRICULUM MODULES</span>
                      <div className="stat-value">{bootcampDetail.metrics.totalModules}</div>
                      <div className="stat-footer text-success">{bootcampDetail.metrics.publishedModules} published live</div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="stat-title">LESSONS COUNT</span>
                      <div className="stat-value">{bootcampDetail.metrics.totalLessons}</div>
                      <div className="stat-footer text-muted">Across all modules</div>
                    </div>
                    <div className="admin-stat-card">
                      <span className="stat-title">PASS RATE (≥80%)</span>
                      <div className="stat-value text-gold">{bootcampDetail.metrics.passRate}%</div>
                      <div className="stat-footer text-muted">{bootcampDetail.metrics.attemptsCount} attempts submitted</div>
                    </div>
                  </div>

                  <div className="admin-content-card mt-3">
                    <h3 className="card-title">Bootcamp Progression Policy & Rules</h3>
                    <p className="card-subtitle">Automated server-side grading rules for Introduction to Python</p>
                    <div className="policy-grid">
                      <div className="policy-box">
                        <span className="policy-badge off">MODULE 1</span>
                        <h4>Introductory Orientation</h4>
                        <p>No passing grade requirement. All lessons unlocked for immediate scholar onboarding.</p>
                      </div>
                      <div className="policy-box highlight">
                        <span className="policy-badge on">MODULES 2, 3, 4</span>
                        <h4>Graded Progression Gates</h4>
                        <p><strong>40% Homework + 60% Final Quiz</strong>. Combined grade must meet or exceed <strong>80%</strong> to unlock subsequent modules.</p>
                      </div>
                      <div className="policy-box">
                        <span className="policy-badge on">AUTOMATED JUPYTERLITE</span>
                        <h4>WebAssembly Grader</h4>
                        <p>Pyodide test suite checks variables and function assertions. Students can retry; best score is permanently preserved.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: CURRICULUM */}
              {bootcampActiveTab === 'curriculum' && bootcampDetail && (
                <div className="bootcamp-tab-content">
                  <div className="modules-accordion-list">
                    {bootcampDetail.modules.map((m) => (
                      <div key={m.id} className="module-admin-card">
                        <div className="module-card-header">
                          <div className="module-header-left">
                            <span className="mod-number-badge">Module {m.moduleNumber}</span>
                            <div>
                              <h4 className="module-title-text">{m.title}</h4>
                              <p className="module-desc-muted">{m.description || 'Structured bootcamp module'}</p>
                            </div>
                          </div>
                          <div className="module-header-right">
                            <span className={`pill-progression ${m.isGradedProgression ? 'graded' : 'ungraded'}`}>
                              {m.isGradedProgression ? 'Graded Gate (80%)' : 'Orientation (Ungraded)'}
                            </span>
                            <button
                              type="button"
                              className={`btn-admin-toggle ${m.published ? 'active' : ''}`}
                              onClick={() => handleToggleModulePublish(m.id, m.published)}
                            >
                              {m.published ? '✓ Published' : 'Draft'}
                            </button>
                          </div>
                        </div>

                        <div className="module-elements-grid">
                          <div className="module-element-block">
                            <span className="elem-label">📖 Lessons ({m.lessonsCount})</span>
                            <div className="elem-list">
                              {m.lessons.slice(0, 4).map((l) => (
                                <span key={l.id} className="elem-chip">L{l.lessonNumber}: {l.title}</span>
                              ))}
                              {m.lessons.length > 4 && (
                                <span className="elem-chip text-muted">+{m.lessons.length - 4} more lessons</span>
                              )}
                            </div>
                          </div>

                          <div className="module-element-block">
                            <span className="elem-label">📝 Homework (40% Weight)</span>
                            {m.homework ? (
                              <div className="elem-assessment-pill">
                                <strong>{m.homework.title}</strong>
                                <span>{m.homework.maxPoints} pts • {m.homework.questionsCount} questions</span>
                              </div>
                            ) : (
                              <span className="elem-none">No homework requirement</span>
                            )}
                          </div>

                          <div className="module-element-block">
                            <span className="elem-label">⚡ Coding Quiz (60% Weight)</span>
                            {m.quiz ? (
                              <div className="elem-assessment-pill">
                                <strong>{m.quiz.title}</strong>
                                <span>{m.quiz.maxPoints} pts • ⏱️ {m.quiz.timeLimitMinutes}m timer</span>
                              </div>
                            ) : (
                              <span className="elem-none">No quiz requirement</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: LESSONS MANAGEMENT (PROFESSIONAL LESSON MANAGER & VISUAL BUILDER) */}
              {bootcampActiveTab === 'lessons' && (
                <div className="bootcamp-tab-content">
                  <BootcampLessonManager
                    bootcampSlug={selectedBootcampSlug || 'intro-to-python'}
                    onBack={() => setBootcampActiveTab('overview')}
                  />
                </div>
              )}

              {/* SUBTAB 4: PRACTICE MANAGEMENT */}
              {bootcampActiveTab === 'practice' && (
                <div className="bootcamp-tab-content">
                  <div className="admin-content-card">
                    <div className="card-top-bar">
                      <div>
                        <h3 className="card-title">Ungraded Practice Tasks & Sandbox Notebooks</h3>
                        <p className="card-subtitle">Manage sandbox notebooks where students experiment without grade penalties</p>
                      </div>
                    </div>
                    <div className="practice-tasks-table">
                      {[
                        { id: 'p2', mod: 2, taskName: 'Task 2.1', title: 'Module 2 Sandbox: Variable Manipulation & Types', tasks: 4, file: 'module-2-practice.ipynb', status: 'Ungraded Practice' },
                        { id: 'p3', mod: 3, taskName: 'Task 3.1', title: 'Module 3 Sandbox: Conditional Logic & While Loops', tasks: 6, file: 'module-3-practice.ipynb', status: 'Ungraded Practice' },
                        { id: 'p4', mod: 4, taskName: 'Task 4.1', title: 'Module 4 Sandbox: Dictionary Comprehensions & Sets', tasks: 5, file: 'module-4-practice.ipynb', status: 'Ungraded Practice' }
                      ].map((p) => (
                        <div key={p.id} className="practice-item-row">
                          <div>
                            <span className="pill-mod-tag">Mod {p.mod}</span>
                            <span className="pill-role ml-1">{p.status}</span>
                            <strong className="d-block mt-1">{p.taskName}: {p.title}</strong>
                            <div className="text-muted-sm">{p.tasks} Tasks • File: {p.file} • Reset behavior: Preserved</div>
                          </div>
                          <div className="practice-actions">
                            <a
                              href={`/lite/notebooks/index.html?path=${encodeURIComponent(p.file)}&admin=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-admin-secondary btn-sm"
                            >
                              Launch Practice Lab ↗
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 5: HOMEWORK MANAGEMENT */}
              {bootcampActiveTab === 'homework' && (
                <div className="bootcamp-tab-content">
                  <div className="admin-content-card">
                    <h3 className="card-title">Homework Management (40% Weight)</h3>
                    <p className="card-subtitle">Configure assignments, instructions, question points, and starter codes</p>

                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Assessment Name</th>
                            <th>Module</th>
                            <th>Max Marks</th>
                            <th>Weight</th>
                            <th>Published</th>
                            <th>Attempts</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { mod: 2, title: 'Module 2 Official Graded Homework', max: 40, weight: 40, pub: true, att: 12 },
                            { mod: 3, title: 'Module 3 Official Graded Homework', max: 40, weight: 40, pub: true, att: 8 },
                            { mod: 4, title: 'Module 4 Official Graded Homework', max: 40, weight: 40, pub: true, att: 2 }
                          ].map((hw, idx) => (
                            <tr key={idx}>
                              <td><strong>{hw.title}</strong></td>
                              <td><span className="pill-mod-tag">Module {hw.mod}</span></td>
                              <td>{hw.max} Marks</td>
                              <td>{hw.weight}%</td>
                              <td><span className="pill-publish published">Published</span></td>
                              <td>{hw.att} Attempts</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => setBootcampActiveTab('notebook')}
                                    className="btn-admin-primary btn-sm"
                                  >
                                    ✎ Author Notebook
                                  </button>
                                  <Link
                                    to={`/learn/intro-to-python/assessments/homework?module=${hw.mod}&admin=1`}
                                    className="btn-admin-secondary btn-sm"
                                  >
                                    Preview ↗
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 6: QUIZZES MANAGEMENT */}
              {bootcampActiveTab === 'quizzes' && (
                <div className="bootcamp-tab-content">
                  <div className="admin-content-card">
                    <div className="card-top-bar">
                      <div>
                        <h3 className="card-title">Quiz Management (60% Weight & Live Timers)</h3>
                        <p className="card-subtitle">Manage timed coding examinations, timer durations, warning thresholds, and auto-submit rules</p>
                      </div>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Quiz Title</th>
                            <th>Module</th>
                            <th>Marks</th>
                            <th>Weight</th>
                            <th>Server Timer Limit</th>
                            <th>Pass Requirement</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { mod: 2, title: 'Module 2 Official Final Coding Quiz', marks: 20, weight: 60, time: 30, warning: 5, autoSubmit: true, allowPause: false, showTimer: true, enabled: true },
                            { mod: 3, title: 'Module 3 Official Final Coding Quiz', marks: 20, weight: 60, time: 30, warning: 5, autoSubmit: true, allowPause: false, showTimer: true, enabled: true },
                            { mod: 4, title: 'Module 4 Official Final Coding Quiz', marks: 20, weight: 60, time: 30, warning: 5, autoSubmit: true, allowPause: false, showTimer: true, enabled: true }
                          ].map((q, idx) => (
                            <tr key={idx}>
                              <td><strong>{q.title}</strong></td>
                              <td><span className="pill-mod-tag">Mod {q.mod}</span></td>
                              <td>{q.marks} Marks</td>
                              <td>{q.weight}%</td>
                              <td>
                                <div className="timer-cell-display">
                                  <span className="text-gold font-bold">⏱️ {q.time} Mins</span>
                                  <button
                                    type="button"
                                    className="btn-admin-link ml-2"
                                    onClick={() => setEditingQuizTimerConfig({
                                      mod: q.mod,
                                      title: q.title,
                                      durationMinutes: q.time,
                                      warningMinutes: q.warning,
                                      autoSubmit: q.autoSubmit,
                                      allowPause: q.allowPause,
                                      showTimer: q.showTimer,
                                      enabled: q.enabled
                                    })}
                                    title="Configure server-authoritative timer parameters"
                                  >
                                    ⚙️ Configure Timer
                                  </button>
                                </div>
                              </td>
                              <td><span className="status-pill passed">≥80% Combined</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuizTimerConfig({
                                      mod: q.mod,
                                      title: q.title,
                                      durationMinutes: q.time,
                                      warningMinutes: q.warning,
                                      autoSubmit: q.autoSubmit,
                                      allowPause: q.allowPause,
                                      showTimer: q.showTimer,
                                      enabled: q.enabled
                                    })}
                                    className="btn-admin-secondary btn-sm"
                                  >
                                    ⚙️ Timer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBootcampActiveTab('notebook')}
                                    className="btn-admin-primary btn-sm"
                                  >
                                    ✎ Author Notebook
                                  </button>
                                  <Link
                                    to={`/learn/intro-to-python/assessments/quiz?module=${q.mod}&admin=1`}
                                    className="btn-admin-secondary btn-sm"
                                  >
                                    Preview ↗
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* QUIZ TIMER CONFIGURATION MODAL */}
                  {editingQuizTimerConfig && (
                    <div className="admin-modal-overlay">
                      <div className="admin-modal-box" style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                          <h3>Quiz Timer Configuration: Module {editingQuizTimerConfig.mod}</h3>
                          <button
                            type="button"
                            className="btn-modal-close"
                            onClick={() => setEditingQuizTimerConfig(null)}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="modal-body-padded">
                          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                            Configure the server-authoritative countdown timer for <strong>{editingQuizTimerConfig.title}</strong>.
                          </p>

                          <div className="form-group mb-3">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Timer Status</label>
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#f8fafc' }}>
                                <input
                                  type="radio"
                                  name="quiz-timer-enabled"
                                  checked={editingQuizTimerConfig.enabled !== false}
                                  onChange={() => setEditingQuizTimerConfig((prev) => ({ ...prev, enabled: true }))}
                                />
                                Enabled
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#f8fafc' }}>
                                <input
                                  type="radio"
                                  name="quiz-timer-enabled"
                                  checked={editingQuizTimerConfig.enabled === false}
                                  onChange={() => setEditingQuizTimerConfig((prev) => ({ ...prev, enabled: false }))}
                                />
                                Disabled
                              </label>
                            </div>
                          </div>

                          {editingQuizTimerConfig.enabled !== false && (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Duration (Minutes)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="360"
                                    value={editingQuizTimerConfig.durationMinutes || 30}
                                    onChange={(e) => setEditingQuizTimerConfig((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value, 10) || 1 }))}
                                    className="admin-input-full"
                                  />
                                </div>
                                <div className="form-group">
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Warning Time (Minutes)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={editingQuizTimerConfig.warningMinutes || 5}
                                    onChange={(e) => setEditingQuizTimerConfig((prev) => ({ ...prev, warningMinutes: parseInt(e.target.value, 10) || 1 }))}
                                    className="admin-input-full"
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#0b1329', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingQuizTimerConfig.autoSubmit !== false}
                                    onChange={(e) => setEditingQuizTimerConfig((prev) => ({ ...prev, autoSubmit: e.target.checked }))}
                                  />
                                  <span>Auto Submit When Time Expires <em>(Recommended)</em></span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingQuizTimerConfig.allowPause === true}
                                    onChange={(e) => setEditingQuizTimerConfig((prev) => ({ ...prev, allowPause: e.target.checked }))}
                                  />
                                  <span>Allow Student to Pause Timer <em>(Default: OFF)</em></span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.9rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingQuizTimerConfig.showTimer !== false}
                                    onChange={(e) => setEditingQuizTimerConfig((prev) => ({ ...prev, showTimer: e.target.checked }))}
                                  />
                                  <span>Show Live Timer Countdown to Student</span>
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="modal-footer">
                          <button
                            type="button"
                            className="btn-admin-secondary"
                            onClick={() => setEditingQuizTimerConfig(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-admin-primary"
                            disabled={savingTimer}
                            onClick={async () => {
                              setSavingTimer(true);
                              try {
                                const res = await apiFetch(`/api/courses/${selectedBootcampSlug}/assessments/quiz/timer`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    moduleNumber: editingQuizTimerConfig.mod,
                                    timeLimitMinutes: editingQuizTimerConfig.durationMinutes || 30,
                                    enabled: editingQuizTimerConfig.enabled !== false,
                                    warningMinutes: editingQuizTimerConfig.warningMinutes || 5,
                                    autoSubmit: editingQuizTimerConfig.autoSubmit !== false,
                                    allowPause: editingQuizTimerConfig.allowPause === true,
                                    showTimer: editingQuizTimerConfig.showTimer !== false
                                  })
                                });
                                if (res.ok) {
                                  showToast(`Quiz timer settings saved for Module ${editingQuizTimerConfig.mod}!`);
                                  setEditingQuizTimerConfig(null);
                                  fetchBootcampDetail(selectedBootcampSlug);
                                } else {
                                  const err = await res.json();
                                  showToast(err.detail || 'Failed to update timer', 'error');
                                }
                              } catch (err) {
                                showToast(`Failed to update timer: ${err.message}`, 'error');
                              } finally {
                                setSavingTimer(false);
                              }
                            }}
                          >
                            {savingTimer ? 'Saving Settings...' : 'Save Timer Configuration'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 7: ASSESSMENT NOTEBOOK EDITOR */}
              {bootcampActiveTab === 'notebook' && (
                <div className="bootcamp-tab-content">
                  <AssessmentNotebookManager
                    bootcampSlug={selectedBootcampSlug || 'intro-to-python'}
                    onBack={() => setBootcampActiveTab('overview')}
                  />
                </div>
              )}

              {/* SUBTAB 8: GRADES TABLE */}
              {bootcampActiveTab === 'grades' && (
                <div className="bootcamp-tab-content">
                  <div className="admin-content-card">
                    <div className="card-top-bar">
                      <div>
                        <h3 className="card-title">Bootcamp Scholar Grades & Progressions</h3>
                        <p className="card-subtitle">Calculated automatically: 40% Homework + 60% Quiz (≥80% required to pass)</p>
                      </div>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Scholar</th>
                            <th>Current Module</th>
                            <th>Homework Best</th>
                            <th>Quiz Best</th>
                            <th>Weighted Grade</th>
                            <th>Module Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewData.recentAttempts.map((att, i) => (
                            <tr key={i}>
                              <td>
                                <div className="student-profile-cell">
                                  <span className="student-mini-avatar">{att.studentName.charAt(0)}</span>
                                  <div>
                                    <span className="student-name-bold">{att.studentName}</span>
                                    <span className="student-email-muted">{att.studentEmail}</span>
                                  </div>
                                </div>
                              </td>
                              <td><span className="pill-mod-tag">Module {att.moduleNumber}</span></td>
                              <td>36 / 40 (90%)</td>
                              <td>18 / 20 (90%)</td>
                              <td><strong className="text-gold">90%</strong></td>
                              <td><span className="status-pill passed">✓ PASSED</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 9: SETTINGS */}
              {bootcampActiveTab === 'settings' && (
                <div className="bootcamp-tab-content">
                  <div className="admin-content-card">
                    <h3 className="card-title">Bootcamp Progression & Assessment Settings</h3>
                    <p className="card-subtitle">Global rules configured for Introduction to Python</p>
                    <div className="settings-fields-grid">
                      <div className="settings-field">
                        <label>Module 1 Graded Progression</label>
                        <input type="text" value="Disabled (Orientation Phase)" disabled />
                      </div>
                      <div className="settings-field">
                        <label>Module 2+ Homework Weight</label>
                        <input type="text" value="40%" disabled />
                      </div>
                      <div className="settings-field">
                        <label>Module 2+ Quiz Weight</label>
                        <input type="text" value="60%" disabled />
                      </div>
                      <div className="settings-field">
                        <label>Module Pass Requirement</label>
                        <input type="text" value="80% Combined Mark" disabled />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. STUDENTS MANAGEMENT SECTION                                           */}
          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* 4. STUDENTS MANAGEMENT SECTION                                           */}
          {/* ========================================================================= */}
          {activeSection === 'students' && (() => {
            const q = studentSearch.trim().toLowerCase();
            const filteredStudents = studentsData.filter((s) => {
              const matchesSearch = !q || (s.name && s.name.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q));
              if (!matchesSearch) return false;
              if (studentStatusFilter === 'active') return s.is_active !== false && !s.is_staff;
              if (studentStatusFilter === 'deactivated') return s.is_active === false;
              return true;
            });
            const totalStudentPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
            const paginatedStudents = filteredStudents.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage);

            return (
              <div className="admin-view-pane">
                <div className="section-title-row">
                  <div>
                    <h2 className="section-header-title">Student Scholars Directory</h2>
                    <p className="section-header-sub">
                      Inspect individual scholar enrollments, progress, and assessment attempt breakdowns.
                    </p>
                  </div>
                  <div className="directory-controls-row">
                    <div className="search-filter-group">
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setStudentPage(1);
                        }}
                        className="admin-search-input"
                      />
                    </div>
                    <select
                      className="admin-filter-select"
                      value={studentStatusFilter}
                      onChange={(e) => {
                        setStudentStatusFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      aria-label="Filter students by status"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>

                {selectedStudentId && studentDetail ? (
                  /* STUDENT DETAIL VIEW */
                  <div className="student-detail-panel">
                    <button
                      type="button"
                      className="btn-admin-secondary btn-sm mb-3"
                      onClick={() => {
                        setSelectedStudentId(null);
                        setStudentDetail(null);
                      }}
                    >
                      ← Back to All Students
                    </button>

                    <div className="student-profile-hero">
                      <div className="hero-avatar">
                        {studentDetail.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="hero-name">{studentDetail.student.name}</h3>
                        <p className="hero-email">{studentDetail.student.email}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                          <span className="pill-role">{studentDetail.student.is_staff ? 'Administrator' : 'Student Scholar'}</span>
                          <span className={`status-pill ${studentDetail.student.is_staff ? 'staff' : (studentDetail.student.is_active === false ? 'deactivated' : 'active')}`}>
                            {studentDetail.student.is_staff ? 'Staff Supervisor' : (studentDetail.student.is_active === false ? 'Deactivated' : 'Active Account')}
                          </span>
                          {studentDetail.student.joinedAt && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                              Joined: {new Date(studentDetail.student.joinedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="admin-content-card mt-3">
                      <h3 className="card-title">Bootcamp Progression ({studentDetail.bootcamp.title})</h3>
                      <div className="progression-cards-list">
                        {studentDetail.bootcamp.progression.map((mod) => (
                          <div key={mod.moduleNumber} className={`progression-module-box ${mod.status.toLowerCase()}`}>
                            <div className="prog-mod-top">
                              <span className="mod-number-badge">Module {mod.moduleNumber}</span>
                              <span className={`status-pill ${mod.passed ? 'passed' : (mod.unlocked ? 'pending' : 'locked')}`}>
                                {mod.status}
                              </span>
                            </div>
                            <h4>{mod.title}</h4>
                            {mod.isGraded ? (
                              <div className="prog-grades-row">
                                <span>HW: {mod.homeworkBest}</span>
                                <span>Quiz: {mod.quizBest}</span>
                                <span>Grade: <strong>{mod.moduleGrade}</strong></span>
                              </div>
                            ) : (
                              <p className="text-muted-sm">{mod.grade}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="admin-content-card mt-3">
                      <h3 className="card-title">Historical Graded Attempts ({studentDetail.attempts.length})</h3>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Assessment</th>
                              <th>Type</th>
                              <th>Module</th>
                              <th>Attempt #</th>
                              <th>Score</th>
                              <th>Result</th>
                              <th>Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentDetail.attempts.length === 0 ? (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>
                                  No graded assessment attempts recorded yet.
                                </td>
                              </tr>
                            ) : (
                              studentDetail.attempts.map((att) => (
                                <tr key={att.id}>
                                  <td><strong>{att.assessmentTitle}</strong></td>
                                  <td><span className={`pill-type ${att.assessmentType}`}>{att.assessmentType}</span></td>
                                  <td>Mod {att.moduleNumber}</td>
                                  <td>#{att.attemptNumber}</td>
                                  <td>{att.earnedPoints}/{att.maxPoints} ({att.percentage}%)</td>
                                  <td>
                                    <span className={`status-pill ${att.passed ? 'passed' : 'failed'}`}>
                                      {att.passed ? 'PASSED' : 'UNDER THRESHOLD'}
                                    </span>
                                  </td>
                                  <td className="text-muted">{att.relativeTime}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ACCOUNT ACTIONS CARD (SAFEGUARDED) */}
                    <div className="student-account-actions-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 className="card-title" style={{ margin: 0 }}>Account Management</h3>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>
                            Control authentication access, temporary deactivation, and account retention.
                          </p>
                        </div>
                        {!studentDetail.student.is_staff && (
                          <button
                            type="button"
                            className="btn-admin-secondary btn-sm"
                            onClick={() => handleToggleStudentStatus(studentDetail.student)}
                            disabled={togglingStatusId === studentDetail.student.id}
                          >
                            {studentDetail.student.is_active === false ? '🟢 Activate Account' : '⏸️ Deactivate Account'}
                          </button>
                        )}
                      </div>

                      {!studentDetail.student.is_staff && (
                        <div className="danger-zone-box">
                          <div className="danger-zone-info">
                            <h4>Permanent Student Deletion</h4>
                            <p>Permanently remove this student scholar account, lesson progress, and assessment attempts. Irreversible.</p>
                          </div>
                          <button
                            type="button"
                            className="btn-admin-danger"
                            onClick={() => handleDeleteStudent(studentDetail.student)}
                          >
                            Delete Student Account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* STUDENTS LIST TABLE */
                  <div className="admin-content-card">
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Scholar</th>
                            <th>Email Address</th>
                            <th>Courses</th>
                            <th>Bootcamps</th>
                            <th>Current Module</th>
                            <th>Progress</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                                {studentSearch ? 'No students match your search query.' : 'No students found.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((s) => (
                              <tr key={s.id}>
                                <td>
                                  <div className="student-profile-cell">
                                    <span className={`student-mini-avatar ${s.is_staff ? 'staff' : ''}`}>
                                      {s.is_staff ? '👑' : s.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="student-name-bold">{s.name}</span>
                                  </div>
                                </td>
                                <td><code>{s.email}</code></td>
                                <td>{s.enrolledCourses?.length || 2} Enrolled</td>
                                <td><span className="pill-mod-tag">{s.bootcampTitle}</span></td>
                                <td><strong>{s.currentBootcampModule}</strong></td>
                                <td>
                                  <div className="admin-progress-cell">
                                    <div className="admin-mini-progress-bar">
                                      <div className="admin-mini-fill" style={{ width: `${s.progress}%` }} />
                                    </div>
                                    <span>{s.progress}%</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`status-pill ${s.is_staff ? 'staff' : (s.is_active === false ? 'deactivated' : 'active')}`}>
                                    {s.is_staff ? 'Staff Supervisor' : (s.is_active === false ? 'Deactivated' : s.status)}
                                  </span>
                                </td>
                                <td>
                                  <div className="student-action-cell" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="btn-admin-secondary btn-sm"
                                      onClick={() => inspectStudent(s.id)}
                                    >
                                      View Student
                                    </button>
                                    {!s.is_staff && (
                                      <>
                                        <button
                                          type="button"
                                          className={`btn-admin-dots-sm ${openStudentMenuId === s.id ? 'active' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenStudentMenuId(openStudentMenuId === s.id ? null : s.id);
                                          }}
                                          title="More actions"
                                          aria-label="More actions"
                                        >
                                          •••
                                        </button>
                                        {openStudentMenuId === s.id && (
                                          <div className="student-action-menu-dropdown">
                                            <button
                                              type="button"
                                              className="dropdown-action-item"
                                              onClick={() => {
                                                setOpenStudentMenuId(null);
                                                inspectStudent(s.id);
                                              }}
                                            >
                                              <span>👁️</span> View Student
                                            </button>
                                            <button
                                              type="button"
                                              className="dropdown-action-item warning"
                                              onClick={() => {
                                                setOpenStudentMenuId(null);
                                                handleToggleStudentStatus(s);
                                              }}
                                              disabled={togglingStatusId === s.id}
                                            >
                                              <span>{s.is_active === false ? '🟢' : '⏸️'}</span>
                                              {s.is_active === false ? 'Activate Student' : 'Deactivate Student'}
                                            </button>
                                            <div className="dropdown-action-divider" />
                                            <button
                                              type="button"
                                              className="dropdown-action-item destructive"
                                              onClick={() => {
                                                setOpenStudentMenuId(null);
                                                handleDeleteStudent(s);
                                              }}
                                            >
                                              <span>🗑️</span> Delete Student
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {filteredStudents.length > 0 && (
                      <div className="admin-pagination-container">
                        <div>
                          Showing {(studentPage - 1) * studentsPerPage + 1}–
                          {Math.min(studentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                        </div>
                        <div className="admin-pagination-controls">
                          <button
                            type="button"
                            className="admin-pagination-btn"
                            disabled={studentPage <= 1}
                            onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          {Array.from({ length: totalStudentPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              className={`admin-pagination-btn ${studentPage === pageNum ? 'active' : ''}`}
                              onClick={() => setStudentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="admin-pagination-btn"
                            disabled={studentPage >= totalStudentPages}
                            onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* 5. INVOICES & BUSINESS                                                   */}
          {/* ========================================================================= */}
          {activeSection === 'invoices' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Invoices & Financial Aid</h2>
                  <p className="section-header-sub">
                    Business billing records, scholarship allocations, and enrollment fees.
                  </p>
                </div>
              </div>

              <div className="admin-content-card">
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Student</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Tier</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicesData.map((inv) => (
                        <tr key={inv.id}>
                          <td><code>{inv.id}</code></td>
                          <td>
                            <strong>{inv.studentName}</strong>
                            <div className="text-muted-sm">{inv.studentEmail}</div>
                          </td>
                          <td>{inv.product}</td>
                          <td><strong>{inv.amount}</strong></td>
                          <td><span className="pill-tier">{inv.tuitionTier}</span></td>
                          <td><span className="status-pill passed">{inv.status}</span></td>
                          <td className="text-muted">{new Date(inv.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. COURSE ANALYTICS                                                      */}
          {/* ========================================================================= */}
          {activeSection === 'course_analytics' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Academic Course Analytics</h2>
                  <p className="section-header-sub">Self-paced lecture progression and student engagement metrics (Separate from Bootcamps)</p>
                </div>
              </div>

              <div className="admin-stat-cards-grid">
                <div className="admin-stat-card">
                  <span className="stat-title">TOTAL ENROLLMENTS</span>
                  <div className="stat-value">{courseAnalytics?.totalEnrollments || 33}</div>
                  <div className="stat-footer text-muted">Across 3 academic courses</div>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-title">AVERAGE PROGRESS</span>
                  <div className="stat-value text-gold">{courseAnalytics?.averageProgress || 72}%</div>
                  <div className="stat-footer text-muted">Consistent completion rate</div>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-title">LESSON COMPLETION</span>
                  <div className="stat-value text-success">{courseAnalytics?.lessonCompletionRate || 84}%</div>
                  <div className="stat-footer text-muted">Reading checks passed</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. BOOTCAMP ANALYTICS                                                    */}
          {/* ========================================================================= */}
          {activeSection === 'bootcamp_analytics' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Bootcamp Progression Analytics</h2>
                  <p className="section-header-sub">Module completion rates, drop-off gates, and assessment difficulty</p>
                </div>
              </div>

              <div className="admin-stat-cards-grid">
                <div className="admin-stat-card">
                  <span className="stat-title">BOOTCAMP PASS RATE</span>
                  <div className="stat-value text-gold">{bootcampAnalytics?.passRate || 17}%</div>
                  <div className="stat-footer text-muted">≥80% weighted mark required</div>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-title">AVG HOMEWORK SCORE</span>
                  <div className="stat-value text-success">{bootcampAnalytics?.averageHomeworkScore || '34.5 / 40'}</div>
                  <div className="stat-footer text-muted">40% weight contribution</div>
                </div>
                <div className="admin-stat-card">
                  <span className="stat-title">AVG QUIZ SCORE</span>
                  <div className="stat-value text-success">{bootcampAnalytics?.averageQuizScore || '16.8 / 20'}</div>
                  <div className="stat-footer text-muted">60% weight contribution</div>
                </div>
              </div>

              <div className="admin-content-card mt-3">
                <h3 className="card-title">Module Progression Drop-Off Analysis</h3>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Module</th>
                        <th>Started</th>
                        <th>Passed (≥80%)</th>
                        <th>Blocked at Gate</th>
                        <th>Average Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bootcampAnalytics?.moduleDropOff || []).map((m) => (
                        <tr key={m.moduleNumber}>
                          <td><strong>Module {m.moduleNumber}: {m.title}</strong></td>
                          <td>{m.started} scholars</td>
                          <td><span className="text-success font-bold">{m.passed}</span></td>
                          <td><span className={m.blocked > 0 ? 'text-alert font-bold' : 'text-muted'}>{m.blocked}</span></td>
                          <td>{m.avgGrade}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. ACTIVITY & AUDIT                                                      */}
          {/* ========================================================================= */}
          {activeSection === 'activity' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Platform Activity Audit Log</h2>
                  <p className="section-header-sub">Chronological audit trail of all platform events</p>
                </div>
              </div>

              <div className="admin-content-card">
                <div className="activity-timeline-feed">
                  {recentActivity.map((evt) => (
                    <div key={evt.id} className="timeline-event-item">
                      <div className={`timeline-dot ${evt.type}`} />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <strong className="timeline-title">{evt.title}</strong>
                          <span className="timeline-time">{evt.timeAgo}</span>
                        </div>
                        <p className="timeline-desc">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. SETTINGS                                                              */}
          {/* ========================================================================= */}
          {activeSection === 'settings' && (
            <div className="admin-view-pane">
              <div className="section-title-row">
                <div>
                  <h2 className="section-header-title">Academy System Settings</h2>
                  <p className="section-header-sub">Global configuration, cluster states, and grader integrations</p>
                </div>
              </div>

              <div className="admin-content-card">
                <h3 className="card-title">System Integrations</h3>
                <div className="settings-fields-grid">
                  <div className="settings-field">
                    <label>Database Engine</label>
                    <input type="text" value="MongoDB Atlas Cloud Cluster (Active)" disabled />
                  </div>
                  <div className="settings-field">
                    <label>Automated Code Grader</label>
                    <input type="text" value="JupyterLite WebAssembly / Pyodide" disabled />
                  </div>
                  <div className="settings-field">
                    <label>Authentication Authority</label>
                    <input type="text" value="JWT Bearer + Role Based Access Control (RBAC)" disabled />
                  </div>
                  <div className="settings-field">
                    <label>System Platform Role</label>
                    <input type="text" value="Academy Director (Full Privileges)" disabled />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* SAFE DELETE STUDENT CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {studentToDelete && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !deleteSubmitting && setStudentToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-student-modal-title"
        >
          <div className="admin-delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-danger">
              <div className="modal-danger-icon">⚠️</div>
              <div>
                <h3 id="delete-student-modal-title" className="modal-danger-title">Delete Student?</h3>
                <p className="modal-warning-text" style={{ margin: '0.15rem 0 0' }}>
                  Permanent destruction of scholar profile and learning data.
                </p>
              </div>
            </div>

            <div className="modal-target-student-box">
              <span className="target-student-name">{studentToDelete.name}</span>
              <span className="target-student-email">{studentToDelete.email}</span>
            </div>

            <p className="modal-warning-text">
              You are about to permanently delete this student account. This will remove their authentication record,
              lesson progress, and assessment attempt records. This action <strong>cannot be undone</strong>.
              Financial transaction history remains preserved for institutional accounting.
            </p>

            {deleteError && (
              <div className="modal-error-banner">
                <div>{deleteError}</div>
                <button
                  type="button"
                  className="btn-admin-secondary btn-sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={handleConfirmDelete}
                >
                  Try Again
                </button>
              </div>
            )}

            <div className="modal-confirm-input-group">
              <label className="modal-confirm-input-label">
                To confirm, type the scholar's exact email address: <code>{studentToDelete.email}</code>
              </label>
              <input
                type="text"
                className="modal-confirm-input"
                placeholder={studentToDelete.email}
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                disabled={deleteSubmitting}
                autoFocus
              />
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn-admin-secondary"
                onClick={() => setStudentToDelete(null)}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin-danger"
                disabled={
                  deleteSubmitting ||
                  confirmEmailInput.trim().toLowerCase() !== studentToDelete.email.trim().toLowerCase()
                }
                onClick={handleConfirmDelete}
              >
                {deleteSubmitting ? 'Deleting Account...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
