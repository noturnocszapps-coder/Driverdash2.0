import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSameDay, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    return (fixedCosts.insurance || 0) +
           (fixedCosts.ipva || 0) +
           (fixedCosts.oilChange || 0) +
           (fixedCosts.tires || 0) +
           (fixedCosts.maintenance || 0) +
           (fixedCosts.financing || 0);
  } else {
    const value = fixedCosts.rentalValue || 0;
    return fixedCosts.rentalPeriod === 'weekly' ? value * 4.33 : value;
  }
}

export function calculateDailyFixedCost(fixedCosts?: any) {
  return calculateMonthlyFixedCost(fixedCosts) / 30;
}

export function calculateOperationalCost(cycle: any, settings: any) {
  const fixedCosts = cycle.vehicle_snapshot?.fixedCosts || settings.fixedCosts;
  const dailyFixed = calculateDailyFixedCost(fixedCosts);
  const cycleExpenses = cycle.total_expenses || 0;
  
  // Total cost = Daily fixed + specific cycle expenses (fuel, food, etc.)
  return dailyFixed + cycleExpenses;
}

export function calculateEfficiencyMetrics(cycle: any, settings: any) {
  const totalAmount = cycle.total_amount || 0;
  // Use consolidated KM fields as single source of truth
  const totalKm = cycle.total_km || 0;
  const rideKm = cycle.ride_km || 0;
  const totalCost = calculateOperationalCost(cycle, settings);
  
  const grossPerKm = totalKm > 0 ? totalAmount / totalKm : 0;
  const netAmount = totalAmount - totalCost;
  const netPerKm = totalKm > 0 ? netAmount / totalKm : 0;
  // Real profit per km should be based on productive (ride) km, only if total km is non-zero
  const profitPerKm = (rideKm > 0 && totalKm > 0) ? netAmount / rideKm : 0;
  const efficiencyPercentage = totalKm > 0 ? (rideKm / totalKm) * 100 : 0;

  return {
    totalCost,
    grossPerKm,
    netAmount,
    netPerKm,
    profitPerKm,
    efficiencyPercentage
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
  
  if (score >= 85) {
    label = 'Excelente';
    color = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  } else if (score >= 70) {
    label = 'Bom';
    color = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  } else if (score >= 50) {
    label = 'Médio';
    color = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  }
  
  return { score, label, color };
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
  
  const manualUber = manualCycles.reduce((acc, c) => acc + (c.uber_amount || 0), 0);
  const manual99 = manualCycles.reduce((acc, c) => acc + (c.noventanove_amount || 0), 0);
  const manualInDriver = manualCycles.reduce((acc, c) => acc + (c.indriver_amount || 0), 0);
  const manualExtra = manualCycles.reduce((acc, c) => acc + (c.extra_amount || 0), 0);
  const manualRevenue = manualCycles.reduce((acc, c) => acc + (c.total_amount || 0), 0);
  
  // Imported Values
  const importedUber = dayImportedReports.filter(r => r.platform === 'Uber').reduce((acc, r) => acc + r.total_earnings, 0);
  const imported99 = dayImportedReports.filter(r => r.platform === '99').reduce((acc, r) => acc + r.total_earnings, 0);
  const importedInDriver = dayImportedReports.filter(r => r.platform === 'inDrive').reduce((acc, r) => acc + r.total_earnings, 0);
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
  let totalKm = dayCycles.reduce((acc, c) => acc + (c.total_km || 0), 0);
  let rideKm = dayCycles.reduce((acc, c) => acc + (c.ride_km || 0), 0);
  let idleKm = dayCycles.reduce((acc, c) => acc + (c.displacement_km || 0), 0);

  const isTrackingActive = tracking?.isActive && isSameDay(new Date(), date);
  if (isTrackingActive) {
    totalKm += tracking.distance;
    rideKm += tracking.productiveDistance;
    idleKm += tracking.idleDistance;
  }

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
