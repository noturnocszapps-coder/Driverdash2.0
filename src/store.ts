import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriverState, UserSettings, AuthUser, SyncStatus, Cycle, Expense, Fueling, Maintenance } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { calculateDistance } from './utils';

let watchId: number | null = null;

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
        vehicleProfiles: [],
        currentVehicleProfileId: undefined,
      },
      tracking: {
        isActive: false,
        distance: 0,
        productiveDistance: 0,
        idleDistance: 0,
        isProductive: false,
        avgSpeed: 0,
        duration: 0,
        movingTime: 0,
        stoppedTime: 0,
        points: [],
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
          const currentVehicle = settings.vehicleProfiles?.find(v => v.id === settings.currentVehicleProfileId);
          
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
        if (isSaving) return;

        set({ isSaving: true });
        try {
          set((state) => ({
            cycles: state.cycles.map(c => {
              if (c.id === id) {
                const updated = { ...c, ...data };
                updated.total_amount = (updated.uber_amount || 0) + (updated.noventanove_amount || 0) + (updated.indriver_amount || 0) + (updated.extra_amount || 0);
                updated.total_expenses = (updated.fuel_expense || 0) + (updated.food_expense || 0) + (updated.other_expense || 0);
                
                // Calculate displacement KM
                if (updated.total_km !== undefined && updated.ride_km !== undefined) {
                  updated.displacement_km = Math.max(0, updated.total_km - updated.ride_km);
                }
                
                return updated;
              }
              return c;
            })
          }));

          if (user && isSupabaseConfigured) {
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
          }
        } finally {
          set({ isSaving: false });
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

      updateSettings: async (newSettings) => {
        const { user, isSaving, syncData } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          // Update local state immediately
          set((state) => ({ settings: { ...state.settings, ...newSettings } }));
          
          const { settings } = get();
          
          // Ensure active vehicle consistency
          const activeVehicle = settings.vehicleProfiles?.find(v => v.id === settings.currentVehicleProfileId);
          if (activeVehicle && (settings.vehicle !== activeVehicle.name)) {
            set((state) => ({ settings: { ...state.settings, vehicle: activeVehicle.name } }));
          }

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            
            // Prepare update object
            const updateObj: any = {};
            if (newSettings.name !== undefined) updateObj.name = newSettings.name;
            if (newSettings.dailyGoal !== undefined) updateObj.daily_goal = newSettings.dailyGoal;
            if (newSettings.vehicle !== undefined || activeVehicle) updateObj.vehicle = activeVehicle?.name || newSettings.vehicle;
            if (newSettings.kmPerLiter !== undefined) updateObj.km_per_liter = newSettings.kmPerLiter;
            if (newSettings.fuelPrice !== undefined) updateObj.fuel_price = newSettings.fuelPrice;
            if (newSettings.activePlatforms !== undefined) updateObj.active_platforms = newSettings.activePlatforms;
            if (newSettings.transportMode !== undefined) updateObj.transport_mode = newSettings.transportMode;
            if (newSettings.dashboardMode !== undefined) updateObj.dashboard_mode = newSettings.dashboardMode;
            if (newSettings.theme !== undefined) updateObj.theme = newSettings.theme;
            if (newSettings.photoUrl !== undefined) updateObj.photo_url = newSettings.photoUrl;
            if (newSettings.fixedCosts !== undefined) updateObj.fixed_costs = newSettings.fixedCosts;
            if (newSettings.currentVehicleProfileId !== undefined) updateObj.current_vehicle_profile_id = newSettings.currentVehicleProfileId;
            if (newSettings.vehicleProfiles !== undefined) updateObj.vehicle_profiles = newSettings.vehicleProfiles;

            const { error } = await supabase.from('profiles').update(updateObj).eq('id', user.id);
            
            if (error) {
              console.error('[Store] Sync error (settings):', error);
              set({ syncStatus: 'offline' });
            } else {
              set({ syncStatus: 'synced' });
              // Refresh data to be sure
              await syncData();
            }
            
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
      },

      updateTracking: (newTracking) => set((state) => ({
        tracking: { ...state.tracking, ...newTracking }
      })),

      startTracking: () => {
        const { tracking, cycles } = get();
        if (tracking.isActive) return;
        
        const openCycle = cycles.find(c => c.status === 'open');
        if (!openCycle) return;

        if (!navigator.geolocation) {
          console.error('Geolocation not supported');
          return;
        }

        const startTime = Date.now();
        set({
          tracking: {
            isActive: true,
            startTime,
            distance: 0,
            avgSpeed: 0,
            duration: 0,
            movingTime: 0,
            stoppedTime: 0,
            productiveDistance: 0,
            idleDistance: 0,
            isProductive: false,
            points: [],
            lastPoint: undefined
          }
        });

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = position.timestamp || Date.now();
            const newPoint = { lat: latitude, lng: longitude, accuracy, timestamp };
            
            const { tracking: currentTracking } = get();
            if (!currentTracking.isActive) return;

            const lastPoint = currentTracking.lastPoint;
            let newDistance = currentTracking.distance;
            let newMovingTime = currentTracking.movingTime;
            let newStoppedTime = currentTracking.stoppedTime;
            let newProductiveDistance = currentTracking.productiveDistance;
            let newIdleDistance = currentTracking.idleDistance;
            let newIsProductive = currentTracking.isProductive;
            let newLastStopTimestamp = currentTracking.lastStopTimestamp;

            if (lastPoint) {
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
              const timeDiff = timestamp - lastPoint.timestamp;

              // Noise filter
              if (accuracy && accuracy > 50) return;
              
              const speedKmh = timeDiff > 0 ? (dist / (timeDiff / 3600000)) : 0;

              if (dist > 0.005 && speedKmh < 160) { // 5 meters and realistic speed
                newDistance += dist;
                newMovingTime += timeDiff;

                // Classification Logic
                if (speedKmh > 5) {
                  // If we were stopped for > 60s, assume a state change (pickup/dropoff)
                  if (newLastStopTimestamp && (timestamp - newLastStopTimestamp) > 60000) {
                    newIsProductive = !newIsProductive;
                    newLastStopTimestamp = undefined;
                  } else {
                    newLastStopTimestamp = undefined;
                  }

                  if (newIsProductive) {
                    newProductiveDistance += dist;
                  } else {
                    newIdleDistance += dist;
                  }
                }
              } else {
                newStoppedTime += timeDiff;
                if (!newLastStopTimestamp) {
                  newLastStopTimestamp = timestamp;
                }
              }
            }

            const totalDuration = timestamp - (currentTracking.startTime || timestamp);
            const avgSpeed = totalDuration > 0 ? (newDistance / (totalDuration / 3600000)) : 0;

            set({
              tracking: {
                ...currentTracking,
                distance: newDistance,
                movingTime: newMovingTime,
                stoppedTime: newStoppedTime,
                productiveDistance: newProductiveDistance,
                idleDistance: newIdleDistance,
                isProductive: newIsProductive,
                lastStopTimestamp: newLastStopTimestamp,
                duration: totalDuration,
                avgSpeed,
                points: [...currentTracking.points, newPoint],
                lastPoint: newPoint
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

      stopTracking: () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        const { tracking, cycles, updateCycle } = get();
        if (!tracking.isActive) return;

        const openCycle = cycles.find(c => c.status === 'open');
        if (openCycle) {
          const efficiency = tracking.distance > 0 ? (tracking.productiveDistance / tracking.distance) * 100 : 0;
          
          // Calculate driver score (0-100)
          // Factors: efficiency (40%), profit per km (30%), revenue per hour (30%)
          // Simplified for now based on available tracking data
          const score = Math.min(100, Math.round(efficiency));

          updateCycle(openCycle.id, {
            tracked_km: tracking.distance,
            tracked_moving_time: tracking.movingTime,
            tracked_stopped_time: tracking.stoppedTime,
            productive_km: tracking.productiveDistance,
            idle_km: tracking.idleDistance,
            efficiency_percentage: efficiency,
            driver_score: score,
            route_points: tracking.points
          });
        }

        set({
          tracking: {
            ...tracking,
            isActive: false,
            endTime: Date.now()
          }
        });
      },

      importData: (data) => set((state) => {
        const mergeById = (local: any[], incoming: any[]) => {
          const map = new Map(local.map(item => [item.id, item]));
          incoming.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        return {
          expenses: data.expenses ? mergeById(state.expenses, data.expenses) : state.expenses,
          fuelings: data.fuelings ? mergeById(state.fuelings, data.fuelings) : state.fuelings,
          maintenances: data.maintenances ? mergeById(state.maintenances, data.maintenances) : state.maintenances,
          importedReports: data.importedReports ? mergeById(state.importedReports, data.importedReports) : state.importedReports,
          cycles: data.cycles ? mergeById(state.cycles, data.cycles) : state.cycles,
          settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
        };
      }),

      syncData: async () => {
        const { user, syncStatus, setSyncStatus, importData, expenses, fuelings, maintenances, settings, cycles, isSaving, hasSynced } = get();
        
        if (!user || !isSupabaseConfigured) return;
        if (syncStatus === 'syncing' || isSaving) return;

        setSyncStatus('syncing');
        set({ isSaving: true });

        try {
          // 1. Pull latest data first
          const [
            { data: profile },
            { data: dbExpenses },
            { data: dbFuel },
            { data: dbMaintenance },
            { data: dbCycles },
            { data: dbImported }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('expenses').select('*').eq('user_id', user.id),
            supabase.from('fuel_logs').select('*').eq('user_id', user.id),
            supabase.from('maintenance_logs').select('*').eq('user_id', user.id),
            supabase.from('cycles').select('*').eq('user_id', user.id),
            supabase.from('imported_reports').select('*').eq('user_id', user.id)
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
              currentVehicleProfileId: profile.current_vehicle_profile_id,
              vehicleProfiles: profile.vehicle_profiles || []
            };

            // If no vehicle profiles exist even in cloud, create one
            if (!importedData.settings.vehicleProfiles || importedData.settings.vehicleProfiles.length === 0) {
              const defaultProfile = {
                id: crypto.randomUUID(),
                name: importedData.settings.vehicle || 'Meu Veículo',
                brand: '',
                model: '',
                year: '',
                type: 'owned',
                category: importedData.settings.transportMode || 'car',
                fixedCosts: importedData.settings.fixedCosts || { vehicleType: 'owned' },
                createdAt: new Date().toISOString()
              };
              importedData.settings.vehicleProfiles = [defaultProfile];
              importedData.settings.currentVehicleProfileId = defaultProfile.id;
              
              await supabase.from('profiles').update({
                vehicle_profiles: [defaultProfile],
                current_vehicle_profile_id: defaultProfile.id
              }).eq('id', user.id);
            }
          } else {
            // New user - create profile
            const defaultProfile = {
              id: crypto.randomUUID(),
              name: settings.vehicle || 'Meu Veículo',
              brand: '',
              model: '',
              year: '',
              type: 'owned',
              category: settings.transportMode || 'car',
              fixedCosts: settings.fixedCosts || { vehicleType: 'owned' },
              createdAt: new Date().toISOString()
            };

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
              current_vehicle_profile_id: defaultProfile.id,
              vehicle_profiles: [defaultProfile]
            };

            await supabase.from('profiles').upsert(initialSettings);
            importedData.settings = {
              ...settings,
              vehicleProfiles: [defaultProfile],
              currentVehicleProfileId: defaultProfile.id
            };
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
              vehicle_id: c.vehicle_id,
              vehicle_name: c.vehicle_name,
              status: c.status
            }));
          }

          if (dbImported) {
            importedData.importedReports = dbImported;
          }

          // 2. Push local data (only if not first sync or if local data is present)
          if (expenses.length > 0) {
            await supabase.from('expenses').upsert(expenses.map(e => ({
              id: e.id,
              user_id: user.id,
              date: e.date,
              category: e.category,
              value: e.value,
              description: e.description
            })));
          }

          if (fuelings.length > 0) {
            await supabase.from('fuel_logs').upsert(fuelings.map(f => ({
              id: f.id,
              user_id: user.id,
              date: f.date,
              liters: f.liters,
              cost: f.value,
              odometer: f.odometer
            })));
          }

          if (maintenances.length > 0) {
            await supabase.from('maintenance_logs').upsert(maintenances.map(m => ({
              id: m.id,
              user_id: user.id,
              date: m.date,
              type: m.type,
              cost: m.value,
              odometer: m.currentKm,
              next_change_km: m.nextChangeKm
            })));
          }

          if (cycles.length > 0) {
            await supabase.from('cycles').upsert(cycles.map(c => ({
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
              vehicle_id: c.vehicle_id,
              vehicle_name: c.vehicle_name,
              status: c.status
            })));
          }

          if (get().importedReports.length > 0) {
            await supabase.from('imported_reports').upsert(get().importedReports);
          }

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
          distance: 0,
          productiveDistance: 0,
          idleDistance: 0,
          isProductive: false,
          avgSpeed: 0,
          duration: 0,
          movingTime: 0,
          stoppedTime: 0,
          points: [],
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
        settings: state.settings,
        tracking: state.tracking,
      }),
    }
  )
);
