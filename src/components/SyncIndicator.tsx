import React from 'react';
import { useDriverStore } from '../store';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export const SyncIndicator = () => {
  const { syncStatus, syncError, syncData, user } = useDriverStore();

  if (!user) return null;

  const statusConfig = {
    idle: { icon: Cloud, text: 'Conectado', color: 'text-blue-500/70' },
    online: { icon: Cloud, text: 'Online', color: 'text-blue-500/70' },
    offline: { icon: CloudOff, text: 'Offline', color: 'text-zinc-500/70' },
    syncing: { icon: RefreshCw, text: 'Sincronizando...', color: 'text-amber-500/70', animate: 'animate-spin' },
    synced: { icon: CheckCircle, text: 'Sincronizado', color: 'text-emerald-600/70 dark:text-emerald-500/60', animate: 'animate-pulse-slow' },
    error: { icon: AlertCircle, text: 'Erro de Sincronia', color: 'text-red-500/70' },
    partial_error: { icon: AlertCircle, text: 'Sincronia Parcial', color: 'text-amber-600/70' },
  };

  const status = syncStatus;
  const { icon: Icon, text, color, animate } = (statusConfig[status as keyof typeof statusConfig] || statusConfig.idle) as any;

  const getTooltip = () => {
    if (syncError) return syncError;
    return text;
  };

  return (
    <div 
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-[0.15em] border border-zinc-200 dark:border-zinc-700/50 transition-all duration-300 ${color}`}
      title={getTooltip()}
    >
      <Icon size={12} className={animate} />
      <span className="truncate max-w-[120px] sm:max-w-none">
        {syncError || text}
      </span>
      {(status === 'error' || status === 'partial_error') && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            syncData();
          }}
          className="ml-0.5 p-0.5 hover:bg-red-500/10 rounded-md transition-colors"
          title="Tentar novamente"
        >
          <RefreshCw size={10} />
        </button>
      )}
    </div>
  );
};
