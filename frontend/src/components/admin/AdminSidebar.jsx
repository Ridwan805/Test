import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminSidebar({
  activeSection,
  onSelectSection,
  mobileOpen,
  onClose,
  stats = {}
}) {
  const navSections = [
    {
      group: 'DASHBOARD',
      items: [
        { id: 'overview', label: 'Overview', icon: '📊' }
      ]
    },
    {
      group: 'LEARNING',
      items: [
        { id: 'courses', label: 'Courses', icon: '📚', count: stats.totalCourses || 3 },
        { id: 'bootcamps', label: 'Bootcamps', icon: '⚡', count: stats.totalBootcamps || 2, badge: 'Intensive' }
      ]
    },
    {
      group: 'PEOPLE',
      items: [
        { id: 'students', label: 'Students', icon: '👥', count: stats.totalStudents || 11 },
        { id: 'admins', label: 'Admins', icon: '👑', count: 1 }
      ]
    },
    {
      group: 'BUSINESS',
      items: [
        { id: 'invoices', label: 'Invoices', icon: '💳' },
        { id: 'orders', label: 'Orders & Aid', icon: '📄' }
      ]
    },
    {
      group: 'INSIGHTS',
      items: [
        { id: 'course_analytics', label: 'Course Analytics', icon: '📈' },
        { id: 'bootcamp_analytics', label: 'Bootcamp Analytics', icon: '🎯' },
        { id: 'activity', label: 'Activity', icon: '⚡' }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: '⚙️' }
      ]
    }
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-persistent-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <Link to="/admin" className="admin-brand-link" onClick={() => onSelectSection('overview')}>
            <div className="admin-brand-icon">E</div>
            <div className="admin-brand-text">
              <span className="admin-brand-name">EcoIntuition</span>
              <span className="admin-brand-badge">ADMIN CONSOLE</span>
            </div>
          </Link>
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin Navigation">
          {navSections.map((sec) => (
            <div key={sec.group} className="admin-nav-group">
              <span className="admin-nav-group-title">{sec.group}</span>
              <div className="admin-nav-group-items">
                {sec.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectSection(item.id);
                        if (onClose) onClose();
                      }}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge && (
                        <span className="nav-item-badge">{item.badge}</span>
                      )}
                      {item.count !== undefined && (
                        <span className="nav-item-count">{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-status-indicator">
            <span className="status-ping-dot" />
            <div className="status-indicator-text">
              <span className="status-title">System Online</span>
              <span className="status-sub">MongoDB Atlas • Pyodide Grader</span>
            </div>
          </div>
          <Link to="/courses" className="admin-exit-link" title="Switch to scholar course catalog">
            ← Student Portal
          </Link>
        </div>
      </aside>
    </>
  );
}
