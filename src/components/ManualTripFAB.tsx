import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Clock, Mic } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn, formatDuration } from '../utils';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocation } from 'react-router-dom';

export const ManualTripFAB = () => {
  const { tracking, startTrip, endTrip, isSaving, setQuickActionsOpen, settings, postTripActionSheet } = useDriverStore();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isActive = tracking.isActive;
  const mode = tracking.mode;

  const isFaturamentoPage = location.pathname.includes('faturamento');

  const handleAction = () => {
    if (isSaving) return;
    
    if (tracking.isProductive) {
      endTrip();
      if (navigator.vibrate) navigator.vibrate(40);
    } else {
      startTrip();
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    }
  };

  const handlePan = (_: any, info: any) => {
    // Swipe up to open quick actions
    if (info.offset.y < -40) {
      setQuickActionsOpen(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const [isQuickActionPulse, setIsQuickActionPulse] = React.useState(false);

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setQuickActionsOpen(true);
    setIsQuickActionPulse(true);
    // Enhanced vibration for long press feedback
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    // Reset pulse after animation
    setTimeout(() => setIsQuickActionPulse(false), 600);
  };

  // Map tracking mode to visual style
  const getFABStyle = () => {
    switch (mode) {
      case 'in_trip':
        return "bg-red-600 text-white shadow-red-600/50 ring-4 ring-red-600/20";
      case 'searching':
        return "bg-amber-500 text-zinc-950 shadow-amber-500/40 animate-pulse";
      case 'waiting':
        return "bg-blue-500 text-white shadow-blue-500/40";
      case 'transition':
        return "bg-purple-500 text-white shadow-purple-500/40";
      case 'idle':
      default:
        return "bg-emerald-500 text-zinc-950 shadow-emerald-500/40";
    }
  };

  React.useEffect(() => {
    console.log('[TRACKING_LAYOUT] ManualTripFAB rendered. Mode:', mode, 'Active:', isActive);
    const fab = document.querySelector('.manual-trip-fab');
    if (fab) {
      const rect = fab.getBoundingClientRect();
      console.log('[TRACKING_LAYOUT] ManualTripFAB position:', { bottom: rect.bottom, right: rect.right });
    }
  }, [mode, isActive]);

  const isVisible = tracking.hudState !== 'expanded' && !postTripActionSheet.isOpen && !isFaturamentoPage;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "fixed z-[100] manual-trip-fab",
            !isMobile && "hidden",
            "bottom-[calc(10.5rem+env(safe-area-inset-bottom))] right-6"
          )}
        >
          <motion.button
            key={mode}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: isQuickActionPulse ? 1.15 : 1,
              boxShadow: isQuickActionPulse ? "0 0 30px rgba(16, 185, 129, 0.6)" : undefined
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.94 }}
            onPanEnd={handlePan}
            onContextMenu={handleLongPress}
            onClick={handleAction}
            disabled={isSaving}
            className={cn(
              "rounded-full flex items-center justify-center transition-all duration-700 relative overflow-hidden",
              "shadow-2xl border border-white/5 backdrop-blur-2xl",
              isActive ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10 sm:w-12 sm:h-12",
              getFABStyle()
            )}
          >
            {/* Quick Action Pulse Ring */}
            <AnimatePresence>
              {isQuickActionPulse && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-white/30 z-0"
                />
              )}
            </AnimatePresence>

            {/* Refined Premium Glow - Ultra Subtle */}
            <motion.div 
              animate={{ 
                opacity: isActive ? [0.02, 0.05, 0.02] : 0,
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute inset-0 blur-xl",
                mode === 'in_trip' ? "bg-red-400" : 
                mode === 'searching' ? "bg-amber-400" : "bg-emerald-400"
              )}
            />
            
            <div className="relative z-10 flex flex-col items-center">
              {tracking.isProductive ? (
                <>
                  <Square size={isActive ? 14 : 12} fill="currentColor" className="transition-all duration-500" />
                  <span className="text-[6px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">Parar</span>
                </>
              ) : (
                <>
                  <Play size={isActive ? 14 : 12} fill="currentColor" className="ml-0.5 transition-all duration-500" />
                  <span className="text-[6px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">Iniciar</span>
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
                   mode === 'waiting' ? 'Aguardando' :
                   mode === 'transition' ? 'Transição' : 'Ativo'}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                  {tracking.duration > 0 ? formatDuration(tracking.duration) : 'Iniciando...'}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
