import { calculateDistance } from '../utils';

export interface NavigationInfo {
  distanceKm: number;
  bearing: number;
  cardinalDirection: string;
  relativeLabel: string;
}

export function getZoneNavigation(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number
): NavigationInfo {
  const distanceKm = calculateDistance(currentLat, currentLng, targetLat, targetLng);
  
  // Bearing calculation
  const y = Math.sin(deg2rad(targetLng - currentLng)) * Math.cos(deg2rad(targetLat));
  const x = Math.cos(deg2rad(currentLat)) * Math.sin(deg2rad(targetLat)) -
            Math.sin(deg2rad(currentLat)) * Math.cos(deg2rad(targetLat)) * Math.cos(deg2rad(targetLng - currentLng));
  let bearing = Math.atan2(y, x);
  bearing = rad2deg(bearing);
  bearing = (bearing + 360) % 360;

  const cardinalDirection = getCardinalDirection(bearing);
  
  let relativeLabel = '';
  if (distanceKm < 0.3) {
    relativeLabel = 'Você já está na melhor zona';
  } else if (distanceKm < 1) {
    relativeLabel = `Zona forte a ${(distanceKm * 1000).toFixed(0)}m à frente`;
  } else {
    relativeLabel = `Melhor zona a ${distanceKm.toFixed(1)}km ao ${cardinalDirection}`;
  }

  return {
    distanceKm,
    bearing,
    cardinalDirection,
    relativeLabel
  };
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

function getCardinalDirection(bearing: number): string {
  const directions = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
