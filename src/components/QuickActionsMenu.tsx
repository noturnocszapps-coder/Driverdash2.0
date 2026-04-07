import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Map as MapIcon, CheckCircle2, X, LayoutGrid, Maximize2, Play, History, Settings2, Check } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  action: () => void;
}

export const QuickActionsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { isQuickActionsOpen, setQuickActionsOpen, tracking, settings, updateSettings, startTrip } = useDriverStore();
  const [isCustomizing, setIsCustomizing] = useState(false);

  const allActions: QuickAction[] = [
    {
      id: 'gain',
      label: 'Ganho',
      icon: Plus,
      gradient: 'from-emerald-500 to-emerald-600',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'gain' } }));
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'expense',
      label: 'Despesa',
      icon: Minus,
      gradient: 'from-rose-500 to-rose-600',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'expense' } }));
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: LayoutGrid,
      gradient: 'from-zinc-700 to-zinc-800',
      action: () => {
        navigate('/faturamento');
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'status',
      label: 'Produtividade',
      icon: CheckCircle2,
      gradient: tracking.isProductive ? 'from-emerald-500 to-emerald-600' : 'from-zinc-500 to-zinc-600',
      action: () => {
        useDriverStore.getState().updateTracking({ isProductive: !tracking.isProductive });
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'map',
      label: 'Mapa',
      icon: MapIcon,
      gradient: 'from-blue-500 to-blue-600',
      action: () => {
        navigate('/cycle-map/active');
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'hud',
      label: 'HUD',
      icon: Maximize2,
      gradient: 'from-emerald-500 to-emerald-600',
      action: () => {
        useDriverStore.getState().updateTracking({ hudState: 'expanded' });
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'start_trip',
      label: 'Iniciar',
      icon: Play,
      gradient: 'from-emerald-600 to-emerald-700',
      action: () => {
        startTrip();
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'last_trip',
      label: 'Última',
      icon: History,
      gradient: 'from-amber-500 to-amber-600',
      action: () => {
        navigate('/reports'); // Or a specific last trip view if available
        setQuickActionsOpen(false);
      }
    }
  ];

  const userActionIds = settings.quickActions || ['gain', 'expense', 'reports', 'map'];
  const activeActions = allActions.filter(a => userActionIds.includes(a.id));

  const toggleAction = (id: string) => {
    let newActions = [...userActionIds];
    if (newActions.includes(id)) {
      if (newActions.length <= 2) {
        toast.error("Mínimo de 2 ações necessárias");
        return;
      }
      newActions = newActions.filter(a => a !== id);
    } else {
      if (newActions.length >= 6) {
        toast.error("Máximo de 6 ações permitido");
        return;
      }
      newActions.push(id);
    }
    updateSettings({ quickActions: newActions });
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickActionsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setQuickActionsOpen]);

  return (
    <AnimatePresence>
      {isQuickActionsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickActionsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Menu Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xs z-[70] px-4"
          >
            <div className="bg-zinc-900/95 border border-white/10 rounded-3xl p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">
                    {isCustomizing ? 'Personalizar' : 'Ações Rápidas'}
                  </h3>
                  {isCustomizing && (
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                      ({userActionIds.length}/6)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsCustomizing(!isCustomizing)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      isCustomizing ? "bg-emerald-500 text-zinc-950" : "bg-white/5 text-zinc-400 hover:text-white"
                    )}
                  >
                    <Settings2 size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setQuickActionsOpen(false);
                      setIsCustomizing(false);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isCustomizing ? (
                  allActions.map((action) => {
                    const isSelected = userActionIds.includes(action.id);
                    return (
                      <motion.button
                        key={action.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleAction(action.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-[2.5rem] border transition-all relative overflow-hidden",
                          isSelected 
                            ? "bg-emerald-500/10 border-emerald-500/30" 
                            : "bg-white/5 border-white/5 opacity-50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <Check size={12} className="text-emerald-500" />
                          </div>
                        )}
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-lg bg-gradient-to-br",
                          action.gradient
                        )}>
                          <action.icon className="text-white" size={20} />
                        </div>
                        <span className="text-zinc-300 text-[10px] font-black uppercase tracking-widest leading-none">{action.label}</span>
                      </motion.button>
                    );
                  })
                ) : (
                  activeActions.map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={action.action}
                      className="flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-zinc-800/50 border border-white/5 hover:bg-zinc-800 hover:border-white/10 transition-all group shadow-xl shadow-black/40 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className={cn(
                        "w-14 h-14 rounded-[1.25rem] flex items-center justify-center mb-3 shadow-2xl bg-gradient-to-br group-hover:shadow-emerald-500/20 transition-all duration-500 relative z-10",
                        action.gradient
                      )}>
                        <action.icon className="text-white" size={24} />
                      </div>
                      <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none group-hover:text-white transition-colors relative z-10">{action.label}</span>
                    </motion.button>
                  ))
                )}
              </div>
              
              {isCustomizing && (
                <div className="mt-4 px-2">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                    Selecione de 2 a 6 ações para exibir no menu rápido.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
