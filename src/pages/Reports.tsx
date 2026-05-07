import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDriverStore } from '../store';
import { 
  formatCurrency, 
  cn, 
  calculateDailyFixedCost, 
  consolidateDailyData, 
  calculateDriverScore, 
  safeNumber, 
  getEfficiencyStatus 
} from '../utils';
import { useConsolidatedAnalytics } from '../hooks/useConsolidatedAnalytics';
import { Card, CardContent, Button, Skeleton } from '../components/UI';
import { 
  TrendingUp, Calendar, ChevronRight, BarChart3, Award, Zap, Download, Filter, Gauge, Camera, CheckCircle2, FileText, Map as MapIcon, X, Check, AlertCircle, Clock, Target, Trash2, LayoutDashboard, History, Navigation, Activity, DollarSign
} from 'lucide-react';
import { 
  startOfDay, isSameDay, parseISO, format, subDays, startOfWeek, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CountUp } from '../components/CountUp';
import { SyncIndicator } from '../components/SyncIndicator';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { toast } from 'sonner';

import { ReportsHeader } from '../components/reports/ReportsHeader';
import { WeeklyExecutiveSummary } from '../components/reports/WeeklyExecutiveSummary';
import { InsightsCard } from '../components/reports/InsightsCard';
import { HeatmapSummaryCard } from '../components/reports/HeatmapSummaryCard';
import { BestHoursCard } from '../components/reports/BestHoursCard';
import { PerformanceGrid } from '../components/reports/PerformanceGrid';
import { DailyRevenueCard } from '../components/reports/DailyRevenueCard';
import { PlatformMixCard } from '../components/reports/PlatformMixCard';
import { RecentHistoryCardList } from '../components/reports/RecentHistoryCardList';

export const Reports = () => {
  const { cycles: rawCycles, settings, importedReports: rawReports, isSaving, vehicles, activeVehicleId, deleteImportedReport, pendingDeletionIds } = useDriverStore();
  
  const cycles = useMemo(() => {
    return rawCycles.filter(c => !pendingDeletionIds.includes(c.id));
  }, [rawCycles, pendingDeletionIds]);

  const importedReports = useMemo(() => {
    return rawReports.filter(r => !pendingDeletionIds.includes(r.id));
  }, [rawReports, pendingDeletionIds]);

  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState<'all' | 'manual' | 'imported'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    if (location.state?.successMessage) {
      setShowSuccess(true);
      const hideMsg = setTimeout(() => setShowSuccess(false), 5000);
      return () => { clearTimeout(timer); clearTimeout(hideMsg); };
    }
    return () => clearTimeout(timer);
  }, [location.state]);
  
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const start = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const end = useMemo(() => addDays(start, 6), [start]);

  const { dailyData: weekData, totals: weekTotals, platformMix, averages, smartInsights } = useConsolidatedAnalytics(start, end, filter);

  const currentWeek = useMemo(() => {
    return weekData.map(day => ({
      id: format(day.date, 'yyyy-MM-dd'),
      name: format(day.date, 'EEE', { locale: ptBR }),
      fullName: format(day.date, "dd 'de' MMM", { locale: ptBR }),
      value: safeNumber(day.totalRevenue),
      expenses: safeNumber(day.expenses),
      profit: safeNumber(day.profit),
      totalKm: safeNumber(day.totalKm),
      idleKm: safeNumber(day.idleKm),
      rideKm: safeNumber(day.rideKm),
      grossPerKm: safeNumber(day.totalKm) > 0 ? safeNumber(day.totalRevenue) / safeNumber(day.totalKm) : 0,
      netPerKm: safeNumber(day.totalKm) > 0 ? safeNumber(day.profit) / safeNumber(day.totalKm) : 0,
      profitPerProductiveKm: safeNumber(day.rideKm) > 0 ? safeNumber(day.profit) / safeNumber(day.rideKm) : 0,
      efficiencyPercentage: safeNumber(day.efficiency),
      hasMismatch: day.hasMismatch,
      importedTotal: safeNumber(day.importedTotal),
      uber: safeNumber(day.uber),
      noventanove: safeNumber(day.noventanove),
      indriver: safeNumber(day.indriver),
      extra: safeNumber(day.extra),
      date: day.date
    }));
  }, [weekData]);

  const stats = useMemo(() => {
    const total = safeNumber(weekTotals.totalRevenue);
    const totalExpenses = safeNumber(weekTotals.expenses);
    const totalProfit = safeNumber(weekTotals.profit);
    const totalKm = safeNumber(weekTotals.totalKm);
    const totalRideKm = safeNumber(weekTotals.rideKm);
    
    const avgEfficiency = safeNumber(averages.efficiency);
    const sorted = [...currentWeek].sort((a, b) => b.value - a.value);
    const grossPerKm = totalKm > 0 ? total / totalKm : 0;
    const netPerKm = totalKm > 0 ? totalProfit / totalKm : 0;

    const platformTotals = {
      uber: weekTotals.uber,
      noventanove: weekTotals.noventanove,
      indriver: weekTotals.indriver,
      extra: weekTotals.extra
    };

    const alerts = [];
    if (total > 0 && (totalProfit / total) < 0.3) {
      alerts.push({
        id: 'low-margin',
        type: 'warning',
        title: 'MARGIN CRITICAL',
        message: 'A margem operacional está abaixo de 30%. Otimize gastos.'
      });
    }

    const totalLostRevenue = currentWeek.reduce((acc, d) => acc + safeNumber(d.value * (1 - d.efficiencyPercentage/100) * 0.5), 0);
    const maturity = smartInsights.maturity;

    // Contextual Smart Tip
    let smartTip = '';
    if (maturity.status === 'coletando') {
      smartTip = "SISTEMA EM MODO APRENDIZAGEM. Continue operando para calibrar a IA.";
    } else if (maturity.status === 'em_formacao') {
      smartTip = `DADOS EM FORMAÇÃO (${maturity.totalKm.toFixed(1)}KM). Recomenda-se operar em horários de pico.`;
    } else {
      if (avgEfficiency < 40) {
        smartTip = "ALTA TAXA DE DESLOCAMENTO OCIOSO. Reduza km entre corridas.";
      } else if (netPerKm < 1.2) {
        smartTip = "MARGEM OPERACIONAL BAIXA. Seja mais seletivo na oferta de corridas.";
      } else {
        smartTip = "EFICÁCIA OPERACIONAL EM NÍVEL ÓTIMO. Mantenha o padrão de operação.";
      }
    }

    return {
      total,
      totalExpenses,
      totalProfit,
      totalKm,
      totalRideKm,
      totalLostRevenue,
      avgEfficiency,
      grossPerKm,
      netPerKm,
      best: sorted[0],
      platformTotals,
      alerts,
      maturity,
      smartTip,
      mismatches: currentWeek.filter(d => d.hasMismatch)
    };
  }, [currentWeek, weekTotals, smartInsights, averages]);

  const recentDays = useMemo(() => {
    // Group logic simplified for performance
    const allDates = new Set<string>();
    cycles.forEach(c => c.start_time && allDates.add(format(parseISO(c.start_time), 'yyyy-MM-dd')));
    importedReports.forEach(r => r.period_start && allDates.add(format(parseISO(r.period_start), 'yyyy-MM-dd')));
    
    return Array.from(allDates)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 14)
      .map(dateKey => {
        const date = parseISO(dateKey);
        const dayCycles = cycles.filter(c => c.start_time && isSameDay(parseISO(c.start_time), date));
        const dayReports = importedReports.filter(r => r.period_start && isSameDay(parseISO(r.period_start), date));
        return {
          ...consolidateDailyData(date, dayCycles, dayReports, settings, undefined, filter),
          cycles: dayCycles,
          reports: dayReports,
          id: dateKey,
        };
      }).filter(d => d.totalRevenue > 0 || d.totalKm > 0);
  }, [cycles, importedReports, settings, filter]);

  const driverScore = useMemo(() => {
    return calculateDriverScore({
      efficiencyPercentage: stats.avgEfficiency,
      profitPerKm: stats.netPerKm
    });
  }, [stats]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-4xl mx-auto pb-32">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full rounded-[2.5rem]" />
            <Skeleton className="h-32 w-full rounded-[2.5rem]" />
            <Skeleton className="h-32 w-full rounded-[2.5rem]" />
            <Skeleton className="h-32 w-full rounded-[2.5rem]" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-16 max-w-[1200px] mx-auto overflow-x-hidden w-full min-w-0 pb-40 px-4 md:px-8">
      {/* HEADER PAINEL */}
      <header className="flex justify-between items-start pt-6 md:pt-12">
        <div className="space-y-1 relative">
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-[#00FFBB]/5 blur-[80px] rounded-full pointer-events-none" />
          <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-black tracking-tighter text-white italic font-display leading-[1.2]">
            AUDITORIA <span className="text-[#00FFBB]">OPERACIONAL</span>
          </h1>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] flex items-center gap-2">
            <Calendar size={12} className="text-zinc-700" />
            PERÍODO: {format(start, "dd MMM")} - {format(end, "dd MMM")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator variant="minimal" />
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilterModal(true)}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#00FFBB] transition-colors"
          >
            <Filter size={20} />
          </motion.button>
        </div>
      </header>

      {/* executive DASH - SENSOR ARRAY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <MiniSensor label="FATURADO TOTAL" value={<CountUp value={stats.total} />} icon={DollarSign} accent="text-white" />
        <MiniSensor label="LUCRO LÍQUIDO" value={<CountUp value={stats.totalProfit} />} icon={TrendingUp} accent="text-[#00FFBB]" />
        <MiniSensor label="DISTÂNCIA TOTAL" value={`${stats.totalKm.toFixed(1)} KM`} icon={Navigation} accent="text-indigo-400" />
        <MiniSensor label="EFICIÊNCIA" value={`${Math.round(stats.avgEfficiency)}%`} icon={Activity} accent="text-rose-400" />
      </div>

      {/* TARGET PROGRESS - GLASS INSTRUMENT */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] shadow-[0_0_10px_#00FFBB]" />
          <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">PROGRESSO DA MISSÃO SEMANAL</h2>
        </div>
        <Card className="border-none bg-[#0B0C10]/40 backdrop-blur-3xl shadow-2xl rounded-[1.5rem] md:rounded-[3rem] overflow-hidden border border-white/5 border-beam-container">
             <div className="border-beam" />
             <CardContent className="p-6 md:p-14 space-y-8 md:space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-baseline gap-4 md:gap-6">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1 md:mb-2">PROGRESSO ATUAL</p>
                    <h3 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black text-white italic font-display tracking-tighter">
                        <CountUp value={stats.total} />
                    </h3>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-1 md:mb-2">TARGET SEMANAL</p>
                    <p className="text-xl md:text-3xl font-black text-zinc-400 italic font-display tracking-tighter">
                        {formatCurrency(settings.dailyGoal * 7)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4">
                  <div className="h-4 md:h-5 bg-white/5 rounded-full p-1 border border-white/5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (stats.total / (settings.dailyGoal * 7)) * 100)}%` }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#00FFBB]/40 via-[#00FFBB] to-[#00FFBB] rounded-full shadow-[0_0_30px_rgba(0,255,187,0.4)]"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    <span>STATUS: {stats.total >= settings.dailyGoal * 7 ? 'MISSÃO CONCLUÍDA' : 'EM CURSO'}</span>
                    <span>DELTA: {formatCurrency(Math.max(0, (settings.dailyGoal * 7) - stats.total))}</span>
                  </div>
                </div>
             </CardContent>
        </Card>
      </section>

      {/* PERFORMANCE ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
           <DailyRevenueCard 
              bestDay={stats.best}
              currentWeek={currentWeek}
              settings={settings}
              today={today}
            />
        </div>
        
        <div className="lg:col-span-5">
           <PlatformMixCard 
              platformTotals={stats.platformTotals}
              total={stats.total}
              isPrivacyMode={settings.isPrivacyMode}
            />
        </div>

        <div className="lg:col-span-7">
          <InsightsCard 
            performanceData={{
              ...smartInsights,
              bestDayLabel: smartInsights.bestDayOfWeek !== null ? format(addDays(start, smartInsights.bestDayOfWeek), 'EEEE', { locale: ptBR }) : 'ALIMENTANDO...',
              weakestDayLabel: smartInsights.weakestDayOfWeek !== null ? format(addDays(start, smartInsights.weakestDayOfWeek), 'EEEE', { locale: ptBR }) : 'ALIMENTANDO...',
              avgProfitPerKmLabel: getEfficiencyStatus(stats.totalKm, stats.total).isValid 
                ? formatCurrency(smartInsights.avgProfitPerKm, settings.isPrivacyMode)
                : '--'
            }}
            driverScore={driverScore}
            isCollecting={stats.maturity.status === 'coletando'}
            smartTip={stats.smartTip}
          />
        </div>
      </div>

      {/* RECENT LOGS - LOG RECORDER STYLE */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">LOG DE OPERAÇÕES RECENTES</h2>
          </div>
          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{recentDays.length} ENTIDADES REGISTRADAS</p>
        </div>
        
        <div className="space-y-4">
            {recentDays.map((day, idx) => (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => day.cycles.length > 0 && navigate(`/faturamento`)}
                  className="group bg-[#0B0C10]/40 backdrop-blur-2xl border border-white/5 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 md:gap-8">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-[#00FFBB] transition-colors border border-white/5">
                        <History className="w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                        <p className="text-sm md:text-lg font-black text-white italic font-display uppercase tracking-tight">
                            {format(parseISO(day.id), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-[9px] md:text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                                {day.totalKm.toFixed(1)} KM
                            </span>
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                            <span className={cn(
                                "text-[9px] md:text-[11px] font-black uppercase tracking-widest",
                                day.totalRevenue > 0 ? "text-[#00FFBB]" : "text-zinc-600"
                            )}>
                                {formatCurrency(day.totalRevenue)}
                            </span>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6">
                      <div className="hidden sm:flex flex-col items-end">
                          <p className="text-[8px] md:text-[9px] font-black text-zinc-700 uppercase tracking-widest">EFICÁCIA</p>
                          <p className="text-xs md:text-sm font-black text-zinc-400 italic font-display">{Math.round(day.efficiency)}%</p>
                      </div>
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-800 group-hover:text-[#00FFBB] transition-colors" />
                  </div>
                </motion.div>
            ))}
        </div>
      </section>

      {/* FILTER MODAL - DASHBOARD STYLE */}
      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-sm bg-[#0B0C10] border border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl"
            >
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-white italic font-display uppercase tracking-tighter">PARÂMETROS DE VISTA</h3>
                    <button onClick={() => setShowFilterModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                        <X size={20} />
                    </button>
                </div>
                <div className="space-y-4">
                    {['all', 'manual', 'imported'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setFilter(opt as any); setShowFilterModal(false); }}
                          className={cn(
                              "w-full p-6 rounded-[2rem] text-left border transition-all flex items-center justify-between group",
                              filter === opt ? "bg-[#00FFBB]/10 border-[#00FFBB]/40 shadow-[0_0_20px_rgba(0,255,187,0.1)]" : "bg-white/5 border-white/5 hover:border-white/20"
                          )}
                        >
                            <div>
                                <p className={cn("text-sm font-black uppercase tracking-widest", filter === opt ? "text-[#00FFBB]" : "text-zinc-500")}>
                                    {opt === 'all' ? 'SENSORES TOTAIS' : opt === 'manual' ? 'REGISTRO MANUAL' : 'IMPORTAÇÃO IA'}
                                </p>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase mt-1">Sincronização de dados múltiplos</p>
                            </div>
                            {filter === opt && <div className="w-4 h-4 bg-[#00FFBB] rounded-full shadow-[0_0_10px_#00FFBB]" />}
                        </button>
                    ))}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={async () => {
          if (reportToDelete) {
            const result = await deleteImportedReport(reportToDelete);
            if (result.success) toast.success('Protocolo excluído');
            setReportToDelete(null);
          }
        }}
        title="EXCLUIR PROTOCOLO?"
        message="A exclusão de dados brutos pode comprometer a precisão da auditoria financeira."
        confirmText="DELETAR DADO"
        variant="danger"
      />
    </div>
  );
};

const MiniSensor = ({ label, value, icon: Icon, accent }: any) => (
    <Card className="bg-[#0B0C10]/40 backdrop-blur-2xl border-none shadow-xl rounded-[1.25rem] md:rounded-[2rem] border border-white/5 overflow-hidden">
        <CardContent className="p-4 md:p-8 space-y-3 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3 text-zinc-600">
                <div className="p-1.5 md:p-2 rounded-xl bg-white/5">
                    <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                </div>
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em]">{label}</p>
            </div>
            <p className={cn("text-lg md:text-2xl font-black italic font-display tracking-tighter truncate", accent)}>
                {value}
            </p>
        </CardContent>
    </Card>
);
