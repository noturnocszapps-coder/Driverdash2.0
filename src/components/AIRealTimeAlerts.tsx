import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Clock, TrendingDown, X, Sparkles } from 'lucide-react';
import { useDriverStore } from '../store';
import { getDay } from 'date-fns';
import { cn } from '../utils';

interface Alert {
  id: string;
  type: 'idle' | 'efficiency' | 'opportunity';
  message: string;
  icon: React.ReactNode;
  color: string;
}

interface AIRealTimeAlertsProps {
  todayData: any;
  aiIntelligence: any;
  averages: any;
}

export const AIRealTimeAlerts: React.FC<AIRealTimeAlertsProps> = ({ todayData, aiIntelligence, averages }) => {
  const { tracking } = useDriverStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (alert: Omit<Alert, 'id'>) => {
    // Avoid duplicate alerts of the same type if one is already active
    setAlerts(prev => {
      if (prev.some(a => a.type === alert.type)) return prev;
      const id = `${alert.type}-${Date.now()}`;
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        removeAlert(id);
      }, 8000);

      return [...prev, { ...alert, id }];
    });
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    if (!tracking.isActive) {
      if (alerts.length > 0) setAlerts([]);
      return;
    }

    const interval = setInterval(() => {
      // 1. Idle Detection (> 10 minutes)
      if (tracking.lastStopTimestamp) {
        const idleMinutes = (Date.now() - tracking.lastStopTimestamp) / 60000;
        if (idleMinutes >= 10) {
          addAlert({
            type: 'idle',
            message: "Você está há muito tempo parado. Que tal mudar de região para buscar mais chamadas?",
            icon: <Clock size={16} className="text-amber-400" />,
            color: "bg-zinc-900/90 border-amber-500/30 text-zinc-100"
          });
        }
      }

      // 2. Low Efficiency Detection
      // Only check if we have some data today
      if (todayData.totalKm > 5) {
        const currentEfficiency = todayData.efficiency;
        const avgEfficiency = averages.efficiency || 60; 
        if (currentEfficiency < avgEfficiency * 0.7) {
          addAlert({
            type: 'efficiency',
            message: "Seu rendimento está abaixo da sua média normal hoje. Tente otimizar suas rotas.",
            icon: <TrendingDown size={16} className="text-rose-400" />,
            color: "bg-zinc-900/90 border-rose-500/30 text-zinc-100"
          });
        }
      }

      // 3. Good Moment Detection
      const currentHour = new Date().getHours();
      const currentDay = getDay(new Date());
      const bestRange = aiIntelligence.bestHourByDay?.[currentDay];
      
      if (bestRange) {
        try {
          const parts = bestRange.split(' - ');
          const startHour = parseInt(parts[0].split(':')[0]);
          const endHour = parseInt(parts[1].split(':')[0]);
          
          if (currentHour >= startHour && currentHour < endHour) {
            addAlert({
              type: 'opportunity',
              message: "Agora é um excelente horário para rodar segundo seu histórico de faturamento!",
              icon: <Zap size={16} className="text-emerald-400" />,
              color: "bg-zinc-900/90 border-emerald-500/30 text-zinc-100"
            });
          }
        } catch (e) {
          // Silent fail on parse error
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [tracking.isActive, tracking.lastStopTimestamp, todayData.efficiency, aiIntelligence, averages]);

  return (
    <div className="fixed top-20 left-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl",
              alert.color
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              {alert.icon}
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles size={10} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Assistente IA</span>
              </div>
              <p className="text-[11px] font-bold leading-tight">
                {alert.message}
              </p>
            </div>
            <button 
              onClick={() => removeAlert(alert.id)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
            >
              <X size={16} className="opacity-40" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
