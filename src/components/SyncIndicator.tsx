import React from 'react';
import { useDriverStore } from '../store';
import { CheckCircle2, RotateCw, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

export const SyncIndicator: React.FC<{ variant?: 'sidebar' | 'minimal' }> = ({ variant = 'sidebar' }) => {
  const { syncStatus, pendingDeletionIds } = useDriverStore();
  
  const statusConfig = {
    idle: { label: 'Tudo sincronizado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', animate: false },
    online: { label: 'Tudo sincronizado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', animate: false },
    synced: { label: 'Tudo sincronizado', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', animate: false },
    syncing: { label: 'Sincronizando...', icon: RotateCw, color: 'text-zinc-400', bg: 'bg-zinc-500/10', animate: true },
    retrying: { label: 'Ajustando dados...', icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/10', animate: true },
    offline: { label: 'Modo Offline', icon: Smartphone, color: 'text-zinc-500', bg: 'bg-zinc-500/10', animate: false },
    error: { label: 'Aguardando conexão', icon: AlertCircle, color: 'text-zinc-400', bg: 'bg-zinc-500/10', animate: false },
    partial_error: { label: 'Ajustando dados...', icon: RotateCw, color: 'text-zinc-400', bg: 'bg-zinc-500/10', animate: true },
  };

  const current = statusConfig[syncStatus as keyof typeof statusConfig] || statusConfig.idle;
  const Icon = current.icon;
  const activeSyncCount = pendingDeletionIds.length;

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/5 shadow-sm">
        <Icon className={cn("w-3 h-3", current.color, current.animate && "animate-spin")} />
        <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] leading-none", current.color)}>
          {activeSyncCount > 0 ? `${activeSyncCount} syncing` : current.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 transition-all duration-500">
        <div className={cn("p-2 rounded-xl shrink-0 transition-colors duration-500", current.bg)}>
          <Icon className={cn("w-4 h-4 transition-colors duration-500", current.color, current.animate && "animate-spin")} />
        </div>
        
        <div className="flex flex-col overflow-hidden">
          <span className={cn("text-[10px] font-black uppercase tracking-[0.1em] leading-tight transition-colors duration-500", current.color)}>
            {current.label}
          </span>
          <span className="text-[9px] text-zinc-500 font-bold leading-tight mt-0.5 whitespace-nowrap">
            {activeSyncCount > 0 
              ? `${activeSyncCount} ${activeSyncCount === 1 ? 'item sendo sincronizado' : 'itens sendo sincronizados'}`
              : 'Nenhuma ação pendente'
            }
          </span>
        </div>
      </div>
    </div>
  );
};
