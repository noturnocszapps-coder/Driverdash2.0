import React, { useState, useEffect } from 'react';
import { useDriverStore } from '../store';
import { Button } from './UI';
import { X, MessageSquare, Zap } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEntry?: any; // Using any for now to avoid circular dependency or just use FinancialEntry if imported
}

export const QuickEntryModal = ({ isOpen, onClose, editEntry }: QuickEntryModalProps) => {
  const { cycles, addFinancialEntry, updateFinancialEntry, startCycle, isSaving } = useDriverStore();
  const [amount, setAmount] = useState('');
  const [platform, setPlatform] = useState<'uber' | 'noventanove' | 'indriver' | 'extra'>('uber');
  const [note, setNote] = useState('');

  // Reset state when opening or editing
  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setAmount(editEntry.value.toString().replace('.', ','));
        setPlatform(editEntry.platform === '99' ? 'noventanove' : editEntry.platform);
        setNote(editEntry.origin || '');
      } else {
        setAmount('');
        setNote('');
        setPlatform('uber');
      }
    }
  }, [isOpen, editEntry]);

  const handleSave = async () => {
    if (isSaving) return;
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    if (editEntry) {
      await updateFinancialEntry(editEntry.id, {
        platform,
        value,
        origin: note
      });
    } else {
      let openCycle = cycles.find(c => c.status === 'open');
      let cycleId = openCycle?.id;

      if (!cycleId) {
        cycleId = await startCycle();
      }

      await addFinancialEntry({
        cycle_id: cycleId,
        platform,
        value,
        timestamp: new Date().toISOString(),
        origin: note || 'manual'
      });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Bottom Sheet */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-[2.5rem] shadow-2xl z-[70] max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2" />
            
            <div className="p-6 pt-2 space-y-6 max-w-lg mx-auto">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">{editEntry ? 'Editar Lançamento' : 'Lançamento Rápido'}</h3>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Valor Recebido</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-300">R$</span>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      autoFocus
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-3xl py-8 pl-16 pr-6 text-4xl font-black focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-200 dark:placeholder:text-zinc-800 transition-all"
                    />
                  </div>
                </div>

                {/* Platform Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Plataforma</label>
                  <div className="grid grid-cols-2 gap-3">
                    <PlatformTab 
                      active={platform === 'uber'} 
                      onClick={() => setPlatform('uber')} 
                      label="Uber" 
                      color="bg-zinc-900 dark:bg-white" 
                    />
                    <PlatformTab 
                      active={platform === 'noventanove'} 
                      onClick={() => setPlatform('noventanove')} 
                      label="99" 
                      color="bg-yellow-500" 
                    />
                    <PlatformTab 
                      active={platform === 'indriver'} 
                      onClick={() => setPlatform('indriver')} 
                      label="inDrive" 
                      color="bg-emerald-500" 
                    />
                    <PlatformTab 
                      active={platform === 'extra'} 
                      onClick={() => setPlatform('extra')} 
                      label="Extra" 
                      color="bg-blue-500" 
                    />
                  </div>
                </div>

                {/* Note Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Observação</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ex: Gorjeta em dinheiro"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 pb-8">
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || !amount || parseFloat(amount.replace(',', '.')) <= 0}
                  className="w-full h-16 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 transition-all"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar Lançamento'}
                </Button>
                <p className="mt-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  O valor será somado ao ciclo atual
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const PlatformTab = ({ active, onClick, label, color }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
      active 
        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" 
        : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    )}
  >
    <div className={cn("w-3 h-3 rounded-full shadow-sm", color)} />
    <span className={cn(
      "text-sm font-bold",
      active ? "text-emerald-600" : "text-zinc-500"
    )}>{label}</span>
  </button>
);
