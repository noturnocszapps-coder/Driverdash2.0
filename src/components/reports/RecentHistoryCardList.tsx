import React from 'react';
import { Calendar, ChevronRight, AlertCircle, TrendingUp, Navigation, Gauge, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatKm, cn } from '../../utils';

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
            className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden group active:scale-[0.98] transition-all cursor-pointer border border-zinc-100 dark:border-zinc-800/50 hover:shadow-md"
            onClick={() => onDayClick(day)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="text-center min-w-[44px] p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    {format(day.date, 'MMM', { locale: ptBR })}
                  </p>
                  <p className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white">
                    {format(day.date, 'dd')}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                      {formatCurrency(day.totalRevenue, isPrivacyMode)}
                    </p>
                    {day.hasMismatch && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[8px] font-black uppercase text-amber-500 border border-amber-500/20">
                        <AlertCircle size={8} />
                        Divergência
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <HistoryMetric icon={<Navigation size={10} />} label={formatKm(day.totalKm)} />
                    <HistoryMetric icon={<Gauge size={10} />} label={day.rideKm > 0 ? `${Math.round(day.efficiency)}%` : '--'} />
                    <HistoryMetric icon={<DollarSign size={10} />} label={formatCurrency(day.profit, isPrivacyMode)} color="text-emerald-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

const HistoryMetric = ({ icon, label, color }: { icon: React.ReactNode, label: string, color?: string }) => (
  <div className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", color || "text-zinc-500")}>
    <span className="opacity-60">{icon}</span>
    <span>{label}</span>
  </div>
);
