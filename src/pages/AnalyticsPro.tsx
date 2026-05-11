import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ChevronLeft, 
  Target, 
  Clock, 
  BarChart3,
  Calendar,
  Activity,
  Navigation,
  Zap,
  Info,
  Map,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useDriverStore } from '../store';
import { formatCurrency, cn, safeNumber } from '../utils';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent } from '../components/UI';
import { detectRegionalPatterns, getEvolutionMetrics } from '../services/intelligenceService';

export const AnalyticsPro: React.FC = () => {
  const navigate = useNavigate();
  const { cycles = [], performanceRecords = [], settings = { isPrivacyMode: false } } = useDriverStore();

  const chartData = useMemo(() => {
    if (!cycles || cycles.length === 0) return [];
    return cycles.slice(-7).map(c => ({
      name: new Date(c.start_time).toLocaleDateString('pt-BR', { weekday: 'short' }),
      value: c.total_amount || 0,
      km: c.total_km || 0
    }));
  }, [cycles]);

  const totalEarnings = useMemo(() => cycles.reduce((acc, c) => acc + safeNumber(c.total_amount), 0), [cycles]);
  const totalKm = useMemo(() => cycles.reduce((acc, c) => acc + safeNumber(c.total_km), 0), [cycles]);
  const avgProfitPerKm = totalKm > 0 ? totalEarnings / totalKm : 0;

  const evolution = useMemo(() => getEvolutionMetrics(cycles), [cycles]);
  const regionalPatterns = useMemo(() => detectRegionalPatterns(performanceRecords), [performanceRecords]);

  return (
    <div className="space-y-8 md:space-y-12 max-w-[1400px] mx-auto overflow-x-hidden w-full min-w-0 pb-40 px-4 md:px-10">
      <header className="flex items-center justify-between pt-6 md:pt-12 gap-4">
        <div className="flex items-center gap-6">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#00FFBB] transition-colors"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <div className="space-y-1 relative min-w-0 flex-1">
             <h1 className="text-[clamp(1.25rem,4vw,2rem)] font-black tracking-tight md:tracking-tighter text-white italic font-display uppercase truncate">Analytics <span className="text-indigo-400">Pro</span></h1>
             <p className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest md:tracking-wider flex items-center gap-1.5">
                <Activity size={10} className="text-zinc-700" />
                MÓDULO DE INTELIGÊNCIA ATIVO
             </p>
          </div>
        </div>
      </header>

      {/* EVOLUTION MINI DASH */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <Card className="bg-[#0B0C10]/40 border border-white/5 p-lg flex flex-col gap-sm">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">EVOLUÇÃO SEMANAL</span>
          <div className="flex items-center gap-md">
            <span className={cn("text-3xl font-black italic font-display", evolution.trend === 'up' ? "text-[#00FFBB]" : "text-rose-500")}>
              {evolution.label}
            </span>
            <div className={cn("p-2 rounded-sm border", evolution.trend === 'up' ? "bg-[#00FFBB]/10 border-[#00FFBB]/20 text-[#00FFBB]" : "bg-rose-500/10 border-rose-500/20 text-rose-500")}>
              {evolution.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </div>
          </div>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-relaxed">
            Comparado ao período anterior de 7 dias
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* BIG CHART */}
        <div className="lg:col-span-8 space-y-md">
          <Card className="bg-[#0B0C10]/40 border-none shadow-2xl rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/5 backdrop-blur-3xl">
            <CardContent className="p-8 md:p-12 space-y-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="space-y-1 md:space-y-2">
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase tracking-widest md:tracking-wider">PERFORMANCE FINANCEIRA</p>
                    <h2 className="text-lg md:text-2xl font-black text-white italic font-display">HISTÓRICO SEMANAL</h2>
                 </div>
                 <div className="flex items-center gap-1.5 bg-[#00FFBB]/10 px-3 py-1.5 rounded-full border border-[#00FFBB]/20">
                    <Zap size={12} className="text-[#00FFBB]" />
                    <span className="text-[9px] md:text-[10px] font-black text-[#00FFBB] uppercase tracking-widest">LIVE DATA</span>
                 </div>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FFBB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FFBB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 900 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 900 }}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B0C10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '1rem' }}
                      itemStyle={{ color: '#00FFBB', fontWeight: 900, textTransform: 'uppercase' }}
                      labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px', fontWeight: 900 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#00FFBB" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">MÉDIA DIÁRIA</p>
                    <p className="text-lg font-black text-white italic font-display">{formatCurrency(totalEarnings/7)}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">TOTAL KM</p>
                    <p className="text-lg font-black text-white italic font-display">{totalKm.toFixed(0)} <span className="text-[10px] text-zinc-600 ml-1">KM</span></p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">RETORNO / KM</p>
                    <p className="text-lg font-black text-[#00FFBB] italic font-display">{formatCurrency(avgProfitPerKm)}</p>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* REGIONAL HEATMAP SECTION */}
          <Card className="bg-[#0B0C10]/40 border border-white/5 rounded-[2rem] md:rounded-[3rem] overflow-hidden">
            <CardContent className="p-lg md:p-xl space-y-lg">
              <div className="flex items-center gap-md">
                <Map size={20} className="text-indigo-400" />
                <h3 className="text-lg font-black text-white italic font-display uppercase">HEATMAP DE LUCRATIVIDADE</h3>
              </div>
              
              <div className="flex flex-col gap-md">
                {regionalPatterns.length > 0 ? (
                  regionalPatterns.slice(0, 5).map((region, idx) => (
                    <div key={idx} className="flex items-center justify-between p-md bg-white/5 rounded-sm border border-white/5 group hover:bg-white/10 transition-all">
                      <div className="flex flex-col gap-xs">
                        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full w-fit mb-1", 
                          region.status === 'FORTE' ? "bg-[#00FFBB]/10 text-[#00FFBB]" : (region.status === 'FRACA' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-500/10 text-zinc-500")
                        )}>
                          {region.status}
                        </span>
                        <p className="text-base font-black text-white uppercase italic font-display">{region.name}</p>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">CONFIANÇA: {region.reliability}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black italic font-display text-white">{formatCurrency(region.profitPerKm)}<span className="text-[10px] not-italic text-zinc-500">/KM</span></p>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">TOTAL: {formatCurrency(region.totalEarnings)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-md text-zinc-700">
                    <Navigation size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest max-w-[200px]">Sem dados geográficos suficientes para mapeamento regional.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR MODULES */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <Card className="bg-[#0B0C10]/40 border-none shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/5 backdrop-blur-3xl">
             <CardContent className="p-8 space-y-10">
                <div className="flex items-center gap-4 text-indigo-400">
                  <div className="p-3 rounded-2xl bg-indigo-500/10">
                    <Target size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">SCORE DE ELITE</p>
                    <h3 className="text-2xl font-black text-white italic font-display leading-tight">PRECISÃO 98%</h3>
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>CONSISTÊNCIA</span>
                        <span className="text-white">ALTA</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[92%] rounded-full shadow-[0_0_15px_#6366f1]" />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>VOLUME OPERACIONAL</span>
                        <span className="text-white">ESTÁVEL</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FFBB] w-[75%] rounded-full shadow-[0_0_15px_#00FFBB]" />
                      </div>
                   </div>
                </div>

                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                   <div className="flex items-center gap-3 text-zinc-400">
                      <Info size={16} />
                      <p className="text-[10px] font-black uppercase tracking-widest">INSIGHT IA</p>
                   </div>
                   <p className="text-sm font-bold text-zinc-300 leading-relaxed italic">
                     "Sua performance está {evolution.label} acima da média regional. Recomendamos manter a seletividade atual em corridas acima de 8km."
                   </p>
                </div>
             </CardContent>
          </Card>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-900 border-none shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden group cursor-pointer relative">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Target size={120} />
               </div>
               <CardContent className="p-8 space-y-6 relative z-10">
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest md:tracking-wider">DESAFIO DA SEMANA</p>
                  <h3 className="text-2xl font-black text-white italic font-display tracking-tight leading-tight">
                    ATINJA R$ 1.800 <br/> SEMANAIS
                  </h3>
                  <div className="pt-4 flex items-center justify-between">
                    <p className="text-xs font-bold text-indigo-100 italic">Prêmio: Badge Diamond</p>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <ChevronLeft size={20} className="rotate-180" />
                    </div>
                  </div>
               </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPro;
