import { ScoredZone } from './zoneScoring';
import { NavigationInfo } from './zoneNavigation'; // This was not created, but I'll use the interface from zoneNavigation

export interface Decision {
  action: 'stay' | 'wait' | 'move_now' | 'avoid_long' | 'monitor';
  label: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export function makeOperationalDecision(
  bestZone: ScoredZone | null,
  currentZoneScore: number,
  nav: any, // NavigationInfo
  isTrackingActive: boolean,
  isMoving: boolean,
  isDataMature: boolean,
  confidence: 'high' | 'medium' | 'low'
): Decision {
  if (!isTrackingActive) {
    return {
      action: 'monitor',
      label: 'Aguardando Início',
      message: 'Inicie o rastreamento para receber orientações do copiloto.',
      priority: 'low'
    };
  }

  if (!isDataMature || !bestZone) {
    return {
      action: 'monitor',
      label: 'Coletando Dados',
      message: 'O copiloto está analisando a região. Continue rodando.',
      priority: 'low'
    };
  }

  const distance = nav.distanceKm;
  const bestScore = bestZone.score;
  
  // Case 1: Already in a good zone
  if (currentZoneScore >= 75 || distance < 0.4) {
    return {
      action: 'stay',
      label: 'Permanecer',
      message: 'Você já está em uma zona de alta produtividade. Aguarde chamadas aqui.',
      priority: 'medium'
    };
  }

  // Case 2: Current zone is okay, best zone is far
  if (currentZoneScore >= 50 && distance > 3) {
    return {
      action: 'wait',
      label: 'Esperar mais',
      message: 'A melhor zona está distante. Vale a pena aguardar chamadas na região atual.',
      priority: 'low'
    };
  }

  // Case 3: Current zone is bad, best zone is close and strong
  if (currentZoneScore < 50 && distance < 2 && bestScore > 70 && confidence === 'high') {
    return {
      action: 'move_now',
      label: 'Mover agora',
      message: `Zona forte detectada a ${distance.toFixed(1)}km ao ${nav.cardinalDirection}.`,
      priority: 'high'
    };
  }

  // Case 4: Current zone is bad, but confidence is low
  if (currentZoneScore < 50 && confidence === 'low') {
    return {
      action: 'wait',
      label: 'Aguardar',
      message: 'Região com poucos dados. Aguarde mais alguns minutos antes de se deslocar.',
      priority: 'low'
    };
  }

  // Default: Stay or move cautiously
  if (distance < 1.5 && bestScore > 60) {
    return {
      action: 'move_now',
      label: 'Ajustar Posição',
      message: `Melhor posicionamento a ${distance.toFixed(1)}km ao ${nav.cardinalDirection}.`,
      priority: 'medium'
    };
  }

  return {
    action: 'stay',
    label: 'Permanecer',
    message: 'Região atual estável. Mantenha o posicionamento.',
    priority: 'low'
  };
}
