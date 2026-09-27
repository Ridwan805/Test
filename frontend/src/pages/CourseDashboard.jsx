import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/apiFetch';

export default function CourseDashboard() {
  const { courseSlug: rawCourseSlug = 'intro-to-python' } = useParams();

  const normalizeSlug = (slug) => {
    if (!slug) return '';
    let s = String(slug);
    try { s = decodeURIComponent(s); } catch (e) {}
    return s.trim().toLowerCase().replace(/\s+/g, '-');
  };

  const courseSlug = normalizeSlug(rawCourseSlug) || 'intro-to-python';
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (rawCourseSlug && rawCourseSlug !== courseSlug) {
      navigate(`/learn/${courseSlug}`, { replace: true });
    }
  }, [rawCourseSlug, courseSlug, navigate]);

  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/courses/${courseSlug}/modules`);

        if (res.status === 401) {
          if (!localStorage.getItem('cached_user')) {
            navigate('/login', { state: { from: `/learn/${courseSlug}` } });
          }
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load course curriculum.');
        }

        const data = await res.json();
        if (isMounted) {
          setCurriculumData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [courseSlug, navigate]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', fontSize: '1.25rem' }}>
          Loading course dashboard...
        </p>
      </div>
    );
  }

  if (error || !curriculumData) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Unable to load course</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>{error || 'Course not found'}</p>
        <Link to="/bootcamp" className="btn btn-secondary">
          Return to Bootcamps
        </Link>
      </div>
    );
  }

  const {
    course,
    curriculum = [],
    module2GradeSummary,
    module3GradeSummary,
    module4GradeSummary,
    totalLessons = 24,
    completedLessons = 0,
    progressPercentage = 0
  } = curriculumData;

  // Determine next uncompleted lesson across all accessible modules
  let nextLessonUrl = `/learn/${course.slug}/module/1/lesson/what-is-python`;
  for (const mod of curriculum) {
    if (!mod.isLocked) {
      const uncompleted = mod.lessons?.find((l) => !l.completed);
      if (uncompleted) {
        nextLessonUrl = `/learn/${course.slug}/module/${mod.moduleNumber}/lesson/${uncompleted.slug}`;
        break;
      }
    }
  }

  return (
    <div className="course-dashboard-page container">
      {/* Top Breadcrumb */}
      <div className="dashboard-breadcrumb">
        <Link to="/bootcamp" className="breadcrumb-back">
          ← Back to Bootcamps
        </Link>
      </div>

      {/* Course Overview Banner */}
      <div className="dashboard-hero-card">
        <div className="dashboard-hero-top">
          <div className="dashboard-meta-pills">
            <span className="pill-badge pill-type">FOUNDATIONAL BOOTCAMP</span>
            <span className="pill-badge pill-level">{course.level || 'Beginner'}</span>
            <span className="pill-badge pill-free">100% FREE SCHOLAR ACCESS</span>
            {user?.is_staff && (
              <span className="pill-badge pill-admin">🛡️ ADMIN PRIVILEGES ACTIVE</span>
            )}
          </div>
          <h1 className="dashboard-course-title">{course.title}</h1>
          <p className="dashboard-user-greeting">
            Welcome back, <strong>{user?.first_name || user?.email}</strong>. Select a module below to view its lessons and start learning.
          </p>
        </div>

        {/* Progress Bar & Primary Action */}
        <div className="dashboard-progress-section">
          <div className="progress-info-row">
            <span className="progress-label">Overall Bootcamp Progress</span>
            <span className="progress-fraction">
              {completedLessons} of {totalLessons} Lessons Completed ({progressPercentage}%)
            </span>
          </div>
          <div className="dashboard-progress-track" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin="0" aria-valuemax="100">
            <div className="dashboard-progress-fill" style={{ width: `${progressPercentage}%` }} />
          </div>

          <div className="dashboard-cta-row">
            <Link to={nextLessonUrl} className="btn btn-primary btn-large">
              {completedLessons === 0 ? 'Start Learning' : 'Continue Learning'} →
            </Link>
          </div>
        </div>
      </div>

      {/* Separate Module Cards Deck */}
      <section className="modules-deck-section" style={{ marginBottom: '3rem' }}>
        <div className="modules-deck-header">
          <div>
            <span className="section-pretitle">ACADEMIC MODULES</span>
            <h2 className="modules-deck-title">Bootcamp Modules</h2>
            <p className="modules-deck-subtitle">
              Click on any module card below to open its dedicated page and view all lessons.
            </p>
          </div>
          <div className="module-status-badge">
            {completedLessons} of {totalLessons} Lessons Completed
          </div>
        </div>

        <div className="modules-cards-grid">
          {curriculum.map((mod) => {
            const isLocked = Boolean(mod.isLocked);
            const modCompleted = mod.lessons?.filter((l) => l.completed).length || 0;
            const modTotal = mod.lessons?.length || 0;
            const pct = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
            const isMod1 = mod.moduleNumber === 1;
            const isMod2 = mod.moduleNumber === 2;
            const isMod3 = mod.moduleNumber === 3;
            const isMod4 = mod.moduleNumber === 4;
            const isMod5 = mod.moduleNumber === 5;
            const targetUrl = `/learn/${course.slug}/module/${mod.moduleNumber}`;

            return (
              <div
                key={mod._id || mod.moduleNumber}
                className={`module-deck-card ${isLocked ? 'is-locked-card' : ''}`}
                onClick={() => navigate(targetUrl)}
                role="button"
                tabIndex={0}
                aria-label={`Open Module 0${mod.moduleNumber} Lessons`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(targetUrl);
                  }
                }}
              >
                <div>
                  <div className="card-top-badges">
                    <span className="card-mod-num">MODULE 0{mod.moduleNumber}</span>
                    {isMod1 && (
                      <span className="pill-badge pill-intro">INTRODUCTORY</span>
                    )}
                    {(isMod2 || isMod3 || isMod4) && (
                      <span className="pill-badge pill-graded">GRADED (80% REQ)</span>
                    )}
                    {(isMod3 || isMod4 || isMod5) && isLocked && (
                      <span className="pill-badge pill-lock-badge">🔒 LOCKED</span>
                    )}
                    {(isMod3 || isMod4 || isMod5) && !isLocked && (
                      <span className="pill-badge pill-unlocked">✓ UNLOCKED</span>
                    )}
                  </div>

                  <h3 className="card-mod-title">
                    Module {mod.moduleNumber} — {mod.title}
                  </h3>

                  <p className="card-mod-desc">
                    {mod.description || 'Core concepts and hands-on exercises.'}
                  </p>

                  <div className="card-mod-meta-row">
                    <span>
                      {isLocked
                        ? (isMod5 ? 'Prerequisite Locked (80% in Mod 4)' : isMod4 ? 'Prerequisite Locked (80% in Mod 3)' : 'Prerequisite Locked (80% in Mod 2)')
                        : `${modCompleted} of ${modTotal} Lessons (${pct}%)`}
                    </span>
                    {isMod2 && module2GradeSummary && (
                      <span style={{ fontWeight: 700, color: module2GradeSummary.passed ? '#16A34A' : '#B45309' }}>
                        {module2GradeSummary.homework?.attemptsCount > 0 || module2GradeSummary.quiz?.attemptsCount > 0
                          ? `Grade: ${module2GradeSummary.moduleGrade}%`
                          : 'Grade: Not submitted'}
                      </span>
                    )}
                    {isMod3 && module3GradeSummary && (
                      <span style={{ fontWeight: 700, color: module3GradeSummary.passed ? '#16A34A' : '#B45309' }}>
                        {module3GradeSummary.homework?.attemptsCount > 0 || module3GradeSummary.quiz?.attemptsCount > 0
                          ? `Grade: ${module3GradeSummary.moduleGrade}%`
                          : 'Grade: Not submitted'}
                      </span>
                    )}
                    {isMod4 && module4GradeSummary && (
                      <span style={{ fontWeight: 700, color: module4GradeSummary.passed ? '#16A34A' : '#B45309' }}>
                        {module4GradeSummary.homework?.attemptsCount > 0 || module4GradeSummary.quiz?.attemptsCount > 0
                          ? `Grade: ${module4GradeSummary.moduleGrade}%`
                          : 'Grade: Not submitted'}
                      </span>
                    )}
                  </div>

                  <div className="card-mod-progress-track">
                    <div
                      className={`card-mod-progress-fill ${pct === 100 ? 'fill-completed' : ''}`}
                      style={{ width: `${isLocked ? 0 : pct}%` }}
                    />
                  </div>
                </div>

                <div className="card-action-btn-row">
                  <Link
                    to={targetUrl}
                    className="card-cta-button"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isLocked ? (
                      '🔒 View Lock Requirements →'
                    ) : (
                      `Open Module 0${mod.moduleNumber} Lessons →`
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
