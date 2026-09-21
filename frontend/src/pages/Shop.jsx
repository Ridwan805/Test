import React from 'react';
import { Link } from 'react-router-dom';

export default function Shop() {
  return (
    <div className="placeholder-page container">
      <span className="section-pretitle">ACADEMIC GEAR & RESOURCES</span>
      <h1>Shop</h1>
      <p>
        Content is currently under development. The EcoIntuition Shop will feature cheat sheet formula reference guides, academic research notebooks, and gear.
      </p>
      <Link to="/" className="btn btn-secondary">Return Home</Link>
    </div>
  );
}
