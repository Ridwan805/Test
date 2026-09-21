import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

/**
 * =======================================================================
 * HERO CAROUSEL COMPONENT
 * =======================================================================
 * HOW TO REPLACE CAROUSEL IMAGES:
 * 1. Add your 3 high-resolution hero images to `src/assets/`
 *    (e.g., `src/assets/hero-slide-1.jpg`, `hero-slide-2.jpg`, `hero-slide-3.jpg`)
 * 2. Import them at the top of this file:
 *      import slideImage1 from '../../assets/hero-slide-1.jpg';
 *      import slideImage2 from '../../assets/hero-slide-2.jpg';
 *      import slideImage3 from '../../assets/hero-slide-3.jpg';
 * 3. Set the `image` property in the `DEFAULT_SLIDES` array below:
 *      image: slideImage1,
 * 
 * If `image` is null, an elegant, academic vector background is used as fallback.
 * =======================================================================
 */

const DEFAULT_SLIDES = [
  {
    id: 1,
    eyebrow: 'ECOINTUITION ACADEMY',
    title: 'Rigorous Learning.\nIntuitive Understanding.',
    description:
      'Explore interactive courses designed to make complex ideas easier to understand through intuition, visualization, derivation, and practice.',
    primaryCta: { label: 'Explore Courses', to: '/courses' },
    secondaryCta: { label: 'Explore Bootcamp', to: '/bootcamp' },
    // Replace with your imported image, e.g. slideImage1
    image: null,
    alt: 'Academic data visualization and mathematics lecture',
    theme: 'navy-mathematics'
  },
  {
    id: 2,
    eyebrow: 'ECOINTUITION ACADEMY',
    title: 'From First Principles\nto Practical Insights.',
    description:
      'Master statistics, machine learning, and quantitative economics through guided mathematical derivations and dynamic real-time models.',
    primaryCta: { label: 'Explore Courses', to: '/courses' },
    secondaryCta: { label: 'Explore Bootcamp', to: '/bootcamp' },
    // Replace with your imported image, e.g. slideImage2
    image: null,
    alt: 'Statistical computing, econometrics and algorithmic thinking',
    theme: 'deep-econometrics'
  },
  {
    id: 3,
    eyebrow: 'ECOINTUITION ACADEMY',
    title: 'Interactive Foundations,\nBuilt to Last.',
    description:
      'Step beyond passive memorization. Interact with equations, test boundary conditions, and build lasting conceptual clarity.',
    primaryCta: { label: 'Explore Courses', to: '/courses' },
    secondaryCta: { label: 'Learn About Us', to: '/about' },
    // Replace with your imported image, e.g. slideImage3
    image: null,
    alt: 'Interactive scientific simulations and intuitive problem solving',
    theme: 'analytical-modeling'
  }
];

export default function HeroCarousel({ slides = DEFAULT_SLIDES }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = slides.length;
  
  // Touch coordinates for swipe gesture detection
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const timerRef = useRef(null);
  const carouselRef = useRef(null);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (index) => {
    setCurrent(index);
  };

  // Timer effect: changes slide every 5000ms unless paused or unmounted
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide, current]);

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance in pixels
    if (diff > threshold) {
      nextSlide();
    } else if (diff < -threshold) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      ref={carouselRef}
      className="hero-carousel"
      aria-label="EcoIntuition Academy Hero Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      <div className="carousel-track">
        {slides.map((slide, index) => {
          const isActive = index === current;
          return (
            <div
              key={slide.id}
              className={`carousel-slide ${isActive ? 'is-active' : ''}`}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${total}`}
            >
              {/* Background Visual Layer */}
              <div className="carousel-bg-container">
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt={slide.alt || ''}
                    className="carousel-img"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                ) : (
                  /* High-end Academic Mathematical SVG & CSS Fallback Canvas */
                  <div className={`carousel-placeholder-bg theme-${slide.theme}`}>
                    <svg
                      className="carousel-bg-pattern"
                      viewBox="0 0 1200 650"
                      preserveAspectRatio="xMidYMid slice"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={`grad-${slide.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0E1E33" stopOpacity="0.95" />
                          <stop offset="60%" stopColor="#173052" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#0B1626" stopOpacity="0.92" />
                        </linearGradient>
                        <pattern id={`grid-${slide.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(212, 207, 197, 0.07)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#grad-${slide.id})`} />
                      <rect width="100%" height="100%" fill={`url(#grid-${slide.id})`} />

                      {/* Dynamic mathematical vector paths per slide theme */}
                      {slide.theme === 'navy-mathematics' && (
                        <g opacity="0.35" stroke="var(--color-accent)" strokeWidth="1.5" fill="none">
                          <circle cx="850" cy="325" r="220" strokeDasharray="6 6" />
                          <circle cx="850" cy="325" r="140" stroke="rgba(255,255,255,0.2)" />
                          <line x1="600" y1="325" x2="1100" y2="325" stroke="rgba(212,207,197,0.3)" />
                          <line x1="850" y1="75" x2="850" y2="575" stroke="rgba(212,207,197,0.3)" />
                          <path d="M 650 480 Q 850 150 1050 480" stroke="var(--color-accent)" strokeWidth="2.5" />
                          <circle cx="850" cy="235" r="6" fill="var(--color-accent)" />
                          <circle cx="950" cy="360" r="5" fill="#ffffff" />
                        </g>
                      )}

                      {slide.theme === 'deep-econometrics' && (
                        <g opacity="0.35" stroke="rgba(212,207,197,0.35)" strokeWidth="1.5" fill="none">
                          <path d="M 600 500 L 720 400 L 820 440 L 940 280 L 1050 320 L 1150 160" stroke="var(--color-accent)" strokeWidth="2.5" />
                          <path d="M 600 530 L 720 450 L 820 490 L 940 370 L 1050 400 L 1150 250" stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                          <circle cx="940" cy="280" r="7" fill="var(--color-accent)" />
                          <circle cx="1150" cy="160" r="7" fill="#ffffff" />
                          <line x1="600" y1="520" x2="1150" y2="520" stroke="rgba(212,207,197,0.4)" strokeWidth="1.5" />
                        </g>
                      )}

                      {slide.theme === 'analytical-modeling' && (
                        <g opacity="0.35" stroke="var(--color-accent)" strokeWidth="1.5" fill="none">
                          <ellipse cx="880" cy="320" rx="240" ry="120" transform="rotate(-20 880 320)" strokeDasharray="4 4" />
                          <ellipse cx="880" cy="320" rx="160" ry="80" transform="rotate(25 880 320)" stroke="rgba(255,255,255,0.25)" />
                          <circle cx="880" cy="320" r="10" fill="var(--color-accent)" />
                          <circle cx="750" cy="270" r="6" fill="#ffffff" />
                          <circle cx="1010" cy="370" r="5" fill="var(--color-accent)" />
                        </g>
                      )}
                    </svg>
                  </div>
                )}

                {/* Dark Navy / Indigo Gradient Vignette Overlay for Crisp Readability */}
                <div className="carousel-overlay" />
              </div>

              {/* Text & Action Layer */}
              <div className="container carousel-content-wrapper">
                <div className="carousel-content">
                  <span className="carousel-eyebrow">{slide.eyebrow}</span>
                  <h1 className="carousel-heading">
                    {slide.title.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < slide.title.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h1>
                  <p className="carousel-desc">{slide.description}</p>
                  <div className="carousel-cta-group">
                    {slide.primaryCta && (
                      <Link to={slide.primaryCta.to} className="btn btn-primary carousel-btn-primary">
                        {slide.primaryCta.label}
                      </Link>
                    )}
                    {slide.secondaryCta && (
                      <Link to={slide.secondaryCta.to} className="btn btn-secondary carousel-btn-secondary">
                        {slide.secondaryCta.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrow Controls */}
      <button
        type="button"
        className="carousel-arrow carousel-arrow-prev"
        onClick={prevSlide}
        aria-label="Previous slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        className="carousel-arrow carousel-arrow-next"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Navigation Dots Indicator */}
      <div className="carousel-dots" role="tablist" aria-label="Hero Carousel Navigation">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === current}
            aria-label={`Go to slide ${index + 1}`}
            className={`carousel-dot ${index === current ? 'is-active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
