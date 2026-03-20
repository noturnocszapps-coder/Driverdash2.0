import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDriverStore } from '../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useDriverStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
