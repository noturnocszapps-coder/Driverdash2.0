import React, { useState, useEffect } from 'react';
import { useDriverStore } from '../store';
import { AlertCircle, RefreshCw, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DeletionErrorBanner: React.FC = () => {
  const { deletionRetries, retryDeletion } = useDriverStore();
  const [isResolving, setIsResolving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Only show after 2 failed attempts (count >= 1)
  const activeRetries = Object.entries(deletionRetries).filter(
    ([_, meta]) => meta.count >= 1
  );

  // Track if we had active retries to trigger success transition
  useEffect(() => {
    if (activeRetries.length > 0) {
      setIsResolving(true);
    } else if (isResolving && !showSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setIsResolving(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeRetries.length, isResolving, showSuccess]);

  if (activeRetries.length === 0 && !showSuccess) return null;

  const hasPermanentFail = activeRetries.some(([_, meta]) => meta.status === 'failed');
  const isMultiple = activeRetries.length > 1;

  const handleRetryAll = () => {
    activeRetries.forEach(([id]) => {
      retryDeletion(id);
    });
  };

  const handleDismissAll = () => {
    useDriverStore.setState(state => {
      const newRetries = { ...state.deletionRetries };
      let newPendingDeletions = [...state.pendingDeletionIds];
      
      activeRetries.forEach(([id]) => {
        delete newRetries[id];
        newPendingDeletions = newPendingDeletions.filter(pid => pid !== id);
      });

      return {
        deletionRetries: newRetries,
        pendingDeletionIds: newPendingDeletions
      };
    });
    setIsResolving(false);
    setShowSuccess(false);
  };

  // Language selection
  const title = showSuccess
    ? "Exclusão concluída com sucesso"
    : isMultiple 
      ? "Alguns itens não puderam ser sincronizados" 
      : hasPermanentFail 
        ? "Não conseguimos concluir automaticamente."
        : "Estamos tentando concluir a exclusão...";

  const subtitle = showSuccess
    ? "Dados sincronizados com o servidor"
    : hasPermanentFail 
      ? "Toque para tentar novamente."
      : "Isso pode levar alguns instantes.";

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`bg-zinc-950/90 backdrop-blur-2xl border ${showSuccess ? 'border-emerald-500/30' : 'border-white/10'} p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-4 pointer-events-auto`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl transition-colors duration-500 ${showSuccess ? 'bg-emerald-500/10' : hasPermanentFail ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
              {showSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : hasPermanentFail ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">
                {title}
              </p>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-black mt-1 transition-colors duration-500 ${showSuccess ? 'text-emerald-500/70' : 'text-zinc-500'}`}>
                {subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!showSuccess && (
              <>
                <button
                  onClick={handleRetryAll}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resolver agora
                </button>
                <button
                  onClick={handleDismissAll}
                  className="p-3.5 hover:bg-white/5 rounded-2xl transition-colors group"
                  title="Dispensar"
                >
                  <X className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </>
            )}
            {showSuccess && (
              <div className="w-12 h-12 flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-20" />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
