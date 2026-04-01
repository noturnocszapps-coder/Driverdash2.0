import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, X, Clock, CheckCircle2, Edit3, Zap } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn, formatCurrency } from '../utils';
import { toast } from 'sonner';

export const PostTripActionSheet: React.FC = () => {
  const { 
    postTripActionSheet, 
    setPostTripActionSheet, 
    addFinancialEntry, 
    updateUserLearning,
    settings,
    cycles = []
  } = useDriverStore();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (postTripActionSheet.isOpen && postTripActionSheet.autoCloseTimer) {
      setTimeLeft(postTripActionSheet.autoCloseTimer / 1000);
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (postTripActionSheet.isOpen) {
              updateUserLearning('ignore');
              setPostTripActionSheet({ isOpen: false });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [postTripActionSheet.isOpen, postTripActionSheet.autoCloseTimer, setPostTripActionSheet, updateUserLearning]);

  const handleAction = (type: 'gain' | 'expense') => {
    window.dispatchEvent(new CustomEvent('open-quick-entry', { 
      detail: { 
        type,
        suggestedValue: postTripActionSheet.suggestedValue 
      } 
    }));
    setPostTripActionSheet({ isOpen: false });
  };

  const handleConfirm = async () => {
    const activeCycle = cycles.find(c => c.status === 'open');
    if (postTripActionSheet.suggestedValue && activeCycle) {
      try {
        await addFinancialEntry({
          platform: 'extra',
          value: postTripActionSheet.suggestedValue,
          timestamp: new Date().toISOString(),
          origin: 'Auto-detecção',
          note: `Corrida automática: ${postTripActionSheet.suggestedDistance?.toFixed(2)}km`,
          cycle_id: activeCycle.id
        });
        updateUserLearning('accept');
        toast.success(`Ganho de ${formatCurrency(postTripActionSheet.suggestedValue, false)} confirmado!`, {
          icon: <CheckCircle2 className="text-emerald-500" />
        });
        if (navigator.vibrate) navigator.vibrate(30);
      } catch (error) {
        toast.error("Erro ao confirmar ganho automático");
      }
    }
    setPostTripActionSheet({ isOpen: false });
  };

  const handleEdit = () => {
    updateUserLearning('edit');
    handleAction('gain');
  };

  const handleIgnore = () => {
    updateUserLearning('ignore');
    setPostTripActionSheet({ isOpen: false });
  };

  return (
    <AnimatePresence>
      {postTripActionSheet.isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleIgnore}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />

          {/* Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[90] bg-zinc-900 border-t border-white/10 rounded-t-[32px] shadow-2xl p-6 pb-10"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-white font-bold text-xl mb-1 flex items-center gap-2">
                  <Zap size={20} className="text-emerald-500 fill-emerald-500" />
                  Corrida Detectada
                </h3>
                <p className="text-zinc-400 text-sm">IA estimou o valor baseado no trajeto.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <Clock size={14} className="text-amber-500" />
                <span className="text-amber-500 font-mono text-sm font-bold">{timeLeft}s</span>
              </div>
            </div>

            {postTripActionSheet.suggestedValue ? (
              <div className="bg-white/5 rounded-3xl p-6 mb-6 border border-white/5 flex flex-col items-center">
                <span className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Valor Sugerido</span>
                <div className="text-4xl font-black text-white mb-6 tabular-nums">
                  {formatCurrency(postTripActionSheet.suggestedValue, settings.isPrivacyMode)}
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleConfirm}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-black uppercase tracking-wider text-sm hover:bg-emerald-400 transition-colors active:scale-95"
                  >
                    <CheckCircle2 size={18} />
                    Confirmar
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/10 text-white font-black uppercase tracking-wider text-sm hover:bg-white/20 transition-colors active:scale-95"
                  >
                    <Edit3 size={18} />
                    Editar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => handleAction('gain')}
                  className="flex flex-col items-center justify-center p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95 group"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Plus className="text-white" size={28} />
                  </div>
                  <span className="text-emerald-500 font-bold text-lg">+ Ganho</span>
                </button>

                <button
                  onClick={() => handleAction('expense')}
                  className="flex flex-col items-center justify-center p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95 group"
                >
                  <div className="w-14 h-14 rounded-full bg-rose-500 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
                    <Minus className="text-white" size={28} />
                  </div>
                  <span className="text-rose-500 font-bold text-lg">- Despesa</span>
                </button>
              </div>
            )}

            <button
              onClick={handleIgnore}
              className="w-full py-4 rounded-2xl bg-white/5 text-zinc-400 font-medium hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <X size={18} />
              Ignorar por enquanto
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
