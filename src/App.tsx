import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncManager } from './components/SyncManager';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Lazy load pages with retry
const LandingPage = lazyWithRetry(
  () => import('./LandingPage').then((m) => ({ default: m.LandingPage })),
  'LandingPage'
);
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
    console.error(`[RouteErrorBoundary] Erro na rota ${this.props.routeName}:`, error);
    console.error('[RouteErrorBoundary] Stack:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-zinc-900 p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 mb-2">
              Erro de Rota
            </p>
            <h1 className="text-2xl font-black tracking-tight mb-3">
              Falha ao abrir: {this.props.routeName}
            </h1>
            <p className="text-sm text-zinc-400 mb-4">
              A navegação funcionou, mas esta página quebrou ao renderizar.
            </p>
            <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 overflow-auto">
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words">
                {this.state.errorMessage}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950"
            >
              Recarregar página
            </button>
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
        <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

function AppRoutes() {
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const { setUser, setSyncStatus } = useDriverStore();
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthReady(true);
      return;
    }

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || 'User',
          });
          setSyncStatus('online');
        } else {
          setUser(null);
          setSyncStatus('offline');
        }
      } catch (err) {
        console.error('[App] Auth error:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'User',
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

  if (!isAuthReady) return <PageLoader />;

  return (
    <Router>
      <SyncManager />
      <AppRoutes />
    </Router>
  );
}
