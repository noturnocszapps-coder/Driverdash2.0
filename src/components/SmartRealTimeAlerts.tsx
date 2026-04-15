import React, { useEffect } from 'react';
import { Zap, Clock, TrendingDown, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useDriverStore } from '../store';
import { getDay } from 'date-fns';
import { toast } from 'sonner';

interface SmartRealTimeAlertsProps {
  todayData: any;
  performanceData: any;
  averages: any;
}

export const SmartRealTimeAlerts: React.FC<SmartRealTimeAlertsProps> = ({ todayData, performanceData, averages }) => {
  const { tracking, userLearning } = useDriverStore();

  const showToast = (type: string, message: string, icon: React.ReactNode) => {
    if (userLearning.isSilentMode) return;
    
    // Command-style messages (max 4 words)
    let command = message;
    if (type === 'idle') command = "MOVA-SE AGORA";
    if (type === 'efficiency') command = "OTIMIZE ROTA";
    if (type === 'opportunity') command = "HORÁRIO DE PICO";

    toast(command, {
      id: `smart-alert-${type}`, // Prevent duplicates
      icon: icon,
      duration: 3000,
      position: 'bottom-center',
      className: "mb-32", // Above the FAB
    });

    // Vibration for mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  useEffect(() => {
    if (!tracking.isActive) return;

    const interval = setInterval(() => {
      // 1. Idle Detection (> 10 minutes)
      if (tracking.lastStopTimestamp) {
        const idleMinutes = (Date.now() - tracking.lastStopTimestamp) / 60000;
        if (idleMinutes >= 10) {
          showToast('idle', "Você está há muito tempo parado. Que tal mudar de região?", <Clock size={16} className="text-amber-500" />);
        }
      }

      // 2. Low Efficiency Detection
      if (todayData.totalKm > 5) {
        const currentEfficiency = todayData.efficiency;
        const avgEfficiency = averages.efficiency || 60; 
        if (currentEfficiency < avgEfficiency * 0.7) {
          showToast('efficiency', "Seu rendimento está abaixo da média hoje. Tente otimizar rotas.", <TrendingDown size={16} className="text-rose-500" />);
        }
      }

      // 3. Good Moment Detection
      const currentHour = new Date().getHours();
      const currentDay = getDay(new Date());
      const bestRange = performanceData.bestHourByDay?.[currentDay];
      
      if (bestRange) {
        try {
          const parts = bestRange.split(' - ');
          const startHour = parseInt(parts[0].split(':')[0]);
          const endHour = parseInt(parts[1].split(':')[0]);
          
          if (currentHour >= startHour && currentHour < endHour) {
            showToast('opportunity', "Excelente horário para rodar segundo seu histórico!", <Zap size={16} className="text-emerald-500" />);
          }
        } catch (e) {}
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tracking.isActive, tracking.lastStopTimestamp, todayData.efficiency, performanceData, averages]);

  return null; // Now handled by sonner toasts
};
