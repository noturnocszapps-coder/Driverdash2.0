import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { ChevronLeft, Save, Plus, Minus, Info, AlertCircle, Smartphone, Fuel, Utensils, MoreHorizontal, TrendingUp, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
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
    // If we have tracked data, it takes precedence over manual state unless manual state was explicitly changed
    // For simplicity and following the "ONE final value" rule:
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
    console.log("[Fechamento] Versão v2.1 carregada");
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
      
      // Consolidate KM data: prefer tracked data if available
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
    if (process.env.NODE_ENV === 'development') {
      console.log("[Fechamento] Salvando ciclo...");
    }
    setSaveStatus('idle');

    try {
      // Garantir que o rastreamento parou antes de fechar o ciclo
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
      
      // Pequeno delay visual para UX
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-24 md:pb-8"
    >
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-0">Lançamento</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tighter">Fechamento do Ciclo</h1>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase tracking-widest">v2.1</span>
            </div>
          </div>
        </div>
        <SyncIndicator />
      </header>

      {!activeVehicleId && (
        <Card className="border-none bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Veículo não selecionado</p>
            <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">Você precisa selecionar um veículo para salvar faturamentos.</p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            className="bg-amber-500 text-zinc-950 hover:bg-amber-400 h-8 px-3 text-[10px] font-black uppercase tracking-widest"
          >
            Configurar
          </Button>
        </Card>
      )}

      {!openCycle && (
        <Card className="bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10">
          <CardContent className="p-5 flex items-start gap-3">
            <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
              Você não tem um ciclo ativo. Ao salvar, um novo ciclo de 24h será iniciado automaticamente com estes valores.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <SectionHeader icon={Smartphone} title="Faturamento por Plataforma" />
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800/50">
          <PlatformInput 
            label="Uber" 
            value={amounts.uber} 
            onChange={(val: number) => updateAmount('uber', val)}
            accent="bg-zinc-900 dark:bg-white"
          />
          <PlatformInput 
            label="99" 
            value={amounts.noventanove} 
            onChange={(val: number) => updateAmount('noventanove', val)}
            accent="bg-yellow-500"
          />
          <PlatformInput 
            label="inDrive" 
            value={amounts.indriver} 
            onChange={(val: number) => updateAmount('indriver', val)}
            accent="bg-emerald-500"
          />
          <PlatformInput 
            label="Extra / Outros" 
            value={amounts.extra} 
            onChange={(val: number) => updateAmount('extra', val)}
            accent="bg-blue-500"
            isLast
          />
        </div>
      </div>

      <div className="space-y-2">
        <SectionHeader icon={Fuel} title="Despesas do Ciclo" />
        <div className="grid grid-cols-1 gap-2">
          <ExpenseInput 
            icon={Fuel}
            label="Combustível" 
            value={expenses.fuel} 
            onChange={(val) => setExpenses(prev => ({ ...prev, fuel: val }))} 
          />
          <ExpenseInput 
            icon={Utensils}
            label="Alimentação" 
            value={expenses.food} 
            onChange={(val) => setExpenses(prev => ({ ...prev, food: val }))} 
          />
          <ExpenseInput 
            icon={MoreHorizontal}
            label="Outras Despesas" 
            value={expenses.other} 
            onChange={(val) => setExpenses(prev => ({ ...prev, other: val }))} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-zinc-500">
            <TrendingUp size={14} className="text-emerald-500" />
            Distância Percorrida
          </h3>
          <button 
            onClick={() => setShowAdvancedKm(!showAdvancedKm)}
            className="text-[9px] font-black text-emerald-500 uppercase tracking-widest"
          >
            {showAdvancedKm ? 'Simples' : 'Avançado'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <KmInput 
              label="KM Total" 
              value={kmTotalFinal} 
              onChange={(val: number) => setKms(prev => ({ ...prev, total: val }))} 
            />
            {(openCycle?.tracked_km || tracking.isActive) && (
              <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-zinc-950 text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-10">
                <Navigation size={6} />
                TRACKED
              </div>
            )}
          </div>
          <KmInput 
            label="KM em Corrida" 
            value={kmRideFinal} 
            onChange={(val: number) => setKms(prev => ({ ...prev, ride: val }))} 
          />
        </div>

        {showAdvancedKm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800"
          >
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">KM por Plataforma</p>
            <div className="grid grid-cols-3 gap-3">
              <KmInput 
                label="Uber" 
                value={kms.uber} 
                onChange={(val) => setKms(prev => ({ ...prev, uber: val }))} 
              />
              <KmInput 
                label="99" 
                value={kms.noventanove} 
                onChange={(val) => setKms(prev => ({ ...prev, noventanove: val }))} 
              />
              <KmInput 
                label="inDrive" 
                value={kms.indriver} 
                onChange={(val) => setKms(prev => ({ ...prev, indriver: val }))} 
              />
            </div>
          </motion.div>
        )}
      </div>

      <Card className="bg-zinc-900 text-white border-none shadow-2xl shadow-zinc-900/40 rounded-[2rem] overflow-hidden mx-0.5">
        <CardContent className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Total Bruto</p>
              <p className="text-xl font-black tracking-tighter">{formatCurrency(total)}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Lucro Líquido</p>
              <p className="text-xl font-black tracking-tighter text-emerald-400">{formatCurrency(estimatedProfit)}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={isProcessing || !activeVehicleId}
            loading={isProcessing}
            className={cn(
              "w-full h-14 font-black text-base rounded-xl shadow-lg gap-2 transition-all",
              !activeVehicleId
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border-none"
                : saveStatus === 'success' 
                  ? "bg-emerald-600 shadow-emerald-500/40 border-none" 
                  : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20 border-none text-black"
            )}
          >
            {isProcessing ? (
              'Salvando...'
            ) : (
              <>
                <Save size={18} />
                Confirmar Fechamento
              </>
            )}
          </Button>

          {saveStatus === 'error' && (
            <p className="text-center text-xs font-bold text-red-400 animate-pulse">
              Não foi possível salvar o fechamento. Tente novamente.
            </p>
          )}
          
          {saveStatus === 'success' && (
            <p className="text-center text-xs font-bold text-emerald-400">
              Fechamento salvo com sucesso! Redirecionando...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mensagem explicativa de custo fixo quando não há faturamento */}
      {(total === 0 || kmRideFinal === 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 flex items-center gap-3 mx-1"
        >
          <Info size={14} className="text-zinc-500 shrink-0" />
          <p className="text-[9px] text-zinc-500 font-bold leading-tight uppercase tracking-wider">
            Você ainda não registrou ganhos. Seu custo fixo diário já está sendo considerado.
          </p>
        </motion.div>
      )}

      <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800/50 mx-1">
        <AlertCircle size={16} className="text-zinc-400 shrink-0" />
        <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase tracking-wider">
          Insira o valor total bruto que aparece no aplicativo de cada plataforma no momento do seu fechamento.
        </p>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-2 px-1">
    <Icon size={14} className="text-emerald-500" />
    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const ExpenseInput = ({ icon: Icon, label, value, onChange }: any) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
    <CardContent className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Icon size={14} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <div className="relative w-20">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400">R$</span>
        <input 
          type="number"
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? 0 : Number(val));
          }}
          placeholder="0,00"
          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-lg py-2 pl-7 pr-2.5 text-right font-black text-xs focus:ring-1 focus:ring-emerald-500 transition-all"
        />
      </div>
    </CardContent>
  </Card>
);

const KmInput = ({ label, value, onChange }: any) => {
  const displayValue = value !== undefined && value !== null && !isNaN(value) 
    ? Number(parseFloat(value.toString()).toFixed(2)) 
    : 0;

  return (
    <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
      <CardContent className="p-3 flex flex-col gap-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        <div className="relative">
          <input 
            type="number"
            step="0.01"
            value={displayValue === 0 ? '' : displayValue}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? 0 : Number(val));
            }}
            placeholder="0"
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-lg py-2 pl-8 pr-2.5 text-right font-black text-xs focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400">KM</span>
        </div>
      </CardContent>
    </Card>
  );
};

const PlatformInput = ({ label, value, onChange, accent, isLast }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  useEffect(() => {
    if (!isEditing) {
      setTempValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(tempValue.replace(',', '.'));
    onChange(isNaN(num) ? 0 : num);
  };

  return (
    <div className={cn(
      "p-3 flex items-center justify-between gap-3 transition-all",
      !isLast && "border-b border-zinc-50 dark:border-zinc-800/50"
    )}>
      <div className="flex items-center gap-2.5">
        <div className={cn("w-1.5 h-1.5 rounded-full", accent)} />
        <span className="font-black text-[11px] uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onChange(Math.max(0, value - 5))}
          className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-90 transition-all"
        >
          <Minus size={14} />
        </button>
        
        <div className="relative w-24">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400">R$</span>
          <input 
            type="text"
            inputMode="decimal"
            value={isEditing ? tempValue : value}
            onChange={(e) => {
              setTempValue(e.target.value.replace(/[^0-9,.]/g, ''));
              if (!isEditing) setIsEditing(true);
            }}
            onBlur={handleBlur}
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-lg py-2 pl-7 pr-2.5 text-right font-black text-sm tracking-tight focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        <button 
          onClick={() => onChange(value + 5)}
          className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-90 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
