import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Navigation, Clock, Mic } from 'lucide-react';
import { useDriverStore } from '../store';
import { cn, formatDuration } from '../utils';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

export const ManualTripFAB = () => {
  const { tracking, startTrip, endTrip, isSaving, setQuickActionsOpen, settings } = useDriverStore();
  const { listen, isListening } = useVoiceAssistant();
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

  const handlePan = (_: any, info: any) => {
    // Swipe up to open quick actions
    if (info.offset.y < -40) {
      setQuickActionsOpen(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setQuickActionsOpen(true);
    if (navigator.vibrate) navigator.vibrate(30);
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

  if (tracking.hudState === 'expanded') return null;

  return (
    <div className={cn(
      "fixed z-[100] md:hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
      "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-6"
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
          whileTap={{ scale: 0.92 }}
          onPanEnd={handlePan}
          onContextMenu={handleLongPress}
          onClick={handleAction}
          disabled={isSaving}
          className={cn(
            "rounded-full flex items-center justify-center transition-all duration-700 relative overflow-hidden",
            "shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl",
            isActive ? "w-14 h-14 sm:w-16 sm:h-16" : "w-12 h-12 sm:w-14 sm:h-14",
            getFABStyle()
          )}
        >
          {/* Refined Premium Glow - Ultra Subtle */}
          <motion.div 
            animate={{ 
              opacity: isActive ? [0.03, 0.1, 0.03] : 0,
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute inset-0 blur-2xl",
              mode === 'in_trip' ? "bg-red-400" : 
              mode === 'searching' ? "bg-amber-400" : "bg-emerald-400"
            )}
          />
          
          <div className="relative z-10 flex flex-col items-center">
            {tracking.isProductive ? (
              <>
                <Square size={isActive ? 18 : 16} fill="currentColor" className="transition-all duration-500" />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-70">Parar</span>
              </>
            ) : (
              <>
                <Play size={isActive ? 18 : 16} fill="currentColor" className="ml-0.5 transition-all duration-500" />
                <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-70">Iniciar</span>
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

      {/* Voice Assistant Button (FAB context) */}
      {settings.voiceCommandsEnabled && (
        <motion.button
          initial={{ scale: 0, x: 20 }}
          animate={{ scale: 1, x: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={listen}
          className={cn(
            "absolute -left-14 bottom-0 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
            isListening 
              ? "bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
              : "bg-zinc-900/90 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white"
          )}
        >
          <Mic size={20} />
        </motion.button>
      )}

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
    </div>
  );
};
