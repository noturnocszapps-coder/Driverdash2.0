import { HeatmapPoint, MapLayer } from './mapHeatUtils';
import { getHumanLocation } from '../utils';

export interface ZoneInsight {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  bestZone?: { lat: number; lng: number; label: string };
  worstZone?: { lat: number; lng: number; label: string };
}

export function analyzeMapIntelligence(
  points: HeatmapPoint[],
  layer: MapLayer
): ZoneInsight {
  if (points.length === 0) {
    return {
      title: 'Aguardando Dados',
      message: 'Continue rodando para que a IA identifique suas melhores zonas de faturamento.',
      type: 'info'
    };
  }

  const productivePoints = points.filter(p => p.type === 'productive');
  const idlePoints = points.filter(p => p.type === 'idle');

  // Sort by intensity to find best and worst
  const sortedProductive = [...productivePoints].sort((a, b) => b.intensity - a.intensity);
  const sortedIdle = [...idlePoints].sort((a, b) => b.intensity - a.intensity);

  const best = sortedProductive[0];
  const worst = sortedIdle[0];

  const bestLabel = best ? getHumanLocation(best.lat, best.lng) : null;
  const worstLabel = worst ? getHumanLocation(worst.lat, worst.lng) : null;

  let title = 'Análise Operacional';
  let message = 'Você está bem posicionado em uma área forte.';
  let type: 'success' | 'warning' | 'info' = 'info';

  if (layer === 'productivity') {
    if (bestLabel) {
      title = 'Alta Produtividade';
      message = `Alta concentração de produtividade na região ${bestLabel}.`;
      type = 'success';
    }
  } else if (layer === 'waiting') {
    if (worstLabel) {
      title = 'Zonas de Espera';
      message = `Evite permanecer nas zonas de espera prolongada em ${worstLabel}.`;
      type = 'warning';
    }
  } else {
    // Mixed
    if (productivePoints.length > idlePoints.length) {
      title = 'Bom Posicionamento';
      message = 'Você está passando mais tempo em zonas de alta demanda.';
      type = 'success';
    } else if (idlePoints.length > productivePoints.length) {
      title = 'Atenção Operacional';
      message = 'Você está perdendo muito tempo em zonas de baixa conversão. Tente se deslocar para as áreas verdes.';
      type = 'warning';
    }
  }

  // Contextual tips
  if (points.length > 50 && layer === 'mixed') {
    message = `Detectamos ${productivePoints.length} zonas de alta conversão. Focar nelas pode aumentar seu lucro líquido.`;
  }

  return {
    title,
    message,
    type,
    bestZone: best ? { lat: best.lat, lng: best.lng, label: bestLabel || 'Zona Produtiva' } : undefined,
    worstZone: worst ? { lat: worst.lat, lng: worst.lng, label: worstLabel || 'Zona de Espera' } : undefined
  };
}
