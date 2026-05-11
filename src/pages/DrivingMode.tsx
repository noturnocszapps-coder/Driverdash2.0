import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Maximize2, 
  Gauge, 
  Navigation, 
  Zap, 
  Target, 
  Clock, 
  Activity,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useDriverStore } from '../store';
import { cn, formatCurrency, safeNumber, calculateDailyFixedCost } from '../utils';
import { getAdvancedIntelligence, getSmartRecommendations, getLucrativeSlots } from '../services/intelligenceService';

export const DrivingMode: React.FC = () => {
  const navigate = useNavigate();
  const { 
    tracking, 
    cycles = [], 
    vehicles = [], 
    activeVehicleId, 
    settings,
    financialEntries = []
  } = useDriverStore();

  const [activeTime, setActiveTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (tracking.isActive && !tracking.isPaused && tracking.startTime) {
      interval = setInterval(() => {
        setActiveTime(Date.now() - tracking.startTime!);
      }, 1000);
    } else {
      setActiveTime(tracking.duration || 0);
    }
    return () => clearInterval(interval);
  }, [tracking.isActive, tracking.isPaused, tracking.startTime, tracking.duration]);

  const openCycle = useMemo(() => cycles.find(c => c.status === 'open') || null, [cycles]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);
  
  const currentCycleEntries = useMemo(() => {
    if (!openCycle) return [];
    return financialEntries.filter(e => e.cycle_id === openCycle.id);
  }, [financialEntries, openCycle]);

  const profitStats = useMemo(() => {
    if (!openCycle) return { profit: 0, earnings: 0 };
    const earnings = safeNumber(openCycle?.total_amount);
    const expenses = safeNumber(openCycle?.fuel_expense) + safeNumber(openCycle?.food_expense) + safeNumber(openCycle?.other_expense);
    const fixedCosts = vehicle?.fixedCosts || settings?.fixedCosts || {};
    const dailyFixed = safeNumber(calculateDailyFixedCost(fixedCosts));
    const profit = earnings - expenses - dailyFixed;
    return { earnings, profit };
  }, [openCycle, settings?.fixedCosts, vehicle]);

  const intelligence = useMemo(() => 
    getAdvancedIntelligence(openCycle, cycles, vehicle),
    [openCycle, cycles, vehicle]
  );

  const bestSlots = useMemo(() => 
    getLucrativeSlots(financialEntries),
    [financialEntries]
  );

  const recommendations = useMemo(() => 
    getSmartRecommendations(intelligence, bestSlots, new Date().getHours()),
    [intelligence, bestSlots]
  );

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const dailyGoal = safeNumber(settings?.dailyGoal || 250);
  const goalProgress = Math.min((profitStats.earnings / dailyGoal) * 100, 100);

  // Background gradient based on status
  const statusColor = intelligence.overallScore >= 75 ? 'emerald' : intelligence.overallScore >= 40 ? 'amber' : 'rose';

  // Background gradient mapping
  const statusColors = {
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    rose: 'bg-rose-500/10'
  };

  const statusBorderColors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-[#00FFBB]',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-500'
  };

  return (
    <div className="fixed inset-0 bg-[#070809] text-white z-[100] flex flex-col overflow-hidden font-sans select-none">
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[120px] rounded-full animate-pulse", statusColors[statusColor])} />
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00FFBB] shadow-neon animate-pulse" />
          <p className="text-[10px] font-black tracking-widest uppercase italic text-zinc-500">Modo Operacional</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 bg-white/5 rounded-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
        >
          <X size={20} className="text-zinc-400" />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col px-6 gap-8 pb-12">
        {/* BIG NUMBERS: PROFIT & STATUS */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">LUCRO ESTIMADO</span>
          <div className="flex items-baseline gap-4">
            <h1 className="text-[clamp(3.5rem,15vw,6rem)] font-black italic font-display leading-none tracking-tight">
              {formatCurrency(profitStats.profit).replace('R$', '').trim()}
            </h1>
            <span className="text-2xl font-black italic font-display text-zinc-500">BRL</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border italic", 
              statusBorderColors[statusColor]
            )}>
              {intelligence.status}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <Activity size={10} className="text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Score: {intelligence.overallScore}</span>
            </div>
          </div>
        </div>

        {/* PRIMARY METRICS GRID */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            label="META DIÁRIA" 
            value={formatCurrency(profitStats.earnings)} 
            subValue={`${Math.round(goalProgress)}%`}
            icon={Target}
            progress={goalProgress}
          />
          <MetricCard 
            label="LUCRATIVIDADE" 
            value={tracking.distance > 0 ? formatCurrency(profitStats.profit / tracking.distance) : 'R$ 0,00'} 
            subValue="POR KM"
            icon={Zap}
            accent="text-[#00FFBB]"
          />
        </div>

        {/* SECONDARY METRICS ROW */}
        <div className="grid grid-cols-3 gap-3">
          <SmallMetric label="KM TOTAL" value={`${tracking.distance?.toFixed(1) || 0}`} unit="KM" icon={Navigation} />
          <SmallMetric label="TEMPO" value={formatDuration(activeTime)} icon={Clock} />
          <SmallMetric label="EFICIÊNCIA" value={`${intelligence.operationalScore}%`} icon={Gauge} />
        </div>

        {/* AI FEED: COMPACT */}
        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={14} className="text-[#00FFBB]" />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Insights Operacionais</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {recommendations.slice(0, 2).map((tip, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/5 p-4 rounded-sm flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-xs bg-[#00FFBB]/10 border border-[#00FFBB]/20 flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-[#00FFBB]" />
                  </div>
                  <p className="text-sm font-bold text-zinc-200 leading-tight">
                    {tip}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* FOOTER: SYSTEM STATUS */}
      <footer className="relative z-10 px-6 py-6 border-t border-white/5 bg-black/40 backdrop-blur-xl flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00FFBB]" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Driver Engine v2.4</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Offline Local-Only</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] animate-ping" />
          <span className="text-[9px] font-black text-[#00FFBB] uppercase tracking-[0.2em] ml-1">Live Tracking</span>
        </div>
      </footer>
    </div>
  );
};

const MetricCard = ({ label, value, subValue, icon: Icon, progress, accent = "text-white" }: any) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-sm flex flex-col gap-4 relative overflow-hidden group">
    <div className="flex justify-between items-start relative z-10">
      <div className="w-10 h-10 rounded-xs bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500">
        <Icon size={20} />
      </div>
      <span className="text-xs font-black italic font-display text-zinc-400">{subValue}</span>
    </div>
    <div className="space-y-1 relative z-10">
      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</p>
      <p className={cn("text-2xl font-black italic font-display leading-none", accent)}>{value}</p>
    </div>
    {progress !== undefined && (
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div className="h-full bg-[#00FFBB] shadow-neon" style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

const SmallMetric = ({ label, value, unit, icon: Icon }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-zinc-500" />
      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-lg font-black italic font-display text-white leading-none">
      {value}
      {unit && <span className="text-[10px] not-italic text-zinc-500 ml-1">{unit}</span>}
    </p>
  </div>
);

export default DrivingMode;
