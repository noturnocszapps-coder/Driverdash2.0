import React from 'react';
import { Award, Zap, TrendingUp, TrendingDown, Activity, Navigation } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { cn } from '../../utils';

interface InsightsCardProps {
  performanceData: any;
  driverScore: {
    score: number;
    label: string;
    color: string;
    explanation: string;
    suggestions: string[];
  };
  isCollecting: boolean;
  smartTip: string;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({
  performanceData,
  driverScore,
  isCollecting,
  smartTip
}) => {
  if (isCollecting) {
    return (
      <Card className="border-none bg-transparent mb-8">
        <CardContent className="p-4 flex flex-col items-center text-center space-y-2 border border-dashed border-zinc-800 rounded-[2rem]">
          <Activity className="text-zinc-600 animate-pulse" size={16} />
          <div className="space-y-0.5">
            <h3 className="text-xs font-black tracking-tight text-zinc-500 uppercase">Análise em Formação</h3>
            <p className="text-[9px] font-bold text-zinc-600 max-w-[200px]">
              Aguardando mais dados para gerar insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-zinc-950/20 backdrop-blur-sm shadow-xl mb-8 overflow-hidden rounded-[2rem] border border-zinc-800/50">
      <CardContent className="p-0">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-[#00C853]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00C853]">Destaque de Performance</h3>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
              driverScore.score >= 80 ? "border-[#00C853] text-[#00C853]" : "border-zinc-700 text-zinc-500"
            )}>
              Score: {driverScore.score}
            </div>
          </div>

          <div className="space-y-2 border-l-2 border-[#00C853]/20 pl-4">
            <p className="text-[10px] font-bold text-zinc-400 leading-relaxed italic">
              "{driverScore.explanation}"
            </p>
            
            {driverScore.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {driverScore.suggestions.slice(0, 2).map((suggestion, i) => (
                  <span key={i} className="text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-2 py-0.5 rounded">
                    {suggestion}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InsightItem 
              label="Melhor Dia" 
              value={performanceData.bestDayLabel} 
              icon={<TrendingUp size={10} />}
              color="text-[#00C853]"
            />
            <InsightItem 
              label="Média Lucro/KM" 
              value={`${performanceData.avgProfitPerKmLabel}/km`} 
              icon={<DollarSign size={10} />}
              color="text-emerald-500"
            />
          </div>
        </div>

        <div className="bg-[#00C853]/5 border-t border-[#00C853]/10 p-4">
          <div className="flex gap-2 items-center">
            <Zap size={10} className="text-[#00C853]" />
            <p className="text-[10px] font-bold text-zinc-400 leading-tight">
              {smartTip}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InsightItem = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
  <div className="space-y-0.5">
    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-1.5">
      <span className={cn(color)}>
        {icon}
      </span>
      <p className="text-xs font-black text-white">{value}</p>
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
