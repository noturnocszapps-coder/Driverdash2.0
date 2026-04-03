import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card } from './UI';

export const OfflineFallback = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-8"
      >
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            <WifiOff size={64} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-white tracking-tighter">Você está offline</h1>
          <p className="text-sm font-bold text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Parece que você perdeu a conexão com a internet. Verifique seu sinal para continuar usando o DriverDash Beta.
          </p>
        </div>

        <Card className="p-6 bg-zinc-900 border-zinc-800 rounded-3xl">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 leading-relaxed">
            Algumas funcionalidades podem não estar disponíveis sem conexão.
          </p>
          <Button 
            variant="primary" 
            className="w-full h-14 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest"
            onClick={handleReload}
          >
            <RefreshCw size={18} />
            Tentar Novamente
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
