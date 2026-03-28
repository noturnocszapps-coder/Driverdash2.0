import { isAfter, subMinutes, subHours, startOfDay, parseISO } from 'date-fns';
import { safeNumber } from '../utils';

export type MapLayer = 'productivity' | 'waiting' | 'mixed';
export type TimeFilter = '15m' | '30m' | '1h' | 'today' | 'all';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: 'idle' | 'productive';
  weight: number;
  // Operational metrics for scoring
  revenue: number;
  ridesStarted: number;
  productiveTime: number;
  idleTime: number;
  count: number;
}

export function generateOperationalHeatmap(
  cycles: any[],
  layer: MapLayer,
  timeFilter: TimeFilter
): HeatmapPoint[] {
  const now = new Date();
  let filterDate: Date | null = null;

  if (timeFilter === '15m') filterDate = subMinutes(now, 15);
  else if (timeFilter === '30m') filterDate = subMinutes(now, 30);
  else if (timeFilter === '1h') filterDate = subHours(now, 1);
  else if (timeFilter === 'today') filterDate = startOfDay(now);

  const grid: Record<string, { 
    lat: number; 
    lng: number; 
    idleTime: number; 
    productiveTime: number; 
    count: number;
    ridesStarted: number;
    revenue: number;
  }> = {};

  const PRECISION = 4; // ~11m grid

  cycles.forEach(cycle => {
    if (!cycle.route_points || cycle.route_points.length < 2) return;
    
    // Time filter
    const cycleStartTime = parseISO(cycle.start_time);
    if (filterDate && !isAfter(cycleStartTime, filterDate)) return;

    const cycleRevenue = safeNumber(cycle.total_amount);
    const cycleProductiveKm = safeNumber(cycle.productive_km || cycle.ride_km);
    const revenuePerPoint = cycleProductiveKm > 0 ? cycleRevenue / (cycle.route_points.length * (cycleProductiveKm / (cycle.tracked_km || cycleProductiveKm || 1))) : 0;

    cycle.route_points.forEach((point: any, idx: number) => {
      // Point-level time filter if available
      if (filterDate && point.timestamp && !isAfter(new Date(point.timestamp), filterDate)) return;

      const lat = parseFloat(point.lat.toFixed(PRECISION));
      const lng = parseFloat(point.lng.toFixed(PRECISION));
      const key = `${lat}_${lng}`;

      if (!grid[key]) {
        grid[key] = { lat, lng, idleTime: 0, productiveTime: 0, count: 0, ridesStarted: 0, revenue: 0 };
      }

      grid[key].count++;

      if (idx > 0) {
        const prev = cycle.route_points[idx - 1];
        const duration = point.timestamp - prev.timestamp;
        
        if (duration > 0 && duration < 3600000) {
          if (point.isProductive) {
            grid[key].productiveTime += duration;
            grid[key].revenue += revenuePerPoint;
          } else {
            grid[key].idleTime += duration;
          }
        }

        if (point.isProductive && !prev.isProductive) {
          grid[key].ridesStarted++;
        }
      }
    });
  });

  return Object.values(grid).map(cell => {
    let weight = 0;
    let type: 'idle' | 'productive' = 'idle';

    if (layer === 'productivity') {
      // Weight by revenue and ride starts
      weight = (cell.revenue * 0.7) + (cell.ridesStarted * 5);
      type = 'productive';
    } else if (layer === 'waiting') {
      // Weight by idle time
      weight = cell.idleTime / 60000; // minutes
      type = 'idle';
    } else {
      // Mixed: Balance of both
      const isProductive = cell.productiveTime > cell.idleTime || cell.ridesStarted > 0;
      if (isProductive) {
        weight = (cell.revenue * 0.5) + (cell.ridesStarted * 3);
        type = 'productive';
      } else {
        weight = cell.idleTime / 120000; // Lower weight for idle in mixed
        type = 'idle';
      }
    }

    // Normalize intensity (0 to 1)
    // Using a logarithmic scale or a cap to prevent outliers from dominating
    const intensity = Math.min(1, Math.log10(weight + 1) / 2);

    return {
      lat: cell.lat,
      lng: cell.lng,
      intensity,
      type,
      weight,
      revenue: cell.revenue,
      ridesStarted: cell.ridesStarted,
      productiveTime: cell.productiveTime,
      idleTime: cell.idleTime,
      count: cell.count
    };
  }).filter(p => p.intensity > 0.05);
}
