import React from 'react';
import { Map as MapIcon, Clock, Navigation } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { cn } from '../../utils';

interface HeatmapSummaryCardProps {
  waitingZones: any[];
  isCollecting: boolean;
  onViewHeatmap: () => void;
}

export const HeatmapSummaryCard: React.FC<HeatmapSummaryCardProps> = ({
  waitingZones,
  isCollecting,
  onViewHeatmap
}) => {
  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Zonas de Espera / Mapa de Performance
        </h3>
        <button 
          onClick={onViewHeatmap}
          className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors"
        >
          <MapIcon size={12} />
          Ver Mapa de Performance
        </button>
      </div>

      <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          {isCollecting ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Navigation className="text-zinc-400" size={20} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Aguardando dados de rastreamento
              </p>
            </div>
          ) : waitingZones.length > 0 ? (
            <div className="space-y-3">
              {waitingZones.map((zone, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Navigation className="text-amber-500" size={14} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black tracking-tight">Região {i + 1}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-black tracking-tighter">
                      {(zone.time / 60000).toFixed(0)} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Navigation className="text-emerald-500" size={20} />
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Nenhuma zona de espera crítica identificada
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
