import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Clock, 
  MapPin, 
  Zap, 
  DollarSign, 
  AlertCircle, 
  ArrowLeft,
  ChevronRight,
  Target,
  Trophy,
  Star,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn, safeNumber, formatCurrency } from '../utils';

const AnalyticsPro = () => {
  const navigate = useNavigate();
  const { performanceRecords, driverProfile, settings } = useDriverStore();

  const stats = useMemo(() => {
    if (performanceRecords.length === 0) return null;

    const totalEarnings = performanceRecords.reduce((acc, r) => acc + safeNumber(r.earnings), 0);
    const totalKm = performanceRecords.reduce((acc, r) => acc + safeNumber(r.distance), 0);
    const totalIdleKm = 0; // Not in record summary
    const totalTime = performanceRecords.reduce((acc, r) => acc + safeNumber(r.duration), 0);
    const totalIdleTime = 0; // Not in record summary

    const avgProfitPerHour = driverProfile.avgProfitPerHour;
    const avgProfitPerKm = driverProfile.avgProfitPerKm;
    const idleKmPercent = (totalIdleKm / totalKm) * 100;
    const idleTimePercent = (totalIdleTime / totalTime) * 100;

    // Dinheiro perdido estimado (se o tempo ocioso fosse produtivo na média)
    const lostEarnings = (totalIdleTime / (1000 * 60 * 60)) * avgProfitPerHour;

    return {
      totalEarnings,
      totalKm,
      avgProfitPerHour,
      avgProfitPerKm,
      idleKmPercent,
      idleTimePercent,
      lostEarnings,
      totalIdleTime
    };
  }, [performanceRecords, driverProfile]);

  const chartData = useMemo(() => {
    return performanceRecords.slice(-7).map(r => ({
      day: new Date(r.startTime).toLocaleDateString('pt-BR', { weekday: 'short' }),
      profit: r.earnings,
      efficiency: r.profitPerKm
    }));
  }, [performanceRecords]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
        <h1 className="text-xl font-bold">Sem dados suficientes</h1>
        <p className="text-gray-400 text-center mt-2">Continue dirigindo para liberar o Analytics Pro.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-3 bg-white text-black rounded-xl font-bold"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-white/5 rounded-xl border border-white/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight">Analytics Pro</h1>
          <p className="text-xs text-orange-500 font-medium uppercase tracking-widest">Premium Intelligence</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Score Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-3xl mb-6 relative overflow-hidden shadow-2xl shadow-orange-500/20"
      >
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Trophy className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 fill-white" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Driver Score</span>
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-6xl font-black leading-none">{driverProfile.score}</h2>
            <span className="text-xl font-bold opacity-80 mb-1">/ 100</span>
          </div>
          <p className="mt-4 text-sm font-medium opacity-90">
            {driverProfile.score > 80 ? 'Excelente performance! Você está no topo.' : 'Continue evoluindo para atingir o nível Master.'}
          </p>
        </div>
      </motion.div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">R$/Hora Líquido</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgProfitPerHour)}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-500">
            <TrendingUp className="w-3 h-3" />
            <span>+12% vs média</span>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">R$/KM Real</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.avgProfitPerKm)}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-orange-500">
            <Info className="w-3 h-3" />
            <span>Eficiência Alta</span>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">KM Ocioso</span>
          </div>
          <p className="text-2xl font-bold">{stats.idleKmPercent.toFixed(1)}%</p>
          <p className="text-[10px] text-gray-500 mt-1">Distância sem passageiro</p>
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Perda Est.</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.lostEarnings)}</p>
          <p className="text-[10px] text-gray-500 mt-1">Tempo parado improdutivo</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold">Performance Semanal</h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[10px] text-gray-400 uppercase font-bold">Lucro</span>
            </div>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProfit)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Badges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Conquistas e Badges
          </h3>
          <span className="text-xs text-gray-500 font-bold">{driverProfile.badges.length} desbloqueadas</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {driverProfile.badges.map((badge, i) => (
            <div 
              key={i}
              className="px-4 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-bold">{badge}</span>
            </div>
          ))}
          {driverProfile.badges.length === 0 && (
            <p className="text-sm text-gray-500 italic">Nenhuma badge conquistada ainda.</p>
          )}
        </div>
      </div>

      {/* Hot Zones Preview */}
      <div className="mt-8 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Hot Zones (Mapa de Calor)
          </h3>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </div>
        <div className="space-y-3">
          {driverProfile.bestRegions.slice(0, 3).map((region, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xs">
                  {i + 1}
                </div>
                <span className="text-sm font-medium">{region}</span>
              </div>
              <span className="text-xs font-bold text-green-500">Alta Demanda</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPro;
