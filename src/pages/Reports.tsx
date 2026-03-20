import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost, formatKm } from '../utils';
import { Card, CardContent } from '../components/UI';
import { 
  TrendingUp, Calendar, ChevronRight, BarChart3, Award, Zap, Download, Filter, Gauge, Camera, CheckCircle2, FileText
} from 'lucide-react';
import { 
  startOfDay, isSameDay, parseISO, format, subDays, startOfWeek, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';

export const Reports = () => {
  const { cycles, settings, importedReports } = useDriverStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    if (location.state?.successMessage) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  
  const currentVehicle = useMemo(() => {
    return settings.vehicleProfiles?.find(v => v.id === settings.currentVehicleProfileId);
  }, [settings.vehicleProfiles, settings.currentVehicleProfileId]);

  const dailyFixed = useMemo(() => {
    const fixedCosts = currentVehicle?.fixedCosts || settings.fixedCosts;
    return calculateDailyFixedCost(fixedCosts);
  }, [currentVehicle, settings.fixedCosts]);
  
  const today = startOfDay(new Date());
  
  const currentWeek = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i);
      const dayCycles = cycles.filter(c => isSameDay(parseISO(c.start_time), date));
      const dayRevenue = dayCycles.reduce((acc, c) => acc + c.total_amount, 0);
      const dayExpenses = dayCycles.reduce((acc, c) => acc + (c.total_expenses || 0), 0);
      
      const uber = dayCycles.reduce((acc, c) => acc + c.uber_amount, 0);
      const noventanove = dayCycles.reduce((acc, c) => acc + c.noventanove_amount, 0);
      const indriver = dayCycles.reduce((acc, c) => acc + c.indriver_amount, 0);
      const extra = dayCycles.reduce((acc, c) => acc + c.extra_amount, 0);
      
      const totalKm = dayCycles.reduce((acc, c) => acc + (c.total_km || 0), 0);
      const rideKm = dayCycles.reduce((acc, c) => acc + (c.ride_km || 0), 0);

      // Only apply fixed cost if there was activity
      const fixedCost = dayRevenue > 0 ? dailyFixed : 0;
      const totalDayExpenses = dayExpenses + fixedCost;
      const profit = dayRevenue - totalDayExpenses;

      // Earnings per KM
      const grossPerKm = totalKm > 0 ? dayRevenue / totalKm : 0;
      const netPerKm = totalKm > 0 ? profit / totalKm : 0;

      // Find matching imported reports for this day
      const dayImportedReports = importedReports.filter(r => 
        r.report_type === 'daily' && isSameDay(parseISO(r.period_start), date)
      );
      const importedTotal = dayImportedReports.reduce((acc, r) => acc + r.total_earnings, 0);
      const hasMismatch = dayRevenue > 0 && importedTotal > 0 && Math.abs(dayRevenue - importedTotal) > 5;

      return {
        name: format(date, 'EEE', { locale: ptBR }),
        fullName: format(date, "dd 'de' MMM", { locale: ptBR }),
        value: dayRevenue,
        expenses: totalDayExpenses,
        profit,
        totalKm,
        rideKm,
        grossPerKm,
        netPerKm,
        hasMismatch,
        importedTotal,
        uber,
        noventanove,
        indriver,
        extra,
        date: date
      };
    });
  }, [cycles, today, dailyFixed, importedReports]);

  const stats = useMemo(() => {
    const total = currentWeek.reduce((acc, d) => acc + d.value, 0);
    const totalExpenses = currentWeek.reduce((acc, d) => acc + d.expenses, 0);
    const totalProfit = total - totalExpenses;
    const totalKm = currentWeek.reduce((acc, d) => acc + d.totalKm, 0);
    const avg = total / 7;
    const sorted = [...currentWeek].sort((a, b) => b.value - a.value);
    
    const grossPerKm = totalKm > 0 ? total / totalKm : 0;
    const netPerKm = totalKm > 0 ? totalProfit / totalKm : 0;

    const platformTotals = currentWeek.reduce((acc, d) => ({
      uber: acc.uber + d.uber,
      noventanove: acc.noventanove + d.noventanove,
      indriver: acc.indriver + d.indriver,
      extra: acc.extra + d.extra
    }), { uber: 0, noventanove: 0, indriver: 0, extra: 0 });

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
      avg,
      grossPerKm,
      netPerKm,
      best: sorted[0],
      platformTotals,
      alerts
    };
  }, [currentWeek]);

  const recentCycles = useMemo(() => {
    return [...cycles]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 15);
  }, [cycles]);

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
            <button className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
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

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Faturado" value={formatCurrency(stats.total)} color="text-zinc-900 dark:text-white" />
        <SummaryCard label="Lucro Total" value={formatCurrency(stats.totalProfit)} color="text-emerald-500" />
        <SummaryCard label="KM Total" value={formatKm(stats.totalKm)} color="text-blue-500" />
        <SummaryCard label="R$/KM Bruto" value={formatCurrency(stats.grossPerKm)} color="text-zinc-500" />
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
          {recentCycles.map((cycle) => (
            <Card key={cycle.id} className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group active:scale-[0.98] transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[40px]">
                    <p className="text-[9px] font-black text-zinc-400 uppercase">
                      {format(new Date(cycle.start_time), 'MMM', { locale: ptBR })}
                    </p>
                    <p className="text-xl font-black tracking-tighter">
                      {format(new Date(cycle.start_time), 'dd')}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-zinc-100 dark:bg-zinc-800" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black tracking-tight">{formatCurrency(cycle.total_amount)}</p>
                      {cycle.source === 'Importado via print' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-black uppercase text-emerald-500">
                          <Camera size={8} />
                          Print
                        </span>
                      )}
                      {cycle.imported_report_id && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[8px] font-black uppercase text-blue-500">
                          Verificado
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {formatKm(cycle.total_km || 0)} • {format(new Date(cycle.start_time), 'HH:mm')} 
                      {cycle.end_time && ` • ${format(new Date(cycle.end_time), 'HH:mm')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    cycle.status === 'open' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                  )}>
                    {cycle.status === 'open' ? 'Aberto' : 'Fechado'}
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
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
            {[...importedReports].reverse().map((report) => (
              <Card key={report.id} className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
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
                        {report.period_start} {report.period_end && ` - ${report.period_end}`} • {report.report_type === 'daily' ? 'Diário' : 'Semanal'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-400 uppercase">Importado em</p>
                    <p className="text-[10px] font-black text-zinc-600 dark:text-zinc-400">
                      {format(new Date(report.imported_at), 'dd/MM/yy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
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
