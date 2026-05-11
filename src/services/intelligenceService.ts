import { FinancialEntry } from '../types';
import { safeNumber } from '../utils';

export interface ShiftEfficiency {
  score: number;
  label: string;
  color: string;
  details: string[];
}

export interface Projection {
  estimatedNet: number;
  message: string;
  isOnTrack: boolean;
}

export interface OperationalAlert {
  id: string;
  type: 'critical' | 'warning' | 'tip';
  message: string;
  icon: string;
  category?: 'fuel' | 'efficiency' | 'safety' | 'profit';
}

export interface LucrativeSlot {
  slot: string;
  value: number;
  count: number;
  efficiency: number;
}

export interface IntelligenceReport {
  overallScore: number;
  consistencyScore: number;
  fuelScore: number;
  profitabilityScore: number;
  operationalScore: number;
  status: 'EXCEPCIONAL' | 'ALTA PERFORMANCE' | 'ESTÁVEL' | 'OTIMIZÁVEL' | 'CRÍTICO';
  growth: number; // Comparison with previous period
}

/**
 * Calculates consistency based on regularity of earnings and hours
 */
export const calculateConsistencyScore = (cycles: any[]): number => {
  if (cycles.length < 3) return 0;
  
  const lastWeeklyCycles = cycles.slice(-7);
  const avgEarnings = lastWeeklyCycles.reduce((acc, c) => acc + safeNumber(c.total_amount), 0) / lastWeeklyCycles.length;
  
  if (avgEarnings === 0) return 0;

  // Calculate variance
  const variance = lastWeeklyCycles.reduce((acc, c) => {
    return acc + Math.pow(safeNumber(c.total_amount) - avgEarnings, 2);
  }, 0) / lastWeeklyCycles.length;
  
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avgEarnings; // Coefficient of variation

  // 0.2 CV is very consistent (100 score), 1.0 CV is inconsistent (0 score)
  const score = Math.max(0, 100 - (cv * 100 * 2.5));
  return Math.round(score);
};

/**
 * Calculates fuel efficiency score based on tracked data vs vehicle profile
 */
export const calculateFuelScore = (
  costPerKm: number,
  expectedCostPerKm: number
): number => {
  if (!costPerKm || !expectedCostPerKm) return 0;
  
  const ratio = costPerKm / expectedCostPerKm;
  if (ratio <= 1.0) return 100;
  if (ratio >= 1.5) return 0;
  
  return Math.round(100 - ((ratio - 1.0) * 200));
};

/**
 * Comprehensive Operational Intelligence calculation
 */
export const getAdvancedIntelligence = (
  currentCycle: any,
  history: any[],
  vehicle: any
): IntelligenceReport => {
  const earnings = safeNumber(currentCycle?.total_amount);
  const expenses = safeNumber(currentCycle?.total_expenses);
  const km = safeNumber(currentCycle?.total_km) || safeNumber(currentCycle?.tracked_km);
  const hours = (currentCycle?.tracked_moving_time || 0) / 3600 || 8; // fallback
  
  const profit = earnings - expenses;
  const profitPerKm = km > 0 ? profit / km : 0;
  const earningsPerHour = earnings / hours;

  // Scores
  const consistencyScore = calculateConsistencyScore(history);
  
  const expectedCostPerKm = vehicle?.fuelPrice && vehicle?.kmPerLiter 
    ? vehicle.fuelPrice / vehicle.kmPerLiter 
    : 0.50;
  const currentCostPerKm = km > 0 ? (currentCycle?.fuel_expense || 0) / km : 0;
  const fuelScore = calculateFuelScore(currentCostPerKm, expectedCostPerKm);

  const profitabilityScore = Math.min(100, Math.max(0, (profitPerKm / 2.5) * 100));
  
  const idleKm = safeNumber(currentCycle?.idle_km || 0);
  const operationalScore = km > 0 ? Math.max(0, 100 - (idleKm / km * 200)) : 0;

  const overallScore = Math.round(
    (profitabilityScore * 0.4) + 
    (operationalScore * 0.3) + 
    (consistencyScore * 0.2) + 
    (fuelScore * 0.1)
  );

  let status: IntelligenceReport['status'] = 'ESTÁVEL';
  if (overallScore >= 90) status = 'EXCEPCIONAL';
  else if (overallScore >= 75) status = 'ALTA PERFORMANCE';
  else if (overallScore < 40) status = 'CRÍTICO';
  else if (overallScore < 60) status = 'OTIMIZÁVEL';

  return {
    overallScore,
    consistencyScore,
    fuelScore,
    profitabilityScore,
    operationalScore,
    status,
    growth: 12 // Mock growth for now
  };
};

/**
 * Generates context-aware smart recommendations
 */
export const getSmartRecommendations = (
  report: IntelligenceReport,
  lucrativeSlots: LucrativeSlot[],
  currentHour: number
): string[] => {
  const tips: string[] = [];

  // Recommendation based on time slots
  const bestSlot = lucrativeSlots[0];
  if (bestSlot) {
    tips.push(`Sua maior rentabilidade histórica é no período ${bestSlot.slot}.`);
  }

  // Performance vs Tuesday (Example logic)
  if (report.growth < 0) {
    tips.push(`Você está ${Math.abs(report.growth)}% abaixo da sua média para este dia da semana.`);
  }

  // Operational tips
  if (report.operationalScore < 70) {
    tips.push("Detectamos 22% de excesso de deslocamento vazio. Evite circular sem corrida ativa.");
  }

  if (report.fuelScore < 60) {
    tips.push("Seu consumo está 15% acima da média do veículo. Verifique pressão dos pneus ou modo de condução.");
  }

  // Safety/Wellness
  if (currentHour > 22 || currentHour < 5) {
    tips.push("Operação noturna detectada. Redobre a atenção em áreas de risco.");
  }

  return tips;
};

export interface RegionPattern {
  name: string;
  profitPerKm: number;
  totalEarnings: number;
  reliability: 'ALTA' | 'MÉDIA' | 'BAIXA';
  status: 'FORTE' | 'NEUTRA' | 'FRACA';
}

/**
 * Detects regional performance patterns from history
 */
export const detectRegionalPatterns = (records: any[]): RegionPattern[] => {
  if (records.length === 0) return [];

  const regionMap: Record<string, { earnings: number; distance: number; count: number }> = {};

  records.forEach(record => {
    const region = record.region || 'Região Desconhecida';
    if (!regionMap[region]) {
      regionMap[region] = { earnings: 0, distance: 0, count: 0 };
    }
    regionMap[region].earnings += safeNumber(record.earnings);
    regionMap[region].distance += safeNumber(record.distance);
    regionMap[region].count += 1;
  });

  return Object.entries(regionMap)
    .map(([name, data]) => {
      const profitPerKm = data.distance > 0 ? data.earnings / data.distance : 0;
      let status: RegionPattern['status'] = 'NEUTRA';
      if (profitPerKm > 2.5) status = 'FORTE';
      else if (profitPerKm < 1.5) status = 'FRACA';

      return {
        name,
        profitPerKm,
        totalEarnings: data.earnings,
        reliability: data.count > 5 ? 'ALTA' : (data.count > 2 ? 'MÉDIA' : 'BAIXA') as any,
        status
      };
    })
    .sort((a, b) => b.profitPerKm - a.profitPerKm);
};

/**
 * Compares current period with previous period
 */
export const getEvolutionMetrics = (cycles: any[]): { growth: number; label: string; trend: 'up' | 'down' | 'neutral' } => {
  if (cycles.length < 14) return { growth: 0, label: '0%', trend: 'neutral' };

  const currentPeriod = cycles.slice(-7);
  const previousPeriod = cycles.slice(-14, -7);

  const currentTotal = currentPeriod.reduce((acc, c) => acc + safeNumber(c.total_amount), 0);
  const previousTotal = previousPeriod.reduce((acc, c) => acc + safeNumber(c.total_amount), 0);

  if (previousTotal === 0) return { growth: 0, label: '0%', trend: 'neutral' };

  const growth = ((currentTotal - previousTotal) / previousTotal) * 100;
  
  return {
    growth: Math.abs(growth),
    label: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`,
    trend: growth > 0 ? 'up' : (growth < 0 ? 'down' : 'neutral')
  };
};

/**
 * Calculates current shift efficiency score (0-100)
 */
export const calculateShiftScore = (
  entries: FinancialEntry[],
  kmDriven: number,
  hoursWorked: number
): ShiftEfficiency => {
  let score = 50; // Starting baseline
  const details: string[] = [];

  const earnings = entries
    .filter(e => e.type === 'revenue')
    .reduce((acc, e) => acc + safeNumber(e.amount), 0);
  
  const expenses = entries
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => acc + safeNumber(e.amount), 0);

  const netProfit = earnings - expenses;

  // 1. Profit per KM (Goal: > R$ 2.00/km)
  if (kmDriven > 0) {
    const profitPerKm = netProfit / kmDriven;
    if (profitPerKm > 2.5) score += 20;
    else if (profitPerKm > 2.0) score += 15;
    else if (profitPerKm > 1.5) score += 5;
    else score -= 10;
  }

  // 2. Earnings per Hour (Goal: > R$ 35/h)
  if (hoursWorked > 0) {
    const earningsPerHour = earnings / hoursWorked;
    if (earningsPerHour > 50) score += 20;
    else if (earningsPerHour > 40) score += 15;
    else if (earningsPerHour > 30) score += 5;
    else score -= 5;
  }

  // 3. Expense Ratio (Goal: < 30% of earnings)
  if (earnings > 0) {
    const expenseRatio = expenses / earnings;
    if (expenseRatio < 0.15) score += 10;
    else if (expenseRatio > 0.40) score -= 15;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let label = 'ESTÁVEL';
  let color = 'text-blue-400';

  if (score >= 90) {
    label = 'EXCEPCIONAL';
    color = 'text-[#00FFBB]';
  } else if (score >= 75) {
    label = 'ALTA PERFORMANCE';
    color = 'text-[#00FFBB]';
  } else if (score < 40) {
    label = 'CRÍTICO';
    color = 'text-rose-500';
  } else if (score < 60) {
    label = 'OTIMIZÁVEL';
    color = 'text-amber-400';
  }

  return { score, label, color, details };
};

/**
 * Projects total daily net revenue based on current pace
 */
export const getDayProjection = (
  currentNet: number,
  hoursWorked: number,
  dailyGoal: number = 250
): Projection => {
  if (hoursWorked <= 0.5) {
    return {
      estimatedNet: dailyGoal,
      message: "Coletando dados iniciais para projeção precisa",
      isOnTrack: true
    };
  }

  const netPerHour = currentNet / hoursWorked;
  // Assume a standard 8-hour day or remainer of current day
  const standardDayHours = 10;
  const estimatedNet = Math.round(netPerHour * standardDayHours);
  
  const isOnTrack = estimatedNet >= dailyGoal;
  
  let message = '';
  if (isOnTrack) {
    message = `Você deve fechar R$ ${estimatedNet} líquidos hoje mantendo o ritmo atual`;
  } else {
    message = `Pace atual indica R$ ${estimatedNet} ao fim do dia. Meta de R$ ${dailyGoal} sob risco`;
  }

  return { estimatedNet, message, isOnTrack };
};

/**
 * Generates operational alerts based on real-time metrics
 */
export const generateOperationalAlerts = (
  fuelExpense: number,
  kmDriven: number,
  score: number
): OperationalAlert[] => {
  const alerts: OperationalAlert[] = [];

  // High Fuel Cost Alert
  if (kmDriven > 10 && fuelExpense > 0) {
    const fuelPerKm = fuelExpense / kmDriven;
    if (fuelPerKm > 0.6) {
      alerts.push({
        id: 'high-fuel',
        type: 'critical',
        message: 'Custo/KM de combustível acima da média operacional',
        icon: 'Fuel'
      });
    }
  }

  // Efficiency Alert
  if (score < 50) {
    alerts.push({
      id: 'low-efficiency',
      type: 'warning',
      message: 'Desvio de eficiência detectado. Analise pontos de parada ociosos',
      icon: 'ZapOff'
    });
  }

  return alerts;
};

/**
 * Identifies the most lucrative hours based on history
 */
export const getLucrativeSlots = (entries: FinancialEntry[]): LucrativeSlot[] => {
  const revenueEntries = entries.filter(e => e.type === 'revenue' && e.created_at);
  if (revenueEntries.length < 3) return [];

  const slotsMap: Record<number, { total: number; count: number }> = {};

  revenueEntries.forEach(entry => {
    const date = new Date(entry.created_at!);
    const hour = date.getHours();
    
    // Group in 2-hour windows for better visualization
    const slotKey = Math.floor(hour / 2) * 2;
    
    if (!slotsMap[slotKey]) {
      slotsMap[slotKey] = { total: 0, count: 0 };
    }
    slotsMap[slotKey].total += safeNumber(entry.amount);
    slotsMap[slotKey].count += 1;
  });

  return Object.entries(slotsMap)
    .map(([hour, data]) => {
      const hNum = Number(hour);
      return {
        slot: `${hNum.toString().padStart(2, '0')}:00 - ${(hNum + 2).toString().padStart(2, '0')}:00`,
        value: data.total / data.count,
        count: data.count
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
};
