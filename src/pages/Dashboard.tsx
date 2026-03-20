import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost, calculateEfficiencyMetrics, formatKm } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { TrendingUp, Clock, Target, Zap, LayoutGrid, Plus, ChevronRight, Navigation, Calendar, AlertCircle, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfDay, isSameDay, parseISO, subDays, format, differenceInMinutes, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSupabaseConfigured } from '../lib/supabase';
import { QuickEntryModal } from '../components/QuickEntryModal';
import { motion } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';

export const Dashboard = () => {
  const { cycles, settings, startCycle, checkAndCloseCycles } = useDriverStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);

  useEffect(() => {
    checkAndCloseCycles();
    const timer = setInterval(() => {
      setNow(new Date());
      checkAndCloseCycles();
    }, 60000);
    return () => clearInterval(timer);
  }, [checkAndCloseCycles]);

  const openCycle = useMemo(() => cycles.find(c => c.status === 'open'), [cycles]);
  
  const currentVehicle = useMemo(() => {
    return settings.vehicleProfiles?.find(v => v.id === settings.currentVehicleProfileId);
  }, [settings.vehicleProfiles, settings.currentVehicleProfileId]);

  const profitStats = useMemo(() => {
    if (!openCycle) return null;
    const earnings = openCycle.total_amount || 0;
    const expenses = (openCycle.fuel_expense || 0) + (openCycle.food_expense || 0) + (openCycle.other_expense || 0);
    const fixedCosts = currentVehicle?.fixedCosts || settings.fixedCosts;
    const dailyFixed = calculateDailyFixedCost(fixedCosts);
    const profit = earnings - expenses - dailyFixed;
    return { earnings, expenses, dailyFixed, profit };
  }, [openCycle, settings.fixedCosts, currentVehicle]);

  const efficiencyStats = useMemo(() => {
    if (!openCycle) return null;
    return calculateEfficiencyMetrics(openCycle, settings);
  }, [openCycle, settings]);

  const cycleProgress = useMemo(() => {
    if (!openCycle) return null;
    const start = new Date(openCycle.start_time);
    const total = 24 * 60;
    const elapsed = differenceInMinutes(now, start);
    const remaining = Math.max(0, total - elapsed);
    const percent = Math.min(100, (elapsed / total) * 100);
    
    return {
      percent,
      remainingHours: Math.floor(remaining / 60),
      remainingMinutes: remaining % 60
    };
  }, [openCycle, now]);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    
    const chartData = last7Days.map(date => {
      const dayCycles = cycles.filter(c => isSameDay(parseISO(c.start_time), date));
      const total = dayCycles.reduce((acc, c) => acc + c.total_amount, 0);
      return {
        name: format(date, 'EEE', { locale: ptBR }),
        value: total,
        date
      };
    });

    const total7Days = chartData.reduce((acc, d) => acc + d.value, 0);
    const avg = total7Days / 7;

    return { chartData, total7Days, avg };
  }, [cycles]);

  const handleStartCycle = async () => {
    await startCycle();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24 md:pb-8"
    >
      {/* Header Section */}
      <div className="flex justify-between items-end px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Visão Geral</p>
          <h1 className="text-3xl font-black tracking-tighter">Olá, {settings.name.split(' ')[0]}</h1>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <div className="mt-1">
            <SyncIndicator />
          </div>
        </div>
      </div>

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

      {/* Main Cycle Card */}
      <Card className="relative overflow-hidden border-none bg-zinc-900 text-white shadow-2xl shadow-zinc-900/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Navigation size={120} className="rotate-45" />
        </div>
        
        <CardContent className="p-8 space-y-8 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Faturamento do Ciclo</p>
              <h2 className="text-5xl font-black tracking-tighter">
                {formatCurrency(openCycle?.total_amount || 0)}
              </h2>
            </div>
            {openCycle && (
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                <Clock size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Fecha em {cycleProgress?.remainingHours}h {cycleProgress?.remainingMinutes}m
                </span>
              </div>
            )}
          </div>

          {profitStats && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Despesas</p>
                <p className="text-sm font-black text-red-400">{formatCurrency(profitStats.expenses + profitStats.dailyFixed)}</p>
              </div>
              <div className="col-span-2 text-right space-y-0.5">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lucro Estimado</p>
                <p className="text-2xl font-black text-emerald-400">{formatCurrency(profitStats.profit)}</p>
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
                      Iniciado às {format(new Date(openCycle.start_time), 'HH:mm')}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-400">{cycleProgress?.percent.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cycleProgress?.percent}%` }}
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
                    Toque em 'Iniciar Novo Ciclo' para começar seu período de 24 horas.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!openCycle ? (
                <Button 
                  onClick={handleStartCycle}
                  className="col-span-2 h-16 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20"
                >
                  Iniciar Novo Ciclo
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
            <PlatformMiniStat label="Uber" value={openCycle.uber_amount} color="bg-white" />
            <PlatformMiniStat label="99" value={openCycle.noventanove_amount} color="bg-yellow-500" />
            <PlatformMiniStat label="inDrive" value={openCycle.indriver_amount} color="bg-emerald-500" />
            <PlatformMiniStat label="Outros" value={openCycle.extra_amount} color="bg-blue-500" />
          </div>
        )}
      </Card>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Target size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">Meta Diária</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tighter">{formatCurrency(settings.dailyGoal)}</p>
              {openCycle && openCycle.total_amount >= settings.dailyGoal && (
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
            <p className="text-2xl font-black tracking-tighter">{formatCurrency(stats.avg)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Distance & Efficiency Stats */}
      {openCycle && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 border-b border-zinc-50 dark:border-zinc-800/50 flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <Gauge size={16} className="text-emerald-500" />
                  Análise de Eficiência
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Total:</span>
                  <span className="text-xs font-black">{formatKm(openCycle.total_km || 0)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 divide-x divide-zinc-50 dark:divide-zinc-800/50">
                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Em Corrida</p>
                  <p className="text-sm font-black tracking-tight">{formatKm(openCycle.ride_km || 0)}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Deslocamento</p>
                  <p className="text-sm font-black tracking-tight text-zinc-500">{formatKm(openCycle.displacement_km || 0)}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">R$/km Bruto</p>
                  <p className="text-sm font-black tracking-tight text-emerald-500">
                    {formatCurrency(efficiencyStats?.grossPerKm || 0).replace('R$', '')}/km
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">R$/km Líquido</p>
                    <p className="text-xs font-black">{formatCurrency(efficiencyStats?.netPerKm || 0)}/km</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Lucro/km Real</p>
                    <p className="text-xs font-black text-emerald-500">{formatCurrency(efficiencyStats?.profitPerKm || 0)}/km</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart Preview */}
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
              <BarChart data={stats.chartData}>
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                  {stats.chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      className={cn(
                        isSameDay(entry.date, new Date()) ? "fill-emerald-500" : "fill-zinc-100 dark:fill-zinc-800"
                      )}
                    />
                  ))}
                </Bar>
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
                      return (
                        <div className="bg-zinc-900 text-white px-3 py-2 rounded-xl text-[10px] font-black shadow-2xl border border-white/5">
                          {formatCurrency(payload[0].value as number)}
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

      {/* Quick Entry Modal */}
      <QuickEntryModal 
        isOpen={isQuickEntryOpen} 
        onClose={() => setIsQuickEntryOpen(false)} 
      />
    </motion.div>
  );
};

const PlatformMiniStat = ({ label, value, color }: any) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5">
      <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xs font-black tracking-tight">{formatCurrency(value)}</span>
  </div>
);
