import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDriverStore } from '../store';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  formatCurrency,
  cn,
  calculateDailyFixedCost,
  safeNumber,
  getFriendlyErrorMessage,
} from '../utils';
import { Card, CardContent, Button, Skeleton } from '../components/UI';
import {
  TrendingUp,
  Target,
  Zap,
  Settings,
  Pause,
  Square,
  Play,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  Calendar,
  Info,
  MapPin,
  Clock,
  Navigation,
  Timer,
  Activity,
  Loader2,
  Rocket,
  History,
  BarChart2,
  Trophy,
  Map as MapIcon
} from 'lucide-react';
import { startOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { PostTripActionSheet } from '../components/PostTripActionSheet';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { SyncIndicator } from '../components/SyncIndicator';

function MetricItem({ 
  label, 
  value, 
  unit,
  icon: Icon, 
  accent = "text-white",
  isLarge = false
}: { 
  label: string; 
  value: string | number; 
  unit?: string;
  icon: any; 
  accent?: string;
  isLarge?: boolean;
}) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-1.5 md:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-0.5 transition-all duration-300",
        isLarge && "col-span-1 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
      )}
    >
      <div className="flex items-center gap-1.5 md:gap-2">
        <Icon size={10} className={cn(accent, "opacity-50")} />
        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <motion.p 
          key={typeof value === 'number' ? Math.floor(value * 10) : value}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "font-black tracking-tighter tabular-nums truncate",
            isLarge ? "text-2xl md:text-3xl text-zinc-900 dark:text-white" : "text-lg md:text-xl text-zinc-800 dark:text-zinc-100",
            accent !== "text-white" && !isLarge && accent
          )}
        >
          {/* Formatar números para ter sempre uma casa decimal se for km */}
          {typeof value === 'number' ? value.toFixed(1) : value}
        </motion.p>
        {unit && (
          <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-tight shrink-0">{unit}</span>
        )}
      </div>
    </motion.div>
  );
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    cycles: rawCycles = [],
    hasOpenCycle: rawHasOpenCycle = false,
    settings = {
      dailyGoal: 250,
      name: 'Motorista',
      isPrivacyMode: false,
      fixedCosts: {},
    },
    tracking = {
      isActive: false,
      mode: 'idle',
      duration: 0,
      distance: 0,
      isPaused: false,
      startTime: undefined,
      productiveDistance: 0,
      idleDistance: 0,
      avgSpeed: 0,
      points: [],
      stopPoints: [],
    },
    startTracking,
    stopTracking,
    startCycle,
    pauseTracking,
    resumeTracking,
    checkAndCloseCycles,
    vehicles = [],
    activeVehicleId,
    plan,
    setPaywallOpen,
    driverProfile,
    pendingDeletionIds = []
  } = useDriverStore();

  const cycles = useMemo(() => {
    return rawCycles.filter(c => !pendingDeletionIds.includes(c.id));
  }, [rawCycles, pendingDeletionIds]);

  const hasOpenCycle = useMemo(() => {
    return cycles.some(c => c.status === 'open');
  }, [cycles]);

  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTime, setActiveTime] = useState(0);
  const [showResumeMessage, setShowResumeMessage] = useState(false);

  useEffect(() => {
    if (tracking.isActive && !tracking.isPaused) {
      setShowResumeMessage(true);
      const timer = setTimeout(() => setShowResumeMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (tracking.isActive && !tracking.isPaused && tracking.startTime) {
      interval = setInterval(() => {
        setActiveTime(Date.now() - tracking.startTime!);
      }, 1000);
    } else {
      setActiveTime(tracking.duration || 0);
    }
    return () => clearInterval(interval);
  }, [tracking.isActive, tracking.isPaused, tracking.startTime, tracking.duration]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Simulate initial loading for skeleton effect
    const timer = setTimeout(() => setIsLoading(false), 800);
    checkAndCloseCycles?.();
    return () => clearTimeout(timer);
  }, [checkAndCloseCycles]);

  const now = new Date();
  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, [now]);

  const openCycle = useMemo(() => (cycles || []).find((c: any) => c?.status === 'open') || null, [cycles]);

  useEffect(() => {
    console.log('[CLOSE_CYCLE] Dashboard state:', { hasOpenCycle, openCycleId: openCycle?.id });
  }, [hasOpenCycle, openCycle?.id]);

  const currentVehicle = useMemo(() => {
    return (vehicles || []).find((v: any) => v?.id === activeVehicleId) || null;
  }, [vehicles, activeVehicleId]);

  const profitStats = useMemo(() => {
    if (!openCycle) return null;
    const earnings = safeNumber(openCycle?.total_amount);
    const expenses = safeNumber(openCycle?.fuel_expense) + safeNumber(openCycle?.food_expense) + safeNumber(openCycle?.other_expense);
    const fixedCosts = currentVehicle?.fixedCosts || settings?.fixedCosts || {};
    const dailyFixed = safeNumber(calculateDailyFixedCost(fixedCosts));
    const profit = earnings - expenses - dailyFixed;
    return { earnings, expenses, dailyFixed, profit };
  }, [openCycle, settings?.fixedCosts, currentVehicle]);

  const dailyGoal = safeNumber(settings?.dailyGoal || 250);
  
  // Calculate total earnings for today (all cycles started today)
  const todayTotalEarnings = useMemo(() => {
    const today = startOfDay(new Date());
    return cycles
      .filter(c => {
        const cycleDate = parseISO(c.start_time);
        return startOfDay(cycleDate).getTime() === today.getTime();
      })
      .reduce((acc, c) => acc + safeNumber(c.total_amount), 0);
  }, [cycles]);

  const currentEarnings = todayTotalEarnings;
  const remainingGoal = Math.max(0, dailyGoal - currentEarnings);
  const goalProgress = Math.min((currentEarnings / dailyGoal) * 100, 100);

  const handleStartCycle = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    console.log('[CYCLE] Manually starting cycle from Dashboard');
    try {
      await startCycle();
      toast.success("Turno aberto com sucesso!");
    } catch (error: any) {
      console.error('[CYCLE] Error starting cycle:', error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let permission: PermissionStatus | null = null;
    
    const checkPermission = async () => {
      if (navigator?.permissions?.query) {
        try {
          permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          const handleChange = () => {
            if (permission?.state === 'granted') {
              setLocationError(null);
            }
          };
          permission.addEventListener('change', handleChange);
          return () => permission?.removeEventListener('change', handleChange);
        } catch (err) {
          console.warn('[DASHBOARD] Permission listener failed:', err);
        }
      }
    };
    
    const cleanup = checkPermission();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  const handleToggleTracking = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    console.log('[DASHBOARD] Toggling tracking...', { 
      currentIsActive: tracking?.isActive,
      activeVehicleId 
    });

    try {
      setLocationError(null);
      if (tracking?.isActive) {
        console.log('[DASHBOARD] Stopping tracking...');
        await stopTracking?.();
        toast.success("Rastreamento finalizado");
      } else {
        if (!activeVehicleId) {
          console.warn('[DASHBOARD] No active vehicle selected');
          toast.error("Selecione um veículo antes de iniciar");
          setIsProcessing(false);
          return;
        }

        if (navigator?.permissions?.query) {
          try {
            const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            if (permission.state === 'denied') {
              console.warn('[DASHBOARD] Geolocation permission denied');
              setLocationError('Acesso à localização negado. Para rastrear suas corridas, por favor ative a permissão de GPS nas configurações do seu navegador.');
              setIsProcessing(false);
              return;
            }
          } catch (err) {
            console.warn('[DASHBOARD] navigator.permissions.query failed:', err);
            // Fallback: continue and let startTracking handle it
          }
        }

        console.log('[DASHBOARD] Starting tracking...');
        // O startTracking no store já lida com permissões e geolocalização
        await startTracking?.();
        
        // Verificamos se o rastreamento realmente iniciou no store
        // Como o Zustand set é síncrono, após o await ele já deve estar atualizado
        const currentTracking = useDriverStore.getState().tracking;
        console.log('[DASHBOARD] Tracking start result:', currentTracking.isActive);
        
        if (currentTracking.isActive) {
          setLocationError(null);
          toast.success("Rastreamento iniciado");
        }
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Error toggling tracking:', error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const activeInsight = useMemo(() => {
    if (!openCycle) return "Inicie um ciclo para receber insights personalizados.";
    if (currentEarnings === 0) return "Lance seu primeiro ganho para analisar sua performance hoje.";
    if (goalProgress < 50) return "Você está no caminho! Mantenha o foco para atingir sua meta.";
    if (goalProgress < 100) return "Quase lá! Mais algumas corridas e você bate a meta de hoje.";
    return "Meta batida! Ótimo trabalho, considere descansar ou buscar bônus.";
  }, [openCycle, currentEarnings, goalProgress]);

  const weeklyStats = useMemo(() => {
    const last7Days = cycles.slice(0, 7);
    const totalRevenue = last7Days.reduce((acc, c) => acc + safeNumber(c.total_amount), 0);
    const totalKm = last7Days.reduce((acc, c) => acc + safeNumber(c.total_km), 0);
    return { totalRevenue, totalKm };
  }, [cycles]);

  useEffect(() => {
    console.log('[TRACKING_LAYOUT] Dashboard mounted. Viewport width:', window.innerWidth);
    const trackingCard = document.querySelector('.tracking-card');
    if (trackingCard) {
      console.log('[TRACKING_LAYOUT] Tracking card width:', trackingCard.clientWidth);
      const cardContent = trackingCard.querySelector('.card-content');
      if (cardContent) {
        console.log('[TRACKING_LAYOUT] Card content width:', cardContent.clientWidth);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 max-w-lg mx-auto overflow-x-hidden w-full min-w-0">
      {/* HEADER / HERO SECTION */}
      <header className="flex justify-between items-start px-1 pt-4 mb-4">
        <div className="space-y-1 relative min-w-0">
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-none relative truncate">
              {greeting}, <span className="text-emerald-500">{settings.name?.split(' ')[0] || 'Motorista'}</span>
            </h1>
            <div className="mt-1.5 flex items-center gap-3">
              <p className="text-[9px] md:text-xs font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              {isMobile && <SyncIndicator variant="minimal" />}
            </div>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/settings')}
          className="rounded-2xl bg-white dark:bg-zinc-900 w-12 h-12 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-all hover:border-emerald-500/30 group"
        >
          <Settings size={20} className="text-zinc-400 group-hover:text-emerald-500 transition-colors" />
        </motion.button>
      </header>

      {/* MAIN VALUE CARD (PRIMARY FOCUS) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group px-1 md:px-0 mb-2"
      >
        <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 rounded-[3rem] blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/10 via-transparent to-zinc-500/10 rounded-[2.6rem] blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-2xl shadow-zinc-200/50 dark:shadow-none rounded-[2rem] overflow-hidden relative border border-zinc-100 dark:border-zinc-800/50">
          <CardContent className="p-5 md:p-10 space-y-6 md:space-y-10">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2 md:space-y-3 min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                  <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 truncate">Ganhos de Hoje</p>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white tabular-nums truncate leading-none">
                  {formatCurrency(currentEarnings)}
                </h2>
              </div>
              {hasOpenCycle && (
                <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-sm shrink-0 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Ciclo Ativo
                </div>
              )}
            </div>

            {profitStats && (
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.15em]">Despesas</p>
                  <p className="text-lg font-black text-rose-500 tabular-nums">
                    {formatCurrency(profitStats.expenses + profitStats.dailyFixed)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.15em]">Lucro Real</p>
                  <p className="text-lg font-black text-emerald-500 tabular-nums">
                    {formatCurrency(profitStats.profit)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Meta Diária</span>
                <span className="text-xs font-black text-emerald-500 tabular-nums">{Math.round(goalProgress)}%</span>
              </div>
              <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200/50 dark:border-zinc-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                />
              </div>
            </div>

            <Button 
              onClick={() => hasOpenCycle ? navigate('/faturamento') : handleStartCycle()}
              disabled={isProcessing}
              className={cn(
                "w-full h-14 font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest text-[10px]",
                "bg-[#00C853] text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/20"
              )}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : hasOpenCycle ? (
                <>Ver Detalhes do Turno <ChevronRight size={14} /></>
              ) : (
                <>Abrir Novo Turno <Play size={14} fill="currentColor" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* STATUS OPERACIONAL / TRACKING */}
      <div className="pt-4 md:pt-6">
        <Card className={cn(
          "border-none shadow-xl transition-all duration-500 overflow-hidden relative tracking-card w-full max-w-full rounded-[2rem]",
          locationError ? "bg-rose-500 text-white" : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/50"
        )}>
        <CardContent className="p-2 md:p-6 relative z-10 space-y-3 md:space-y-6 card-content">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-5 min-w-0">
              <div className="relative shrink-0">
                {tracking.isActive && !locationError && !tracking.isPaused && (
                  <motion.div 
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500 rounded-2xl z-0"
                  />
                )}
                <div className={cn(
                  "w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 relative z-10 border",
                  locationError ? "bg-white/20 border-white/30" : tracking.isActive ? "bg-emerald-500 text-zinc-950 border-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                )}>
                  {locationError ? <AlertTriangle size={20} /> : tracking.isActive ? <Zap size={20} /> : <Play size={20} className="text-zinc-400" />}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 md:mb-1">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Status</p>
                  {tracking.isActive && !locationError && !tracking.isPaused && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-1 py-0.5 rounded-full shrink-0 border border-emerald-500/20">
                      <span className="flex h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[6px] md:text-[8px] font-black text-emerald-500 uppercase tracking-widest">LIVE</span>
                    </div>
                  )}
                </div>
                <h3 className={cn(
                  "text-lg md:text-2xl font-black uppercase tracking-tight truncate",
                  locationError ? "text-white" : tracking.isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                )}>
                  {locationError ? 'Erro' : !hasOpenCycle ? 'Fechado' : tracking.isActive ? (tracking.isPaused ? 'Pausado' : 'Ativo') : 'Inativo'}
                </h3>
              </div>
            </div>
            
            {tracking.isActive && !locationError && (
              <div className="text-right shrink-0 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Duração</p>
                <p className="text-xs md:text-lg font-black font-mono text-emerald-500 tabular-nums">{formatDuration(activeTime)}</p>
              </div>
            )}
          </div>

          {tracking.isActive && !locationError && (
            <div className="grid grid-cols-2 gap-3">
              <MetricItem 
                label="Distância Total" 
                value={tracking.distance || 0} 
                unit="km"
                icon={Navigation}
              />
              <MetricItem 
                label="KM Produtivo" 
                value={tracking.productiveDistance || 0} 
                unit="km"
                icon={Activity}
                accent="text-emerald-500"
              />
              <MetricItem 
                label="KM Ocioso" 
                value={tracking.idleDistance || 0} 
                unit="km"
                icon={MapPin}
                accent="text-orange-500"
              />
              <MetricItem 
                label="Velocidade" 
                value={Math.round(tracking.avgSpeed || 0)} 
                unit="km/h"
                icon={TrendingUp}
              />
            </div>
          )}

          {tracking.isActive && !locationError && (
            <div className="mt-2 rounded-[2rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner min-h-[200px]">
              <LiveTrackingMap 
                points={tracking.points || []} 
                stopPoints={tracking.stopPoints || []}
                isActive={tracking.isActive}
                isPaused={tracking.isPaused}
                currentSpeed={tracking.currentSmoothedSpeed || 0}
                totalDistance={tracking.distance || 0}
                duration={activeTime}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!hasOpenCycle ? (
              <Button 
                onClick={handleStartCycle}
                disabled={isProcessing}
                style={{ backgroundColor: '#00C853' }}
                className="col-span-2 w-full text-zinc-950 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] h-12 md:h-14 rounded-2xl border-none shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Abrindo turno...
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    Abrir Turno
                  </>
                )}
              </Button>
            ) : !tracking.isActive && !locationError ? (
              <Button 
                onClick={handleToggleTracking}
                disabled={isProcessing}
                style={{ backgroundColor: '#00C853' }}
                className="col-span-2 w-full text-zinc-950 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] h-12 md:h-14 rounded-2xl border-none shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    Ativar Rastreamento
                  </>
                )}
              </Button>
            ) : tracking.isActive && !locationError ? (
              <>
                <Button 
                  onClick={() => tracking.isPaused ? resumeTracking?.() : pauseTracking?.()}
                  disabled={isProcessing}
                  className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:opacity-80 border-none font-black uppercase tracking-widest text-[10px] h-16 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {tracking.isPaused ? <><Play size={16} fill="currentColor" /> Retomar</> : <><Pause size={16} fill="currentColor" /> Pausar</>}
                </Button>
                <Button 
                  onClick={handleToggleTracking}
                  disabled={isProcessing}
                  variant="danger"
                  className="bg-rose-600 text-white hover:bg-rose-700 border-none font-black uppercase tracking-widest text-[10px] h-12 md:h-14 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <><Square size={16} fill="currentColor" /> Encerrar</>}
                </Button>
              </>
            ) : null}
          </div>
          
          {locationError && (
            <div className="mt-6 space-y-4">
              <div className="p-5 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-start gap-4">
                <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
                <div className="space-y-1.5">
                  <p className="text-sm font-black text-rose-100 leading-tight uppercase tracking-tight">
                    {locationError}
                  </p>
                  <p className="text-[10px] font-bold text-rose-200/50 uppercase tracking-widest leading-relaxed">
                    Verifique as permissões de GPS nas configurações do seu navegador.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleToggleTracking}
                disabled={isProcessing}
                className="w-full h-16 rounded-2xl bg-white text-zinc-950 font-black uppercase tracking-widest hover:bg-zinc-100 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Tentar Novamente'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* META DO DIA / RESUMO */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <motion.div whileTap={{ scale: 0.98 }} className="col-span-1">
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] overflow-hidden h-full">
            <CardContent className="p-4 md:p-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Target size={12} className="opacity-50" />
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Sua Meta</p>
              </div>
              <p className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white tabular-nums">
                {formatCurrency(dailyGoal)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.98 }} className="col-span-1">
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] overflow-hidden h-full">
            <CardContent className="p-4 md:p-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <TrendingUp size={12} className="opacity-50" />
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Faltam</p>
              </div>
              <p className="text-xl md:text-2xl font-black tracking-tighter text-orange-500 tabular-nums">
                {formatCurrency(remainingGoal)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* NOVAS MÉTRICAS PARA PREENCHER A TELA */}
        <motion.div whileTap={{ scale: 0.98 }} className="col-span-1">
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] overflow-hidden h-full">
            <CardContent className="p-4 md:p-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock size={12} className="opacity-50" />
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Tempo Total</p>
              </div>
              <p className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white tabular-nums">
                {formatDuration(activeTime).split(':').slice(0, 2).join(':')}h
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.98 }} className="col-span-1">
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] overflow-hidden h-full">
            <CardContent className="p-4 md:p-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Trophy size={12} className="opacity-50" />
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Score Driver</p>
              </div>
              <p className="text-xl md:text-2xl font-black tracking-tighter text-emerald-500 tabular-nums">
                9.8
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          whileTap={{ scale: 0.98 }} 
          className="col-span-1 cursor-pointer"
          onClick={() => navigate('/heatmap')}
        >
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] overflow-hidden h-full border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4 md:p-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <MapIcon size={12} className="opacity-50" />
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Mapas</p>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-white tabular-nums">
                  {driverProfile.mapsViewed || 0}
                </p>
                <ChevronRight size={14} className="text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* RESUMO SEMANAL RÁPIDO */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-emerald-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resumo da Semana</h3>
          </div>
          <button onClick={() => navigate('/reports')} className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Ver Tudo</button>
        </div>
        <Card className="border-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 rounded-[2rem] overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Faturamento Total</p>
              <p className="text-xl font-black text-zinc-900 dark:text-white">{formatCurrency(weeklyStats.totalRevenue)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">KM Rodados</p>
              <p className="text-xl font-black text-zinc-900 dark:text-white">{weeklyStats.totalKm.toFixed(1)} km</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* HISTÓRICO RECENTE RÁPIDO */}
      {cycles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History size={14} className="text-emerald-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Últimos Turnos</h3>
            </div>
          </div>
          <div className="space-y-2">
            {cycles.slice(0, 3).map((cycle) => (
              <motion.div
                key={cycle.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/cycle/${cycle.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-colors">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900 dark:text-white">
                      {cycle.start_time ? format(parseISO(cycle.start_time), "dd 'de' MMM", { locale: ptBR }) : 'Data Indisponível'}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      {cycle.total_km?.toFixed(1)} km • {formatCurrency(cycle.total_amount)}
                    </p>
                    {cycle.has_error && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle size={10} className="text-amber-500" />
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Dados incompletos</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* INSIGHT SECTION - DRIVERDASH PRO */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => plan === 'free' && setPaywallOpen(true)}
        className="relative group cursor-pointer"
      >
        <div className={cn(
          "absolute -inset-[2px] rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500",
          plan === 'pro' ? "bg-indigo-500" : "bg-emerald-500"
        )} />
        <Card 
          className={cn(
            "border border-white/5 shadow-2xl overflow-hidden relative rounded-[2.5rem] transition-all duration-300",
            plan === 'pro' ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-400 group-hover:border-emerald-500/30"
          )}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} />
          </div>
          <CardContent className="p-5 md:p-8 flex items-start gap-4 md:gap-5 relative z-10">
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border",
              plan === 'pro' ? "bg-white/20 border-white/30" : "bg-white/5 border-white/10"
            )}>
              {plan === 'pro' ? <Info size={24} /> : <Rocket className="text-emerald-500" size={24} />}
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                {plan === 'pro' ? 'Assistente DriverDash' : 'DriverDash PRO'}
              </p>
              <p className="text-xs md:text-sm font-bold leading-relaxed text-zinc-100">
                {plan === 'pro' ? activeInsight : 'Desbloqueie insights inteligentes e análise de performance em tempo real.'}
              </p>
              {plan === 'free' && (
                <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2 md:mt-3 flex items-center gap-1.5">
                  Conhecer o Plano PRO <ChevronRight size={10} />
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <QuickActionsMenu />
      <PostTripActionSheet />
    </div>
  );
};
