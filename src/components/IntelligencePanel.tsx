import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, TrendingUp, AlertCircle, Clock, Target, Fuel, ZapOff, Sparkles, ShieldCheck, Gauge, Trophy } from 'lucide-react';
import { Card, CardContent } from './UI';
import { cn, formatCurrency } from '../utils';
import { 
  getAdvancedIntelligence,
  getSmartRecommendations,
  getLucrativeSlots 
} from '../services/intelligenceService';
import { FinancialEntry, Cycle, VehicleProfile } from '../types';

interface IntelligencePanelProps {
  currentCycle: Cycle | null;
  history: Cycle[];
  entries: FinancialEntry[];
  kmDriven: number;
  durationMs: number;
  currentNet: number;
  fuelExpense: number;
  allEntries?: FinancialEntry[];
  vehicle?: VehicleProfile;
  plan: 'free' | 'pro';
  onUpgrade: () => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  currentCycle,
  history,
  entries,
  kmDriven,
  durationMs,
  currentNet,
  fuelExpense,
  allEntries = [],
  vehicle,
  plan,
  onUpgrade
}) => {
  const hoursWorked = durationMs / (1000 * 60 * 60);

  const intelligence = useMemo(() => 
    getAdvancedIntelligence(currentCycle, history, vehicle),
    [currentCycle, history, vehicle]
  );

  const bestSlots = useMemo(() => 
    getLucrativeSlots(allEntries.length > 0 ? allEntries : entries),
    [allEntries, entries]
  );

  const recommendations = useMemo(() => 
    getSmartRecommendations(intelligence, bestSlots, new Date().getHours()),
    [intelligence, bestSlots]
  );

  if (plan === 'free') {
    return (
      <Card className="relative overflow-hidden backdrop-blur-3xl group cursor-pointer border-dashed border-white/10" onClick={onUpgrade}>
        <CardContent className="p-xl space-y-md relative z-10 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-sm flex items-center justify-center border border-white/10 mx-auto group-hover:bg-[#00FFBB]/10 group-hover:border-[#00FFBB]/20 transition-all">
                <Sparkles size={32} className="text-zinc-500 group-hover:text-[#00FFBB]" />
            </div>
            <div className="space-y-xs">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ASSISTENTE OPERACIONAL</h3>
                <p className="text-white font-black italic font-display text-lg tracking-tight">INTELIGÊNCIA NÍVEL II</p>
                <p className="text-zinc-400 text-[10px] max-w-[220px] mx-auto leading-relaxed uppercase tracking-wider font-bold">
                    Desbloqueie recomendações personalizadas, score de consistência e análise de padrões.
                </p>
            </div>
            <button className="w-full bg-white/5 text-white border border-white/10 font-black py-4 rounded-sm text-[10px] uppercase tracking-widest hover:bg-[#00FFBB] hover:text-zinc-950 transition-all">
                EVOLUIR PARA PRO
            </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {/* HEADER: OPERATIONAL ASSISTANT */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-sm">
          <div className="w-2 h-2 rounded-full bg-[#00FFBB] animate-pulse shadow-neon" />
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">ASSISTENTE OPERACIONAL</h3>
        </div>
        <div className="flex items-center gap-xs px-2 py-0.5 bg-zinc-900 border border-white/5 rounded-full">
          <ShieldCheck size={10} className="text-[#00FFBB]" />
          <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">OFFLINE ENGINE</span>
        </div>
      </div>

      {/* MAIN SCORE SECTION */}
      <Card className="bg-[#0B0C10]/60 border border-white/5 backdrop-blur-2xl overflow-hidden shadow-premium">
        <CardContent className="p-lg md:p-xl flex flex-col gap-lg">
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-xs">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">SCORE OPERACIONAL</span>
              <div className="flex items-baseline gap-sm">
                <h2 className="text-5xl font-black italic font-display text-white leading-none">
                  {intelligence.overallScore}
                </h2>
                <span className={cn("text-xs font-black uppercase tracking-widest italic", 
                  intelligence.overallScore >= 75 ? "text-[#00FFBB]" : "text-amber-500"
                )}>
                  {intelligence.status}
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-white/5 rounded-sm border border-white/10 flex items-center justify-center shadow-premium">
              <Gauge size={28} className={cn(intelligence.overallScore >= 75 ? "text-[#00FFBB]" : "text-amber-500")} />
            </div>
          </div>

          {/* SCORE BREAKDOWN GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md border-t border-white/5 pt-lg">
            <ScoreMiniItem label="LUCRATIVIDADE" value={intelligence.profitabilityScore} color="text-indigo-400" />
            <ScoreMiniItem label="OCUPAÇÃO" value={intelligence.operationalScore} color="text-[#00FFBB]" />
            <ScoreMiniItem label="CONSISTÊNCIA" value={intelligence.consistencyScore} color="text-amber-400" />
            <ScoreMiniItem label="COMBUSTÍVEL" value={intelligence.fuelScore} color="text-emerald-500" />
          </div>
        </CardContent>
      </Card>

      {/* SMART RECOMMENDATIONS */}
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm px-1">
          <Sparkles size={14} className="text-zinc-500" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">RECOMENDAÇÕES DO DIA</p>
        </div>
        <div className="flex flex-col gap-xs">
          <AnimatePresence mode="popLayout">
            {recommendations.map((tip, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/5 p-md rounded-sm flex items-start gap-md hover:bg-white/10 transition-all group"
              >
                <div className="w-8 h-8 rounded-xs bg-zinc-950 flex items-center justify-center shrink-0 border border-white/5">
                  <Zap size={14} className="text-[#00FFBB] group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-xs font-bold text-zinc-300 leading-snug pt-0.5">
                  {tip}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* OPERATIONAL PATTERNS: BEST SLOTS */}
      {bestSlots.length > 0 && (
        <div className="flex flex-col gap-sm">
          <div className="flex items-center gap-sm px-1">
            <Trophy size={14} className="text-zinc-500" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">MELHORES HORÁRIOS OPERACIONAIS</p>
          </div>
          <div className="grid grid-cols-3 gap-md">
            {bestSlots.map((slot, idx) => (
              <div key={idx} className="bg-[#0B0C10]/40 p-md border border-white/5 rounded-sm flex flex-col gap-xs relative overflow-hidden group">
                <div className={cn("absolute right-0 top-0 w-1 h-full", 
                  idx === 0 ? "bg-[#00FFBB]" : "bg-white/5"
                )} />
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{slot.slot}</span>
                <p className="text-base font-black italic font-display text-white tabular-nums">
                  {formatCurrency(slot.value)}
                  <span className="text-[8px] not-italic text-zinc-500 ml-1">/H</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreMiniItem = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex flex-col gap-xs p-md bg-white/5 border border-white/5 rounded-sm">
    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">{label}</span>
    <div className="flex items-center justify-between">
      <p className={cn("text-lg font-black italic font-display", color)}>{value}</p>
      <div className="w-8 h-1 bg-zinc-900 rounded-full overflow-hidden shrink-0">
        <div className={cn("h-full bg-current", color.replace('text-', 'bg-'))} style={{ width: `${value}%` }} />
      </div>
    </div>
  </div>
);
