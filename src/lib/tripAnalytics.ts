import { TripAnalytics, TrackingSession, UserSettings, Cycle } from '../types';
import { safeNumber, calculateDailyFixedCost } from '../utils';

export const TRIP_EVALUATION_THRESHOLDS = {
  MIN_KM_MATURITY: 5,
  MIN_TIME_MATURITY: 15 * 60 * 1000, // 15 minutes
  MIN_REVENUE_MATURITY: 10,
  
  GOOD_SCORE: 75,
  ACCEPTABLE_SCORE: 45,
  
  TARGET_GROSS_KM: 2.5, // R$ 2.50/km
  TARGET_NET_KM: 1.8,   // R$ 1.80/km
  TARGET_PER_HOUR: 35,  // R$ 35/h
  TARGET_EFFICIENCY: 70, // 70%
};

export function evaluateCurrentTrip(
  tracking: TrackingSession,
  cycle: Cycle | undefined,
  settings: UserSettings
): TripAnalytics {
  const totalKm = safeNumber(tracking.distance);
  const duration = safeNumber(tracking.duration);
  const totalRevenue = safeNumber(cycle?.total_amount);
  
  // 1. Check Maturity
  const isMature = 
    totalKm >= TRIP_EVALUATION_THRESHOLDS.MIN_KM_MATURITY || 
    duration >= TRIP_EVALUATION_THRESHOLDS.MIN_TIME_MATURITY ||
    totalRevenue >= TRIP_EVALUATION_THRESHOLDS.MIN_REVENUE_MATURITY;
    
  if (!isMature) {
    return {
      score: 0,
      status: 'analyzing',
      label: 'Analisando...',
      message: 'Aguardando dados suficientes para avaliar sua performance.',
      maturity: {
        isMature: false,
        reason: totalKm < TRIP_EVALUATION_THRESHOLDS.MIN_KM_MATURITY 
          ? `Dirija pelo menos ${TRIP_EVALUATION_THRESHOLDS.MIN_KM_MATURITY}km para ativar a análise de performance`
          : `Aguardar ${Math.round(TRIP_EVALUATION_THRESHOLDS.MIN_TIME_MATURITY / 60000)}min de ciclo`
      },
      metrics: {
        grossPerKm: 0,
        netPerKm: 0,
        perHour: 0,
        efficiency: 0,
        profitPerKm: 0
      }
    };
  }

  // 2. Calculate Metrics
  const rideKm = safeNumber(tracking.productiveDistance);
  const idleKm = safeNumber(tracking.idleDistance);
  const efficiency = totalKm > 0 ? (rideKm / totalKm) * 100 : 0;
  
  const fixedCosts = cycle?.vehicle_snapshot?.fixedCosts || settings.fixedCosts;
  const dailyFixed = calculateDailyFixedCost(fixedCosts);
  
  // Proportional fixed cost based on cycle duration (assuming 24h cycle)
  const cycleDurationHours = duration / (1000 * 60 * 60);
  const proportionalFixed = (dailyFixed / 24) * Math.max(1, cycleDurationHours);
  
  const totalExpenses = safeNumber(cycle?.total_expenses) + proportionalFixed;
  const netRevenue = totalRevenue - totalExpenses;
  
  const grossPerKm = totalKm > 0 ? totalRevenue / totalKm : 0;
  const netPerKm = totalKm > 0 ? netRevenue / totalKm : 0;
  const profitPerKm = rideKm > 0 ? netRevenue / rideKm : 0;
  const perHour = cycleDurationHours > 0 ? totalRevenue / cycleDurationHours : 0;

  // 3. Calculate Score (0-100)
  // Rebalanced Weights: Gross/KM (25%), Net/KM (35%), Per Hour (30%), Efficiency (10%)
  const grossScore = Math.min(100, (grossPerKm / TRIP_EVALUATION_THRESHOLDS.TARGET_GROSS_KM) * 100);
  const netScore = Math.min(100, (netPerKm / TRIP_EVALUATION_THRESHOLDS.TARGET_NET_KM) * 100);
  const hourScore = Math.min(100, (perHour / TRIP_EVALUATION_THRESHOLDS.TARGET_PER_HOUR) * 100);
  const efficiencyScore = Math.min(100, (efficiency / TRIP_EVALUATION_THRESHOLDS.TARGET_EFFICIENCY) * 100);
  
  const score = Math.round(
    (grossScore * 0.25) + 
    (netScore * 0.35) + 
    (hourScore * 0.3) + 
    (efficiencyScore * 0.1)
  );

  // 4. Determine Status and Message
  let status: TripAnalytics['status'] = 'bad';
  let label = 'Pouco Lucrativa';
  let message = 'Desempenho abaixo do esperado para o tempo rodado.';

  if (score >= TRIP_EVALUATION_THRESHOLDS.GOOD_SCORE) {
    status = 'good';
    label = 'Altamente Lucrativa';
    message = 'Excelente relação entre ganho, tempo e quilometragem.';
  } else if (score >= TRIP_EVALUATION_THRESHOLDS.ACCEPTABLE_SCORE) {
    status = 'acceptable';
    label = 'Corrida na Média';
    message = 'Desempenho dentro da média. Tente reduzir o KM ocioso.';
  }

  // Refine message based on specific weak points
  if (status !== 'good') {
    if (efficiency < 50) {
      message = 'Muito KM ocioso reduzindo sua margem de lucro.';
    } else if (perHour < TRIP_EVALUATION_THRESHOLDS.TARGET_PER_HOUR * 0.6) {
      message = 'Faturamento por hora está baixo. Considere mudar de região.';
    } else if (grossPerKm < TRIP_EVALUATION_THRESHOLDS.TARGET_GROSS_KM * 0.7) {
      message = 'Ganho por KM está baixo. Selecione melhor suas corridas.';
    }
  }

  return {
    score,
    status,
    label,
    message,
    maturity: { isMature: true },
    metrics: {
      grossPerKm,
      netPerKm,
      perHour,
      efficiency,
      profitPerKm
    }
  };
}
