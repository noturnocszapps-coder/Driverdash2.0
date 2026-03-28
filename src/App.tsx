import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncManager } from './components/SyncManager';
import { ReloadPrompt } from './ReloadPrompt';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured, clearInvalidSessionData } from './lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole, UserStatus } from './types';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Lazy load pages with retry
const LandingPage = React.lazy(() => import('./LandingPage'));
const Dashboard = lazyWithRetry(
  () => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
  'Dashboard'
);
const Reports = lazyWithRetry(
  () => import('./pages/Reports').then((m) => ({ default: m.Reports })),
  'Reports'
);
const Settings = lazyWithRetry(
  () => import('./pages/Settings').then((m) => ({ default: m.Settings })),
  'Settings'
);
const Login = lazyWithRetry(
  () => import('./pages/Login').then((m) => ({ default: m.Login })),
  'Login'
);
const Register = lazyWithRetry(
  () => import('./pages/Register').then((m) => ({ default: m.Register })),
  'Register'
);
const ForgotPassword = lazyWithRetry(
  () => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
  'ForgotPassword'
);
const Faturamento = lazyWithRetry(
  () => import('./pages/Faturamento').then((m) => ({ default: m.Faturamento })),
  'Faturamento'
);
const ImportReport = lazyWithRetry(
  () => import('./pages/ImportReport').then((m) => ({ default: m.ImportReport })),
  'ImportReport'
);
const CycleMap = lazyWithRetry(() => import('./pages/CycleMap'), 'CycleMap');
const CycleDetail = lazyWithRetry(
  () => import('./pages/CycleDetail').then((m) => ({ default: m.CycleDetail })),
  'CycleDetail'
);
const HeatmapIntelligence = lazyWithRetry(
  () => import('./pages/HeatmapIntelligence'),
  'HeatmapIntelligence'
);
const DevLab = lazyWithRetry(
  () => import('./pages/DevLab'),
  'DevLab'
);

const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
  </div>
);

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro desconhecido ao renderizar a rota.',
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`[ROUTE] Error in ${this.props.routeName}:`, error);
    console.error('[ROUTE] Stack:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-[2.5rem] border border-red-500/20 bg-zinc-900/50 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-[100px]" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500/70 leading-none mb-1">
                    System Failure
                  </p>
                  <h1 className="text-2xl font-black tracking-tight">
                    {this.props.routeName}
                  </h1>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Ocorreu um erro crítico ao renderizar esta página. Isso pode ser causado por dados corrompidos ou uma falha temporária.
                </p>
                
                <div className="rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 font-mono">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 font-black">Error Log</p>
                  <pre className="text-xs text-red-400/80 whitespace-pre-wrap break-words leading-relaxed">
                    {this.state.errorMessage}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="rounded-2xl bg-zinc-800 hover:bg-zinc-700 px-4 py-4 text-xs font-black text-white transition-all active:scale-95"
                >
                  Voltar
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-4 text-xs font-black text-zinc-950 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  Recarregar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SafeRoute = ({
  children,
  routeName,
}: {
  children: React.ReactNode;
  routeName: string;
}) => {
  return <RouteErrorBoundary routeName={routeName}>{children}</RouteErrorBoundary>;
};

import { TripControl } from './components/TripControl';
import { useWakeLock } from './hooks/useWakeLock';

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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full pb-40">
          {children}
        </main>
      </div>
      <TripControl />
      <BottomNav />
    </div>
  );
};

function AppRoutes() {
  useWakeLock();
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <SafeRoute routeName="LandingPage">
                <LandingPage />
              </SafeRoute>
            }
          />
          <Route
            path="/login"
            element={
              <SafeRoute routeName="Login">
                <Login />
              </SafeRoute>
            }
          />
          <Route
            path="/register"
            element={
              <SafeRoute routeName="Register">
                <Register />
              </SafeRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <SafeRoute routeName="ForgotPassword">
                <ForgotPassword />
              </SafeRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="Dashboard">
                  <Dashboard />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/faturamento"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="Faturamento">
                  <Faturamento />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cycle-map/:id"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="CycleMap">
                  <CycleMap />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cycle/:id"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="CycleDetail">
                  <CycleDetail />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/import-report"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="ImportReport">
                  <ImportReport />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="Reports">
                  <Reports />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/heatmap"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="HeatmapIntelligence">
                  <HeatmapIntelligence />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="Settings">
                  <Settings />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dev-lab"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="DevLab">
                  <DevLab />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

import { Toaster } from 'sonner';

export default function App() {
  const { setUser, setSyncStatus, initVehicle, hasSynced, user } = useDriverStore();
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  useEffect(() => {
    initVehicle();
  }, [initVehicle]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      return;
    }

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
            await clearInvalidSessionData();
            return;
          }
          throw error;
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || 'User',
            role: session.user.user_metadata?.role || UserRole.DRIVER,
            status: session.user.user_metadata?.status || UserStatus.ACTIVE,
          });
          setSyncStatus('online');
          console.log('[AUTH] Session restored:', session.user.email);
        } else {
          setUser(null);
          setSyncStatus('offline');
          console.log('[AUTH] No active session');
        }
      } catch (err) {
        console.error('[AUTH] Initialization error:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Event:', event);
      
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH] User signed out, clearing store');
        useDriverStore.getState().resetStore();
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'User',
          role: session.user.user_metadata?.role || UserRole.DRIVER,
          status: session.user.user_metadata?.status || UserStatus.ACTIVE,
        });
        setSyncStatus('online');
      } else {
        setUser(null);
        setSyncStatus('offline');
      }

      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSyncStatus]);

  // Block rendering until auth is ready AND initial sync is done (if user is logged in)
  // This prevents showing "dirty" data from a previous user session
  if (!isAuthReady || (user && !hasSynced)) return <PageLoader />;

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <ReloadPrompt />
      <SyncManager />
      <AppRoutes />
    </Router>
  );
}
