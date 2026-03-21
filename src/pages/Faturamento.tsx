import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, cn, calculateDailyFixedCost } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { ChevronLeft, Save, Plus, Minus, Info, AlertCircle, Smartphone, Fuel, Utensils, MoreHorizontal, TrendingUp, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';

export const Faturamento = () => {
  const { cycles, updateCycle, startCycle, settings, isSaving: storeIsSaving, tracking, stopTracking, vehicles } = useDriverStore();
  const navigate = useNavigate();
  
  const openCycle = cycles.find(c => c.status === 'open');
  
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, settings.currentVehicleProfileId]);

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
  const [showAdvancedKm, setShowAdvancedKm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (openCycle) {
      setAmounts({
        uber: openCycle.uber_amount,
        noventanove: openCycle.noventanove_amount,
        indriver: openCycle.indriver_amount,
        extra: openCycle.extra_amount
      });
      setExpenses({
        fuel: openCycle.fuel_expense || 0,
        food: openCycle.food_expense || 0,
        other: openCycle.other_expense || 0
      });
      setKms({
        total: openCycle.tracked_km || openCycle.total_km || 0,
        ride: openCycle.ride_km || 0,
        uber: openCycle.uber_km || 0,
        noventanove: openCycle.noventanove_km || 0,
        indriver: openCycle.indriver_km || 0
      });
    }
  }, [openCycle]);

  const handleSave = async () => {
    if (isSaving || storeIsSaving) return;
    
    if (tracking.isActive) {
      stopTracking();
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const cycleData = {
        uber_amount: amounts.uber,
        noventanove_amount: amounts.noventanove,
        indriver_amount: amounts.indriver,
        extra_amount: amounts.extra,
        fuel_expense: expenses.fuel,
        food_expense: expenses.food,
        other_expense: expenses.other,
        total_km: kms.total,
        ride_km: kms.ride,
        uber_km: kms.uber,
        noventanove_km: kms.noventanove,
        indriver_km: kms.indriver,
        status: 'closed' as const,
        end_time: new Date().toISOString(),
        vehicle_id: settings.currentVehicleProfileId,
        vehicle_name: currentVehicle?.name || settings.vehicle
      };

      if (!openCycle) {
        const newCycleId = await startCycle();
        await updateCycle(newCycleId, cycleData);
      } else {
        await updateCycle(openCycle.id, cycleData);
      }
      
      setSaveStatus('success');
      
      // Brief delay to show success state before redirecting
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('[Faturamento] Error saving cycle:', error);
      setSaveStatus('error');
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
      className="space-y-6 pb-24 md:pb-8"
    >
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm active:scale-90 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-0.5">Lançamento</p>
            <h1 className="text-2xl font-black tracking-tighter">Fechamento do Ciclo</h1>
          </div>
        </div>
        <SyncIndicator />
      </header>

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

      <div className="space-y-4">
        <SectionHeader icon={Smartphone} title="Faturamento por Plataforma" />
        <PlatformInput 
          label="Uber" 
          value={amounts.uber} 
          onChange={(val: number) => updateAmount('uber', val)}
          color="border-zinc-900 dark:border-white"
          accent="bg-zinc-900 dark:bg-white"
        />
        <PlatformInput 
          label="99" 
          value={amounts.noventanove} 
          onChange={(val: number) => updateAmount('noventanove', val)}
          color="border-yellow-500"
          accent="bg-yellow-500"
        />
        <PlatformInput 
          label="inDrive" 
          value={amounts.indriver} 
          onChange={(val: number) => updateAmount('indriver', val)}
          color="border-emerald-500"
          accent="bg-emerald-500"
        />
        <PlatformInput 
          label="Extra / Outros" 
          value={amounts.extra} 
          onChange={(val: number) => updateAmount('extra', val)}
          color="border-blue-500"
          accent="bg-blue-500"
        />
      </div>

      <div className="space-y-4">
        <SectionHeader icon={Fuel} title="Despesas do Ciclo" />
        <div className="grid grid-cols-1 gap-3">
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

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            Distância Percorrida
          </h3>
          <button 
            onClick={() => setShowAdvancedKm(!showAdvancedKm)}
            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest"
          >
            {showAdvancedKm ? 'Modo Simples' : 'Modo Avançado'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <KmInput 
              label="KM Total" 
              value={kms.total} 
              onChange={(val) => setKms(prev => ({ ...prev, total: val }))} 
            />
            {openCycle?.tracked_km && (
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-zinc-950 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                <Navigation size={8} />
                TRACKED
              </div>
            )}
          </div>
          <KmInput 
            label="KM em Corrida" 
            value={kms.ride} 
            onChange={(val) => setKms(prev => ({ ...prev, ride: val }))} 
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

      <Card className="bg-zinc-900 text-white border-none shadow-2xl shadow-zinc-900/20 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Total Geral</p>
              <p className="text-2xl font-black tracking-tighter">{formatCurrency(total)}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Lucro Estimado</p>
              <p className="text-2xl font-black tracking-tighter text-emerald-400">{formatCurrency(estimatedProfit)}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "w-full h-16 font-black text-lg rounded-2xl shadow-xl gap-3 transition-all",
              saveStatus === 'success' ? "bg-emerald-600 shadow-emerald-500/40" : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20",
              isSaving && "opacity-80"
            )}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                {saveStatus === 'success' ? 'Salvo!' : 'Salvando...'}
              </>
            ) : (
              <>
                <Save size={20} />
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

      <div className="flex items-center gap-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
        <AlertCircle size={20} className="text-zinc-400 shrink-0" />
        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-wider">
          Insira o valor total bruto que aparece no aplicativo de cada plataforma no momento do seu fechamento.
        </p>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-2 px-1">
    <Icon size={16} className="text-emerald-500" />
    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const ExpenseInput = ({ icon: Icon, label, value, onChange }: any) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <div className="relative w-24">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300">R$</span>
        <input 
          type="number"
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? 0 : Number(val));
          }}
          placeholder="0,00"
          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl py-2.5 pl-8 pr-3 text-right font-black text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      </div>
    </CardContent>
  </Card>
);

const KmInput = ({ label, value, onChange }: any) => (
  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
    <CardContent className="p-4 flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <div className="relative">
        <input 
          type="number"
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? 0 : Number(val));
          }}
          placeholder="0"
          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl py-2.5 px-3 text-right font-black text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300">KM</span>
      </div>
    </CardContent>
  </Card>
);

const PlatformInput = ({ label, value, onChange, color, accent }: any) => {
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
    <Card className={cn("border-l-4 transition-all border-none bg-white dark:bg-zinc-900 shadow-sm", color)}>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full shadow-sm", accent)} />
          <span className="font-black text-sm uppercase tracking-widest text-zinc-500">{label}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onChange(Math.max(0, value - 10))}
            className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-90 transition-all"
          >
            <Minus size={18} />
          </button>
          
          <div className="relative w-28">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300">R$</span>
            <input 
              type="text"
              inputMode="decimal"
              value={isEditing ? tempValue : value}
              onChange={(e) => {
                setTempValue(e.target.value.replace(/[^0-9,.]/g, ''));
                if (!isEditing) setIsEditing(true);
              }}
              onBlur={handleBlur}
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl py-3 pl-8 pr-3 text-right font-black text-lg tracking-tight focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <button 
            onClick={() => onChange(value + 10)}
            className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-90 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
