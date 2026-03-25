import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriverState, UserSettings, AuthUser, SyncStatus, Cycle, Expense, Fueling, Maintenance, FaturamentoLog } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { calculateDistance, safeNumber } from './utils';

let watchId: number | null = null;

const TRACKING_CONFIG = {
  MIN_POINTS_SEARCHING: 3,
  MIN_POINTS_TRIP: 6, // 6 pontos consecutivos > 10km/h
  MIN_SPEED_START: 10, // km/h
  MIN_SPEED_STOP: 3, // km/h
  STOP_BUFFER_MS: 120000, // 120 segundos parado
  MIN_DIST_PRECISION: 0.01, // 10 metros
  MAX_SPEED_NOISE: 160, // km/h
  DRIFT_SPEED_THRESHOLD: 2.5, // km/h
  WARMUP_POINTS_REQUIRED: 5,
  MAX_ACCURACY: 35, // metros mais rigoroso
  SPEED_BUFFER_SIZE: 5,
  MIN_TRIP_DISPLACEMENT: 0.03, // 30 metros para confirmar fim
  MANUAL_OVERRIDE_TIMEOUT: 60000, // 60 segundos de bloqueio auto após manual
};

const INITIAL_SETTINGS: UserSettings = {
  dailyGoal: 250,
  name: 'Motorista',
  vehicle: 'Veículo Padrão',
  avgRideValue: 15,
  avgRideKm: 5,
  kmPerLiter: 10,
  fuelPrice: 5.80,
  activePlatforms: ['uber_car'],
  transportMode: 'car',
  dashboardMode: 'merged',
  theme: 'dark',
  photoUrl: undefined,
  fixedCosts: {
    vehicleType: 'owned',
  },
  currentVehicleProfileId: undefined,
};

const INITIAL_TRACKING = {
  isActive: false,
  isLoading: false,
  distance: 0,
  productiveDistance: 0,
  idleDistance: 0,
  isProductive: false,
  isManualOverride: false,
  manualOverrideTimestamp: undefined,
  avgSpeed: 0,
  currentSmoothedSpeed: 0,
  speedBuffer: [],
  duration: 0,
  movingTime: 0,
  stoppedTime: 0,
  points: [],
  segments: [],
  consecutiveMovingPoints: 0,
  consecutiveStoppedPoints: 0,
  mode: 'stopped' as const,
  tripDetectionState: 'idle' as const,
  lastStopLocation: undefined,
};

const ACTIVE_VEHICLE_KEY = 'driverdash_active_vehicle_id';

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      user: null,
      syncStatus: 'idle',
      lastSyncTime: null,
      syncError: null,
      hasSynced: false,
      rides: [],
      workLogs: [],
      faturamentoLogs: [],
      cycles: [],
      expenses: [],
      fuelings: [],
      maintenances: [],
      importedReports: [],
      vehicles: [],
      activeVehicleId: undefined,
      settings: INITIAL_SETTINGS,
      tracking: INITIAL_TRACKING,
      isSaving: false,
      setUser: (user) => {
        const currentUser = get().user;
        
        // If logging out or switching users, reset the store
        if (!user || (currentUser && user.id !== currentUser.id)) {
          console.log('[STORE] User changed or logout, resetting store...');
          get().resetStore();
        }

        set({ user });
        
        // If user just logged in or changed, trigger a full sync
        if (user && (user.id !== currentUser?.id || !get().hasSynced)) {
          console.log('[SYNC] User active, triggering initial sync...');
          get().syncData();
        }
      },
      resetStore: () => {
        // Clear local storage keys that might leak between users
        localStorage.removeItem(ACTIVE_VEHICLE_KEY);
        
        set({
          syncStatus: 'idle',
          lastSyncTime: null,
          syncError: null,
          hasSynced: false,
          rides: [],
          workLogs: [],
          faturamentoLogs: [],
          cycles: [],
          expenses: [],
          fuelings: [],
          maintenances: [],
          importedReports: [],
          vehicles: [],
          activeVehicleId: undefined,
          settings: INITIAL_SETTINGS,
          tracking: INITIAL_TRACKING,
          isSaving: false
        });
      },
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      
      startCycle: async () => {
        const { user, cycles, settings, isSaving, activeVehicleId } = get();
        if (isSaving) return cycles.find(c => c.status === 'open')?.id || '';
        
        const openCycle = cycles.find(c => c.status === 'open');
        if (openCycle) return openCycle.id;

        if (!activeVehicleId) {
          throw new Error('Selecione um veículo ativo antes de iniciar um ciclo.');
        }

        set({ isSaving: true });
        try {
          const { vehicles } = get();
          const currentVehicle = vehicles.find(v => v.id === activeVehicleId);
          
          const vehicleSnapshot = {
            id: activeVehicleId,
            name: currentVehicle?.name || settings.vehicle,
            fixedCosts: currentVehicle?.fixedCosts || settings.fixedCosts || { vehicleType: 'owned' },
            kmPerLiter: settings.kmPerLiter,
            fuelPrice: settings.fuelPrice
          };

          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newCycle = {
            id,
            user_id: user?.id || '',
            start_time: now,
            updated_at: now,
            uber_amount: 0,
            noventanove_amount: 0,
            indriver_amount: 0,
            extra_amount: 0,
            total_amount: 0,
            total_km: 0,
            ride_km: 0,
            displacement_km: 0,
            uber_km: 0,
            noventanove_km: 0,
            indriver_km: 0,
            status: 'open' as const,
            vehicle_id: activeVehicleId,
            vehicle_name: currentVehicle?.name || settings.vehicle,
            vehicle_snapshot: vehicleSnapshot
          };

          set((state) => ({ cycles: [...state.cycles, newCycle] }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('cycles').insert(newCycle);
            if (error) console.error('[Store] Sync error (start cycle):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            
            // Force refresh to ensure data integrity
            if (!error) await get().syncData();
            
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }

          return id;
        } finally {
          set({ isSaving: false });
        }
      },

      addCycle: async (cycle) => {
        const { user, isSaving, activeVehicleId } = get();
        if (isSaving) return '';

        if (!activeVehicleId && !cycle.vehicle_id) {
          throw new Error('Selecione um veículo ativo antes de adicionar um ciclo.');
        }

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newCycle = {
            ...cycle,
            id,
            user_id: user?.id || '',
            updated_at: now,
            vehicle_id: cycle.vehicle_id || activeVehicleId,
            total_amount: (cycle.uber_amount || 0) + (cycle.noventanove_amount || 0) + (cycle.indriver_amount || 0) + (cycle.extra_amount || 0),
            total_expenses: (cycle.fuel_expense || 0) + (cycle.food_expense || 0) + (cycle.other_expense || 0)
          };

          set((state) => ({ cycles: [...state.cycles, newCycle] }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('cycles').insert(newCycle);
            if (error) console.error('[Store] Sync error (add cycle):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            
            // Force refresh to ensure data integrity
            if (!error) await get().syncData();
            
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }

          return id;
        } finally {
          set({ isSaving: false });
        }
      },

      closeCycle: async (id) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const endTime = new Date().toISOString();
          
          set((state) => ({
            cycles: state.cycles.map(c => 
              c.id === id ? { ...c, status: 'closed', end_time: endTime, updated_at: endTime } : c
            )
          }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('cycles')
              .update({ status: 'closed', end_time: endTime })
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) console.error('[Store] Sync error (close cycle):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            
            // Force refresh to ensure data integrity
            if (!error) await get().syncData();

            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      updateCycle: async (id, data) => {
        const { user, isSaving } = get();
        
        // Always update local state first for responsiveness
        set((state) => ({
          cycles: state.cycles.map(c => {
            if (c.id === id) {
              const updated = { ...c, ...data, updated_at: new Date().toISOString() };
              
              // Consolidate tracking data into main KM fields if provided
              if (data.tracked_km !== undefined) {
                updated.tracked_km = safeNumber(data.tracked_km);
              }
              if (data.productive_km !== undefined) {
                updated.ride_km = safeNumber(data.productive_km);
              }
              if (data.idle_km !== undefined) {
                updated.displacement_km = safeNumber(data.idle_km);
              }

              updated.uber_amount = safeNumber(updated.uber_amount);
              updated.noventanove_amount = safeNumber(updated.noventanove_amount);
              updated.indriver_amount = safeNumber(updated.indriver_amount);
              updated.extra_amount = safeNumber(updated.extra_amount);
              
              updated.total_amount = updated.uber_amount + updated.noventanove_amount + updated.indriver_amount + updated.extra_amount;
              
              updated.fuel_expense = safeNumber(updated.fuel_expense);
              updated.food_expense = safeNumber(updated.food_expense);
              updated.other_expense = safeNumber(updated.other_expense);
              
              updated.total_expenses = updated.fuel_expense + updated.food_expense + updated.other_expense;
              
              // Ensure total_km is strictly the sum of ride and displacement
              updated.total_km = safeNumber(updated.ride_km) + safeNumber(updated.displacement_km);
              
              return updated;
            }
            return c;
          })
        }));

        // If a sync is already in progress, don't start another one
        // but the local state is already updated above.
        if (isSaving) return;

        if (user && isSupabaseConfigured) {
          set({ isSaving: true });
          try {
            const cycle = get().cycles.find(c => c.id === id);
            if (!cycle) return;
            
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('cycles')
              .update({
                uber_amount: cycle.uber_amount,
                noventanove_amount: cycle.noventanove_amount,
                indriver_amount: cycle.indriver_amount,
                extra_amount: cycle.extra_amount,
                total_amount: cycle.total_amount,
                fuel_expense: cycle.fuel_expense,
                food_expense: cycle.food_expense,
                other_expense: cycle.other_expense,
                total_expenses: cycle.total_expenses,
                total_km: cycle.total_km,
                ride_km: cycle.ride_km,
                displacement_km: cycle.displacement_km,
                uber_km: cycle.uber_km,
                noventanove_km: cycle.noventanove_km,
                indriver_km: cycle.indriver_km,
                tracked_km: cycle.tracked_km,
                tracked_moving_time: cycle.tracked_moving_time,
                tracked_stopped_time: cycle.tracked_stopped_time,
                productive_km: cycle.productive_km,
                idle_km: cycle.idle_km,
                efficiency_percentage: cycle.efficiency_percentage,
                driver_score: cycle.driver_score,
                route_points: cycle.route_points,
                segments: cycle.segments,
                vehicle_id: cycle.vehicle_id,
                vehicle_name: cycle.vehicle_name,
                vehicle_snapshot: cycle.vehicle_snapshot,
                end_time: cycle.end_time,
                status: cycle.status
              })
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) console.error('[Store] Sync error (update cycle):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            
            // Force refresh to ensure data integrity
            if (!error) await get().syncData();

            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          } finally {
            set({ isSaving: false });
          }
        }
      },

      addCycleAmount: (id, platform, amount) => {
        const { cycles, updateCycle } = get();
        const cycle = cycles.find(c => c.id === id);
        if (!cycle) return;

        const field = `${platform}_amount` as const;
        const currentAmount = (cycle[field] as number) || 0;
        updateCycle(id, { [field]: currentAmount + amount });
      },

      checkAndCloseCycles: () => {
        const { cycles, closeCycle } = get();
        const now = new Date().getTime();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        cycles.forEach(c => {
          if (c.status === 'open') {
            const startTime = new Date(c.start_time).getTime();
            if (now - startTime >= TWENTY_FOUR_HOURS) {
              closeCycle(c.id);
            }
          }
        });
      },

      addExpense: async (expense) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newExpense = { ...expense, id, updated_at: now };
          set((state) => ({ expenses: [...state.expenses, newExpense] }));
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('expenses').insert({
              id,
              user_id: user.id,
              date: expense.date,
              category: expense.category,
              value: expense.value,
              description: expense.description
            });
            if (error) console.error('[Store] Sync error (expense):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      addFueling: async (fueling) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newFueling = { ...fueling, id, updated_at: now };
          set((state) => ({ fuelings: [...state.fuelings, newFueling] }));
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('fuel_logs').insert({
              id,
              user_id: user.id,
              date: fueling.date,
              liters: fueling.liters,
              cost: fueling.value,
              odometer: fueling.odometer
            });
            if (error) console.error('[Store] Sync error (fueling):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      addMaintenance: async (maintenance) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newMaintenance = { ...maintenance, id, updated_at: now };
          set((state) => ({ maintenances: [...state.maintenances, newMaintenance] }));
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('maintenance_logs').insert({
              id,
              user_id: user.id,
              date: maintenance.date,
              type: maintenance.type,
              cost: maintenance.value,
              odometer: maintenance.currentKm,
              next_change_km: maintenance.nextChangeKm
            });
            if (error) console.error('[Store] Sync error (maintenance):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      addImportedReport: async (report) => {
        const { user, settings, isSaving, addCycle, activeVehicleId } = get();
        if (isSaving) return;

        if (!activeVehicleId) {
          throw new Error('Selecione um veículo ativo antes de importar relatórios.');
        }

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newReport = { 
            ...report, 
            id, 
            user_id: user?.id || '', 
            imported_at: now,
            updated_at: now,
            vehicle_id: activeVehicleId,
          } as any;
          
          set((state) => ({ importedReports: [...state.importedReports, newReport] }));

          // If it's a daily report, also create a cycle to feed the main stats
          if (report.report_type === 'daily') {
            // Try to parse period_start as a date
            // Usually it comes as DD/MM/YYYY or YYYY-MM-DD
            let startTime = now;
            try {
              if (report.period_start) {
                const parts = report.period_start.split('/');
                if (parts.length === 3) {
                  // DD/MM/YYYY -> YYYY-MM-DD
                  startTime = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString();
                } else {
                  const date = new Date(report.period_start);
                  if (!isNaN(date.getTime())) {
                    startTime = date.toISOString();
                  }
                }
              }
            } catch (e) {
              console.error('[Store] Error parsing report date:', e);
            }

            const platformKey = report.platform.toLowerCase() === 'uber' ? 'uber_amount' :
                               report.platform.toLowerCase() === '99' ? 'noventanove_amount' :
                               report.platform.toLowerCase() === 'indrive' ? 'indriver_amount' : 'extra_amount';

            await addCycle({
              start_time: startTime,
              end_time: startTime,
              status: 'closed',
              total_amount: report.total_earnings,
              [platformKey]: report.total_earnings,
              source: 'Importado via print',
              imported_report_id: id,
              vehicle_id: activeVehicleId,
              vehicle_name: settings.vehicle
            } as any);
          }

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('imported_reports').insert(newReport);
            if (error) console.error('[Store] Sync error (imported report):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      addFaturamentoLog: async (log) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newLog = { 
            ...log, 
            id, 
            user_id: user?.id || '', 
            updated_at: now 
          } as FaturamentoLog;
          
          set((state) => ({ faturamentoLogs: [...state.faturamentoLogs, newLog] }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('faturamento_logs').upsert({
              ...newLog,
              user_id: user.id
            });
            if (error) console.error('[Store] Sync error (faturamento_log):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      deleteCycle: async (id) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          set((state) => ({
            cycles: state.cycles.filter(c => c.id !== id)
          }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('cycles').delete().eq('id', id).eq('user_id', user.id);
            if (error) console.error('[Store] Sync error (delete cycle):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      deleteImportedReport: async (id) => {
        const { user, isSaving } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          set((state) => ({
            importedReports: state.importedReports.filter(r => r.id !== id)
          }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('imported_reports').delete().eq('id', id).eq('user_id', user.id);
            if (error) console.error('[Store] Sync error (delete imported report):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      loadVehicles: async () => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;
        
        try {
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          if (data) {
            const mappedVehicles = data.map(v => ({
              id: v.id,
              name: v.name,
              brand: v.brand,
              model: v.model,
              year: v.year,
              plate: v.plate,
              type: v.type,
              category: v.category,
              is_active: v.is_active,
              fixedCosts: {
                vehicleType: v.type,
                insurance: v.insurance,
                ipva: v.ipva,
                oilChange: v.oil_change,
                tires: v.tires,
                maintenance: v.maintenance,
                financing: v.installment,
                rentalPeriod: v.rental_type,
                rentalValue: v.rental_value
              },
              createdAt: v.created_at
            }));
            set({ vehicles: mappedVehicles });
          }
        } catch (error) {
          console.error('[Vehicle Error] loadVehicles:', error);
        }
      },

      addVehicle: async (vehicle) => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;
        
        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const dbVehicle = {
            id,
            user_id: user.id,
            name: vehicle.name,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            plate: vehicle.plate,
            type: vehicle.type,
            category: vehicle.category,
            insurance: vehicle.fixedCosts.insurance,
            ipva: vehicle.fixedCosts.ipva,
            oil_change: vehicle.fixedCosts.oilChange,
            tires: vehicle.fixedCosts.tires,
            maintenance: vehicle.fixedCosts.maintenance,
            installment: vehicle.fixedCosts.financing,
            rental_type: vehicle.fixedCosts.rentalPeriod,
            rental_value: vehicle.fixedCosts.rentalValue,
            is_active: false,
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase.from('vehicles').insert(dbVehicle);
          if (error) throw error;

          const newVehicle = { ...vehicle, id, createdAt: new Date().toISOString() };
          set((state) => ({ vehicles: [newVehicle, ...state.vehicles] }));
          
          // If it's the first vehicle, set it as active
          if (get().vehicles.length === 1) {
            await get().setActiveVehicle(id);
          }
        } catch (error: any) {
          console.error('[Vehicle Error] addVehicle:', error);
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      updateVehicle: async (id, updates) => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;
        
        set({ isSaving: true });
        try {
          const now = new Date().toISOString();
          const dbUpdates: any = { updated_at: now };
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.brand) dbUpdates.brand = updates.brand;
          if (updates.model) dbUpdates.model = updates.model;
          if (updates.year) dbUpdates.year = updates.year;
          if (updates.plate) dbUpdates.plate = updates.plate;
          if (updates.type) dbUpdates.type = updates.type;
          if (updates.category) dbUpdates.category = updates.category;
          
          if (updates.fixedCosts) {
            if (updates.fixedCosts.insurance !== undefined) dbUpdates.insurance = updates.fixedCosts.insurance;
            if (updates.fixedCosts.ipva !== undefined) dbUpdates.ipva = updates.fixedCosts.ipva;
            if (updates.fixedCosts.oilChange !== undefined) dbUpdates.oil_change = updates.fixedCosts.oilChange;
            if (updates.fixedCosts.tires !== undefined) dbUpdates.tires = updates.fixedCosts.tires;
            if (updates.fixedCosts.maintenance !== undefined) dbUpdates.maintenance = updates.fixedCosts.maintenance;
            if (updates.fixedCosts.financing !== undefined) dbUpdates.installment = updates.fixedCosts.financing;
            if (updates.fixedCosts.rentalPeriod !== undefined) dbUpdates.rental_type = updates.fixedCosts.rentalPeriod;
            if (updates.fixedCosts.rentalValue !== undefined) dbUpdates.rental_value = updates.fixedCosts.rentalValue;
          }

          const { error } = await supabase.from('vehicles').update(dbUpdates).eq('id', id).eq('user_id', user.id);
          if (error) throw error;

          set((state) => ({
            vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates, updated_at: now } : v)
          }));
        } catch (error: any) {
          console.error('[Vehicle Error] updateVehicle:', error);
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      deleteVehicle: async (id) => {
        const { user, settings } = get();
        if (!user || !isSupabaseConfigured) return;
        
        set({ isSaving: true });
        try {
          const { error } = await supabase.from('vehicles').delete().eq('id', id).eq('user_id', user.id);
          if (error) throw error;

          set((state) => ({
            vehicles: state.vehicles.filter(v => v.id !== id)
          }));

          if (settings.currentVehicleProfileId === id) {
            const nextVehicle = get().vehicles[0];
            if (nextVehicle) {
              await get().setActiveVehicle(nextVehicle.id);
            } else {
              await get().updateSettings({ currentVehicleProfileId: undefined });
            }
          }
        } catch (error: any) {
          console.error('[Vehicle Error] deleteVehicle:', error);
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      setActiveVehicle: async (id) => {
        const { user, vehicles } = get();
        
        const activeVehicle = vehicles.find(v => v.id === id);
        if (!activeVehicle) return;

        console.log('[VEHICLE] set active:', id);

        // Update local state IMMEDIATELY for responsiveness
        set((state) => ({
          activeVehicleId: id,
          vehicles: state.vehicles.map(v => ({
            ...v,
            is_active: v.id === id
          })),
          settings: {
            ...state.settings,
            currentVehicleProfileId: id,
            vehicle: activeVehicle.name,
            transportMode: activeVehicle.category,
            fixedCosts: activeVehicle.fixedCosts
          }
        }));

        // Persist to localStorage
        localStorage.setItem(ACTIVE_VEHICLE_KEY, id);

        if (!user || !isSupabaseConfigured) return;

        set({ isSaving: true });
        try {
          // Update all vehicles to inactive and the selected one to active in Supabase
          const { error: updateAllError } = await supabase
            .from('vehicles')
            .update({ is_active: false })
            .eq('user_id', user.id);
            
          if (updateAllError) throw updateAllError;

          const { error: updateActiveError } = await supabase
            .from('vehicles')
            .update({ is_active: true })
            .eq('id', id);
            
          if (updateActiveError) throw updateActiveError;

          // Persist to profile
          await supabase
            .from('profiles')
            .update({ active_vehicle_id: id })
            .eq('id', user.id);

          await get().updateSettings({
            currentVehicleProfileId: id,
            vehicle: activeVehicle.name,
            transportMode: activeVehicle.category,
            fixedCosts: activeVehicle.fixedCosts
          });
        } catch (error: any) {
          console.error('[Vehicle Error] setActiveVehicle:', error);
          // Force sync to restore consistency on error
          await get().syncData();
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      initVehicle: async () => {
        const { user } = get();
        
        // Ensure vehicles are loaded
        await get().loadVehicles();
        
        const { vehicles } = get();
        let restoredId: string | undefined = undefined;

        // 1. Try Supabase if logged in
        if (user && isSupabaseConfigured) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('active_vehicle_id')
              .eq('id', user.id)
              .single();
            
            if (!error && data?.active_vehicle_id) {
              restoredId = data.active_vehicle_id;
              console.log('[VEHICLE] restored from supabase:', restoredId);
            }
          } catch (err) {
            console.error('[VEHICLE] error restoring from supabase:', err);
          }
        }

        // 2. Fallback to localStorage
        if (!restoredId) {
          const localId = localStorage.getItem(ACTIVE_VEHICLE_KEY);
          if (localId) {
            restoredId = localId;
            console.log('[VEHICLE] restored from storage:', restoredId);
          }
        }

        // 3. Fallback to settings if still nothing
        if (!restoredId && get().settings.currentVehicleProfileId) {
          restoredId = get().settings.currentVehicleProfileId;
        }

        if (restoredId) {
          const vehicle = vehicles.find(v => v.id === restoredId);
          if (vehicle) {
            set((state) => ({
              activeVehicleId: restoredId,
              settings: {
                ...state.settings,
                currentVehicleProfileId: restoredId,
                vehicle: vehicle.name,
                transportMode: vehicle.category,
                fixedCosts: vehicle.fixedCosts
              }
            }));
          } else {
            // If vehicle not found in list, just set the ID
            set({ activeVehicleId: restoredId });
          }
        }
      },

      updateSettings: async (newSettings) => {
        const { user, isSaving, syncData, settings: currentSettings } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          // If user is logged in, update Supabase FIRST (Cloud-First)
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            
            // Prepare update object
            const updateObj: any = {
              updated_at: new Date().toISOString()
            };

            if (newSettings.name !== undefined) updateObj.name = newSettings.name;
            if (newSettings.dailyGoal !== undefined) updateObj.daily_goal = newSettings.dailyGoal;
            if (newSettings.vehicle !== undefined) updateObj.vehicle = newSettings.vehicle;
            if (newSettings.kmPerLiter !== undefined) updateObj.km_per_liter = newSettings.kmPerLiter;
            if (newSettings.fuelPrice !== undefined) updateObj.fuel_price = newSettings.fuelPrice;
            if (newSettings.activePlatforms !== undefined) updateObj.active_platforms = newSettings.activePlatforms;
            if (newSettings.transportMode !== undefined) updateObj.transport_mode = newSettings.transportMode;
            if (newSettings.dashboardMode !== undefined) updateObj.dashboard_mode = newSettings.dashboardMode;
            if (newSettings.theme !== undefined) updateObj.theme = newSettings.theme;
            if (newSettings.photoUrl !== undefined) updateObj.photo_url = newSettings.photoUrl;
            if (newSettings.fixedCosts !== undefined) updateObj.fixed_costs = newSettings.fixedCosts;
            if (newSettings.currentVehicleProfileId !== undefined) updateObj.current_vehicle_profile_id = newSettings.currentVehicleProfileId;

            const { error } = await supabase.from('profiles').update(updateObj).eq('id', user.id);
            
            if (error) {
              console.error('[Store] Error updating settings in Supabase:', error);
              set({ syncStatus: 'offline' });
              throw error; // Throw to let UI handle it
            }

            // Only update local state if Supabase update succeeded
            set((state) => {
              if (newSettings.currentVehicleProfileId) {
                localStorage.setItem(ACTIVE_VEHICLE_KEY, newSettings.currentVehicleProfileId);
              }
              return { 
                settings: { ...state.settings, ...newSettings },
                syncStatus: 'synced',
                activeVehicleId: newSettings.currentVehicleProfileId !== undefined ? newSettings.currentVehicleProfileId : state.activeVehicleId
              };
            });

            // Force refresh to ensure data integrity
            await syncData();
            
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          } else {
            // Guest mode - update local only
            set((state) => {
              if (newSettings.currentVehicleProfileId) {
                localStorage.setItem(ACTIVE_VEHICLE_KEY, newSettings.currentVehicleProfileId);
              }
              return { 
                settings: { ...state.settings, ...newSettings },
                activeVehicleId: newSettings.currentVehicleProfileId !== undefined ? newSettings.currentVehicleProfileId : state.activeVehicleId
              };
            });
          }
        } catch (err) {
          console.error('[Store] updateSettings error:', err);
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      updateTracking: (newTracking) => set((state) => {
        const updatedTracking = { ...state.tracking, ...newTracking };
        
        // If isProductive is manually changed, set isManualOverride to true
        if (newTracking.isProductive !== undefined && newTracking.isProductive !== state.tracking.isProductive) {
          updatedTracking.isManualOverride = true;
          // If manually starting a trip, reset detection state
          if (newTracking.isProductive) {
            updatedTracking.tripDetectionState = 'trip_started';
            updatedTracking.mode = 'on_trip';
          } else {
            updatedTracking.tripDetectionState = 'idle';
            updatedTracking.mode = 'searching';
          }
        }
        
        return { tracking: updatedTracking };
      }),

      startTrip: () => {
        const { tracking, updateTracking } = get();
        if (!tracking.isActive) {
          get().startTracking();
        }
        updateTracking({ 
          isProductive: true, 
          mode: 'on_trip', 
          tripDetectionState: 'trip_started', 
          isManualOverride: true,
          manualOverrideTimestamp: Date.now()
        });
        console.log('[TRACK] Trip iniciada (manual)');
        if (navigator.vibrate) navigator.vibrate(50);
      },

      endTrip: () => {
        const { updateTracking } = get();
        updateTracking({ 
          isProductive: false, 
          mode: 'searching', 
          tripDetectionState: 'idle', 
          isManualOverride: true,
          manualOverrideTimestamp: Date.now()
        });
        console.log('[TRACK] Trip encerrada (manual)');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      },

      startTracking: () => {
        const { tracking, cycles, activeVehicleId } = get();
        if (tracking.isActive) return;

        if (!activeVehicleId) {
          throw new Error('Selecione um veículo ativo antes de iniciar o rastreamento.');
        }
        
        const openCycle = cycles.find(c => c.status === 'open');
        if (!openCycle) return;

        if (!navigator.geolocation) {
          console.error('Geolocation not supported');
          return;
        }

        set({ tracking: { ...get().tracking, isLoading: true } });
        const startTime = Date.now();
        console.log('[TRACKING] iniciado');
        set({
          tracking: {
            isActive: true,
            isLoading: false,
            startTime,
            distance: 0,
            avgSpeed: 0,
            currentSmoothedSpeed: 0,
            speedBuffer: [],
            duration: 0,
            movingTime: 0,
            stoppedTime: 0,
            productiveDistance: 0,
            idleDistance: 0,
            isProductive: false,
            isManualOverride: false,
            manualOverrideTimestamp: undefined,
            isWarmingUp: true,
            points: [],
            segments: [],
            consecutiveMovingPoints: 0,
            consecutiveStoppedPoints: 0,
            mode: 'stopped',
            tripDetectionState: 'idle',
            lastPoint: undefined,
            lastStopLocation: undefined
          }
        });

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { tracking: currentTracking } = get();
            if (!currentTracking.isActive) return;

            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = position.timestamp || Date.now();
            const lastPoint = currentTracking.lastPoint;

            // 1. FILTRO DE PONTO GPS MAIS RIGOROSO
            if (accuracy && accuracy > TRACKING_CONFIG.MAX_ACCURACY) {
              console.log('[TRACKING] ponto ignorado: accuracy alta', accuracy);
              return;
            }

            let speedKmh = 0;
            if (position.coords.speed !== null && position.coords.speed !== undefined) {
              speedKmh = position.coords.speed * 3.6;
            } else if (lastPoint) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              const timeDiff = Math.max(1, (timestamp - lastPoint.timestamp) / 1000);
              speedKmh = (dist / timeDiff) * 3600;
            }

            // Ignorar velocidades absurdas
            if (!Number.isFinite(speedKmh) || speedKmh > TRACKING_CONFIG.MAX_SPEED_NOISE) {
              console.log('[TRACKING] ponto ignorado: velocidade absurda', speedKmh);
              return;
            }

            // Ignorar pontos quase duplicados (tempo < 500ms)
            if (lastPoint && (timestamp - lastPoint.timestamp) < 500) {
              return;
            }

            // 6. VELOCIDADE MÉDIA SUAVIZADA
            const newSpeedBuffer = [...currentTracking.speedBuffer, speedKmh].slice(-TRACKING_CONFIG.SPEED_BUFFER_SIZE);
            const smoothedSpeed = newSpeedBuffer.reduce((a, b) => a + b, 0) / newSpeedBuffer.length;
            
            console.log(`[TRACKING] ponto recebido: lat=${latitude}, lng=${longitude}, smoothedSpeed=${smoothedSpeed.toFixed(1)}km/h, accuracy=${accuracy?.toFixed(1)}m`);

            const newPoint = { 
              lat: latitude, 
              lng: longitude, 
              accuracy, 
              timestamp, 
              speed: smoothedSpeed,
              isProductive: currentTracking.isProductive 
            };

            let newDistance = currentTracking.distance;
            let newMovingTime = currentTracking.movingTime;
            let newStoppedTime = currentTracking.stoppedTime;
            let newProductiveDistance = currentTracking.productiveDistance;
            let newIdleDistance = currentTracking.idleDistance;
            let newIsProductive = currentTracking.isProductive;
            let newIsManualOverride = currentTracking.isManualOverride;
            let manualOverrideTimestamp = currentTracking.manualOverrideTimestamp;
            let newLastStopTimestamp = currentTracking.lastStopTimestamp;
            let newMode = currentTracking.mode;
            let newTripDetectionState = currentTracking.tripDetectionState;
            let newConsecutiveMovingPoints = currentTracking.consecutiveMovingPoints;
            let newConsecutiveStoppedPoints = currentTracking.consecutiveStoppedPoints;
            let newSegments = [...(currentTracking.segments || [])];
            let newIsWarmingUp = currentTracking.isWarmingUp;

            // 0. GERENCIAMENTO DE OVERRIDE MANUAL
            if (newIsManualOverride && manualOverrideTimestamp) {
              if (Date.now() - manualOverrideTimestamp > TRACKING_CONFIG.MANUAL_OVERRIDE_TIMEOUT) {
                newIsManualOverride = false;
                console.log('[TRACK] manual override expired, auto detection re-enabled');
              }
            }

            if (lastPoint) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
              const timeDiff = timestamp - lastPoint.timestamp;

              // 1. FILTRO DE MOVIMENTO (Distância mínima vs Velocidade)
              const isMoving = dist >= TRACKING_CONFIG.MIN_DIST_PRECISION && smoothedSpeed >= TRACKING_CONFIG.DRIFT_SPEED_THRESHOLD;

              if (isMoving) {
                newMovingTime += timeDiff;
                newLastStopTimestamp = undefined;
                
                if (smoothedSpeed > TRACKING_CONFIG.MIN_SPEED_START) {
                  newConsecutiveMovingPoints++;
                } else {
                  // Se a velocidade cair mas ainda estiver movendo, não reseta totalmente para evitar ruído em trânsito
                  newConsecutiveMovingPoints = Math.max(0, newConsecutiveMovingPoints - 1);
                }
                newConsecutiveStoppedPoints = 0;

                // 2. DETECÇÃO AUTOMÁTICA DE INÍCIO
                if (!newIsManualOverride) {
                  if (newMode !== 'on_trip') {
                    // Só inicia se vier de searching e tiver passado um tempo mínimo desde a última parada total
                    const timeSinceStop = currentTracking.lastStopTimestamp ? (timestamp - currentTracking.lastStopTimestamp) : 999999;
                    
                    if (newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_TRIP && timeSinceStop > 10000) {
                      console.log('[TRACK] start trip detected (auto)');
                      newIsProductive = true;
                      newMode = 'on_trip';
                      newTripDetectionState = 'trip_started';
                      if (navigator.vibrate) navigator.vibrate(100);
                    } else if (newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_SEARCHING) {
                      if (newTripDetectionState !== 'pickup_candidate') {
                        console.log('[TRACK] pickup candidate detected');
                        newTripDetectionState = 'pickup_candidate';
                      }
                    }
                  }
                }

                // 3. CLASSIFICAÇÃO DE DISTÂNCIA E MODO
                if (newIsProductive) {
                  newProductiveDistance += dist;
                  newMode = 'on_trip';
                } else {
                  newIdleDistance += dist;
                  newMode = 'searching';
                }
                
                newDistance = newProductiveDistance + newIdleDistance;
              } else {
                // Parado ou ruído
                newStoppedTime += timeDiff;
                newConsecutiveMovingPoints = 0;
                
                if (smoothedSpeed < TRACKING_CONFIG.MIN_SPEED_STOP) {
                  newConsecutiveStoppedPoints++;
                  if (!newLastStopTimestamp) {
                    newLastStopTimestamp = timestamp;
                    // Salva posição de parada para checar deslocamento
                    set({ tracking: { ...get().tracking, lastStopLocation: { lat: latitude, lng: longitude } } });
                  }
                }

                // 4. DETECÇÃO AUTOMÁTICA DE FIM
                if (!newIsManualOverride && newMode === 'on_trip') {
                  const stopDuration = newLastStopTimestamp ? (timestamp - newLastStopTimestamp) : 0;
                  
                  // Checa deslocamento desde que parou
                  const lastStopLoc = get().tracking.lastStopLocation;
                  const displacementSinceStop = lastStopLoc ? calculateDistance(lastStopLoc.lat, lastStopLoc.lng, latitude, longitude) : 0;

                  if (stopDuration > TRACKING_CONFIG.STOP_BUFFER_MS && displacementSinceStop < TRACKING_CONFIG.MIN_TRIP_DISPLACEMENT) {
                    console.log('[TRACK] end trip detected (auto) - duration:', stopDuration, 'displacement:', displacementSinceStop);
                    newIsProductive = false;
                    newMode = 'searching';
                    newTripDetectionState = 'idle';
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  } else if (stopDuration > 60000) {
                    if (newTripDetectionState !== 'dropoff_candidate') {
                      console.log('[TRACK] dropoff candidate detected');
                      newTripDetectionState = 'dropoff_candidate';
                    }
                  }
                } else if (!newIsManualOverride && newMode === 'searching') {
                  const stopDuration = newLastStopTimestamp ? (timestamp - newLastStopTimestamp) : 0;
                  if (stopDuration > 30000) {
                    newMode = 'stopped';
                  }
                }
              }
            }

            // Warm-up logic
            const points = [...currentTracking.points, newPoint];
            if (newIsWarmingUp && points.length >= TRACKING_CONFIG.WARMUP_POINTS_REQUIRED) {
              const movingPoints = points.filter(p => (p.speed || 0) > TRACKING_CONFIG.MIN_SPEED_START);
              if (movingPoints.length >= 3) {
                newIsWarmingUp = false;
              }
            }

            // 3. CLASSIFICAÇÃO POR SEGMENTO (Gerenciamento Robusto)
            if (newMode !== currentTracking.mode || newSegments.length === 0) {
              // Fecha segmento anterior
              if (newSegments.length > 0) {
                const lastIdx = newSegments.length - 1;
                const lastSeg = newSegments[lastIdx];
                newSegments[lastIdx] = {
                  ...lastSeg,
                  endTime: timestamp,
                  endLat: latitude,
                  endLng: longitude,
                  endLocation: { lat: latitude, lng: longitude },
                  duration: timestamp - lastSeg.startTime,
                  avgSpeed: (timestamp - lastSeg.startTime) > 0 
                    ? lastSeg.distance / ((timestamp - lastSeg.startTime) / 3600000) 
                    : 0
                };
              }
              
              // Inicia novo segmento
              newSegments.push({
                id: Math.random().toString(36).substr(2, 9),
                startTime: timestamp,
                startLat: latitude,
                startLng: longitude,
                startLocation: { lat: latitude, lng: longitude },
                mode: newMode,
                distance: 0,
                duration: 0,
                avgSpeed: 0
              });
            } else {
              // Atualiza segmento atual
              const lastIdx = newSegments.length - 1;
              const dist = lastPoint ? calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng) : 0;
              const currentSeg = newSegments[lastIdx];
              
              // Filtro de distância mínima para o segmento
              const validDist = dist >= 0.01 ? dist : 0;
              
              newSegments[lastIdx] = {
                ...currentSeg,
                distance: currentSeg.distance + validDist,
                duration: timestamp - currentSeg.startTime,
                avgSpeed: (timestamp - currentSeg.startTime) > 0 
                  ? (currentSeg.distance + validDist) / ((timestamp - currentSeg.startTime) / 3600000) 
                  : 0,
                endLat: latitude,
                endLng: longitude,
                endLocation: { lat: latitude, lng: longitude }
              };
            }

            const totalDuration = timestamp - (currentTracking.startTime || timestamp);
            const avgSpeed = totalDuration > 0 ? (newDistance / (totalDuration / 3600000)) : 0;
            
            newPoint.isProductive = newIsProductive;

            set({
              tracking: {
                ...currentTracking,
                isLoading: false,
                lastPoint: newPoint,
                lastLocation: { lat: latitude, lng: longitude },
                lastTimestamp: timestamp,
                distance: newDistance,
                productiveDistance: newProductiveDistance,
                idleDistance: newIdleDistance,
                movingTime: newMovingTime,
                stoppedTime: newStoppedTime,
                isProductive: newIsProductive,
                isManualOverride: newIsManualOverride,
                isWarmingUp: newIsWarmingUp,
                lastStopTimestamp: newLastStopTimestamp,
                mode: newMode,
                tripDetectionState: newTripDetectionState,
                consecutiveMovingPoints: newConsecutiveMovingPoints,
                consecutiveStoppedPoints: newConsecutiveStoppedPoints,
                segments: newSegments,
                points,
                duration: totalDuration,
                avgSpeed,
                currentSmoothedSpeed: smoothedSpeed,
                speedBuffer: newSpeedBuffer
              }
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      },

      stopTracking: async () => {
        console.log('[TRACKING] encerrado');
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        const { tracking, cycles, updateCycle } = get();
        if (!tracking.isActive) {
          console.log('[Store] stopTracking: tracking is not active, returning');
          return;
        }

        const openCycle = cycles.find(c => c.status === 'open');
        
        // Fecha o último segmento se estiver aberto
        const finalSegments = [...tracking.segments];
        if (finalSegments.length > 0) {
          const lastIdx = finalSegments.length - 1;
          if (!finalSegments[lastIdx].endTime) {
            finalSegments[lastIdx] = {
              ...finalSegments[lastIdx],
              endTime: Date.now(),
              duration: Date.now() - finalSegments[lastIdx].startTime,
            };
          }
        }

        // 1. Calculate the values to persist
        const persistedData = openCycle ? {
          tracked_km: (openCycle.tracked_km || 0) + tracking.distance,
          tracked_moving_time: (openCycle.tracked_moving_time || 0) + tracking.movingTime,
          tracked_stopped_time: (openCycle.tracked_stopped_time || 0) + tracking.stoppedTime,
          productive_km: (openCycle.productive_km || 0) + tracking.productiveDistance,
          idle_km: (openCycle.idle_km || 0) + tracking.idleDistance,
          efficiency_percentage: tracking.distance > 0 ? (tracking.productiveDistance / tracking.distance) * 100 : 0,
          driver_score: Math.min(100, Math.round(tracking.distance > 0 ? (tracking.productiveDistance / tracking.distance) * 100 : 0)),
          route_points: [...(openCycle.route_points || []), ...tracking.points],
          segments: [...(openCycle.segments || []), ...finalSegments]
        } : null;

        // 2. Reset tracking state IMMEDIATELY
        set({
          tracking: {
            isActive: false,
            isLoading: false,
            distance: 0,
            avgSpeed: 0,
            currentSmoothedSpeed: 0,
            speedBuffer: [],
            duration: 0,
            movingTime: 0,
            stoppedTime: 0,
            productiveDistance: 0,
            idleDistance: 0,
            isProductive: false,
            isManualOverride: false,
            manualOverrideTimestamp: undefined,
            mode: 'stopped',
            tripDetectionState: 'idle',
            points: [],
            segments: [],
            consecutiveMovingPoints: 0,
            consecutiveStoppedPoints: 0,
            lastPoint: undefined,
            lastStopLocation: undefined,
            endTime: Date.now()
          }
        });

        // 3. Persist the data to the cycle
        if (openCycle && persistedData) {
          console.log('[Store] stopTracking: updating cycle', openCycle.id);
          await updateCycle(openCycle.id, persistedData);
        }
        console.log('[Store] stopTracking completed');
      },

      importData: (data) => set((state) => {
        const mergeByUpdatedAt = (local: any[], incoming: any[]) => {
          const map = new Map(local.map(item => [item.id, item]));
          
          incoming.forEach(item => {
            const existing = map.get(item.id);
            if (!existing) {
              map.set(item.id, item);
            } else {
              // Merge based on updated_at
              const localUpdate = existing.updated_at || existing.created_at || existing.createdAt || '0';
              const remoteUpdate = item.updated_at || item.created_at || item.createdAt || '0';
              
              if (new Date(remoteUpdate) > new Date(localUpdate)) {
                console.log(`[SYNC] Remote newer for ${item.id}, updating local`);
                map.set(item.id, { ...existing, ...item });
              } else {
                console.log(`[SYNC] Local newer for ${item.id}, keeping local`);
              }
            }
          });
          
          return Array.from(map.values());
        };

        const newSettings = data.settings ? { ...state.settings, ...data.settings } : state.settings;
        
        // Handle settings merge if updated_at is present
        if (data.settings?.updated_at && state.settings.updated_at) {
          if (new Date(data.settings.updated_at) < new Date(state.settings.updated_at)) {
             // Local settings are newer, don't overwrite
             console.log('[SYNC] Local settings newer, skipping overwrite');
             // But we still want to merge other data
          } else {
             console.log('[SYNC] Remote settings newer, updating local');
          }
        }

        const newActiveVehicleId = data.settings?.currentVehicleProfileId || state.activeVehicleId;

        return {
          expenses: data.expenses ? mergeByUpdatedAt(state.expenses, data.expenses) : state.expenses,
          fuelings: data.fuelings ? mergeByUpdatedAt(state.fuelings, data.fuelings) : state.fuelings,
          maintenances: data.maintenances ? mergeByUpdatedAt(state.maintenances, data.maintenances) : state.maintenances,
          importedReports: data.importedReports ? mergeByUpdatedAt(state.importedReports, data.importedReports) : state.importedReports,
          cycles: data.cycles ? mergeByUpdatedAt(state.cycles, data.cycles) : state.cycles,
          vehicles: data.vehicles ? mergeByUpdatedAt(state.vehicles, data.vehicles) : state.vehicles,
          faturamentoLogs: data.faturamentoLogs ? mergeByUpdatedAt(state.faturamentoLogs, data.faturamentoLogs) : state.faturamentoLogs,
          settings: (data.settings?.updated_at && state.settings.updated_at && new Date(data.settings.updated_at) < new Date(state.settings.updated_at)) ? state.settings : newSettings,
          activeVehicleId: newActiveVehicleId,
        };
      }),

      syncData: async () => {
        const { user, syncStatus, setSyncStatus, importData, isSaving } = get();
        
        if (!user || !isSupabaseConfigured) return;
        if (syncStatus === 'syncing' || isSaving) return;

        console.log('[SYNC] Pulling data for user:', user.id);
        setSyncStatus('syncing');
        set({ isSaving: true, syncError: null });

        try {
          // 1. PULL latest data FIRST to reconcile
          const [
            { data: profile, error: errProf },
            { data: dbExpenses, error: errExp },
            { data: dbFuel, error: errFuel },
            { data: dbMaintenance, error: errMaint },
            { data: dbCycles, error: errCyc },
            { data: dbImported, error: errImp },
            { data: dbVehicles, error: errVeh },
            { data: dbFat, error: errFat }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('expenses').select('*').eq('user_id', user.id),
            supabase.from('fuel_logs').select('*').eq('user_id', user.id),
            supabase.from('maintenance_logs').select('*').eq('user_id', user.id),
            supabase.from('cycles').select('*').eq('user_id', user.id),
            supabase.from('imported_reports').select('*').eq('user_id', user.id),
            supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('faturamento_logs').select('*').eq('user_id', user.id)
          ]);

          if (errProf && errProf.code !== 'PGRST116') console.warn('[SYNC] Error pulling profile:', errProf);
          if (errExp) console.warn('[SYNC] Error pulling expenses:', errExp);
          if (errFuel) console.warn('[SYNC] Error pulling fuel_logs:', errFuel);
          if (errMaint) console.warn('[SYNC] Error pulling maintenance_logs:', errMaint);
          if (errCyc) console.warn('[SYNC] Error pulling cycles:', errCyc);
          if (errImp) console.warn('[SYNC] Error pulling imported_reports:', errImp);
          if (errVeh) console.warn('[SYNC] Error pulling vehicles:', errVeh);
          if (errFat) console.warn('[SYNC] Error pulling faturamento_logs:', errFat);

          const remoteData: any = {};

          if (profile) {
            remoteData.settings = {
              name: profile.name,
              dailyGoal: profile.daily_goal,
              vehicle: profile.vehicle || 'Veículo',
              kmPerLiter: profile.km_per_liter,
              fuelPrice: profile.fuel_price,
              activePlatforms: profile.active_platforms || ['uber_car'],
              transportMode: profile.transport_mode || 'car',
              dashboardMode: profile.dashboard_mode || 'merged',
              theme: profile.theme || 'dark',
              photoUrl: profile.photo_url,
              fixedCosts: profile.fixed_costs,
              currentVehicleProfileId: profile.current_vehicle_profile_id,
              updated_at: profile.updated_at
            };
          }

          if (dbVehicles) {
            remoteData.vehicles = dbVehicles.map(v => ({
              id: v.id,
              name: v.name,
              brand: v.brand,
              model: v.model,
              year: v.year,
              plate: v.plate,
              type: v.type,
              category: v.category,
              is_active: v.is_active,
              fixedCosts: {
                vehicleType: v.type,
                insurance: v.insurance,
                ipva: v.ipva,
                oilChange: v.oil_change,
                tires: v.tires,
                maintenance: v.maintenance,
                financing: v.installment,
                rentalPeriod: v.rental_type,
                rentalValue: v.rental_value
              },
              createdAt: v.created_at,
              updated_at: v.updated_at
            }));
          }

          if (dbExpenses) {
            remoteData.expenses = dbExpenses.map(e => ({
              id: e.id,
              date: e.date,
              category: e.category,
              value: Number(e.value),
              description: e.description || '',
              updated_at: e.updated_at
            }));
          }

          if (dbFuel) {
            remoteData.fuelings = dbFuel.map(f => ({
              id: f.id,
              date: f.date,
              liters: Number(f.liters),
              value: Number(f.cost),
              odometer: Number(f.odometer),
              updated_at: f.updated_at
            }));
          }

          if (dbMaintenance) {
            remoteData.maintenances = dbMaintenance.map(m => ({
              id: m.id,
              date: m.date,
              type: m.type,
              value: Number(m.cost),
              currentKm: Number(m.odometer),
              nextChangeKm: Number(m.next_change_km),
              updated_at: m.updated_at
            }));
          }

          if (dbCycles) {
            remoteData.cycles = dbCycles.map(c => ({
              id: c.id,
              user_id: c.user_id,
              start_time: c.start_time,
              end_time: c.end_time,
              uber_amount: Number(c.uber_amount),
              noventanove_amount: Number(c.noventanove_amount),
              indriver_amount: Number(c.indriver_amount),
              extra_amount: Number(c.extra_amount),
              total_amount: Number(c.total_amount),
              fuel_expense: Number(c.fuel_expense || 0),
              food_expense: Number(c.food_expense || 0),
              other_expense: Number(c.other_expense || 0),
              total_expenses: Number(c.total_expenses || 0),
              total_km: Number(c.total_km || 0),
              ride_km: Number(c.ride_km || 0),
              displacement_km: Number(c.displacement_km || 0),
              uber_km: Number(c.uber_km || 0),
              noventanove_km: Number(c.noventanove_km || 0),
              indriver_km: Number(c.indriver_km || 0),
              tracked_km: Number(c.tracked_km || 0),
              tracked_moving_time: Number(c.tracked_moving_time || 0),
              tracked_stopped_time: Number(c.tracked_stopped_time || 0),
              productive_km: Number(c.productive_km || 0),
              idle_km: Number(c.idle_km || 0),
              efficiency_percentage: Number(c.efficiency_percentage || 0),
              driver_score: Number(c.driver_score || 0),
              route_points: c.route_points || [],
              segments: c.segments || [],
              vehicle_id: c.vehicle_id,
              vehicle_name: c.vehicle_name,
              status: c.status,
              updated_at: c.updated_at
            }));
          }

          if (dbImported) {
            remoteData.importedReports = dbImported;
          }

          if (dbFat) {
            remoteData.faturamentoLogs = dbFat;
          }

          console.log('[SYNC] Pull complete:', {
            cycles: remoteData.cycles?.length || 0,
            reports: remoteData.importedReports?.length || 0,
            vehicles: remoteData.vehicles?.length || 0,
            expenses: remoteData.expenses?.length || 0,
            faturamento: remoteData.faturamentoLogs?.length || 0
          });

          // 2. MERGE remote into local
          importData(remoteData);
          console.log('[SYNC] Merge applied');

          // 3. PUSH local state back to Supabase (ensures all devices are in sync)
          const currentStore = get();
          console.log('[SYNC] Pushing local state to cloud...');
          
          const pushPromises = [];
          
          if (currentStore.expenses.length > 0) {
            pushPromises.push(supabase.from('expenses').upsert(currentStore.expenses.map(e => ({
              id: e.id,
              user_id: user.id,
              date: e.date,
              category: e.category,
              value: e.value,
              description: e.description || '',
              updated_at: e.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'expenses' })));
          }

          if (currentStore.fuelings.length > 0) {
            pushPromises.push(supabase.from('fuel_logs').upsert(currentStore.fuelings.map(f => ({
              id: f.id,
              user_id: user.id,
              date: f.date,
              liters: f.liters,
              cost: f.value,
              odometer: f.odometer,
              updated_at: f.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'fuel_logs' })));
          }

          if (currentStore.maintenances.length > 0) {
            pushPromises.push(supabase.from('maintenance_logs').upsert(currentStore.maintenances.map(m => ({
              id: m.id,
              user_id: user.id,
              date: m.date,
              type: m.type,
              cost: m.value,
              odometer: m.currentKm,
              next_change_km: m.nextChangeKm || null,
              updated_at: m.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'maintenance_logs' })));
          }

          if (currentStore.cycles.length > 0) {
            pushPromises.push(supabase.from('cycles').upsert(currentStore.cycles.map(c => ({
              id: c.id,
              user_id: user.id,
              start_time: c.start_time,
              end_time: c.end_time,
              uber_amount: c.uber_amount,
              noventanove_amount: c.noventanove_amount,
              indriver_amount: c.indriver_amount,
              extra_amount: c.extra_amount,
              total_amount: c.total_amount,
              fuel_expense: c.fuel_expense,
              food_expense: c.food_expense,
              other_expense: c.other_expense,
              total_expenses: c.total_expenses,
              total_km: c.total_km,
              ride_km: c.ride_km,
              displacement_km: c.displacement_km,
              uber_km: c.uber_km,
              noventanove_km: c.noventanove_km,
              indriver_km: c.indriver_km,
              tracked_km: c.tracked_km,
              tracked_moving_time: c.tracked_moving_time,
              tracked_stopped_time: c.tracked_stopped_time,
              productive_km: c.productive_km,
              idle_km: c.idle_km,
              efficiency_percentage: c.efficiency_percentage,
              driver_score: c.driver_score,
              route_points: c.route_points || [],
              segments: c.segments || [],
              vehicle_id: c.vehicle_id,
              vehicle_name: c.vehicle_name,
              status: c.status,
              updated_at: c.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'cycles' })));
          }

          if (currentStore.importedReports.length > 0) {
            pushPromises.push(supabase.from('imported_reports').upsert(currentStore.importedReports.map(r => ({
              id: r.id,
              user_id: user.id,
              vehicle_id: r.vehicle_id,
              platform: r.platform,
              report_type: r.report_type,
              period_start: r.period_start,
              period_end: r.period_end,
              total_earnings: r.total_earnings,
              cash_earnings: r.cash_earnings,
              app_earnings: r.app_earnings,
              platform_fee: r.platform_fee,
              promotions: r.promotions,
              taxes: r.taxes,
              requests_count: r.requests_count,
              image_url: r.image_url,
              image_hash: r.image_hash,
              content_fingerprint: r.content_fingerprint,
              source: r.source,
              imported_at: r.imported_at,
              status: r.status,
              confidence_score: r.confidence_score,
              uncertain_fields: r.uncertain_fields || [],
              updated_at: r.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'imported_reports' })));
          }

          if (currentStore.vehicles.length > 0) {
            pushPromises.push(supabase.from('vehicles').upsert(currentStore.vehicles.map(v => ({
              id: v.id,
              user_id: user.id,
              name: v.name,
              brand: v.brand,
              model: v.model,
              year: v.year,
              plate: v.plate,
              type: v.type,
              category: v.category,
              insurance: v.fixedCosts.insurance,
              ipva: v.fixedCosts.ipva,
              oil_change: v.fixedCosts.oilChange,
              tires: v.fixedCosts.tires,
              maintenance: v.fixedCosts.maintenance,
              installment: v.fixedCosts.financing,
              rental_type: v.fixedCosts.rentalPeriod,
              rental_value: v.fixedCosts.rentalValue,
              is_active: v.is_active,
              updated_at: v.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'vehicles' })));
          }

          if (currentStore.faturamentoLogs.length > 0) {
            pushPromises.push(supabase.from('faturamento_logs').upsert(currentStore.faturamentoLogs.map(l => ({
              id: l.id,
              user_id: user.id,
              date: l.date,
              vehicle_mode: l.vehicle_mode,
              uber_amount: l.uber_amount,
              noventanove_amount: l.noventanove_amount,
              indriver_amount: l.indriver_amount,
              extra_amount: l.extra_amount,
              km_total: l.km_total,
              active_hours_total: l.active_hours_total,
              fuel_total: l.fuel_total,
              fuel_price: l.fuel_price,
              fuel_type: l.fuel_type,
              additional_expense: l.additional_expense,
              notes: l.notes || '',
              updated_at: l.updated_at || new Date().toISOString()
            }))).then(res => ({ ...res, table: 'faturamento_logs' })));
          }

          // Push settings to profiles
          pushPromises.push(supabase.from('profiles').upsert({
            id: user.id,
            name: currentStore.settings.name,
            daily_goal: currentStore.settings.dailyGoal,
            vehicle: currentStore.settings.vehicle,
            km_per_liter: currentStore.settings.kmPerLiter,
            fuel_price: currentStore.settings.fuelPrice,
            active_platforms: currentStore.settings.activePlatforms,
            transport_mode: currentStore.settings.transportMode,
            dashboard_mode: currentStore.settings.dashboardMode,
            theme: currentStore.settings.theme,
            photo_url: currentStore.settings.photoUrl || '',
            fixed_costs: currentStore.settings.fixedCosts || {},
            current_vehicle_profile_id: currentStore.settings.currentVehicleProfileId || null,
            updated_at: new Date().toISOString()
          }).then(res => ({ ...res, table: 'profiles' })));

          if (pushPromises.length > 0) {
            const results = await Promise.all(pushPromises);
            const pushErrors = (results as any[]).filter(r => r.error);
            
            if (pushErrors.length > 0) {
              console.error('[SYNC] Errors during push:');
              pushErrors.forEach((err: any, idx: number) => {
                console.error(`Error ${idx + 1} in table "${err.table || 'unknown'}":`, JSON.stringify(err.error, null, 2));
              });
              set({ syncError: 'Erro ao enviar alguns dados' });
            } else {
              console.log('[SYNC] Push successful');
            }
            
            set({ 
              syncStatus: pushErrors.length > 0 ? 'offline' : 'synced'
            });
          } else {
            console.log('[SYNC] Nothing to push');
            set({ syncStatus: 'synced' });
          }

          set({ 
            lastSyncTime: new Date().toISOString(),
            hasSynced: true
          });

          setTimeout(() => {
            if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
          }, 3000);
        } catch (error: any) {
          console.error('[SYNC] error:', error);
          set({ 
            syncError: error.message || 'Erro desconhecido',
            hasSynced: true // Allow user to enter app even if sync fails (e.g. offline)
          });
          setSyncStatus('offline');
        } finally {
          set({ isSaving: false });
        }
      },
      clearData: () => set({
        cycles: [],
        expenses: [],
        fuelings: [],
        maintenances: [],
        importedReports: [],
        faturamentoLogs: [],
        tracking: {
          isActive: false,
          isLoading: false,
          distance: 0,
          productiveDistance: 0,
          idleDistance: 0,
          isProductive: false,
          isManualOverride: false,
          mode: 'stopped',
          tripDetectionState: 'idle',
          avgSpeed: 0,
          currentSmoothedSpeed: 0,
          speedBuffer: [],
          duration: 0,
          movingTime: 0,
          stoppedTime: 0,
          points: [],
          segments: [],
          consecutiveMovingPoints: 0,
          consecutiveStoppedPoints: 0,
          lastPoint: undefined
        },
      }),
      clearCloudData: async () => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return { success: true };
        
        set({ syncStatus: 'syncing' });
        try {
          const { error } = await supabase.rpc('clear_all_user_operational_data');
          if (error) throw error;
          
          set({ syncStatus: 'synced' });
          setTimeout(() => {
            if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
          }, 3000);
          
          return { success: true };
        } catch (error) {
          console.error('[Store] Error clearing cloud data:', error);
          set({ syncStatus: 'offline' });
          return { success: false, error };
        }
      },
    }),
    {
      name: 'driver-dash-storage',
      partialize: (state) => ({
        cycles: state.cycles,
        expenses: state.expenses,
        fuelings: state.fuelings,
        maintenances: state.maintenances,
        importedReports: state.importedReports,
        vehicles: state.vehicles,
        settings: state.settings,
        tracking: state.tracking,
        activeVehicleId: state.activeVehicleId,
        faturamentoLogs: state.faturamentoLogs,
      }),
    }
  )
);
