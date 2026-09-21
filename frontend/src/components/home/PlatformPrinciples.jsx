import React from 'react';

const PRINCIPLES = [
  {
    number: '01',
    title: 'Build Intuition',
    description: 'Understand the idea before memorizing the formula.'
  },
  {
    number: '02',
    title: 'See the Mathematics',
    description: 'Follow definitions, equations, assumptions, and derivations step by step.'
  },
  {
    number: '03',
    title: 'Learn Interactively',
    description: 'Use visualizations, examples, exercises, and experimentation to reinforce understanding.'
  }
];

export default function PlatformPrinciples() {
  return (
    <section className="principles-section" aria-labelledby="principles-heading">
      <div className="container">
        <div className="principles-header">
          <span className="section-pretitle">PEDAGOGICAL METHOD</span>
          <h2 id="principles-heading" className="section-title principles-title">
            Designed for Deeper Insight
          </h2>
        </div>

        <div className="principles-grid">
          {PRINCIPLES.map((item) => (
            <article key={item.number} className="principle-card">
              <span className="principle-number" aria-hidden="true">
                {item.number}
              </span>
              <h3 className="principle-card-title">{item.title}</h3>
              <p className="principle-card-desc">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
