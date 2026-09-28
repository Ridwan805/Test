import React, { useContext, useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  // Handle scroll detection for smooth transition between transparent and solid states
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial position
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  // Determine navbar appearance classes
  const isTransparent = isHome && !isScrolled && !mobileMenuOpen;
  const navbarClasses = [
    'navbar',
    isHome ? 'navbar-hero-mode' : 'navbar-standard',
    isTransparent ? 'is-transparent' : 'is-solid',
    mobileMenuOpen ? 'mobile-open' : ''
  ].filter(Boolean).join(' ');

  return (
    <header className={navbarClasses}>
      <div className="container navbar-container">
        <div className="navbar-brand-row">
          <Link to="/" className="brand" onClick={closeMenu}>
            <div className="brand-logo">E</div>
            <span className="brand-name">EcoIntuition Academy</span>
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Links and Auth Group */}
        <div className={`navbar-collapse ${mobileMenuOpen ? 'is-open' : ''}`}>
          <nav className="nav-links" aria-label="Main Navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Home
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Courses
            </NavLink>
            <NavLink
              to="/bootcamp"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Bootcamp
            </NavLink>
            <NavLink
              to="/databank"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Databank
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Shop
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              About Us
            </NavLink>
            {user && (
              <NavLink
                to={user?.is_staff ? '/admin' : '/dashboard'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={closeMenu}
              >
                {user?.is_staff ? '👑 Admin Console' : 'Dashboard'}
              </NavLink>
            )}
          </nav>

          <div className="auth-buttons">
            {user ? (
              <>
                <Link
                  to={user?.is_staff ? '/admin' : '/dashboard'}
                  className={`btn ${user?.is_staff ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={closeMenu}
                >
                  {user?.is_staff ? '👑 Admin Console' : 'Dashboard'}
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-text" onClick={closeMenu}>
                  Log In
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm" onClick={closeMenu}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
