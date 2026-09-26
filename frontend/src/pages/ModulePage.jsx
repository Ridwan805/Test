import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ModulePage() {
  const { courseSlug = 'intro-to-python', moduleNumber = '1' } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState(null);

  const modNum = parseInt(moduleNumber, 10);

  useEffect(() => {
    let isMounted = true;
    async function fetchModule() {
      setLoading(true);
      setError(null);
      setIsLocked(false);
      const token = localStorage.getItem('access_token');

      try {
        const res = await fetch(`/api/courses/${courseSlug}/modules/${moduleNumber}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.status === 401) {
          navigate('/login', { state: { from: `/learn/${courseSlug}/module/${moduleNumber}` } });
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
          throw new Error('Failed to load module details.');
        }

        const data = await res.json();
        if (isMounted) {
          setModuleData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }

    fetchModule();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, moduleNumber, navigate]);

  const handleResetPractice = async () => {
    if (window.confirm("Are you sure you want to reset your Module 2 Practice Notebook? This will restore a fresh copy from the clean master template.")) {
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
        alert("Practice Notebook reset to template successfully! Click 'Open Practice Lab' to begin fresh.");
      } catch (err) {
        alert("Practice template ready. Please refresh your notebook tab.");
      }
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', fontSize: '1.25rem' }}>
          Loading Module {moduleNumber}...
        </p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="dashboard-breadcrumb" style={{ marginBottom: '1.5rem' }}>
          <Link to={`/learn/${courseSlug}`} className="breadcrumb-back">
            ← Back to Course Dashboard
          </Link>
        </div>

        <div className="module-locked-notice" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div className="locked-icon-wrapper" style={{ margin: '0 auto 1.5rem auto' }}>
            <span className="big-lock-icon" style={{ fontSize: '3rem' }}>🔒</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', marginBottom: '0.75rem' }}>
            Module {moduleNumber} is Locked
          </h2>
          <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {lockDetails?.detail || 'To unlock this module, you must achieve a combined score of at least 80% in Module 2 (Homework + Coding Quiz).'}
          </p>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', display: 'inline-block' }}>
            <span style={{ fontWeight: 700, color: '#92400E' }}>
              Your Current Module 2 Grade: {lockDetails?.module2Grade || 0}% / Required: 80%
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={`/learn/${courseSlug}/module/2/lesson/module-2-homework`}
              className="btn btn-primary"
            >
              Improve Homework Score →
            </Link>
            <Link
              to={`/learn/${courseSlug}/module/2/lesson/module-2-coding-quiz`}
              className="btn btn-secondary"
            >
              Improve Quiz Score →
            </Link>
            <Link
              to={`/learn/${courseSlug}`}
              className="btn btn-outline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !moduleData) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Module Not Found</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
          {error || `Module ${moduleNumber} could not be loaded.`}
        </p>
        <Link to={`/learn/${courseSlug}`} className="btn btn-secondary">
          Back to Course Dashboard
        </Link>
      </div>
    );
  }

  const { course, module: modDoc, lessons = [], module2GradeSummary } = moduleData;

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalCount = lessons.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isMod1 = modNum === 1;
  const isMod2 = modNum === 2;

  // Determine first incomplete lesson to start learning
  const nextIncompleteLesson = lessons.find((l) => !l.completed);
  const primaryLesson = nextIncompleteLesson || lessons[0];
  const startLearningUrl = primaryLesson
    ? `/learn/${courseSlug}/module/${modNum}/lesson/${primaryLesson.slug}`
    : '#';

  return (
    <div className="module-detail-page container" style={{ padding: '2rem 1rem 4rem 1rem' }}>
      {/* Top Breadcrumb Navigation */}
      <div className="dashboard-breadcrumb" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to={`/learn/${courseSlug}`} className="breadcrumb-back">
          ← Back to Course Dashboard
        </Link>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          {course?.title || 'Bootcamp'} &bull; <strong>Module 0{modNum}</strong>
        </div>
      </div>

      {/* Module Hero Banner */}
      <div className="dashboard-hero-card" style={{ marginBottom: '2.5rem' }}>
        <div className="dashboard-hero-top">
          <div className="dashboard-meta-pills">
            <span className="pill-badge pill-type">MODULE 0{modNum}</span>
            {isMod1 && (
              <span className="pill-badge pill-intro">INTRODUCTORY &bull; NO PASS MARK</span>
            )}
            {isMod2 && (
              <span className="pill-badge pill-graded">GRADED &bull; 80% COMBINED GRADE REQUIRED</span>
            )}
            {completedCount === totalCount && totalCount > 0 ? (
              <span className="pill-badge pill-unlocked">✓ COMPLETED</span>
            ) : (
              <span className="pill-badge pill-free">{completedCount} OF {totalCount} LESSONS DONE</span>
            )}
          </div>

          <h1 className="dashboard-course-title">
            Module {modNum} — {modDoc.title}
          </h1>

          <p className="dashboard-user-greeting">
            {modDoc.description || 'Master core foundational concepts and hands-on coding through the lessons below.'}
          </p>
        </div>

        {/* Progress Bar & Primary "Start Learning" Action */}
        <div className="dashboard-progress-section">
          <div className="progress-info-row">
            <span className="progress-label">Module Progress</span>
            <span className="progress-fraction">
              {completedCount} of {totalCount} Lessons Completed ({pct}%)
            </span>
          </div>

          <div className="dashboard-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
            <div className="dashboard-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <div className="dashboard-cta-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {startLearningUrl !== '#' && (
              <Link to={startLearningUrl} className="btn btn-primary btn-large">
                {completedCount === 0
                  ? 'Start Learning Module'
                  : completedCount === totalCount
                  ? 'Review Module Lessons'
                  : 'Continue Learning Module'} →
              </Link>
            )}
            <Link to={`/learn/${courseSlug}`} className="btn btn-outline" style={{ background: '#FFFFFF' }}>
              All Modules Overview
            </Link>
          </div>
        </div>
      </div>

      {/* If Module 2: Assessment & Grade Performance Section */}
      {isMod2 && module2GradeSummary && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="module-assessment-overview-card">
            <div className="overview-header-row">
              <div className="overview-title-group">
                <span className="overview-pre">MODULE 2 PERFORMANCE & PROGRESSION</span>
                <h3 className="overview-heading">
                  Combined Module Grade: <strong>{module2GradeSummary.moduleGrade}%</strong>
                </h3>
                <span className="overview-sub">
                  Passing Requirement: <strong>80.0%</strong> (Homework: 40% + Coding Quiz: 60%)
                </span>
              </div>

              <div className="overview-result-badge">
                {module2GradeSummary.passed ? (
                  <div className="badge-pass-pill">
                    <span className="badge-check">✓</span>
                    <div>
                      <strong>PASSED MODULE 2</strong>
                      <p>Module 3 is Unlocked</p>
                    </div>
                  </div>
                ) : (
                  <div className="badge-locked-pill">
                    <span className="badge-lock">🔒</span>
                    <div>
                      <strong>NOT YET PASSED (Need 80%)</strong>
                      <p>Module 3 Remains Locked</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment Cards Grid */}
            <div className="assessments-grid">
              {/* Homework Card */}
              <div className="assessment-stat-card">
                <div className="stat-card-top">
                  <span className="stat-type">GRADED HOMEWORK (40%)</span>
                  <span className="stat-marks">
                    Best: <strong>{module2GradeSummary.homework?.bestScore || 0} / 40</strong>
                  </span>
                </div>
                <h4 className="stat-title">Module 2 Official Homework</h4>
                <p className="stat-desc">
                  5 problems covering input, rectangle dimensions, temperature conversion, and digit extraction.
                </p>
                <div className="stat-progress-bar">
                  <div
                    className="stat-fill"
                    style={{ width: `${module2GradeSummary.homework?.bestPercentage || 0}%` }}
                  />
                </div>
                <div className="stat-bottom-row">
                  <span className="stat-pct">
                    {module2GradeSummary.homework?.bestPercentage || 0}% Score ({module2GradeSummary.homework?.attemptsCount || 0} attempts)
                  </span>
                  <Link
                    to={`/learn/${courseSlug}/module/2/lesson/module-2-homework`}
                    className="btn btn-secondary btn-sm"
                  >
                    {module2GradeSummary.homework?.attemptsCount > 0 ? 'Retry Homework →' : 'Start Homework →'}
                  </Link>
                </div>
              </div>

              {/* Coding Quiz Card */}
              <div className="assessment-stat-card">
                <div className="stat-card-top">
                  <span className="stat-type">CODING QUIZ (60%)</span>
                  <span className="stat-marks">
                    Best: <strong>{module2GradeSummary.quiz?.bestScore || 0} / 20</strong>
                  </span>
                </div>
                <h4 className="stat-title">Module 2 Final Coding Quiz</h4>
                <p className="stat-desc">
                  6 integrated problems evaluating types, arithmetic, string operations, relational and logical logic.
                </p>
                <div className="stat-progress-bar">
                  <div
                    className="stat-fill"
                    style={{ width: `${module2GradeSummary.quiz?.bestPercentage || 0}%` }}
                  />
                </div>
                <div className="stat-bottom-row">
                  <span className="stat-pct">
                    {module2GradeSummary.quiz?.bestPercentage || 0}% Score ({module2GradeSummary.quiz?.attemptsCount || 0} attempts)
                  </span>
                  <Link
                    to={`/learn/${courseSlug}/module/2/lesson/module-2-coding-quiz`}
                    className="btn btn-secondary btn-sm"
                  >
                    {module2GradeSummary.quiz?.attemptsCount > 0 ? 'Retry Quiz →' : 'Start Quiz →'}
                  </Link>
                </div>
              </div>

              {/* Interactive Practice Lab Card */}
              <div className="assessment-stat-card practice-card">
                <div className="stat-card-top">
                  <span className="stat-type green">UNGRADED PRACTICE LAB</span>
                  <span className="stat-marks green">9 Practice Sections</span>
                </div>
                <h4 className="stat-title">Module 2 Practice Notebook</h4>
                <p className="stat-desc">
                  Interactive Pyodide notebook covering all lesson concepts with executable examples and designated student answer cells.
                </p>
                <div className="stat-actions-group">
                  <a
                    href={`/lite/notebooks/index.html?path=module-2-practice.ipynb${user?.is_staff ? '&admin=1' : '&admin=0'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    ↗ Open Practice Lab
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleResetPractice}
                    title="Restore clean master template"
                  >
                    ↺ Reset Notebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lessons List Section */}
      <section className="selected-module-panel" style={{ marginTop: '1.5rem' }}>
        <div className="selected-module-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span className="selected-module-pre">SYLLABUS & SCHEDULE</span>
            <h2 className="selected-module-heading" style={{ fontSize: '1.4rem' }}>
              Existing Lessons ({lessons.length})
            </h2>
            <p className="selected-module-description">
              Click on any lesson below to begin reading theory, inspecting code examples, and running interactive exercises.
            </p>
          </div>
        </div>

        {lessons.length > 0 ? (
          <div className="dashboard-lessons-list">
            {lessons.map((lesson, idx) => (
              <Link
                key={lesson._id || idx}
                to={`/learn/${courseSlug}/module/${modNum}/lesson/${lesson.slug}`}
                className={`dashboard-lesson-card ${lesson.completed ? 'lesson-card-completed' : ''}`}
              >
                <div className="lesson-card-left">
                  <span className={`lesson-card-num ${lesson.completed ? 'num-completed' : ''}`}>
                    {lesson.completed ? '✓' : `0${lesson.lessonNumber || idx + 1}`}
                  </span>
                  <div className="lesson-card-info">
                    <h3 className="lesson-card-title">{lesson.title}</h3>
                    <span className="lesson-card-meta">
                      Lesson {lesson.lessonNumber || idx + 1} &bull; ~{lesson.estimatedMinutes || 10} mins read
                    </span>
                  </div>
                </div>

                <div className="lesson-card-right">
                  <span className={`lesson-state-pill ${lesson.completed ? 'state-done' : 'state-todo'}`}>
                    {lesson.completed ? 'Completed' : 'Start Lesson →'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            <p>Lessons for Module {modNum} are currently being finalized.</p>
          </div>
        )}
      </section>

      {/* Module Switcher Footer */}
      <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-light)' }}>
        {modNum > 1 ? (
          <Link
            to={`/learn/${courseSlug}/module/${modNum - 1}`}
            className="btn btn-secondary"
          >
            ← Previous: Module 0{modNum - 1}
          </Link>
        ) : (
          <div />
        )}

        <Link
          to={`/learn/${courseSlug}`}
          className="btn btn-outline"
        >
          View All Modules Dashboard
        </Link>

        {modNum < 3 ? (
          <Link
            to={`/learn/${courseSlug}/module/${modNum + 1}`}
            className="btn btn-secondary"
          >
            Next: Module 0{modNum + 1} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
