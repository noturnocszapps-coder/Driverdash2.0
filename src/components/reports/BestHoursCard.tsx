import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../utils';

interface BestHoursCardProps {
  bestHourByDay: Record<number, string>;
  start: Date;
  isCollecting: boolean;
}

export const BestHoursCard: React.FC<BestHoursCardProps> = ({
  bestHourByDay,
  start,
  isCollecting
}) => {
  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Melhores Horários
        </h3>
      </div>

      <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          {isCollecting ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Clock className="text-zinc-400" size={20} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Aguardando dados de faturamento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const dayName = format(addDays(start, day), 'EEEE', { locale: ptBR });
                const bestHour = bestHourByDay[day];
                const hasData = !!bestHour;

                return (
                  <div 
                    key={day} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all",
                      hasData 
                        ? "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800" 
                        : "bg-transparent border-dashed border-zinc-100 dark:border-zinc-800/50 opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        hasData ? "bg-blue-500/10 text-blue-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        <Calendar size={14} />
                      </div>
                      <p className="text-xs font-black tracking-tight capitalize">
                        {dayName}
                      </p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
                      hasData ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-400"
                    )}>
                      {hasData && <Clock size={12} className="text-blue-500" />}
                      <span className="text-[10px] font-black tracking-tighter uppercase">
                        {bestHour || 'Sem dados'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
