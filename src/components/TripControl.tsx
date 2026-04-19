import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Square, Navigation, Search, CircleStop, 
  Check, X, Zap, TrendingUp, MapPin, Clock,
  Mic, MessageSquare, AlertCircle, Info
} from 'lucide-react';
import { useDriverStore } from '../store';
import { cn } from '../utils';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocation } from 'react-router-dom';

export const TripControl = () => {
  const { 
    tracking, startTrip, endTrip, ignoreDetection, 
    cycles, postTripActionSheet, voiceState,
    setCopilotFeedback,
    syncStatus
  } = useDriverStore();
  
  const location = useLocation();
  const openCycle = cycles.find(c => c.status === 'open');
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const isFaturamentoPage = location.pathname.includes('faturamento');
  const { copilotFeedback } = tracking;
  const { isListening } = voiceState;

  // Determine Visual State
  const visualState = useMemo(() => {
    if (copilotFeedback) return 'feedback';
    if (isListening) return 'listening';
    if (tracking.tripDetectionState === 'pickup_candidate') return 'detected';
    if (tracking.mode === 'in_trip') return 'in_trip';
    if (tracking.isActive) return tracking.currentSmoothedSpeed > 5 ? 'searching' : 'minimized';
    return 'not_active';
  }, [tracking.isActive, tracking.mode, tracking.tripDetectionState, tracking.currentSmoothedSpeed, copilotFeedback, isListening]);

  // Dynamic Island Variants
  const islandVariants = {
    not_active: { width: 'auto', height: '56px', borderRadius: '28px' },
    minimized: { width: 'auto', height: '56px', borderRadius: '28px' },
    searching: { width: '200px', height: '56px', borderRadius: '28px' },
    listening: { width: '240px', height: '64px', borderRadius: '32px' },
    feedback: { width: 'auto', height: '56px', borderRadius: '28px', minWidth: '180px' },
    detected: { width: '100%', height: '150px', borderRadius: '32px' },
    in_trip: { width: isExpanded ? '100%' : '180px', height: isExpanded ? '92px' : '56px', borderRadius: isExpanded ? '32px' : '28px' }
  };

  // Auto-expand/minimize logic
  useEffect(() => {
    if (visualState === 'detected' || visualState === 'listening' || visualState === 'feedback') {
      setIsExpanded(true);
    } else if (visualState === 'minimized' || visualState === 'not_active') {
      // Auto-minimize after 5s if manually expanded
      if (isExpanded) {
        const timer = setTimeout(() => setIsExpanded(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [visualState, isExpanded]);

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

  const toggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { plan, setPaywallOpen, setVoiceListening, voiceState } = useDriverStore.getState();
    if (plan === 'free') {
      setPaywallOpen(true);
      return;
    }
    setVoiceListening(!voiceState.isListening);
  };

  return (
    <div 
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-500 w-full max-w-md px-4",
        isMobile ? "top-[calc(env(safe-area-inset-top)+32px)]" : "bottom-8"
      )}
    >
      <div className="pointer-events-auto flex flex-col items-center">
        <motion.div
          layout
          initial={false}
          variants={islandVariants}
          animate={visualState}
          transition={{ 
            type: 'spring', 
            damping: 25, 
            stiffness: 200,
            layout: { duration: 0.3 }
          }}
          className={cn(
            "relative overflow-hidden flex items-center justify-center",
            "bg-zinc-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl",
            isExpanded && visualState !== 'minimized' ? "p-4" : "px-4"
          )}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          <AnimatePresence mode="wait">
            {/* 1. FEEDBACK STATE */}
            {visualState === 'feedback' && copilotFeedback && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  copilotFeedback.type === 'success' ? "bg-emerald-500 text-zinc-950" :
                  copilotFeedback.type === 'error' ? "bg-red-500 text-white" :
                  copilotFeedback.type === 'voice' ? "bg-blue-500 text-white" :
                  "bg-zinc-800 text-zinc-400"
                )}>
                  {copilotFeedback.type === 'success' ? <Check size={16} /> :
                   copilotFeedback.type === 'error' ? <AlertCircle size={16} /> :
                   copilotFeedback.type === 'voice' ? <Mic size={16} /> :
                   <Info size={16} />}
                </div>
                <span className="text-sm font-black text-white tracking-tight">
                  {copilotFeedback.message}
                </span>
              </motion.div>
            )}

            {/* 2. LISTENING STATE */}
            {visualState === 'listening' && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-4"
              >
                <div className="relative" onClick={toggleVoice}>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-500 rounded-full blur-md"
                  />
                  <div className="relative w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white cursor-pointer">
                    <Mic size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] leading-none mb-1">Assistente</span>
                  <span className="text-sm font-black text-white tracking-tight">Ouvindo comando...</span>
                </div>
              </motion.div>
            )}

            {/* 3. DETECTED STATE */}
            {visualState === 'detected' && (
              <motion.div
                key="detected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Smart Detection</p>
                    <p className="text-sm font-black text-white tracking-tight">Corrida detectada!</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); ignoreDetection(); }}
                    className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); startTrip(); }}
                    className="flex-1 h-10 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. IN TRIP STATE */}
            {visualState === 'in_trip' && (
              <motion.div
                key="in_trip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn("flex items-center gap-4", !isExpanded && "justify-center")}
              >
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute w-6 h-6 bg-red-500/30 rounded-full blur-sm"
                  />
                  <div className="relative w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>

                {isExpanded ? (
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Em Corrida</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white tabular-nums tracking-tighter leading-none">
                          {speed.toFixed(0)}
                        </span>
                        <span className="text-[8px] font-black text-zinc-600 uppercase">km/h</span>
                        <div className="w-px h-3 bg-white/10 mx-1" />
                        <span className="text-lg font-black text-zinc-300 tabular-nums tracking-tighter leading-none">
                          {distance.toFixed(1)}
                        </span>
                        <span className="text-[8px] font-black text-zinc-600 uppercase">km</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleVoice}
                        className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                      >
                        <Mic size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); endTrip(); }}
                        className="h-10 px-4 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20"
                      >
                        Encerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white tabular-nums">{speed.toFixed(0)} km/h</span>
                    <div className="w-px h-3 bg-white/10" />
                    <span className="text-xs font-black text-zinc-400 tabular-nums">{distance.toFixed(1)} km</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. SEARCHING / MINIMIZED / NOT ACTIVE */}
            {(visualState === 'searching' || visualState === 'minimized' || visualState === 'not_active') && (
              <motion.div
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  {visualState === 'searching' && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-amber-500 rounded-full blur-sm"
                    />
                  )}
                  <div className={cn(
                    "relative w-2 h-2 rounded-full",
                    visualState === 'searching' ? "bg-amber-500" : 
                    visualState === 'minimized' ? "bg-emerald-500" :
                    "bg-zinc-700"
                  )} />
                </div>
                
                {isExpanded ? (
                  <div className="flex-1 flex items-center justify-between min-w-[200px]">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">
                        {visualState === 'searching' ? 'Buscando' : 
                         visualState === 'minimized' ? 'Ativo' : 
                         (syncStatus === 'synced' || syncStatus === 'online' || syncStatus === 'idle') ? 'Pronto' : 'Offline'}
                      </span>
                      <span className="text-sm font-black text-white tracking-tight">
                        {visualState === 'not_active' ? 'Iniciar Rastreamento' : 
                         speed > 0 ? `${speed.toFixed(0)} km/h` : 'Parado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleVoice}
                        className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                      >
                        <Mic size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStart(); }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                          visualState === 'not_active' ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {visualState === 'not_active' ? <Play size={18} fill="currentColor" className="ml-0.5" /> : <Square size={16} fill="currentColor" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-black text-white tracking-tight whitespace-nowrap">
                    {visualState === 'not_active' ? 
                     ((syncStatus === 'synced' || syncStatus === 'online' || syncStatus === 'idle') ? 'Pronto' : 'Offline') : 
                     speed > 5 ? `🚗 ${speed.toFixed(0)} km/h` : `• ${speed.toFixed(0)} km/h`}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
