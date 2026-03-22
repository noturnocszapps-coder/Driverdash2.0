import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import {
  formatCurrency,
  cn,
  calculateDailyFixedCost,
  calculateEfficiencyMetrics,
  formatKm,
  formatDuration,
  calculateDriverScore,
  consolidateDailyData,
} from '../utils';
import { useConsolidatedAnalytics } from '../hooks/useConsolidatedAnalytics';
import { Card, CardContent, Button } from '../components/UI';
import {
  TrendingUp,
  Clock,
  Target,
  Zap,
  LayoutGrid,
  Plus,
  ChevronRight,
  Navigation,
  Calendar,
  AlertCircle,
  Gauge,
  Map as MapIcon,
  Award,
  Info,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfDay, isSameDay, subDays, format, differenceInMinutes, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSupabaseConfigured } from '../lib/supabase';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { motion } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { AIRealTimeAlerts } from '../components/AIRealTimeAlerts';

const safeNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const safeString = (value: any, fallback = ''): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

export const Dashboard = () => {
  const store = useDriverStore();

  const cycles = store?.cycles || [];
  const importedReports = store?.importedReports || [];
  const settings = store?.settings || {};
  const startCycle = store?.startCycle;
  const checkAndCloseCycles = store?.checkAndCloseCycles;
  const isSaving = !!store?.isSaving;
  const tracking = store?.tracking || {
    isActive: false,
    isLoading: false,
    distance: 0,
    productiveDistance: 0,
    idleDistance: 0,
    avgSpeed: 0,
    duration: 0,
    stoppedTime: 0,
    isProductive: false,
  };
  const startTracking = store?.startTracking;
  const stopTracking = store?.stopTracking;
  const vehicles = store?.vehicles || [];

  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'manual' | 'imported'>('all');

  const today = useMemo(() => startOfDay(new Date()), []);
  const last7DaysStart = useMemo(() => subDays(today, 6), [today]);

  const consolidated = useConsolidatedAnalytics(last7DaysStart, today, filter) || {};
  const last7DaysData = consolidated.dailyData || [];
  const last7DaysTotals = consolidated.totals || {
    totalRevenue: 0,
    profit: 0,
    totalKm: 0,
  };
  const averages = consolidated.averages || {};
  const aiIntelligence = consolidated.aiIntelligence || {
    efficiencyTrend: 0,
    bestHourByDay: {},
  };

  const todayData = useMemo(() => {
    const found = last7DaysData.find((d: any) => d?.date && isSameDay(d.date, today));
    if (found) return found;

    try {
      return (
        consolidateDailyData(today, cycles, importedReports, settings, tracking, filter) || {
          totalRevenue: 0,
          totalKm: 0,
          rideKm: 0,
          idleKm: 0,
          profit: 0,
          efficiency: 0,
          uber: 0,
          noventanove: 0,
          indriver: 0,
          extra: 0,
        }
      );
    } catch (error) {
      console.error('[Dashboard] consolidateDailyData error:', error);
      return {
        totalRevenue: 0,
        totalKm: 0,
        rideKm: 0,
        idleKm: 0,
        profit: 0,
        efficiency: 0,
        uber: 0,
        noventanove: 0,
        indriver: 0,
        extra: 0,
      };
    }
  }, [last7DaysData, today, cycles, importedReports, settings, tracking, filter]);

  const handleToggleTracking = async () => {
    if (tracking?.isActive) {
      stopTracking?.();
      return;
    }

    try {
      if (navigator?.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state === 'denied') {
          setLocationError('Permissão de localização negada. Por favor, habilite nas configurações do navegador.');
          return;
        }
      }

      startTracking?.();
      setLocationError(null);
    } catch {
      startTracking?.();
    }
  };

  useEffect(() => {
    try {
      checkAndCloseCycles?.();
    } catch (error) {
      console.error('[Dashboard] checkAndCloseCycles error:', error);
    }

    const timer = setInterval(() => {
      setNow(new Date());
      try {
        checkAndCloseCycles?.();
      } catch (error) {
        console.error('[Dashboard] interval checkAndCloseCycles error:', error);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [checkAndCloseCycles]);

  const openCycle = useMemo(() => {
    return (cycles || []).find((c: any) => c?.status === 'open') || null;
  }, [cycles]);

  const currentVehicle = useMemo(() => {
    return (vehicles || []).find((v: any) => v?.id === settings?.currentVehicleProfileId) || null;
  }, [vehicles, settings?.currentVehicleProfileId]);

  const profitStats = useMemo(() => {
    if (!openCycle) return null;

    const earnings = safeNumber(openCycle?.total_amount);
    const expenses =
      safeNumber(openCycle?.fuel_expense) +
      safeNumber(openCycle?.food_expense) +
      safeNumber(openCycle?.other_expense);

    const fixedCosts = currentVehicle?.fixedCosts || settings?.fixedCosts || {};
    const dailyFixed = safeNumber(calculateDailyFixedCost(fixedCosts));
    const profit = earnings - expenses - dailyFixed;

    return { earnings, expenses, dailyFixed, profit };
  }, [openCycle, settings?.fixedCosts, currentVehicle]);

  const efficiencyStats = useMemo(() => {
    if (!openCycle) return null;

    try {
      const consolidatedCycle = {
        ...openCycle,
        total_amount: safeNumber(todayData?.totalRevenue),
        total_km: safeNumber(todayData?.totalKm),
        ride_km: safeNumber(todayData?.rideKm),
        displacement_km: safeNumber(todayData?.idleKm),
        uber_amount: safeNumber(todayData?.uber),
        noventanove_amount: safeNumber(todayData?.noventanove),
        indriver_amount: safeNumber(todayData?.indriver),
        extra_amount: safeNumber(todayData?.extra),
      };

      return {
        ...calculateEfficiencyMetrics(consolidatedCycle, settings),
        totalKm: safeNumber(todayData?.totalKm),
        rideKm: safeNumber(todayData?.rideKm),
        displacementKm: safeNumber(todayData?.idleKm),
        efficiencyPercentage: safeNumber(
          safeNumber(todayData?.totalKm) > 0
            ? (safeNumber(todayData?.rideKm) / safeNumber(todayData?.totalKm)) * 100
            : 0
        ),
      };
    } catch (error) {
      console.error('[Dashboard] efficiencyStats error:', error);
      return {
        grossPerKm: 0,
        netPerKm: 0,
        profitPerKm: 0,
        totalKm: 0,
        rideKm: 0,
        displacementKm: 0,
        efficiencyPercentage: 0,
      };
    }
  }, [openCycle, todayData, settings]);

  const driverScore = useMemo(() => {
    try {
      if (!efficiencyStats) return null;
      return calculateDriverScore(efficiencyStats);
    } catch (error) {
      console.error('[Dashboard] driverScore error:', error);
      return null;
    }
  }, [efficiencyStats]);

  const smartAlerts = useMemo(() => {
    if (!tracking?.isActive) return [];

    const alerts: Array<{ id: string; message: string; type: 'warning' | 'success' | 'info' }> = [];
    const distance = safeNumber(tracking?.distance);
    const productiveDistance = safeNumber(tracking?.productiveDistance);
    const idleDistance = safeNumber(tracking?.idleDistance);
    const stoppedTime = safeNumber(tracking?.stoppedTime);
    const efficiency = distance > 0 ? (productiveDistance / distance) * 100 : 0;

    if (idleDistance > 5 && efficiency < 30) {
      alerts.push({
        id: 'high-idle',
        message: 'Você está rodando vazio. Considere mudar de região.',
        type: 'warning',
      });
    }

    if (efficiency > 80 && distance > 2) {
      alerts.push({
        id: 'high-efficiency',
        message: 'Ótimo desempenho agora! Continue assim.',
        type: 'success',
      });
    }

    if (stoppedTime > 900000 && !tracking?.isProductive) {
      alerts.push({
        id: 'long-idle',
        message: 'Muito tempo parado. Considere se movimentar.',
        type: 'info',
      });
    }

    return alerts;
  }, [tracking]);

  const cycleProgress = useMemo(() => {
    if (!openCycle?.start_time) return null;

    const start = new Date(openCycle.start_time);
    const total = 24 * 60;
    const elapsed = differenceInMinutes(now, start);
    const remaining = Math.max(0, total - elapsed);
    const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));

    return {
      percent,
      remainingHours: Math.floor(remaining / 60),
      remainingMinutes: remaining % 60,
    };
  }, [openCycle, now]);

  const stats = useMemo(() => {
    const chartData = (last7DaysData || []).map((day: any) => ({
      name: format(day?.date || today, 'EEE', { locale: ptBR }),
      value: safeNumber(day?.totalRevenue),
      totalKm: safeNumber(day?.totalKm),
      profit: safeNumber(day?.profit),
      efficiency: safeNumber(day?.efficiency),
      date: day?.date || today,
      uber: safeNumber(day?.uber),
      noventanove: safeNumber(day?.noventanove),
      indriver: safeNumber(day?.indriver),
      extra: safeNumber(day?.extra),
    }));

    const total7Days = safeNumber(last7DaysTotals?.totalRevenue);
    const totalProfit7Days = safeNumber(last7DaysTotals?.profit);
    const totalKm7Days = safeNumber(last7DaysTotals?.totalKm);
    const avg = total7Days / 7;
    const avgEfficiency = totalKm7Days > 0 ? total7Days / totalKm7Days : 0;

    const sortedByValue = [...chartData].sort((a, b) => b.value - a.value);
    const sortedByEfficiency = [...chartData]
      .filter((d) => d.totalKm > 0)
      .sort((a, b) => a.efficiency - b.efficiency);

    const bestDay = sortedByValue[0] || null;
    const worstDayByEfficiency = sortedByEfficiency[0] || null;

    const alerts: Array<{
      id: string;
      type: 'warning' | 'danger';
      title: string;
      message: string;
    }> = [];

    if (total7Days > 0 && totalProfit7Days / total7Days < 0.3) {
      alerts.push({
        id: 'low-profit',
        type: 'warning',
        title: 'Margem de Lucro Baixa',
        message: 'Seu lucro semanal está abaixo de 30%. Considere reduzir gastos extras.',
      });
    }

    if (avgEfficiency > 0 && avgEfficiency < 1.5) {
      alerts.push({
        id: 'low-efficiency',
        type: 'warning',
        title: 'Baixa Eficiência (R$/km)',
        message: 'Sua média semanal está abaixo de R$ 1,50/km. Tente selecionar melhor as corridas.',
      });
    }

    const highCostCyclesCount = (cycles || []).reduce((count: number, c: any) => {
      const startTime = new Date(c?.start_time || now).getTime();
      const isRecent = new Date().getTime() - startTime < 7 * 24 * 60 * 60 * 1000;
      if (!isRecent) return count;

      const expenses =
        safeNumber(c?.fuel_expense) +
        safeNumber(c?.food_expense) +
        safeNumber(c?.other_expense) +
        safeNumber(calculateDailyFixedCost(settings?.fixedCosts || {}));

      return expenses > safeNumber(c?.total_amount) * 0.6 ? count + 1 : count;
    }, 0);

    if (highCostCyclesCount > 0) {
      alerts.push({
        id: 'high-cost',
        type: 'danger',
        title: 'Ciclos de Alto Custo',
        message: `Identificamos ${highCostCyclesCount} ciclo(s) esta semana com custos acima de 60% do faturamento.`,
      });
    }

    return {
      chartData,
      total7Days,
      totalProfit7Days,
      totalKm7Days,
      avg,
      avgEfficiency,
      bestDay,
      worstDayByEfficiency,
      alerts,
    };
  }, [last7DaysData, last7DaysTotals, cycles, settings, today, now]);

  const handleStartCycle = async () => {
    try {
      await startCycle?.();
    } catch (error) {
      console.error('[Dashboard] startCycle error:', error);
    }
  };

  const firstName = useMemo(() => {
    return safeString(settings?.name, 'Motorista').split(' ')[0] || 'Motorista';
  }, [settings?.name]);

  const dashboardMode = settings?.dashboardMode || 'merged';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24 md:pb-8"
    >
      <AIRealTimeAlerts todayData={todayData} aiIntelligence={aiIntelligence} averages={averages} />

      <div className="flex justify-between items-end px-1 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Visão Geral</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black tracking-tighter">Olá, {firstName}</h1>
            {driverScore && (
              <div
                className={cn(
                  'px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1',
                  driverScore?.color || 'border-zinc-700 text-zinc-400'
                )}
              >
                <Award size={10} />
                {driverScore?.label || 'Sem score'}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              )}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilter('manual')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                filter === 'manual'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              )}
            >
              Manual
            </button>
            <button
              onClick={() => setFilter('imported')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                filter === 'imported'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500'
              )}
            >
              IA
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <SyncIndicator />
          </div>
        </div>
      </div>

      <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award size={16} className="text-emerald-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Driver Score</h3>
            </div>

            <div
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                driverScore?.color || 'border-zinc-700 text-zinc-400'
              )}
            >
              {driverScore?.label || 'Sem Score'}
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
              {safeNumber(driverScore?.score)}
            </div>
            <div className="pb-1 space-y-1">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-4 h-1.5 rounded-full',
                      i < Math.round(safeNumber(driverScore?.score) / 20)
                        ? 'bg-emerald-500'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pontuação de Eficiência</p>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {safeString(driverScore?.explanation, 'Continue usando o app para receber mais insights de performance.')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-none bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Zap size={80} />
        </div>
        <CardContent className="p-6 space-y-4 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Resumo de Inteligência IA</h3>
            </div>

            {safeNumber(aiIntelligence?.efficiencyTrend) !== 0 && (
              <div
                className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1',
                  safeNumber(aiIntelligence?.efficiencyTrend) > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                )}
              >
                <TrendingUp
                  size={10}
                  className={safeNumber(aiIntelligence?.efficiencyTrend) < 0 ? 'rotate-180' : ''}
                />
                {Math.abs(safeNumber(aiIntelligence?.efficiencyTrend)).toFixed(1)}% Eficiência
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium leading-relaxed opacity-90">
              {safeNumber(todayData?.totalRevenue) > 0
                ? `Hoje você está com ${safeNumber(todayData?.efficiency).toFixed(0)}% de eficiência. ${
                    aiIntelligence?.bestHourByDay?.[getDay(today)]
                      ? `Seu melhor horário hoje costuma ser entre ${aiIntelligence.bestHourByDay[getDay(today)]}. `
                      : ''
                  }${
                    safeNumber(todayData?.idleKm) > 5
                      ? `Você rodou ${safeNumber(todayData?.idleKm).toFixed(1)}km ocioso, tente se posicionar melhor.`
                      : 'Ótimo controle de KM ocioso hoje!'
                  }`
                : 'Inicie seu ciclo para receber insights em tempo real sobre sua performance e melhores regiões.'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 rounded-xl p-3 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Melhor Horário (Hoje)</p>
                <p className="text-xs font-black">{aiIntelligence?.bestHourByDay?.[getDay(today)] || 'Analisando...'}</p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Tendência Semanal</p>
                <p className="text-xs font-black">
                  {safeNumber(aiIntelligence?.efficiencyTrend) > 0
                    ? 'Melhorando'
                    : safeNumber(aiIntelligence?.efficiencyTrend) < 0
                      ? 'Em Queda'
                      : 'Estável'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {openCycle && (
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shadow-inner shrink-0',
                    tracking?.isActive
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  )}
                >
                  <Navigation size={20} className={tracking?.isActive ? 'animate-pulse' : ''} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                    Rastreamento de KM
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {tracking?.isActive ? 'Rastreamento ativo' : 'Rastreamento pausado'}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleToggleTracking}
                disabled={tracking?.isLoading}
                className={cn(
                  'h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shrink-0',
                  tracking?.isActive
                    ? 'bg-zinc-950 text-white hover:bg-zinc-900 border-none'
                    : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 border-none'
                )}
              >
                {tracking?.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processando
                  </div>
                ) : tracking?.isActive ? (
                  'Encerrar'
                ) : (
                  'Iniciar'
                )}
              </Button>
            </div>

            {locationError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase tracking-wider">{locationError}</p>
              </div>
            )}

            {tracking?.isActive && (
              <>
                {smartAlerts.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {smartAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider',
                          alert.type === 'warning'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : alert.type === 'success'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        )}
                      >
                        <Info size={12} />
                        {alert.message}
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      KM Produtivo
                    </p>
                    <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
                      {safeNumber(tracking?.productiveDistance).toFixed(2)} km
                    </p>
                  </div>

                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      KM Ocioso
                    </p>
                    <p className="text-3xl font-black tracking-tighter text-zinc-500 dark:text-zinc-400">
                      {safeNumber(tracking?.idleDistance).toFixed(2)} km
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      Eficiência Atual
                    </p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white">
                      {safeNumber(tracking?.distance) > 0
                        ? ((safeNumber(tracking?.productiveDistance) / safeNumber(tracking?.distance)) * 100).toFixed(0)
                        : 0}
                      %
                    </p>
                  </div>

                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      Velocidade Média
                    </p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white">
                      {safeNumber(tracking?.avgSpeed).toFixed(1)} km/h
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/cycle-map/active')}
                  className="w-full h-12 mt-6 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl gap-2 border border-zinc-200 dark:border-zinc-700"
                >
                  <MapIcon size={16} />
                  Visualizar mapa do trajeto
                </Button>
              </>
            )}

            {!tracking?.isActive && safeNumber(tracking?.distance) > 0 && (
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Último rastreamento: {safeNumber(tracking?.distance).toFixed(2)} km
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {formatDuration(safeNumber(tracking?.duration))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(stats.alerts.length > 0 || stats.total7Days > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.alerts.length > 0 && (
            <div className="space-y-3">
              {stats.alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'p-4 rounded-2xl border flex gap-3 items-start',
                    alert.type === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                  )}
                >
                  <Zap size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-0.5">{alert.title}</p>
                    <p className="text-[11px] font-bold opacity-80 leading-relaxed">{alert.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {stats.total7Days > 0 && (
            <Card className="border-none bg-zinc-900 text-white shadow-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Insights da Semana</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Melhor Dia</p>
                    <p className="text-sm font-black text-emerald-400">
                      {stats.bestDay
                        ? `${stats.bestDay.name} (${formatCurrency(stats.bestDay.value)})`
                        : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pior Eficiência</p>
                    <p className="text-sm font-black text-red-400">
                      {stats.worstDayByEfficiency
                        ? `${stats.worstDayByEfficiency.name} (${formatCurrency(stats.worstDayByEfficiency.efficiency)}/km)`
                        : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Média R$/KM</p>
                    <p className="text-sm font-black text-blue-400">{formatCurrency(stats.avgEfficiency)}/km</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lucro Semanal</p>
                    <p className="text-sm font-black text-white">{formatCurrency(stats.totalProfit7Days)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isSupabaseConfigured && (
        <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Modo Offline</h3>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                Dados salvos apenas localmente. Entre para sincronizar com a nuvem.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="relative overflow-hidden border-none bg-zinc-900 text-white shadow-2xl shadow-zinc-900/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Navigation size={120} className="rotate-45" />
        </div>

        <CardContent className="p-8 space-y-8 relative z-10">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Faturamento do Ciclo</p>
              <h2 className="text-5xl font-black tracking-tighter break-words">
                {formatCurrency(safeNumber(openCycle?.total_amount))}
              </h2>
            </div>

            {openCycle && cycleProgress && (
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shrink-0">
                <Clock size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Fecha em {safeNumber(cycleProgress?.remainingHours)}h {safeNumber(cycleProgress?.remainingMinutes)}m
                </span>
              </div>
            )}
          </div>

          {profitStats && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Despesas</p>
                <p className="text-sm font-black text-red-400">
                  {formatCurrency(safeNumber(profitStats.expenses) + safeNumber(profitStats.dailyFixed))}
                </p>
              </div>
              <div className="col-span-2 text-right space-y-0.5">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lucro Estimado</p>
                <p className="text-2xl font-black text-emerald-400">
                  {formatCurrency(safeNumber(profitStats.profit))}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {openCycle ? (
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Iniciado às {openCycle?.start_time ? format(new Date(openCycle.start_time), 'HH:mm') : '--:--'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-400">
                    {safeNumber(cycleProgress?.percent).toFixed(0)}%
                  </span>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${safeNumber(cycleProgress?.percent)}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Zap size={32} className="text-zinc-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400 font-black uppercase tracking-widest">Nenhum ciclo ativo</p>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                    Toque em &quot;Iniciar Novo Ciclo&quot; para começar seu período de 24 horas.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!openCycle ? (
                <Button
                  onClick={handleStartCycle}
                  disabled={isSaving}
                  className="col-span-2 h-16 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      Iniciando...
                    </div>
                  ) : (
                    'Iniciar Novo Ciclo'
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setIsQuickEntryOpen(true)}
                    className="h-14 bg-white text-zinc-950 hover:bg-zinc-100 font-black rounded-2xl gap-2 text-sm"
                  >
                    <Plus size={18} />
                    Lançar Valor
                  </Button>

                  <Button
                    onClick={() => navigate('/faturamento')}
                    className="h-14 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl gap-2 text-sm border border-white/5"
                  >
                    <LayoutGrid size={18} />
                    Fechamento
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>

        {openCycle && (
          <div className="bg-white/[0.02] border-t border-white/5 px-8 py-5 grid grid-cols-4 gap-4">
            <PlatformMiniStat label="Uber" value={safeNumber(openCycle?.uber_amount)} color="bg-white" />
            <PlatformMiniStat label="99" value={safeNumber(openCycle?.noventanove_amount)} color="bg-yellow-500" />
            <PlatformMiniStat label="inDrive" value={safeNumber(openCycle?.indriver_amount)} color="bg-emerald-500" />
            <PlatformMiniStat label="Outros" value={safeNumber(openCycle?.extra_amount)} color="bg-blue-500" />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Target size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Meta Diária</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tighter">{formatCurrency(safeNumber(settings?.dailyGoal))}</p>
              {openCycle && safeNumber(openCycle?.total_amount) >= safeNumber(settings?.dailyGoal) && (
                <span className="text-[10px] font-bold text-emerald-500">Batida!</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <TrendingUp size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Média (7d)</p>
            </div>
            <p className="text-2xl font-black tracking-tighter">{formatCurrency(safeNumber(stats?.avg))}</p>
          </CardContent>
        </Card>
      </div>

      {openCycle && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 border-b border-zinc-50 dark:border-zinc-800/50 flex justify-between items-center gap-3">
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <Gauge size={16} className="text-emerald-500" />
                  Análise de Eficiência
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Total:</span>
                  <span className="text-xs font-black">{formatKm(safeNumber(efficiencyStats?.totalKm))}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-zinc-50 dark:divide-zinc-800/50">
                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Em Corrida</p>
                  <p className="text-sm font-black tracking-tight">{formatKm(safeNumber(efficiencyStats?.rideKm))}</p>
                </div>

                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Deslocamento</p>
                  <p className="text-sm font-black tracking-tight text-zinc-500">
                    {formatKm(safeNumber(efficiencyStats?.displacementKm))}
                  </p>
                </div>

                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">R$/km Bruto</p>
                  <p className="text-sm font-black tracking-tight text-emerald-500">
                    {formatCurrency(safeNumber(efficiencyStats?.grossPerKm)).replace('R$', '')}/km
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-4 grid grid-cols-3 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">R$/km Líquido</p>
                    <p className="text-xs font-black">{formatCurrency(safeNumber(efficiencyStats?.netPerKm))}/km</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm">
                    <Target size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Eficiência</p>
                    <p className="text-xs font-black text-blue-500">
                      {Math.round(safeNumber(efficiencyStats?.efficiencyPercentage))}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lucro/km Real</p>
                    <p className="text-xs font-black text-emerald-500">
                      {formatCurrency(safeNumber(efficiencyStats?.profitPerKm))}/km
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-visible">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Desempenho Semanal
            </h3>
            <button
              onClick={() => navigate('/reports')}
              className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-emerald-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                {dashboardMode === 'segmented' ? (
                  <>
                    <Bar dataKey="uber" stackId="a" fill="#ffffff" radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="noventanove" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="indriver" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="extra" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  </>
                ) : (
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                    {(stats?.chartData || []).map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        className={cn(
                          isSameDay(entry?.date || new Date(), new Date())
                            ? 'fill-emerald-500'
                            : 'fill-zinc-100 dark:fill-zinc-800'
                        )}
                      />
                    ))}
                  </Bar>
                )}

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }}
                  dy={10}
                />

                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const total = payload.reduce((acc, p) => acc + safeNumber(p?.value), 0);

                      return (
                        <div className="bg-zinc-900 text-white px-3 py-2 rounded-xl text-[10px] font-black shadow-2xl border border-white/5 space-y-1">
                          {dashboardMode === 'segmented' ? (
                            <>
                              {payload.map((p, i) =>
                                safeNumber(p?.value) > 0 ? (
                                  <div key={i} className="flex justify-between gap-4">
                                    <span className="text-zinc-400">{p?.name}:</span>
                                    <span>{formatCurrency(safeNumber(p?.value))}</span>
                                  </div>
                                ) : null
                              )}
                              <div className="pt-1 border-t border-white/10 flex justify-between gap-4">
                                <span className="text-emerald-400">Total:</span>
                                <span className="text-emerald-400">{formatCurrency(total)}</span>
                              </div>
                            </>
                          ) : (
                            <span>{formatCurrency(total)}</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <QuickEntryModal isOpen={isQuickEntryOpen} onClose={() => setIsQuickEntryOpen(false)} />
    </motion.div>
  );
};

const PlatformMiniStat = ({ label, value, color }: any) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xs font-black tracking-tight">{formatCurrency(safeNumber(value))}</span>
  </div>
);