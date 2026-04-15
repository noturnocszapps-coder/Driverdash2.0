import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriverState, UserSettings, AuthUser, SyncStatus, Cycle, Expense, Fueling, Maintenance, FaturamentoLog, TripAnalytics, UserRole, UserStatus, TrackingSession, DriverPerformanceRecord, DriverProfile, GPSStatus, PlanType, StopPoint, AdminStats } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { calculateDistance, safeNumber } from './utils';
import { toast } from 'sonner';
import { evaluateCurrentTrip } from './lib/tripAnalytics';
import { evaluateZoneQuality } from './lib/zoneAnalytics';

let watchId: number | null = null;
let gpsHealthTimeout: NodeJS.Timeout | null = null;

const TRACKING_CONFIG = {
  MIN_POINTS_SEARCHING: 3,
  MIN_POINTS_TRIP: 6,
  MIN_SPEED_START: 12, // km/h (Início automático)
  MIN_SPEED_STOP: 3, // km/h
  STOP_BUFFER_MS: 120000, // 120 segundos para fim real
  MIN_DIST_PRECISION: 0.01, // 10 metros
  MAX_SPEED_NOISE: 160, // km/h
  DRIFT_SPEED_THRESHOLD: 2.5, // km/h
  WARMUP_POINTS_REQUIRED: 5,
  MAX_ACCURACY: 35, // metros
  SPEED_BUFFER_SIZE: 5,
  MIN_TRIP_DISPLACEMENT: 0.20, // 200 metros para confirmar transição
  MANUAL_OVERRIDE_TIMEOUT: 300000, // 5 minutos
  TRANSITION_WINDOW_MS: 70000, // 70 segundos para corridas seguidas
  TRAFFIC_LIGHT_MAX_MS: 90000, // 90 segundos
  MIN_STOP_DURATION_MS: 30000, // 30 segundos para registrar como parada real (evita semáforos curtos)
  STOP_DETECTION_DEBOUNCE_POINTS: 6, // 6 pontos consecutivos (~30s) parados antes de iniciar contagem
  WAITING_PASSENGER_MS: 120000, // 120 segundos
  WAITING_PASSENGER_DIST: 0.08, // 80 metros
  GPS_HEALTH_CHECK_MS: 20000, // Aumentado para 20 segundos para dar mais tempo no início
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
  isPrivacyMode: false,
  keepScreenOn: false,
  voiceEnabled: true,
  voiceCommandsEnabled: true,
  voiceVerbosity: 'normal',
  voiceVolume: 1,
  fixedCosts: {
    vehicleType: 'owned',
  },
  currentVehicleProfileId: undefined,
  role: UserRole.DRIVER,
  status: UserStatus.ACTIVE,
  phone: '',
  city: '',
  mainPlatform: 'Uber',
  bio: '',
  onboardingCompleted: false,
  isPro: false,
  uiMode: 'simple',
  quickActions: ['gain', 'expense', 'reports', 'map'],
};

const INITIAL_TRACKING: TrackingSession = {
  isActive: false,
  isLoading: false,
  gpsStatus: 'idle',
  distance: 0,
  productiveDistance: 0,
  idleDistance: 0,
  productiveTime: 0,
  idleTime: 0,
  isProductive: false,
  isManualOverride: false,
  isPaused: false,
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
  stopPoints: [],
  mode: 'idle' as const,
  tripDetectionState: 'idle' as const,
  stopReason: 'none' as const,
  lastStopLocation: undefined,
  tripAnalytics: undefined,
  zoneAnalytics: undefined,
  hasActiveInsight: false,
  hudState: 'expanded',
  lastAlerts: {},
};

const INITIAL_DRIVER_PROFILE: DriverProfile = {
  avgProfitPerHour: 0,
  avgProfitPerKm: 0,
  bestHours: [],
  worstHours: [],
  bestRegions: [],
  worstRegions: [],
  totalRides: 0,
  mapsViewed: 0,
  lastUpdated: new Date().toISOString(),
  score: 0,
  badges: []
};

const ACTIVE_VEHICLE_KEY = 'driverdash_active_vehicle_id';

const INITIAL_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  totalCycles: 0,
  totalVehicles: 0,
  systemUptime: '100%',
  lastUpdate: new Date().toISOString()
};

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
      hasOpenCycle: false,
      expenses: [],
      fuelings: [],
      maintenances: [],
      importedReports: [],
      vehicles: [],
      performanceRecords: [],
      driverProfile: INITIAL_DRIVER_PROFILE,
      adminStats: INITIAL_ADMIN_STATS,
      allUsers: [],
      systemLogs: [],
      globalConfigs: [],
      mapMarkers: [],
      routes: [],
      activeVehicleId: undefined,
      settings: INITIAL_SETTINGS,
      tracking: INITIAL_TRACKING,
      isWatching: false,
      financialEntries: [],
      isSaving: false,
      isQuickActionsOpen: false,
      isPaywallOpen: false,
      plan: (localStorage.getItem('driverdash_plan') as PlanType) || 'free',
      postTripActionSheet: { isOpen: false },
      miniMapOpen: false,
      voiceState: {
        isListening: false,
      },
      userLearning: {
        consecutiveIgnores: 0,
        isSilentMode: false,
        acceptedSuggestions: 0,
        ignoredSuggestions: 0,
        editedValues: 0,
        ignoredTypes: {},
      },
      
      setQuickActionsOpen: (isOpen) => set({ isQuickActionsOpen: isOpen }),
      setPaywallOpen: (isOpen) => set({ isPaywallOpen: isOpen }),
      setPlan: (plan) => {
        localStorage.setItem('driverdash_plan', plan);
        set({ plan });
      },
      fetchAdminStats: async () => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;

        try {
          // Fetch total cycles
          const { count: cycleCount, error: cycleError } = await supabase
            .from('cycles')
            .select('*', { count: 'exact', head: true });
          
          // Fetch total vehicles
          const { count: vehicleCount, error: vehicleError } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true });

          // Fetch total users (if profiles table exists)
          let userCount = 0;
          const { count: profilesCount, error: profilesError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          
          if (!profilesError) {
            userCount = profilesCount || 0;
          } else {
            // Fallback: try to count unique user_ids in cycles if profiles is not accessible
            const { data: uniqueUsers, error: uniqueError } = await supabase
              .from('cycles')
              .select('user_id');
            
            if (!uniqueError && uniqueUsers) {
              const uniqueIds = new Set(uniqueUsers.map(u => u.user_id));
              userCount = uniqueIds.size;
            }
          }

          set({
            adminStats: {
              totalUsers: userCount || 1, // At least 1 (the current user)
              totalCycles: cycleCount || 0,
              totalVehicles: vehicleCount || 0,
              systemUptime: '99.9%',
              lastUpdate: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('[ADMIN] Error fetching stats:', error);
        }
      },
      fetchAllUsers: async () => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) throw error;
          set({ allUsers: data || [] });
        } catch (error) {
          console.error('[ADMIN] Error fetching users:', error);
          toast.error('Erro ao buscar usuários');
        }
      },
      updateUserRole: async (userId, role) => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
          if (error) throw error;
          toast.success('Role atualizada com sucesso');
          get().fetchAllUsers();
        } catch (error) {
          console.error('[ADMIN] Error updating role:', error);
          toast.error('Erro ao atualizar role');
        }
      },
      updateUserStatus: async (userId, status) => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
          if (error) throw error;
          toast.success('Status atualizado com sucesso');
          get().fetchAllUsers();
        } catch (error) {
          console.error('[ADMIN] Error updating status:', error);
          toast.error('Erro ao atualizar status');
        }
      },
      fetchSystemLogs: async () => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase.from('system_logs').select('*').order('timestamp', { ascending: false }).limit(100);
          if (error) {
            set({ systemLogs: [
              { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Sistema iniciado' },
              { id: '2', timestamp: new Date().toISOString(), level: 'warn', message: 'Tentativa de acesso negada' }
            ]});
            return;
          }
          set({ systemLogs: data || [] });
        } catch (error) {
          console.error('[ADMIN] Error fetching logs:', error);
        }
      },
      updateGlobalConfig: async (key, value) => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { error } = await supabase.from('global_configs').upsert({ key, value, updated_at: new Date().toISOString() });
          if (error) throw error;
          toast.success('Configuração atualizada');
          get().loadGlobalConfigs();
        } catch (error) {
          console.error('[ADMIN] Error updating config:', error);
          toast.error('Erro ao atualizar configuração');
        }
      },
      loadGlobalConfigs: async () => {
        const { settings, user } = get();
        if (settings.role !== UserRole.ADMIN || !user || !isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase.from('global_configs').select('*');
          if (error) throw error;
          set({ globalConfigs: data || [] });
        } catch (error) {
          console.error('[ADMIN] Error loading configs:', error);
        }
      },
      setPostTripActionSheet: (data) => set((state) => ({
        postTripActionSheet: { ...state.postTripActionSheet, ...data }
      })),
      setMiniMapOpen: (isOpen) => set({ miniMapOpen: isOpen }),
      setHudState: (hudState) => set((state) => ({
        tracking: { ...state.tracking, hudState }
      })),
      triggerAlert: (type, severity, message) => {
        const { tracking, userLearning } = get();
        const now = Date.now();
        const lastAlerts = tracking.lastAlerts || {};
        const lastAlertTime = lastAlerts[type] || 0;
        
        // General insight cooldown (min 15s between any insights)
        const lastAnyAlertTime = Math.max(...Object.values(lastAlerts), 0);
        if (severity !== 'critical' && now - lastAnyAlertTime < 15000) return;

        // Specific type cooldown logic
        const cooldowns: Record<string, number> = {
          critical: 15000, // 15s for critical (reduced from 30s for responsiveness)
          important: 60000, // 1m
          silent: 300000, // 5m
        };

        // Prevent duplicate consecutive messages or cooldown violation
        if (now - lastAlertTime < (cooldowns[severity] || 60000)) return;
        if (tracking.lastAlertMessage === message) return;

        // Silent mode logic
        if (userLearning.isSilentMode && severity !== 'critical') return;

        // Update last alert info
        set(state => ({
          tracking: {
            ...state.tracking,
            lastAlertMessage: message,
            lastAlerts: {
              ...lastAlerts,
              [type]: now
            }
          }
        }));

        // Hierarchy:
        // 1. Critical -> Toast + HUD
        // 2. Important -> HUD only (via tracking state update)
        // 3. Silent -> Log only
        
        if (severity === 'critical') {
          toast.error(message, { 
            duration: 8000,
            description: 'Ação imediata recomendada.'
          });
        } else if (severity === 'important') {
          // Important alerts are shown in the HUD via the tracking session state
          // which is already updated above with lastAlertMessage
          console.log(`[HUD Alert] ${message}`);
        } else {
          console.log(`[Silent Alert] ${message}`);
        }
      },
      
      setVoiceListening: (isListening) => set((state) => ({
        voiceState: { ...state.voiceState, isListening }
      })),

      speak: (text: string) => {
        const { settings } = get();
        if (!settings.voiceEnabled || !window.speechSynthesis) return;
        
        // Cancel current speaking
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.volume = settings.voiceVolume || 1;
        utterance.rate = 1;
        
        window.speechSynthesis.speak(utterance);
        
        set((state) => ({
          voiceState: {
            ...state.voiceState,
            lastSpokenMessage: text,
            lastSpokenAt: Date.now()
          }
        }));
      },
      
      setLastSpoken: (message) => set((state) => ({
        voiceState: { 
          ...state.voiceState, 
          lastSpokenMessage: message,
          lastSpokenAt: Date.now()
        }
      })),

      setCopilotFeedback: (message, type, duration = 3000) => {
        const timestamp = Date.now();
        set((state) => ({
          tracking: {
            ...state.tracking,
            copilotFeedback: { message, type, timestamp }
          }
        }));

        if (duration > 0) {
          setTimeout(() => {
            const current = get().tracking.copilotFeedback;
            if (current && current.timestamp === timestamp) {
              set((state) => ({
                tracking: {
                  ...state.tracking,
                  copilotFeedback: undefined
                }
              }));
            }
          }, duration);
        }
      },

      updateUserLearning: (action, type) => set((state) => {
        const learning = { ...state.userLearning };
        if (action === 'accept') {
          learning.acceptedSuggestions++;
          learning.consecutiveIgnores = 0;
          learning.isSilentMode = false;
        } else if (action === 'ignore') {
          learning.ignoredSuggestions++;
          learning.consecutiveIgnores++;
          
          if (type) {
            learning.ignoredTypes[type] = (learning.ignoredTypes[type] || 0) + 1;
          }
          
          if (learning.consecutiveIgnores >= 3) {
            learning.isSilentMode = true;
          }
        } else if (action === 'edit') {
          learning.editedValues++;
        }
        return { userLearning: learning };
      }),

      addMapMarker: async (markerData) => {
        const { user } = get();
        
        const newMarker = {
          ...markerData,
          id: crypto.randomUUID(),
          createdBy: user?.id || 'local-user',
          createdAt: new Date().toISOString(),
          status: 'pending' as const
        };

        // Update local state immediately for responsiveness
        set(state => ({
          mapMarkers: [...state.mapMarkers, newMarker]
        }));

        if (!user || !isSupabaseConfigured) {
          toast.success('Marcador adicionado localmente');
          return;
        }

        try {
          const { data, error } = await supabase
            .from('map_markers')
            .insert([{
              type: markerData.type,
              lat: markerData.lat,
              lng: markerData.lng,
              description: markerData.description,
              user_id: user.id,
              status: 'pending',
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (error) throw error;
          
          toast.success('Sugestão enviada para aprovação');
        } catch (error) {
          console.error('[MAP] Error adding marker:', error);
          toast.error('Erro ao enviar sugestão');
        }
      },

      approveMapMarker: async (markerId) => {
        const { user, settings } = get();
        if (!user || settings.role !== UserRole.ADMIN || !isSupabaseConfigured) return;

        try {
          const { error } = await supabase
            .from('map_markers')
            .update({ 
              status: 'approved',
              approved_by: user.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', markerId);

          if (error) throw error;
          
          set(state => ({
            mapMarkers: state.mapMarkers.map(m => 
              m.id === markerId ? { ...m, status: 'approved' } : m
            )
          }));
          toast.success('Marcador aprovado');
        } catch (error) {
          console.error('[MAP] Error approving marker:', error);
          toast.error('Erro ao aprovar marcador');
        }
      },

      rejectMapMarker: async (markerId) => {
        const { user, settings } = get();
        if (!user || settings.role !== UserRole.ADMIN || !isSupabaseConfigured) return;

        try {
          const { error } = await supabase
            .from('map_markers')
            .update({ 
              status: 'rejected',
              approved_by: user.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', markerId);

          if (error) throw error;
          
          set(state => ({
            mapMarkers: state.mapMarkers.map(m => 
              m.id === markerId ? { ...m, status: 'rejected' } : m
            )
          }));
          toast.success('Marcador rejeitado');
        } catch (error) {
          console.error('[MAP] Error rejecting marker:', error);
          toast.error('Erro ao rejeitar marcador');
        }
      },

      loadMapMarkers: async () => {
        if (!isSupabaseConfigured) return;

        try {
          const { data, error } = await supabase
            .from('map_markers')
            .select('*')
            .or('status.eq.approved,status.eq.pending');

          if (error) throw error;
          set({ mapMarkers: data || [] });
        } catch (error) {
          console.error('[MAP] Error loading markers:', error);
        }
      },

      saveRoute: async (routeData) => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;

        try {
          const { data, error } = await supabase
            .from('routes')
            .insert([{
              ...routeData,
              user_id: user.id,
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (error) throw error;
          
          set(state => ({
            routes: [...state.routes, data]
          }));
        } catch (error) {
          console.error('[MAP] Error saving route:', error);
        }
      },

      loadRoutes: async () => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;

        try {
          const { data, error } = await supabase
            .from('routes')
            .select('*')
            .eq('user_id', user.id);

          if (error) throw error;
          set({ routes: data || [] });
        } catch (error) {
          console.error('[MAP] Error loading routes:', error);
        }
      },

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
          performanceRecords: [],
          driverProfile: INITIAL_DRIVER_PROFILE,
          activeVehicleId: undefined,
          settings: INITIAL_SETTINGS,
          tracking: INITIAL_TRACKING,
          financialEntries: [],
          isSaving: false,
          isQuickActionsOpen: false,
          postTripActionSheet: { isOpen: false },
          miniMapOpen: false,
          userLearning: {
            consecutiveIgnores: 0,
            isSilentMode: false,
            acceptedSuggestions: 0,
            ignoredSuggestions: 0,
            editedValues: 0,
            ignoredTypes: {},
          }
        });
      },
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      
      startCycle: async () => {
        const { user, cycles, settings, isSaving, activeVehicleId } = get();
        
        console.log('[CYCLE] Starting cycle check...', { 
          hasOpenCycle: cycles.some(c => c.status === 'open'),
          activeVehicleId,
          isSaving 
        });

        if (isSaving) {
          const existing = cycles.find(c => c.status === 'open');
          console.log('[CYCLE] Already saving, returning existing open cycle:', existing?.id);
          return existing?.id || '';
        }
        
        const openCycle = cycles.find(c => c.status === 'open');
        if (openCycle) {
          console.log('[CYCLE] Found existing open cycle:', openCycle.id);
          set({ hasOpenCycle: true });
          return openCycle.id;
        }

        if (!activeVehicleId) {
          console.error('[CYCLE] No active vehicle selected');
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

          console.log('[CYCLE] Creating new cycle locally:', id);
          
          // LOCAL FIRST: Update local state immediately
          set((state) => ({ 
            cycles: [...state.cycles, newCycle],
            hasOpenCycle: true 
          }));

          // Persist to localStorage for extra safety
          localStorage.setItem('driver_dash_open_cycle', JSON.stringify(newCycle));

          if (user && isSupabaseConfigured) {
            console.log('[CYCLE] Syncing new cycle to Supabase...');
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('cycles').insert(newCycle);
            if (error) {
              console.error('[CYCLE] Error syncing to Supabase:', error);
            } else {
              console.log('[CYCLE] Successfully synced to Supabase');
            }
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

          set((state) => {
            const updatedCycles = [...state.cycles, newCycle];
            return {
              cycles: updatedCycles,
              hasOpenCycle: updatedCycles.some(c => c.status === 'open')
            };
          });

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('cycles').insert(newCycle);
            if (error) console.error('[SYNC] Error (add cycle):', error);
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
        const { user, isSaving, cycles } = get();
        if (isSaving) return;

        const cycleToClose = cycles.find(c => c.id === id);
        const prevStatus = cycleToClose?.status;
        const hasOpenBefore = get().hasOpenCycle;
        
        console.log(`[CLOSE_CYCLE] Initiating close for cycle: ${id}`);
        console.log(`[CLOSE_CYCLE] Previous status: ${prevStatus}`);
        console.log(`[CLOSE_CYCLE] hasOpenCycle before: ${hasOpenBefore}`);

        set({ isSaving: true });
        try {
          const endTime = new Date().toISOString();
          
          set((state) => {
            const updatedCycles = state.cycles.map(c => 
              c.id === id ? { ...c, status: 'closed' as const, end_time: endTime, updated_at: endTime } : c
            );
            const hasOpenAfter = updatedCycles.some(c => c.status === 'open');
            return {
              cycles: updatedCycles,
              hasOpenCycle: hasOpenAfter
            };
          });

          const hasOpenAfter = get().hasOpenCycle;
          console.log(`[CLOSE_CYCLE] New status: closed`);
          console.log(`[CLOSE_CYCLE] hasOpenCycle after: ${hasOpenAfter}`);

          // Clear localStorage on close
          console.log(`[CLOSE_CYCLE] Removing cycle from localStorage`);
          localStorage.removeItem('driver_dash_open_cycle');

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('cycles')
              .update({ status: 'closed', end_time: endTime })
              .eq('id', id)
              .eq('user_id', user.id);
            
            if (error) {
              console.error('[CLOSE_CYCLE] Error syncing to Supabase:', error);
            } else {
              console.log('[CLOSE_CYCLE] Successfully synced to Supabase');
            }
            
            set({ syncStatus: error ? 'offline' : 'synced' });
            
            // Force refresh to ensure data integrity
            if (!error) await get().syncData();

            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
          const finalOpenCycle = get().cycles.find(c => c.status === 'open');
          console.log(`[CLOSE_CYCLE] Flow completed. Current open cycle: ${finalOpenCycle?.id || 'none'}`);
        }
      },

      updateCycle: async (id, data) => {
        const { user, isSaving, cycles } = get();
        
        const cycleToUpdate = cycles.find(c => c.id === id);
        const isClosing = data.status === 'closed' && cycleToUpdate?.status === 'open';
        const hasOpenBefore = get().hasOpenCycle;
        
        if (isClosing) {
          console.log(`[CLOSE_CYCLE] updateCycle detected closing for: ${id}`);
          console.log(`[CLOSE_CYCLE] Previous status: ${cycleToUpdate?.status}`);
          console.log(`[CLOSE_CYCLE] hasOpenCycle before: ${hasOpenBefore}`);
        }

        // Always update local state first for responsiveness
        set((state) => {
          const updatedCycles = state.cycles.map(c => {
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
          });

          const hasOpenAfter = updatedCycles.some(c => c.status === 'open');
          if (isClosing) {
            console.log(`[CLOSE_CYCLE] New status: closed`);
            console.log(`[CLOSE_CYCLE] hasOpenCycle after: ${hasOpenAfter}`);
          }

          return {
            cycles: updatedCycles,
            hasOpenCycle: hasOpenAfter
          };
        });

        // Update localStorage if it's the open cycle, or remove if closing
        if (isClosing) {
          console.log(`[CLOSE_CYCLE] updateCycle removing from localStorage`);
          localStorage.removeItem('driver_dash_open_cycle');
        } else {
          const openCycle = get().cycles.find(c => c.status === 'open');
          if (openCycle && openCycle.id === id) {
            localStorage.setItem('driver_dash_open_cycle', JSON.stringify(openCycle));
          }
        }

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
                uber_gross: cycle.uber_gross,
                noventanove_gross: cycle.noventanove_gross,
                indriver_gross: cycle.indriver_gross,
                extra_gross: cycle.extra_gross,
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
                // Reduced payload: route_points and segments are kept local only
                vehicle_id: cycle.vehicle_id,
                vehicle_name: cycle.vehicle_name,
                vehicle_snapshot: cycle.vehicle_snapshot,
                end_time: cycle.end_time,
                status: cycle.status
              })
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) console.error('[SYNC] Error (update cycle):', error);
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

      addCycleAmount: async (id, platform, amount) => {
        const { addFinancialEntry } = get();
        
        await addFinancialEntry({
          cycle_id: id,
          platform,
          value: amount,
          timestamp: new Date().toISOString(),
          origin: 'manual'
        });
      },

      loadFinancialEntries: async () => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;
        
        try {
          const { data, error } = await supabase
            .from('financial_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false });
            
          if (error) throw error;
          
          if (data) {
            set({ financialEntries: data });
          }
        } catch (error) {
          console.error('[FINANCIAL] loadFinancialEntries error:', error);
        }
      },

      addFinancialEntry: async (entry) => {
        const { user, isSaving, updateCycle, cycles } = get();
        if (isSaving) return;

        set({ isSaving: true });
        try {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          
          // Calcular valor líquido se componentes forem fornecidos
          let netValue = entry.value;
          if (entry.gross_value !== undefined) {
            netValue = (entry.gross_value || 0) + (entry.tips || 0) + (entry.bonuses || 0) - (entry.platform_fee || 0);
          }

          const newEntry = { 
            ...entry, 
            value: netValue,
            id, 
            user_id: user?.id || '', 
            created_at: now,
            updated_at: now 
          };
          
          set((state) => ({ financialEntries: [newEntry, ...state.financialEntries] }));

          // Update cycle totals
          const cycle = cycles.find(c => c.id === entry.cycle_id);
          if (cycle) {
            const platformKey = entry.platform === 'noventanove' ? 'noventanove' : 
                               entry.platform === 'indriver' ? 'indriver' : 
                               entry.platform === 'extra' ? 'extra' : 'uber';
            const field = `${platformKey}_amount` as const;
            const grossField = `${platformKey}_gross` as const;
            const currentAmount = (cycle[field] as number) || 0;
            const currentGross = (cycle[grossField] as number) || 0;
            const grossValueToAdd = entry.gross_value !== undefined ? entry.gross_value : netValue;
            
            await updateCycle(entry.cycle_id, { 
              [field]: currentAmount + netValue,
              [grossField]: currentGross + grossValueToAdd
            });
          }

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('financial_entries').insert(newEntry);
            if (error) console.error('[SYNC] Error (add financial entry):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }

          // Record performance if tracking is active
          const { tracking, addPerformanceRecord } = get();
          if (tracking.isActive && tracking.distance > 0.1) {
            const durationMin = tracking.duration / 60000;
            const profitPerHour = durationMin > 0 ? (netValue / durationMin) * 60 : 0;
            const profitPerKm = tracking.distance > 0 ? netValue / tracking.distance : 0;
            
            addPerformanceRecord({
              startTime: new Date(Date.now() - tracking.duration).toISOString(),
              endTime: new Date().toISOString(),
              duration: Math.round(durationMin),
              earnings: netValue,
              distance: tracking.distance,
              profitPerKm,
              profitPerHour,
              region: tracking.zoneAnalytics?.label || 'Região Atual',
              dayOfWeek: new Date().getDay(),
              hour: new Date().getHours()
            });
          }
          
          // Recalculate trip intelligence
          get().updateTracking({});
        } finally {
          set({ isSaving: false });
        }
      },

      updateFinancialEntry: async (id, data) => {
        const { user, isSaving, financialEntries, cycles, updateCycle } = get();
        if (isSaving) return;

        const entry = financialEntries.find(e => e.id === id);
        if (!entry) return;

        set({ isSaving: true });
        try {
          const now = new Date().toISOString();
          
          // Calcular novo valor líquido se componentes forem fornecidos
          let newNetValue = data.value !== undefined ? data.value : entry.value;
          if (data.gross_value !== undefined || data.tips !== undefined || data.bonuses !== undefined || data.platform_fee !== undefined) {
            const g = data.gross_value !== undefined ? data.gross_value : (entry.gross_value || 0);
            const t = data.tips !== undefined ? data.tips : (entry.tips || 0);
            const b = data.bonuses !== undefined ? data.bonuses : (entry.bonuses || 0);
            const f = data.platform_fee !== undefined ? data.platform_fee : (entry.platform_fee || 0);
            newNetValue = g + t + b - f;
          }

          const updatedEntry = { ...entry, ...data, value: newNetValue, updated_at: now };
          
          set((state) => ({
            financialEntries: state.financialEntries.map(e => e.id === id ? updatedEntry : e)
          }));

          // Recalculate cycle totals if value or platform changed
          if (newNetValue !== entry.value || data.platform !== undefined) {
            const cycle = cycles.find(c => c.id === entry.cycle_id);
            if (cycle) {
              const oldPlatformKey = entry.platform === 'noventanove' ? 'noventanove' : 
                                    entry.platform === 'indriver' ? 'indriver' : 
                                    entry.platform === 'extra' ? 'extra' : 'uber';
              const newPlatformKey = updatedEntry.platform === 'noventanove' ? 'noventanove' : 
                                    updatedEntry.platform === 'indriver' ? 'indriver' : 
                                    updatedEntry.platform === 'extra' ? 'extra' : 'uber';
              
              const oldField = `${oldPlatformKey}_amount` as const;
              const newField = `${newPlatformKey}_amount` as const;
              const oldGrossField = `${oldPlatformKey}_gross` as const;
              const newGrossField = `${newPlatformKey}_gross` as const;
              
              const oldGross = entry.gross_value !== undefined ? entry.gross_value : entry.value;
              const newGross = updatedEntry.gross_value !== undefined ? updatedEntry.gross_value : updatedEntry.value;
              
              const updates: any = {};
              if (oldField === newField) {
                updates[oldField] = (cycle[oldField] as number || 0) - entry.value + newNetValue;
                updates[oldGrossField] = (cycle[oldGrossField] as number || 0) - oldGross + newGross;
              } else {
                updates[oldField] = (cycle[oldField] as number || 0) - entry.value;
                updates[newField] = (cycle[newField] as number || 0) + newNetValue;
                updates[oldGrossField] = (cycle[oldGrossField] as number || 0) - oldGross;
                updates[newGrossField] = (cycle[newGrossField] as number || 0) + newGross;
              }
              
              await updateCycle(entry.cycle_id, updates);
            }
          }

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('financial_entries')
              .update({ ...data, value: newNetValue, updated_at: now })
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) console.error('[SYNC] Error (update financial entry):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
          
          // Recalculate trip intelligence
          get().updateTracking({});
        } finally {
          set({ isSaving: false });
        }
      },

      deleteFinancialEntry: async (id) => {
        const { user, isSaving, financialEntries, cycles, updateCycle } = get();
        if (isSaving) return;

        const entry = financialEntries.find(e => e.id === id);
        if (!entry) return;

        set({ isSaving: true });
        try {
          set((state) => ({
            financialEntries: state.financialEntries.filter(e => e.id !== id)
          }));

          // Update cycle totals
          const cycle = cycles.find(c => c.id === entry.cycle_id);
          if (cycle) {
            const platformKey = entry.platform === 'noventanove' ? 'noventanove' : 
                               entry.platform === 'indriver' ? 'indriver' : 
                               entry.platform === 'extra' ? 'extra' : 'uber';
            const field = `${platformKey}_amount` as const;
            const grossField = `${platformKey}_gross` as const;
            const currentAmount = (cycle[field] as number) || 0;
            const currentGross = (cycle[grossField] as number) || 0;
            const grossToRemove = entry.gross_value !== undefined ? entry.gross_value : entry.value;
            
            await updateCycle(entry.cycle_id, { 
              [field]: currentAmount - entry.value,
              [grossField]: currentGross - grossToRemove
            });
          }

          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase
              .from('financial_entries')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) console.error('[SYNC] Error (delete financial entry):', error);
            set({ syncStatus: error ? 'offline' : 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }
        } finally {
          set({ isSaving: false });
        }
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
            if (error) console.error('[SYNC] Error (expense):', error);
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
            if (error) console.error('[SYNC] Error (fueling):', error);
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
            if (error) console.error('[SYNC] Error (maintenance):', error);
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
              console.error('[REPORTS] Error parsing report date:', e);
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
            if (error) console.error('[SYNC] Error (imported report):', error);
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
            if (error) console.error('[SYNC] Error (faturamento_log):', error);
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
        const { user, isSaving, cycles } = get();
        if (isSaving) return { success: false, error: 'Operação em andamento' };

        const cycleToDelete = cycles.find(c => c.id === id);
        if (!cycleToDelete) return { success: false, error: 'Ciclo não encontrado' };
        
        const importedReportId = cycleToDelete?.imported_report_id;

        set({ isSaving: true });
        try {
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            
            // Delete related records first to avoid FK constraints
            const relatedTables = ['financial_entries', 'expenses', 'fuel_logs', 'maintenance_logs', 'faturamento_logs'];
            for (const table of relatedTables) {
              const { error: relError } = await supabase.from(table).delete().eq('cycle_id', id).eq('user_id', user.id);
              if (relError) console.warn(`[SYNC] Warning (delete related ${table}):`, relError);
            }

            // Delete cycle
            const { error: cycleError } = await supabase.from('cycles').delete().eq('id', id).eq('user_id', user.id);
            if (cycleError) {
              console.error('[SYNC] Error (delete cycle):', cycleError);
              throw cycleError;
            }
            
            // Delete linked report if exists
            if (importedReportId) {
              const { error: reportError } = await supabase.from('imported_reports').delete().eq('id', importedReportId).eq('user_id', user.id);
              if (reportError) console.error('[SYNC] Error (delete linked report):', reportError);
            }

            set({ syncStatus: 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }

          // Local state update AFTER successful deletion
          set((state) => {
            const updatedCycles = state.cycles.filter(c => c.id !== id);
            const updatedReports = importedReportId 
              ? state.importedReports.filter(r => r.id !== importedReportId)
              : state.importedReports;

            return {
              cycles: updatedCycles,
              importedReports: updatedReports,
              hasOpenCycle: updatedCycles.some(c => c.status === 'open')
            };
          });

          // Clear localStorage if deleted cycle was the open one
          const localCycle = localStorage.getItem('driver_dash_open_cycle');
          if (localCycle) {
            try {
              if (JSON.parse(localCycle).id === id) {
                localStorage.removeItem('driver_dash_open_cycle');
              }
            } catch (e) {}
          }

          return { success: true };
        } catch (error) {
          console.error('[CYCLE] Delete error:', error);
          set({ syncStatus: 'offline' });
          return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
        } finally {
          set({ isSaving: false });
        }
      },

      deleteImportedReport: async (id) => {
        const { user, isSaving } = get();
        if (isSaving) return { success: false, error: 'Operação em andamento' };

        set({ isSaving: true });
        try {
          if (user && isSupabaseConfigured) {
            set({ syncStatus: 'syncing' });
            const { error } = await supabase.from('imported_reports').delete().eq('id', id).eq('user_id', user.id);
            if (error) {
              console.error('[SYNC] Error (delete imported report):', error);
              throw error;
            }
            set({ syncStatus: 'synced' });
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          }

          set((state) => ({
            importedReports: state.importedReports.filter(r => r.id !== id)
          }));

          return { success: true };
        } catch (error) {
          console.error('[REPORT] Delete error:', error);
          set({ syncStatus: 'offline' });
          return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
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
              fuelType: v.fuel_type || 'gasoline',
              kmPerLiter: v.km_per_liter,
              kmPerKwh: v.km_per_kwh,
              fuelPrice: v.fuel_price,
              kwhPrice: v.kwh_price,
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
                rentalValue: v.rental_value,
                batteryMaintenance: v.battery_maintenance,
                chargingStation: v.charging_station
              },
              createdAt: v.created_at
            }));
            set({ vehicles: mappedVehicles });
          }
        } catch (error) {
          console.error('[VEHICLE] loadVehicles error:', error);
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
            fuel_type: vehicle.fuelType,
            km_per_liter: vehicle.kmPerLiter,
            km_per_kwh: vehicle.kmPerKwh,
            fuel_price: vehicle.fuelPrice,
            kwh_price: vehicle.kwhPrice,
            insurance: vehicle.fixedCosts.insurance,
            ipva: vehicle.fixedCosts.ipva,
            oil_change: vehicle.fixedCosts.oilChange,
            tires: vehicle.fixedCosts.tires,
            maintenance: vehicle.fixedCosts.maintenance,
            installment: vehicle.fixedCosts.financing,
            rental_type: vehicle.fixedCosts.rentalPeriod,
            rental_value: vehicle.fixedCosts.rentalValue,
            battery_maintenance: vehicle.fixedCosts.batteryMaintenance,
            charging_station: vehicle.fixedCosts.chargingStation,
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
          console.error('[VEHICLE] addVehicle error:', error);
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
          if (updates.fuelType) dbUpdates.fuel_type = updates.fuelType;
          if (updates.kmPerLiter !== undefined) dbUpdates.km_per_liter = updates.kmPerLiter;
          if (updates.kmPerKwh !== undefined) dbUpdates.km_per_kwh = updates.kmPerKwh;
          if (updates.fuelPrice !== undefined) dbUpdates.fuel_price = updates.fuelPrice;
          if (updates.kwhPrice !== undefined) dbUpdates.kwh_price = updates.kwhPrice;
          
          if (updates.fixedCosts) {
            if (updates.fixedCosts.insurance !== undefined) dbUpdates.insurance = updates.fixedCosts.insurance;
            if (updates.fixedCosts.ipva !== undefined) dbUpdates.ipva = updates.fixedCosts.ipva;
            if (updates.fixedCosts.oilChange !== undefined) dbUpdates.oil_change = updates.fixedCosts.oilChange;
            if (updates.fixedCosts.tires !== undefined) dbUpdates.tires = updates.fixedCosts.tires;
            if (updates.fixedCosts.maintenance !== undefined) dbUpdates.maintenance = updates.fixedCosts.maintenance;
            if (updates.fixedCosts.financing !== undefined) dbUpdates.installment = updates.fixedCosts.financing;
            if (updates.fixedCosts.rentalPeriod !== undefined) dbUpdates.rental_type = updates.fixedCosts.rentalPeriod;
            if (updates.fixedCosts.rentalValue !== undefined) dbUpdates.rental_value = updates.fixedCosts.rentalValue;
            if (updates.fixedCosts.batteryMaintenance !== undefined) dbUpdates.battery_maintenance = updates.fixedCosts.batteryMaintenance;
            if (updates.fixedCosts.chargingStation !== undefined) dbUpdates.charging_station = updates.fixedCosts.chargingStation;
          }

          const { error } = await supabase.from('vehicles').update(dbUpdates).eq('id', id).eq('user_id', user.id);
          if (error) throw error;

          set((state) => ({
            vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...updates, updated_at: now } : v)
          }));
        } catch (error: any) {
          console.error('[VEHICLE] updateVehicle error:', error);
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
          console.error('[VEHICLE] deleteVehicle error:', error);
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

          // 3. Persist to profile
          if (user && isSupabaseConfigured) {
            await supabase
              .from('profiles')
              .update({ 
                active_vehicle_id: id,
                user_id: user.id // Ensure user_id is set if required by schema
              })
              .eq('id', user.id);
          }

          await get().updateSettings({
            currentVehicleProfileId: id,
            vehicle: activeVehicle.name,
            transportMode: activeVehicle.category,
            fixedCosts: activeVehicle.fixedCosts
          });
        } catch (error: any) {
          console.error('[VEHICLE] setActiveVehicle error:', error);
          // Force sync to restore consistency on error
          await get().syncData();
          throw error;
        } finally {
          set({ isSaving: false });
        }
      },

      initVehicle: async () => {
        // Check for onboarding completion in localStorage as fallback
        const isLocalOnboardingCompleted = localStorage.getItem('driver_dash_onboarding_completed') === 'true';
        if (isLocalOnboardingCompleted && !get().settings.onboardingCompleted) {
          console.log('[BOOT] Restoring onboardingCompleted from localStorage');
          set((state) => ({
            settings: { ...state.settings, onboardingCompleted: true }
          }));
        }

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
        
        // Always update local state first for immediate UI feedback and local persistence
        set((state) => {
          if (newSettings.currentVehicleProfileId) {
            localStorage.setItem(ACTIVE_VEHICLE_KEY, newSettings.currentVehicleProfileId);
          }
          
          // Special handling for onboardingCompleted to ensure it's saved in a dedicated key
          if (newSettings.onboardingCompleted === true) {
            localStorage.setItem('driver_dash_onboarding_completed', 'true');
            console.log('[SETTINGS] Onboarding marked as completed in localStorage');
          }

          return { 
            settings: { ...state.settings, ...newSettings },
            activeVehicleId: newSettings.currentVehicleProfileId !== undefined ? newSettings.currentVehicleProfileId : state.activeVehicleId
          };
        });

        try {
          // If user is logged in, update Supabase (Cloud-Sync)
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
            if (newSettings.isPrivacyMode !== undefined) updateObj.is_privacy_mode = newSettings.isPrivacyMode;
            if (newSettings.keepScreenOn !== undefined) updateObj.keep_screen_on = newSettings.keepScreenOn;
            if (newSettings.isPro !== undefined) updateObj.is_pro = newSettings.isPro;
            if (newSettings.voiceEnabled !== undefined) updateObj.voice_enabled = newSettings.voiceEnabled;
            if (newSettings.voiceCommandsEnabled !== undefined) updateObj.voice_commands_enabled = newSettings.voiceCommandsEnabled;
            if (newSettings.voiceVerbosity !== undefined) updateObj.voice_verbosity = newSettings.voiceVerbosity;
            if (newSettings.uiMode !== undefined) updateObj.ui_mode = newSettings.uiMode;
            if (newSettings.role !== undefined) updateObj.role = newSettings.role;
            if (newSettings.status !== undefined) updateObj.status = newSettings.status;
            if (newSettings.onboardingCompleted !== undefined) updateObj.onboarding_completed = newSettings.onboardingCompleted;
            if (newSettings.quickActions !== undefined) updateObj.quick_actions = newSettings.quickActions;
            if (newSettings.geminiApiKey !== undefined) updateObj.gemini_api_key = newSettings.geminiApiKey;

            const { error } = await supabase
              .from('profiles')
              .update(updateObj)
              .eq('id', user.id);
            
            if (error) {
              console.error('[SETTINGS] Error updating settings in Supabase:', error);
              set({ syncStatus: 'offline' });
              // We don't throw here to prevent UI from breaking if sync fails, 
              // as local state is already updated.
            } else {
              set({ syncStatus: 'synced' });
              
              // Force refresh to ensure data integrity
              await syncData();
              
              setTimeout(() => {
                if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
              }, 3000);
            }
          }
        } catch (err) {
          console.error('[SETTINGS] updateSettings sync error:', err);
          // Local state is already updated, so we just log the sync error
        } finally {
          set({ isSaving: false });
        }
      },

      updateTracking: (newTracking) => {
        const state = get();
        const updatedTracking = { ...state.tracking, ...newTracking };
        
        // If isProductive is manually changed, set isManualOverride to true
        if (newTracking.isProductive !== undefined && newTracking.isProductive !== state.tracking.isProductive) {
          updatedTracking.isManualOverride = true;
          // If manually starting a trip, reset detection state
          if (newTracking.isProductive) {
            updatedTracking.tripDetectionState = 'trip_started';
            updatedTracking.mode = 'in_trip';
          } else {
            updatedTracking.tripDetectionState = 'idle';
            updatedTracking.mode = 'searching';
          }
        }

        // Auto-evaluate trip analytics if tracking is active
        if (updatedTracking.isActive) {
          const openCycle = state.cycles.find(c => c.status === 'open');
          const intelligence = evaluateCurrentTrip(updatedTracking, openCycle, state.settings);
          updatedTracking.tripAnalytics = intelligence;

          // Evaluate Zone Quality
          const zoneAnalytics = evaluateZoneQuality(updatedTracking, openCycle, state.tracking.zoneAnalytics, intelligence, state.driverProfile, state.userLearning);
          updatedTracking.zoneAnalytics = zoneAnalytics;

          // TRIGGER ALERTS
          if (zoneAnalytics.maturity.isMature) {
            if (zoneAnalytics.status === 'bad_zone') {
              state.triggerAlert('bad_zone', 'critical', zoneAnalytics.message);
            } else if (zoneAnalytics.status === 'neutral_zone') {
              state.triggerAlert('neutral_zone', 'important', zoneAnalytics.message);
            }
          }

          if (intelligence.maturity.isMature) {
            if (intelligence.status === 'bad') {
              state.triggerAlert('bad_trip', 'important', intelligence.message);
            }
          }
        }
        
        set({ tracking: updatedTracking });
      },

      updateTrackingPosition: (newPosition) => {
        // Clear health check timeout on first valid position
        if (gpsHealthTimeout) {
          console.log('[TRACKING] GPS Health Check passed: First position received');
          clearTimeout(gpsHealthTimeout);
          gpsHealthTimeout = null;
        }

        set((state) => {
          const { tracking } = state;
          if (!tracking.isActive || tracking.isPaused) return state;

          const lastPoint = tracking.lastPoint;
          
          // 1. Calculate distance using Haversine
          const distance = lastPoint 
            ? calculateDistance(lastPoint.lat, lastPoint.lng, newPosition.lat, newPosition.lng)
            : 0;

          // 2. Filter out noise (extremely small movements or impossible speeds)
          const speedKmh = (newPosition.speed || 0) * 3.6;
          
          // If accuracy is too low, ignore point but keep tracking active
          if (newPosition.accuracy && newPosition.accuracy > TRACKING_CONFIG.MAX_ACCURACY) {
            console.log('[TRACKING] Accuracy too low:', newPosition.accuracy);
            return state;
          }

          // 3. Update Metrics
          const newKmTotal = tracking.distance + distance;
          const newKmProdutivo = tracking.isProductive ? tracking.productiveDistance + distance : tracking.productiveDistance;
          const newKmOcioso = !tracking.isProductive ? tracking.idleDistance + distance : tracking.idleDistance;

          // 4. Calculate Average Speed
          const startTime = tracking.startTime || Date.now();
          const totalTimeHours = (Date.now() - startTime) / 1000 / 3600;
          const newAvgSpeed = totalTimeHours > 0 ? newKmTotal / totalTimeHours : 0;

          // 5. Stop Detection & Automatic Trip Mode
          let newStopPoints = [...(tracking.stopPoints || [])];
          let newLastStopTimestamp = tracking.lastStopTimestamp;
          const isMoving = speedKmh > TRACKING_CONFIG.MIN_SPEED_STOP;
          
          let newConsecutiveMovingPoints = tracking.consecutiveMovingPoints || 0;
          let newConsecutiveStoppedPoints = tracking.consecutiveStoppedPoints || 0;
          
          if (isMoving) {
            newConsecutiveMovingPoints++;
            newConsecutiveStoppedPoints = 0;
            newLastStopTimestamp = undefined;
          } else {
            newConsecutiveStoppedPoints++;
            newConsecutiveMovingPoints = 0;
            
            // Debounce: Só começa a contar a parada após X pontos consecutivos parados
            // Isso evita que oscilações de GPS ou paradas extremamente rápidas iniciem o timer
            if (newConsecutiveStoppedPoints >= TRACKING_CONFIG.STOP_DETECTION_DEBOUNCE_POINTS) {
              if (!newLastStopTimestamp) {
                // Retroage o timestamp para o início real da parada (estimado)
                // Usamos a diferença de tempo real entre os pontos se disponível, ou estimamos
                const estimatedStartTime = newPosition.timestamp - (TRACKING_CONFIG.STOP_DETECTION_DEBOUNCE_POINTS * 5000);
                newLastStopTimestamp = estimatedStartTime;
              } else {
                const stopDuration = newPosition.timestamp - newLastStopTimestamp;
                
                // Só registra no array de stopPoints se a duração exceder o limite configurado (30s)
                if (stopDuration >= TRACKING_CONFIG.MIN_STOP_DURATION_MS) {
                  const lastStop = newStopPoints[newStopPoints.length - 1];
                  
                  // Se a parada atual for muito próxima da última registrada (30m), apenas atualiza a duração
                  if (lastStop && calculateDistance(lastStop.lat, lastStop.lng, newPosition.lat, newPosition.lng) < 0.03) {
                    lastStop.duration = stopDuration;
                    lastStop.label = stopDuration > TRACKING_CONFIG.WAITING_PASSENGER_MS ? 'Espera Longa' : 'Parada';
                  } else {
                    newStopPoints.push({
                      lat: newPosition.lat,
                      lng: newPosition.lng,
                      timestamp: newLastStopTimestamp,
                      duration: stopDuration,
                      label: stopDuration > TRACKING_CONFIG.WAITING_PASSENGER_MS ? 'Espera Longa' : 'Parada'
                    });
                  }
                }
              }
            }
          }

          // 6. Automatic Trip Start Detection
          let newMode = tracking.mode;
          let newIsProductive = tracking.isProductive;
          let newTripDetectionState = tracking.tripDetectionState;

          if (tracking.isActive && !tracking.isManualOverride) {
            // PRO FEATURE: Automatic Trip Detection
            if (get().plan !== 'pro') {
              // If free plan, we don't auto-detect, but we might want to nudge the user
              // We don't trigger paywall on every point to avoid spam, maybe just once per session
              if (newConsecutiveMovingPoints === TRACKING_CONFIG.MIN_POINTS_SEARCHING && !get().isPaywallOpen) {
                set({ isPaywallOpen: true });
              }
            } else {
              // Start Detection
              if (newMode !== 'in_trip' && newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_SEARCHING) {
                const hasSpeed = speedKmh >= TRACKING_CONFIG.MIN_SPEED_START;
                const hasDisplacement = distance >= TRACKING_CONFIG.MIN_DIST_PRECISION;
                
                if (hasSpeed || (newConsecutiveMovingPoints >= TRACKING_CONFIG.MIN_POINTS_TRIP && hasDisplacement)) {
                  console.log('[AUTO_TRIP] Automatic trip start detected', { speedKmh, consecutivePoints: newConsecutiveMovingPoints });
                  // Instead of auto-starting, set to pickup_candidate for user confirmation
                  if (newTripDetectionState !== 'trip_started') {
                    newTripDetectionState = 'pickup_candidate';
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  }
                }
              }
              
              // End Detection (Suggestion or Auto-stop)
              if (newMode === 'in_trip' && newConsecutiveStoppedPoints >= 10) { // Approx 30-60s stopped
                const stopDuration = newLastStopTimestamp ? (newPosition.timestamp - newLastStopTimestamp) : 0;
                if (stopDuration > TRACKING_CONFIG.STOP_BUFFER_MS) {
                  console.log('[AUTO_TRIP] Automatic trip end suggested (long stop)', { stopDuration });
                  // We don't auto-stop completely to avoid losing data in traffic, 
                  // but we can trigger the action sheet if it's a very long stop
                  if (stopDuration > TRACKING_CONFIG.STOP_BUFFER_MS * 1.5) {
                    // Trigger end trip logic if not already triggered
                  }
                }
              }
            }
          }

          const newPoint = { 
            ...newPosition, 
            isProductive: newIsProductive 
          };

          const updatedTracking = {
            ...tracking,
            isLoading: false,
            gpsStatus: 'active' as GPSStatus,
            lastPoint: newPoint,
            lastLocation: { lat: newPosition.lat, lng: newPosition.lng },
            lastTimestamp: newPosition.timestamp,
            distance: newKmTotal,
            productiveDistance: newKmProdutivo,
            idleDistance: newKmOcioso,
            avgSpeed: newAvgSpeed,
            currentSmoothedSpeed: speedKmh,
            points: [...(tracking.points || []), newPoint].slice(-2000),
            stopPoints: newStopPoints,
            lastStopTimestamp: newLastStopTimestamp,
            duration: Date.now() - startTime,
            mode: newMode,
            isProductive: newIsProductive,
            tripDetectionState: newTripDetectionState,
            consecutiveMovingPoints: newConsecutiveMovingPoints,
            consecutiveStoppedPoints: newConsecutiveStoppedPoints
          };

          return { tracking: updatedTracking };
        });
      },

      setHasActiveInsight: (hasActiveInsight) => {
        set((state) => ({
          tracking: { ...state.tracking, hasActiveInsight }
        }));
      },

      ignoreDetection: () => {
        const { updateTracking } = get();
        updateTracking({ 
          tripDetectionState: 'idle',
          isManualOverride: true,
          manualOverrideTimestamp: Date.now()
        });
        console.log('[TRIP] Detecção ignorada');
      },

      startTrip: () => {
        const { tracking, updateTracking } = get();
        if (!tracking.isActive) {
          get().startTracking();
        }
        updateTracking({ 
          isProductive: true, 
          mode: 'in_trip', 
          tripDetectionState: 'trip_started', 
          isManualOverride: true,
          manualOverrideTimestamp: Date.now()
        });
        console.log('[TRIP] Iniciada (manual)');
        if (navigator.vibrate) navigator.vibrate(50);
      },

      endTrip: () => {
        const { updateTracking, setPostTripActionSheet, tracking, driverProfile } = get();
        
        // Calculate suggested value
        const ratePerKm = driverProfile.avgProfitPerKm || 2.5;
        const distance = tracking.productiveDistance || 0;
        const duration = tracking.productiveTime || 0;
        const suggestedValue = Math.round((distance * ratePerKm + (duration / 60000) * 0.1) * 100) / 100;

        updateTracking({ 
          isProductive: false, 
          mode: 'searching', 
          tripDetectionState: 'idle', 
          isManualOverride: true,
          manualOverrideTimestamp: Date.now()
        });
        console.log('[TRIP] Encerrada (manual)');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        
        // Trigger post-trip action sheet with suggested value
        setPostTripActionSheet({ 
          isOpen: true, 
          autoCloseTimer: 5000,
          suggestedValue,
          suggestedDistance: distance
        });
      },

      pauseTracking: () => {
        const { tracking } = get();
        if (!tracking.isActive || tracking.isPaused) return;
        
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        if (gpsHealthTimeout) {
          clearTimeout(gpsHealthTimeout);
          gpsHealthTimeout = null;
        }
        
        set({ 
          tracking: { ...tracking, isPaused: true },
          isWatching: false
        });
        console.log('[TRACKING] pausado');
      },

      resumeTracking: () => {
        const { startTracking } = get();
        startTracking();
      },

      startTracking: async () => {
        const { tracking, startCycle } = get();
        
        // Always read fresh state from get() to avoid race conditions
        const currentCycles = get().cycles;
        const activeVehicleId = get().activeVehicleId;
        
        let openCycle = currentCycles.find(c => c.status === 'open');
        
        console.log('[TRACKING] Attempting to start tracking...', { 
          isActive: tracking.isActive, 
          isPaused: tracking.isPaused,
          activeVehicleId,
          hasOpenCycle: !!openCycle,
          openCycleId: openCycle?.id
        });
        
        // SMART FALLBACK: If no open cycle, create one automatically
        if (!openCycle) {
          console.log('[TRACKING] No open cycle found. Auto-creating cycle...');
          try {
            const newCycleId = await startCycle();
            // Re-read fresh state after startCycle
            openCycle = get().cycles.find(c => c.id === newCycleId);
            console.log('[TRACKING] Auto-created cycle:', newCycleId);
            
            // Small delay to ensure state propagation if needed
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error: any) {
            console.error('[TRACKING] Failed to auto-create cycle:', error);
            toast.error('Erro ao abrir turno automaticamente. Tente abrir manualmente.');
            return;
          }
        }

        // Se já estiver ativo, NÃO estiver pausado E o watchId já existir, não faz nada
        if (tracking.isActive && !tracking.isPaused && watchId !== null) {
          console.log('[TRACKING] Already active, not paused and watchId exists. Skipping.');
          return;
        }

        if (!activeVehicleId) {
          console.error('[TRACKING] No active vehicle selected');
          throw new Error('Selecione um veículo ativo antes de iniciar o rastreamento.');
        }
        
        if (!openCycle) {
          console.warn('[TRACKING] Still no open cycle after fallback. Blocking.');
          toast.error('Abra um turno antes de iniciar o rastreamento');
          return;
        }

        if (!navigator.geolocation) {
          console.error('[TRACKING] Geolocation not supported');
          throw new Error('Geolocalização não suportada');
        }

        // Cleanup existing watch if any
        if (watchId !== null) {
          console.log('[TRACKING] Cleaning up existing watch before start');
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        // Se estiver retomando de um pause ou de um reload
        if (tracking.isActive) {
          if (tracking.isPaused) {
            set({ tracking: { ...tracking, isPaused: false, isLoading: false, gpsStatus: 'connecting' } });
            console.log('[TRACKING] Resumed from pause');
          } else {
            console.log('[TRACKING] Resuming watch after reload');
            set({ tracking: { ...tracking, gpsStatus: 'connecting' } });
          }
        } else {
          // Início do zero
          console.log('[TRACKING] Starting fresh session');
          set({ tracking: { ...get().tracking, isLoading: true, gpsStatus: 'connecting' } });
          const startTime = Date.now();
          
          set({
            tracking: {
              ...INITIAL_TRACKING,
              isActive: true,
              isLoading: false,
              gpsStatus: 'connecting',
              startTime,
              isWarmingUp: true,
            }
          });
        }

        try {
          console.log('[TRACKING] Requesting watchPosition...');
          localStorage.setItem('driver_dash_tracking_active', 'true');
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude, speed, accuracy } = position.coords;
              const timestamp = position.timestamp || Date.now();
              
              get().updateTrackingPosition({
                lat: latitude,
                lng: longitude,
                speed: speed || 0,
                timestamp,
                accuracy: accuracy || undefined
              });
            },
            (error) => {
              console.error('[TRACKING] Geolocation error:', error);
              
              // Clear health check timeout on error too, as we received feedback
              if (gpsHealthTimeout) {
                console.log('[TRACKING] GPS Health Check cleared: Received error from watchPosition');
                clearTimeout(gpsHealthTimeout);
                gpsHealthTimeout = null;
              }

              let message = 'Erro de GPS';
              if (error.code === error.PERMISSION_DENIED) {
                message = 'Permissão de GPS negada';
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Sinal de GPS indisponível';
              } else if (error.code === error.TIMEOUT) {
                message = 'Tempo esgotado ao buscar GPS';
              }
              
              toast.error(message);
              
              set((state) => ({
                tracking: { ...state.tracking, gpsStatus: 'unavailable' }
              }));

              // Se o erro for crítico (permissão ou indisponível), paramos o rastreamento
              if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
                console.log('[TRACKING] Critical GPS error, stopping tracking');
                get().stopTracking();
              }
            },
            {
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 25000 // Aumentado para 25s para dar mais tempo no início
            }
          );
          console.log('[TRACKING] watchPosition started successfully, ID:', watchId);
          set({ isWatching: true });

          // Start GPS health check
          if (gpsHealthTimeout) clearTimeout(gpsHealthTimeout);
          gpsHealthTimeout = setTimeout(() => {
            const state = get();
            // If still watching but no position received (gpsStatus is not 'active')
            if (state.isWatching && state.tracking.isActive && state.tracking.gpsStatus !== 'active') {
              console.error('[TRACKING] GPS Health Check failed: No position received within timeout');
              
              // Stop tracking and cleanup
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
              }
              
              localStorage.setItem('driver_dash_tracking_active', 'false');
              
              set((state) => ({
                isWatching: false,
                tracking: { 
                  ...state.tracking, 
                  isActive: false, 
                  isLoading: false, 
                  gpsStatus: 'unavailable' 
                }
              }));
              
              toast.error("Não foi possível conectar ao GPS. Tente novamente.");
            }
            gpsHealthTimeout = null;
          }, TRACKING_CONFIG.GPS_HEALTH_CHECK_MS);
        } catch (err) {
          console.error('[TRACKING] Failed to start watchPosition:', err);
          localStorage.setItem('driver_dash_tracking_active', 'false');
          set((state) => ({
            tracking: { ...state.tracking, isActive: false, isLoading: false },
            isWatching: false
          }));
          throw err;
        }
      },

      stopTracking: async () => {
        if (!get().tracking.isActive) {
          console.log('[TRACKING] stopTracking: tracking is not active, returning');
          return;
        }

        console.log('[TRACKING] Encerrado');
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        if (gpsHealthTimeout) {
          clearTimeout(gpsHealthTimeout);
          gpsHealthTimeout = null;
        }

        const { tracking, cycles, updateCycle } = get();
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
          segments: [...(openCycle.segments || []), ...finalSegments],
          stop_points: [...(openCycle.stop_points || []), ...tracking.stopPoints]
        } : null;

        // 2. Reset tracking state IMMEDIATELY
        localStorage.setItem('driver_dash_tracking_active', 'false');
        set({
          isQuickActionsOpen: false,
          isWatching: false,
          tracking: {
            ...INITIAL_TRACKING,
            endTime: Date.now()
          }
        });

        // 3. Persist the data to the cycle
        if (openCycle && persistedData) {
          try {
            console.log('[TRACKING] Persisting data to cycle:', openCycle.id);
            await updateCycle(openCycle.id, persistedData);

            // NEW: Save route to routes table
            if (tracking.points.length > 0) {
              get().saveRoute({
                cycleId: openCycle.id,
                points: tracking.points,
                startTime: new Date(tracking.startTime || Date.now()).toISOString(),
                endTime: new Date().toISOString(),
                totalDistance: tracking.distance
              });
            }
          } catch (error) {
            console.error('[TRACKING] Error persisting data:', error);
          }
        }

        // NEW: Record performance for the entire session if no entries were added recently
        if (tracking.distance > 0.5) {
          const earnings = openCycle ? (openCycle.total_amount || 0) : 0;
          const lastRecord = get().performanceRecords[0];
          const isNewSession = !lastRecord || (Date.now() - new Date(lastRecord.endTime).getTime() > 3600000);
          
          if (isNewSession) {
            const durationMin = tracking.duration / 60000;
            const profitPerHour = durationMin > 0 ? (earnings / durationMin) * 60 : 0;
            const profitPerKm = tracking.distance > 0 ? earnings / tracking.distance : 0;
            
            get().addPerformanceRecord({
              startTime: new Date(Date.now() - tracking.duration).toISOString(),
              endTime: new Date().toISOString(),
              duration: Math.round(durationMin),
              earnings,
              distance: tracking.distance,
              profitPerKm,
              profitPerHour,
              region: tracking.zoneAnalytics?.label || 'Região Atual',
              dayOfWeek: new Date().getDay(),
              hour: new Date().getHours()
            });
          }
        }
        console.log('[TRACKING] stopTracking completed');
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

        const newCycles = data.cycles ? mergeByUpdatedAt(state.cycles, data.cycles) : state.cycles;
        const hasOpenCycle = newCycles.some(c => c.status === 'open');

        // Update localStorage if we found an open cycle
        const openCycle = newCycles.find(c => c.status === 'open');
        if (openCycle) {
          localStorage.setItem('driver_dash_open_cycle', JSON.stringify(openCycle));
        } else {
          // If no open cycle in sync, check if we should restore from local
          const localCycleStr = localStorage.getItem('driver_dash_open_cycle');
          if (localCycleStr) {
            try {
              const localCycle = JSON.parse(localCycleStr);
              // Only restore if it's not already in the list (to avoid duplicates)
              if (!newCycles.some(c => c.id === localCycle.id)) {
                console.log('[CYCLE] Restoring open cycle from localStorage into state:', localCycle.id);
                newCycles.push(localCycle);
                return {
                  ...state,
                  cycles: [...newCycles],
                  hasOpenCycle: true,
                  expenses: data.expenses ? mergeByUpdatedAt(state.expenses, data.expenses) : state.expenses,
                  fuelings: data.fuelings ? mergeByUpdatedAt(state.fuelings, data.fuelings) : state.fuelings,
                  maintenances: data.maintenances ? mergeByUpdatedAt(state.maintenances, data.maintenances) : state.maintenances,
                  importedReports: data.importedReports ? mergeByUpdatedAt(state.importedReports, data.importedReports) : state.importedReports,
                  vehicles: data.vehicles ? mergeByUpdatedAt(state.vehicles, data.vehicles) : state.vehicles,
                  faturamentoLogs: data.faturamentoLogs ? mergeByUpdatedAt(state.faturamentoLogs, data.faturamentoLogs) : state.faturamentoLogs,
                  financialEntries: data.financialEntries ? mergeByUpdatedAt(state.financialEntries, data.financialEntries) : state.financialEntries,
                  settings: (data.settings?.updated_at && state.settings.updated_at && new Date(data.settings.updated_at) < new Date(state.settings.updated_at)) ? state.settings : newSettings,
                  activeVehicleId: newActiveVehicleId,
                };
              }
            } catch (e) {
              console.error('[CYCLE] Error parsing local cycle:', e);
            }
          }
        }

        return {
          expenses: data.expenses ? mergeByUpdatedAt(state.expenses, data.expenses) : state.expenses,
          fuelings: data.fuelings ? mergeByUpdatedAt(state.fuelings, data.fuelings) : state.fuelings,
          maintenances: data.maintenances ? mergeByUpdatedAt(state.maintenances, data.maintenances) : state.maintenances,
          importedReports: data.importedReports ? mergeByUpdatedAt(state.importedReports, data.importedReports) : state.importedReports,
          cycles: newCycles,
          hasOpenCycle,
          vehicles: data.vehicles ? mergeByUpdatedAt(state.vehicles, data.vehicles) : state.vehicles,
          faturamentoLogs: data.faturamentoLogs ? mergeByUpdatedAt(state.faturamentoLogs, data.faturamentoLogs) : state.faturamentoLogs,
          financialEntries: data.financialEntries ? mergeByUpdatedAt(state.financialEntries, data.financialEntries) : state.financialEntries,
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
            { data: dbFat, error: errFat },
            { data: dbFin, error: errFin }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('expenses').select('*').eq('user_id', user.id),
            supabase.from('fuel_logs').select('*').eq('user_id', user.id),
            supabase.from('maintenance_logs').select('*').eq('user_id', user.id),
            supabase.from('cycles').select('*').eq('user_id', user.id),
            supabase.from('imported_reports').select('*').eq('user_id', user.id),
            supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('faturamento_logs').select('*').eq('user_id', user.id),
            supabase.from('financial_entries').select('*').eq('user_id', user.id)
          ]);

          if (errProf && errProf.code !== 'PGRST116') console.warn('[SYNC] Error pulling profile:', errProf);
          if (errExp) console.warn('[SYNC] Error pulling expenses:', errExp);
          if (errFuel) console.warn('[SYNC] Error pulling fuel_logs:', errFuel);
          if (errMaint) console.warn('[SYNC] Error pulling maintenance_logs:', errMaint);
          if (errCyc) console.warn('[SYNC] Error pulling cycles:', errCyc);
          if (errImp) console.warn('[SYNC] Error pulling imported_reports:', errImp);
          if (errVeh) console.warn('[SYNC] Error pulling vehicles:', errVeh);
          if (errFat) console.warn('[SYNC] Error pulling faturamento_logs:', errFat);
          if (errFin) console.warn('[SYNC] Error pulling financial_entries:', errFin);

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
              role: profile.role || UserRole.DRIVER,
              status: profile.status || UserStatus.ACTIVE,
              onboardingCompleted: profile.onboarding_completed || false,
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

          if (dbFin) {
            remoteData.financialEntries = dbFin;
          }

          console.log('[SYNC] Pull complete:', {
            cycles: remoteData.cycles?.length || 0,
            reports: remoteData.importedReports?.length || 0,
            vehicles: remoteData.vehicles?.length || 0,
            expenses: remoteData.expenses?.length || 0,
            faturamento: remoteData.faturamentoLogs?.length || 0,
            financial: remoteData.financialEntries?.length || 0
          });

          // 2. MERGE remote into local
          importData(remoteData);
          console.log('[SYNC] Merge applied');

          // 3. PUSH local state back to Supabase (ensures all devices are in sync)
          const currentStore = get();
          console.log('[SYNC] Pushing local state to cloud...');
          
          const pushPromises = [];
          
          // Helper to wrap push promises with table info
          const wrapPush = (promise: any, tableName: string) => 
            Promise.resolve(promise)
                   .then(res => ({ ...res, table: tableName }))
                   .catch(err => ({ error: { message: err.message, details: err.stack, table: tableName }, table: tableName }));

          if (currentStore.expenses.length > 0) {
            pushPromises.push(wrapPush(supabase.from('expenses').upsert(currentStore.expenses.map(e => ({
              id: e.id,
              user_id: user.id,
              date: e.date,
              category: e.category,
              value: e.value,
              description: e.description || '',
              updated_at: e.updated_at || new Date().toISOString()
            }))), 'expenses'));
          }

          if (currentStore.fuelings.length > 0) {
            pushPromises.push(wrapPush(supabase.from('fuel_logs').upsert(currentStore.fuelings.map(f => ({
              id: f.id,
              user_id: user.id,
              date: f.date,
              liters: f.liters,
              cost: f.value,
              odometer: f.odometer,
              updated_at: f.updated_at || new Date().toISOString()
            }))), 'fuel_logs'));
          }

          if (currentStore.maintenances.length > 0) {
            pushPromises.push(wrapPush(supabase.from('maintenance_logs').upsert(currentStore.maintenances.map(m => ({
              id: m.id,
              user_id: user.id,
              date: m.date,
              type: m.type,
              cost: m.value,
              odometer: m.currentKm,
              next_change_km: m.nextChangeKm || null,
              updated_at: m.updated_at || new Date().toISOString()
            }))), 'maintenance_logs'));
          }

          if (currentStore.cycles.length > 0) {
            const cyclesPayload = currentStore.cycles.map(c => ({
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
              // Reduced payload: route_points and segments are kept local only
              vehicle_id: c.vehicle_id,
              vehicle_name: c.vehicle_name,
              status: c.status,
              updated_at: c.updated_at || new Date().toISOString()
            }));

            // Log payload size for debugging
            const payloadSize = JSON.stringify(cyclesPayload).length;
            if (payloadSize > 1000000) { // > 1MB
              console.warn(`[SYNC] Large cycles payload: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`);
            }

            pushPromises.push(wrapPush(supabase.from('cycles').upsert(cyclesPayload), 'cycles'));
          }

          if (currentStore.importedReports.length > 0) {
            pushPromises.push(wrapPush(supabase.from('imported_reports').upsert(currentStore.importedReports.map(r => ({
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
            }))), 'imported_reports'));
          }

          if (currentStore.vehicles.length > 0) {
            pushPromises.push(wrapPush(supabase.from('vehicles').upsert(currentStore.vehicles.map(v => ({
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
            }))), 'vehicles'));
          }

          if (currentStore.faturamentoLogs.length > 0) {
            pushPromises.push(wrapPush(supabase.from('faturamento_logs').upsert(currentStore.faturamentoLogs.map(l => ({
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
            }))), 'faturamento_logs'));
          }

          if (currentStore.financialEntries.length > 0) {
            pushPromises.push(wrapPush(supabase.from('financial_entries').upsert(currentStore.financialEntries.map(e => ({
              id: e.id,
              user_id: user.id,
              cycle_id: e.cycle_id,
              platform: e.platform,
              value: e.value,
              timestamp: e.timestamp,
              origin: e.origin,
              created_at: e.created_at || new Date().toISOString(),
              updated_at: e.updated_at || new Date().toISOString()
            }))), 'financial_entries'));
          }

          // Push settings to profiles
          if (user && isSupabaseConfigured) {
            pushPromises.push(wrapPush(supabase.from('profiles').upsert({
              id: user.id,
              user_id: user.id, // Explicitly provide user_id to satisfy constraint
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
              role: currentStore.settings.role || UserRole.DRIVER,
              status: currentStore.settings.status || UserStatus.ACTIVE,
              updated_at: new Date().toISOString()
            }), 'profiles'));
          }

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
        tracking: INITIAL_TRACKING,
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
          console.error('[SYNC] Error clearing cloud data:', error);
          set({ syncStatus: 'offline' });
          return { success: false, error };
        }
      },

      // Performance methods
      loadPerformanceData: async () => {
        const { user } = get();
        if (!user || !isSupabaseConfigured) return;

        try {
          const { data, error } = await supabase
            .from('performance_records')
            .select('*')
            .eq('user_id', user.id)
            .order('startTime', { ascending: false });

          if (error) throw error;
          if (data) {
            set({ performanceRecords: data });
            get().updateDriverProfile();
          }
        } catch (error) {
          console.error('[PERFORMANCE] loadPerformanceData error:', error);
        }
      },

      addPerformanceRecord: async (record) => {
        const { user, performanceRecords, updateDriverProfile } = get();
        
        const id = crypto.randomUUID();
        const newRecord = { 
          ...record, 
          id, 
          user_id: user?.id || '',
          created_at: new Date().toISOString()
        };

        set({ performanceRecords: [newRecord, ...performanceRecords] });
        updateDriverProfile();

        if (user && isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('performance_records')
              .insert(newRecord);
            if (error) throw error;
          } catch (error) {
            console.error('[PERFORMANCE] addPerformanceRecord error:', error);
          }
        }
      },

      updateDriverProfile: () => {
        const { performanceRecords } = get();
        if (performanceRecords.length === 0) return;

        const totalRides = performanceRecords.length;
        const totalProfitPerHour = performanceRecords.reduce((acc, r) => acc + safeNumber(r.profitPerHour), 0);
        const totalProfitPerKm = performanceRecords.reduce((acc, r) => acc + safeNumber(r.profitPerKm), 0);

        const avgProfitPerHour = totalProfitPerHour / totalRides;
        const avgProfitPerKm = totalProfitPerKm / totalRides;

        // Group by hour
        const hourStats: Record<number, { total: number, count: number }> = {};
        const regionStats: Record<string, { total: number, count: number }> = {};

        performanceRecords.forEach(r => {
          // Hour
          if (!hourStats[r.hour]) hourStats[r.hour] = { total: 0, count: 0 };
          hourStats[r.hour].total += safeNumber(r.profitPerHour);
          hourStats[r.hour].count += 1;

          // Region
          if (r.region && r.region !== 'Monitorando região...') {
            if (!regionStats[r.region]) regionStats[r.region] = { total: 0, count: 0 };
            regionStats[r.region].total += safeNumber(r.profitPerHour);
            regionStats[r.region].count += 1;
          }
        });

        const bestHours = Object.entries(hourStats)
          .map(([hour, stats]) => ({ hour: Number(hour), avg: stats.total / stats.count }))
          .filter(h => h.avg > avgProfitPerHour)
          .sort((a, b) => b.avg - a.avg)
          .map(h => h.hour);

        const worstHours = Object.entries(hourStats)
          .map(([hour, stats]) => ({ hour: Number(hour), avg: stats.total / stats.count }))
          .filter(h => h.avg < avgProfitPerHour * 0.8)
          .sort((a, b) => a.avg - b.avg)
          .map(h => h.hour);

        const bestRegions = Object.entries(regionStats)
          .map(([region, stats]) => ({ region, avg: stats.total / stats.count }))
          .filter(r => r.avg > avgProfitPerHour)
          .sort((a, b) => b.avg - a.avg)
          .map(r => r.region);

        const worstRegions = Object.entries(regionStats)
          .map(([region, stats]) => ({ region, avg: stats.total / stats.count }))
          .filter(r => r.avg < avgProfitPerHour * 0.8)
          .sort((a, b) => a.avg - b.avg)
          .map(r => r.region);

        // Calculate Score (0-100)
        // Factors: Efficiency (R$/KM), Consistency (Rides), Hourly Profit
        const scorePerHour = Math.min(avgProfitPerHour / 60, 1) * 40; // Max 40 points for R$60/h
        const scorePerKm = Math.min(avgProfitPerKm / 3, 1) * 40; // Max 40 points for R$3/km
        const scoreConsistency = Math.min(totalRides / 50, 1) * 20; // Max 20 points for 50+ rides
        const finalScore = Math.round(scorePerHour + scorePerKm + scoreConsistency);

        // Determine Badges
        const badges: string[] = [];
        if (avgProfitPerHour > 50) badges.push('Elite Hourly');
        if (avgProfitPerKm > 2.5) badges.push('High Efficiency');
        if (totalRides > 100) badges.push('Veteran');
        if (finalScore > 90) badges.push('Master Driver');

        set({
          driverProfile: {
            avgProfitPerHour,
            avgProfitPerKm,
            bestHours,
            worstHours,
            bestRegions,
            worstRegions,
            totalRides,
            lastUpdated: new Date().toISOString(),
            score: finalScore,
            badges,
            mapsViewed: get().driverProfile.mapsViewed || 0
          }
        });
      },

      incrementMapsViewed: () => {
        const { driverProfile, user } = get();
        const updatedProfile = {
          ...driverProfile,
          mapsViewed: (driverProfile.mapsViewed || 0) + 1,
          lastUpdated: new Date().toISOString()
        };
        
        set({ driverProfile: updatedProfile });

        // Sync to Supabase if configured
        if (user && isSupabaseConfigured) {
          supabase
            .from('driver_profiles')
            .upsert({
              user_id: user.id,
              ...updatedProfile,
              updated_at: new Date().toISOString()
            })
            .then(({ error }) => {
              if (error) console.error('[SYNC] Error incrementing maps viewed:', error);
            });
        }
      }
    }),
    {
      name: 'driver-dash-storage',
      partialize: (state) => ({
        cycles: state.cycles,
        hasOpenCycle: state.hasOpenCycle,
        expenses: state.expenses,
        fuelings: state.fuelings,
        maintenances: state.maintenances,
        importedReports: state.importedReports,
        vehicles: state.vehicles,
        settings: state.settings,
        tracking: state.tracking,
        activeVehicleId: state.activeVehicleId,
        faturamentoLogs: state.faturamentoLogs,
        financialEntries: state.financialEntries,
        performanceRecords: state.performanceRecords,
        driverProfile: state.driverProfile
      }),
    }
  )
);
