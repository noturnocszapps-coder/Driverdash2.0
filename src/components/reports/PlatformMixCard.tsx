import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { formatCurrency, cn } from '../../utils';

interface PlatformMixCardProps {
  platformTotals: any;
  total: number;
  isPrivacyMode: boolean;
}

export const PlatformMixCard: React.FC<PlatformMixCardProps> = ({
  platformTotals,
  total,
  isPrivacyMode
}) => {
  const sortedPlatforms = [
    { label: 'Uber', value: platformTotals.uber, color: 'bg-zinc-900 dark:bg-white' },
    { label: '99', value: platformTotals.noventanove, color: 'bg-yellow-500' },
    { label: 'inDrive', value: platformTotals.indriver, color: 'bg-emerald-500' },
    { label: 'Extra / Outros', value: platformTotals.extra, color: 'bg-blue-500' }
  ].sort((a, b) => b.value - a.value);

  const dominantPlatform = sortedPlatforms[0];

  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Mix de Plataformas
        </h3>
      </div>

      <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Plataforma Dominante</p>
              <h4 className="text-xl font-black tracking-tight">{dominantPlatform.label}</h4>
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", dominantPlatform.color)}>
              <TrendingUp size={18} className={dominantPlatform.label === 'Uber' ? 'text-white dark:text-zinc-900' : 'text-white'} />
            </div>
          </div>
          
          <div className="space-y-5">
            {sortedPlatforms.map((platform, i) => (
              <PlatformRow 
                key={i}
                label={platform.label} 
                value={platform.value} 
                total={total} 
                color={platform.color} 
                isPrivacyMode={isPrivacyMode}
                isDominant={i === 0}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

const PlatformRow = ({ label, value, total, color, isPrivacyMode, isDominant }: { label: string, value: number, total: number, color: string, isPrivacyMode: boolean, isDominant: boolean }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", color)} />
          <span className={cn("text-[11px] font-black uppercase tracking-widest", isDominant ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>
            {label}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-black tracking-tight mr-2">
            {formatCurrency(value, isPrivacyMode)}
          </span>
          <span className="text-[10px] font-bold text-zinc-400">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
