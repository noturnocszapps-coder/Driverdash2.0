import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  safeNumber,
} from '../utils';
import { useConsolidatedAnalytics } from '../hooks/useConsolidatedAnalytics';
import { Card, CardContent, Button } from '../components/UI';
import {
  TrendingUp,
  Clock,
  Target,
  Zap,
  Car,
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
  Eye,
  EyeOff,
  Pause,
  Square,
  Play,
  AlertTriangle,
  CheckCircle2,
  X,
  Mic,
  MicOff,
  Volume2,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfDay, isSameDay, subDays, format, differenceInMinutes, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSupabaseConfigured } from '../lib/supabase';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { FinancialEntryList } from '../components/FinancialEntryList';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { AIRealTimeAlerts } from '../components/AIRealTimeAlerts';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

const safeString = (value: any, fallback = ''): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
};

import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { PostTripActionSheet } from '../components/PostTripActionSheet';

export const Dashboard = () => {
  const {
    cycles = [],
    importedReports = [],
    settings = {
      dailyGoal: 250,
      name: 'Motorista',
      vehicle: 'Veículo Padrão',
      avgRideValue: 15,
      avgRideKm: 5,
      kmPerLiter: 10,
      fuelPrice: 5.80,
      activePlatforms: ['uber_car'],
      transportMode: 'car' as const,
      dashboardMode: 'merged' as const,
      theme: 'dark' as const,
      isPrivacyMode: false,
      keepScreenOn: false,
      fixedCosts: {
        vehicleType: 'owned' as const,
      },
    },
    startCycle,
    checkAndCloseCycles,
    isSaving = false,
    tracking = {
      isActive: false,
      isLoading: false,
      distance: 0,
      productiveDistance: 0,
      idleDistance: 0,
      productiveTime: 0,
      idleTime: 0,
      avgSpeed: 0,
      duration: 0,
      stoppedTime: 0,
      isProductive: false,
      mode: 'idle' as const,
      tripDetectionState: 'idle' as const,
      tripIntelligence: undefined,
      zoneIntelligence: undefined,
      stopReason: 'none' as const,
      lastStopTimestamp: undefined,
      currentSmoothedSpeed: 0,
    },
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    startTrip,
    endTrip,
    vehicles = [],
    activeVehicleId,
    updateSettings,
    updateTracking,
    driverProfile,
    setHasActiveInsight,
    miniMapOpen,
    setMiniMapOpen,
    userLearning,
    updateUserLearning,
    postTripActionSheet,
    voiceState
  } = useDriverStore();

  const { zoneIntelligence, tripIntelligence } = tracking;

  const { speak, listen, isListening } = useVoiceAssistant();

  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [quickEntrySuggestedValue, setQuickEntrySuggestedValue] = useState<number | null>(null);

  useEffect(() => {
    const handleOpenQuickEntry = (e: any) => {
      if (e.detail?.suggestedValue) {
        setQuickEntrySuggestedValue(e.detail.suggestedValue);
      } else {
        setQuickEntrySuggestedValue(null);
      }
      setIsQuickEntryOpen(true);
    };
    window.addEventListener('open-quick-entry', handleOpenQuickEntry);
    return () => window.removeEventListener('open-quick-entry', handleOpenQuickEntry);
  }, []);

  const [filter, setFilter] = useState<'all' | 'manual' | 'imported'>('all');

  const isDrivingMode = tracking?.isActive;

  useEffect(() => {
    if (isDrivingMode && !miniMapOpen && !userLearning.isSilentMode) {
      // Auto-open mini map if waiting too long (10 min = 600,000 ms)
      if (tracking.mode === 'idle' && tracking.stoppedTime > 600000) {
        setMiniMapOpen(true);
        if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
      }
    }
  }, [isDrivingMode, miniMapOpen, tracking.mode, tracking.stoppedTime, userLearning.isSilentMode, setMiniMapOpen, updateUserLearning]);

  const today = useMemo(() => startOfDay(now), [now]);
  const last7DaysStart = useMemo(() => subDays(today, 6), [today]);

  const {
    dailyData: last7DaysData = [],
    totals: last7DaysTotals = {
      totalRevenue: 0,
      profit: 0,
      totalKm: 0,
    },
    averages = {
      revenue: 0,
      profit: 0,
      km: 0,
      efficiency: 0,
    },
    aiIntelligence = {
      efficiencyTrend: 0,
      bestHourByDay: {},
      maturity: { isMature: false, message: 'Carregando...', activeDays: 0, totalKm: 0 },
      hotZones: []
    },
  } = useConsolidatedAnalytics(last7DaysStart, today, filter);

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

  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleTracking = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (tracking?.isActive) {
        if (process.env.NODE_ENV === 'development') {
          console.log("[Tracking] Encerrando...");
        }
        await stopTracking?.();
        toast.success("Rastreamento finalizado com sucesso");
      } else {
        if (navigator?.permissions?.query) {
          const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (permission.state === 'denied') {
            setLocationError('Permissão de localização negada. Por favor, habilite nas configurações do navegador.');
            setIsProcessing(false);
            return;
          }
        }

        await startTracking?.();
        setLocationError(null);
        toast.success("Rastreamento iniciado");
      }
    } catch (error: any) {
      console.error("[Tracking] Erro:", error);
      toast.error(error.message || "Erro ao alterar estado do rastreamento");
    } finally {
      setIsProcessing(false);
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
    return (vehicles || []).find((v: any) => v?.id === activeVehicleId) || (vehicles || []).find((v: any) => v?.id === settings?.currentVehicleProfileId) || null;
  }, [vehicles, activeVehicleId, settings?.currentVehicleProfileId]);

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
        lostRevenue: 0,
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
    const currentSpeed = safeNumber(tracking?.currentSmoothedSpeed);
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

    // BUG FIX: Only alert "stopped" if speed is actually low
    if (stoppedTime > 900000 && !tracking?.isProductive && currentSpeed < 5) {
      alerts.push({
        id: 'long-idle',
        message: 'Muito tempo parado. Considere se movimentar.',
        type: 'info',
      });
    }

    // AJUSTE 5: Alerta de Zona Ruim
    if (idleDistance > 3 && (Date.now() - (tracking?.startTime || 0)) < 600000) {
      alerts.push({
        id: 'bad-zone',
        message: 'Você está perdendo dinheiro nesta região. Tente se deslocar.',
        type: 'warning',
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
    
    // Use the averages from the hook which now correctly filter active days
    const avg = safeNumber(averages.revenue);
    const avgEfficiency = safeNumber(averages.efficiency);
    const avgKm = safeNumber(averages.km);

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

  useEffect(() => {
    if (tracking?.isActive && smartAlerts.length > 0) {
      const lastAlert = smartAlerts[smartAlerts.length - 1];
      toast(lastAlert.message, {
        icon: lastAlert.type === 'warning' ? <AlertTriangle size={16} className="text-red-500" /> : 
              lastAlert.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
              <Info size={16} className="text-blue-500" />,
        duration: 4000,
      });
    }
  }, [smartAlerts, tracking?.isActive]);

  const currentStatus = useMemo(() => {
    if (!isDrivingMode || !('stopReason' in tracking)) return '';
    return tracking.isProductive 
      ? 'EM CORRIDA' 
      : tracking.stopReason === 'traffic_light'
        ? 'SEMÁFORO'
        : tracking.stopReason === 'waiting'
          ? 'ESPERA'
          : zoneIntelligence?.status === 'bad_zone' 
            ? 'ZONA RUIM' 
            : 'AGUARDANDO';
  }, [isDrivingMode, tracking, zoneIntelligence?.status]);

  const statusColor = useMemo(() => {
    if (!isDrivingMode || !('stopReason' in tracking)) return '';
    return tracking.isProductive 
      ? 'text-emerald-500' 
      : tracking.stopReason === 'traffic_light'
        ? 'text-blue-400'
        : zoneIntelligence?.status === 'bad_zone' 
          ? 'text-red-500' 
          : 'text-amber-500';
  }, [isDrivingMode, tracking, zoneIntelligence?.status]);

  const glowColor = useMemo(() => {
    if (!isDrivingMode || !('stopReason' in tracking)) return '';
    return tracking.isProductive 
      ? 'rgba(16, 185, 129, 0.2)' 
      : tracking.stopReason === 'traffic_light'
        ? 'rgba(96, 165, 250, 0.2)'
        : zoneIntelligence?.status === 'bad_zone' 
          ? 'rgba(239, 68, 68, 0.2)' 
          : 'rgba(245, 158, 11, 0.2)';
  }, [isDrivingMode, tracking, zoneIntelligence?.status]);

  const aiInsight = useMemo(() => {
    if (!isDrivingMode || !('stopReason' in tracking)) return '';
    
    // If in silent mode, only show critical insights
    if (userLearning.isSilentMode) {
      if (zoneIntelligence?.status !== 'bad_zone' && zoneIntelligence?.status !== 'good_trip') {
        return '';
      }
    }
    
    // 1. PRIORIDADE: TEMPO REAL (BAD ZONE)
    if (zoneIntelligence?.status === 'bad_zone') {
      if (zoneIntelligence?.bestZone) {
        const { direction, label, distance, timeToArrival } = zoneIntelligence.bestZone;
        const timeStr = timeToArrival ? ` (~${timeToArrival} min)` : '';
        return `MOVA ${direction} ${label} • ${distance.toFixed(1)}km${timeStr}`;
      }
      return `ZONA RUIM: REPOSICIONE AGORA`;
    }

    // 2. APOIO: HISTÓRICO (NEUTRAL ZONE)
    if (zoneIntelligence?.status === 'neutral_zone') {
      const currentRegion = zoneIntelligence?.regionName;
      const isBestRegion = currentRegion && driverProfile.bestRegions.includes(currentRegion);
      const isWorstRegion = currentRegion && driverProfile.worstRegions.includes(currentRegion);

      if (isBestRegion) return 'ZONA MÉDIA • HISTÓRICO FAVORÁVEL';
      if (isWorstRegion) return 'ZONA MÉDIA • HISTÓRICO DESFAVORÁVEL';
      
      return `ZONA NEUTRA • AGUARDE`;
    }

    // 3. REFORÇO: HISTÓRICO (GOOD ZONE)
    if (zoneIntelligence?.status === 'good_zone' || zoneIntelligence?.status === 'good_trip') {
      const currentRegion = zoneIntelligence?.regionName;
      const isBestRegion = currentRegion && driverProfile.bestRegions.includes(currentRegion);
      
      if (isBestRegion) return 'ALTA PERFORMANCE • ZONA EXCELENTE';
      return 'ZONA BOA • MANTENHA O RITMO';
    }

    // 4. CONTEXTO DE PARADA / CORRIDA
    if (tracking.stopReason === 'traffic_light') return 'AGUARDE O SINAL VERDE';
    if (tracking.stopReason === 'waiting') return 'MOVA AGORA • BUSQUE DEMANDA';
    if (tracking.isProductive) return 'EM CORRIDA • FOCO NA ROTA';
    
    // Fallback
    return 'MONITORANDO PERFORMANCE';
  }, [isDrivingMode, zoneIntelligence, tracking, driverProfile, userLearning.isSilentMode]);

  // Update hasActiveInsight in store for FAB positioning
  useEffect(() => {
    setHasActiveInsight(!!aiInsight);
  }, [aiInsight, setHasActiveInsight]);

  const isStableAndPositive = useMemo(() => {
    if (!isDrivingMode || !('currentSmoothedSpeed' in tracking)) return false;
    return (zoneIntelligence?.status === 'productive_zone' || zoneIntelligence?.status === 'good_trip') && 
           tracking.isProductive && 
           (tracking.currentSmoothedSpeed || 0) > 10;
  }, [isDrivingMode, zoneIntelligence?.status, tracking]);

  // Voice triggers
  useEffect(() => {
    if (!settings.voiceEnabled) return;

    // Trip start
    if (tracking.mode === 'in_trip' && tracking.tripDetectionState === 'trip_started') {
      speak('Corrida iniciada', 'high');
    }

    // Trip end
    if (tracking.mode === 'dropoff' || (tracking.mode === 'idle' && tracking.tripDetectionState === 'idle' && tracking.distance > 0.1)) {
      // We use a small distance check to avoid false positives on app start
      // The hook handles repetition and cooldown
      if (tracking.mode === 'dropoff') {
        speak('Corrida finalizada. Não esqueça de lançar o valor.', 'high');
      }
    }

    // Zone Alert
    if (zoneIntelligence?.status === 'bad_zone' && !userLearning.isSilentMode) {
      speak('Zona fraca detectada. Considere mudar de região.', 'normal');
    }

    // Best Zone
    if (zoneIntelligence?.bestZone && zoneIntelligence.status === 'bad_zone') {
      speak(`Melhor região detectada em ${zoneIntelligence.bestZone.label}`, 'normal');
    }

    // Idle too long
    if (tracking.mode === 'idle' && tracking.stoppedTime > 600000 && !miniMapOpen) {
      speak('Muito tempo parado. Sugestão de nova zona disponível.', 'normal');
    }

    // AI Insight
    if (aiInsight && !isStableAndPositive && settings.voiceVerbosity === 'high') {
      speak(aiInsight, 'low');
    }

  }, [tracking.mode, tracking.tripDetectionState, zoneIntelligence?.status, zoneIntelligence?.bestZone, tracking.stoppedTime, settings.voiceEnabled, userLearning.isSilentMode, speak, miniMapOpen, aiInsight, isStableAndPositive, settings.voiceVerbosity, tracking.distance]);

  // Haptic Feedback on Status Change
  useEffect(() => {
    if (isDrivingMode && currentStatus) {
      if (navigator.vibrate) {
        // Subtle vibration for state changes
        navigator.vibrate(15);
      }
    }
  }, [currentStatus, isDrivingMode]);

  // Voice Alert System (Preparation for TTS)
  useEffect(() => {
    if (isDrivingMode && aiInsight && !isStableAndPositive && settings.voiceEnabled) {
      console.log(`[VOICE_ALERT] ${aiInsight}`);
      // Future: window.speechSynthesis.speak(new SpeechSynthesisUtterance(aiInsight));
    }
  }, [aiInsight, isDrivingMode, isStableAndPositive, settings.voiceEnabled]);

  const mainMetricValue = tripIntelligence?.metrics.perHour || efficiencyStats?.grossPerKm || 0;
  const mainMetricLabel = tripIntelligence?.metrics.perHour ? 'R$/HORA' : 'R$/KM';

  const contextInfo = tracking.isProductive 
    ? `${formatDuration(tracking.duration)} • ${safeNumber(tracking.distance).toFixed(1)} km`
    : `${formatDuration(tracking.duration)} • ${zoneIntelligence?.label || 'Monitorando'}`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dashboard Content (Base Layer) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "space-y-4 pb-24 md:pb-8 transition-all duration-1000 ease-in-out",
          isDrivingMode ? "blur-2xl scale-[0.96] opacity-30 grayscale-[0.5] pointer-events-none" : ""
        )}
      >
        <AIRealTimeAlerts todayData={todayData} aiIntelligence={aiIntelligence} averages={averages} />

      {/* Priority 2: Real-time Trip Evaluation Card */}
      {tracking?.isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            "border-none shadow-lg overflow-hidden transition-all duration-500",
            tripIntelligence?.status === 'good' ? "bg-emerald-500/10 border border-emerald-500/20" :
            tripIntelligence?.status === 'acceptable' ? "bg-blue-500/10 border border-blue-500/20" :
            tripIntelligence?.status === 'bad' ? "bg-red-500/10 border border-red-500/20" :
            "bg-zinc-500/10 border border-zinc-500/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    tripIntelligence?.status === 'good' ? "bg-emerald-500 text-zinc-950" :
                    tripIntelligence?.status === 'acceptable' ? "bg-blue-500 text-zinc-950" :
                    tripIntelligence?.status === 'bad' ? "bg-red-500 text-zinc-950" :
                    "bg-zinc-500 text-zinc-950"
                  )}>
                    <Zap size={16} className={cn(tripIntelligence?.status === 'analyzing' && "animate-pulse")} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Assistente de Decisão</h3>
                    <p className={cn(
                      "text-sm font-black uppercase tracking-tight",
                      tripIntelligence?.status === 'good' ? "text-emerald-500" :
                      tripIntelligence?.status === 'acceptable' ? "text-blue-500" :
                      tripIntelligence?.status === 'bad' ? "text-red-500" :
                      "text-zinc-500"
                    )}>
                      {tripIntelligence?.label || 'Analisando corrida...'}
                    </p>
                  </div>
                </div>
                
                {tripIntelligence?.status !== 'analyzing' && (
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Score</p>
                    <p className="text-lg font-black tracking-tighter">{tripIntelligence?.score}%</p>
                  </div>
                )}
              </div>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                {tripIntelligence?.message}
              </p>

              {tripIntelligence?.status !== 'analyzing' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Ganho Bruto/km</p>
                    <p className="text-xs font-black">{formatCurrency(tripIntelligence?.metrics.grossPerKm || 0, settings.isPrivacyMode)}/km</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Ganho Líquido/km</p>
                    <p className="text-xs font-black">{formatCurrency(tripIntelligence?.metrics.netPerKm || 0, settings.isPrivacyMode)}/km</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">R$/Hora</p>
                    <p className="text-xs font-black">{formatCurrency(tripIntelligence?.metrics.perHour || 0, settings.isPrivacyMode)}/h</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Eficiência</p>
                    <p className="text-xs font-black">{(tripIntelligence?.metrics.efficiency || 0).toFixed(1)}%</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <Info size={12} className="text-zinc-400" />
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    {tripIntelligence?.maturity.reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Real-time Zone Quality Card */}
      {tracking?.isActive && zoneIntelligence && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className={cn(
            "border-none shadow-lg overflow-hidden transition-all duration-500",
            zoneIntelligence.status === 'good_zone' ? "bg-emerald-500/10 border border-emerald-500/20" :
            zoneIntelligence.status === 'neutral_zone' ? "bg-amber-500/10 border border-amber-500/20" :
            zoneIntelligence.status === 'bad_zone' ? "bg-red-500/10 border border-red-500/20" :
            "bg-zinc-500/10 border border-zinc-500/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    zoneIntelligence.status === 'good_zone' ? "bg-emerald-500 text-zinc-950" :
                    zoneIntelligence.status === 'neutral_zone' ? "bg-amber-500 text-zinc-950" :
                    zoneIntelligence.status === 'bad_zone' ? "bg-red-500 text-zinc-950" :
                    "bg-zinc-500 text-zinc-950"
                  )}>
                    <MapIcon size={16} className={cn(zoneIntelligence.status === 'monitoring' && "animate-pulse")} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Inteligência de Região</h3>
                    <p className={cn(
                      "text-sm font-black uppercase tracking-tight",
                      zoneIntelligence.status === 'good_zone' ? "text-emerald-500" :
                      zoneIntelligence.status === 'neutral_zone' ? "text-amber-500" :
                      zoneIntelligence.status === 'bad_zone' ? "text-red-500" :
                      "text-zinc-500"
                    )}>
                      {zoneIntelligence.label}
                    </p>
                  </div>
                </div>
                
                {zoneIntelligence.maturity.isMature && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Score</p>
                      <p className="text-lg font-black tracking-tighter">{zoneIntelligence.score}%</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                      zoneIntelligence.severity === 'high' ? "bg-red-500 text-white" :
                      zoneIntelligence.severity === 'medium' ? "bg-amber-500 text-zinc-950" :
                      "bg-emerald-500 text-zinc-950"
                    )}>
                      {zoneIntelligence.severity === 'high' ? 'SEVERIDADE ALTA' : 
                       zoneIntelligence.severity === 'medium' ? 'ALERTA MÉDIO' : 
                       'RISCO BAIXO'}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                {zoneIntelligence.message}
              </p>

              {zoneIntelligence.maturity.isMature && zoneIntelligence.reason !== 'none' && (
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-1 h-1 rounded-full bg-zinc-400" />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Motivo: {
                      zoneIntelligence.reason === 'high_idle_km' ? 'KM ocioso elevado' :
                      zoneIntelligence.reason === 'long_wait_time' ? 'Tempo de espera alto' :
                      zoneIntelligence.reason === 'low_efficiency' ? 'Baixa eficiência' :
                      zoneIntelligence.reason === 'low_demand' ? 'Baixa demanda' : ''
                    }
                  </p>
                </div>
              )}

              {zoneIntelligence.maturity.isMature ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">KM Ocioso</p>
                    <p className="text-xs font-black">{zoneIntelligence.metrics.idleKm.toFixed(1)} km</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Tempo de Busca</p>
                    <p className="text-xs font-black">{Math.floor(zoneIntelligence.metrics.searchingMinutes)} min</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Eficiência Atual</p>
                    <p className="text-xs font-black">{zoneIntelligence.metrics.currentEfficiency.toFixed(1)}%</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Ganhos Recentes</p>
                    <p className="text-xs font-black">{formatCurrency(zoneIntelligence.metrics.recentRevenue, settings.isPrivacyMode)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <Info size={12} className="text-zinc-400" />
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                    {zoneIntelligence.maturity.reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Vehicle Card - Prominent at the top */}
      {currentVehicle && (
        <Card 
          onClick={() => navigate('/settings')}
          className="border-none bg-white dark:bg-zinc-900 shadow-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
              )}>
                {currentVehicle.category === 'motorcycle' ? <Zap size={20} /> : <Car size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black tracking-tight">{currentVehicle.name}</p>
                  <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-md tracking-widest">
                    Ativo
                  </div>
                </div>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  {currentVehicle.brand} {currentVehicle.model} • {currentVehicle.year}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-400" />
          </CardContent>
        </Card>
      )}

      {!activeVehicleId && (
        <Card className="border-none bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Veículo não selecionado</p>
            <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">Você precisa selecionar um veículo nas configurações para iniciar ciclos e rastreamento.</p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8 px-3 text-[10px] font-black uppercase tracking-widest"
          >
            Configurar
          </Button>
        </Card>
      )}

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

          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award size={16} className="text-emerald-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Driver Score</h3>
            </div>

            <div
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors duration-300',
                driverScore?.color || 'border-zinc-700 text-zinc-400'
              )}
            >
              {driverScore?.label || 'Sem Score'}
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
              {driverScore?.label === 'Em formação' ? '--' : safeNumber(driverScore?.score)}
            </div>
            <div className="pb-1 space-y-1">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-4 h-1.5 rounded-full transition-all duration-500',
                      driverScore?.label === 'Em formação'
                        ? 'bg-zinc-100 dark:bg-zinc-800'
                        : i < Math.round(safeNumber(driverScore?.score) / 20)
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
            {driverScore?.label === 'Em formação' 
              ? 'Dirija pelo menos 10km para começar a calcular seu score de performance.'
              : safeString(driverScore?.explanation, 'Continue usando o app para receber mais insights de performance.')}
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
              {!aiIntelligence?.maturity?.isMature 
                ? `Inteligência em fase de aprendizado. ${aiIntelligence?.maturity?.message}.`
                : safeNumber(todayData?.totalRevenue) > 0
                  ? `Hoje você está com ${safeNumber(todayData?.efficiency).toFixed(0)}% de eficiência. ${
                      aiIntelligence?.bestHourByDay?.[getDay(today)]
                        ? `Seu melhor horário hoje costuma ser entre ${aiIntelligence.bestHourByDay[getDay(today)]}. `
                        : ''
                    }${
                      safeNumber(todayData?.idleKm) > 5
                        ? `Você rodou ${safeNumber(todayData?.idleKm).toFixed(1)}km ocioso, tente se posicionar melhor.`
                        : 'Ótimo controle de KM ocioso hoje!'
                    }`
                  : safeNumber(todayData?.totalKm) > 0
                    ? `Ciclo em andamento. Você já rodou ${safeNumber(todayData?.totalKm).toFixed(1)}km. Lance seus ganhos para receber insights completos.`
                    : 'Inicie seu ciclo para receber insights em tempo real sobre sua performance e melhores regiões.'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/10 rounded-xl p-3 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Melhor Horário (Hoje)</p>
                <p className="text-xs font-black">
                  {!aiIntelligence?.maturity?.isMature ? 'Dados insuficientes' : (aiIntelligence?.bestHourByDay?.[getDay(today)] || 'Analisando...')}
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-3 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Tendência Semanal</p>
                <p className="text-xs font-black">
                  {!aiIntelligence?.maturity?.isMature ? 'Dados insuficientes' : (
                    safeNumber(aiIntelligence?.efficiencyTrend) > 0
                      ? 'Melhorando'
                      : safeNumber(aiIntelligence?.efficiencyTrend) < 0
                        ? 'Em Queda'
                        : 'Estável'
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {aiIntelligence?.hotZones?.length > 0 && (
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <MapIcon size={16} className="text-orange-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Suas Zonas Quentes</h3>
            </div>
            
            <div className="space-y-3">
              {aiIntelligence.hotZones.map((zone: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-[10px] font-black text-orange-500">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{zone.label}</p>
                      <p className="text-[10px] font-medium text-zinc-500">{zone.count} corridas registradas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-500">{formatCurrency(zone.revenue, settings.isPrivacyMode)}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Total Gerado</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {openCycle && (
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500',
                    tracking?.isActive
                      ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  )}
                >
                  <Navigation size={24} className={tracking?.isActive ? 'animate-pulse' : ''} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                    Rastreamento
                  </h3>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    tracking?.isActive ? "text-emerald-500" : "text-zinc-500"
                  )}>
                    {tracking?.isActive ? 'GPS Ativo' : 'Desativado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tracking?.isActive && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      tracking.isPaused ? resumeTracking() : pauseTracking();
                    }}
                    variant="ghost"
                    className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-0 text-zinc-500"
                  >
                    {tracking.isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                  </Button>
                )}
                
                <Button
                  onClick={handleToggleTracking}
                  disabled={isProcessing}
                  className={cn(
                    "h-10 px-5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                    tracking?.isActive
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  )}
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : tracking?.isActive ? "Parar" : "Iniciar"}
                </Button>
              </div>
            </div>

            {locationError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase tracking-wider">{locationError}</p>
              </div>
            )}

            {tracking?.isActive && (
              <>
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
              {stats.alerts.map((alert, index) => (
                <motion.div
                  key={`alert-${alert.id}-${index}`}
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
                        ? `${stats.bestDay.name} (${formatCurrency(stats.bestDay.value, settings.isPrivacyMode)})`
                        : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pior Eficiência</p>
                    <p className="text-sm font-black text-red-400">
                      {stats.worstDayByEfficiency
                        ? `${stats.worstDayByEfficiency.name} (${formatCurrency(stats.worstDayByEfficiency.efficiency, settings.isPrivacyMode)}/km)`
                        : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Média R$/KM</p>
                    <p className="text-sm font-black text-blue-400">{formatCurrency(stats.avgEfficiency, settings.isPrivacyMode)}/km</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lucro Semanal</p>
                    <p className="text-sm font-black text-white">{formatCurrency(stats.totalProfit7Days, settings.isPrivacyMode)}</p>
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

      <Card className="relative overflow-hidden border-none bg-zinc-900 text-white shadow-2xl shadow-zinc-900/40">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Navigation size={80} className="rotate-45" />
        </div>

        <CardContent className="p-4 space-y-4 relative z-10">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {safeNumber(openCycle?.total_amount) > 0 ? 'Faturamento do Ciclo' : 'Ciclo iniciado, aguardando lançamentos'}
              </p>
              <h2 className="text-4xl font-black tracking-tighter break-words text-white">
                {safeNumber(openCycle?.total_amount) > 0 ? formatCurrency(safeNumber(openCycle?.total_amount), settings.isPrivacyMode) : formatCurrency(0, settings.isPrivacyMode)}
              </h2>
            </div>

            {openCycle && cycleProgress && (
              <div className="bg-white/5 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1.5 border border-white/5 shrink-0">
                <Clock size={12} className="text-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                  {safeNumber(cycleProgress?.remainingHours)}h {safeNumber(cycleProgress?.remainingMinutes)}m
                </span>
              </div>
            )}
          </div>

          {profitStats && (
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Despesas</p>
                <p className="text-xs font-black text-red-400">
                  {formatCurrency(safeNumber(profitStats.expenses) + safeNumber(profitStats.dailyFixed), settings.isPrivacyMode)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">R$ Perdido</p>
                <p className="text-xs font-black text-amber-400">
                  {formatCurrency(safeNumber(efficiencyStats?.lostRevenue), settings.isPrivacyMode)}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Lucro Estimado</p>
                <p className="text-xl font-black text-emerald-400 leading-none">
                  {formatCurrency(safeNumber(profitStats.profit), settings.isPrivacyMode)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {openCycle ? (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-zinc-500" />
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      Iniciado às {openCycle?.start_time ? format(new Date(openCycle.start_time), 'HH:mm') : '--:--'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400">
                    {safeNumber(cycleProgress?.percent).toFixed(0)}%
                  </span>
                </div>

                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
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

            <div className="grid grid-cols-2 gap-4">
              {!openCycle ? (
                <div className="col-span-2 space-y-2">
                  <Button
                    onClick={handleStartCycle}
                    disabled={isSaving || !activeVehicleId}
                    className={cn(
                      "w-full h-16 font-black text-lg rounded-2xl shadow-xl transition-all",
                      !activeVehicleId
                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border-none"
                        : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20 border-none"
                    )}
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
                  {!activeVehicleId && (
                    <p className="text-center text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                      Selecione um veículo para iniciar
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    onClick={() => setIsQuickEntryOpen(true)}
                    className="h-16 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-black rounded-2xl gap-2 text-base shadow-lg shadow-emerald-500/20 border-none"
                  >
                    <Plus size={20} />
                    Lançar Valor
                  </Button>

                  <Button
                    onClick={() => navigate('/faturamento')}
                    variant="outline"
                    className="h-16 bg-zinc-800/50 hover:bg-zinc-800 text-white font-black rounded-2xl gap-2 text-sm border border-white/10"
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
            <PlatformMiniStat label="Uber" value={safeNumber(openCycle?.uber_amount)} color="bg-white" isPrivacyMode={settings.isPrivacyMode} />
            <PlatformMiniStat label="99" value={safeNumber(openCycle?.noventanove_amount)} color="bg-yellow-500" isPrivacyMode={settings.isPrivacyMode} />
            <PlatformMiniStat label="inDrive" value={safeNumber(openCycle?.indriver_amount)} color="bg-emerald-500" isPrivacyMode={settings.isPrivacyMode} />
            <PlatformMiniStat label="Outros" value={safeNumber(openCycle?.extra_amount)} color="bg-blue-500" isPrivacyMode={settings.isPrivacyMode} />
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
              <p className="text-2xl font-black tracking-tighter">{formatCurrency(safeNumber(settings?.dailyGoal), settings.isPrivacyMode)}</p>
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
            <p className="text-2xl font-black tracking-tighter">{formatCurrency(safeNumber(stats?.avg), settings.isPrivacyMode)}</p>
          </CardContent>
        </Card>
      </div>

      {openCycle && (
        <div className="grid grid-cols-1 gap-4">
          {/* Driver Pattern Section */}
      {driverProfile.totalRides > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-none bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Seu Padrão de Performance</h3>
                  <p className="text-sm font-black uppercase tracking-tight text-indigo-500">IA Adaptativa</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Melhor Horário</p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-emerald-500" />
                    <p className="text-sm font-black">
                      {driverProfile.bestHours.length > 0 ? `${driverProfile.bestHours[0]}h` : '--'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Melhor Região</p>
                  <div className="flex items-center gap-2">
                    <MapIcon size={14} className="text-emerald-500" />
                    <p className="text-sm font-black truncate">
                      {driverProfile.bestRegions.length > 0 ? driverProfile.bestRegions[0] : '--'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Média R$/Hora</p>
                  <p className="text-sm font-black text-emerald-500">
                    {formatCurrency(driverProfile.avgProfitPerHour, settings.isPrivacyMode)}/h
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Média R$/Km</p>
                  <p className="text-sm font-black text-emerald-500">
                    {formatCurrency(driverProfile.avgProfitPerKm, settings.isPrivacyMode)}/km
                  </p>
                </div>
              </div>

              {driverProfile.worstHours.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-500" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Atenção: Seu rendimento cai às {driverProfile.worstHours[0]}h
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <FinancialEntryList />
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
                    {formatCurrency(safeNumber(efficiencyStats?.grossPerKm), settings.isPrivacyMode).replace('R$', '')}/km
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
                    <p className="text-xs font-black">{formatCurrency(safeNumber(efficiencyStats?.netPerKm), settings.isPrivacyMode)}/km</p>
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
                      {formatCurrency(safeNumber(efficiencyStats?.profitPerKm), settings.isPrivacyMode)}/km
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-visible">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
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
                                  <div key={`${p?.name}-${p?.value}-${i}`} className="flex justify-between gap-4">
                                    <span className="text-zinc-400">{p?.name}:</span>
                                    <span>{formatCurrency(safeNumber(p?.value), settings.isPrivacyMode)}</span>
                                  </div>
                                ) : null
                              )}
                              <div className="pt-1 border-t border-white/10 flex justify-between gap-4">
                                <span className="text-emerald-400">Total:</span>
                                <span className="text-emerald-400">{formatCurrency(total, settings.isPrivacyMode)}</span>
                              </div>
                            </>
                          ) : (
                            <span>{formatCurrency(total, settings.isPrivacyMode)}</span>
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
      </motion.div>

      <QuickEntryModal 
        isOpen={isQuickEntryOpen} 
        onClose={() => {
          setIsQuickEntryOpen(false);
          setQuickEntrySuggestedValue(null);
        }} 
        suggestedValue={quickEntrySuggestedValue}
      />

      <QuickActionsMenu />
      <PostTripActionSheet />

      {/* Mini Map HUD Overlay */}
      <AnimatePresence>
        {isDrivingMode && miniMapOpen && (
          <MiniMapHUD />
        )}
      </AnimatePresence>

      {/* Driving Mode HUD Overlay */}
      <AnimatePresence>
        {isDrivingMode && tracking.hudState !== 'hidden' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              height: tracking.hudState === 'minimized' ? 'auto' : '100vh',
              backgroundColor: tracking.hudState === 'minimized' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'
            }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed z-[70] flex flex-col items-center transition-all duration-500 ease-in-out",
              tracking.hudState === 'minimized' 
                ? "bottom-0 left-0 right-0 py-4 px-6 rounded-t-[32px] border-t border-white/10 backdrop-blur-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" 
                : "inset-0 py-12 px-6 justify-between"
            )}
          >
            {/* Background Effects (Only in Expanded) */}
            {tracking.hudState === 'expanded' && (
              <>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none" />
                <motion.div 
                  animate={{ 
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-radial-gradient from-emerald-500/10 to-transparent"
                  style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)` }}
                />
              </>
            )}

            {/* Controls (Minimize/Close) */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateTracking({ hudState: tracking.hudState === 'expanded' ? 'minimized' : 'expanded' })}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
              >
                {tracking.hudState === 'expanded' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateTracking({ hudState: 'hidden' })}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Top: Status & Context (Compact in Minimized) */}
            <div className={cn(
              "relative z-10 w-full flex flex-col items-center",
              tracking.hudState === 'minimized' ? "flex-row justify-between gap-4" : "gap-4"
            )}>
              <motion.div
                layout
                className={cn(
                  "flex flex-col",
                  tracking.hudState === 'minimized' ? "items-start" : "items-center"
                )}
              >
                <h2 className={cn(
                  "font-black tracking-[0.25em] transition-all duration-500",
                  tracking.hudState === 'minimized' ? "text-lg" : "text-4xl sm:text-5xl",
                  statusColor
                )}>
                  {currentStatus}
                </h2>
                
                <div className={cn(
                  "mt-1 flex items-center gap-2",
                  tracking.hudState === 'minimized' ? "" : "mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl"
                )}>
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", statusColor.replace('text-', 'bg-'))} />
                  <span className={cn(
                    "font-black text-white/80 uppercase tracking-[0.2em]",
                    tracking.hudState === 'minimized' ? "text-[8px]" : "text-xs"
                  )}>
                    {contextInfo}
                  </span>
                </div>
              </motion.div>

              {tracking.hudState === 'minimized' && (
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
                    {mainMetricLabel}
                  </span>
                  <p className="text-xl font-black text-white tracking-tighter">
                    {formatCurrency(mainMetricValue, settings.isPrivacyMode)}
                  </p>
                </div>
              )}
            </div>

            {/* Center: Main Metric (Only in Expanded) */}
            {tracking.hudState === 'expanded' && (
              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    toast.info("Resumo rápido aberto", {
                      description: "Seus ganhos por hora estão 15% acima da média.",
                      icon: <Zap className="text-amber-500" />
                    });
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className="flex flex-col items-center cursor-pointer"
                >
                  <span className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.4em] mb-2">
                    {mainMetricLabel}
                  </span>
                  <div className="relative">
                    <span className="text-7xl sm:text-9xl font-black tracking-tighter text-white tabular-nums">
                      {formatCurrency(mainMetricValue, settings.isPrivacyMode).replace('R$', '').trim()}
                    </span>
                    <span className="absolute -top-2 -right-8 text-2xl font-black text-emerald-500">
                      R$
                    </span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Bottom: AI Insight Pill */}
            <div className={cn(
              "relative z-10 w-full",
              tracking.hudState === 'minimized' ? "mt-4" : "max-w-xs"
            )}>
              <AnimatePresence mode="wait">
                {aiInsight && (
                  <motion.div
                    key={aiInsight}
                    initial={{ y: 20, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (aiInsight.includes('MOVA') || aiInsight.includes('SAIA')) {
                        navigate('/heatmap');
                      }
                      if (navigator.vibrate) navigator.vibrate(30);
                    }}
                    className={cn(
                      "bg-emerald-500 text-zinc-950 shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center text-center cursor-pointer active:bg-emerald-400 transition-all",
                      tracking.hudState === 'minimized' ? "px-4 py-2 rounded-2xl" : "px-8 py-4 rounded-3xl"
                    )}
                  >
                    <Zap size={tracking.hudState === 'minimized' ? 14 : 18} fill="currentColor" className="mr-2 shrink-0" />
                    <span className={cn(
                      "font-black uppercase tracking-wider leading-tight",
                      tracking.hudState === 'minimized' ? "text-[10px]" : "text-sm"
                    )}>
                      {aiInsight}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Voice Command Button (Only in Expanded) */}
            {settings.voiceCommandsEnabled && tracking.hudState === 'expanded' && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={listen}
                className={cn(
                  "absolute bottom-32 right-0 z-[80] w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
                  isListening 
                    ? "bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]" 
                    : "bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
                )}
              >
                <Mic size={28} className={cn(isListening ? "opacity-100" : "opacity-60")} />
                
                {isListening && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-red-500/50"
                  />
                )}
              </motion.button>
            )}

            {/* Speaking Indicator */}
            <AnimatePresence>
              {voiceState.lastSpokenAt && (Date.now() - voiceState.lastSpokenAt < 4000) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute z-[80] flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-md",
                    tracking.hudState === 'minimized' ? "bottom-24 right-6" : "top-24 right-0"
                  )}
                >
                  <Volume2 size={14} className="text-emerald-500 animate-bounce" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Falando...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden State Reopen Button */}
      <AnimatePresence>
        {isDrivingMode && tracking.hudState === 'hidden' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-6 z-[80]"
          >
            <Button
              onClick={() => updateTracking({ hudState: 'expanded' })}
              className="w-14 h-14 rounded-full bg-emerald-500 text-zinc-950 shadow-2xl shadow-emerald-500/40 flex items-center justify-center p-0"
            >
              <Maximize2 size={24} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlatformMiniStat = ({ label, value, color, isPrivacyMode }: any) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xs font-black tracking-tight">{formatCurrency(safeNumber(value), isPrivacyMode)}</span>
  </div>
);

const MiniMapHUD = () => {
  const { setMiniMapOpen, updateUserLearning } = useDriverStore();
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 20 }}
      className="fixed bottom-32 left-6 right-6 z-[80] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
    >
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Melhor Zona Próxima</span>
        </div>
        <button onClick={() => { setMiniMapOpen(false); updateUserLearning('ignore'); }} className="text-white/40 hover:text-white">
          <X size={16} />
        </button>
      </div>
      
      <div className="h-40 bg-zinc-800 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://picsum.photos/seed/map/600/400" 
            alt="Map" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
            <MapIcon size={24} className="text-emerald-500" />
          </div>
          <span className="text-white font-bold">Vila Olímpia</span>
          <span className="text-emerald-500 text-xs font-black uppercase tracking-wider">+25% Demanda</span>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-3">
        <button 
          onClick={() => {
            window.open('https://www.google.com/maps/search/?api=1&query=Vila+Olimpia+Sao+Paulo', '_blank');
            setMiniMapOpen(false);
            updateUserLearning('accept');
          }}
          className="bg-emerald-500 text-zinc-950 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2"
        >
          <Zap size={14} fill="currentColor" />
          Ir Agora
        </button>
        <button 
          onClick={() => { setMiniMapOpen(false); updateUserLearning('ignore'); }}
          className="bg-white/5 text-white/60 py-3 rounded-2xl font-black uppercase tracking-wider text-xs"
        >
          Ignorar
        </button>
      </div>
    </motion.div>
  );
};
