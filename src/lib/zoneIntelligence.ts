import { TrackingSession, Cycle, ZoneIntelligence, ZoneStatus, ZoneSeverity } from '../types';
import { safeNumber } from '../utils';

export const ZONE_DETECTION_THRESHOLDS = {
  MIN_MINUTES_MATURITY: 10,
  MIN_KM_MATURITY: 2,
  
  BAD_IDLE_KM: 3,
  BAD_SEARCHING_MINUTES: 15,
  BAD_EFFICIENCY: 35,
  
  ATTENTION_IDLE_KM: 1.5,
  ATTENTION_SEARCHING_MINUTES: 8,
  ATTENTION_EFFICIENCY: 55,
};

export function evaluateZoneQuality(
  tracking: TrackingSession,
  cycle: Cycle | undefined
): ZoneIntelligence {
  const idleKm = safeNumber(tracking.idleDistance);
  const totalKm = safeNumber(tracking.distance);
  const durationMinutes = safeNumber(tracking.duration) / 60;
  const recentRevenue = safeNumber(cycle?.total_amount);
  const efficiency = totalKm > 0 ? (safeNumber(tracking.productiveDistance) / totalKm) * 100 : 0;

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
      maturity: {
        isMature: false,
        reason: durationMinutes < ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY 
          ? `Aguarde mais ${Math.ceil(ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY - durationMinutes)} min`
          : 'Desloque-se mais um pouco para análise'
      },
      metrics: {
        idleKm,
        searchingMinutes: durationMinutes,
        currentEfficiency: efficiency,
        recentRevenue
      }
    };
  }

  // 2. Signals Detection
  let strongSignals = 0;
  let weakSignals = 0;

  // Signal: Idle KM
  if (idleKm >= ZONE_DETECTION_THRESHOLDS.BAD_IDLE_KM) strongSignals++;
  else if (idleKm >= ZONE_DETECTION_THRESHOLDS.ATTENTION_IDLE_KM) weakSignals++;

  // Signal: Searching Time (if no recent revenue, time is considered searching)
  if (recentRevenue === 0) {
    if (durationMinutes >= ZONE_DETECTION_THRESHOLDS.BAD_SEARCHING_MINUTES) strongSignals++;
    else if (durationMinutes >= ZONE_DETECTION_THRESHOLDS.ATTENTION_SEARCHING_MINUTES) weakSignals++;
  }

  // Signal: Efficiency
  if (efficiency < ZONE_DETECTION_THRESHOLDS.BAD_EFFICIENCY) strongSignals++;
  else if (efficiency < ZONE_DETECTION_THRESHOLDS.ATTENTION_EFFICIENCY) weakSignals++;

  // 3. Determine Status and Severity
  let status: ZoneStatus = 'good_zone';
  let severity: ZoneSeverity = 'low';
  let label = 'Zona boa';
  let message = 'Sua performance operacional está sólida nesta região.';

  if (strongSignals >= 3 || (strongSignals >= 2 && weakSignals >= 1)) {
    status = 'bad_zone';
    severity = 'high';
    label = 'Zona ruim';
    
    // Actionable messages
    if (idleKm >= ZONE_DETECTION_THRESHOLDS.BAD_IDLE_KM) {
      message = 'KM ocioso alto reduzindo sua margem. Considere mudar de região.';
    } else if (recentRevenue === 0 && durationMinutes >= ZONE_DETECTION_THRESHOLDS.BAD_SEARCHING_MINUTES) {
      message = 'Você está há muito tempo sem corrida. Evite continuar rodando vazio.';
    } else {
      message = 'Eficiência abaixo do ideal. Considere mudar de estratégia ou local.';
    }
  } else if (strongSignals >= 1 || weakSignals >= 2) {
    status = 'neutral_zone';
    severity = 'medium';
    label = 'Atenção';
    message = 'Sinais de baixa conversão detectados. Fique atento à sua eficiência.';
  }

  return {
    status,
    severity,
    label,
    message,
    maturity: { isMature: true },
    metrics: {
      idleKm,
      searchingMinutes: durationMinutes,
      currentEfficiency: efficiency,
      recentRevenue
    }
  };
}
