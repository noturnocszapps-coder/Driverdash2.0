import { useMemo } from 'react';
import { useDriverStore } from '../store';
import { consolidateDailyData, ConsolidatedDayData } from '../utils';
import { eachDayOfInterval } from 'date-fns';

export function useConsolidatedAnalytics(startDate: Date, endDate: Date, filter: 'all' | 'manual' | 'imported' = 'all') {
  const { cycles, importedReports, settings, tracking } = useDriverStore();

  const dailyData = useMemo(() => {
    try {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => consolidateDailyData(day, cycles, importedReports, settings, tracking, filter));
    } catch (error) {
      console.error('[Analytics Hook] Error calculating daily data:', error);
      return [];
    }
  }, [startDate, endDate, cycles, importedReports, settings, tracking, filter]);

  const totals = useMemo(() => {
    return dailyData.reduce((acc, day) => ({
      uber: acc.uber + day.uber,
      noventanove: acc.noventanove + day.noventanove,
      indriver: acc.indriver + day.indriver,
      extra: acc.extra + day.extra,
      totalRevenue: acc.totalRevenue + day.totalRevenue,
      totalKm: acc.totalKm + day.totalKm,
      rideKm: acc.rideKm + day.rideKm,
      idleKm: acc.idleKm + day.idleKm,
      expenses: acc.expenses + day.expenses,
      profit: acc.profit + day.profit,
      manualRevenue: acc.manualRevenue + day.manualRevenue,
      importedTotal: acc.importedTotal + day.importedTotal,
    }), {
      uber: 0,
      noventanove: 0,
      indriver: 0,
      extra: 0,
      totalRevenue: 0,
      totalKm: 0,
      rideKm: 0,
      idleKm: 0,
      expenses: 0,
      profit: 0,
      manualRevenue: 0,
      importedTotal: 0,
    });
  }, [dailyData]);

  const averages = useMemo(() => {
    const count = dailyData.length || 1;
    return {
      revenue: totals.totalRevenue / count,
      profit: totals.profit / count,
      km: totals.totalKm / count,
      efficiency: totals.totalKm > 0 ? (totals.rideKm / totals.totalKm) * 100 : 0,
    };
  }, [totals, dailyData.length]);

  return { dailyData, totals, averages };
}
