import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'full' | 'icon' | 'premium';
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ 
  className, 
  variant = 'full' 
}) => {
  const { isInstallable, isStandalone, installApp } = usePWA();

  // If already in PWA mode or not installable, don't show anything
  if (isStandalone || !isInstallable) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      // Potentially show a toast or celebration
    }
  };

  if (variant === 'premium') {
    return (
      <button 
        onClick={handleInstall}
        className={cn(
          "w-full flex items-center justify-between p-5 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-zinc-950 font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all group overflow-hidden relative",
          className
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm uppercase tracking-tight">Instalar Aplicativo</span>
            <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Experiência Native</span>
          </div>
        </div>
        <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-950/20 flex items-center justify-center">
          <Download className="w-5 h-5" />
        </div>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleInstall}
        className={cn(
          "w-10 h-10 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all",
          className
        )}
        title="Instalar App"
      >
        <Download size={18} />
      </button>
    );
  }

  return (
    <button 
      onClick={handleInstall}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all border border-transparent dark:border-white/5",
        className
      )}
    >
      <Smartphone size={20} className="text-emerald-500" />
      <div className="flex flex-col items-start leading-none">
        <span className="text-sm">Instalar DriverDash</span>
        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Versão Mobile</span>
      </div>
    </button>
  );
};
