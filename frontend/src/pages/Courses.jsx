import React from 'react';

export default function Courses() {
  // Render exactly 7 empty placeholder cards
  const placeholders = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="courses-page container">
      <div className="courses-header">
        <span className="section-pretitle">Curriculum</span>
        <h1 className="section-title">Academic Catalog</h1>
        <p style={{ maxWidth: '600px', margin: '1rem auto 0 auto', color: 'var(--color-muted)' }}>
          EcoIntuition Academy is designing a comprehensive suite of rigorous courses. Below is our roadmap of upcoming curriculum blocks.
        </p>
      </div>

      <div className="courses-grid">
        {placeholders.map((idx) => (
          <div key={idx} className="course-card-placeholder">
            <span className="badge-coming-soon">Coming Soon</span>
            <h3 className="placeholder-title">Course title to be announced</h3>
            <p className="placeholder-text">
              Detailed curriculum specifications and interactive environments are currently under development.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
