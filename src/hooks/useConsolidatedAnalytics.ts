import { useMemo } from 'react';
import { useDriverStore } from '../store';
import { consolidateDailyData, ConsolidatedDayData } from '../utils';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export function useConsolidatedAnalytics(startDate: Date, endDate: Date, filter: 'all' | 'manual' | 'imported' = 'all') {
  const { cycles, importedReports, settings, tracking } = useDriverStore();

  // 1. Group data by date for O(1) lookup during daily iteration
  // This prevents O(Days * Records) complexity and moves to O(Records + Days)
  const groupedData = useMemo(() => {
    const cyclesByDate: Record<string, any[]> = {};
    const reportsByDate: Record<string, any[]> = {};

    cycles.forEach(cycle => {
      try {
        const dateKey = format(parseISO(cycle.start_time), 'yyyy-MM-dd');
        if (!cyclesByDate[dateKey]) cyclesByDate[dateKey] = [];
        cyclesByDate[dateKey].push(cycle);
      } catch (e) {
        // Skip invalid dates
      }
    });

    importedReports.forEach(report => {
      try {
        const dateKey = format(parseISO(report.period_start), 'yyyy-MM-dd');
        if (!reportsByDate[dateKey]) reportsByDate[dateKey] = [];
        reportsByDate[dateKey].push(report);
      } catch (e) {
        // Skip invalid dates
      }
    });

    return { cyclesByDate, reportsByDate };
  }, [cycles, importedReports]);

  // 2. Daily Aggregation
  // Memoized daily data points
  const dailyData = useMemo(() => {
    try {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayCycles = groupedData.cyclesByDate[dateKey] || [];
        const dayReports = groupedData.reportsByDate[dateKey] || [];
        
        return consolidateDailyData(
          day, 
          dayCycles, 
          dayReports, 
          settings, 
          tracking, 
          filter
        );
      });
    } catch (error) {
      console.error('[Analytics Hook] Error calculating daily data:', error);
      return [];
    }
  }, [startDate, endDate, groupedData, settings, tracking, filter]);

  // 3. Weekly/Interval Aggregation (Totals)
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

  // 4. Platform Mix Aggregation
  const platformMix = useMemo(() => {
    const total = totals.totalRevenue || 1;
    return {
      uber: { value: totals.uber, percentage: (totals.uber / total) * 100 },
      noventanove: { value: totals.noventanove, percentage: (totals.noventanove / total) * 100 },
      indriver: { value: totals.indriver, percentage: (totals.indriver / total) * 100 },
      extra: { value: totals.extra, percentage: (totals.extra / total) * 100 },
    };
  }, [totals]);

  // 5. Performance Averages
  const averages = useMemo(() => {
    const count = dailyData.length || 1;
    return {
      revenue: totals.totalRevenue / count,
      profit: totals.profit / count,
      km: totals.totalKm / count,
      efficiency: totals.totalKm > 0 ? (totals.rideKm / totals.totalKm) * 100 : 0,
    };
  }, [totals, dailyData.length]);

  return { dailyData, totals, platformMix, averages };
}
