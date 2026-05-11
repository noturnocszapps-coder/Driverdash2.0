import React, { useMemo, useEffect, useState, memo } from 'react';
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
import { Card, CardContent, Button, Skeleton, PriceDisplay } from '../components/UI';
import {
  TrendingUp,
  Target,
  Gauge,
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
  Activity,
  Loader2,
  Car,
  History,
  BarChart2,
  Trophy,
  Map as MapIcon,
  Maximize2
} from 'lucide-react';
import { startOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { CountUp } from '../components/CountUp';
import { useSound } from '../hooks/useSound';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { PostTripActionSheet } from '../components/PostTripActionSheet';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { SyncIndicator } from '../components/SyncIndicator';
import { IntelligencePanel } from '../components/IntelligencePanel';
import { UserRole, FinancialEntry } from '../types';

const MetricItem = memo(({ 
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
}) => {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-md md:p-lg rounded-sm bg-white/5 border border-white/5 flex flex-col gap-sm transition-all duration-300 hover:border-[#00FFBB]/20 shadow-premium group overflow-hidden relative",
        isLarge && "col-span-1 bg-white/10 border-white/10 shadow-glow"
      )}
    >
      <div className="flex items-center gap-sm flex-row relative z-10">
        <div className={cn(
          "shrink-0 p-1.5 rounded-xs bg-zinc-900/80 border border-white/5 shadow-premium", 
          accent === "text-[#00FFBB]" ? "text-[#00FFBB]" : "text-zinc-500"
        )}>
          <Icon size={12} className="md:w-4 md:h-4" strokeWidth={2.5} />
        </div>
        <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 italic truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1 mt-1 flex-row relative z-10 min-w-0">
        <motion.p 
          key={typeof value === 'number' ? Math.floor(value * 10) : value}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "font-black tabular-nums font-display italic leading-none truncate",
            isLarge ? "text-xl md:text-3xl text-white" : "text-lg md:text-2xl text-zinc-100",
            accent !== "text-white" && !isLarge && accent
          )}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </motion.p>
        {unit && (
          <span className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest shrink-0 italic">{unit}</span>
        )}
      </div>
    </motion.div>
  );
});

MetricItem.displayName = 'MetricItem';

export const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { playSound } = useSound();
  const {
    cycles: rawCycles = [],
    settings = {
      dailyGoal: 250,
      name: 'Motorista',
      isPrivacyMode: false,
      fixedCosts: {},
      role: UserRole.DRIVER
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
    pendingDeletionIds = [],
    financialEntries = []
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
    const timer = setTimeout(() => setIsLoading(false), 800);
    checkAndCloseCycles?.();
    return () => clearTimeout(timer);
  }, [checkAndCloseCycles]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'BOM DIA';
    if (hour < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  }, []);

  const openCycle = useMemo(() => (cycles || []).find((c: any) => c?.status === 'open') || null, [cycles]);

  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId);
  }, [vehicles, activeVehicleId]);

  const currentCycleEntries = useMemo(() => {
    if (!openCycle) return [];
    return financialEntries.filter(e => e.cycle_id === openCycle.id);
  }, [financialEntries, openCycle]);

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
    playSound('start');
    try {
      await startCycle();
      toast.success("Sistema operacional iniciado");
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTracking = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      setLocationError(null);
      if (tracking?.isActive) {
        await stopTracking?.();
        toast.success("Rastreamento gravado");
      } else {
        if (!activeVehicleId) {
          toast.error("Vincule um veículo");
          setIsProcessing(false);
          return;
        }

        await startTracking?.();
        const currentTracking = useDriverStore.getState().tracking;
        if (currentTracking.isActive) {
          toast.success("Monitoramento em curso");
        }
      }
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-lg mx-auto pb-32">
        <div className="flex justify-between items-center">
          <div className="space-y-3">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>
          <Skeleton className="h-14 w-14 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        <Skeleton className="h-72 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-section max-w-[1400px] mx-auto overflow-x-hidden w-full min-w-0 pb-32 px-md md:px-lg">
      {/* HEADER / HERO SECTION */}
      <header className="flex justify-between items-start pt-md md:pt-xl gap-md">
        <div className="space-y-xs relative min-w-0 flex-1">
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-[#00FFBB]/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-[clamp(1.25rem,5vw,2.5rem)] font-black tracking-tight md:tracking-tighter text-white leading-tight italic font-display truncate">
              {greeting}, <span className="text-[#00FFBB] uppercase">{settings.name?.split(' ')[0] || 'OPERADOR'}</span>
            </h1>
            <div className="flex items-center gap-sm mt-xs">
              <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-xs shrink-0">
                <Calendar size={10} className="text-zinc-600 shrink-0" />
                {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
              </p>
              {isMobile && <div className="shrink-0 scale-75 origin-left"><SyncIndicator variant="minimal" /></div>}
            </div>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/settings')}
          className="rounded-sm bg-white/5 w-14 h-14 flex items-center justify-center border border-white/10 shadow-premium transition-all hover:border-[#00FFBB]/40 hover:bg-white/10 group active:scale-90"
        >
          <Settings size={22} className="text-zinc-400 group-hover:text-[#00FFBB] transition-colors" />
        </motion.button>
      </header>

      {/* DASHBOARD GRID - 12 COLUMNS ON DESKTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-section">
        
        {/* LEFT COLUMN - MAIN STATUS & TRACKING (8 COL) */}
        <div className="lg:col-span-8 flex flex-col gap-section min-h-0">
          {/* MAIN VALUE CARD */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group shrink-0"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-[#00FFBB]/10 via-transparent to-indigo-500/10 rounded-[3rem] blur-2xl opacity-40 pointer-events-none" />
            <Card className="border-none bg-[#0B0C10]/40 backdrop-blur-3xl shadow-premium rounded-lg overflow-hidden relative border border-white/5 h-full">
              <CardContent className="p-lg md:p-xl space-y-lg">
                <div className="flex justify-between items-start gap-md">
                  <div className="space-y-sm min-w-0">
                    <div className="flex items-center gap-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00FFBB] shadow-[0_0_15px_rgba(0,255,187,0.7)] animate-pulse" />
                      <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 truncate">LUCRO LÍQUIDO DO DIA</p>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-sm sm:gap-md">
                      <PriceDisplay 
                        value={profitStats ? profitStats.profit : todayTotalEarnings} 
                        size={isMobile ? 'lg' : 'xl'} 
                        className="text-white shrink-0" 
                      />
                      {profitStats && (
                        <div className="px-3 py-1 rounded-full bg-[#00FFBB]/10 border border-[#00FFBB]/20 text-[9px] sm:text-[10px] font-black text-[#00FFBB] uppercase tracking-wider whitespace-nowrap break-safe shrink-0">
                          {((profitStats.profit / (profitStats.earnings || 1)) * 100).toFixed(0)}% MARGEM
                        </div>
                      )}
                    </div>
                  </div>
                  {hasOpenCycle ? (
                    <div className="bg-[#00FFBB]/10 text-[#00FFBB] px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest border border-[#00FFBB]/20 shadow-neon shrink-0 flex items-center gap-sm">
                      <div className="w-2 h-2 rounded-full bg-[#00FFBB] animate-ping" />
                      TURNO ABERTO
                    </div>
                  ) : (
                    <div className="bg-zinc-800/40 text-zinc-500 px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest border border-white/5 shrink-0 flex items-center gap-sm">
                      OF-TURNO
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-md pt-lg border-t border-white/5">
                  <div className="space-y-xs">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">BRUTO</p>
                    <PriceDisplay value={profitStats?.earnings || todayTotalEarnings} size="sm" className="text-white/80" />
                  </div>
                  <div className="space-y-xs">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">DESPESAS</p>
                    <PriceDisplay value={profitStats?.expenses || 0} prefix="R$-" size="sm" className="text-rose-500/80" />
                  </div>
                  <div className="space-y-xs">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">FIXO DIÁRIO</p>
                    <PriceDisplay value={profitStats?.dailyFixed || calculateDailyFixedCost(settings.fixedCosts)} prefix="R$-" size="sm" className="text-orange-500/80" />
                  </div>
                  <div className="space-y-xs">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ONLINE</p>
                    <div className="text-sm font-black text-white/80 tabular-nums italic font-display leading-none">
                      {formatDuration(activeTime)}
                    </div>
                  </div>
                </div>

                <div className="space-y-sm">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">PROGRESSO DA META</span>
                    <span className="text-sm font-black text-[#00FFBB] tabular-nums italic font-display tracking-widest">
                      <CountUp value={goalProgress} formatter={(val) => `${Math.round(val)}%`} duration={2} />
                    </span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${goalProgress}%` }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-gradient-to-r from-[#00FFBB] to-[#00FFBB]/40 rounded-full shadow-neon"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-md pt-lg">
                  {!hasOpenCycle ? (
                    <Button 
                      onClick={handleStartCycle}
                      disabled={isProcessing}
                      size="lg"
                      className="flex-1 h-20 rounded-md bg-[#00FFBB] text-zinc-950 font-black uppercase tracking-[0.2em] shadow-neon hover:bg-[#00e6a9] active:scale-95 group transition-all"
                    >
                      <div className="flex items-center gap-sm">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                        ABRIR NOVO TURNO
                      </div>
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate('/faturamento')}
                      size="lg"
                      className="flex-2 h-20 rounded-md bg-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-glow hover:bg-indigo-500 active:scale-95 group transition-all"
                    >
                      <div className="flex items-center gap-sm">
                        FECHAR TURNO & LANÇAR
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Button>
                  )}
                  {hasOpenCycle && (
                    <Button 
                      onClick={handleToggleTracking}
                      disabled={isProcessing}
                      className={cn(
                        "flex-1 h-20 rounded-md border border-white/10 font-black uppercase tracking-[0.2em] transition-all active:scale-95",
                        tracking.isActive ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-white/5 text-zinc-400"
                      )}
                    >
                      {tracking.isActive ? "PARAR GPS" : "INICIAR GPS"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* REAL TIME OPERATION */}
          <section className="relative flex flex-col gap-sm">
            <div className="flex items-center gap-sm px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] shadow-neon" />
              <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest md:tracking-wider text-zinc-500 italic">OPERAÇÃO EM TEMPO REAL</h3>
            </div>
            
            <Card className={cn(
              "border border-white/5 shadow-premium transition-all duration-500 overflow-hidden relative rounded-lg w-full min-h-[300px]",
              locationError ? "bg-red-500/10 border-red-500/30" : "bg-[#0B0C10]/40 backdrop-blur-3xl"
            )}>
              {/* DECORATIVE BACKDROP LABELS (Desktop Only) */}
              <div className="hidden lg:block absolute -right-20 -top-10 opacity-[0.03] select-none pointer-events-none rotate-12 z-0">
                <span className="text-[12rem] font-black italic font-display whitespace-nowrap">
                  {!hasOpenCycle ? 'OF-TURNO' : tracking.isActive ? 'SINAL OK' : 'AGUARDANDO'}
                </span>
              </div>

              <CardContent className="p-md sm:p-lg md:p-xl space-y-md md:space-y-lg relative z-10 flex flex-col gap-md">
                {/* Header/Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md border-b border-white/5 pb-md">
                  <div className="flex items-center gap-md md:gap-lg min-w-0">
                    <div className="relative shrink-0">
                      {tracking.isActive && !locationError && !tracking.isPaused && (
                        <motion.div 
                          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 bg-[#00FFBB] rounded-sm z-0 blur-md"
                        />
                      )}
                      <div className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-sm flex items-center justify-center shadow-premium transition-all duration-500 relative z-10 border",
                        locationError ? "bg-red-500/20 border-red-500/40 text-red-500" : 
                        tracking.isActive ? "bg-[#00FFBB] text-zinc-950 border-[#00FFBB]/50" : 
                        "bg-white/5 text-zinc-500 border-white/10"
                      )}>
                        {locationError ? <AlertTriangle size={24} /> : tracking.isActive ? <Gauge size={24} /> : <Play size={24} />}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-xs mb-xs">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", tracking.isActive ? "bg-[#00FFBB]" : "bg-zinc-700")} />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500">OPERACIONAL</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "text-lg md:text-2xl font-black uppercase tracking-tight md:tracking-tighter italic font-display leading-none truncate",
                          locationError ? "text-red-500" : tracking.isActive ? "text-white" : "text-zinc-600"
                        )}>
                          {locationError ? 'GEOBLOQUEIO' : !hasOpenCycle ? 'FORA DE TURNO' : tracking.isActive ? (tracking.isPaused ? 'PAUSADO' : 'SINAL ATIVO') : 'AGUARDANDO SINAL'}
                        </h3>
                        {tracking.isActive && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/driving-mode')}
                            className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-all shrink-0 group shadow-premium"
                          >
                            <Maximize2 size={10} className="text-zinc-500 group-hover:text-[#00FFBB]" />
                            <span className="text-[8px] font-black text-zinc-500 group-hover:text-white uppercase tracking-widest">Aumentar</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {tracking.isActive && !locationError && (
                    <div className="text-left sm:text-right shrink-0 bg-white/5 px-md py-sm rounded-sm border border-white/10 w-full sm:w-auto shadow-premium">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#00FFBB]/60 mb-0.5">VELOCIDADE</p>
                      <p className="text-xl md:text-2xl font-black font-display italic text-[#00FFBB] tabular-nums whitespace-nowrap leading-none">
                        {Math.round(tracking.avgSpeed || 0)} <span className="text-[10px] text-zinc-600 ml-0.5 font-sans not-italic">KM/H</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                {tracking.isActive && !locationError && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
                    <MetricItem label="KM TOTAL" value={tracking.distance || 0} unit="KM" icon={Navigation} />
                    <MetricItem label="PRODUTIVO" value={tracking.productiveDistance || 0} unit="KM" icon={Activity} accent="text-[#00FFBB]" />
                    <MetricItem label="OCIOSO" value={tracking.idleDistance || 0} unit="KM" icon={MapPin} accent="text-orange-500" />
                    <MetricItem label="EFICÁCIA" value={((tracking.productiveDistance || 0) / (tracking.distance || 1) * 100).toFixed(0)} unit="%" icon={TrendingUp} />
                  </div>
                )}

                {/* Map */}
                {tracking.isActive && !locationError && (
                  <div className="rounded-md overflow-hidden border border-white/5 shadow-premium min-h-[300px] md:min-h-[400px] relative">
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

                {/* Tracking Pending */}
                {hasOpenCycle && !tracking.isActive && (
                  <div className="flex flex-col items-center justify-center py-lg sm:py-xl text-center space-y-md">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-zinc-700 relative">
                       <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" />
                       <MapIcon size={32} className="relative z-10" />
                    </div>
                    <div className="flex flex-col items-center gap-md">
                      <Button 
                        onClick={handleToggleTracking}
                        className="w-full sm:w-auto bg-[#00FFBB]/10 hover:bg-[#00FFBB]/20 text-[#00FFBB] rounded-full px-12 py-5 text-[11px] font-black uppercase tracking-widest border border-[#00FFBB]/20 shadow-neon"
                      >
                        CONECTAR AGORA
                      </Button>
                      
                      <p className="text-zinc-400 font-medium text-xs leading-relaxed max-w-full text-center mt-xs px-md">
                        O rastreamento via satélite não está conectado. Inicie o GPS para registrar seus percursos.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* RIGHT COLUMN - INSIGHTS & STATS (4 COL) */}
        <div className="lg:col-span-4 flex flex-col gap-section min-h-0">
          
          {/* DAILY STATS BOX */}
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow" />
              <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest md:tracking-wider text-zinc-500 italic">RESUMO OPERACIONAL</h3>
            </div>
            <Card className="bg-[#0B0C10]/40 border border-white/5 rounded-lg overflow-hidden backdrop-blur-xl shrink-0">
              {/* Decorative Backdrop - Desktop Only */}
              <div className="hidden lg:block absolute -left-10 -bottom-10 opacity-[0.02] select-none pointer-events-none -rotate-6">
                <span className="text-[10rem] font-black italic font-display whitespace-nowrap">METRICA</span>
              </div>
              <CardContent className="p-md md:p-lg flex flex-col gap-md relative z-10">
                <div className="flex flex-col gap-md">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-md">
                      <div className="w-9 h-9 rounded-xs bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all duration-300">
                        <TrendingUp size={16} />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">LUCRO / KM</p>
                    </div>
                    <p className="text-lg font-black text-white italic font-display tabular-nums">
                      {profitStats && tracking.distance > 0 ? formatCurrency(profitStats.profit / tracking.distance) : 'R$ 0,00'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-md">
                      <div className="w-9 h-9 rounded-xs bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-500 group-hover:text-zinc-950 transition-all duration-300">
                        <Clock size={16} />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TEMPO ÚTIL</p>
                    </div>
                    <p className="text-lg font-black text-white italic font-display">68%</p>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-md">
                      <div className="w-9 h-9 rounded-xs bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/10 group-hover:bg-orange-500 group-hover:text-zinc-950 transition-all duration-300">
                        <Car size={16} />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">CONSUMO</p>
                    </div>
                    <p className="text-lg font-black text-white italic font-display tabular-nums">
                      {currentVehicle?.kmPerLiter || '--'} <span className="text-[10px] text-zinc-600 font-sans not-italic">KM/L</span>
                    </p>
                  </div>
                </div>

                <Button 
                   onClick={() => navigate('/analytics-pro')}
                   className="w-full h-14 bg-white/5 hover:bg-[#00FFBB]/10 text-zinc-500 hover:text-[#00FFBB] text-[10px] font-black uppercase tracking-[0.2em] rounded-sm border border-white/5 transition-all shadow-premium"
                >
                  VER ANÁLISE COMPLETA
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* INTELLIGENCE MODULE */}
          <IntelligencePanel 
            currentCycle={openCycle || null}
            history={cycles}
            entries={currentCycleEntries}
            kmDriven={tracking.distance || 0}
            durationMs={activeTime}
            currentNet={profitStats?.profit || todayTotalEarnings}
            fuelExpense={safeNumber(openCycle?.fuel_expense)}
            allEntries={financialEntries}
            vehicle={currentVehicle}
            plan={plan}
            onUpgrade={() => setPaywallOpen(true)}
          />

          {/* RECENT HISTORY */}
          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest md:tracking-wider text-zinc-500 italic">ÚLTIMOS CICLOS</h3>
              <button 
                onClick={() => navigate('/reports')} 
                className="text-[9px] font-black text-[#00FFBB] uppercase tracking-widest transition-all hover:scale-105"
              >
                VER TUDO
              </button>
            </div>
            
            <div className="flex flex-col gap-sm">
              {cycles.slice(0, 3).map((cycle) => (
                <motion.div
                  key={cycle.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/cycle/${cycle.id}`)}
                  className="p-md rounded-sm bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-sm">
                    <div className="w-10 h-10 rounded-xs bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-[#00FFBB] transition-colors">
                      <History size={18} />
                    </div>
                    <div className="space-y-xs">
                      <p className="text-xs font-black text-white uppercase tracking-tight">
                        {cycle.start_time ? format(parseISO(cycle.start_time), "dd MMM", { locale: ptBR }) : 'S/ DATA'}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">
                        {formatCurrency(cycle.total_amount)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700 group-hover:text-white" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <QuickActionsMenu />
      <PostTripActionSheet />
    </div>
  );
};
