import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Search, CircleStop } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';

export const TripControl = () => {
  const { tracking, startTrip, endTrip, startTracking, cycles } = useDriverStore();
  const openCycle = cycles.find(c => c.status === 'open');

  if (!openCycle || !tracking.isActive) return null;

  const getStatusConfig = () => {
    switch (tracking.mode) {
      case 'on_trip':
        return {
          label: '🚕 Em Corrida',
          subLabel: 'KM Produtivo',
          icon: Navigation,
          color: 'bg-emerald-500',
          textColor: 'text-emerald-500',
          shadow: 'shadow-emerald-500/20',
          pulse: 'bg-emerald-500/20'
        };
      case 'searching':
        return {
          label: '🔎 Buscando',
          subLabel: 'KM Ocioso',
          icon: Search,
          color: 'bg-amber-500',
          textColor: 'text-amber-500',
          shadow: 'shadow-amber-500/20',
          pulse: 'bg-amber-500/20'
        };
      default:
        return {
          label: '⛔ Parado',
          subLabel: 'Aguardando',
          icon: CircleStop,
          color: 'bg-zinc-500',
          textColor: 'text-zinc-400',
          shadow: 'shadow-zinc-500/20',
          pulse: 'bg-zinc-500/20'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="fixed bottom-24 left-0 right-0 px-4 z-40 pointer-events-none md:left-72 md:px-8">
      <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
        {/* Status Indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tracking.mode}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={cn(
              "px-4 py-2 rounded-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 shadow-2xl flex items-center gap-3 pointer-events-auto transition-all duration-500",
              config.shadow
            )}
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn("absolute inset-0 rounded-full blur-sm", config.pulse)}
              />
              <div className={cn("relative w-2 h-2 rounded-full transition-colors duration-500", config.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-none">
                {config.label}
              </span>
              <span className={cn("text-[8px] font-bold uppercase tracking-widest leading-none mt-1 opacity-60 transition-colors duration-500", config.textColor)}>
                {config.subLabel}
              </span>
            </div>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-2xl font-black tabular-nums transition-colors duration-500 tracking-tighter",
                tracking.currentSmoothedSpeed > 20 ? "text-emerald-500" :
                tracking.currentSmoothedSpeed > 5 ? "text-amber-400" :
                "text-zinc-500"
              )}>
                {tracking.currentSmoothedSpeed.toFixed(0)}
              </span>
              <div className="flex flex-col -space-y-1">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">km/h</span>
                <span className="text-[6px] font-bold text-zinc-600 uppercase tracking-[0.1em]">Real</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Main Control Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (tracking.mode === 'on_trip') {
              endTrip();
            } else {
              startTrip();
            }
          }}
          className={cn(
            "pointer-events-auto w-full max-w-[280px] h-16 rounded-3xl flex items-center justify-between px-6 transition-all duration-500 shadow-2xl group overflow-hidden relative",
            tracking.mode === 'on_trip' 
              ? "bg-red-500 text-white shadow-red-500/20" 
              : "bg-emerald-500 text-zinc-950 shadow-emerald-500/20"
          )}
        >
          <div className="flex flex-col items-start relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
              {tracking.mode === 'on_trip' ? 'Encerrar' : 'Iniciar'}
            </span>
            <span className="text-lg font-black tracking-tighter">
              {tracking.mode === 'on_trip' ? 'Corrida Atual' : 'Nova Corrida'}
            </span>
          </div>
          
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative z-10",
            tracking.mode === 'on_trip' ? "bg-white/20" : "bg-zinc-950/10"
          )}>
            <AnimatePresence mode="wait">
              {tracking.mode === 'on_trip' ? (
                <motion.div
                  key="stop"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <Square size={20} fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <Play size={20} fill="currentColor" className="ml-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shine effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        </motion.button>
      </div>
    </div>
  );
};
