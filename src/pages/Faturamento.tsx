import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { ChevronLeft, Save, Plus, Minus, Info, AlertCircle, Smartphone, Fuel, Utensils, MoreHorizontal, TrendingUp, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';

export const Faturamento = () => {
  const { cycles, updateCycle, startCycle, settings, isSaving: storeIsSaving, tracking, stopTracking, vehicles, activeVehicleId } = useDriverStore();
  const navigate = useNavigate();
  
  const openCycle = cycles.find(c => c.status === 'open');
  
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
      className="min-h-screen overflow-y-auto space-y-4 max-w-lg mx-auto"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
    >
      {/* HEADER PREMIUM & COMPACTO */}
      <header className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-3">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white leading-none">Fechamento do Ciclo</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold uppercase tracking-widest">v2.2</span>
            </div>
          </div>
        </div>
        <SyncIndicator />
      </header>

      <div className="px-2 space-y-4">
        {/* AVISOS E ALERTAS */}
        <AnimatePresence>
          {!activeVehicleId && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-none bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Veículo não selecionado</p>
                  <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 leading-tight">Selecione um veículo para salvar faturamentos.</p>
                </div>
                <Button 
                  onClick={() => navigate('/settings')}
                  className="bg-amber-500 text-zinc-950 h-7 px-3 text-[9px] font-bold uppercase tracking-widest rounded-lg"
                >
                  Configurar
                </Button>
              </Card>
            </motion.div>
          )}

          {!openCycle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className="bg-blue-500/5 border-blue-500/10 p-3 flex items-start gap-2.5">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={14} />
                <p className="text-[10px] text-blue-400 font-medium leading-tight">
                  Sem ciclo ativo. Um novo ciclo será iniciado com estes valores.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FATURAMENTO - MODO ULTRA RÁPIDO */}
        <div className="space-y-2">
          <SectionHeader icon={Smartphone} title="Faturamento" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50">
            <PlatformInput 
              label="Uber" 
              value={amounts.uber} 
              onChange={(val: number) => updateAmount('uber', val)}
              onAdjust={(delta: number) => handleAdjustAmount('uber', delta)}
              accent="bg-zinc-900 dark:bg-white"
            />
            <PlatformInput 
              label="99" 
              value={amounts.noventanove} 
              onChange={(val: number) => updateAmount('noventanove', val)}
              onAdjust={(delta: number) => handleAdjustAmount('noventanove', delta)}
              accent="bg-yellow-500"
            />
            <PlatformInput 
              label="inDrive" 
              value={amounts.indriver} 
              onChange={(val: number) => updateAmount('indriver', val)}
              onAdjust={(delta: number) => handleAdjustAmount('indriver', delta)}
              accent="bg-emerald-500"
            />
            <PlatformInput 
              label="Extra" 
              value={amounts.extra} 
              onChange={(val: number) => updateAmount('extra', val)}
              onAdjust={(delta: number) => handleAdjustAmount('extra', delta)}
              accent="bg-blue-500"
              isLast
            />
          </div>
        </div>

        {/* DISTÂNCIA - MINI DASHBOARD */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <SectionHeader icon={TrendingUp} title="Distância" />
            <button 
              onClick={() => setShowAdvancedKm(!showAdvancedKm)}
              className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest px-2 py-1 bg-emerald-500/10 rounded-md"
            >
              {showAdvancedKm ? 'Simples' : 'Avançado'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <KmCard 
              label="KM Total" 
              value={kmTotalFinal} 
              onChange={(val: number) => setKms(prev => ({ ...prev, total: val }))} 
              isTracked={!!(openCycle?.tracked_km || tracking.isActive)}
            />
            <KmCard 
              label="KM em Corrida" 
              value={kmRideFinal} 
              onChange={(val: number) => setKms(prev => ({ ...prev, ride: val }))} 
            />
          </div>

          <AnimatePresence>
            {showAdvancedKm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-3 gap-2 pt-1"
              >
                <KmCardMini label="Uber" value={kms.uber} onChange={(val) => setKms(prev => ({ ...prev, uber: val }))} />
                <KmCardMini label="99" value={kms.noventanove} onChange={(val) => setKms(prev => ({ ...prev, noventanove: val }))} />
                <KmCardMini label="inDrive" value={kms.indriver} onChange={(val) => setKms(prev => ({ ...prev, indriver: val }))} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DESPESAS INTELIGENTES */}
        <div className="space-y-2">
          <SectionHeader icon={Fuel} title="Despesas" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/50">
            <ExpenseRow 
              icon={Fuel}
              label="Combustível" 
              value={expenses.fuel} 
              onChange={(val) => setExpenses(prev => ({ ...prev, fuel: val }))} 
            />
            <ExpenseRow 
              icon={Utensils}
              label="Alimentação" 
              value={expenses.food} 
              onChange={(val) => setExpenses(prev => ({ ...prev, food: val }))} 
            />
            <ExpenseRow 
              icon={MoreHorizontal}
              label="Outras" 
              value={expenses.other} 
              onChange={(val) => setExpenses(prev => ({ ...prev, other: val }))} 
              isLast
            />
          </div>
        </div>

        {/* MENSAGENS E INSTRUÇÕES */}
        <div className="space-y-2">
          {(total === 0 || kmRideFinal === 0) && (
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 flex items-center gap-3">
              <Info size={14} className="text-zinc-400 shrink-0" />
              <p className="text-[9px] text-zinc-500 font-medium leading-tight uppercase tracking-wider">
                Sem ganhos registrados. O custo fixo diário ({formatCurrency(dailyFixed, settings.isPrivacyMode)}) está sendo aplicado.
              </p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/20 flex items-center gap-3">
            <AlertCircle size={14} className="text-zinc-400 shrink-0" />
            <p className="text-[9px] text-zinc-500 font-medium leading-tight uppercase tracking-wider">
              Insira o valor bruto de cada plataforma no momento do fechamento.
            </p>
          </div>
        </div>
      </div>

      {/* CARD FINAL - FLUXO NORMAL */}
      <div className="w-full px-2 pt-4 h-auto">
        <div className="max-w-lg mx-auto">
          <Card className="bg-zinc-900 text-white border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Bruto</p>
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(total, settings.isPrivacyMode)}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Lucro Líquido</p>
                  <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    estimatedProfit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatCurrency(estimatedProfit, settings.isPrivacyMode)}
                  </p>
                </div>
              </div>
              
              <motion.div
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleSave}
                  disabled={isProcessing || !activeVehicleId}
                  loading={isProcessing}
                  className={cn(
                    "w-full h-14 font-bold text-lg rounded-2xl shadow-lg gap-2 transition-all",
                    !activeVehicleId
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : saveStatus === 'success' 
                        ? "bg-emerald-600" 
                        : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                  )}
                  style={activeVehicleId && saveStatus !== 'success' ? { 
                    boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)',
                    filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))'
                  } : {}}
                >
                  {isProcessing ? 'Processando...' : (
                    <>
                      <Save size={20} />
                      Confirmar Ciclo
                    </>
                  )}
                </Button>
              </motion.div>

              {saveStatus === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-[10px] font-bold text-emerald-400 uppercase tracking-widest"
                >
                  Sucesso! Redirecionando...
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
  <div className="flex items-center gap-1.5 px-1">
    <Icon size={12} className="text-emerald-500" />
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const PlatformInput = ({ label, value, onChange, onAdjust, accent, isLast }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const timerRef = useRef<any>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
    if (!isEditing) setTempValue(value.toString());
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(tempValue.replace(',', '.'));
    onChange(isNaN(num) ? 0 : num);
  };

  const startAdjust = (delta: number) => {
    // Initial click
    onAdjust(delta);
    
    let count = 0;
    timerRef.current = setInterval(() => {
      count++;
      // Accelerate after 8 ticks
      const speed = count > 15 ? 10 : count > 8 ? 5 : 1;
      for (let i = 0; i < speed; i++) {
        onAdjust(delta);
      }
    }, 100);
  };

  const stopAdjust = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className={cn(
      "px-4 py-3 flex items-center justify-between gap-3",
      !isLast && "border-b border-zinc-50 dark:border-zinc-800/50"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full shadow-sm", accent)} />
        <span className="font-bold text-xs text-zinc-700 dark:text-zinc-300">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onPointerDown={() => startAdjust(-5)}
          onPointerUp={stopAdjust}
          onPointerLeave={stopAdjust}
          className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 transition-colors"
        >
          <Minus size={16} />
        </motion.button>
        
        <div className="relative w-24">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">R$</span>
          <input 
            type="text"
            inputMode="decimal"
            value={isEditing ? tempValue : value}
            onChange={(e) => {
              setTempValue(e.target.value.replace(/[^0-9,.]/g, ''));
              if (!isEditing) setIsEditing(true);
            }}
            onBlur={handleBlur}
            className="w-full bg-zinc-50 dark:bg-zinc-800/30 border-none rounded-xl py-2 pl-8 pr-3 text-right font-bold text-sm tracking-tight focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        <motion.button 
          whileTap={{ scale: 0.9 }}
          onPointerDown={() => startAdjust(5)}
          onPointerUp={stopAdjust}
          onPointerLeave={stopAdjust}
          className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 transition-colors"
        >
          <Plus size={16} />
        </motion.button>
      </div>
    </div>
  );
};

const ExpenseRow = ({ icon: Icon, label, value, onChange, isLast }: any) => (
  <div className={cn(
    "px-4 py-3 flex items-center justify-between transition-colors",
    !isLast && "border-b border-zinc-50 dark:border-zinc-800/50",
    value > 0 && "bg-emerald-500/5"
  )}>
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
        value > 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
      )}>
        <Icon size={16} />
      </div>
      <span className={cn(
        "text-xs font-bold transition-colors",
        value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"
      )}>{label}</span>
    </div>
    <div className="relative w-24">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">R$</span>
      <input 
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? 0 : Number(val));
        }}
        placeholder="0,00"
        className={cn(
          "w-full bg-zinc-50 dark:bg-zinc-800/30 border-none rounded-xl py-2 pl-8 pr-3 text-right font-bold text-sm transition-all",
          value > 0 ? "text-emerald-500" : "text-zinc-400"
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
    <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 relative overflow-hidden group">
      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
        <div className="flex items-baseline gap-1">
          <input 
            type="number"
            step="0.01"
            value={displayValue === 0 ? '' : displayValue}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? 0 : Number(val));
            }}
            placeholder="0"
            className="w-full bg-transparent border-none p-0 text-xl font-bold tracking-tight text-zinc-900 dark:text-white focus:ring-0"
          />
          <span className="text-[10px] font-bold text-zinc-400">KM</span>
        </div>
      </div>
      
      <div className="absolute -right-2 -bottom-2 text-zinc-100 dark:text-zinc-800/20 group-focus-within:text-emerald-500/10 transition-colors">
        <Navigation size={48} strokeWidth={1} />
      </div>

      {isTracked && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-sm">
          <div className="w-1 h-1 rounded-full bg-zinc-950 animate-pulse" />
          GPS
        </div>
      )}
    </div>
  );
};

const KmCardMini = ({ label, value, onChange }: any) => (
  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <input 
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-full bg-transparent border-none p-0 text-sm font-bold text-zinc-600 dark:text-zinc-300 focus:ring-0"
      />
      <span className="text-[8px] font-bold text-zinc-500">KM</span>
    </div>
  </div>
);
