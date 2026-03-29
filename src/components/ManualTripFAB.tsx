import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Clock } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';

export const ManualTripFAB = () => {
  const { tracking, startTracking, stopTracking, isSaving } = useDriverStore();
  const isActive = tracking.isActive;
  const isTransitioning = tracking.mode === 'transition';

  const handleAction = async () => {
    if (isSaving) return;
    
    if (isActive) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 md:hidden">
      <AnimatePresence mode="wait">
        <motion.button
          key={isActive ? 'active' : 'inactive'}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAction}
          disabled={isSaving}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative overflow-hidden",
            isActive 
              ? "bg-red-500 text-white shadow-red-500/40" 
              : "bg-emerald-500 text-zinc-950 shadow-emerald-500/40"
          )}
        >
          {/* Subtle Glow */}
          <div className={cn(
            "absolute inset-0 opacity-20 animate-pulse",
            isActive ? "bg-white" : "bg-zinc-950"
          )} />
          
          <div className="relative z-10 flex flex-col items-center">
            {isActive ? (
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

          {/* Status Ring */}
          {isTransitioning && (
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
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {tracking.mode === 'on_trip' ? 'Em Corrida' : 'Aguardando'}
          </span>
          <span className="text-[10px] font-bold text-zinc-400">
            {tracking.duration > 0 ? `${Math.floor(tracking.duration / 60)}m` : ''}
          </span>
        </motion.div>
      )}
    </div>
  );
};
