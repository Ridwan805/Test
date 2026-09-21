import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand">
            <h3 className="footer-brand-title">EcoIntuition Academy</h3>
            <p className="footer-tagline">
              Rigorous, interactive online courses combining deep mathematical foundations with intuitive visualization and guided practice.
            </p>
          </div>
          
          {/* Explore Col */}
          <div>
            <h4 className="footer-links-title">Explore</h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/courses" className="footer-link">Courses</Link>
              </li>
              <li>
                <Link to="/bootcamp" className="footer-link">Bootcamp</Link>
              </li>
              <li>
                <Link to="/databank" className="footer-link">Databank</Link>
              </li>
              <li>
                <Link to="/shop" className="footer-link">Shop</Link>
              </li>
            </ul>
          </div>

          {/* Academy Col */}
          <div>
            <h4 className="footer-links-title">Academy</h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/" className="footer-link">Home</Link>
              </li>
              <li>
                <Link to="/about" className="footer-link">About Us</Link>
              </li>
              <li>
                <Link to="/projects" className="footer-link">Projects</Link>
              </li>
            </ul>
          </div>
          
          {/* Account Col */}
          <div>
            <h4 className="footer-links-title">Account</h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/login" className="footer-link">Log In</Link>
              </li>
              <li>
                <Link to="/signup" className="footer-link">Sign Up</Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} EcoIntuition Academy. All rights reserved.</p>
          <p className="footer-subtext">Mathematical Rigor &bull; Intuitive Foundations</p>
        </div>
      </div>
    </footer>
  );
}
