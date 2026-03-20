import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Faturamento } from './pages/Faturamento';
import { ImportReport } from './pages/ImportReport';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncIndicator } from './components/SyncIndicator';
import { SyncManager } from './components/SyncManager';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';

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
      
      if (session?.user) {
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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <SyncManager />
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/faturamento" element={<ProtectedRoute><Faturamento /></ProtectedRoute>} />
          <Route path="/import-report" element={<ProtectedRoute><ImportReport /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
