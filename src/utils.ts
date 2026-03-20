import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatKm(value: number) {
  return `${value.toLocaleString('pt-BR')} km`;
}

export function calculateMonthlyFixedCost(fixedCosts?: any) {
  if (!fixedCosts) return 0;
  if (fixedCosts.vehicleType === 'owned') {
    return (fixedCosts.insurance || 0) +
           (fixedCosts.ipva || 0) +
           (fixedCosts.oilChange || 0) +
           (fixedCosts.tires || 0) +
           (fixedCosts.maintenance || 0) +
           (fixedCosts.financing || 0);
  } else {
    const value = fixedCosts.rentalValue || 0;
    return fixedCosts.rentalPeriod === 'weekly' ? value * 4.33 : value;
  }
}

export function calculateDailyFixedCost(fixedCosts?: any) {
  return calculateMonthlyFixedCost(fixedCosts) / 30;
}

export function calculateOperationalCost(cycle: any, settings: any) {
  const fixedCosts = cycle.vehicle_snapshot?.fixedCosts || settings.fixedCosts;
  const dailyFixed = calculateDailyFixedCost(fixedCosts);
  const cycleExpenses = cycle.total_expenses || 0;
  
  // Total cost = Daily fixed + specific cycle expenses (fuel, food, etc.)
  return dailyFixed + cycleExpenses;
}

export function calculateEfficiencyMetrics(cycle: any, settings: any) {
  const totalAmount = cycle.total_amount || 0;
  const totalKm = cycle.total_km || 0;
  const rideKm = cycle.ride_km || 0;
  const totalCost = calculateOperationalCost(cycle, settings);
  
  const grossPerKm = totalKm > 0 ? totalAmount / totalKm : 0;
  const netAmount = totalAmount - totalCost;
  const netPerKm = totalKm > 0 ? netAmount / totalKm : 0;
  const profitPerKm = rideKm > 0 ? netAmount / rideKm : 0;

  return {
    totalCost,
    grossPerKm,
    netAmount,
    netPerKm,
    profitPerKm
  };
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
