import React, { useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, BottomNav } from './components/Navigation';
import { SyncManager } from './components/SyncManager';
import { SyncIndicator } from './components/SyncIndicator';
import { ReloadPrompt } from './ReloadPrompt';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured, clearInvalidSessionData } from './lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useDriverStore } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole, UserStatus } from './types';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { cn } from './utils';

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
const StrategicMap = lazyWithRetry(() => import('./pages/StrategicMap'), 'StrategicMap');
const DevLab = lazyWithRetry(
  () => import('./pages/DevLab'),
  'DevLab'
);
const Terms = lazyWithRetry(
  () => import('./pages/Terms').then((m) => ({ default: m.Terms })),
  'Terms'
);
const Privacy = lazyWithRetry(
  () => import('./pages/Privacy').then((m) => ({ default: m.Privacy })),
  'Privacy'
);
const Contact = lazyWithRetry(
  () => import('./pages/Contact').then((m) => ({ default: m.Contact })),
  'Contact'
);
const Onboarding = lazyWithRetry(
  () => import('./pages/Onboarding'),
  'Onboarding'
);
const AnalyticsPro = lazyWithRetry(
  () => import('./pages/AnalyticsPro'),
  'AnalyticsPro'
);

const PageLoader = () => (
  <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center">
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
        <div className="min-h-[100dvh] bg-zinc-950 text-white flex items-center justify-center p-6">
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
                    Ops! Algo deu errado
                  </p>
                  <h1 className="text-2xl font-black tracking-tight">
                    Falha na Inicialização
                  </h1>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Não foi possível carregar esta página. Tente recarregar o aplicativo ou voltar para a tela anterior.
                </p>
                
                <details className="group">
                  <summary className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 font-black cursor-pointer hover:text-zinc-500 transition-colors list-none flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-600 group-open:bg-red-500" />
                    Detalhes Técnicos
                  </summary>
                  <div className="rounded-2xl bg-zinc-950/50 border border-zinc-800 p-4 font-mono mt-2">
                    <pre className="text-[10px] text-red-400/60 whitespace-pre-wrap break-words leading-relaxed">
                      {this.state.errorMessage}
                    </pre>
                  </div>
                </details>
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
import { ManualTripFAB } from './components/ManualTripFAB';
import { VoiceAssistant } from './components/VoiceAssistant';
import { Paywall } from './components/Paywall';
import { useWakeLock } from './hooks/useWakeLock';

import { useIsMobile } from './hooks/useIsMobile';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { tracking, hasOpenCycle } = useDriverStore();
  const isMobile = useIsMobile();
  const isLanding = location.pathname === '/';
  const isAuth = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const isOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    window.scrollTo(0, 0);
    
    console.log('[LANDSCAPE_LAYOUT] Viewport:', `${window.innerWidth}x${window.innerHeight}`);
    console.log('[LANDSCAPE_LAYOUT] Is Mobile (Hook):', isMobile);
    console.log('[LANDSCAPE_LAYOUT] Sidebar Rendered:', !isMobile);
    console.log('[LANDSCAPE_LAYOUT] BottomNav Rendered:', isMobile);
    
    console.log('[TRACKING_LAYOUT] Viewport width:', window.innerWidth);
    console.log('[TRACKING_LAYOUT] Safe area bottom:', getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || 'env(safe-area-inset-bottom)');
    
    // Check if bottom nav items are rendered
    const bottomNav = document.querySelector('nav.fixed.bottom-0');
    if (bottomNav) {
      console.log('[BOTTOM_NAV] Bottom navigation rendered. Height:', bottomNav.clientHeight);
      const items = bottomNav.querySelectorAll('a');
      console.log('[BOTTOM_NAV] Items count:', items.length);
    }
  }, [location.pathname, isMobile]);

  if (isLanding || isAuth || isOnboarding) {
    return (
      <div className="min-h-[100dvh] flex flex-col overflow-x-hidden pt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        {isLanding && <Footer />}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden relative w-full max-w-full pt-6">
      <div className="flex flex-1 w-full max-w-full relative">
        <Sidebar />
        <main className={cn(
          "flex-1 flex flex-col px-4 pt-4 pb-6 w-full transition-all duration-500 overflow-y-auto overflow-x-hidden scroll-smooth min-w-0 relative",
          !isMobile && "md:px-10 md:pt-10 md:pb-12 max-w-6xl mx-auto",
          isMobile ? "pb-[calc(180px+env(safe-area-inset-bottom))]" : "pb-12"
        )}>
          {isMobile && (
            <div className="flex justify-end mb-4 pr-1">
              <SyncIndicator variant="minimal" />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 1.01 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {!isOnboarding && hasOpenCycle && (
        <>
          <TripControl />
          <ManualTripFAB />
          <VoiceAssistant />
        </>
      )}
      <BottomNav />
      <Paywall />
    </div>
  );
};

function AppRoutes() {
  useWakeLock();
  const { settings, user, tracking, isWatching, startTracking, plan, setPaywallOpen } = useDriverStore();
  const location = useLocation();

  // Auto-trigger paywall for Reports page if on free plan
  useEffect(() => {
    if (location.pathname === '/reports' && plan === 'free') {
      setPaywallOpen(true);
    }
  }, [location.pathname, plan, setPaywallOpen]);

  // Resume tracking if it was active before reload
  useEffect(() => {
    const wasTrackingActive = localStorage.getItem('driver_dash_tracking_active') === 'true';
    if (wasTrackingActive && tracking.isActive && !isWatching) {
      console.log('[TRACKING] Resuming active session after reload (flag detected)');
      startTracking();
    }
  }, []);

  // Check for onboarding completion in both state and localStorage for maximum stability
  const isLocalOnboardingCompleted = localStorage.getItem('driver_dash_onboarding_completed') === 'true';
  const onboardingCompleted = settings.onboardingCompleted || isLocalOnboardingCompleted;

  // Debug visibility for onboarding state
  useEffect(() => {
    if (user) {
      console.log('[ONBOARDING] State check:', {
        onboardingCompleted,
        settingsOnboarding: settings.onboardingCompleted,
        localOnboarding: isLocalOnboardingCompleted,
        path: location.pathname
      });
    }
  }, [user, onboardingCompleted, settings.onboardingCompleted, isLocalOnboardingCompleted, location.pathname]);

  // Redirect to onboarding if not completed
  if (user && !onboardingCompleted && location.pathname !== '/onboarding') {
    console.log('[ONBOARDING] Redirecting to onboarding...');
    return <Navigate to="/onboarding" replace />;
  }

  // Anti-loop: If onboarding is completed, don't allow access to onboarding page
  if (user && onboardingCompleted && location.pathname === '/onboarding') {
    console.log('[ONBOARDING] Already completed, redirecting to dashboard...');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
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
                <SafeRoute routeName="StrategicMap">
                  <StrategicMap />
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

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="Onboarding">
                  <Onboarding />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics-pro"
            element={
              <ProtectedRoute>
                <SafeRoute routeName="AnalyticsPro">
                  <AnalyticsPro />
                </SafeRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/terms"
            element={
              <SafeRoute routeName="Terms">
                <Terms />
              </SafeRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <SafeRoute routeName="Privacy">
                <Privacy />
              </SafeRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <SafeRoute routeName="Contact">
                <Contact />
              </SafeRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

import { Toaster } from 'sonner';
import { DeletionErrorBanner } from './components/DeletionErrorBanner';

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
            createdAt: session.user.created_at,
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
          createdAt: session.user.created_at,
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
      <div className="fixed top-0 left-0 right-0 h-6 bg-black flex items-center justify-center z-[9999] border-b border-white/5 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-[#9CA3AF]">
            Ambiente Beta: Estamos em constante evolução para você.
          </p>
        </div>
      </div>
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: {
            marginTop: 'env(safe-area-inset-top, 24px)',
          }
        }}
      />
      <ReloadPrompt />
      <SyncManager />
      <DeletionErrorBanner />
      <AppRoutes />
    </Router>
  );
}
