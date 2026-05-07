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
  Map as MapIcon
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
import { UserRole } from '../types';

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
        "p-5 md:p-8 rounded-[1.25rem] md:rounded-[2rem] bg-white/5 border border-white/5 flex flex-col gap-3 transition-all duration-300 backdrop-blur-md hover:border-[#00FFBB]/20 group overflow-hidden",
        isLarge && "col-span-1 bg-white/10 border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-row">
        <div className={cn("shrink-0 p-1.5 rounded-lg bg-zinc-900/50 border border-white/5", accent === "text-[#00FFBB]" ? "text-[#00FFBB]" : "text-zinc-500")}>
          <Icon size={12} strokeWidth={2.5} />
        </div>
        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500 no-wrap italic">{label}</p>
      </div>
      <div className="flex items-baseline gap-1 mt-1 overflow-hidden flex-row">
        <motion.p 
          key={typeof value === 'number' ? Math.floor(value * 10) : value}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "font-black tracking-widest tabular-nums font-display italic leading-tight no-wrap",
            isLarge ? "text-2xl md:text-4xl text-white" : "text-lg md:text-2xl text-zinc-100",
            accent !== "text-white" && !isLarge && accent
          )}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </motion.p>
        {unit && (
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest shrink-0 italic">{unit}</span>
        )}
      </div>
    </motion.div>
  );
}

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

  const now = new Date();
  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'BOM DIA';
    if (hour < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  }, [now]);

  const openCycle = useMemo(() => (cycles || []).find((c: any) => c?.status === 'open') || null, [cycles]);

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

  const activeInsight = useMemo(() => {
    if (!openCycle) return "Conecte o sistema para processar monitoramento em tempo real.";
    if (currentEarnings === 0) return "Processamento inicial concluído. Aguardando dados de faturamento.";
    if (goalProgress < 50) return "Eficácia operacional em 48%. Mantenha o ritmo planejado.";
    if (goalProgress < 100) return "Aproximação do target detectada. 18% restante para conclusão.";
    return "Protocolo diário concluído. Eficácia de 100% atingida.";
  }, [openCycle, currentEarnings, goalProgress]);

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
    <div className="space-y-6 md:space-y-10 max-w-[1200px] mx-auto overflow-x-hidden w-full min-w-0 pb-32 px-4 md:px-10">
      {/* HEADER / HERO SECTION */}
      <header className="flex justify-between items-start pt-6 md:pt-10 gap-4">
        <div className="space-y-1 relative min-w-0 flex-1">
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-[#00FFBB]/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-col">
            <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-black tracking-tighter text-white leading-[1.2] truncate italic font-display">
              {greeting}, <span className="text-[#00FFBB] uppercase">{settings.name?.split(' ')[0] || 'OPERADOR'}</span>
            </h1>
            <div className="mt-2 flex items-center justify-between gap-6 overflow-hidden">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2 no-wrap">
                <Calendar size={12} className="text-zinc-600 shrink-0" />
                {format(now, "d/MM", { locale: ptBR })}
              </p>
              {isMobile && <div className="shrink-0"><SyncIndicator variant="minimal" /></div>}
            </div>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/settings')}
          className="rounded-2xl bg-white/5 w-14 h-14 flex items-center justify-center border border-white/10 shadow-2xl transition-all hover:border-[#00FFBB]/40 hover:bg-white/10 group active:scale-90"
        >
          <Settings size={22} className="text-zinc-400 group-hover:text-[#00FFBB] transition-colors" />
        </motion.button>
      </header>

      {/* MAIN VALUE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group mb-2"
      >
        <div className="absolute -inset-8 bg-gradient-to-br from-[#00FFBB]/10 via-transparent to-indigo-500/10 rounded-[3rem] blur-3xl opacity-40 pointer-events-none" />
        <Card className="border-none bg-[#0B0C10]/40 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-[1.5rem] md:rounded-[3rem] overflow-hidden relative border border-white/5 border-beam-container">
          <div className="border-beam" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FFBB]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <CardContent className="p-6 md:p-12 space-y-8 md:space-y-10">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-3 md:space-y-4 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00FFBB] shadow-[0_0_15px_rgba(0,255,187,0.7)] animate-pulse" />
                  <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 truncate no-wrap">SISTEMA FINANCEIRO ATIVO</p>
                </div>
                <PriceDisplay value={currentEarnings} size={isMobile ? 'lg' : 'xl'} className="text-white" />
              </div>
              {hasOpenCycle && (
                <div className="bg-[#00FFBB]/10 text-[#00FFBB] px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#00FFBB]/20 shadow-lg shadow-[#00FFBB]/5 shrink-0 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] animate-ping" />
                  PAINEL CONECTADO
                </div>
              )}
            </div>

            {profitStats && (
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest no-wrap">DÉBITOS TOTAIS</p>
                  <PriceDisplay 
                    value={profitStats.expenses + profitStats.dailyFixed} 
                    prefix="R$-" 
                    size="md" 
                    className="text-rose-500" 
                  />
                </div>
                <div className="space-y-2 border-l border-white/5 pl-4 md:pl-8">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest no-wrap">LUCRO LÍQUIDO</p>
                  <PriceDisplay 
                    value={profitStats.profit} 
                    size="md" 
                    className="text-[#00FFBB] shadow-[0_0_20px_rgba(0,255,187,0.1)]" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">TARGET DIÁRIO</span>
                <span className="text-sm font-black text-[#00FFBB] tabular-nums italic font-display tracking-widest">
                  <CountUp value={goalProgress} formatter={(val) => `${Math.round(val)}%`} duration={2} />
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-[#00FFBB] to-[#00FFBB]/40 rounded-full shadow-[0_0_20px_rgba(0,255,187,0.4)]"
                />
              </div>
            </div>

            <Button 
              onClick={() => hasOpenCycle ? navigate('/faturamento') : handleStartCycle()}
              disabled={isProcessing}
              size="lg"
              className={cn(
                "w-full h-20 rounded-[2rem] transition-all active:scale-95 group",
                hasOpenCycle ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-[#00FFBB] text-zinc-950 hover:bg-[#00e6a9]"
              )}
            >
              <div className="relative flex items-center justify-center gap-3">
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : hasOpenCycle ? (
                  <>
                    <span className="text-sm font-black uppercase tracking-[0.3em]">ANALISAR OPERAÇÃO</span>
                    <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black uppercase tracking-[0.3em]">INICIAR OPERAÇÃO</span>
                    <Play size={18} fill="currentColor" />
                  </>
                )}
              </div>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* OPERATIONAL STATUS */}
      <div className="pt-6">
        <Card className={cn(
          "border border-white/5 shadow-2xl transition-all duration-500 overflow-hidden relative tracking-card w-full max-w-full rounded-[3rem]",
          locationError ? "bg-red-500/10 border-red-500/30" : "bg-[#0B0C10]/40 backdrop-blur-3xl"
        )}>
        <CardContent className="p-8 md:p-12 relative z-10 space-y-10 card-content">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 md:gap-10 min-w-0">
              <div className="relative shrink-0">
                {tracking.isActive && !locationError && !tracking.isPaused && (
                  <motion.div 
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-[#00FFBB] rounded-[1.5rem] z-0 blur-md"
                  />
                )}
                <div className={cn(
                  "w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all duration-500 relative z-10 border",
                  locationError ? "bg-red-500/20 border-red-500/40 text-red-500" : 
                  tracking.isActive ? "bg-[#00FFBB] text-zinc-950 border-[#00FFBB]/50 shadow-[0_0_30px_rgba(0,255,187,0.2)]" : 
                  "bg-white/5 text-zinc-500 border-white/10"
                )}>
                  {locationError ? <AlertTriangle size={28} /> : tracking.isActive ? <Gauge size={28} /> : <Play size={28} />}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 no-wrap">
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600 no-wrap">RASTREAMENTO</p>
                  {tracking.isActive && !locationError && !tracking.isPaused && (
                    <div className="flex items-center gap-2 bg-[#00FFBB]/10 px-3 py-1 rounded-full shrink-0 border border-[#00FFBB]/20">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-[#00FFBB] animate-pulse" />
                      <span className="text-[8px] font-black text-[#00FFBB] uppercase tracking-widest no-wrap">SINC ATIVO</span>
                    </div>
                  )}
                  {tracking.isActive && !locationError && !tracking.isPaused && (
                    <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full shrink-0 border border-white/5">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest no-wrap">SINAL ESTÁVEL - SP</span>
                    </div>
                  )}
                </div>
                <h3 className={cn(
                  "text-2xl md:text-3xl font-black uppercase tracking-tighter truncate italic font-display",
                  locationError ? "text-red-500" : tracking.isActive ? "text-white" : "text-zinc-700"
                )}>
                  {locationError ? 'GEOBLOQUEIO' : !hasOpenCycle ? 'OF-TURNO' : tracking.isActive ? (tracking.isPaused ? 'P-READY' : 'EM ROTA') : 'SINC'}
                </h3>
              </div>
            </div>
            
            {tracking.isActive && !locationError && (
              <div className="text-right shrink-0 bg-white/5 px-6 md:px-10 py-4 rounded-[2rem] border border-white/5 shadow-inner backdrop-blur-xl">
                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1">TIMER</p>
                <p className="text-xl md:text-4xl font-black font-display italic text-[#00FFBB] tabular-nums drop-shadow-[0_0_15px_rgba(0,255,187,0.3)]">
                  {formatDuration(activeTime)}
                </p>
              </div>
            )}
          </div>

          {tracking.isActive && !locationError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <MetricItem 
          label="KM TOTAL" 
          value={tracking.distance || 0} 
          unit="KM"
          icon={Navigation}
        />
        <MetricItem 
          label="LUCRO" 
          value={tracking.productiveDistance || 0} 
          unit="KM"
          icon={Activity}
          accent="text-[#00FFBB]"
        />
        <MetricItem 
          label="IDLE" 
          value={tracking.idleDistance || 0} 
          unit="KM"
          icon={MapPin}
          accent="text-orange-500"
        />
        <MetricItem 
          label="VELOCIDADE" 
          value={Math.round(tracking.avgSpeed || 0)} 
          unit="KM/H"
          icon={Gauge}
        />
      </div>
          )}

          {tracking.isActive && !locationError && (
            <div className="mt-4 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl min-h-[350px] relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent z-10 pointer-events-none opacity-40" />
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

          <div className="grid grid-cols-2 gap-6">
            {!hasOpenCycle ? (
              <Button 
                onClick={handleStartCycle}
                disabled={isProcessing}
                variant="primary"
                className="col-span-2 h-24 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.25em] px-10 shadow-[0_0_30px_rgba(0,255,187,0.2)]"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <>
                    <Play size={24} fill="currentColor" />
                    INICIAR OPERAÇÃO
                  </>
                )}
              </Button>
            ) : !tracking.isActive && !locationError ? (
              <Button 
                onClick={handleToggleTracking}
                disabled={isProcessing}
                variant="primary"
                className="col-span-2 h-24 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.25em] px-10 shadow-[0_0_30px_rgba(0,255,187,0.2)]"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  <>
                    <Gauge size={24} fill="currentColor" />
                    CONECTAR RASTREAMENTO
                  </>
                )}
              </Button>
            ) : tracking.isActive && !locationError ? (
              <>
                <Button 
                  onClick={() => tracking.isPaused ? resumeTracking?.() : pauseTracking?.()}
                  disabled={isProcessing}
                  variant="outline"
                  className="h-24 rounded-[2.5rem] uppercase tracking-[0.2em] text-[11px] font-black border-white/10 hover:bg-white/5"
                >
                  {tracking.isPaused ? <><Play size={20} fill="currentColor" /> RESUME</> : <><Pause size={20} fill="currentColor" /> PAUSE</>}
                </Button>
                <Button 
                  onClick={handleToggleTracking}
                  disabled={isProcessing}
                  variant="danger"
                  className="h-24 rounded-[2.5rem] uppercase tracking-[0.2em] text-[11px] font-black"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><Square size={20} fill="currentColor" /> STOP</>}
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* STRATEGIC MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <motion.div whileTap={{ scale: 0.98 }}>
          <Card className="border-none bg-[#0B0C10]/40 backdrop-blur-3xl shadow-2xl rounded-[1.5rem] md:rounded-[3rem] overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
              <div className="flex items-center gap-4 text-zinc-600">
                <div className="p-2 md:p-3 rounded-2xl bg-white/5">
                  <Target size={18} />
                </div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">TARGET DIÁRIO</p>
              </div>
              <PriceDisplay value={dailyGoal} size="lg" className="text-white" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.98 }}>
          <Card className="border-none bg-[#0B0C10]/40 backdrop-blur-3xl shadow-2xl rounded-[1.5rem] md:rounded-[3rem] overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
              <div className="flex items-center gap-4 text-orange-500">
                <div className="p-2 md:p-3 rounded-2xl bg-orange-500/10">
                  <TrendingUp size={18} />
                </div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">DELTA RESTANTE</p>
              </div>
              <PriceDisplay value={remainingGoal} size="lg" className="text-orange-500" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* INTELLIGENCE MODULE */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => plan === 'free' && setPaywallOpen(true)}
        className="relative group cursor-pointer"
      >
        <div className={cn(
          "absolute -inset-[2px] rounded-[1.5rem] md:rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-500",
          plan === 'pro' ? "bg-indigo-500" : "bg-[#00FFBB]"
        )} />
        <Card className="bg-[#0B0C10]/60 border border-white/5 rounded-[1.5rem] md:rounded-[3rem] relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute top-0 right-0 p-6 md:p-10 opacity-[0.03] text-white">
            <Gauge size={100} />
          </div>
          <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-start gap-4 md:gap-8 relative z-10">
              <div className={cn(
                "w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.5rem] flex items-center justify-center shrink-0 border",
                plan === 'pro' ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-[#00FFBB]/5 border-[#00FFBB]/20 text-[#00FFBB]"
              )}>
                 {plan === 'pro' ? <Trophy size={24} /> : <Car size={24} />}
              </div>
             <div className="space-y-2 md:space-y-3">
               <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">
                 {plan === 'pro' ? 'ASSISTENTE DE PERFORMANCE' : 'INTELIGÊNCIA PRO'}
               </p>
               <p className="text-base md:text-lg font-bold leading-tight md:leading-relaxed text-zinc-100 max-w-lg italic font-display">
                 {plan === 'pro' ? activeInsight : 'Ative algoritmos avançados para maximizar seus ganhos.'}
               </p>
               {plan === 'free' && (
                 <div className="flex items-center gap-2 text-[9px] font-black text-[#00FFBB] uppercase tracking-[0.3em] mt-2">
                   UPGRADE ELITE <ChevronRight size={10} />
                 </div>
               )}
             </div>
          </CardContent>
        </Card>
      </motion.div>

      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">HISTÓRICO RECENTE</h3>
          </div>
          <button onClick={() => navigate('/reports')} className="text-[9px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] hover:opacity-80 transition-opacity">FULL DATA</button>
        </div>
        <div className="space-y-3 md:space-y-4">
          {cycles.slice(0, 3).map((cycle) => (
            <motion.div
              key={cycle.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/faturamento`)}
              className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/5 border border-white/5 backdrop-blur-xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-[#00FFBB] group-hover:text-zinc-950 transition-all">
                  <History className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-white italic font-display">
                    {cycle.start_time ? format(parseISO(cycle.start_time), "dd 'de' MMMM", { locale: ptBR }) : 'Data Indisponível'}
                  </p>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    {cycle.total_km?.toFixed(1)} km <span className="mx-2 opacity-30">|</span> {formatCurrency(cycle.total_amount)}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-zinc-700 group-hover:text-[#00FFBB] transition-colors" />
            </motion.div>
          ))}
        </div>
      </section>

      <QuickActionsMenu />
      <PostTripActionSheet />
    </div>
  );
};
