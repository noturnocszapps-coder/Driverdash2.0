import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './components/UI';

export const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <RefreshCw size={20} className={needRefresh ? 'animate-spin' : ''} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-black text-white">
                  {offlineReady ? 'App pronto para uso offline' : 'Nova versão disponível'}
                </p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {offlineReady ? 'DriverDash está pronto' : 'Clique para atualizar agora'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {needRefresh && (
                <Button
                  size="sm"
                  variant="primary"
                  className="h-9 px-4 text-[10px] font-black uppercase"
                  onClick={() => updateServiceWorker(true)}
                >
                  Atualizar
                </Button>
              )}
              <button
                onClick={close}
                className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
