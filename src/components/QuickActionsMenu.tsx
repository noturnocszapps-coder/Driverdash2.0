import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Map as MapIcon, CheckCircle2, X, LayoutGrid, Maximize2 } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
}

export const QuickActionsMenu: React.FC = () => {
  const navigate = useNavigate();
  const { isQuickActionsOpen, setQuickActionsOpen, tracking } = useDriverStore();

  const actions: QuickAction[] = [
    {
      id: 'gain',
      label: '+ Ganho',
      icon: Plus,
      color: 'bg-emerald-500',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'gain' } }));
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'expense',
      label: '- Despesa',
      icon: Minus,
      color: 'bg-rose-500',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-quick-entry', { detail: { type: 'expense' } }));
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: LayoutGrid,
      color: 'bg-zinc-700',
      action: () => {
        navigate('/faturamento');
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'status',
      label: 'Produtividade',
      icon: CheckCircle2,
      color: tracking.isProductive ? 'bg-emerald-500' : 'bg-zinc-500',
      action: () => {
        useDriverStore.getState().updateTracking({ isProductive: !tracking.isProductive });
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'map',
      label: 'Mapa',
      icon: MapIcon,
      color: 'bg-blue-500',
      action: () => {
        navigate('/cycle-map/active');
        setQuickActionsOpen(false);
      }
    },
    {
      id: 'hud',
      label: 'Abrir HUD',
      icon: Maximize2,
      color: 'bg-emerald-500',
      action: () => {
        useDriverStore.getState().updateTracking({ hudState: 'expanded' });
        setQuickActionsOpen(false);
      }
    }
  ];

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
            <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-white font-semibold text-lg">Ações Rápidas</h3>
                <button 
                  onClick={() => setQuickActionsOpen(false)}
                  className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform",
                      action.color
                    )}>
                      <action.icon className="text-white" size={24} />
                    </div>
                    <span className="text-zinc-300 text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
