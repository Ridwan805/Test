import React from 'react';
import { Link } from 'react-router-dom';

export default function Bootcamp() {
  return (
    <div className="placeholder-page container">
      <span className="section-pretitle">COHORT-BASED INTENSIVES</span>
      <h1>Bootcamp</h1>
      <p>
        Content is currently under development. EcoIntuition Academy bootcamps will offer immersive, instructor-led quantitative training and live code reviews.
      </p>
      <Link to="/" className="btn btn-secondary">Return Home</Link>
    </div>
  );
}
