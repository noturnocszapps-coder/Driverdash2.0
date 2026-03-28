import { TrackingSession, Cycle, ZoneIntelligence, ZoneStatus, ZoneSeverity, ZoneReason, TripIntelligence } from '../types';
import { safeNumber } from '../utils';

export const ZONE_DETECTION_THRESHOLDS = {
  MIN_MINUTES_MATURITY: 10,
  MIN_KM_MATURITY: 2,
  
  // Weights for score (total 100)
  WEIGHT_IDLE_KM: 35,
  WEIGHT_WAITING_TIME: 25,
  WEIGHT_EFFICIENCY: 20,
  WEIGHT_REVENUE: 20,

  // Thresholds for signals
  BAD_IDLE_KM: 3,
  BAD_SEARCHING_MINUTES: 15,
  BAD_EFFICIENCY: 35,
  
  ATTENTION_IDLE_KM: 1.5,
  ATTENTION_SEARCHING_MINUTES: 8,
  ATTENTION_EFFICIENCY: 55,

  // Persistence and Cooldown
  PERSISTENCE_WINDOW_MS: 2 * 60 * 1000, // 2 minutes to confirm bad zone
  COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes between alerts
  STABILITY_WINDOW_MS: 30 * 1000, // 30 seconds debounce for state changes
};

export function evaluateZoneQuality(
  tracking: TrackingSession,
  cycle: Cycle | undefined,
  previousIntelligence?: ZoneIntelligence,
  tripIntelligence?: TripIntelligence
): ZoneIntelligence {
  const idleKm = safeNumber(tracking.idleDistance);
  const totalKm = safeNumber(tracking.distance);
  
  // BUG FIX: duration is in ms, convert to minutes correctly
  const durationMs = safeNumber(tracking.duration);
  let durationMinutes = durationMs / 60000;
  
  // Clamp and fallback for absurd values
  if (isNaN(durationMinutes) || durationMinutes < 0 || durationMinutes > 1440) { // Max 24h
    console.warn(`[ZONE] invalid searching minutes fallback applied: ${durationMinutes}`);
    durationMinutes = 0;
  } else {
    console.log(`[ZONE] searching minutes computed: ${durationMinutes.toFixed(2)}`);
  }

  const recentRevenue = safeNumber(cycle?.total_amount);
  const efficiency = totalKm > 0 ? (safeNumber(tracking.productiveDistance) / totalKm) * 100 : 0;
  const currentSpeed = safeNumber(tracking.currentSmoothedSpeed);
  const now = Date.now();

  // 1. Check Maturity
  const isMature = 
    tracking.isActive && 
    cycle && 
    (durationMinutes >= ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY || 
     totalKm >= ZONE_DETECTION_THRESHOLDS.MIN_KM_MATURITY);

  if (!isMature) {
    return {
      status: 'monitoring',
      severity: 'low',
      label: 'Monitorando região...',
      message: 'A IA está analisando o comportamento operacional nesta área.',
      reason: 'none',
      score: 100,
      metrics: {
        idleKm,
        searchingMinutes: durationMinutes,
        currentEfficiency: efficiency,
        recentRevenue
      },
      maturity: {
        isMature: false,
        reason: durationMinutes < ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY 
          ? `Aguarde mais ${Math.ceil(ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY - durationMinutes)} min`
          : 'Desloque-se mais um pouco para análise'
      }
    };
  }

  // 2. Calculate Weighted Score (0-100)
  // Higher score is better
  
  // Idle KM Score (0-100)
  const idleScore = Math.max(0, 100 - (idleKm / ZONE_DETECTION_THRESHOLDS.BAD_IDLE_KM) * 100);
  
  // Waiting Time Score (0-100) - only if revenue is 0
  let waitingScore = 100;
  if (recentRevenue === 0) {
    waitingScore = Math.max(0, 100 - (durationMinutes / ZONE_DETECTION_THRESHOLDS.BAD_SEARCHING_MINUTES) * 100);
  }

  // Efficiency Score (0-100)
  const efficiencyScore = Math.min(100, (efficiency / 70) * 100); // Target 70%

  // Revenue Score (0-100)
  const revenueScore = Math.min(100, (recentRevenue / 50) * 100); // Target R$ 50 to be "good" early on

  const totalScore = Math.round(
    (idleScore * (ZONE_DETECTION_THRESHOLDS.WEIGHT_IDLE_KM / 100)) +
    (waitingScore * (ZONE_DETECTION_THRESHOLDS.WEIGHT_WAITING_TIME / 100)) +
    (efficiencyScore * (ZONE_DETECTION_THRESHOLDS.WEIGHT_EFFICIENCY / 100)) +
    (revenueScore * (ZONE_DETECTION_THRESHOLDS.WEIGHT_REVENUE / 100))
  );

  // 3. Detect Main Reason
  let reason: ZoneReason = 'none';
  const scores = [
    { type: 'high_idle_km' as ZoneReason, val: idleScore },
    { type: 'long_wait_time' as ZoneReason, val: waitingScore },
    { type: 'low_efficiency' as ZoneReason, val: efficiencyScore },
    { type: 'low_demand' as ZoneReason, val: revenueScore }
  ];
  
  // Sort by lowest score to find the biggest problem
  const worstMetric = scores.sort((a, b) => a.val - b.val)[0];
  if (worstMetric.val < 60) {
    reason = worstMetric.type;
  }

  // 4. Determine Raw Status
  let rawStatus: ZoneStatus = 'good_zone';
  let severity: ZoneSeverity = 'low';
  let label = 'Zona boa';

  if (totalScore < 35) {
    rawStatus = 'bad_zone';
    severity = 'high';
    label = 'Zona ruim';
  } else if (totalScore < 65) {
    rawStatus = 'neutral_zone';
    severity = 'medium';
    label = 'Atenção';
  }

  // 5. Persistence and Smoothing
  let finalStatus = previousIntelligence?.status || rawStatus;
  let badZoneCandidateStartTime = previousIntelligence?.badZoneCandidateStartTime;
  let lastStateChangeTime = previousIntelligence?.lastStateChangeTime || now;

  // Persistence for Bad Zone
  if (rawStatus === 'bad_zone') {
    if (!badZoneCandidateStartTime) {
      badZoneCandidateStartTime = now;
    } else if (now - badZoneCandidateStartTime >= ZONE_DETECTION_THRESHOLDS.PERSISTENCE_WINDOW_MS) {
      finalStatus = 'bad_zone';
    }
  } else {
    badZoneCandidateStartTime = undefined;
  }

  // Debounce for other transitions
  if (rawStatus !== finalStatus && rawStatus !== 'bad_zone') {
    if (now - lastStateChangeTime >= ZONE_DETECTION_THRESHOLDS.STABILITY_WINDOW_MS) {
      finalStatus = rawStatus;
      lastStateChangeTime = now;
    }
  } else if (rawStatus === finalStatus) {
    lastStateChangeTime = now;
  }

  // 6. Contextual Message [PROBLEMA] + [AÇÃO]
  let message = 'Sua performance operacional está sólida nesta região.';
  const isMoving = currentSpeed > 5;

  if (finalStatus === 'bad_zone') {
    switch (reason) {
      case 'high_idle_km':
        message = isMoving 
          ? 'KM ocioso alto — considere mudar de área' 
          : 'Rodando vazio — evite continuar se deslocando sem rumo';
        break;
      case 'long_wait_time':
        message = isMoving
          ? 'Muito tempo sem corrida — considere mudar de região'
          : 'Pouca demanda — aguarde mais alguns minutos ou reposicione';
        break;
      case 'low_efficiency':
        message = 'Eficiência baixa — aguarde ou mude de estratégia';
        break;
      case 'low_demand':
        message = 'Baixa demanda detectada — considere buscar áreas mais movimentadas';
        break;
      default:
        message = isMoving ? 'Zona ruim — mude de região' : 'Zona ruim — aguarde ou reposicione';
    }
  } else if (finalStatus === 'neutral_zone') {
    message = 'Sinais de baixa conversão — fique atento à sua eficiência.';
  }

  // 7. Cooldown and Alert Logic
  let lastAlertTime = previousIntelligence?.lastAlertTime;
  const shouldAlert = finalStatus === 'bad_zone' && 
    (!lastAlertTime || now - lastAlertTime >= ZONE_DETECTION_THRESHOLDS.COOLDOWN_MS || previousIntelligence?.status !== 'bad_zone');

  if (shouldAlert) {
    lastAlertTime = now;
    // In a real app, we might trigger a notification here
  }

  // 8. Integration with Trip Intelligence (Reconciliation)
  if (tripIntelligence?.maturity.isMature) {
    if (tripIntelligence.status === 'good' && finalStatus === 'bad_zone') {
      severity = 'medium';
      label = 'Atenção (Zona)';
      message = 'Sua corrida atual está boa, mas a região mostra sinais de queda de demanda.';
    } else if (tripIntelligence.status === 'bad' && finalStatus === 'good_zone') {
      severity = 'medium';
      label = 'Região Boa / Corrida Ruim';
      message = 'A região está boa, mas sua corrida atual está abaixo do ideal. Considere selecionar melhor.';
    } else if (tripIntelligence.status === 'bad' && finalStatus === 'bad_zone') {
      severity = 'high';
      label = 'Crítico: Zona & Corrida';
      message = 'Desempenho crítico: tanto a corrida quanto a região estão ruins. Reposicione-se agora.';
    }
  }

  return {
    status: finalStatus,
    severity,
    label,
    message,
    reason,
    score: totalScore,
    metrics: {
      idleKm,
      searchingMinutes: durationMinutes,
      currentEfficiency: efficiency,
      recentRevenue
    },
    maturity: { isMature: true },
    lastAlertTime,
    lastZoneState: finalStatus,
    badZoneCandidateStartTime,
    lastStateChangeTime
  };
}
