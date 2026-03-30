import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Clock } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';

export const ManualTripFAB = () => {
  const { tracking, startTrip, endTrip, isSaving } = useDriverStore();
  const isActive = tracking.isActive;
  const mode = tracking.mode;

  const handleAction = () => {
    if (isSaving) return;
    
    if (tracking.isProductive) {
      endTrip();
    } else {
      startTrip();
    }
  };

  // Map tracking mode to visual style
  const getFABStyle = () => {
    switch (mode) {
      case 'in_trip':
        return "bg-red-600 text-white shadow-red-600/50 ring-4 ring-red-600/20";
      case 'searching':
        return "bg-amber-500 text-zinc-950 shadow-amber-500/40 animate-pulse";
      case 'waiting_passenger':
        return "bg-blue-500 text-white shadow-blue-500/40";
      case 'transition':
        return "bg-purple-500 text-white shadow-purple-500/40";
      case 'idle':
      default:
        return "bg-emerald-500 text-zinc-950 shadow-emerald-500/40";
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 md:hidden">
      <AnimatePresence mode="wait">
        <motion.button
          key={mode}
          drag="x"
          dragConstraints={{ left: -20, right: 20 }}
          dragElastic={0.1}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAction}
          disabled={isSaving}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative overflow-hidden",
            getFABStyle()
          )}
        >
          {/* Dynamic Glow for Active Trip */}
          {mode === 'in_trip' && (
            <motion.div 
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-white" 
            />
          )}
          
          <div className="relative z-10 flex flex-col items-center">
            {tracking.isProductive ? (
              <>
                <Square size={24} fill="currentColor" />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Parar</span>
              </>
            ) : (
              <>
                <Play size={24} fill="currentColor" className="ml-1" />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Iniciar</span>
              </>
            )}
          </div>

          {/* Status Ring for Transition */}
          {mode === 'transition' && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="188.4"
                className="opacity-20"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="188.4"
                initial={{ strokeDashoffset: 188.4 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </svg>
          )}
        </motion.button>
      </AnimatePresence>

      {/* Mini Status Indicator */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-10 right-0 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 whitespace-nowrap"
        >
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            mode === 'in_trip' ? 'bg-red-500' : 
            mode === 'searching' ? 'bg-amber-500' : 
            'bg-emerald-500'
          )} />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {mode === 'in_trip' ? 'Em Corrida' : 
             mode === 'searching' ? 'Buscando' : 
             mode === 'waiting_passenger' ? 'Aguardando' :
             mode === 'transition' ? 'Transição' : 'Ativo'}
          </span>
          <span className="text-[10px] font-bold text-zinc-400">
            {tracking.duration > 0 ? `${Math.floor(tracking.duration / 60)}m` : ''}
          </span>
        </motion.div>
      )}
    </div>
  );
};
