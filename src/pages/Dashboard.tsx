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
  Clock
} from 'lucide-react';
import { startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { PostTripActionSheet } from '../components/PostTripActionSheet';

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    cycles = [],
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
    },
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    checkAndCloseCycles,
    vehicles = [],
    activeVehicleId,
  } = useDriverStore();

  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleToggleTracking = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (tracking?.isActive) {
        await stopTracking?.();
        toast.success("Rastreamento finalizado");
      } else {
        if (navigator?.permissions?.query) {
          const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (permission.state === 'denied') {
            setLocationError('Permissão de localização negada. Ative o GPS nas configurações.');
            setIsProcessing(false);
            return;
          }
        }
        await startTracking?.();
        setLocationError(null);
        toast.success("Rastreamento iniciado");
      }
    } catch (error: any) {
      toast.error("Erro ao alterar rastreamento");
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
    <div className="p-6 pb-32 space-y-6 max-w-lg mx-auto">
      {/* HEADER */}
      <header className="flex justify-between items-center">
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
        "border-none shadow-xl transition-all duration-500 overflow-hidden relative",
        locationError ? "bg-red-500 text-white" : tracking.isActive ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-white"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          {tracking.isActive ? <Zap size={80} /> : <Play size={80} />}
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
              tracking.isActive ? "bg-white/20" : "bg-white/5"
            )}>
              {locationError ? <AlertTriangle size={28} /> : tracking.isActive ? <Zap size={28} /> : <Play size={28} />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Status Operacional</p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {locationError ? 'Erro de Permissão' : tracking.isActive ? 'Rastreamento Ativo' : 'Rastreamento Desativado'}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!tracking.isActive ? (
              <Button 
                onClick={handleToggleTracking}
                loading={isProcessing}
                className="col-span-2 w-full bg-white text-zinc-950 hover:bg-zinc-100 font-black uppercase tracking-widest text-xs h-14 rounded-2xl border-none shadow-lg"
              >
                Ativar Rastreamento
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => tracking.isPaused ? resumeTracking?.() : pauseTracking?.()}
                  className="bg-zinc-950 text-white hover:bg-zinc-900 border-none font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-lg"
                >
                  {tracking.isPaused ? <><Play size={14} fill="currentColor" /> Retomar</> : <><Pause size={14} fill="currentColor" /> Pausar</>}
                </Button>
                <Button 
                  onClick={handleToggleTracking}
                  variant="danger"
                  className="bg-white/10 hover:bg-white/20 text-white border-none font-black uppercase tracking-widest text-xs h-14 rounded-2xl shadow-lg"
                >
                  <Square size={14} fill="currentColor" /> Encerrar
                </Button>
              </>
            )}
          </div>
          
          {locationError && (
            <div className="mt-4 p-3 bg-white/10 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">{locationError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CICLO ATUAL */}
      <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
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
