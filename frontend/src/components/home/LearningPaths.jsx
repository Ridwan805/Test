import React from 'react';
import { Link } from 'react-router-dom';

export default function LearningPaths() {
  return (
    <section className="learning-paths-section" aria-labelledby="paths-heading">
      <div className="container">
        <div className="section-title-wrapper learning-paths-header">
          <span className="section-pretitle">START LEARNING</span>
          <h2 id="paths-heading" className="section-title">
            Choose How You Want to Learn
          </h2>
          <p className="section-subtitle">
            Explore structured academic courses or follow focused bootcamp pathways built around hands-on learning.
          </p>
        </div>

        <div className="learning-paths-grid">
          {/* Card 1: Courses */}
          <article className="learning-path-card" aria-labelledby="course-card-heading">
            <div className="card-top-indicator">
              <span className="card-badge">COURSES</span>
            </div>
            
            <div className="card-body">
              <h3 id="course-card-heading" className="card-heading">
                Explore Our Courses
              </h3>

              <div className="card-topics" aria-label="Course Topics">
                <span className="topic-tag">Statistics</span>
                <span className="topic-tag">Machine Learning</span>
                <span className="topic-tag">Economics</span>
                <span className="topic-tag">Econometrics</span>
              </div>
            </div>

            <div className="card-footer">
              <Link to="/courses" className="card-cta-btn">
                <span>Explore Courses</span>
                <span className="card-cta-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>

          {/* Card 2: Bootcamp */}
          <article className="learning-path-card" aria-labelledby="bootcamp-card-heading">
            <div className="card-top-indicator">
              <span className="card-badge">BOOTCAMP</span>
            </div>

            <div className="card-body">
              <h3 id="bootcamp-card-heading" className="card-heading">
                Learn Through Guided Practice
              </h3>

              <div className="card-topics" aria-label="Bootcamp Focus Areas">
                <span className="topic-tag">Practical Labs</span>
                <span className="topic-tag">Applied Modeling</span>
                <span className="topic-tag">Guided Derivations</span>
              </div>
            </div>

            <div className="card-footer">
              <Link to="/bootcamp" className="card-cta-btn">
                <span>Explore Bootcamp</span>
                <span className="card-cta-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
