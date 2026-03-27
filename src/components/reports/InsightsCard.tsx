import React from 'react';
import { Award, Zap, TrendingUp, TrendingDown, Activity, Navigation } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { cn } from '../../utils';

interface InsightsCardProps {
  aiIntelligence: any;
  driverScore: any;
  isCollecting: boolean;
  aiTip: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  aiIntelligence,
  driverScore,
  isCollecting,
  aiTip
}) => {
  if (isCollecting) {
    return (
      <Card className="border-none bg-zinc-900 text-white shadow-xl mb-8">
        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Activity className="text-emerald-400 animate-pulse" size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight">Inteligência em Formação</h3>
            <p className="text-xs font-bold text-zinc-500 max-w-[240px]">
              Ainda coletando dados suficientes para gerar insights confiáveis.
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-black uppercase tracking-widest text-zinc-500">
            Score: Em formação
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-zinc-900 text-white shadow-xl mb-8 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Award size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest">Insights Inteligentes</h3>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
              driverScore.color
            )}>
              Score: {driverScore.score} - {driverScore.label}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <InsightItem 
              label="Melhor Dia" 
              value={aiIntelligence.bestDayLabel} 
              icon={<TrendingUp size={12} />}
              color="text-emerald-400"
            />
            <InsightItem 
              label="Pior Dia" 
              value={aiIntelligence.weakestDayLabel} 
              icon={<TrendingDown size={12} />}
              color="text-red-400"
            />
            <InsightItem 
              label="Média Lucro/KM" 
              value={`${aiIntelligence.avgProfitPerKmLabel}/km`} 
              icon={<DollarSign size={12} />}
              color="text-blue-400"
            />
            <InsightItem 
              label="KM Produtivo Médio" 
              value={`${aiIntelligence.avgProductiveKm.toFixed(1)} km/dia`} 
              icon={<Navigation size={12} />}
              color="text-zinc-300"
            />
          </div>
        </div>

        <div className="bg-emerald-500/10 border-t border-white/5 p-5">
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={12} className="text-emerald-400" />
            </div>
            <p className="text-[11px] font-bold text-emerald-100 leading-relaxed">
              {aiTip}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InsightItem = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className="space-y-1.5">
    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2">
      <span className={cn("p-1 rounded-md bg-white/5", color)}>
        {icon}
      </span>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  </div>
);

const DollarSign = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);
