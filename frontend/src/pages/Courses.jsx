import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const defaultAcademicCourses = [
  {
    title: 'Econometrics & Causal Inference',
    slug: 'econometrics-causal-inference',
    tagline: 'Master empirical research, regression models, and counterfactual reasoning.',
    duration: '12 Weeks',
    level: 'Advanced / Graduate',
    format: 'Academic Lecture Track',
    modules: [
      { title: 'Linear Regression & Identification', order: 1 },
      { title: 'Instrumental Variables & Two-Stage Least Squares', order: 2 },
      { title: 'Difference-in-Differences & Synthetic Controls', order: 3 },
      { title: 'Regression Discontinuity Designs', order: 4 }
    ]
  },
  {
    title: 'Machine Learning for Financial Economics',
    slug: 'machine-learning-financial-economics',
    tagline: 'Predictive modeling, high-dimensional data, and quantitative asset pricing strategies.',
    duration: '10 Weeks',
    level: 'Advanced / Graduate',
    format: 'Academic Lecture Track',
    modules: [
      { title: 'Regularization & Lasso/Ridge in Finance', order: 1 },
      { title: 'Tree-Based Methods & Random Forests', order: 2 },
      { title: 'Neural Networks for Asset Pricing', order: 3 },
      { title: 'Portfolio Optimization & Algorithmic Execution', order: 4 }
    ]
  },
  {
    title: 'Microeconomic Theory & Mechanism Design',
    slug: 'microeconomic-theory-mechanism-design',
    tagline: 'Consumer behavior, general equilibrium, game theory, and market design.',
    duration: '12 Weeks',
    level: 'Graduate Foundations',
    format: 'Academic Lecture Track',
    modules: [
      { title: 'Consumer Preferences & Utility Maximization', order: 1 },
      { title: 'Game Theory & Nash Equilibrium', order: 2 },
      { title: 'Auction Design & Revenue Equivalence', order: 3 },
      { title: 'Two-Sided Matching Markets', order: 4 }
    ]
  }
];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCourses(data.length > 0 ? data : defaultAcademicCourses);
            setLoading(false);
          }
        } else if (isMounted) {
          setCourses(defaultAcademicCourses);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Could not fetch academic courses, using fallback:', err);
        if (isMounted) {
          setCourses(defaultAcademicCourses);
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const courseList = courses.length > 0 ? courses : defaultAcademicCourses;

  return (
    <div className="courses-page container">
      {/* Header */}
      <header className="courses-header">
        <span className="section-pretitle">ACADEMIC CURRICULUM</span>
        <h1 className="section-title">Academic Courses</h1>
        <p className="courses-subtitle">
          Rigorous foundational lecture tracks blending advanced economic theory, formal mathematical models, and empirical research methodologies.
        </p>
      </header>



      {/* Academic Courses Grid */}
      <div className="academic-catalog-grid">
        {courseList.map((course, idx) => (
          <div key={course.slug || idx} className="academic-course-card">
            <div>
              {/* Card Top */}
              <div className="academic-card-top-bar">
                <span className="badge-academic">ACADEMIC COURSE</span>
                <span className="badge-theory">THEORY & PROOFS</span>
              </div>

              <h2 className="academic-course-title">{course.title}</h2>
              <p className="academic-course-tagline">{course.tagline}</p>

              {/* Syllabus Preview */}
              {course.modules && course.modules.length > 0 && (
                <div className="academic-syllabus-preview">
                  <div className="syllabus-preview-header">Core Academic Modules</div>
                  <ul className="syllabus-module-tree">
                    {course.modules.slice(0, 4).map((mod, mIdx) => (
                      <li key={mIdx} className="syllabus-tree-item">
                        <span className="tree-num">0{mod.order || mIdx + 1}</span>
                        <span>{mod.title.replace(/^Module \d+:\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meta Grid */}
              <div className="bootcamp-card-meta-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="bootcamp-meta-col">
                  <span className="meta-lbl">FORMAT</span>
                  <span className="meta-val">{course.format || 'Semester Track'}</span>
                </div>
                <div className="bootcamp-meta-col">
                  <span className="meta-lbl">LEVEL</span>
                  <span className="meta-val">{course.level || 'Graduate'}</span>
                </div>
                <div className="bootcamp-meta-col">
                  <span className="meta-lbl">MODULES</span>
                  <span className="meta-val">{course.modules?.length || 4} Modules</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="academic-card-actions">
              <Link to="/signup" className="btn btn-primary">
                Enroll in Track
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => alert(`Syllabus for ${course.title} is available to enrolled scholars.`)}
              >
                View Syllabus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
