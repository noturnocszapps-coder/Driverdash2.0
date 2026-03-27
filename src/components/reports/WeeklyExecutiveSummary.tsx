import React from 'react';
import { formatCurrency, formatKm } from '../../utils';
import { Card, CardContent } from '../UI';
import { TrendingUp, DollarSign, Navigation, Gauge } from 'lucide-react';

interface WeeklyExecutiveSummaryProps {
  total: number;
  totalProfit: number;
  totalRideKm: number;
  avgEfficiency: number;
  isPrivacyMode: boolean;
  isCollecting: boolean;
}

export const WeeklyExecutiveSummary: React.FC<WeeklyExecutiveSummaryProps> = ({
  total,
  totalProfit,
  totalRideKm,
  avgEfficiency,
  isPrivacyMode,
  isCollecting
}) => {
  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Resumo Executivo da Semana
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          label="Faturado" 
          value={isCollecting ? 'R$ 0,00' : formatCurrency(total, isPrivacyMode)} 
          icon={<TrendingUp size={14} />}
          color="text-zinc-900 dark:text-white"
          bg="bg-zinc-100 dark:bg-zinc-800"
        />
        <MetricCard 
          label="Lucro Total" 
          value={isCollecting ? 'R$ 0,00' : formatCurrency(totalProfit, isPrivacyMode)} 
          icon={<DollarSign size={14} />}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <MetricCard 
          label="KM Produtivo" 
          value={formatKm(totalRideKm)} 
          icon={<Navigation size={14} />}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <MetricCard 
          label="Eficiência" 
          value={isCollecting ? '--' : `${avgEfficiency.toFixed(0)}%`} 
          icon={<Gauge size={14} />}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </div>
    </section>
  );
};

const MetricCard = ({ label, value, icon, color, bg }: { label: string, value: string, icon: React.ReactNode, color: string, bg: string }) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
    <CardContent className="p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        <div className={`w-6 h-6 rounded-lg ${bg} flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-black tracking-tighter ${color}`}>
        {value}
      </p>
    </CardContent>
  </Card>
);
