import React from 'react';
import { formatCurrency, formatKm, getEfficiencyStatus } from '../../utils';
import { Card, CardContent } from '../UI';
import { Navigation, Map, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

interface PerformanceGridProps {
  totalKm: number;
  totalIdleKm: number;
  totalLostRevenue: number;
  grossPerKm: number;
  netPerKm: number;
  totalRevenue: number;
  isPrivacyMode: boolean;
  isCollecting: boolean;
}

export const PerformanceGrid: React.FC<PerformanceGridProps> = ({
  totalKm,
  totalIdleKm,
  totalLostRevenue,
  grossPerKm,
  netPerKm,
  totalRevenue,
  isPrivacyMode,
  isCollecting
}) => {
  const efficiency = getEfficiencyStatus(totalKm, totalRevenue);

  return (
    <section className="space-y-6 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Performance Operacional
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MiniMetricCard 
          label="KM Total" 
          value={formatKm(totalKm)} 
          icon={<Navigation size={12} />}
          color="text-zinc-500"
        />
        <MiniMetricCard 
          label="KM Ocioso" 
          value={formatKm(totalIdleKm)} 
          icon={<Map size={12} />}
          color="text-zinc-400"
        />
        <MiniMetricCard 
          label="R$ Perdido" 
          value={isCollecting ? 'R$ 0,00' : formatCurrency(totalLostRevenue, isPrivacyMode)} 
          icon={<AlertTriangle size={12} />}
          color="text-amber-500"
        />
        <MiniMetricCard 
          label="R$/KM Bruto" 
          value={!efficiency.isValid ? efficiency.displayValue : formatCurrency(grossPerKm, isPrivacyMode)} 
          icon={<TrendingUp size={12} />}
          color="text-zinc-500"
          message={!efficiency.isValid ? efficiency.message : undefined}
        />
        <MiniMetricCard 
          label="R$/KM Líquido" 
          value={!efficiency.isValid ? efficiency.displayValue : formatCurrency(netPerKm, isPrivacyMode)} 
          icon={<DollarSign size={12} />}
          color="text-zinc-500"
          message={!efficiency.isValid ? efficiency.message : undefined}
        />
      </div>
    </section>
  );
};

const MiniMetricCard = ({ label, value, icon, color, message }: { label: string, value: string, icon: React.ReactNode, color: string, message?: string }) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
    <CardContent className="p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
          <p className={`text-sm font-black tracking-tighter ${color}`}>
            {value}
          </p>
        </div>
      </div>
      {message && (
        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider leading-tight">
          {message}
        </p>
      )}
    </CardContent>
  </Card>
);
