import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ChevronLeft, 
  Zap, 
  Target, 
  Clock, 
  BarChart3,
  Calendar
} from 'lucide-react';
import { useDriverStore } from '../store';
import { formatCurrency, cn } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const AnalyticsPro: React.FC = () => {
  const navigate = useNavigate();
  const { cycles = [], settings = { isPrivacyMode: false } } = useDriverStore();

  const chartData = useMemo(() => {
    if (!cycles || cycles.length === 0) return [];
    return cycles.slice(-7).map(c => ({
      name: new Date(c.start_time).toLocaleDateString('pt-BR', { weekday: 'short' }),
      value: c.total_amount || 0
    }));
  }, [cycles]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32">
      <header className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">Analytics Pro</h1>
        <div className="w-10" />
      </header>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ganhos Recentes</p>
              <h2 className="text-lg font-black tracking-tight">Performance Semanal</h2>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#10b981' : '#27272a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPro;
