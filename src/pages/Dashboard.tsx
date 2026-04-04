import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDriverStore } from '../store';
import {
  formatCurrency,
  cn,
  calculateDailyFixedCost,
  safeNumber,
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
  Loader2
} from 'lucide-react';
import { startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { PostTripActionSheet } from '../components/PostTripActionSheet';
import { LiveTrackingMap } from '../components/LiveTrackingMap';

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
    <div className={cn(
      "p-3 md:p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1 transition-all duration-300 hover:bg-white/10",
      isLarge && "col-span-1 bg-white/10 border-white/10"
    )}>
      <div className="flex items-center gap-2">
        <Icon size={12} className={accent} />
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <motion.p 
          key={typeof value === 'number' ? Math.floor(value * 10) : value}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "font-black tracking-tighter metric-value",
            isLarge ? "text-2xl text-white" : "text-lg text-zinc-200",
            accent !== "text-white" && !isLarge && accent
          )}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </motion.p>
        {unit && (
          <span className="text-[10px] font-bold text-zinc-500 uppercase">{unit}</span>
        )}
      </div>
    </div>
  );
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    cycles = [],
    hasOpenCycle = false,
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
  } = useDriverStore();

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
  const currentEarnings = safeNumber(openCycle?.total_amount || 0);
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
      toast.error(error.message || "Erro ao abrir turno");
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
      toast.error(error.message || "Erro ao alterar rastreamento");
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
    <div className="p-4 md:p-6 space-y-5 max-w-lg mx-auto overflow-x-hidden w-full">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {greeting}, {settings.name?.split(' ')[0] || 'Motorista'}
          </h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/settings')}
          className="rounded-full bg-zinc-100 dark:bg-zinc-900"
        >
          <Settings size={20} />
        </Button>
      </header>

      {/* STATUS OPERACIONAL */}
      <Card className={cn(
        "border-none shadow-xl transition-all duration-500 overflow-hidden relative tracking-card w-full max-w-full",
        locationError ? "bg-red-500 text-white" : tracking.isActive ? "bg-zinc-900 text-white" : "bg-zinc-900 text-white"
      )}>
        {/* Background Accent for Active State */}
        {tracking.isActive && !locationError && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        )}
        
        <CardContent className="p-5 md:p-7 relative z-10 space-y-6">
          <AnimatePresence>
            {showResumeMessage && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-emerald-500/20 border border-emerald-500/20 rounded-xl p-2 flex items-center justify-center gap-2">
                  <Zap size={14} className="text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Rastreamento em andamento</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {tracking.isActive && !locationError && !tracking.isPaused && (
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500 rounded-2xl z-0"
                  />
                )}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 relative z-10",
                  locationError ? "bg-white/20" : tracking.isActive ? "bg-emerald-500 text-zinc-950" : "bg-white/5"
                )}>
                  {locationError ? <AlertTriangle size={28} /> : tracking.isActive ? <Zap size={28} /> : <Play size={28} />}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 truncate">Rastreamento Ativo</p>
                  {tracking.isActive && !locationError && !tracking.isPaused && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">AO VIVO</span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight truncate">
                  {locationError ? 'Erro GPS' : !hasOpenCycle ? 'Turno Fechado' : tracking.isActive ? (tracking.isPaused ? 'Pausado' : 'Ativo') : 'Aguardando'}
                </h3>
              </div>
            </div>
            
            {tracking.isActive && !locationError && (
              <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Tempo</p>
                <p className="text-lg font-black font-mono text-emerald-500">{formatDuration(activeTime)}</p>
              </div>
            )}
          </div>

          {/* GPS Status Label */}
          {tracking.isActive && !locationError && (
            <div className="flex items-center gap-2 px-1">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                tracking.gpsStatus === 'active' ? "bg-emerald-500 animate-pulse" : 
                tracking.gpsStatus === 'connecting' ? "bg-amber-500 animate-pulse" : "bg-red-500"
              )} />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                {tracking.gpsStatus === 'active' ? 'GPS Ativo' : 
                 tracking.gpsStatus === 'connecting' ? 'Conectando ao GPS...' : 'Sem sinal de GPS'}
              </p>
            </div>
          )}

          {tracking.isActive && !locationError && (
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <MetricItem 
                label="KM Total" 
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
                label="Velocidade Média" 
                value={Math.round(tracking.avgSpeed || 0)} 
                unit="km/h"
                icon={TrendingUp}
              />
            </div>
          )}

          {tracking.isActive && !locationError && (
            <div className="mt-2 rounded-2xl overflow-hidden border border-white/5 shadow-inner min-h-[180px]">
              <LiveTrackingMap 
                points={tracking.points || []} 
                stopPoints={tracking.stopPoints || []}
                isActive={tracking.isActive}
                isPaused={tracking.isPaused}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!hasOpenCycle ? (
              <Button 
                onClick={handleStartCycle}
                disabled={isProcessing}
                className="col-span-2 w-full bg-blue-600 text-white hover:bg-blue-700 font-black uppercase tracking-widest text-xs h-14 rounded-2xl border-none shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Abrindo turno...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    Abrir Turno
                  </>
                )}
              </Button>
            ) : !tracking.isActive && !locationError ? (
              <Button 
                onClick={handleToggleTracking}
                disabled={isProcessing}
                className="col-span-2 w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-600 font-black uppercase tracking-widest text-xs h-14 rounded-2xl border-none shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Iniciando rastreamento...
                  </>
                ) : (
                  <>
                    <Zap size={16} fill="currentColor" />
                    Ativar Rastreamento
                  </>
                )}
              </Button>
            ) : tracking.isActive && !locationError ? (
              <>
                <Button 
                  onClick={() => tracking.isPaused ? resumeTracking?.() : pauseTracking?.()}
                  disabled={isProcessing}
                  className="bg-zinc-800 text-white hover:bg-zinc-700 border-none font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  {tracking.isPaused ? <><Play size={14} fill="currentColor" /> Retomar</> : <><Pause size={14} fill="currentColor" /> Pausar</>}
                </Button>
                <Button 
                  onClick={handleToggleTracking}
                  disabled={isProcessing}
                  variant="danger"
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-none font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <><Square size={14} fill="currentColor" /> Encerrar</>}
                </Button>
              </>
            ) : null}
          </div>
          
          {locationError && (
            <div className="mt-6 space-y-4">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-100 leading-tight uppercase tracking-tight">
                    {locationError}
                  </p>
                  <p className="text-[10px] font-medium text-red-200/60 uppercase tracking-widest">
                    Verifique o ícone de cadeado na barra de endereços para resetar as permissões.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleToggleTracking}
                disabled={isProcessing}
                className="w-full h-14 rounded-2xl bg-white text-zinc-950 font-black uppercase tracking-widest hover:bg-zinc-100 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Tentar Novamente'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CICLO ATUAL */}
      <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <CardContent className="p-4 md:p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Faturamento do Ciclo</p>
              <h2 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
                {formatCurrency(currentEarnings)}
              </h2>
            </div>
            <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              24 Horas
            </div>
          </div>

          {profitStats && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Despesas Totais</p>
                <p className="text-lg font-black text-red-500">
                  {formatCurrency(profitStats.expenses + profitStats.dailyFixed)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lucro Estimado</p>
                <p className="text-lg font-black text-emerald-500">
                  {formatCurrency(profitStats.profit)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progresso da Meta</span>
              <span className="text-xs font-black text-emerald-500">{Math.round(goalProgress)}%</span>
            </div>
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress}%` }}
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              />
            </div>
          </div>

          <Button 
            onClick={() => navigate('/faturamento')}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 border-none font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
          >
            Ir para Fechamento <ChevronRight size={16} />
          </Button>
        </CardContent>
      </Card>

      {/* META DO DIA */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Target size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Sua Meta</p>
            </div>
            <p className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">
              {formatCurrency(dailyGoal)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none bg-white dark:bg-zinc-900 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <TrendingUp size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Faltam</p>
            </div>
            <p className="text-2xl font-black tracking-tighter text-orange-500">
              {formatCurrency(remainingGoal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* INSIGHT */}
      <Card className="border-none bg-indigo-600 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Zap size={60} />
        </div>
        <CardContent className="p-5 flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Info size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Insight do Assistente</p>
            <p className="text-sm font-bold leading-relaxed">
              {activeInsight}
            </p>
          </div>
        </CardContent>
      </Card>

      <QuickActionsMenu />
      <PostTripActionSheet />
    </div>
  );
};
