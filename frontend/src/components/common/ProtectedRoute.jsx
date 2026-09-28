import React, { useContext } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-brand)', fontSize: '1.2rem' }}>
          Verifying Scholar Access...
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve requested location so user is redirected back after sign in
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If this route is restricted to admins only, redirect non-staff students to their student dashboard
  if (adminOnly && !user.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
