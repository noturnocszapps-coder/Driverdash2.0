import React from 'react';
import { Calendar, ChevronRight, AlertCircle, TrendingUp, Navigation, Gauge, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatKm, cn, getEfficiencyStatus } from '../../utils';

interface RecentHistoryCardListProps {
  recentDays: any[];
  isPrivacyMode: boolean;
  onDayClick: (day: any) => void;
}

export const RecentHistoryCardList: React.FC<RecentHistoryCardListProps> = ({
  recentDays,
  isPrivacyMode,
  onDayClick
}) => {
  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Histórico Recente
        </h3>
      </div>

      <div className="space-y-3">
        {recentDays.map((day) => (
          <Card 
            key={day.id} 
            className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group active:scale-[0.98] transition-all cursor-pointer border border-zinc-100 dark:border-zinc-800/50"
            onClick={() => onDayClick(day)}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center w-11 h-11 flex flex-col items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/30 shrink-0">
                  <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5">
                    {format(day.date, 'MMM', { locale: ptBR })}
                  </p>
                  <p className="text-base font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-none">
                    {format(day.date, 'dd')}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
                      {formatCurrency(day.totalRevenue, isPrivacyMode)}
                    </p>
                    {day.hasMismatch && (
                      <span className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-amber-500/10 text-[7px] font-black uppercase text-amber-500 border border-amber-500/20">
                        Divergência
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <HistoryMetric icon={<Navigation size={8} />} label={formatKm(day.totalKm)} />
                    <HistoryMetric 
                      icon={<Gauge size={8} />} 
                      label={getEfficiencyStatus(day.totalKm, day.totalRevenue).isValid ? `${Math.round(day.efficiency)}%` : '--'} 
                    />
                    <HistoryMetric 
                      icon={<TrendingUp size={8} />} 
                      label={formatCurrency(day.profit, isPrivacyMode)} 
                      color={day.profit >= 0 ? "text-[#00C853]" : "text-red-400"} 
                    />
                  </div>
                </div>
              </div>
              
              <ChevronRight size={16} className="text-zinc-300 group-hover:text-[#00C853] transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

const HistoryMetric = ({ icon, label, color }: { icon: React.ReactNode, label: string, color?: string }) => (
  <div className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider", color || "text-zinc-500")}>
    <span className="opacity-40">{icon}</span>
    <span>{label}</span>
  </div>
);
