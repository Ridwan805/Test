import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="placeholder-page container">
      <span className="section-pretitle">PEDAGOGICAL MISSION</span>
      <h1>Pedagogy & Rigor</h1>
      <p>
        Content is currently under development. EcoIntuition Academy is committed to making complex mathematical, economic, and scientific concepts intuitive through interactive, hands-on visual experiences.
      </p>
      <Link to="/" className="btn btn-secondary">Return Home</Link>
    </div>
  );
}
