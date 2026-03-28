import { HeatmapPoint } from './mapHeatUtils';
import { getHumanLocation } from '../utils';

export interface ScoredZone {
  lat: number;
  lng: number;
  score: number;
  label: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  type: 'productive' | 'idle';
}

export function calculateZoneScore(point: any): number {
  // Weights for scoring
  // revenue: high weight
  // ridesStarted: high weight
  // productiveTime: medium weight
  // idleTime: negative weight
  
  const revenueScore = Math.min(40, (point.revenue || 0) * 2);
  const rideStartScore = Math.min(30, (point.ridesStarted || 0) * 10);
  const efficiencyScore = point.productiveTime + point.idleTime > 0 
    ? (point.productiveTime / (point.productiveTime + point.idleTime)) * 30 
    : 0;
    
  let score = revenueScore + rideStartScore + efficiencyScore;
  
  // Penalize high idle time if not productive
  if (point.idleTime > 600000 && point.productiveTime === 0) {
    score = Math.max(0, score - 20);
  }
  
  return Math.min(100, Math.round(score));
}

export function getZoneConfidence(point: any): 'high' | 'medium' | 'low' {
  const totalPoints = point.count || 0;
  if (totalPoints > 50) return 'high';
  if (totalPoints > 15) return 'medium';
  return 'low';
}

export function identifyBestZones(gridPoints: any[]): { best: ScoredZone | null; worst: ScoredZone | null } {
  if (gridPoints.length === 0) return { best: null, worst: null };

  const scored = gridPoints.map(p => {
    const score = calculateZoneScore(p);
    const confidence = getZoneConfidence(p);
    const label = getHumanLocation(p.lat, p.lng);
    
    return {
      lat: p.lat,
      lng: p.lng,
      score,
      label,
      confidence,
      type: p.productiveTime > p.idleTime || p.ridesStarted > 0 ? 'productive' : 'idle',
      reason: score > 80 ? 'Alta demanda e ganhos consistentes' : 
              score > 55 ? 'Região com movimentação moderada' : 'Baixa atividade detectada'
    } as ScoredZone;
  });

  const best = [...scored]
    .filter(z => z.type === 'productive')
    .sort((a, b) => b.score - a.score)[0] || null;
    
  const worst = [...scored]
    .filter(z => z.type === 'idle')
    .sort((a, b) => b.score - a.score)[0] || null;

  return { best, worst };
}
