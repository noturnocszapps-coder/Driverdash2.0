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

export function formatCurrency(value: number, isPrivacyMode: boolean = false) {
  if (isPrivacyMode) return 'R$ ••••';
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

  // Hourly rates
  const startTime = new Date(cycle.start_time).getTime();
  const endTime = cycle.end_time ? new Date(cycle.end_time).getTime() : Date.now();
  const durationHours = (endTime - startTime) / (1000 * 60 * 60);
  
  const grossPerHour = durationHours > 0 ? totalAmount / durationHours : 0;
  const netPerHour = durationHours > 0 ? netAmount / durationHours : 0;

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
    lostRevenue: safeNumber(lostRevenue),
    grossPerHour,
    netPerHour,
    durationHours
  };
}

export function calculateDriverScore(metrics: any) {
  // Score 0-100
  // 4. THRESHOLDS MAIS MATUROS: 15km para score consistente
  const totalKm = safeNumber(metrics.totalKm);
  const isInitial = totalKm < 15;

  if (isInitial) {
    return { 
      score: 0, 
      label: 'Em formação', 
      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
      explanation: totalKm < 5 
        ? 'Coletando dados iniciais. Continue dirigindo para ver sua performance.' 
        : 'Dados em formação. Dirija pelo menos 15km para um score preciso.'
    };
  }

  // efficiency (60%), profit per km (40%)
  const efficiencyScore = Math.min(100, (metrics.efficiencyPercentage || 0));
  const profitScore = Math.min(100, (metrics.profitPerKm || 0) * 20); // R$ 5/km = 100 points
  
  const score = Math.round((efficiencyScore * 0.6) + (profitScore * 0.4));
  
  let label = 'Baixo';
  let color = 'text-red-500 bg-red-500/10 border-red-500/20';
  let explanation = 'Sua eficiência está baixa. Tente reduzir o KM ocioso entre as corridas.';
  
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

export function getHotZones(cycles: any[]) {
  const zones: Record<string, { lat: number; lng: number; revenue: number; count: number; label: string }> = {};
  
  cycles.forEach(cycle => {
    if (!cycle.route_points || cycle.route_points.length === 0) return;
    
    // Use the start point of the cycle as the "zone" for that revenue
    const point = cycle.route_points[0];
    const gridLat = Math.round(point.lat * 100) / 100; // Larger grid for hot zones
    const gridLng = Math.round(point.lng * 100) / 100;
    const key = `${gridLat},${gridLng}`;
    
    if (!zones[key]) {
      zones[key] = { 
        lat: gridLat, 
        lng: gridLng, 
        revenue: 0, 
        count: 0, 
        label: getHumanLocation(gridLat, gridLng) 
      };
    }
    zones[key].revenue += safeNumber(cycle.total_amount);
    zones[key].count++;
  });

  return Object.values(zones)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
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

export function getHumanLocation(lat: number, lng: number): string {
  // Fallback humanized names for coordinates
  // In a real app, this would use a geocoding service
  
  // SP Region mapping (simplified)
  if (lat > -23.56 && lat < -23.54 && lng > -46.65 && lng < -46.62) return "Centro / Sé";
  if (lat > -23.60 && lat < -23.56 && lng > -46.70 && lng < -46.65) return "Pinheiros / Itaim";
  if (lat > -23.54 && lat < -23.50 && lng > -46.65 && lng < -46.60) return "Santana / Z. Norte";
  if (lat > -23.65 && lat < -23.60 && lng > -46.70 && lng < -46.60) return "Santo Amaro / Z. Sul";
  if (lat > -23.58 && lat < -23.52 && lng > -46.60 && lng < -46.50) return "Mooca / Tatuapé";
  if (lat > -23.50 && lat < -23.40 && lng > -46.80 && lng < -46.70) return "Osasco / Região";
  if (lat > -23.70 && lat < -23.60 && lng > -46.60 && lng < -46.50) return "SBC / ABC";
  
  // Deterministic fallback for other areas
  const regionId = Math.abs(Math.floor(lat * 100 + lng * 100)) % 8 + 1;
  const sectors = ["Norte", "Sul", "Leste", "Oeste", "Centro-Expandido", "Periferia", "Industrial", "Residencial"];
  
  return `Setor ${sectors[regionId - 1]} — Área ${regionId}`;
}

export function isDataMature(cycles: any[], dailyData: any[]) {
  const activeDays = dailyData.filter(d => d.totalRevenue > 0 || d.totalKm > 0).length;
  const totalKm = dailyData.reduce((acc, d) => acc + d.totalKm, 0);
  
  // 4. THRESHOLDS MAIS MATUROS (15km e 2 ciclos para score)
  const isMature = activeDays >= 3 && totalKm >= 15;
  
  return {
    isMature,
    activeDays,
    totalKm,
    status: totalKm < 5 ? 'coletando' : (totalKm < 15 ? 'em_formacao' : 'maturo'),
    message: totalKm < 5 
      ? "Coletando dados iniciais..." 
      : (totalKm < 15 ? "Dados em formação (mínimo 15km)" : "Dados consolidados")
  };
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

  // 5. CONSOLIDAÇÃO DIÁRIA MAIS PRECISA (Prioridade: Tracking > Manual > Imported)
  
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
    // Prioridade para faturamento manual se existir, senão importado
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

  // Distances (Sum from filtered cycles + live tracking if applicable)
  const isTrackingActive = tracking?.isActive && isSameDay(new Date(), date);
  
  // 5. PRIORIDADE TRACKING PARA KM
  // Se temos tracking (ciclos com tracked_km), usamos eles.
  // Senão, usamos os campos ride_km/displacement_km que podem ser manuais.
  
  const filteredCycles = filter === 'manual' 
    ? manualCycles 
    : (filter === 'imported' ? dayCycles.filter(c => !!c.imported_report_id) : dayCycles);

  let rideKm = 0;
  let idleKm = 0;

  filteredCycles.forEach(c => {
    // Se o ciclo tem dados de tracking precisos, usa eles
    if (c.productive_km !== undefined || c.idle_km !== undefined) {
      rideKm += safeNumber(c.productive_km || c.ride_km);
      idleKm += safeNumber(c.idle_km || c.displacement_km);
    } else {
      rideKm += safeNumber(c.ride_km);
      idleKm += safeNumber(c.displacement_km);
    }
  });

  // Only add live tracking if filter is 'all' or 'manual'
  if (isTrackingActive && (filter === 'all' || filter === 'manual')) {
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


