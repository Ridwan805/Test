import React from 'react';
import { Link } from 'react-router-dom';

export default function Databank() {
  return (
    <div className="placeholder-page container">
      <span className="section-pretitle">RESEARCH REPOSITORY</span>
      <h1>Databank</h1>
      <p>
        Content is currently under development. The EcoIntuition Databank will feature open-access economic time-series, panel datasets, and survey microdata.
      </p>
      <Link to="/" className="btn btn-secondary">Return Home</Link>
    </div>
  );
}
