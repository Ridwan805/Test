import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContentRenderer from '../components/lesson/ContentRenderer';
import AssessmentWorksheet from '../components/assessment/AssessmentWorksheet';

export default function LessonPage() {
  const {
    courseSlug: rawCourseSlug = 'intro-to-python',
    moduleNumber = '1',
    lessonSlug: rawLessonSlug
  } = useParams();

  const normalizeSlug = (slug) => {
    if (!slug) return '';
    let s = String(slug);
    try { s = decodeURIComponent(s); } catch (e) {}
    return s.trim().toLowerCase().replace(/\s+/g, '-');
  };

  const courseSlug = normalizeSlug(rawCourseSlug) || 'intro-to-python';
  const lessonSlug = normalizeSlug(rawLessonSlug);

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if ((rawCourseSlug && rawCourseSlug !== courseSlug) || (rawLessonSlug && rawLessonSlug !== lessonSlug)) {
      navigate(`/learn/${courseSlug}/module/${moduleNumber}/lesson/${lessonSlug}`, { replace: true });
    }
  }, [rawCourseSlug, rawLessonSlug, courseSlug, lessonSlug, moduleNumber, navigate]);

  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLesson() {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      setLockDetails(null);
      const token = localStorage.getItem('access_token');

      try {
        const res = await fetch(`/api/courses/${courseSlug}/lessons/${lessonSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.status === 401) {
          navigate('/login', {
            state: { from: `/learn/${courseSlug}/module/${moduleNumber}/lesson/${lessonSlug}` }
          });
          return;
        }

        if (res.status === 403) {
          const lockData = await res.json();
          if (isMounted) {
            setIsLocked(true);
            setLockDetails(lockData);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Lesson not found or unavailable.');
        }

        const data = await res.json();
        if (isMounted) {
          setLessonData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          // Scroll to top when changing lesson
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }

    if (lessonSlug) {
      fetchLesson();
    }

    return () => {
      isMounted = false;
    };
  }, [courseSlug, moduleNumber, lessonSlug, navigate]);

  const toggleComplete = async () => {
    if (!lessonData || isUpdatingProgress) return;
    setIsUpdatingProgress(true);

    const token = localStorage.getItem('access_token');
    const newStatus = !lessonData.lesson.completed;

    try {
      const res = await fetch(`/api/courses/${courseSlug}/lessons/${lessonSlug}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ completed: newStatus })
      });

      if (res.ok) {
        setLessonData((prev) => {
          if (!prev) return prev;
          const updatedSidebar = prev.sidebarLessons.map((item) =>
            item.slug === lessonSlug ? { ...item, completed: newStatus } : item
          );
          return {
            ...prev,
            lesson: { ...prev.lesson, completed: newStatus },
            sidebarLessons: updatedSidebar
          };
        });
      }
    } catch (err) {
      console.error('Failed to update lesson progress:', err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', fontSize: '1.25rem' }}>
          Loading lesson...
        </p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '760px', margin: '0 auto' }}>
        <div className="dashboard-breadcrumb" style={{ marginBottom: '1.5rem' }}>
          <Link to={`/learn/${courseSlug}/module/${moduleNumber}`} className="breadcrumb-back">
            ← Back to Module {moduleNumber} Overview
          </Link>
        </div>

        <div className="lesson-locked-screen" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '3.2rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.75rem' }}>
            {lockDetails?.reason === 'homework_required'
              ? 'Homework Completion Required'
              : lockDetails?.reason === 'previous_lesson_incomplete'
              ? 'Previous Lesson Incomplete'
              : `Lesson Locked`}
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {lockDetails?.detail || 'This lesson is locked until you complete the required prior material.'}
          </p>

          {lockDetails?.requiredLesson && (
            <div style={{ marginBottom: '1.5rem' }}>
              <Link
                to={`/learn/${courseSlug}/module/${moduleNumber}/lesson/${lockDetails.requiredLesson.slug}`}
                className="btn btn-primary btn-large"
              >
                Go to Lesson {lockDetails.requiredLesson.lessonNumber}: {lockDetails.requiredLesson.title} →
              </Link>
            </div>
          )}

          {lockDetails?.requiredHomework && (
            <div style={{ marginBottom: '1.5rem' }}>
              <Link
                to={`/learn/${courseSlug}/module/${moduleNumber}/lesson/${lockDetails.requiredHomework.slug}`}
                className="btn btn-primary btn-large"
              >
                Complete Module {moduleNumber} Homework (Pass with ≥80%) →
              </Link>
            </div>
          )}

          {lockDetails?.reason === 'module_locked' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <Link
                to={`/learn/${courseSlug}/module/${lockDetails.requiredModule || (parseInt(moduleNumber) - 1)}`}
                className="btn btn-primary btn-large"
              >
                Go to Module {lockDetails.requiredModule || (parseInt(moduleNumber) - 1)} Overview →
              </Link>
            </div>
          )}

          <div>
            <Link to={`/learn/${courseSlug}/module/${moduleNumber}`} className="btn btn-outline">
              ← Return to Module Syllabus
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Lesson Not Found</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
          {error || 'The requested lesson could not be found.'}
        </p>
        <Link to={`/learn/${courseSlug}`} className="btn btn-secondary">
          Back to Course Dashboard
        </Link>
      </div>
    );
  }

  const { course, module: currentModule, lesson, navigation, sidebarLessons = [] } = lessonData;
  const currentModNum = currentModule?.moduleNumber || 1;
  const isModule2 = currentModNum === 2;
  const isModule3 = currentModNum === 3;
  const isLabModule = isModule2 || isModule3;
  const isHomeworkLesson =
    lessonSlug === `module-${currentModNum}-homework` ||
    lessonSlug === 'module-2-homework' ||
    lessonSlug === 'module-3-homework' ||
    lessonSlug === 'homework';
  const isQuizLesson =
    lessonSlug === `module-${currentModNum}-coding-quiz` ||
    lessonSlug === 'module-2-coding-quiz' ||
    lessonSlug === 'module-3-coding-quiz' ||
    lessonSlug === 'coding-quiz';

  const handleResetPractice = async () => {
    if (
      window.confirm(
        `Are you sure you want to reset your Module ${currentModNum} Practice Notebook? This will restore a fresh copy from the master template.`
      )
    ) {
      try {
        if (window.indexedDB && window.indexedDB.databases) {
          const dbs = await window.indexedDB.databases();
          for (const dbInfo of dbs) {
            if (dbInfo.name && dbInfo.name.includes('JupyterLite')) {
              const req = window.indexedDB.open(dbInfo.name);
              req.onsuccess = (e) => {
                const db = e.target.result;
                if (db.objectStoreNames.contains('files')) {
                  const tx = db.transaction('files', 'readwrite');
                  tx.objectStore('files').delete(`module-${currentModNum}-practice.ipynb`);
                }
              };
            }
          }
        }
        alert("Practice Notebook reset to template successfully! Click 'Open Practice Notebook' to begin fresh.");
      } catch (err) {
        alert("Practice template ready. Please refresh your notebook tab.");
      }
    }
  };

  return (
    <div className="lesson-page-wrapper">
      {/* Mobile Sidebar Toggle Button */}
      <div className="mobile-sidebar-bar">
        <button
          type="button"
          className="mobile-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Lesson Navigation"
        >
          <span>{sidebarOpen ? '✕ Close Syllabus' : '☰ Course Syllabus'}</span>
          <span className="mobile-lesson-indicator">Lesson {lesson.lessonNumber} of {sidebarLessons.length}</span>
        </button>
      </div>

      <div className="lesson-layout container">
        {/* LEFT: Module Sidebar */}
        <aside className={`lesson-sidebar ${sidebarOpen ? 'sidebar-visible' : ''}`}>
          <div className="sidebar-header">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <Link to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}`} className="sidebar-back-link" style={{ marginBottom: 0 }}>
                ← Module 0{currentModule.moduleNumber} Lessons
              </Link>
              <Link to={`/learn/${courseSlug}`} className="sidebar-back-link" style={{ marginBottom: 0 }}>
                Dashboard
              </Link>
            </div>
            <span className="sidebar-course-title">{course.title}</span>
            <h3 className="sidebar-module-title">
              Module {currentModule.moduleNumber}: {currentModule.title}
            </h3>
          </div>

          <nav className="sidebar-nav" aria-label="Module Lessons">
            <ul className="sidebar-lesson-list">
              {sidebarLessons.filter((item) => !item.isAssessment).map((item, idx) => {
                const isActive = item.slug === lessonSlug;
                const hwItem = sidebarLessons.find((s) => s.isAssessment && s.slug === `module-${currentModNum}-homework`);
                const quizItem = sidebarLessons.find((s) => s.isAssessment && s.slug === `module-${currentModNum}-coding-quiz`);

                return (
                  <React.Fragment key={item.id || idx}>
                    <li className="sidebar-lesson-li">
                      <Link
                        to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}/lesson/${item.slug}`}
                        className={`sidebar-lesson-item ${isActive ? 'active' : ''} ${item.completed ? 'completed' : ''} ${item.locked ? 'locked' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                        title={item.lockReason || ''}
                      >
                        <span className="item-status-icon" aria-hidden="true">
                          {item.completed ? '✓' : item.locked ? '🔒' : '○'}
                        </span>
                        <div className="item-text-wrapper">
                          <span className="item-lesson-num">
                            Lesson {item.lessonNumber || idx + 1}
                            {item.locked && (
                              <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
                                (Locked)
                              </span>
                            )}
                          </span>
                          <span className="item-title">{item.title}</span>
                        </div>
                      </Link>
                    </li>

                    {/* Module 2 Assessment Links in Sidebar */}
                    {isModule2 && item.lessonNumber === 8 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/2/lesson/module-2-homework`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-2-homework' ? 'active' : ''} ${hwItem?.locked ? 'locked' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                          title={hwItem?.lockReason || ''}
                        >
                          <span className="assessment-badge-icon">{hwItem?.locked ? '🔒' : '⭐'}</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">
                              GRADED HOMEWORK (40%)
                              {hwItem?.locked && (
                                <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
                                  (Locked)
                                </span>
                              )}
                            </span>
                            <span className="item-title">Module 2 Homework (40 Marks)</span>
                          </div>
                        </Link>
                      </li>
                    )}
                    {isModule2 && item.lessonNumber === 10 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/2/lesson/module-2-coding-quiz`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-2-coding-quiz' ? 'active' : ''} ${quizItem?.locked ? 'locked' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                          title={quizItem?.lockReason || ''}
                        >
                          <span className="assessment-badge-icon">{quizItem?.locked ? '🔒' : '🏆'}</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">
                              GRADED FINAL QUIZ (60%)
                              {quizItem?.locked && (
                                <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
                                  (Locked)
                                </span>
                              )}
                            </span>
                            <span className="item-title">Module 2 Coding Quiz (20 Marks)</span>
                          </div>
                        </Link>
                      </li>
                    )}

                    {/* Module 3 Assessment Links in Sidebar */}
                    {isModule3 && item.lessonNumber === 8 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/3/lesson/module-3-homework`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-3-homework' ? 'active' : ''} ${hwItem?.locked ? 'locked' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                          title={hwItem?.lockReason || ''}
                        >
                          <span className="assessment-badge-icon">{hwItem?.locked ? '🔒' : '⭐'}</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">
                              GRADED HOMEWORK (40%)
                              {hwItem?.locked && (
                                <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
                                  (Locked)
                                </span>
                              )}
                            </span>
                            <span className="item-title">Module 3 Homework (40 Marks)</span>
                          </div>
                        </Link>
                      </li>
                    )}
                    {isModule3 && item.lessonNumber === 10 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/3/lesson/module-3-coding-quiz`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-3-coding-quiz' ? 'active' : ''} ${quizItem?.locked ? 'locked' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                          title={quizItem?.lockReason || ''}
                        >
                          <span className="assessment-badge-icon">{quizItem?.locked ? '🔒' : '🏆'}</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">
                              GRADED FINAL QUIZ (60%)
                              {quizItem?.locked && (
                                <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
                                  (Locked)
                                </span>
                              )}
                            </span>
                            <span className="item-title">Module 3 Coding Quiz (20 Marks)</span>
                          </div>
                        </Link>
                      </li>
                    )}
                  </React.Fragment>
                );
              })}
            </ul>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-user-pill">
              Scholar: {user?.first_name || user?.email}
            </span>
          </div>
        </aside>

        {/* RIGHT: Main Lesson Learning Area */}
        <main className="lesson-main-content">
          {/* Breadcrumbs */}
          <nav className="lesson-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/bootcamp">Bootcamps</Link>
            <span className="crumb-sep">/</span>
            <Link to={`/learn/${courseSlug}`}>{course.title}</Link>
            <span className="crumb-sep">/</span>
            <span>Module {currentModule.moduleNumber}</span>
          </nav>

          {/* Module 2 & 3 Practice & Assessment Quick Actions Banner */}
          {isLabModule && (
            <div className="module2-quick-banner">
              <div className="quick-banner-left">
                <span className="quick-pill">MODULE 0{currentModNum} LAB TOOLS</span>
                <span className="quick-title">Practice Notebook (Ungraded) & Assessments</span>
              </div>
              <div className="quick-banner-actions">
                <a
                  href={`/lite/notebooks/index.html?path=module-${currentModNum}-practice.ipynb${user?.is_staff ? '&admin=1' : '&admin=0'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Open ungraded interactive practice notebook in new tab"
                >
                  ↗ Open Practice Notebook
                </a>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleResetPractice}
                  title="Reset student practice cells to fresh master template"
                >
                  ↺ Reset Practice Notebook
                </button>
              </div>
            </div>
          )}

          {/* Assessment Worksheet Mode (Homework or Coding Quiz) */}
          {isHomeworkLesson ? (
            <AssessmentWorksheet
              courseSlug={courseSlug}
              assessmentType="homework"
              moduleNumber={currentModNum}
              onSubmitted={() => {}}
            />
          ) : isQuizLesson ? (
            <AssessmentWorksheet
              courseSlug={courseSlug}
              assessmentType="quiz"
              moduleNumber={currentModNum}
              onSubmitted={() => {}}
            />
          ) : (
            <>
              {/* Lesson Header */}
              <header className="lesson-header">
                <div className="lesson-meta-bar">
                  <span className="lesson-badge">LESSON 0{lesson.lessonNumber}</span>
                  <span className="lesson-time">~{lesson.estimatedMinutes || 10} min read</span>
                  {lesson.completed && (
                    <span className="lesson-completed-tag">✓ Completed</span>
                  )}
                </div>
                <h1 className="lesson-page-title">{lesson.title}</h1>
              </header>

              {/* Structured Content Blocks */}
              <article className="lesson-article">
                <ContentRenderer content={lesson.content} />
              </article>

              {/* Mark Complete Action Bar */}
              <div className="lesson-completion-bar">
                <button
                  type="button"
                  className={`btn ${lesson.completed ? 'btn-completed-active' : 'btn-primary'}`}
                  onClick={toggleComplete}
                  disabled={isUpdatingProgress}
                >
                  {isUpdatingProgress ? (
                    'Updating...'
                  ) : lesson.completed ? (
                    '✓ Lesson Completed (Click to Undo)'
                  ) : (
                    'Mark Lesson Complete'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Previous / Next Lesson Navigation */}
          <footer className="lesson-nav-footer">
            <div className="nav-col nav-prev">
              {navigation.previous ? (
                <Link
                  to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}/lesson/${navigation.previous.slug}`}
                  className="nav-link-card prev"
                >
                  <span className="nav-arrow">&larr; Previous</span>
                  <span className="nav-lesson-name">{navigation.previous.title}</span>
                </Link>
              ) : (
                <Link to={`/learn/${courseSlug}`} className="nav-link-card prev">
                  <span className="nav-arrow">&larr; Back</span>
                  <span className="nav-lesson-name">Course Dashboard</span>
                </Link>
              )}
            </div>

            <div className="nav-col nav-next">
              {navigation.next ? (
                <Link
                  to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}/lesson/${navigation.next.slug}`}
                  className={`nav-link-card next ${navigation.next.locked ? 'nav-locked' : ''}`}
                >
                  <span className="nav-arrow">
                    {navigation.next.locked ? '🔒 Next (Complete prior content first)' : 'Next &rarr;'}
                  </span>
                  <span className="nav-lesson-name">{navigation.next.title}</span>
                </Link>
              ) : (
                <Link to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}`} className="nav-link-card next">
                  <span className="nav-arrow">Module Syllabus &rarr;</span>
                  <span className="nav-lesson-name">Module 0{currentModule.moduleNumber} Overview</span>
                </Link>
              )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
