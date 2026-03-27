import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost, formatKm, calculateOperationalCost, calculateEfficiencyMetrics, consolidateDailyData, calculateDriverScore, safeNumber } from '../utils';
import { useConsolidatedAnalytics } from '../hooks/useConsolidatedAnalytics';
import { Card, CardContent, Button } from '../components/UI';
import { 
  TrendingUp, Calendar, ChevronRight, BarChart3, Award, Zap, Download, Filter, Gauge, Camera, CheckCircle2, FileText, Map as MapIcon, X, Check, AlertCircle, Clock
} from 'lucide-react';
import { 
  startOfDay, isSameDay, parseISO, format, subDays, startOfWeek, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';

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
  const { cycles, settings, importedReports, isSaving, vehicles, activeVehicleId } = useDriverStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [filter, setFilter] = useState<'all' | 'manual' | 'imported'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  useEffect(() => {
    if (location.state?.successMessage) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const dailyFixed = useMemo(() => {
    const fixedCosts = currentVehicle?.fixedCosts || settings.fixedCosts;
    return calculateDailyFixedCost(fixedCosts);
  }, [currentVehicle, settings.fixedCosts]);
  
  const today = useMemo(() => startOfDay(new Date()), []);
  const start = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const end = useMemo(() => addDays(start, 6), [start]);

  const { dailyData: weekData, totals: weekTotals, platformMix, averages, aiIntelligence } = useConsolidatedAnalytics(start, end, filter);

  const currentWeek = useMemo(() => {
    return weekData.map(day => ({
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
    const totalIdleKm = safeNumber(weekTotals.idleKm);
    
    // Use averages from the hook
    const avgEfficiency = safeNumber(averages.efficiency);
    const avg = safeNumber(averages.revenue);
    
    const sorted = [...currentWeek].sort((a, b) => b.value - a.value);
    
    const grossPerKm = totalKm > 0 ? total / totalKm : 0;
    const netPerKm = totalKm > 0 ? totalProfit / totalKm : 0;

    const platformTotals = {
      uber: weekTotals.uber,
      noventanove: weekTotals.noventanove,
      indriver: weekTotals.indriver,
      extra: weekTotals.extra
    };

    // Smart Alerts
    const alerts = [];
    if (total > 0 && (totalProfit / total) < 0.3) {
      alerts.push({
        type: 'warning',
        title: 'Margem de Lucro Baixa',
        message: 'Seu lucro está abaixo de 30% do faturamento. Revise seus custos fixos e combustível.'
      });
    }

    const mismatchDays = currentWeek.filter(d => d.hasMismatch);
    if (mismatchDays.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Divergência de Dados',
        message: `Identificamos ${mismatchDays.length} dia(s) onde o valor manual difere do print importado.`
      });
    }

    if (totalKm > 0 && grossPerKm < 1.5) {
      alerts.push({
        type: 'warning',
        title: 'Baixo Rendimento por KM',
        message: 'Sua média bruta por KM está abaixo de R$ 1,50. Tente selecionar melhor as corridas.'
      });
    }

    const totalLostRevenue = currentWeek.reduce((acc, d) => {
      const metrics = calculateEfficiencyMetrics({
        total_amount: d.value,
        ride_km: d.rideKm,
        displacement_km: d.idleKm,
        total_expenses: d.expenses,
        vehicle_snapshot: currentVehicle
      }, settings);
      return acc + safeNumber(metrics.lostRevenue);
    }, 0);

    // 8. ESTADOS HONESTOS DE MATURIDADE DE DADOS
    const maturity = aiIntelligence.maturity;

    // Contextual AI Tip
    let aiTip = '';
    if (maturity.status === 'coletando') {
      aiTip = "Coletando dados iniciais. Continue registrando suas corridas para que a IA possa analisar seu desempenho.";
    } else if (maturity.status === 'em_formacao') {
      aiTip = `Dados em formação (${maturity.totalKm.toFixed(1)}km). ${maturity.message}. Continue usando para identificar seus melhores horários.`;
    } else {
      if (avgEfficiency < 40) {
        aiTip = "Sua eficiência está abaixo da média. Tente reduzir o deslocamento ocioso entre as corridas para aumentar seu lucro líquido.";
      } else if (netPerKm < 1.2) {
        aiTip = "Seu lucro por KM está baixo. Considere ser mais seletivo nas corridas ou revisar seus gastos com combustível.";
      } else if (aiIntelligence.efficiencyTrend < 0) {
        aiTip = "Sua eficiência caiu nos últimos dias. Verifique se houve mudança no seu horário ou região de trabalho.";
      } else {
        aiTip = "Seu desempenho está sólido! Continue focando nos horários de pico identificados para manter sua rentabilidade.";
      }
    }

    return {
      total,
      totalExpenses,
      totalProfit,
      totalKm,
      totalRideKm,
      totalIdleKm,
      totalLostRevenue,
      avgEfficiency,
      avg,
      grossPerKm,
      netPerKm,
      best: sorted[0],
      platformTotals,
      alerts,
      maturity,
      aiTip,
      mismatches: currentWeek.filter(d => d.hasMismatch)
    };
  }, [currentWeek, weekTotals, settings, currentVehicle, aiIntelligence]);

  const recentDays = useMemo(() => {
    // Group data by date first for O(1) lookup
    const cyclesByDate: Record<string, any[]> = {};
    const reportsByDate: Record<string, any[]> = {};

    cycles.forEach(cycle => {
      const dateKey = format(parseISO(cycle.start_time), 'yyyy-MM-dd');
      if (!cyclesByDate[dateKey]) cyclesByDate[dateKey] = [];
      cyclesByDate[dateKey].push(cycle);
    });

    importedReports.forEach(report => {
      const dateKey = format(parseISO(report.period_start), 'yyyy-MM-dd');
      if (!reportsByDate[dateKey]) reportsByDate[dateKey] = [];
      reportsByDate[dateKey].push(report);
    });

    const allDates = new Set<string>();
    Object.keys(cyclesByDate).forEach(d => allDates.add(d));
    Object.keys(reportsByDate).forEach(d => allDates.add(d));
    
    const sortedDates = Array.from(allDates)
      .map(d => parseISO(d))
      .sort((a, b) => b.getTime() - a.getTime())
      .slice(0, 30);

    return sortedDates.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayCycles = cyclesByDate[dateKey] || [];
      const dayReports = reportsByDate[dateKey] || [];
      
      const consolidated = consolidateDailyData(
        date, 
        dayCycles, 
        dayReports, 
        settings, 
        undefined, 
        filter
      );
      
      return {
        ...consolidated,
        cycles: dayCycles,
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-48 md:pb-8"
    >
      <ReportsHeader 
        onImportClick={() => navigate('/import-report')}
        onFilterClick={() => setShowFilterModal(true)}
        filter={filter}
      />

      {showSuccess && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-500 mb-6"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold">{location.state.successMessage}</p>
        </motion.div>
      )}

      {!activeVehicleId && (
        <Card className="border-none bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3 mb-6">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Veículo não selecionado</p>
            <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">Selecione um veículo para ver os relatórios consolidados.</p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8 px-3 text-[10px] font-black uppercase tracking-widest"
          >
            Configurar
          </Button>
        </Card>
      )}

      {/* 2. Resumo Executivo da Semana */}
      <WeeklyExecutiveSummary 
        total={stats.total}
        totalProfit={stats.totalProfit}
        totalRideKm={stats.totalRideKm}
        avgEfficiency={stats.avgEfficiency}
        isPrivacyMode={settings.isPrivacyMode}
        isCollecting={stats.maturity.status === 'coletando'}
      />

      {/* 3. Insights Inteligentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <InsightsCard 
          aiIntelligence={{
            ...aiIntelligence,
            bestDayLabel: aiIntelligence.bestDayOfWeek !== null ? format(addDays(start, aiIntelligence.bestDayOfWeek), 'EEEE', { locale: ptBR }) : 'Analisando...',
            weakestDayLabel: aiIntelligence.weakestDayOfWeek !== null ? format(addDays(start, aiIntelligence.weakestDayOfWeek), 'EEEE', { locale: ptBR }) : 'Analisando...',
            avgProfitPerKmLabel: formatCurrency(aiIntelligence.avgProfitPerKm, settings.isPrivacyMode)
          }}
          driverScore={driverScore}
          isCollecting={stats.maturity.status === 'coletando'}
          aiTip={stats.aiTip}
        />

        <div className="space-y-6">
          {/* 4. Melhores Horários */}
          <BestHoursCard 
            bestHourByDay={aiIntelligence.bestHourByDay}
            start={start}
            isCollecting={stats.maturity.status === 'coletando'}
          />

          {/* 5. Zonas de Espera */}
          <HeatmapSummaryCard 
            waitingZones={aiIntelligence.waitingZones}
            isCollecting={stats.maturity.status === 'coletando'}
            onViewHeatmap={() => navigate('/heatmap')}
          />
        </div>
      </div>

      {/* 6. Performance Operacional */}
      <PerformanceGrid 
        totalKm={stats.totalKm}
        totalIdleKm={stats.totalIdleKm}
        totalLostRevenue={stats.totalLostRevenue}
        grossPerKm={stats.grossPerKm}
        netPerKm={stats.netPerKm}
        isPrivacyMode={settings.isPrivacyMode}
        isCollecting={stats.maturity.status === 'coletando'}
      />

      {/* Smart Alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-3">
          {stats.alerts.map((alert, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-4 rounded-2xl border flex gap-3 items-start",
                alert.type === 'warning' 
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                  : "bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400"
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

      {/* Correction Suggestions */}
      {stats.mismatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 px-1">
            <Zap size={16} className="text-amber-500" />
            Sugestões de Correção
          </h3>
          <div className="space-y-3">
            {stats.mismatches.map((day, i) => (
              <Card key={i} className="border-none bg-amber-500/5 border border-amber-500/20 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{day.fullName}</p>
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      O valor manual ({formatCurrency(day.value, settings.isPrivacyMode)}) difere do print ({formatCurrency(day.importedTotal, settings.isPrivacyMode)}).
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase h-8"
                    onClick={() => {
                      const cycle = cycles.find(c => isSameDay(parseISO(c.start_time), day.date));
                      if (cycle) navigate(`/cycle/${cycle.id}`);
                    }}
                  >
                    {isSaving ? '...' : 'Corrigir'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. Faturamento Diário / Gráfico */}
      <DailyRevenueCard 
        bestDay={stats.best}
        currentWeek={currentWeek}
        settings={settings}
        today={today}
      />

      {/* 8. Mix de Plataformas */}
      <PlatformMixCard 
        platformTotals={stats.platformTotals}
        total={stats.total}
        isPrivacyMode={settings.isPrivacyMode}
      />

      {/* Correction Suggestions */}
      {stats.mismatches.length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 px-1">
            <Zap size={14} className="text-amber-500" />
            Sugestões de Correção
          </h3>
          <div className="space-y-3">
            {stats.mismatches.map((day, i) => (
              <Card key={i} className="border-none bg-amber-500/5 border border-amber-500/20 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{day.fullName}</p>
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      O valor manual ({formatCurrency(day.value, settings.isPrivacyMode)}) difere do print ({formatCurrency(day.importedTotal, settings.isPrivacyMode)}).
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={isSaving}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase h-8"
                    onClick={() => {
                      const cycle = cycles.find(c => isSameDay(parseISO(c.start_time), day.date));
                      if (cycle) navigate(`/cycle/${cycle.id}`);
                    }}
                  >
                    {isSaving ? '...' : 'Corrigir'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 9. Histórico Recente */}
      <RecentHistoryCardList 
        recentDays={recentDays}
        isPrivacyMode={settings.isPrivacyMode}
        onDayClick={(day) => {
          if (day.cycles.length === 1) {
            navigate(`/cycle/${day.cycles[0].id}`);
          } else if (day.cycles.length > 1) {
            navigate(`/cycle/${day.cycles[0].id}`);
          }
        }}
      />

      {/* Imported Reports List */}
      {importedReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Relatórios Importados (Prints)
            </h3>
          </div>
          
          <div className="space-y-3">
            {[...importedReports].reverse().map((report) => {
              const linkedCycle = cycles.find(c => c.imported_report_id === report.id);
              return (
                <Card 
                  key={report.id} 
                  className={cn(
                    "border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group transition-all border border-zinc-100 dark:border-zinc-800/50",
                    linkedCycle ? "cursor-pointer active:scale-[0.98]" : ""
                  )}
                  onClick={() => linkedCycle && navigate(`/cycle/${linkedCycle.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        report.platform === 'Uber' ? "bg-zinc-900 text-white" : 
                        report.platform === '99' ? "bg-yellow-500 text-black" : "bg-emerald-500 text-white"
                      )}>
                        <Camera size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black tracking-tight">{formatCurrency(report.total_earnings, settings.isPrivacyMode)}</p>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[8px] font-black uppercase text-zinc-500 border border-zinc-200 dark:border-zinc-700/50">
                            {report.platform}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          {report.period_start || 'Período não identificado'} 
                          {report.period_end && ` - ${report.period_end}`} 
                          <span className="mx-1 opacity-20">•</span>
                          {report.report_type === 'daily' ? 'Diário' : 'Semanal'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Importado em</p>
                        <p className="text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                          {format(new Date(report.imported_at), 'dd/MM/yy')}
                        </p>
                      </div>
                      {linkedCycle && <ChevronRight size={16} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterModal(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tighter uppercase">Filtrar Dados</h3>
                  <button 
                    onClick={() => setShowFilterModal(false)}
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'Todos os Dados', desc: 'Combina manual e prints' },
                    { id: 'manual', label: 'Apenas Manual', desc: 'Registros feitos no app' },
                    { id: 'imported', label: 'Apenas Prints', desc: 'Dados extraídos por IA' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setFilter(option.id as any);
                        setShowFilterModal(false);
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left border-2 transition-all",
                        filter === option.id 
                          ? "border-emerald-500 bg-emerald-500/5" 
                          : "border-zinc-100 dark:border-zinc-800 bg-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">{option.label}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{option.desc}</p>
                        </div>
                        {filter === option.id && (
                          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SummaryCard = ({ label, value, color }: any) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
    <CardContent className="p-4 space-y-1">
      <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{label}</p>
      <p className={cn("text-sm font-black tracking-tight truncate", color)}>{value}</p>
    </CardContent>
  </Card>
);

const PlatformRow = ({ label, value, total, color, isPrivacyMode }: any) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className="text-right">
          <span className="text-sm font-black tracking-tight">{formatCurrency(value, isPrivacyMode)}</span>
          <span className="text-[10px] text-zinc-400 ml-2 font-black">{percent.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn("h-full rounded-full", color)} 
        />
      </div>
    </div>
  );
};

const TooltipItem = ({ label, value, color, isPrivacyMode }: any) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-[10px] font-black text-white">{formatCurrency(value, isPrivacyMode)}</span>
  </div>
);
