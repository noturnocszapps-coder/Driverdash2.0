import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncIndicator } from './components/SyncIndicator';
import { SyncManager } from './components/SyncManager';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ReloadPrompt } from './ReloadPrompt';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { OfflineFallback } from './components/OfflineFallback';

// Lazy load pages
const LandingPage = lazy(() => import('./LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Faturamento = lazy(() => import('./pages/Faturamento').then(m => ({ default: m.Faturamento })));
const ImportReport = lazy(() => import('./pages/ImportReport').then(m => ({ default: m.ImportReport })));
const CycleMap = lazy(() => import('./pages/CycleMap'));
const CycleDetail = lazy(() => import('./pages/CycleDetail').then(m => ({ default: m.CycleDetail })));

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
  </div>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  if (isLanding || isAuth) return (
    <>
      {children}
      {isLanding && <Footer />}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default function App() {
  const { setUser, setSyncStatus } = useDriverStore();
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      return;
    }

    // Check active sessions and sets the user
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[App] Auth session error:', error.message);
          // If refresh token is invalid, clear everything
          if (
            error.message.includes('Refresh Token Not Found') || 
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')
          ) {
            await supabase.auth.signOut();
            setUser(null);
          }
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.name,
          });
          setSyncStatus('online');
        } else {
          setUser(null);
          setSyncStatus('offline');
        }
      } catch (err) {
        console.error('[App] Unexpected auth error:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[App] Auth event:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[App] Token refreshed successfully');
      }

      if (event === 'SIGNED_OUT') {
        // Clear local storage if needed or handle sign out
        setUser(null);
        setSyncStatus('offline');
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name,
        });
        setSyncStatus('online');
      } else {
        setUser(null);
        setSyncStatus('offline');
      }
      
      // Ensure we mark auth as ready if it wasn't already
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSyncStatus]);

  if (isOffline) {
    return <OfflineFallback />;
  }

  if (!isAuthReady) {
    return <PageLoader />;
  }

  return (
    <Router>
      <SyncManager />
      <ReloadPrompt />
      <PWAInstallPrompt />
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/faturamento" element={<ProtectedRoute><Faturamento /></ProtectedRoute>} />
            <Route path="/cycle-map/:id" element={<ProtectedRoute><CycleMap /></ProtectedRoute>} />
            <Route path="/cycle/:id" element={<ProtectedRoute><CycleDetail /></ProtectedRoute>} />
            <Route path="/import-report" element={<ProtectedRoute><ImportReport /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
