import React from 'react';
import { useDriverStore } from '../store';
import { CheckCircle2, RotateCw, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

export const SyncIndicator: React.FC<{ variant?: 'sidebar' | 'minimal' }> = ({ variant = 'sidebar' }) => {
  const { syncStatus, pendingDeletionIds, cycles } = useDriverStore();
  
  const hasErrors = cycles.some(c => c.has_error);
  const isPending = pendingDeletionIds.length > 0 || syncStatus === 'syncing' || syncStatus === 'retrying';

  // Compute actual health status for UI display
  const isOffline = syncStatus === 'offline';
  const effectiveStatus = hasErrors ? 'attention' : isOffline ? 'offline' : isPending ? 'pending' : 'healthy';

  const statusConfig = {
    healthy: { label: 'Tudo Sincronizado', icon: CheckCircle2, color: 'text-emerald-500', animate: false },
    pending: { label: 'Sincronizando...', icon: RefreshCw, color: 'text-amber-500', animate: true },
    attention: { label: 'Erro na Sinc.', icon: AlertCircle, color: 'text-red-500', animate: false },
    offline: { label: 'Modo Offline', icon: Smartphone, color: 'text-amber-500', animate: false },
  };

  const current = statusConfig[effectiveStatus] || statusConfig.healthy;
  const Icon = current.icon;
  const activeSyncCount = pendingDeletionIds.length;

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1.5 py-0.5 relative bg-transparent border-none shadow-none">
        <Icon className={cn("w-2.5 h-2.5", current.color, current.animate && "animate-spin")} />
        <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] leading-none", current.color)}>
          {activeSyncCount > 0 ? `${activeSyncCount} PENDENTE(S)` : current.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 relative bg-transparent border-none shadow-none">
      <div className="flex items-center gap-3 py-2 px-1 bg-transparent border-none shadow-none">
        <div className="shrink-0 bg-transparent border-none shadow-none">
          <Icon className={cn("w-4 h-4 transition-colors duration-500", current.color, current.animate && "animate-spin")} />
        </div>
        
        <div className="flex flex-col overflow-hidden bg-transparent">
          <span className={cn("text-[10px] font-black uppercase tracking-[0.1em] leading-tight transition-colors duration-500", current.color)}>
            {current.label}
          </span>
          <span className="text-[9px] text-zinc-500 font-bold leading-tight mt-0.5 whitespace-nowrap">
            {hasErrors 
              ? 'Existem ciclos com inconsistências'
              : activeSyncCount > 0 
                ? `${activeSyncCount} ${activeSyncCount === 1 ? 'item sendo sincronizado' : 'itens sendo sincronizados'}`
                : 'Nenhuma ação pendente'
            }
          </span>
        </div>
      </div>
    </div>
  );
};
