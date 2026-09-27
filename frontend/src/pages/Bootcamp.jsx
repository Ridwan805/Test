import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Reliable fallback bootcamps for immediate rendering
const defaultBootcamps = [
  {
    title: 'Introduction to Python',
    slug: 'intro-to-python',
    level: 'Beginner',
    price: 0,
    courseType: 'bootcamp',
    duration: '6 Weeks',
    totalLessons: 5,
    tagline: 'A comprehensive, cohort-based foundational bootcamp mastering Python programming from first principles.',
    topics: ['Syntax & Logic', 'Data Structures', 'Code Labs', 'Scripting Projects'],
    techIcon: 'PY',
    techClass: 'tech-python'
  },
  {
    title: 'Introduction to R',
    slug: 'intro-to-r',
    level: 'Beginner',
    price: 0,
    courseType: 'bootcamp',
    duration: '6 Weeks',
    totalLessons: 5,
    tagline: 'Master statistical computing, exploratory data analysis, and tidyverse workflows.',
    topics: ['Statistical Computing', 'ggplot2 Visualization', 'tidyverse & dplyr', 'Reproducible Analysis'],
    techIcon: 'R',
    techClass: 'tech-r'
  }
];

export default function Bootcamp() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { courseSlug } = useParams();

  const [bootcamps, setBootcamps] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  // If a specific bootcamp slug was accessed directly via /bootcamp/:courseSlug, redirect to its learning space
  useEffect(() => {
    if (courseSlug) {
      navigate(`/learn/${courseSlug}`, { replace: true });
    }
  }, [courseSlug, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadBootcamps() {
      try {
        const res = await fetch('/api/bootcamps');
        let data = [];
        if (res.ok) {
          data = await res.json();
        }

        if (!data || data.length === 0) {
          data = defaultBootcamps;
        } else {
          // Merge metadata like topics and icons
          data = data.map((b) => {
            const isR = b.slug === 'intro-to-r' || (b.title && b.title.toLowerCase().endsWith(' r'));
            return {
              ...b,
              topics: isR
                ? ['Statistical Computing', 'ggplot2 Visualization', 'tidyverse & dplyr', 'Reproducible Analysis']
                : ['Syntax & Logic', 'Data Structures', 'Code Labs', 'Scripting Projects'],
              techIcon: isR ? 'R' : 'PY',
              techClass: isR ? 'tech-r' : 'tech-python'
            };
          });
        }

        if (isMounted) {
          setBootcamps(data);
          setLoading(false);
        }

        // If user is authenticated, fetch progress for each bootcamp
        const token = localStorage.getItem('access_token');
        if (token && data.length > 0) {
          const progressEntries = {};
          await Promise.all(
            data.map(async (b) => {
              try {
                const progRes = await fetch(`/api/courses/${b.slug}/progress`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (progRes.ok) {
                  const progData = await progRes.json();
                  progressEntries[b.slug] = progData;
                }
              } catch (e) {
                // Ignore individual progress errors
              }
            })
          );
          if (isMounted) {
            setProgressMap(progressEntries);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch bootcamps list, using default:', err);
        if (isMounted) {
          setBootcamps(defaultBootcamps);
          setLoading(false);
        }
      }
    }

    loadBootcamps();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleActionClick = (bootcamp) => {
    if (user) {
      navigate(`/learn/${bootcamp.slug}`);
    } else {
      navigate('/login', { state: { from: `/learn/${bootcamp.slug}` } });
    }
  };

  return (
    <div className="bootcamp-page container">
      {/* Header */}
      <header className="bootcamp-header">
        <span className="section-pretitle">COHORT-BASED INTENSIVES</span>
        <h1 className="section-title">Applied Bootcamps</h1>
        <p className="bootcamp-subtitle">
          Immersive, cohort-driven training programs blending rigorous theory, live code reviews, and practical applications. 100% free tuition for enrolled scholars.
        </p>
      </header>



      {/* Bootcamps Catalog Grid */}
      <div className="bootcamp-catalog-grid">
        {bootcamps.map((bootcamp) => {
          const prog = progressMap[bootcamp.slug];
          const hasStarted = prog && prog.hasStarted;
          const completedCount = prog?.completedLessons || 0;
          const totalCount = prog?.totalLessons || bootcamp.totalLessons || 5;
          const pct = prog?.percentage || 0;

          let btnText = 'Sign In to Enroll';
          if (user) {
            btnText = hasStarted ? 'Continue Learning →' : 'Start Learning →';
          }

          return (
            <div key={bootcamp.slug || bootcamp.id} className="bootcamp-card">
              {/* Card Top */}
              <div>
                <div className="bootcamp-card-top-bar">
                  <div className={`bootcamp-tech-icon ${bootcamp.techClass}`}>
                    {bootcamp.techIcon}
                  </div>
                  <div className="bootcamp-card-badges">
                    <span className="badge-cohort">BOOTCAMP</span>
                    <span className="badge-free">FREE</span>
                    <span className="badge-admissions">ADMISSIONS OPEN</span>
                  </div>
                </div>

                <h2 className="bootcamp-card-title">{bootcamp.title}</h2>
                <p className="bootcamp-card-tagline">{bootcamp.tagline}</p>

                {/* Focus Areas */}
                <div className="bootcamp-card-topics">
                  {bootcamp.topics?.map((topic, i) => (
                    <span key={i} className="topic-pill">
                      {topic}
                    </span>
                  ))}
                </div>

                {/* Meta Grid */}
                <div className="bootcamp-card-meta-grid">
                  <div className="bootcamp-meta-col">
                    <span className="meta-lbl">DURATION</span>
                    <span className="meta-val">{bootcamp.duration || '6 Weeks'}</span>
                  </div>
                  <div className="bootcamp-meta-col">
                    <span className="meta-lbl">LEVEL</span>
                    <span className="meta-val">{bootcamp.level || 'Beginner'}</span>
                  </div>
                  <div className="bootcamp-meta-col">
                    <span className="meta-lbl">TUITION</span>
                    <span className="meta-val text-accent">Free</span>
                  </div>
                </div>

                {/* Scholar Progress (if logged in and started) */}
                {user && hasStarted && (
                  <div className="bootcamp-card-progress">
                    <div className="prog-meta">
                      <span>Course Progress</span>
                      <span>
                        {completedCount} / {totalCount} Lessons ({pct}%)
                      </span>
                    </div>
                    <div className="dashboard-progress-track">
                      <div className="dashboard-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="bootcamp-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleActionClick(bootcamp)}
                >
                  {btnText}
                </button>
                <Link
                  to={`/learn/${bootcamp.slug}`}
                  className="btn btn-secondary"
                >
                  View Syllabus
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* The EcoIntuition Bootcamp Experience Section */}
      <section className="bootcamp-perks-section">
        <h3 className="sub-heading" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          The EcoIntuition Bootcamp Experience
        </h3>
        <p style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 2rem auto', color: 'var(--color-muted)' }}>
          Our cohort model is engineered to provide academic rigor without financial barriers.
        </p>

        <div className="perks-grid">
          <div className="perk-card">
            <div className="perk-icon">📚</div>
            <h4>100% Free Tuition</h4>
            <p>Every bootcamp is completely free for authenticated scholars. No credit card required.</p>
          </div>
          <div className="perk-card">
            <div className="perk-icon">⚡</div>
            <h4>Rigorous Applied Focus</h4>
            <p>Bridge intuition and execution with real datasets, reproducible scripts, and econometric rigor.</p>
          </div>
          <div className="perk-card">
            <div className="perk-icon">💻</div>
            <h4>Interactive Code Labs</h4>
            <p>Step-by-step interactive lessons with code execution snippets, best practice notes, and exercises.</p>
          </div>
          <div className="perk-card">
            <div className="perk-icon">📜</div>
            <h4>Verifiable Credentials</h4>
            <p>Receive a verified digital certificate of completion upon successfully finishing all modules.</p>
          </div>
        </div>
      </section>

      {/* Scholar Bottom Callout */}
      {!user && (
        <div className="bootcamp-cta-box" style={{ marginTop: '2rem' }}>
          <div className="cta-box-text">
            <h3>Begin Your Computational Journey</h3>
            <p>
              Create your free scholar account today to access full lesson content, interactive exercises, and track your progress across all bootcamps.
            </p>
          </div>
          <div className="cta-box-actions">
            <Link to="/signup" className="btn btn-primary btn-large">
              Create Free Account →
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
