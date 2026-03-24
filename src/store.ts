import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriverState, UserSettings, AuthUser, SyncStatus, Cycle, Expense, Fueling, Maintenance } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { calculateDistance, safeNumber } from './utils';

let watchId: number | null = null;

const TRACKING_CONFIG = {
  MIN_POINTS_SEARCHING: 4,
  MIN_POINTS_TRIP: 6,
  MIN_SPEED_VALID: 5, // km/h
  STOP_BUFFER_MS: 120000, // 120 seconds for traffic lights/short stops
  MIN_DIST_PRECISION: 0.02, // 20 meters
  MAX_SPEED_NOISE: 160, // km/h
  DRIFT_SPEED_THRESHOLD: 3, // km/h
  WARMUP_POINTS_REQUIRED: 5,
};

const ACTIVE_VEHICLE_KEY = 'driverdash_active_vehicle_id';

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      user: null,
      syncStatus: 'idle',
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
      settings: {
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
      },
      tracking: {
        isActive: false,
        isLoading: false,
        distance: 0,
        productiveDistance: 0,
        idleDistance: 0,
        isProductive: false,
        isManualOverride: false,
        avgSpeed: 0,
        duration: 0,
        movingTime: 0,
        stoppedTime: 0,
        points: [],
        segments: [],
        consecutiveMovingPoints: 0,
        mode: 'stopped',
        tripDetectionState: 'idle'
      },
      isSaving: false,
      setUser: (user) => set({ user }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      
      startCycle: async () => {
        const { user, cycles, settings, isSaving } = get();
        if (isSaving) return cycles.find(c => c.status === 'open')?.id || '';
        
        const openCycle = cycles.find(c => c.status === 'open');
        if (openCycle) return openCycle.id;

        set({ isSaving: true });
        try {
          const { vehicles } = get();
          const currentVehicle = vehicles.find(v => v.id === settings.currentVehicleProfileId);
          
          const vehicleSnapshot = {
            id: settings.currentVehicleProfileId || 'default',
            name: currentVehicle?.name || settings.vehicle,
            fixedCosts: currentVehicle?.fixedCosts || settings.fixedCosts || { vehicleType: 'owned' },
            kmPerLiter: settings.kmPerLiter,
            fuelPrice: settings.fuelPrice
          };

          const id = crypto.randomUUID();
          const newCycle = {
            id,
            user_id: user?.id || '',
            start_time: new Date().toISOString(),
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
            vehicle_id: settings.currentVehicleProfileId,
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
        const { user, isSaving } = get();
        if (isSaving) return '';

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const newCycle = {
            ...cycle,
            id,
            user_id: user?.id || '',
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
              c.id === id ? { ...c, status: 'closed', end_time: endTime } : c
            )
          }));

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('cycles')
              .update({ status: 'closed', end_time: endTime })
              .eq('id', id);
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
              const updated = { ...c, ...data };
              
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
              .eq('id', id);
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
          const newExpense = { ...expense, id };
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
          const newFueling = { ...fueling, id };
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
          const newMaintenance = { ...maintenance, id };
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
        const { user, settings, isSaving, addCycle } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newReport = { 
            ...report, 
            id, 
            user_id: user?.id || '', 
            imported_at: now,
            vehicle_id: settings.currentVehicleProfileId,
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
              vehicle_id: settings.currentVehicleProfileId,
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
            const { error } = await supabase.from('cycles').delete().eq('id', id);
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
            const { error } = await supabase.from('imported_reports').delete().eq('id', id);
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
            is_active: false
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
          const dbUpdates: any = {};
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

          const { error } = await supabase.from('vehicles').update(dbUpdates).eq('id', id);
          if (error) throw error;

          set((state) => ({
            vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates } : v)
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
          const { error } = await supabase.from('vehicles').delete().eq('id', id);
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
        updateTracking({ isProductive: true, mode: 'on_trip', tripDetectionState: 'trip_started', isManualOverride: true });
        console.log('[TRACKING] Trip iniciada (manual)');
      },

      endTrip: () => {
        const { updateTracking } = get();
        updateTracking({ isProductive: false, mode: 'searching', tripDetectionState: 'idle', isManualOverride: true });
        console.log('[TRACKING] Trip encerrada (manual)');
      },

      startTracking: () => {
        const { tracking, cycles } = get();
        if (tracking.isActive) return;
        
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
            duration: 0,
            movingTime: 0,
            stoppedTime: 0,
            productiveDistance: 0,
            idleDistance: 0,
            isProductive: false,
            isManualOverride: false,
            isWarmingUp: true,
            points: [],
            segments: [],
            consecutiveMovingPoints: 0,
            mode: 'stopped',
            tripDetectionState: 'idle',
            lastPoint: undefined
          }
        });

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { tracking: currentTracking } = get();
            if (!currentTracking.isActive) return;

            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = position.timestamp || Date.now();
            const lastPoint = currentTracking.lastPoint;

            let speedKmh = 0;
            if (position.coords.speed !== null && position.coords.speed !== undefined) {
              speedKmh = position.coords.speed * 3.6;
            } else if (lastPoint) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, latitude, longitude);
              const timeDiff = Math.max(1, (timestamp - lastPoint.timestamp) / 1000);
              speedKmh = (dist / timeDiff) * 3600;
            }

            if (!Number.isFinite(speedKmh) || speedKmh > 160) {
              speedKmh = 0;
            }
            
            console.log(`[TRACKING] ponto recebido: lat=${latitude}, lng=${longitude}, speed=${speedKmh.toFixed(1)}km/h, accuracy=${accuracy?.toFixed(1)}m`);

            const newPoint = { 
              lat: latitude, 
              lng: longitude, 
              accuracy, 
              timestamp, 
              speed: speedKmh,
              isProductive: currentTracking.isProductive 
            };

            let newDistance = currentTracking.distance;
            let newMovingTime = currentTracking.movingTime;
            let newStoppedTime = currentTracking.stoppedTime;
            let newProductiveDistance = currentTracking.productiveDistance;
            let newIdleDistance = currentTracking.idleDistance;
            let newIsProductive = currentTracking.isProductive;
            let newIsManualOverride = currentTracking.isManualOverride;
            let newLastStopTimestamp = currentTracking.lastStopTimestamp;
            let newMode = currentTracking.mode;
            let newTripDetectionState = currentTracking.tripDetectionState;
            let newConsecutiveMovingPoints = currentTracking.consecutiveMovingPoints;
            let newSegments = [...(currentTracking.segments || [])];
            let newIsWarmingUp = currentTracking.isWarmingUp;

            if (lastPoint) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
              const timeDiff = timestamp - lastPoint.timestamp;

              // Noise filter: ignore points with low accuracy
              if (accuracy && accuracy > 50) {
                console.log('[TRACKING] ponto ignorado: baixa precisão');
                return;
              }
              
              // PATCH 1: Precision Rules
              // 1. Ignore micro variations (< 20m)
              // 2. Ignore drift when stationary (< 3km/h)
              // 3. Ignore noise/impossible jumps (> 160km/h)
              if (dist >= TRACKING_CONFIG.MIN_DIST_PRECISION && speedKmh >= TRACKING_CONFIG.DRIFT_SPEED_THRESHOLD && speedKmh <= TRACKING_CONFIG.MAX_SPEED_NOISE) {
                newMovingTime += timeDiff;
                newLastStopTimestamp = undefined;
                newConsecutiveMovingPoints++;

                // --- Semi-Automatic Heuristics ---
                if (!newIsManualOverride) {
                  // 1. Pickup Candidate Detection: Moving consistently > MIN_SPEED_VALID
                  if (newMode !== 'on_trip' && speedKmh > TRACKING_CONFIG.MIN_SPEED_VALID && newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_SEARCHING) {
                    if (newTripDetectionState === 'idle') {
                      newTripDetectionState = 'pickup_candidate';
                    }
                  }

                  // 2. Trip Started Detection: If we were a candidate and keep moving
                  if (newTripDetectionState === 'pickup_candidate' && speedKmh > TRACKING_CONFIG.MIN_SPEED_VALID && newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_TRIP) {
                    newIsProductive = true;
                    newMode = 'on_trip';
                    newTripDetectionState = 'trip_started';
                  }
                }

                // Classification Logic
                if (newIsProductive) {
                  newProductiveDistance += dist;
                  newMode = 'on_trip';
                } else {
                  newIdleDistance += dist;
                  newMode = 'searching';
                }
                
                // Total distance is strictly the sum of productive and idle
                newDistance = newProductiveDistance + newIdleDistance;
                console.log(`[TRACKING] km atualizado: total=${newDistance.toFixed(2)}km, prod=${newProductiveDistance.toFixed(2)}km, idle=${newIdleDistance.toFixed(2)}km`);
              } else {
                // Stationary or noise
                newStoppedTime += timeDiff;
                newConsecutiveMovingPoints = 0;
                
                if (speedKmh < TRACKING_CONFIG.DRIFT_SPEED_THRESHOLD) {
                  // If we were on a trip, we don't immediately switch to 'stopped' mode
                  // unless it's a long stop. This keeps the context.
                  if (newMode !== 'on_trip' || (newLastStopTimestamp && (timestamp - newLastStopTimestamp) > 30000)) {
                    newMode = 'stopped';
                  }
                  
                  if (!newLastStopTimestamp) {
                    newLastStopTimestamp = timestamp;
                  }
                }
                
                // Heuristics for stopping
                if (!newIsManualOverride) {
                  // If stopped for > 45s while on_trip, it might be a dropoff candidate
                  if (newMode === 'on_trip' && (timestamp - (newLastStopTimestamp || timestamp)) > 45000) {
                     newTripDetectionState = 'dropoff_candidate';
                     // After STOP_BUFFER_MS total stop, confirm dropoff
                     if ((timestamp - (newLastStopTimestamp || timestamp)) > TRACKING_CONFIG.STOP_BUFFER_MS) {
                       newIsProductive = false;
                       newMode = 'stopped';
                       newTripDetectionState = 'idle';
                     }
                  }
                }
              }
            }

            // Warm-up logic: check if we have enough points and some movement
            const points = [...currentTracking.points, newPoint];
            if (newIsWarmingUp && points.length >= TRACKING_CONFIG.WARMUP_POINTS_REQUIRED) {
              const movingPoints = points.filter(p => (p.speed || 0) > TRACKING_CONFIG.MIN_SPEED_VALID);
              if (movingPoints.length >= 2) {
                newIsWarmingUp = false;
              }
            }

            // --- Segment Management ---
            if (newMode !== currentTracking.mode || newSegments.length === 0) {
              // Close current segment if exists
              if (newSegments.length > 0) {
                const lastIdx = newSegments.length - 1;
                newSegments[lastIdx] = {
                  ...newSegments[lastIdx],
                  endTime: timestamp,
                  endLat: latitude,
                  endLng: longitude,
                  endLocation: { lat: latitude, lng: longitude }
                };
              }
              
              // Start new segment
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
              // Update current segment
              const lastIdx = newSegments.length - 1;
              const dist = lastPoint ? calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng) : 0;
              const currentSeg = newSegments[lastIdx];
              
              // Only add distance if it meets the precision threshold (0.02km)
              const validDist = dist >= 0.02 ? dist : 0;
              
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
            
            // Update point with the classified state
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
                segments: newSegments,
                points,
                duration: totalDuration,
                avgSpeed
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
          segments: [...(openCycle.segments || []), ...tracking.segments]
        } : null;

        // 2. Reset tracking state IMMEDIATELY to prevent double counting in UI
        set({
          tracking: {
            isActive: false,
            isLoading: false,
            distance: 0,
            avgSpeed: 0,
            duration: 0,
            movingTime: 0,
            stoppedTime: 0,
            productiveDistance: 0,
            idleDistance: 0,
            isProductive: false,
            isManualOverride: false,
            mode: 'stopped',
            tripDetectionState: 'idle',
            points: [],
            segments: [],
            consecutiveMovingPoints: 0,
            lastPoint: undefined,
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
        const mergeById = (local: any[], incoming: any[]) => {
          const map = new Map(local.map(item => [item.id, item]));
          incoming.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        const newSettings = data.settings ? { ...state.settings, ...data.settings } : state.settings;
        const newActiveVehicleId = data.settings?.currentVehicleProfileId || state.activeVehicleId;

        return {
          expenses: data.expenses ? mergeById(state.expenses, data.expenses) : state.expenses,
          fuelings: data.fuelings ? mergeById(state.fuelings, data.fuelings) : state.fuelings,
          maintenances: data.maintenances ? mergeById(state.maintenances, data.maintenances) : state.maintenances,
          importedReports: data.importedReports ? mergeById(state.importedReports, data.importedReports) : state.importedReports,
          cycles: data.cycles ? mergeById(state.cycles, data.cycles) : state.cycles,
          vehicles: data.vehicles ? mergeById(state.vehicles, data.vehicles) : state.vehicles,
          settings: newSettings,
          activeVehicleId: newActiveVehicleId,
        };
      }),

      syncData: async () => {
        const { user, syncStatus, setSyncStatus, importData, expenses, fuelings, maintenances, settings, cycles, isSaving, hasSynced, importedReports, vehicles } = get();
        
        if (!user || !isSupabaseConfigured) return;
        if (syncStatus === 'syncing' || isSaving) return;

        setSyncStatus('syncing');
        set({ isSaving: true });

        try {
          // 1. PUSH local data FIRST to ensure Supabase has the latest
          // This prevents local fresh data from being overwritten by stale cloud data
          if (hasSynced) {
            const pushPromises = [];
            
            if (expenses.length > 0) {
              pushPromises.push(supabase.from('expenses').upsert(expenses.map(e => ({
                id: e.id,
                user_id: user.id,
                date: e.date,
                category: e.category,
                value: e.value,
                description: e.description
              }))));
            }

            if (fuelings.length > 0) {
              pushPromises.push(supabase.from('fuel_logs').upsert(fuelings.map(f => ({
                id: f.id,
                user_id: user.id,
                date: f.date,
                liters: f.liters,
                cost: f.value,
                odometer: f.odometer
              }))));
            }

            if (maintenances.length > 0) {
              pushPromises.push(supabase.from('maintenance_logs').upsert(maintenances.map(m => ({
                id: m.id,
                user_id: user.id,
                date: m.date,
                type: m.type,
                cost: m.value,
                odometer: m.currentKm,
                next_change_km: m.nextChangeKm
              }))));
            }

            if (cycles.length > 0) {
              pushPromises.push(supabase.from('cycles').upsert(cycles.map(c => ({
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
                route_points: c.route_points,
                segments: c.segments,
                vehicle_id: c.vehicle_id,
                vehicle_name: c.vehicle_name,
                status: c.status
              }))));
            }

            if (importedReports.length > 0) {
              pushPromises.push(supabase.from('imported_reports').upsert(importedReports.map(r => ({ ...r, user_id: user.id }))));
            }

            if (pushPromises.length > 0) {
              await Promise.all(pushPromises);
            }
          }

          // 2. PULL latest data SECOND
          const [
            { data: profile },
            { data: dbExpenses },
            { data: dbFuel },
            { data: dbMaintenance },
            { data: dbCycles },
            { data: dbImported },
            { data: dbVehicles }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('expenses').select('*').eq('user_id', user.id),
            supabase.from('fuel_logs').select('*').eq('user_id', user.id),
            supabase.from('maintenance_logs').select('*').eq('user_id', user.id),
            supabase.from('cycles').select('*').eq('user_id', user.id),
            supabase.from('imported_reports').select('*').eq('user_id', user.id),
            supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
          ]);

          const importedData: any = {};

          if (profile) {
            importedData.settings = {
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
              currentVehicleProfileId: profile.current_vehicle_profile_id
            };
          } else {
            // New user - create profile
            const initialSettings = {
              id: user.id,
              name: settings.name || user.email.split('@')[0],
              daily_goal: settings.dailyGoal,
              vehicle: settings.vehicle,
              km_per_liter: settings.kmPerLiter,
              fuel_price: settings.fuelPrice,
              active_platforms: settings.activePlatforms,
              transport_mode: settings.transportMode,
              dashboard_mode: settings.dashboardMode,
              fixed_costs: settings.fixedCosts,
              current_vehicle_profile_id: settings.currentVehicleProfileId
            };

            await supabase.from('profiles').upsert(initialSettings);
            importedData.settings = { ...settings };
          }

          if (dbVehicles) {
            importedData.vehicles = dbVehicles.map(v => ({
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
          }

          if (dbExpenses) {
            importedData.expenses = dbExpenses.map(e => ({
              id: e.id,
              date: e.date,
              category: e.category,
              value: Number(e.value),
              description: e.description || ''
            }));
          }

          if (dbFuel) {
            importedData.fuelings = dbFuel.map(f => ({
              id: f.id,
              date: f.date,
              liters: Number(f.liters),
              value: Number(f.cost),
              odometer: Number(f.odometer)
            }));
          }

          if (dbMaintenance) {
            importedData.maintenances = dbMaintenance.map(m => ({
              id: m.id,
              date: m.date,
              type: m.type,
              value: Number(m.cost),
              currentKm: Number(m.odometer),
              nextChangeKm: Number(m.next_change_km)
            }));
          }

          if (dbCycles) {
            importedData.cycles = dbCycles.map(c => ({
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
              status: c.status
            }));
          }

          if (dbImported) {
            importedData.importedReports = dbImported;
          }

          // 3. IMPORT data into local state
          importData(importedData);
          set({ hasSynced: true });
          setSyncStatus('synced');
          setTimeout(() => {
            if (get().syncStatus === 'synced') setSyncStatus('idle');
          }, 3000);

        } catch (err) {
          console.error('[Store] Full sync error:', err);
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
          duration: 0,
          movingTime: 0,
          stoppedTime: 0,
          points: [],
          segments: [],
          consecutiveMovingPoints: 0
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
      }),
    }
  )
);
