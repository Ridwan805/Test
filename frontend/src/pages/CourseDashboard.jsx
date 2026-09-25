import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function CourseDashboard() {
  const { courseSlug = 'intro-to-python' } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`/api/courses/${courseSlug}/modules`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.status === 401) {
          navigate('/login', { state: { from: `/learn/${courseSlug}` } });
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

  const { course, curriculum = [], totalLessons = 5, completedLessons = 0, progressPercentage = 0 } = curriculumData;
  const module1 = curriculum[0] || { title: 'Getting Started with Python', lessons: [] };

  // Determine next lesson to start/continue
  const nextLesson = module1.lessons?.find((l) => !l.completed) || module1.lessons?.[0];
  const nextLessonUrl = nextLesson
    ? `/learn/${course.slug}/module/1/lesson/${nextLesson.slug}`
    : `/learn/${course.slug}/module/1/lesson/${module1.lessons?.[0]?.slug || 'what-is-python'}`;

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
            <span className="pill-badge pill-type">BOOTCAMP</span>
            <span className="pill-badge pill-level">{course.level || 'Beginner'}</span>
            <span className="pill-badge pill-free">100% FREE SCHOLAR ACCESS</span>
          </div>
          <h1 className="dashboard-course-title">{course.title}</h1>
          <p className="dashboard-user-greeting">
            Welcome back, <strong>{user?.first_name || user?.email}</strong>. Track your progress across Module 1 below.
          </p>
        </div>

        {/* Progress Bar & Primary Action */}
        <div className="dashboard-progress-section">
          <div className="progress-info-row">
            <span className="progress-label">Course Progress</span>
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

      {/* Module 1 Curriculum Breakdown */}
      <div className="dashboard-modules-section">
        <div className="dashboard-section-header">
          <div>
            <span className="section-pretitle">CURRENT SYLLABUS</span>
            <h2 className="dashboard-module-heading">Module 1 — {module1.title || 'Getting Started with Python'}</h2>
          </div>
          <span className="module-status-badge">
            {completedLessons === totalLessons && totalLessons > 0 ? '✓ Module Completed' : 'In Progress'}
          </span>
        </div>

        <div className="dashboard-lessons-list">
          {module1.lessons?.map((lesson, idx) => (
            <Link
              key={lesson._id || idx}
              to={`/learn/${course.slug}/module/1/lesson/${lesson.slug}`}
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
                  {lesson.completed ? 'Completed' : 'Start Lesson'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
