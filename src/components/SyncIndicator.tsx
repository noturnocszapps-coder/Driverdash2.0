import React from 'react';
import { useDriverStore } from '../store';
import { Cloud, CloudOff, RefreshCw, CheckCircle } from 'lucide-react';

export const SyncIndicator = () => {
  const { syncStatus, user } = useDriverStore();

  if (!user) return null;

  const statusConfig = {
    idle: { icon: Cloud, text: 'Conectado', color: 'text-blue-400' },
    online: { icon: Cloud, text: 'Online', color: 'text-blue-500' },
    offline: { icon: CloudOff, text: 'Offline', color: 'text-zinc-500' },
    syncing: { icon: RefreshCw, text: 'Sincronizando...', color: 'text-amber-500', animate: 'animate-spin' },
    synced: { icon: CheckCircle, text: 'Sincronizado', color: 'text-emerald-500' },
  };

  const { icon: Icon, text, color, animate } = statusConfig[syncStatus] as any;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider ${color}`}>
      <Icon size={12} className={animate} />
      <span>{text}</span>
    </div>
  );
};
