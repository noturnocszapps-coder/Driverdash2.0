import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Search, CircleStop } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';
import { useIsMobile } from '../hooks/useIsMobile';

import { useLocation } from 'react-router-dom';

export const TripControl = () => {
  const { tracking, startTrip, endTrip, startTracking, cycles, postTripActionSheet } = useDriverStore();
  const location = useLocation();
  const openCycle = cycles.find(c => c.status === 'open');
  const isMobile = useIsMobile();

  const isFaturamentoPage = location.pathname.includes('faturamento');

  React.useEffect(() => {
    console.log('[TRACKING_LAYOUT] TripControl rendered. Mode:', tracking.mode, 'Active:', tracking.isActive);
    const container = document.querySelector('.trip-control-container');
    if (container) {
      console.log('[TRACKING_LAYOUT] TripControl container width:', container.clientWidth);
    }
  }, [tracking.mode, tracking.isActive]);

  if (!openCycle || postTripActionSheet.isOpen || isFaturamentoPage) return null;

  const getStatusConfig = () => {
    switch (tracking.mode) {
      case 'in_trip':
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
      case 'waiting':
        return {
          label: '⏳ Aguardando',
          subLabel: 'Passageiro',
          icon: CircleStop,
          color: 'bg-blue-500',
          textColor: 'text-blue-500',
          shadow: 'shadow-blue-500/20',
          pulse: 'bg-blue-500/20'
        };
      case 'transition':
        return {
          label: '🔄 Transição',
          subLabel: 'Próxima Corrida',
          icon: Navigation,
          color: 'bg-purple-500',
          textColor: 'text-purple-500',
          shadow: 'shadow-purple-500/20',
          pulse: 'bg-purple-500/20'
        };
      case 'idle':
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
    <div 
      className={cn(
        "fixed left-0 w-full px-4 z-60 pointer-events-none transition-all duration-500 trip-control-container",
        !isMobile && "md:left-72 md:px-8"
      )}
      style={{
        bottom: isMobile 
          ? 'calc(90px + env(safe-area-inset-bottom))' 
          : 'calc(96px + env(safe-area-inset-bottom))'
      }}
    >
      <div className="max-w-md mx-auto pointer-events-auto w-full px-4">
        <motion.div
          layout
          className={cn(
            "bg-zinc-950/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-full p-1 flex items-center justify-between transition-all duration-500 hover:bg-zinc-950/60",
            config.shadow.replace('shadow-', 'shadow-sm shadow-')
          )}
        >
          {/* Left Section: Status & Speed */}
          <div className="flex items-center gap-2.5 pl-3">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className={cn("absolute inset-0 rounded-full blur-sm", config.pulse)}
              />
              <div className={cn("relative w-1.5 h-1.5 rounded-full transition-colors duration-500", config.color)} />
            </div>

            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-500 leading-none">
                {config.label.split(' ')[1] || config.label}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn(
                  "text-base font-black tabular-nums transition-colors duration-500 tracking-tighter leading-none",
                  tracking.currentSmoothedSpeed > 20 ? "text-emerald-500" :
                  tracking.currentSmoothedSpeed > 5 ? "text-amber-400" :
                  "text-zinc-200"
                )}>
                  {tracking.currentSmoothedSpeed.toFixed(0)}
                </span>
                <span className="text-[6px] font-black text-zinc-600 uppercase tracking-tighter">km/h</span>
              </div>
            </div>

            {/* Intelligence Indicators - Ultra Compact */}
            <div className="flex items-center gap-1 ml-0.5">
              {tracking.isActive && tracking.tripIntelligence && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "w-1 h-1 rounded-full",
                    tracking.tripIntelligence.status === 'good' ? "bg-emerald-500" :
                    tracking.tripIntelligence.status === 'acceptable' ? "bg-blue-500" :
                    tracking.tripIntelligence.status === 'bad' ? "bg-red-500" :
                    "bg-zinc-700 animate-pulse"
                  )} 
                />
              )}
              {tracking.isActive && tracking.zoneIntelligence && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "w-1 h-1 rounded-full",
                    tracking.zoneIntelligence.status === 'good_zone' ? "bg-emerald-500" :
                    tracking.zoneIntelligence.status === 'neutral_zone' ? "bg-amber-500" :
                    tracking.zoneIntelligence.status === 'bad_zone' ? "bg-red-500" :
                    "bg-zinc-700 animate-pulse"
                  )} 
                />
              )}
            </div>
          </div>

          {/* Right Section: Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition') {
                endTrip();
              } else {
                startTrip();
              }
            }}
            className={cn(
              "h-9 px-3.5 rounded-full flex items-center gap-2 transition-all duration-500 shadow-lg group overflow-hidden relative",
              (tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition')
                ? "bg-red-500/90 text-white" 
                : "bg-emerald-500/90 text-zinc-950"
            )}
          >
            <div className="flex flex-col items-start relative z-10">
              <span className="text-[5px] font-black uppercase tracking-[0.2em] opacity-60 leading-none">
                {(tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition') ? 'Encerrar' : 'Iniciar'}
              </span>
              <span className="text-[8px] font-black tracking-tight mt-0.5">
                {(tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition') ? 'Corrida' : 'Nova Corrida'}
              </span>
            </div>
            
            <div className={cn(
              "w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-110 relative z-10",
              (tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition') ? "bg-white/20" : "bg-zinc-950/10"
            )}>
              <AnimatePresence mode="wait">
                {(tracking.mode === 'in_trip' || tracking.mode === 'waiting' || tracking.mode === 'transition') ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                  >
                    <Square size={10} fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                  >
                    <Play size={10} fill="currentColor" className="ml-0.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
