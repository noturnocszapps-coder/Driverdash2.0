import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Search, CircleStop } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';

export const TripControl = () => {
  const { tracking, startTrip, endTrip, startTracking, cycles } = useDriverStore();
  const openCycle = cycles.find(c => c.status === 'open');

  if (!openCycle) return null;

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
      <div className="max-w-lg mx-auto pointer-events-auto">
        <motion.div
          layout
          className={cn(
            "bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 shadow-2xl rounded-[2.5rem] p-2 flex items-center justify-between transition-all duration-500",
            config.shadow
          )}
        >
          {/* Left Section: Status & Speed */}
          <div className="flex items-center gap-4 pl-4">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn("absolute inset-0 rounded-full blur-sm", config.pulse)}
              />
              <div className={cn("relative w-2.5 h-2.5 rounded-full transition-colors duration-500", config.color)} />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-none">
                {config.label}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-2xl font-black tabular-nums transition-colors duration-500 tracking-tighter",
                  tracking.currentSmoothedSpeed > 20 ? "text-emerald-500" :
                  tracking.currentSmoothedSpeed > 5 ? "text-amber-400" :
                  "text-zinc-500"
                )}>
                  {tracking.currentSmoothedSpeed.toFixed(0)}
                </span>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">km/h</span>
              </div>
            </div>

            {/* Trip Intelligence Status Dot */}
            {tracking.isActive && tracking.tripIntelligence && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  tracking.tripIntelligence.status === 'good' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                  tracking.tripIntelligence.status === 'acceptable' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                  tracking.tripIntelligence.status === 'bad' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                  "bg-zinc-500 animate-pulse"
                )} />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest",
                  tracking.tripIntelligence.status === 'good' ? "text-emerald-500" :
                  tracking.tripIntelligence.status === 'acceptable' ? "text-blue-500" :
                  tracking.tripIntelligence.status === 'bad' ? "text-red-500" :
                  "text-zinc-500"
                )}>
                  {tracking.tripIntelligence.status === 'analyzing' ? 'IA' : tracking.tripIntelligence.status}
                </span>
              </div>
            )}
          </div>

          {/* Right Section: Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (tracking.mode === 'on_trip') {
                endTrip();
              } else {
                startTrip();
              }
            }}
            className={cn(
              "h-14 px-6 rounded-[2rem] flex items-center gap-3 transition-all duration-500 shadow-lg group overflow-hidden relative",
              tracking.mode === 'on_trip' 
                ? "bg-red-500 text-white shadow-red-500/20" 
                : "bg-emerald-500 text-zinc-950 shadow-emerald-500/20"
            )}
          >
            <div className="flex flex-col items-start relative z-10">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 leading-none">
                {tracking.mode === 'on_trip' ? 'Encerrar' : 'Iniciar'}
              </span>
              <span className="text-xs font-black tracking-tight mt-0.5">
                {tracking.mode === 'on_trip' ? 'Corrida' : 'Nova Corrida'}
              </span>
            </div>
            
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative z-10",
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
                    <Square size={16} fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                  >
                    <Play size={16} fill="currentColor" className="ml-0.5" />
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
        </motion.div>
      </div>
    </div>
  );
};
