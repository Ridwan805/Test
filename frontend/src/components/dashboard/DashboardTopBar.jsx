import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function DashboardTopBar({ user, onToggleSidebar }) {
  const { logout } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstName = user?.firstName || user?.first_name || user?.email?.split('@')[0] || 'Scholar';
  const initials = user?.initials || (user?.first_name ? user.first_name[0].toUpperCase() : 'SC');

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="topbar-mobile-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="topbar-greeting-crumb">
          <span className="crumb-academy">EcoIntuition Academy</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Student Dashboard</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notification Bell */}
        <div className="topbar-notif-wrapper" ref={notifRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            title="Notifications"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notif-pulse-dot" />
          </button>

          {notificationsOpen && (
            <div className="topbar-notif-dropdown">
              <div className="notif-dropdown-header">
                <strong>Notifications</strong>
                <span className="notif-badge">1 New</span>
              </div>
              <ul className="notif-list">
                <li className="notif-item">
                  <span className="notif-icon-circle green">✓</span>
                  <div className="notif-text">
                    <p className="notif-title">Module 3 Coding Quiz Released</p>
                    <span className="notif-time">Control Flow & Loops is now active</span>
                  </div>
                </li>
                <li className="notif-item">
                  <span className="notif-icon-circle gold">★</span>
                  <div className="notif-text">
                    <p className="notif-title">Welcome to EcoIntuition Academy</p>
                    <span className="notif-time">Your scholar account is fully verified</span>
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Student Avatar / Initials & Name Dropdown */}
        <div className="topbar-user-menu-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="topbar-user-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-label="User Menu"
          >
            <div className="student-avatar-pill">
              {initials}
            </div>
            <span className="student-first-name">{firstName}</span>
            <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </button>

          {dropdownOpen && (
            <div className="topbar-user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">{initials}</div>
                <div className="user-dropdown-info">
                  <strong className="user-fullname">{user?.name || firstName}</strong>
                  <span className="user-email">{user?.email}</span>
                  <span className="user-status-pill">Scholar</span>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <nav className="user-dropdown-links">
                <Link
                  to="/courses"
                  className="user-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span>My Courses</span>
                </Link>
                <Link
                  to="/bootcamp"
                  className="user-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span>Active Bootcamp</span>
                </Link>
                <Link
                  to="/"
                  className="user-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span>Home Page</span>
                </Link>
              </nav>

              <div className="user-dropdown-divider" />

              <div className="user-dropdown-footer">
                <button
                  type="button"
                  className="btn-dropdown-logout"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                >
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
