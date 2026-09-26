import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContentRenderer from '../components/lesson/ContentRenderer';
import AssessmentWorksheet from '../components/assessment/AssessmentWorksheet';

export default function LessonPage() {
  const {
    courseSlug = 'intro-to-python',
    moduleNumber = '1',
    lessonSlug
  } = useParams();

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [lessonData, setLessonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLesson() {
      setLoading(true);
      setError(null);
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
  const isModule2 = currentModule.moduleNumber === 2;
  const isHomeworkLesson = lessonSlug === 'module-2-homework' || lessonSlug === 'homework';
  const isQuizLesson = lessonSlug === 'module-2-coding-quiz' || lessonSlug === 'coding-quiz';

  const handleResetPractice = async () => {
    if (window.confirm("Are you sure you want to reset your Module 2 Practice Notebook? This will restore a fresh copy from the master template.")) {
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
                  tx.objectStore('files').delete('module-2-practice.ipynb');
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
              {sidebarLessons.map((item, idx) => {
                const isActive = item.slug === lessonSlug;
                return (
                  <React.Fragment key={item.id || idx}>
                    <li className="sidebar-lesson-li">
                      <Link
                        to={`/learn/${courseSlug}/module/${currentModule.moduleNumber}/lesson/${item.slug}`}
                        className={`sidebar-lesson-item ${isActive ? 'active' : ''} ${item.completed ? 'completed' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="item-status-icon" aria-hidden="true">
                          {item.completed ? '✓' : '○'}
                        </span>
                        <div className="item-text-wrapper">
                          <span className="item-lesson-num">Lesson {item.lessonNumber || idx + 1}</span>
                          <span className="item-title">{item.title}</span>
                        </div>
                      </Link>
                    </li>

                    {/* Insert Official Homework link right after Lesson 8 Arithmetic Operators */}
                    {isModule2 && item.lessonNumber === 8 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/2/lesson/module-2-homework`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-2-homework' ? 'active' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span className="assessment-badge-icon">⭐</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">GRADED HOMEWORK (40%)</span>
                            <span className="item-title">Module 2 Homework (40 Marks)</span>
                          </div>
                        </Link>
                      </li>
                    )}

                    {/* Insert Final Coding Quiz link right after Checkpoint (Lesson 10) */}
                    {isModule2 && item.lessonNumber === 10 && (
                      <li className="sidebar-assessment-divider">
                        <Link
                          to={`/learn/${courseSlug}/module/2/lesson/module-2-coding-quiz`}
                          className={`sidebar-assessment-item ${lessonSlug === 'module-2-coding-quiz' ? 'active' : ''}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span className="assessment-badge-icon">🏆</span>
                          <div className="item-text-wrapper">
                            <span className="item-lesson-num">GRADED FINAL QUIZ (60%)</span>
                            <span className="item-title">Module 2 Coding Quiz (20 Marks)</span>
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

          {/* Module 2 Practice & Assessment Quick Actions Banner */}
          {isModule2 && (
            <div className="module2-quick-banner">
              <div className="quick-banner-left">
                <span className="quick-pill">MODULE 2 LAB TOOLS</span>
                <span className="quick-title">Practice Notebook (Ungraded) & Assessments</span>
              </div>
              <div className="quick-banner-actions">
                <a
                  href={`/lite/notebooks/index.html?path=module-2-practice.ipynb${user?.is_staff ? '&admin=1' : '&admin=0'}`}
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
              onSubmitted={() => {}}
            />
          ) : isQuizLesson ? (
            <AssessmentWorksheet
              courseSlug={courseSlug}
              assessmentType="quiz"
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
                  className="nav-link-card next"
                >
                  <span className="nav-arrow">Next &rarr;</span>
                  <span className="nav-lesson-name">{navigation.next.title}</span>
                </Link>
              ) : isModule2 && !isHomeworkLesson && !isQuizLesson ? (
                <Link
                  to={`/learn/${courseSlug}/module/2/lesson/module-2-homework`}
                  className="nav-link-card next"
                >
                  <span className="nav-arrow">Continue to Assessment &rarr;</span>
                  <span className="nav-lesson-name">Module 2 Official Homework</span>
                </Link>
              ) : (
                <Link to={`/learn/${courseSlug}`} className="nav-link-card next">
                  <span className="nav-arrow">Return to Dashboard &rarr;</span>
                  <span className="nav-lesson-name">Course Dashboard</span>
                </Link>
              )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
