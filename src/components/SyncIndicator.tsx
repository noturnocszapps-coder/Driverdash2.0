import React from 'react';
import { useDriverStore } from '../store';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export const SyncIndicator = () => {
  const { syncStatus, syncError, user } = useDriverStore();

  if (!user) return null;

  const statusConfig = {
    idle: { icon: Cloud, text: 'Conectado', color: 'text-blue-500/70' },
    online: { icon: Cloud, text: 'Online', color: 'text-blue-500/70' },
    offline: { icon: CloudOff, text: 'Offline', color: 'text-zinc-500/70' },
    syncing: { icon: RefreshCw, text: 'Sincronizando...', color: 'text-amber-500/70', animate: 'animate-spin' },
    synced: { icon: CheckCircle, text: 'Sincronizado', color: 'text-emerald-600/70 dark:text-emerald-500/60', animate: 'animate-pulse-slow' },
    error: { icon: AlertCircle, text: 'Erro de Sincronia', color: 'text-red-500/70' },
  };

  const status = syncError ? 'error' : syncStatus;
  const { icon: Icon, text, color, animate } = (statusConfig[status as keyof typeof statusConfig] || statusConfig.idle) as any;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-[0.15em] border border-zinc-200 dark:border-zinc-700/50 transition-all duration-300 ${color}`}>
      <Icon size={12} className={animate} />
      <span>{syncError || text}</span>
    </div>
  );
};
