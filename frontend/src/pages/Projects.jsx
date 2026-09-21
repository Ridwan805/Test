import React from 'react';
import { Link } from 'react-router-dom';

export default function Projects() {
  return (
    <div className="placeholder-page container">
      <span className="section-pretitle">OPEN SOURCE INITIATIVES</span>
      <h1>Our Projects</h1>
      <p>
        Content is currently under development. Here we will showcase interactive widgets, open education frameworks, and dynamic derivation engines built by the EcoIntuition Academy community.
      </p>
      <Link to="/" className="btn btn-secondary">Return Home</Link>
    </div>
  );
}
