import React, { useState } from 'react';
import { useDriverStore } from '../store';
import { FinancialEntry } from '../types';
import { formatCurrency, safeNumber } from '../utils';
import { formatTimeBR } from '../lib/date-utils';
import { Edit2, Trash2, Zap, Navigation, Circle, Plus, MoreVertical } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { QuickEntryModal } from './QuickEntryModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./UI";

export const FinancialEntryList = () => {
  const { financialEntries, cycles, deleteFinancialEntry, settings } = useDriverStore();
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);

  const openCycle = cycles.find(c => c.status === 'open');
  
  // Filter entries for the current open cycle
  const currentEntries = financialEntries
    .filter(entry => entry.cycle_id === openCycle?.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!openCycle || currentEntries.length === 0) {
    return null;
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'uber': return <Navigation size={14} className="rotate-45" />;
      case 'noventanove': return <Circle size={14} fill="currentColor" />;
      case 'indriver': return <Zap size={14} />;
      default: return <Plus size={14} />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'uber': return 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900';
      case 'noventanove': return 'bg-yellow-500 text-white';
      case 'indriver': return 'bg-emerald-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'uber': return 'Uber';
      case 'noventanove': return '99';
      case 'indriver': return 'inDrive';
      default: return 'Extra';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Lançamentos do Ciclo
        </h3>
        <span className="text-[10px] font-bold text-zinc-400">
          {currentEntries.length} {currentEntries.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {currentEntries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                  getPlatformColor(entry.platform)
                )}>
                  {getPlatformIcon(entry.platform)}
                </div>
                
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black tracking-tight">
                      {getPlatformLabel(entry.platform)}
                    </p>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      • {formatTimeBR(entry.timestamp)}
                    </span>
                  </div>
                  {entry.origin && (
                    <p className="text-[10px] font-medium text-zinc-500 italic">
                      {entry.origin}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-base font-black tracking-tighter">
                  {formatCurrency(safeNumber(entry.value), settings.isPrivacyMode)}
                </p>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem 
                      onClick={() => setEditingEntry(entry)}
                      className="gap-2 font-bold text-xs uppercase tracking-widest"
                    >
                      <Edit2 size={14} />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteFinancialEntry(entry.id)}
                      className="gap-2 font-bold text-xs uppercase tracking-widest text-red-500 focus:text-red-500"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {editingEntry && (
        <QuickEntryModal 
          isOpen={!!editingEntry} 
          onClose={() => setEditingEntry(null)} 
          editEntry={editingEntry}
        />
      )}
    </div>
  );
};
