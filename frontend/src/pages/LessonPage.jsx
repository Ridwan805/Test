import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContentRenderer from '../components/lesson/ContentRenderer';

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
            <Link to={`/learn/${courseSlug}`} className="sidebar-back-link">
              ← Course Dashboard
            </Link>
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
                  <li key={item.id || idx}>
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
              ) : (
                <Link to={`/learn/${courseSlug}`} className="nav-link-card next">
                  <span className="nav-arrow">Finish Module 1 &rarr;</span>
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
