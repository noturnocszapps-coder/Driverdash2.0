import React from 'react';
import { Camera, Filter } from 'lucide-react';
import { SyncIndicator } from '../SyncIndicator';
import { cn } from '../../utils';

interface ReportsHeaderProps {
  onImportClick: () => void;
  onFilterClick: () => void;
  filter: 'all' | 'manual' | 'imported';
}

export const ReportsHeader: React.FC<ReportsHeaderProps> = ({ 
  onImportClick, 
  onFilterClick, 
  filter 
}) => {
  return (
    <header className="flex justify-between items-end px-1 pt-2 mb-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
          Relatórios
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Análise de Performance Semanal
        </p>
      </div>
      <div className="flex items-center gap-3 pb-1">
        <SyncIndicator />
        <div className="flex gap-2">
          <button 
            onClick={onImportClick}
            className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
            title="Importar por Print"
          >
            <Camera size={20} />
          </button>
          <button 
            onClick={onFilterClick}
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 border shadow-sm",
              filter !== 'all' 
                ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-emerald-500/20" 
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700/50"
            )}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
