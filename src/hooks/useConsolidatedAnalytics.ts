import { useMemo } from 'react';
import { useDriverStore } from '../store';
import { consolidateDailyData, ConsolidatedDayData, getBestHourRanges, getEfficiencyTrend, getWaitingZones, isDataMature } from '../utils';
import { eachDayOfInterval, format, parseISO, getDay } from 'date-fns';

export function useConsolidatedAnalytics(startDate: Date, endDate: Date, filter: 'all' | 'manual' | 'imported' = 'all') {
  const { cycles, importedReports, settings, tracking, activeVehicleId } = useDriverStore();

  // 1. Group data by date for O(1) lookup during daily iteration
  // This prevents O(Days * Records) complexity and moves to O(Records + Days)
  const groupedData = useMemo(() => {
    const cyclesByDate: Record<string, any[]> = {};
    const reportsByDate: Record<string, any[]> = {};

    // Filter by active vehicle if selected
    const filteredCycles = activeVehicleId 
      ? cycles.filter(c => c.vehicle_id === activeVehicleId)
      : [];
      
    const filteredReports = activeVehicleId
      ? importedReports.filter(r => r.vehicle_id === activeVehicleId)
      : [];

    filteredCycles.forEach(cycle => {
      try {
        const dateKey = format(parseISO(cycle.start_time), 'yyyy-MM-dd');
        if (!cyclesByDate[dateKey]) cyclesByDate[dateKey] = [];
        cyclesByDate[dateKey].push(cycle);
      } catch (e) {
        // Skip invalid dates
      }
    });

    filteredReports.forEach(report => {
      try {
        const dateKey = format(parseISO(report.period_start), 'yyyy-MM-dd');
        if (!reportsByDate[dateKey]) reportsByDate[dateKey] = [];
        reportsByDate[dateKey].push(report);
      } catch (e) {
        // Skip invalid dates
      }
    });

    return { cyclesByDate, reportsByDate };
  }, [cycles, importedReports, activeVehicleId]);

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
    const activeDays = dailyData.filter(day => day.totalRevenue > 0 || day.totalKm > 0);
    const count = activeDays.length || 1;
    return {
      revenue: totals.totalRevenue / count,
      profit: totals.profit / count,
      km: totals.totalKm / count,
      efficiency: totals.totalKm > 0 ? (totals.rideKm / totals.totalKm) * 100 : 0,
    };
  }, [totals, dailyData]);

  // 6. AI Intelligence Metrics
  const aiIntelligence = useMemo(() => {
    // Group cycles by day of week
    const cyclesByDayOfWeek: Record<number, any[]> = {};
    cycles.forEach(cycle => {
      const day = getDay(parseISO(cycle.start_time));
      if (!cyclesByDayOfWeek[day]) cyclesByDayOfWeek[day] = [];
      cyclesByDayOfWeek[day].push(cycle);
    });

    const bestHourByDay: Record<number, string> = {};
    Object.entries(cyclesByDayOfWeek).forEach(([day, dayCycles]) => {
      const range = getBestHourRanges(dayCycles);
      if (range) bestHourByDay[parseInt(day)] = range;
    });

    // Best and Weakest days
    const dayPerformance = dailyData.reduce((acc, day) => {
      const dayOfWeek = getDay(day.date);
      if (!acc[dayOfWeek]) acc[dayOfWeek] = { revenue: 0, count: 0 };
      acc[dayOfWeek].revenue += day.totalRevenue;
      acc[dayOfWeek].count++;
      return acc;
    }, {} as Record<number, { revenue: number; count: number }>);

    const sortedDays = Object.entries(dayPerformance)
      .map(([day, data]: [string, any]) => ({
        day: parseInt(day),
        avgRevenue: data.revenue / data.count
      }))
      .sort((a, b) => b.avgRevenue - a.avgRevenue);

    const bestDayOfWeek = sortedDays.length > 0 ? sortedDays[0].day : null;
    const weakestDayOfWeek = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1].day : null;

    const activeDaysCount = dailyData.filter(d => d.totalRevenue > 0 || d.totalKm > 0).length || 1;
    const daysWithIdleKm = dailyData.filter(d => d.idleKm > 0).length || 1;
    const daysWithRideKm = dailyData.filter(d => d.rideKm > 0).length || 1;

    const maturity = isDataMature(cycles, dailyData);

    return {
      bestHourByDay,
      bestDayOfWeek,
      weakestDayOfWeek,
      efficiencyTrend: getEfficiencyTrend(dailyData),
      waitingZones: getWaitingZones(cycles),
      avgIdleTimeByDay: dailyData.reduce((acc, day) => acc + day.idleKm, 0) / daysWithIdleKm,
      avgProfitPerKm: totals.totalKm > 0 ? totals.profit / totals.totalKm : 0,
      avgProductiveKm: totals.rideKm / daysWithRideKm,
      maturity
    };
  }, [cycles, dailyData, totals]);

  return { dailyData, totals, platformMix, averages, aiIntelligence };
}
