import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost, formatKm, calculateOperationalCost, calculateEfficiencyMetrics, consolidateDailyData, calculateDriverScore } from '../utils';
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

export const Reports = () => {
  const { cycles, settings, importedReports, isSaving, vehicles } = useDriverStore();
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
    return vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, settings.currentVehicleProfileId]);

  const dailyFixed = useMemo(() => {
    const fixedCosts = currentVehicle?.fixedCosts || settings.fixedCosts;
    return calculateDailyFixedCost(fixedCosts);
  }, [currentVehicle, settings.fixedCosts]);
  
  const today = useMemo(() => startOfDay(new Date()), []);
  const start = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const end = useMemo(() => addDays(start, 6), [start]);

  const { dailyData: weekData, totals: weekTotals, platformMix, aiIntelligence } = useConsolidatedAnalytics(start, end, filter);

  const currentWeek = useMemo(() => {
    return weekData.map(day => ({
      name: format(day.date, 'EEE', { locale: ptBR }),
      fullName: format(day.date, "dd 'de' MMM", { locale: ptBR }),
      value: day.totalRevenue,
      expenses: day.expenses,
      profit: day.profit,
      totalKm: day.totalKm,
      idleKm: day.idleKm,
      rideKm: day.rideKm,
      grossPerKm: day.totalKm > 0 ? day.totalRevenue / day.totalKm : 0,
      netPerKm: day.totalKm > 0 ? day.profit / day.totalKm : 0,
      profitPerProductiveKm: day.rideKm > 0 ? day.profit / day.rideKm : 0,
      efficiencyPercentage: day.efficiency,
      hasMismatch: day.hasMismatch,
      importedTotal: day.importedTotal,
      uber: day.uber,
      noventanove: day.noventanove,
      indriver: day.indriver,
      extra: day.extra,
      date: day.date
    }));
  }, [weekData]);

  const stats = useMemo(() => {
    const total = weekTotals.totalRevenue;
    const totalExpenses = weekTotals.expenses;
    const totalProfit = weekTotals.profit;
    const totalKm = weekTotals.totalKm;
    const totalRideKm = weekTotals.rideKm;
    const totalIdleKm = weekTotals.idleKm;
    const avgEfficiency = totalKm > 0 ? (totalRideKm / totalKm) * 100 : 0;
    const avg = total / 7;
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

    return {
      total,
      totalExpenses,
      totalProfit,
      totalKm,
      totalRideKm,
      totalIdleKm,
      avgEfficiency,
      avg,
      grossPerKm,
      netPerKm,
      best: sorted[0],
      platformTotals,
      alerts,
      mismatches: currentWeek.filter(d => d.hasMismatch)
    };
  }, [currentWeek, weekTotals]);

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
      className="space-y-6 pb-24 md:pb-8"
    >
      <header className="flex justify-between items-center px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Relatórios</p>
          <h1 className="text-3xl font-black tracking-tighter">Análise Semanal</h1>
        </div>
        <div className="flex items-center gap-4">
          <SyncIndicator />
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/import-report')}
              className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20"
              title="Importar por Print"
            >
              <Camera size={18} />
            </button>
            <button 
              onClick={() => setShowFilterModal(true)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                filter !== 'all' ? "bg-emerald-500 text-zinc-950" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>
      </header>

      {showSuccess && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-500"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold">{location.state.successMessage}</p>
        </motion.div>
      )}

      {/* AI Intelligence Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none bg-zinc-900 text-white shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Award size={16} className="text-emerald-400" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest">Inteligência de Performance</h3>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                driverScore.color
              )}>
                Score: {driverScore.score} - {driverScore.label}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Melhor Dia da Semana</p>
                <p className="text-sm font-black text-emerald-400">
                  {aiIntelligence.bestDayOfWeek !== null ? format(addDays(start, aiIntelligence.bestDayOfWeek), 'EEEE', { locale: ptBR }) : 'Analisando...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Pior Dia da Semana</p>
                <p className="text-sm font-black text-red-400">
                  {aiIntelligence.weakestDayOfWeek !== null ? format(addDays(start, aiIntelligence.weakestDayOfWeek), 'EEEE', { locale: ptBR }) : 'Analisando...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Média Lucro/KM</p>
                <p className="text-sm font-black text-blue-400">{formatCurrency(aiIntelligence.avgProfitPerKm)}/km</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">KM Produtivo Médio</p>
                <p className="text-sm font-black text-white">{aiIntelligence.avgProductiveKm.toFixed(1)} km/dia</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Zonas de Espera Identificadas</p>
                <button 
                  onClick={() => navigate('/heatmap')}
                  className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                >
                  <MapIcon size={10} />
                  Ver Mapa de Calor
                </button>
              </div>
              <div className="space-y-2">
                {aiIntelligence.waitingZones.length > 0 ? aiIntelligence.waitingZones.map((zone, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <p className="text-[10px] font-bold text-zinc-300">Região {i + 1} ({zone.lat.toFixed(3)}, {zone.lng.toFixed(3)})</p>
                    </div>
                    <p className="text-[10px] font-black text-zinc-500">{(zone.time / 60000).toFixed(0)} min acumulados</p>
                  </div>
                )) : (
                  <p className="text-[10px] font-bold text-zinc-500 italic">Ainda não há dados de rastreamento suficientes para identificar zonas de espera.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock size={16} className="text-blue-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Melhores Horários por Dia</h3>
            </div>

            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map(day => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {format(addDays(start, day), 'EEEE', { locale: ptBR })}
                  </p>
                  <p className="text-xs font-black text-zinc-900 dark:text-white">
                    {aiIntelligence.bestHourByDay[day] || 'Sem dados'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Faturado" value={formatCurrency(stats.total)} color="text-zinc-900 dark:text-white" />
        <SummaryCard label="Lucro Total" value={formatCurrency(stats.totalProfit)} color="text-emerald-500" />
        <SummaryCard label="KM Produtivo" value={formatKm(stats.totalRideKm)} color="text-emerald-500" />
        <SummaryCard label="Eficiência" value={`${stats.avgEfficiency.toFixed(0)}%`} color="text-blue-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="KM Total" value={formatKm(stats.totalKm)} color="text-zinc-500" />
        <SummaryCard label="KM Ocioso" value={formatKm(stats.totalIdleKm)} color="text-zinc-400" />
        <SummaryCard label="R$/KM Bruto" value={formatCurrency(stats.grossPerKm)} color="text-zinc-500" />
        <SummaryCard label="R$/KM Líquido" value={formatCurrency(stats.netPerKm)} color="text-zinc-500" />
      </div>

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
                      O valor manual ({formatCurrency(day.value)}) difere do print ({formatCurrency(day.importedTotal)}).
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

      {/* Main Chart Card */}
      <Card className="border-none bg-zinc-900 text-white shadow-2xl overflow-hidden">
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Faturamento Diário</p>
              <h2 className="text-2xl font-black tracking-tight">{stats.best.fullName} foi seu melhor dia</h2>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentWeek}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#52525b', fontWeight: 800 }}
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl shadow-2xl space-y-3 min-w-[160px]">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{data.fullName}</p>
                          <p className="text-xl font-black text-white">{formatCurrency(data.value)}</p>
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">Lucro</span>
                              <span className="text-emerald-400">{formatCurrency(data.profit)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">Despesas</span>
                              <span className="text-red-400">{formatCurrency(data.expenses)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">KM Total</span>
                              <span className="text-blue-400">{formatKm(data.totalKm)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">R$/KM Bruto</span>
                              <span className="text-zinc-300">{formatCurrency(data.grossPerKm)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">Eficiência</span>
                              <span className="text-blue-400">{Math.round(data.efficiencyPercentage)}%</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-zinc-500 uppercase">Lucro/KM Real</span>
                              <span className="text-emerald-400">{formatCurrency(data.profitPerProductiveKm)}</span>
                            </div>
                            {data.hasMismatch && (
                              <div className="flex justify-between items-center text-[9px] font-bold text-amber-400 pt-1 border-t border-white/5">
                                <span className="uppercase">Diferença Print</span>
                                <span>{formatCurrency(data.value - data.importedTotal)}</span>
                              </div>
                            )}
                            <div className="pt-1" />
                            <TooltipItem label="Uber" value={data.uber} color="bg-white" />
                            <TooltipItem label="99" value={data.noventanove} color="bg-yellow-500" />
                            <TooltipItem label="inDrive" value={data.indriver} color="bg-emerald-500" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {settings.dashboardMode === 'segmented' ? (
                  <>
                    <Bar dataKey="uber" stackId="a" fill="#ffffff" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="noventanove" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="indriver" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="extra" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                  </>
                ) : (
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {currentWeek.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        className={cn(
                          isSameDay(entry.date, today) ? "fill-emerald-500" : "fill-zinc-800"
                        )}
                      />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-500" />
              Mix de Plataformas
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Últimos 7 dias</span>
          </div>
          
          <div className="space-y-5">
            <PlatformRow label="Uber" value={stats.platformTotals.uber} total={stats.total} color="bg-zinc-900 dark:bg-white" />
            <PlatformRow label="99" value={stats.platformTotals.noventanove} total={stats.total} color="bg-yellow-500" />
            <PlatformRow label="inDrive" value={stats.platformTotals.indriver} total={stats.total} color="bg-emerald-500" />
            <PlatformRow label="Extra / Outros" value={stats.platformTotals.extra} total={stats.total} color="bg-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <Calendar size={16} className="text-zinc-400" />
            Histórico Recente
          </h3>
        </div>
        
        <div className="space-y-3">
          {recentDays.map((day) => (
            <Card 
              key={day.id} 
              className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => {
                if (day.cycles.length === 1) {
                  navigate(`/cycle/${day.cycles[0].id}`);
                } else if (day.cycles.length > 1) {
                  // If multiple cycles, go to the first one for now
                  navigate(`/cycle/${day.cycles[0].id}`);
                }
              }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[40px]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase">
                      {format(day.date, 'MMM', { locale: ptBR })}
                    </p>
                    <p className="text-xl font-black tracking-tighter">
                      {format(day.date, 'dd')}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black tracking-tight">{formatCurrency(day.totalRevenue)}</p>
                      {day.hasMismatch && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-[8px] font-black uppercase text-amber-400">
                          <AlertCircle size={8} />
                          Divergência
                        </span>
                      )}
                      {day.cycles.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[8px] font-black uppercase text-blue-500">
                          {day.cycles.length} Ciclos
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {formatKm(day.totalKm)} • {day.rideKm > 0 ? `${Math.round(day.efficiency)}% Efic.` : 'Sem KM'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                        Lucro: {formatCurrency(day.profit)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Imported Reports List */}
      {importedReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-zinc-400" />
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
                    "border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group transition-all",
                    linkedCycle ? "cursor-pointer active:scale-[0.98]" : ""
                  )}
                  onClick={() => linkedCycle && navigate(`/cycle/${linkedCycle.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        report.platform === 'Uber' ? "bg-zinc-900 text-white" : 
                        report.platform === '99' ? "bg-yellow-500 text-black" : "bg-emerald-500 text-white"
                      )}>
                        <Camera size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black tracking-tight">{formatCurrency(report.total_earnings)}</p>
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[8px] font-black uppercase text-zinc-500">
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
                      <div className="text-right">
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
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tight uppercase">Filtrar Dados</h3>
                  <button 
                    onClick={() => setShowFilterModal(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
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

const PlatformRow = ({ label, value, total, color }: any) => {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className="text-right">
          <span className="text-sm font-black tracking-tight">{formatCurrency(value)}</span>
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

const TooltipItem = ({ label, value, color }: any) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-[10px] font-black text-white">{formatCurrency(value)}</span>
  </div>
);
