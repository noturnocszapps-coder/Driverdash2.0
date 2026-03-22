import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncManager } from './components/SyncManager';
import { Footer } from './components/Footer';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy pages
const LandingPage = lazy(() => import('./LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));

const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center text-white">
    CARREGANDO...
  </div>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  if (isLanding || isAuth) {
    return (
      <>
        {children}
        {isLanding && <Footer />}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default function App() {
  const { settings } = useDriverStore();

  useEffect(() => {
    if (!settings) return;
  }, [settings]);

  return (
    <Router>
      <SyncManager />

      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}