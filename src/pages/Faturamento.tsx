import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost, getEfficiencyStatus } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { ChevronLeft, Save, Plus, Minus, Info, AlertCircle, Smartphone, Fuel, Utensils, MoreHorizontal, TrendingUp, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { CountUp } from '../components/CountUp';
import { useSound } from '../hooks/useSound';

export const Faturamento = () => {
  const { cycles: rawCycles, updateCycle, startCycle, settings, isSaving: storeIsSaving, tracking, stopTracking, vehicles, activeVehicleId, pendingDeletionIds } = useDriverStore();
  
  const cycles = useMemo(() => {
    return rawCycles.filter(c => !pendingDeletionIds.includes(c.id));
  }, [rawCycles, pendingDeletionIds]);

  const navigate = useNavigate();
  const { playSound } = useSound();
  
  const openCycle = useMemo(() => cycles.find(c => c.status === 'open'), [cycles]);
  
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const dailyFixed = useMemo(() => {
    const fixedCosts = currentVehicle?.fixedCosts || settings.fixedCosts;
    return calculateDailyFixedCost(fixedCosts);
  }, [currentVehicle, settings.fixedCosts]);
  
  const [amounts, setAmounts] = useState({
    uber: 0,
    noventanove: 0,
    indriver: 0,
    extra: 0
  });

  const [expenses, setExpenses] = useState({
    fuel: 0,
    food: 0,
    other: 0
  });

  const [kms, setKms] = useState({
    total: 0,
    ride: 0,
    uber: 0,
    noventanove: 0,
    indriver: 0
  });

  // Consolidate KM data sources before rendering
  const kmTotalFinal = useMemo(() => {
    const tracked = (openCycle?.tracked_km || 0) + (tracking.isActive ? tracking.distance : 0);
    return tracked > 0 ? tracked : (kms.total || openCycle?.total_km || 0);
  }, [openCycle, tracking.isActive, tracking.distance, kms.total]);

  const kmRideFinal = useMemo(() => {
    const tracked = (openCycle?.productive_km || 0) + (tracking.isActive ? tracking.productiveDistance : 0);
    return tracked > 0 ? tracked : (kms.ride || openCycle?.ride_km || 0);
  }, [openCycle, tracking.isActive, tracking.productiveDistance, kms.ride]);

  const [showAdvancedKm, setShowAdvancedKm] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (openCycle) {
      setAmounts({
        uber: openCycle.uber_amount || 0,
        noventanove: openCycle.noventanove_amount || 0,
        indriver: openCycle.indriver_amount || 0,
        extra: openCycle.extra_amount || 0
      });
      setExpenses({
        fuel: openCycle.fuel_expense || 0,
        food: openCycle.food_expense || 0,
        other: openCycle.other_expense || 0
      });
      
      const trackedTotal = (openCycle.tracked_km || 0) + (tracking.isActive ? tracking.distance : 0);
      const trackedRide = (openCycle.productive_km || 0) + (tracking.isActive ? tracking.productiveDistance : 0);
      
      setKms({
        total: trackedTotal > 0 ? trackedTotal : (openCycle.total_km || 0),
        ride: trackedRide > 0 ? trackedRide : (openCycle.ride_km || 0),
        uber: openCycle.uber_km || 0,
        noventanove: openCycle.noventanove_km || 0,
        indriver: openCycle.indriver_km || 0
      });
    }
  }, [openCycle, tracking.isActive]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    if (isProcessing || isSaving || storeIsSaving) return;
    
    setIsProcessing(true);
    setSaveStatus('idle');

    try {
      playSound('start');
      if (tracking.isActive) {
        await stopTracking();
      }

      const cycleData = {
        uber_amount: amounts.uber,
        noventanove_amount: amounts.noventanove,
        indriver_amount: amounts.indriver,
        extra_amount: amounts.extra,
        fuel_expense: expenses.fuel,
        food_expense: expenses.food,
        other_expense: expenses.other,
        total_km: kmTotalFinal,
        ride_km: kmRideFinal,
        uber_km: kms.uber,
        noventanove_km: kms.noventanove,
        indriver_km: kms.indriver,
        status: 'closed' as const,
        end_time: new Date().toISOString(),
        vehicle_id: activeVehicleId || settings.currentVehicleProfileId,
        vehicle_name: currentVehicle?.name || settings.vehicle
      };

      if (!openCycle) {
        const newCycleId = await startCycle();
        await updateCycle(newCycleId, cycleData);
      } else {
        await updateCycle(openCycle.id, cycleData);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success("Ciclo fechado com sucesso");
      setSaveStatus('success');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error("[Fechamento] Erro ao salvar:", error);
      toast.error("Erro ao salvar. Tente novamente.");
      setSaveStatus('error');
    } finally {
      setIsProcessing(false);
      setIsSaving(false);
    }
  };

  const total = amounts.uber + amounts.noventanove + amounts.indriver + amounts.extra;
  const totalExpenses = expenses.fuel + expenses.food + expenses.other + dailyFixed;
  const estimatedProfit = total - totalExpenses;

  const updateAmount = (key: keyof typeof amounts, value: number) => {
    setAmounts(prev => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleAdjustAmount = (key: keyof typeof amounts, delta: number) => {
    setAmounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-sm md:gap-md max-w-2xl mx-auto px-md md:px-lg pb-[calc(110px+env(safe-area-inset-bottom))]"
    >
      {/* HEADER PAINEL */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pt-md md:pt-lg gap-md px-1">
        <div className="flex items-center gap-md min-w-0">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 transition-all hover:bg-white/10 hover:text-[#00FFBB] shrink-0 active:scale-90"
          >
            <ChevronLeft size={20} />
          </motion.button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-sm flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white italic font-display leading-tight truncate">FECHAMENTO</h1>
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-wider whitespace-nowrap">STATUS: OPERACIONAL</span>
            </div>
          </div>
        </div>
        <div className="self-end sm:self-auto uppercase">
          <SyncIndicator variant="minimal" />
        </div>
      </header>

      <div className="flex flex-col gap-lg">
        {/* FATURAMENTO - INSTRUMENTAÇÃO FINANCEIRA */}
        <div className="flex flex-col gap-sm">
          <SectionHeader icon={Smartphone} title="DADOS DE ENTRADA" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <PlatformCard 
              label="Uber Driver" 
              value={amounts.uber} 
              onChange={(val: number) => updateAmount('uber', val)}
              onAdjust={(delta: number) => handleAdjustAmount('uber', delta)}
              accent="bg-[#00FFBB]"
            />
            <PlatformCard 
              label="99 Pop" 
              value={amounts.noventanove} 
              onChange={(val: number) => updateAmount('noventanove', val)}
              onAdjust={(delta: number) => handleAdjustAmount('noventanove', delta)}
              accent="bg-yellow-500"
            />
            <PlatformCard 
              label="InDrive" 
              value={amounts.indriver} 
              onChange={(val: number) => updateAmount('indriver', val)}
              onAdjust={(delta: number) => handleAdjustAmount('indriver', delta)}
              accent="bg-emerald-500"
            />
            <PlatformCard 
              label="Operações Extra" 
              value={amounts.extra} 
              onChange={(val: number) => updateAmount('extra', val)}
              onAdjust={(delta: number) => handleAdjustAmount('extra', delta)}
              accent="bg-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="flex justify-between items-center px-1 mb-xs">
            <SectionHeader icon={Navigation} title="DISTÂNCIA" />
            <button 
              onClick={() => setShowAdvancedKm(!showAdvancedKm)}
              className="text-[9px] font-black text-[#00FFBB] uppercase tracking-wider px-3 py-1 bg-[#00FFBB]/10 rounded-sm border border-[#00FFBB]/20 shadow-glow"
            >
              {showAdvancedKm ? 'SIMPLES' : 'DETALHAR'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-md">
            <KmCard 
              label="KM TOTAL" 
              value={kmTotalFinal} 
              onChange={(val: number) => setKms(prev => ({ ...prev, total: val }))} 
              isTracked={!!(openCycle?.tracked_km || tracking.isActive)}
            />
            <KmCard 
              label="KM ÚTIL" 
              value={kmRideFinal} 
              onChange={(val: number) => setKms(prev => ({ ...prev, ride: val }))} 
            />
          </div>

          <AnimatePresence>
            {showAdvancedKm && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-3 gap-md pt-1"
              >
                <KmCardMini label="UBER" value={kms.uber} onChange={(val) => setKms(prev => ({ ...prev, uber: val }))} />
                <KmCardMini label="99 POP" value={kms.noventanove} onChange={(val) => setKms(prev => ({ ...prev, noventanove: val }))} />
                <KmCardMini label="INDRIVE" value={kms.indriver} onChange={(val) => setKms(prev => ({ ...prev, indriver: val }))} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DESPESAS OPERACIONAIS */}
        <div className="flex flex-col gap-sm">
          <div className="flex justify-between items-center px-1 mb-xs">
            <SectionHeader icon={Fuel} title="DESPESAS" />
            <button 
              onClick={() => setShowExpenses(!showExpenses)}
              className="text-[9px] font-black text-amber-500 uppercase tracking-wider px-3 py-1 bg-amber-500/10 rounded-sm border border-amber-500/20"
            >
              {showExpenses ? 'CONSOLIDAR' : 'DESCRIMINAR'}
            </button>
          </div>

          <AnimatePresence>
            {showExpenses ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-md"
              >
                <ExpenseCard 
                  icon={Fuel}
                  label="COMBUSTÍVEL" 
                  value={expenses.fuel} 
                  onChange={(val) => setExpenses(prev => ({ ...prev, fuel: val }))} 
                />
                <ExpenseCard 
                  icon={Utensils}
                  label="REFEIÇÃO" 
                  value={expenses.food} 
                  onChange={(val) => setExpenses(prev => ({ ...prev, food: val }))} 
                />
                <ExpenseCard 
                  icon={MoreHorizontal}
                  label="DIVERSOS" 
                  value={expenses.other} 
                  onChange={(val) => setExpenses(prev => ({ ...prev, other: val }))} 
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowExpenses(true)}
                className="p-md rounded-sm bg-white/5 border border-white/5 flex items-center justify-between cursor-pointer group hover:bg-white/10 transition-all shadow-premium"
              >
                <div className="flex items-center gap-md">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-xs bg-zinc-900 flex items-center justify-center border border-white/10 shadow-premium">
                      <Fuel size={16} className="text-zinc-500" />
                    </div>
                    <div className="w-10 h-10 rounded-xs bg-zinc-900 flex items-center justify-center border border-white/10 shadow-premium">
                      <Utensils size={16} className="text-zinc-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-xs min-w-0 flex-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider truncate">SUBTOTAL DESPESAS</span>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter truncate">
                      {totalExpenses > dailyFixed ? 'LANÇAMENTOS DETALHADOS' : 'FIXOS OPERACIONAIS'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black italic font-display text-amber-500 tabular-nums">
                    {formatCurrency(totalExpenses - dailyFixed)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RESUMO DE EFICIÊNCIA */}
        <div className="flex flex-col gap-sm">
          <SectionHeader icon={TrendingUp} title="EFICIÊNCIA PROJETADA" />
          <Card className="border-none bg-[#0B0C10]/60 border border-white/5 rounded-lg overflow-hidden backdrop-blur-xl shadow-premium">
            <CardContent className="p-lg flex flex-col gap-lg">
              <div className="grid grid-cols-2 gap-md md:gap-lg border-b border-white/5 pb-lg">
                <div className="flex flex-col gap-xs">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-wider leading-none">LUCRO / KM</p>
                  <p className={cn(
                    "text-xl sm:text-2xl font-black tabular-nums italic font-display",
                    getEfficiencyStatus(kmTotalFinal, total).isValid 
                      ? (estimatedProfit >= 0 ? "text-[#00FFBB]" : "text-rose-500") 
                      : "text-zinc-700"
                  )}>
                    {getEfficiencyStatus(kmTotalFinal, total).isValid 
                      ? formatCurrency(estimatedProfit / kmTotalFinal) 
                      : "--"}
                  </p>
                </div>
                <div className="flex flex-col gap-xs text-right">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-wider leading-none">CUSTO / KM</p>
                  <p className={cn(
                    "text-xl sm:text-2xl font-black tabular-nums italic font-display",
                    getEfficiencyStatus(kmTotalFinal, total).isValid ? "text-white" : "text-zinc-700"
                  )}>
                    {getEfficiencyStatus(kmTotalFinal, total).isValid 
                      ? formatCurrency(totalExpenses / kmTotalFinal) 
                      : "--"}
                  </p>
                </div>
              </div>

              {!getEfficiencyStatus(kmTotalFinal, total).isValid ? (
                <div className="flex items-center gap-md justify-center py-md bg-white/5 rounded-sm border border-dashed border-white/10 px-md">
                  <Info size={16} className="text-zinc-600 shrink-0" />
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wider text-center">
                    {getEfficiencyStatus(kmTotalFinal, total).message}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between px-md py-sm bg-[#00FFBB]/5 rounded-sm border border-[#00FFBB]/10">
                  <div className="flex items-center gap-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] animate-pulse" />
                    <p className="text-[9px] font-black text-[#00FFBB] uppercase tracking-wider">OPERAÇÃO POSITIVA</p>
                  </div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-wider">CONSISTENTE</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MENSAGENS E INSTRUÇÕES */}
        <div className="space-y-1.5 md:space-y-2">
          {(total === 0 || kmRideFinal === 0) && (
            <div className="p-2 md:p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 flex items-center gap-2.5">
              <Info size={12} className="text-zinc-400 shrink-0" />
              <p className="text-[8px] md:text-[9px] text-zinc-500 font-bold leading-tight uppercase tracking-wide">
                Sem ganhos registrados. O custo fixo diário ({formatCurrency(dailyFixed, settings.isPrivacyMode)}) está sendo aplicado.
              </p>
            </div>
          )}
          <div className="p-2 md:p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/20 flex items-center gap-2.5">
            <AlertCircle size={12} className="text-zinc-400 shrink-0" />
            <p className="text-[8px] md:text-[9px] text-zinc-500 font-bold leading-tight uppercase tracking-wide">
              Insira o valor bruto de cada plataforma no momento do fechamento.
            </p>
          </div>
        </div>
      </div>

      {/* CARD FINAL - FLUXO NORMAL */}
      <div className="w-full px-2 pt-4 pb-10 h-auto">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-zinc-900 text-white border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden border-beam-container">
            <div className="border-beam" />
            <CardContent className="p-xl space-y-md">
              <div className="flex justify-between items-end gap-md">
                <div className="flex flex-col gap-xs min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 truncate">TOTAL BRUTO</p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white italic font-display truncate">
                    <CountUp value={total} />
                  </p>
                </div>
                <div className="text-right flex flex-col gap-xs min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#00FFBB]/60 truncate">LUCRO ESTIMADO</p>
                  <p className={cn(
                    "text-2xl sm:text-3xl font-black tracking-tighter italic font-display truncate",
                    estimatedProfit >= 0 ? "text-[#00FFBB] shadow-neon-text" : "text-rose-500"
                  )}>
                    <CountUp value={estimatedProfit} />
                  </p>
                </div>
              </div>
              
              <motion.div
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                   onClick={handleSave}
                   disabled={isProcessing || !activeVehicleId}
                   className={cn(
                     "w-full h-14 sm:h-16 font-black text-base sm:text-lg rounded-sm shadow-glow transition-all flex items-center justify-center uppercase tracking-widest shadow-premium",
                     !activeVehicleId
                       ? "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5"
                       : saveStatus === 'success' 
                         ? "bg-emerald-600 text-white" 
                         : "bg-[#00FFBB] text-zinc-950 hover:bg-[#00e6a9]"
                   )}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-sm">
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      PROCESSANDO
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Save size={20} />
                      <span>CONFIRMAR CICLO</span>
                    </div>
                  )}
                </Button>
              </motion.div>

              {saveStatus === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-[10px] font-black text-[#00FFBB] uppercase tracking-[0.2em] animate-pulse"
                >
                  DADOS SINCRONIZADOS. REDIRECIONANDO...
                </motion.p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-md px-1 mb-md">
    <div className="w-8 h-8 md:w-9 md:h-9 rounded-sm bg-[#00FFBB]/10 flex items-center justify-center border border-[#00FFBB]/20 shadow-glow shrink-0">
      <Icon size={16} md:size={18} strokeWidth={2.5} className="text-[#00FFBB]" />
    </div>
    <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500 italic truncate">{title}</h3>
  </div>
);

const PlatformCard = ({ label, value = 0, onChange, onAdjust, accent }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState((value || 0).toString());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isEditing) setTempValue((value || 0).toString());
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(tempValue.replace(',', '.'));
    onChange(isNaN(num) ? 0 : num);
  };

  const startAdjust = (delta: number) => {
    onAdjust(delta);
    let count = 0;
    timerRef.current = setInterval(() => {
      count++;
      const speed = count > 15 ? 10 : count > 8 ? 5 : 1;
      for (let i = 0; i < speed; i++) {
        onAdjust(delta);
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const stopAdjust = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="bg-[#0B0C10]/60 p-md rounded-sm border border-white/5 flex flex-col gap-sm backdrop-blur-xl transition-all hover:bg-white/10 group shadow-premium relative overflow-hidden">
      <div className="flex items-center gap-sm relative z-10">
        <div className={cn("w-2 h-2 rounded-full shadow-neon", accent)} />
        <span className="font-black text-[10px] uppercase tracking-wider text-zinc-500 leading-none italic truncate">{label}</span>
      </div>
      
      <div className="flex items-center gap-sm relative z-10">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onPointerDown={() => startAdjust(-1)}
          onPointerUp={stopAdjust}
          onPointerLeave={stopAdjust}
          className="w-10 h-10 rounded-xs border border-white/10 bg-zinc-900/50 flex items-center justify-center text-zinc-500 hover:text-white transition-colors active:scale-95 shrink-0"
        >
          <Minus size={16} />
        </motion.button>
        
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">R$</span>
          <input 
            type="text"
            inputMode="decimal"
            value={isEditing ? tempValue : (value || 0)}
            onChange={(e) => {
              setTempValue(e.target.value.replace(/[^0-9,.]/g, ''));
              if (!isEditing) setIsEditing(true);
            }}
            onBlur={handleBlur}
            className="w-full bg-white/5 border-none rounded-xs py-3 pl-10 pr-3 text-right font-black text-2xl tracking-tighter focus:ring-1 focus:ring-[#00FFBB]/50 transition-all text-white italic font-display"
          />
        </div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onPointerDown={() => startAdjust(1)}
          onPointerUp={stopAdjust}
          onPointerLeave={stopAdjust}
          className="w-10 h-10 rounded-xs border border-white/10 bg-zinc-900/50 flex items-center justify-center text-zinc-500 hover:text-[#00FFBB] transition-colors active:scale-95 shrink-0"
        >
          <Plus size={16} />
        </motion.button>
      </div>
    </div>
  );
};

const ExpenseCard = ({ icon: Icon, label, value = 0, onChange }: any) => (
  <div className={cn(
    "bg-[#0B0C10]/60 p-4 rounded-sm border transition-all shadow-premium group",
    (value || 0) > 0 ? "border-[#00FFBB]/40 bg-[#00FFBB]/5" : "border-white/5"
  )}>
    <div className="flex items-center gap-3 mb-4">
      <div className={cn(
        "w-9 h-9 rounded-xs flex items-center justify-center transition-all border shrink-0",
        (value || 0) > 0 ? "bg-[#00FFBB]/10 text-[#00FFBB] border-[#00FFBB]/20" : "bg-white/5 text-zinc-600 border-white/5"
      )}>
        <Icon size={16} />
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-wider transition-colors italic truncate",
        (value || 0) > 0 ? "text-[#00FFBB]" : "text-zinc-500"
      )}>{label}</span>
    </div>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">R$</span>
      <input 
        type="number"
        value={(value || 0) === 0 ? '' : value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? 0 : Number(val));
        }}
        placeholder="0,00"
        className={cn(
          "w-full bg-white/5 border-none rounded-xs py-3 pl-10 pr-3 text-right font-black text-lg transition-all focus:ring-1 focus:ring-[#00FFBB]/30 italic font-display tabular-nums",
          (value || 0) > 0 ? "text-[#00FFBB]" : "text-zinc-500"
        )}
      />
    </div>
  </div>
);

const KmCard = ({ label, value, onChange, isTracked }: any) => {
  const displayValue = value !== undefined && value !== null && !isNaN(value) 
    ? Number(parseFloat(value.toString()).toFixed(2)) 
    : 0;

  return (
    <div className="bg-[#0B0C10]/60 p-4 rounded-sm border border-white/5 relative overflow-hidden group shadow-premium flex flex-col gap-2 min-w-0">
      <span className="text-[10px] font-black uppercase tracking-tight text-zinc-500 leading-none italic truncate">{label}</span>
      <div className="flex items-baseline gap-2 relative z-10 pl-1 min-w-0">
        <input 
          type="number"
          step="0.01"
          value={displayValue === 0 ? '' : displayValue}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? 0 : Number(val));
          }}
          placeholder="0"
          className="w-full bg-transparent border-none p-0 text-xl font-black tracking-tight text-white focus:ring-0 leading-none italic font-display tabular-nums truncate"
        />
        <span className="text-[9px] font-black text-zinc-700 italic uppercase tracking-wider shrink-0">KM</span>
      </div>
      
      <div className="absolute -right-3 -bottom-3 text-zinc-800/10 group-focus-within:text-[#00FFBB]/5 transition-colors pointer-events-none">
        <Navigation size={48} strokeWidth={1} />
      </div>

      {isTracked && (
        <div className="absolute top-0 right-0 bg-[#00FFBB] text-zinc-950 text-[8px] font-black px-2 py-0.5 rounded-bl-sm flex items-center gap-1 shadow-neon">
          <div className="w-1 h-1 rounded-full bg-zinc-950 animate-pulse" />
          <span className="truncate">GPS ATIVO</span>
        </div>
      )}
    </div>
  );
};

const KmCardMini = ({ label, value, onChange }: any) => (
  <div className="bg-white/5 p-md rounded-sm border border-white/5 group hover:border-[#00FFBB]/20 transition-all">
    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block mb-2 italic">{label}</span>
    <div className="flex items-baseline gap-xs">
      <input 
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-full bg-transparent border-none p-0 text-base font-black text-white focus:ring-0 italic font-display tabular-nums"
      />
      <span className="text-[9px] font-black text-zinc-700 italic">KM</span>
    </div>
  </div>
);
