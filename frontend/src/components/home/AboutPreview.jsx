import React from 'react';
import { Link } from 'react-router-dom';

/**
 * =======================================================================
 * ABOUT PREVIEW COMPONENT
 * =======================================================================
 * HOW TO ADD YOUR ABOUT IMAGE:
 * 1. Place your about image in `src/assets/` (e.g. `src/assets/about-preview.jpg`)
 * 2. Import it at the top:
 *      import aboutImg from '../../assets/about-preview.jpg';
 * 3. Replace the `ABOUT_IMAGE` variable below with your imported asset:
 *      const ABOUT_IMAGE = aboutImg;
 * 
 * If `ABOUT_IMAGE` is null, an elegant academic vector diagram is displayed.
 * =======================================================================
 */

// Replace with official EcoIntuition Academy About image (e.g., import aboutImage from '../../assets/about.jpg')
const ABOUT_IMAGE = null;

export default function AboutPreview() {
  return (
    <section className="about-preview-section" aria-labelledby="about-preview-heading">
      <div className="container about-preview-container">
        {/* Left Column: Academic Visual / Image */}
        <div className="about-visual-wrapper">
          {ABOUT_IMAGE ? (
            <img
              src={ABOUT_IMAGE}
              alt="EcoIntuition Academy interactive seminar"
              className="about-image"
              loading="lazy"
            />
          ) : (
            /* Clean academic placeholder container */
            <div className="about-placeholder-card" role="img" aria-label="Interactive pedagogical model visualization">
              <svg
                viewBox="0 0 460 380"
                className="about-placeholder-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="aboutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FAF8F5" />
                    <stop offset="100%" stopColor="#EFECE3" />
                  </linearGradient>
                </defs>
                <rect width="460" height="380" rx="8" fill="url(#aboutGrad)" stroke="var(--color-border)" strokeWidth="1" />

                {/* Mathematical / Intuition Bridge Graphic */}
                <g transform="translate(30, 40)">
                  {/* Axis lines */}
                  <line x1="20" y1="280" x2="380" y2="280" stroke="var(--color-border)" strokeWidth="1.5" />
                  <line x1="20" y1="30" x2="20" y2="280" stroke="var(--color-border)" strokeWidth="1.5" />

                  {/* Grid hints */}
                  <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(212,207,197,0.4)" strokeDasharray="4 4" />
                  <line x1="20" y1="120" x2="380" y2="120" stroke="rgba(212,207,197,0.4)" strokeDasharray="4 4" />

                  {/* Sigmoid / Learning curve */}
                  <path
                    d="M 20 270 C 120 270, 180 250, 210 160 C 240 70, 300 45, 380 40"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="3"
                  />

                  {/* Intuition tangent vector */}
                  <line x1="130" y1="250" x2="290" y2="70" stroke="var(--color-accent)" strokeWidth="1.75" strokeDasharray="5 5" />

                  {/* Key concept focal points */}
                  <circle cx="210" cy="160" r="7" fill="var(--color-accent)" />
                  <circle cx="210" cy="160" r="14" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />

                  {/* Academic Annotations */}
                  <text x="225" y="155" fontFamily="var(--font-mono)" fontSize="12" fill="var(--color-text)" fontWeight="600">
                    Inflection: Intuition Pivot
                  </text>
                  <text x="35" y="55" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-muted)">
                    Conceptual Mastery →
                  </text>
                  <text x="250" y="270" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-muted)">
                    Time / Active Practice →
                  </text>

                  {/* Small Formula Marker */}
                  <rect x="25" y="225" width="125" height="32" rx="4" fill="var(--color-white)" stroke="var(--color-border)" />
                  <text x="35" y="246" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-brand)">
                    E[Insight] = f(Rigor)
                  </text>
                </g>
              </svg>
              <span className="about-placeholder-caption">
                Rigorous Theory × Dynamic Intuition
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Academic Content */}
        <div className="about-content-wrapper">
          <span className="section-pretitle">ABOUT ECOINTUITION</span>
          <h2 className="section-title about-heading">
            Learning Complex Ideas Through Intuition
          </h2>
          <p className="about-text">
            EcoIntuition Academy is an interactive learning platform built around a simple idea: difficult concepts become easier when mathematical rigor is combined with intuition, visualization, examples, and experimentation.
          </p>
          <p className="about-text">
            Our courses guide learners from the underlying idea to formal definitions, equations, derivations, interactive demonstrations, and practical applications.
          </p>
          <div className="about-cta-wrapper">
            <Link to="/about" className="about-link-cta">
              <span>Learn More</span>
              <span className="about-link-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
