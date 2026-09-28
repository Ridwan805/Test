import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export default function DashboardSidebar({ mobileOpen, onClose, onOpenInvoices, onOpenSettings }) {
  const isAdmin = localStorage.getItem('user_is_staff') === 'true';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="dashboard-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar ${mobileOpen ? 'mobile-visible' : ''}`}>
        <div className="sidebar-top-brand">
          <Link to="/" className="sidebar-brand-link" onClick={onClose}>
            <div className="brand-logo">E</div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">EcoIntuition</span>
              <span className="sidebar-brand-sub">ACADEMY</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <div className="sidebar-nav-container">
          <span className="sidebar-section-label">
            {isAdmin ? 'ADMINISTRATIVE WORKSPACE' : 'LEARNING WORKSPACE'}
          </span>
          <nav className="sidebar-nav-list" aria-label="Navigation">
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <span className="nav-icon" style={{ fontSize: '1.1rem' }}>👑</span>
                <span>Admin Console</span>
              </NavLink>
            ) : (
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                <span>Dashboard</span>
              </NavLink>
            )}

            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Courses</span>
            </NavLink>

            <NavLink
              to="/bootcamp"
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Bootcamp</span>
            </NavLink>

            <button
              type="button"
              className="sidebar-nav-item btn-nav-action"
              onClick={() => {
                onClose();
                if (onOpenInvoices) onOpenInvoices();
              }}
            >
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Invoices</span>
            </button>

            <button
              type="button"
              className="sidebar-nav-item btn-nav-action"
              onClick={() => {
                onClose();
                if (onOpenSettings) onOpenSettings();
              }}
            >
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom-badge">
          <div className="sidebar-eco-card">
            <span className="eco-card-tag">SCHOLARSHIP TRACK</span>
            <p className="eco-card-title">Sustainability & Economics</p>
            <span className="eco-card-status">● Live Active Cohort</span>
          </div>
        </div>
      </aside>
    </>
  );
}
