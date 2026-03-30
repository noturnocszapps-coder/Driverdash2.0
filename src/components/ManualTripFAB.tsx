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
      "fixed z-[100] md:hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
      "bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-6"
    )}>
      <AnimatePresence mode="wait">
        <motion.button
          key={mode}
          initial={{ scale: 0, y: 20, opacity: 0 }}
          animate={{ 
            scale: 1, 
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 400, damping: 30 }
          }}
          exit={{ scale: 0, y: 20, opacity: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAction}
          disabled={isSaving}
          className={cn(
            "rounded-full flex items-center justify-center transition-all duration-700 relative overflow-hidden",
            "shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-[2px] border-white/10 backdrop-blur-md",
            isActive ? "w-16 h-16 sm:w-20 sm:h-20" : "w-14 h-14 sm:w-16 sm:h-16",
            getFABStyle()
          )}
        >
          {/* Refined Premium Glow - Subtle */}
          <motion.div 
            animate={{ 
              opacity: isActive ? [0.05, 0.15, 0.05] : 0,
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute inset-0 blur-xl",
              mode === 'in_trip' ? "bg-red-400" : 
              mode === 'searching' ? "bg-amber-400" : "bg-emerald-400"
            )}
          />
          
          <div className="relative z-10 flex flex-col items-center">
            {tracking.isProductive ? (
              <>
                <Square size={isActive ? 22 : 18} fill="currentColor" className="transition-all duration-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.15em] mt-1 opacity-80">Parar</span>
              </>
            ) : (
              <>
                <Play size={isActive ? 22 : 18} fill="currentColor" className="ml-0.5 transition-all duration-500" />
                <span className="text-[8px] font-black uppercase tracking-[0.15em] mt-1 opacity-80">Iniciar</span>
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
