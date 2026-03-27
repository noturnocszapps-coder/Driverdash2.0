import React from 'react';
import { TrendingUp, DollarSign, Navigation, Gauge, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../UI';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency, formatKm, cn, safeNumber } from '../../utils';
import { isSameDay } from 'date-fns';

interface DailyRevenueCardProps {
  bestDay: any;
  currentWeek: any[];
  settings: any;
  today: Date;
}

export const DailyRevenueCard: React.FC<DailyRevenueCardProps> = ({
  bestDay,
  currentWeek,
  settings,
  today
}) => {
  return (
    <section className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Faturamento Diário
        </h3>
      </div>

      <Card className="border-none bg-zinc-900 text-white shadow-2xl overflow-hidden">
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Destaque da Semana</p>
              <h2 className="text-2xl font-black tracking-tight">
                {bestDay?.fullName || 'Analisando...'} 
                <span className="text-emerald-400 block text-lg">foi seu melhor dia</span>
              </h2>
            </div>
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <TrendingUp className="text-emerald-400" size={28} />
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentWeek}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#52525b', fontWeight: 800 }}
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950 border border-white/5 p-4 rounded-2xl shadow-2xl space-y-3 min-w-[180px]">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{data.fullName}</p>
                          <p className="text-xl font-black text-white">{formatCurrency(data.value, settings.isPrivacyMode)}</p>
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <TooltipMetric label="Lucro" value={formatCurrency(data.profit, settings.isPrivacyMode)} color="text-emerald-400" />
                            <TooltipMetric label="Despesas" value={formatCurrency(data.expenses, settings.isPrivacyMode)} color="text-red-400" />
                            <TooltipMetric label="KM Total" value={formatKm(data.totalKm)} color="text-blue-400" />
                            <TooltipMetric label="Eficiência" value={`${Math.round(data.efficiencyPercentage)}%`} color="text-amber-400" />
                            
                            {data.hasMismatch && (
                              <div className="flex justify-between items-center text-[9px] font-bold text-amber-400 pt-1 border-t border-white/5">
                                <span className="uppercase">Diferença Print</span>
                                <span>{formatCurrency(data.value - data.importedTotal, settings.isPrivacyMode)}</span>
                              </div>
                            )}
                            
                            <div className="pt-1 border-t border-white/5" />
                            <PlatformMini label="Uber" value={data.uber} color="bg-white" isPrivacyMode={settings.isPrivacyMode} />
                            <PlatformMini label="99" value={data.noventanove} color="bg-yellow-500" isPrivacyMode={settings.isPrivacyMode} />
                            <PlatformMini label="inDrive" value={data.indriver} color="bg-emerald-500" isPrivacyMode={settings.isPrivacyMode} />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {settings.dashboardMode === 'segmented' ? (
                  <>
                    <Bar dataKey="uber" stackId="a" fill="#ffffff" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="noventanove" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="indriver" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar dataKey="extra" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                  </>
                ) : (
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                    {currentWeek.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        className={cn(
                          isSameDay(entry.date, today) ? "fill-emerald-500" : "fill-zinc-800"
                        )}
                      />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

const TooltipMetric = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="flex justify-between items-center text-[9px] font-bold">
    <span className="text-zinc-500 uppercase">{label}</span>
    <span className={color}>{value}</span>
  </div>
);

const PlatformMini = ({ label, value, color, isPrivacyMode }: { label: string, value: number, color: string, isPrivacyMode: boolean }) => (
  <div className="flex justify-between items-center text-[8px] font-bold">
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-zinc-500 uppercase">{label}</span>
    </div>
    <span className="text-zinc-300">{formatCurrency(value, isPrivacyMode)}</span>
  </div>
);
