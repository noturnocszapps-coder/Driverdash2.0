import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSameDay, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined || isNaN(Number(value)) || !isFinite(Number(value))) {
    return fallback;
  }
  return Number(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatKm(value: number) {
  return `${value.toLocaleString('pt-BR')} km`;
}

export function calculateMonthlyFixedCost(fixedCosts?: any) {
  if (!fixedCosts) return 0;
  if (fixedCosts.vehicleType === 'owned') {
    return safeNumber(fixedCosts.insurance) +
           safeNumber(fixedCosts.ipva) +
           safeNumber(fixedCosts.oilChange) +
           safeNumber(fixedCosts.tires) +
           safeNumber(fixedCosts.maintenance) +
           safeNumber(fixedCosts.financing);
  } else {
    const value = safeNumber(fixedCosts.rentalValue);
    return fixedCosts.rentalPeriod === 'weekly' ? value * 4.33 : value;
  }
}

export function calculateDailyFixedCost(fixedCosts?: any) {
  return safeNumber(calculateMonthlyFixedCost(fixedCosts) / 30);
}

export function calculateOperationalCost(cycle: any, settings: any) {
  const fixedCosts = cycle.vehicle_snapshot?.fixedCosts || settings.fixedCosts;
  const dailyFixed = calculateDailyFixedCost(fixedCosts);
  const cycleExpenses = safeNumber(cycle.total_expenses);
  
  // Total cost = Daily fixed + specific cycle expenses (fuel, food, etc.)
  return dailyFixed + cycleExpenses;
}

export function calculateEfficiencyMetrics(cycle: any, settings: any) {
  const totalAmount = safeNumber(cycle.total_amount);
  // Use consolidated KM fields as single source of truth
  const rideKm = safeNumber(cycle.ride_km);
  const idleKm = safeNumber(cycle.displacement_km);
  const totalKm = rideKm + idleKm;
  
  const totalCost = calculateOperationalCost(cycle, settings);
  
  const grossPerKm = totalKm > 0 ? totalAmount / totalKm : 0;
  const netAmount = totalAmount - totalCost;
  const netPerKm = totalKm > 0 ? netAmount / totalKm : 0;
  // Real profit per km should be based on productive (ride) km, only if total km is non-zero
  const profitPerKm = (rideKm > 0 && totalKm > 0) ? netAmount / rideKm : 0;
  const efficiencyPercentage = totalKm > 0 ? (rideKm / totalKm) * 100 : 0;

  // AJUSTE 4: Dinheiro Perdido
  // Se ganho R$ X por KM produtivo, cada KM ocioso é R$ X que deixei de ganhar
  const avgRevenuePerProductiveKm = rideKm > 0 ? totalAmount / rideKm : 0;
  const lostRevenue = idleKm * avgRevenuePerProductiveKm;

  return {
    totalCost,
    grossPerKm,
    netAmount,
    netPerKm,
    profitPerKm,
    efficiencyPercentage,
    lostRevenue: safeNumber(lostRevenue)
  };
}

export function calculateDriverScore(metrics: any) {
  // Score 0-100
  // efficiency (60%), profit per km (40%)
  const efficiencyScore = Math.min(100, (metrics.efficiencyPercentage || 0));
  const profitScore = Math.min(100, (metrics.profitPerKm || 0) * 20); // R$ 5/km = 100 points
  
  const score = Math.round((efficiencyScore * 0.6) + (profitScore * 0.4));
  
  let label = 'Baixo';
  let color = 'text-red-500 bg-red-500/10 border-red-500/20';
  let explanation = 'Sua eficiência está baixa. Tente reduzir o KM ocioso entre as corridas.';
  
  // AJUSTE 5: Se não tem dados suficientes, score é neutro/em formação
  const isInitial = !metrics.totalKm || metrics.totalKm < 10;

  if (isInitial) {
    return { 
      score: 0, 
      label: 'Em formação', 
      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
      explanation: 'Dirija pelo menos 10km para começar a calcular seu score de performance.'
    };
  }

  if (score >= 85) {
    label = 'Excelente';
    color = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    explanation = 'Parabéns! Você está operando com máxima eficiência e ótima margem de lucro.';
  } else if (score >= 70) {
    label = 'Bom';
    color = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    explanation = 'Bom desempenho. Continue focando em corridas com melhor valor por KM.';
  } else if (score >= 50) {
    label = 'Médio';
    color = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    explanation = 'Desempenho regular. Há espaço para melhorar o posicionamento estratégico.';
  }
  
  return { score, label, color, explanation };
}

export function getBestHourRanges(cycles: any[]) {
  const hourCounts: Record<number, { count: number; revenue: number }> = {};
  
  cycles.forEach(cycle => {
    const start = new Date(cycle.start_time);
    const hour = start.getHours();
    if (!hourCounts[hour]) hourCounts[hour] = { count: 0, revenue: 0 };
    hourCounts[hour].count++;
    hourCounts[hour].revenue += (cycle.total_amount || 0);
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgRevenue: data.revenue / data.count,
      count: data.count
    }))
    .sort((a, b) => b.avgRevenue - a.avgRevenue);

  if (sortedHours.length === 0) return null;

  const best = sortedHours[0].hour;
  const range = `${best}:00 - ${best + 2}:00`;
  return range;
}

export function getEfficiencyTrend(dailyData: any[]) {
  if (dailyData.length < 2) return 0;
  
  const recent = dailyData.slice(-3);
  const previous = dailyData.slice(-6, -3);
  
  const avgRecent = recent.reduce((acc, d) => acc + d.efficiency, 0) / (recent.length || 1);
  const avgPrevious = previous.reduce((acc, d) => acc + d.efficiency, 0) / (previous.length || 1);
  
  if (avgPrevious === 0) return 0;
  return ((avgRecent - avgPrevious) / avgPrevious) * 100;
}

export function getWaitingZones(cycles: any[]) {
  const zones: Record<string, { lat: number; lng: number; time: number; count: number; type: 'idle' | 'productive' }> = {};
  
  cycles.forEach(cycle => {
    if (!cycle.route_points) return;
    
    cycle.route_points.forEach((point: any, idx: number) => {
      if (idx === 0) return;
      const prev = cycle.route_points[idx - 1];
      const timeDiff = point.timestamp - prev.timestamp;
      
      // If stopped for more than 2 minutes
      if (timeDiff > 120000 && timeDiff < 1800000) { // 2min to 30min
        const gridLat = Math.round(point.lat * 1000) / 1000;
        const gridLng = Math.round(point.lng * 1000) / 1000;
        const key = `${gridLat},${gridLng}`;
        
        if (!zones[key]) {
          zones[key] = { lat: gridLat, lng: gridLng, time: 0, count: 0, type: point.isProductive ? 'productive' : 'idle' };
        }
        zones[key].time += timeDiff;
        zones[key].count++;
        // If it was productive at least once, mark as productive zone (potential pickup)
        if (point.isProductive) zones[key].type = 'productive';
      }
    });
  });

  return Object.values(zones)
    .sort((a, b) => b.time - a.time)
    .slice(0, 5); // Return top 5
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));

  const h = hours > 0 ? `${hours}h ` : '';
  const m = minutes > 0 ? `${minutes}m ` : '';
  const s = seconds > 0 ? `${seconds}s` : '0s';

  return `${h}${m}${s}`.trim();
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export interface ConsolidatedDayData {
  date: Date;
  uber: number;
  noventanove: number;
  indriver: number;
  extra: number;
  totalRevenue: number;
  totalKm: number;
  rideKm: number;
  idleKm: number;
  expenses: number;
  profit: number;
  efficiency: number;
  hasMismatch: boolean;
  isTrackingActive: boolean;
  manualRevenue: number;
  importedTotal: number;
}

export function consolidateDailyData(
  date: Date,
  cycles: any[],
  importedReports: any[],
  settings: any,
  tracking?: any,
  filter: 'all' | 'manual' | 'imported' = 'all'
): ConsolidatedDayData {
  const dayCycles = cycles.filter(c => isSameDay(parseISO(c.start_time), date));
  const dayImportedReports = importedReports.filter(r => 
    r.report_type === 'daily' && isSameDay(parseISO(r.period_start), date)
  );

  // Manual Values (excluding those created from imports to avoid double counting)
  const manualCycles = dayCycles.filter(c => !c.imported_report_id);
  
  const manualUber = manualCycles.reduce((acc, c) => acc + safeNumber(c.uber_amount), 0);
  const manual99 = manualCycles.reduce((acc, c) => acc + safeNumber(c.noventanove_amount), 0);
  const manualInDriver = manualCycles.reduce((acc, c) => acc + safeNumber(c.indriver_amount), 0);
  const manualExtra = manualCycles.reduce((acc, c) => acc + safeNumber(c.extra_amount), 0);
  const manualRevenue = manualCycles.reduce((acc, c) => acc + safeNumber(c.total_amount), 0);
  
  // Imported Values
  const importedUber = dayImportedReports.filter(r => r.platform === 'Uber').reduce((acc, r) => acc + safeNumber(r.total_earnings), 0);
  const imported99 = dayImportedReports.filter(r => r.platform === '99').reduce((acc, r) => acc + safeNumber(r.total_earnings), 0);
  const importedInDriver = dayImportedReports.filter(r => r.platform === 'inDrive').reduce((acc, r) => acc + safeNumber(r.total_earnings), 0);
  const importedTotal = importedUber + imported99 + importedInDriver;

  // Consolidation logic based on filter
  let uber = 0;
  let noventanove = 0;
  let indriver = 0;
  let extra = 0;

  if (filter === 'all') {
    uber = manualUber > 0 ? manualUber : importedUber;
    noventanove = manual99 > 0 ? manual99 : imported99;
    indriver = manualInDriver > 0 ? manualInDriver : importedInDriver;
    extra = manualExtra;
  } else if (filter === 'manual') {
    uber = manualUber;
    noventanove = manual99;
    indriver = manualInDriver;
    extra = manualExtra;
  } else if (filter === 'imported') {
    uber = importedUber;
    noventanove = imported99;
    indriver = importedInDriver;
    extra = 0;
  }

  const totalRevenue = uber + noventanove + indriver + extra;

  // Distances (Sum from all cycles + live tracking if applicable)
  let rideKm = dayCycles.reduce((acc, c) => acc + safeNumber(c.ride_km), 0);
  let idleKm = dayCycles.reduce((acc, c) => acc + safeNumber(c.displacement_km), 0);

  const isTrackingActive = tracking?.isActive && isSameDay(new Date(), date);
  if (isTrackingActive) {
    rideKm += safeNumber(tracking.productiveDistance);
    idleKm += safeNumber(tracking.idleDistance);
  }

  const totalKm = rideKm + idleKm;

  // Expenses
  const expenses = dayCycles.reduce((acc, c) => acc + calculateOperationalCost(c, settings), 0);
  const profit = totalRevenue - expenses;
  const efficiency = totalKm > 0 ? (rideKm / totalKm) * 100 : 0;
  const hasMismatch = manualRevenue > 0 && importedTotal > 0 && Math.abs(manualRevenue - importedTotal) > 5;

  return {
    date,
    uber,
    noventanove,
    indriver,
    extra,
    totalRevenue,
    totalKm,
    rideKm,
    idleKm,
    expenses,
    profit,
    efficiency,
    hasMismatch,
    isTrackingActive,
    manualRevenue,
    importedTotal
  };
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: 'idle' | 'productive';
  duration: number;
  count: number;
}

export function generateHeatmapData(cycles: any[]): HeatmapPoint[] {
  const grid: Record<string, { 
    lat: number; 
    lng: number; 
    idleTime: number; 
    productiveTime: number; 
    count: number;
    ridesStarted: number;
  }> = {};

  const PRECISION = 4; // ~11m grid

  cycles.forEach(cycle => {
    if (!cycle.route_points || cycle.route_points.length < 2) return;

    cycle.route_points.forEach((point: any, idx: number) => {
      const lat = parseFloat(point.lat.toFixed(PRECISION));
      const lng = parseFloat(point.lng.toFixed(PRECISION));
      const key = `${lat}_${lng}`;

      if (!grid[key]) {
        grid[key] = { lat, lng, idleTime: 0, productiveTime: 0, count: 0, ridesStarted: 0 };
      }

      grid[key].count++;

      // Time calculation
      if (idx > 0) {
        const prev = cycle.route_points[idx - 1];
        const duration = point.timestamp - prev.timestamp;
        
        // If duration is too long (e.g., > 1 hour), skip (likely a gap)
        if (duration > 0 && duration < 3600000) {
          if (point.isProductive) {
            grid[key].productiveTime += duration;
          } else {
            grid[key].idleTime += duration;
          }
        }

        // Detect ride start (isProductive toggle)
        if (point.isProductive && !prev.isProductive) {
          grid[key].ridesStarted++;
        }
      }
    });
  });

  return Object.values(grid).map(cell => {
    const isProductive = cell.productiveTime > cell.idleTime || cell.ridesStarted > 0;
    
    // Intensity calculation
    // Base intensity on duration (minutes) and count
    const durationMinutes = (cell.idleTime + cell.productiveTime) / 60000;
    let intensity = Math.min(1, (durationMinutes / 30) + (cell.count / 100) + (cell.ridesStarted / 2));

    return {
      lat: cell.lat,
      lng: cell.lng,
      intensity,
      type: (isProductive ? 'productive' : 'idle') as 'idle' | 'productive',
      duration: cell.idleTime + cell.productiveTime,
      count: cell.count
    };
  }).filter(p => p.intensity > 0.05);
}
