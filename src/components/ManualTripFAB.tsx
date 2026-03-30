import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Clock } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn, formatDuration } from '../utils';

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
    <div className={cn(
      "fixed z-[100] md:hidden transition-all duration-700 ease-in-out",
      isActive 
        ? "bottom-[calc(3rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 scale-110" 
        : "bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6"
    )}>
      <AnimatePresence mode="wait">
        <motion.button
          key={mode}
          drag="x"
          dragConstraints={{ left: -30, right: 30 }}
          dragElastic={0.2}
          initial={{ scale: 0, rotate: -90, y: 50 }}
          animate={{ 
            scale: isActive ? 1.15 : 1, 
            rotate: 0,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 20 }
          }}
          exit={{ scale: 0, rotate: 90, y: 50 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleAction}
          disabled={isSaving}
          className={cn(
            "rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden",
            "shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-4 border-white/10",
            isActive ? "w-24 h-24" : "w-16 h-16",
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

      {/* Mini Status Indicator - Refined for zero distraction */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -top-14 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 whitespace-nowrap"
        >
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor]",
            mode === 'in_trip' ? 'bg-red-500 text-red-500' : 
            mode === 'searching' ? 'bg-amber-500 text-amber-500' : 
            'bg-emerald-500 text-emerald-500'
          )} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none mb-0.5">
              {mode === 'in_trip' ? 'Em Corrida' : 
               mode === 'searching' ? 'Buscando' : 
               mode === 'waiting_passenger' ? 'Aguardando' :
               mode === 'transition' ? 'Transição' : 'Ativo'}
            </span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
              {tracking.duration > 0 ? formatDuration(tracking.duration) : 'Iniciando...'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
