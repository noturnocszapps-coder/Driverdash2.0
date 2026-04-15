import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Square, Navigation, Search, CircleStop, 
  Check, X, Zap, TrendingUp, MapPin, Clock
} from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocation } from 'react-router-dom';

export const TripControl = () => {
  const { 
    tracking, startTrip, endTrip, ignoreDetection, 
    cycles, postTripActionSheet 
  } = useDriverStore();
  const location = useLocation();
  const openCycle = cycles.find(c => c.status === 'open');
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const isFaturamentoPage = location.pathname.includes('faturamento');

  // Determine Visual State
  const getVisualState = () => {
    if (!tracking.isActive) return 'not_active';
    if (tracking.mode === 'in_trip') return 'in_trip';
    if (tracking.tripDetectionState === 'pickup_candidate') return 'detected';
    if (tracking.currentSmoothedSpeed > 5) return 'searching';
    return 'minimized';
  };

  const visualState = getVisualState();

  // Auto-expand when detected
  useEffect(() => {
    if (visualState === 'detected') {
      setIsExpanded(true);
    }
  }, [visualState]);

  if (!openCycle || postTripActionSheet.isOpen || isFaturamentoPage) return null;

  const speed = tracking.currentSmoothedSpeed;
  const distance = tracking.distance / 1000;

  const handleStart = () => {
    if (!tracking.isActive) {
      useDriverStore.getState().startTracking();
    } else {
      startTrip();
    }
  };

  return (
    <div 
      className={cn(
        "fixed right-4 z-[100] pointer-events-none transition-all duration-500",
        isMobile ? "bottom-24" : "bottom-8"
      )}
    >
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <AnimatePresence mode="wait">
          {/* State 3: Detection (Special Layout) */}
          {visualState === 'detected' && (
            <motion.div
              key="detected"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] rounded-[2rem] p-4 flex flex-col gap-4 min-w-[240px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 animate-pulse">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Performance</p>
                  <p className="text-sm font-black text-white tracking-tight">Corrida detectada!</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => ignoreDetection()}
                  className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => startTrip()}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          )}

          {/* State 4: In Trip (Uber Style) */}
          {visualState === 'in_trip' && (
            <motion.div
              key="in_trip"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-zinc-900/95 backdrop-blur-xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.15)] rounded-[2rem] p-2 flex items-center gap-4 min-w-[280px]"
            >
              <div className="flex items-center gap-3 pl-3 py-1">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-red-500/20 rounded-full blur-sm"
                  />
                  <div className="relative w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Em Corrida</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">
                      {speed.toFixed(0)}
                    </span>
                    <span className="text-[8px] font-black text-zinc-600 uppercase">km/h</span>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <span className="text-lg font-black text-zinc-300 tabular-nums tracking-tighter leading-none">
                      {distance.toFixed(1)}
                    </span>
                    <span className="text-[8px] font-black text-zinc-600 uppercase">km</span>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => endTrip()}
                className="ml-auto h-12 px-6 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20"
              >
                Encerrar
              </motion.button>
            </motion.div>
          )}

          {/* State 1 & 2: Minimized / Searching / Not Active */}
          {(visualState === 'minimized' || visualState === 'searching' || visualState === 'not_active') && (
            <motion.div
              key="pill"
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "bg-zinc-900/90 backdrop-blur-xl border border-white/5 shadow-xl rounded-full p-1.5 flex items-center transition-all duration-500 cursor-pointer",
                (visualState === 'searching' || speed > 0 || (visualState === 'not_active' && isExpanded) || isExpanded) ? "gap-3 pr-4" : "gap-0"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                visualState === 'searching' ? "bg-amber-500 text-zinc-950" : 
                visualState === 'not_active' ? "bg-zinc-800 text-zinc-500" :
                "bg-zinc-800 text-zinc-400"
              )}>
                {visualState === 'searching' ? <Search size={18} /> : 
                 visualState === 'not_active' ? <Play size={18} fill="currentColor" className="ml-0.5" /> :
                 <CircleStop size={18} />}
              </div>

              <AnimatePresence>
                {(visualState === 'searching' || (visualState === 'minimized' && speed > 0)) && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex flex-col overflow-hidden whitespace-nowrap"
                  >
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest leading-none mb-0.5",
                      visualState === 'searching' ? "text-amber-500" : "text-zinc-500"
                    )}>
                      {visualState === 'searching' ? 'Buscando' : 'Movimento'}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-white tabular-nums tracking-tighter leading-none">
                        {speed.toFixed(0)}
                      </span>
                      <span className="text-[8px] font-black text-zinc-600 uppercase">km/h</span>
                    </div>
                  </motion.div>
                )}

                {visualState === 'minimized' && speed === 0 && isExpanded && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex items-center gap-3 pl-2 pr-4 overflow-hidden whitespace-nowrap"
                  >
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5">Status</span>
                      <span className="text-xs font-black text-white uppercase tracking-tight">Parado</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart();
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20"
                    >
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </button>
                  </motion.div>
                )}
                
                {visualState === 'not_active' && isExpanded && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex items-center gap-3 pl-2 pr-4 overflow-hidden whitespace-nowrap"
                  >
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-0.5">Rastreamento</span>
                      <span className="text-xs font-black text-white uppercase tracking-tight">Iniciar</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart();
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20"
                    >
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
