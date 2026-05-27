import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, role, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const allowed = roles?.length
    ? roles.includes(user.role)
    : !role || user.role === role;

  if (!allowed) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;