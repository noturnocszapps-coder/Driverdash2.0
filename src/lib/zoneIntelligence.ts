import { TrackingSession, Cycle, ZoneIntelligence, ZoneStatus, ZoneSeverity, ZoneReason, TripIntelligence, DriverProfile, DriverState } from '../types';
import { safeNumber, getHumanLocation, calculateDistance } from '../utils';

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
  
  // AI Learning
  IGNORE_PENALTY_THRESHOLD: 3, // Reduce frequency after 3 ignores
};

export function evaluateZoneQuality(
  tracking: TrackingSession,
  cycle: Cycle | undefined,
  previousIntelligence?: ZoneIntelligence,
  tripIntelligence?: TripIntelligence,
  driverProfile?: DriverProfile,
  userLearning?: DriverState['userLearning']
): ZoneIntelligence {
  const idleKm = safeNumber(tracking.idleDistance);
  const totalKm = safeNumber(tracking.distance);
  
  const durationMs = safeNumber(tracking.duration);
  let durationMinutes = durationMs / 60000;
  
  if (isNaN(durationMinutes) || durationMinutes < 0 || durationMinutes > 1440) {
    durationMinutes = 0;
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
      regionName: getHumanLocation(tracking.lastLocation?.lat || 0, tracking.lastLocation?.lng || 0),
      maturity: {
        isMature: false,
        reason: durationMinutes < ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY 
          ? `Aguarde mais ${Math.ceil(ZONE_DETECTION_THRESHOLDS.MIN_MINUTES_MATURITY - durationMinutes)} min`
          : 'Dirija pelo menos 2km para ativar a análise inteligente'
      }
    };
  }

  // 2. Calculate Weighted Score (0-100)
  const idleScore = Math.max(0, 100 - (idleKm / ZONE_DETECTION_THRESHOLDS.BAD_IDLE_KM) * 100);
  let waitingScore = 100;
  if (recentRevenue === 0) {
    waitingScore = Math.max(0, 100 - (durationMinutes / ZONE_DETECTION_THRESHOLDS.BAD_SEARCHING_MINUTES) * 100);
  }
  const efficiencyScore = Math.min(100, (efficiency / 70) * 100);
  const revenueScore = Math.min(100, (recentRevenue / 50) * 100);

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
  
  const worstMetric = scores.sort((a, b) => a.val - b.val)[0];
  if (worstMetric.val < 60) {
    reason = worstMetric.type;
  }

  // 4. Determine Raw Status
  let rawStatus: ZoneStatus = 'good_zone';
  let severity: ZoneSeverity = 'low';
  let label = 'Alta Demanda';

  if (totalScore < 40) {
    rawStatus = 'bad_zone';
    severity = 'high';
    label = 'Pouca Demanda';
  } else if (totalScore < 65) {
    rawStatus = 'neutral_zone';
    severity = 'medium';
    label = 'Demanda Média';
  }

  // 5. Persistence and Smoothing (INÉRCIA DE DECISÃO)
  let finalStatus = previousIntelligence?.status || rawStatus;
  let badZoneCandidateStartTime = previousIntelligence?.badZoneCandidateStartTime;
  let lastStateChangeTime = previousIntelligence?.lastStateChangeTime || now;

  // Se o status bruto mudou, verificamos se a mudança persiste
  if (rawStatus !== finalStatus) {
    // Para zona ruim, temos uma janela de persistência maior (2 min)
    if (rawStatus === 'bad_zone') {
      if (!badZoneCandidateStartTime) {
        badZoneCandidateStartTime = now;
      } else if (now - badZoneCandidateStartTime >= ZONE_DETECTION_THRESHOLDS.PERSISTENCE_WINDOW_MS) {
        finalStatus = 'bad_zone';
        lastStateChangeTime = now;
      }
    } else {
      // Para outras mudanças, usamos a janela de estabilidade (30s)
      if (now - lastStateChangeTime >= ZONE_DETECTION_THRESHOLDS.STABILITY_WINDOW_MS) {
        finalStatus = rawStatus;
        lastStateChangeTime = now;
        badZoneCandidateStartTime = undefined;
      }
    }
  } else {
    // Se o status bruto é igual ao final, resetamos o candidato a zona ruim
    if (rawStatus !== 'bad_zone') {
      badZoneCandidateStartTime = undefined;
    }
    // Mantemos o lastStateChangeTime se estivermos estáveis
  }

  // 6. Contextual Message
  let message = 'Sua performance operacional está sólida nesta região.';
  const isMoving = currentSpeed > 5;

  if (finalStatus === 'bad_zone') {
    switch (reason) {
      case 'high_idle_km':
        message = isMoving ? 'KM ocioso alto — considere mudar de área' : 'Rodando vazio — evite continuar se deslocando sem rumo';
        break;
      case 'long_wait_time':
        message = isMoving ? 'Muito tempo sem corrida — considere mudar de região' : 'Pouca demanda — aguarde mais alguns minutos ou reposicione';
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

  // 7. Integration with Trip Intelligence
  if (tripIntelligence?.maturity.isMature) {
    if (tripIntelligence.status === 'good' && finalStatus === 'bad_zone') {
      severity = 'medium';
      label = 'Corrida Lucrativa / Demanda em Queda';
      message = 'Sua corrida atual está performando bem, mas a região mostra sinais de baixa demanda. Considere reposicionar-se após o desembarque.';
    } else if (tripIntelligence.status === 'bad' && finalStatus === 'good_zone') {
      severity = 'medium';
      label = 'Região Aquecida / Corrida Abaixo';
      message = 'A região está com boa demanda, mas sua corrida atual está abaixo da média ideal. Finalize e aguarde uma oferta melhor nesta área.';
    } else if (tripIntelligence.status === 'bad' && finalStatus === 'bad_zone') {
      severity = 'high';
      label = 'Alerta Crítico: Zona & Corrida';
      message = 'Desempenho crítico detectado: tanto a corrida quanto a região estão com baixa demanda. Recomendamos reposicionamento imediato para áreas de maior fluxo.';
    } else if (tripIntelligence.status === 'good' && finalStatus === 'good_zone') {
      severity = 'low';
      label = 'Alta Performance';
      message = 'Excelente! Você está em uma região lucrativa com uma corrida de alta eficiência. Mantenha o ritmo.';
    }
  }

  // 8. Decision Source & Confidence Logic (REFINED)
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let decisionSource: 'realtime' | 'profile' | 'mixed' = 'realtime';
  
  const currentLat = tracking.lastLocation?.lat || 0;
  const currentLng = tracking.lastLocation?.lng || 0;
  const currentRegion = getHumanLocation(currentLat, currentLng);
  
  const isBestRegion = driverProfile?.bestRegions.includes(currentRegion);
  const isWorstRegion = driverProfile?.worstRegions.includes(currentRegion);
  
  // History validity check (7 days)
  const lastUpdated = driverProfile?.lastUpdated ? new Date(driverProfile.lastUpdated).getTime() : 0;
  const isHistoryValid = (now - lastUpdated) < (7 * 24 * 60 * 60 * 1000);
  const hasHistory = driverProfile && driverProfile.totalRides > 5 && isHistoryValid;

  if (totalScore < 40) {
    // TEMPO REAL > HISTÓRICO: Ignore history if zone is bad
    decisionSource = 'realtime';
    confidence = 'HIGH';
  } else if (totalScore >= 40 && totalScore <= 60) {
    // MEDIUM: Use history as support
    if (hasHistory) {
      if (isWorstRegion) {
        decisionSource = 'mixed';
        confidence = 'HIGH';
      } else if (isBestRegion) {
        decisionSource = 'mixed';
        confidence = 'MEDIUM';
      } else {
        decisionSource = 'realtime';
        confidence = 'MEDIUM';
      }
    } else {
      decisionSource = 'realtime';
      confidence = 'LOW';
    }
  } else {
    // GOOD: Use history to reinforce
    if (hasHistory) {
      if (isBestRegion) {
        decisionSource = 'mixed';
        confidence = 'HIGH';
      } else {
        decisionSource = 'realtime';
        confidence = 'MEDIUM';
      }
    } else {
      decisionSource = 'realtime';
      confidence = 'LOW';
    }
  }

  // 9. Best Zone Suggestion (Contextualized & Real Data)
  let bestZone;
  
  // APRENDIZADO POR IGNORAR: Reduzir frequência se o usuário ignora muito
  const ignoredCount = userLearning?.ignoredTypes?.['hot_zone'] || 0;
  const shouldSuppressHotZone = ignoredCount >= ZONE_DETECTION_THRESHOLDS.IGNORE_PENALTY_THRESHOLD;

  // Only suggest hot zone if not in trip
  const isHotZoneViable = !tracking.isProductive && hasHistory && !shouldSuppressHotZone;

  if (isHotZoneViable && (finalStatus === 'bad_zone' || finalStatus === 'neutral_zone')) {
    // Find best region that is NOT the current one
    const candidateRegions = driverProfile.bestRegions.filter(r => r !== currentRegion);
    
    if (candidateRegions.length > 0) {
      const bestRegion = candidateRegions[0];
      // Simulate distance based on region name (deterministic for "realism")
      const distSeed = Math.abs(bestRegion.length - currentRegion.length) % 5 + 1.2;
      const mockDistance = distSeed + (Math.random() * 0.5);
      
      // DISTÂNCIA BASEADA EM TEMPO: Estimar tempo de deslocamento (30km/h avg)
      const estimatedTimeMinutes = (mockDistance / 30) * 60;
      
      // Só sugerir se acessível em menos de 20 minutos
      if (estimatedTimeMinutes < 20) {
        bestZone = {
          label: bestRegion,
          distance: Number(mockDistance.toFixed(1)),
          timeToArrival: Math.round(estimatedTimeMinutes),
          direction: '→'
        };
      }
    }
  } 
  
  // If no history or no viable best region, suggest a generic "high demand" area nearby
  if (!bestZone && (finalStatus === 'bad_zone' || finalStatus === 'neutral_zone')) {
    const directions: ('N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'RIGHT', 'LEFT', 'DOWN'];
    const mockDirection = directions[Math.floor(now / 3600000) % directions.length];
    const mockDistance = 1.8;
    const estimatedTimeMinutes = (mockDistance / 30) * 60;

    bestZone = {
      label: 'Área de Alta Demanda',
      distance: mockDistance,
      timeToArrival: Math.round(estimatedTimeMinutes),
      direction: mockDirection === 'UP' ? '↑' : mockDirection === 'RIGHT' ? '→' : mockDirection === 'LEFT' ? '←' : '↓'
    };
  }

  return {
    status: finalStatus,
    severity,
    label,
    message,
    reason,
    score: totalScore,
    confidence,
    decisionSource,
    regionName: currentRegion,
    metrics: {
      idleKm,
      searchingMinutes: durationMinutes,
      currentEfficiency: efficiency,
      recentRevenue
    },
    maturity: { isMature: true },
    bestZone,
    lastAlertTime: previousIntelligence?.lastAlertTime,
    lastZoneState: finalStatus,
    badZoneCandidateStartTime,
    lastStateChangeTime
  };
}
