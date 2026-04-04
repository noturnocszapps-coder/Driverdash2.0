export type PlatformType = 
  | 'uber_car' 
  | 'noventanove_car' 
  | 'indrive_car' 
  | 'uber_moto' 
  | 'noventanove_moto' 
  | 'indrive_moto';

export type TransportMode = 'car' | 'motorcycle';

export type AppType = 'Uber' | '99' | 'inDrive' | 'Particular';

export type ExpenseCategory = 
  | 'combustível' 
  | 'manutenção' 
  | 'seguro' 
  | 'alimentação' 
  | 'lavagem' 
  | 'aluguel/parcela' 
  | 'IPVA' 
  | 'outros';

export interface Ride {
  id: string;
  date: string;
  app: AppType;
  grossValue: number;
  tips: number;
  bonus: number;
  onlineHours: number;
  kmDriven: number;
  passengerPaid?: number;
  notes?: string;
}

export interface Cycle {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  uber_amount: number;
  noventanove_amount: number;
  indriver_amount: number;
  extra_amount: number;
  uber_gross?: number;
  noventanove_gross?: number;
  indriver_gross?: number;
  extra_gross?: number;
  total_amount: number;
  fuel_expense?: number;
  food_expense?: number;
  other_expense?: number;
  total_expenses?: number;
  status: 'open' | 'closed';
  created_at?: string;
  // Distance tracking fields
  total_km?: number;
  ride_km?: number;
  displacement_km?: number;
  uber_km?: number;
  noventanove_km?: number;
  indriver_km?: number;
  vehicle_id?: string;
  vehicle_name?: string;
  vehicle_snapshot?: {
    id: string;
    name: string;
    fixedCosts: FixedCosts;
    kmPerLiter?: number;
    fuelPrice?: number;
  };
  imported_report_id?: string;
  source?: 'manual' | 'screenshot';
  updated_at?: string;
  // Tracking summary
  tracked_km?: number;
  tracked_moving_time?: number;
  tracked_stopped_time?: number;
  productive_km?: number;
  idle_km?: number;
  efficiency_percentage?: number;
  driver_score?: number;
  route_points?: TrackingPoint[];
  segments?: TrackingSegment[];
}

export interface WorkLog {
  id: string;
  user_id: string;
  platform_type: PlatformType;
  date: string;
  gross_amount: number;
  passenger_cash_amount: number;
  tips_amount: number;
  bonus_amount: number;
  hours_worked: number;
  km_driven: number;
  deliveries_count?: number;
  rides_count?: number;
  packages_count?: number;
  routes_count?: number;
  vehicle_type?: 'Passeio' | 'Fiorino';
  extra_expenses?: number;
  shopee_km_bracket?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserWorkProfile {
  id: string;
  user_id: string;
  platform_type: PlatformType;
  active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  value: number;
  updated_at?: string;
}

export interface Fueling {
  id: string;
  date: string;
  liters: number;
  value: number;
  odometer: number;
  updated_at?: string;
}

export interface Maintenance {
  id: string;
  date: string;
  type: string;
  value: number;
  currentKm: number;
  nextChangeKm: number;
  updated_at?: string;
}

export interface VehicleCosts {
  purchaseValue: number;
  insurance: number;
  ipva: number;
  licensing: number;
  depreciation: number;
  monthlyMaintenance: number;
  annualKm: number;
}

export interface FixedCosts {
  vehicleType: 'owned' | 'rented';
  // Owned fields
  insurance?: number;
  ipva?: number;
  oilChange?: number;
  tires?: number;
  maintenance?: number;
  financing?: number;
  // Rented fields
  rentalPeriod?: 'weekly' | 'monthly';
  rentalValue?: number;
}

export interface VehicleProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  plate?: string;
  type: 'owned' | 'rented';
  category: 'car' | 'motorcycle';
  fixedCosts: FixedCosts;
  createdAt: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface UserSettings {
  dailyGoal: number;
  name: string;
  vehicle: string;
  kmPerLiter?: number;
  fuelPrice?: number;
  vehicleCosts?: VehicleCosts;
  fixedCosts?: FixedCosts;
  avgRideValue?: number;
  avgRideKm?: number;
  activePlatforms: PlatformType[];
  transportMode: TransportMode;
  dashboardMode: 'merged' | 'segmented';
  theme?: 'dark' | 'light' | 'system';
  photoUrl?: string;
  currentVehicleProfileId?: string;
  isPrivacyMode?: boolean;
  keepScreenOn?: boolean;
  voiceEnabled?: boolean;
  voiceCommandsEnabled?: boolean;
  voiceVerbosity?: 'low' | 'normal' | 'high';
  voiceVolume?: number;
  role?: UserRole;
  status?: UserStatus;
  updated_at?: string;
  onboardingCompleted?: boolean;
  isPro?: boolean;
  uiMode?: 'simple' | 'pro';
}

export type HUDState = 'expanded' | 'minimized' | 'hidden';
export type AlertSeverity = 'critical' | 'important' | 'silent';

export interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  isProductive?: boolean;
}

export type TripDetectionState = 'idle' | 'pickup_candidate' | 'trip_started' | 'dropoff_candidate' | 'transition_window' | 'waiting' | 'traffic_stop';
export type StopReason = 'traffic_light' | 'waiting' | 'end_of_trip' | 'none';

export type TrackingMode = 'idle' | 'searching' | 'in_trip' | 'waiting' | 'dropoff' | 'transition';

export interface TrackingSegment {
  id: string;
  startTime: number;
  endTime?: number;
  startLat: number;
  startLng: number;
  endLat?: number;
  endLng?: number;
  startLocation?: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
  mode: TrackingMode;
  distance: number;
  duration: number;
  avgSpeed: number;
}

export interface StopPoint {
  lat: number;
  lng: number;
  timestamp: number;
  duration: number;
  label?: string;
}

export type GPSStatus = 'connecting' | 'active' | 'unavailable' | 'idle';

export interface TrackingSession {
  isActive: boolean;
  isLoading: boolean;
  gpsStatus: GPSStatus;
  startTime?: number;
  endTime?: number;
  distance: number;
  avgSpeed: number;
  currentSmoothedSpeed: number;
  speedBuffer: number[];
  duration: number;
  movingTime: number;
  stoppedTime: number;
  productiveDistance: number;
  idleDistance: number;
  productiveTime: number;
  idleTime: number;
  isProductive: boolean;
  isManualOverride: boolean;
  isPaused: boolean;
  manualOverrideTimestamp?: number;
  mode: TrackingMode;
  tripDetectionState: TripDetectionState;
  stopReason?: StopReason;
  lastStopTimestamp?: number;
  lastStopLocation?: { lat: number; lng: number };
  isWarmingUp?: boolean;
  points: TrackingPoint[];
  lastPoint?: TrackingPoint;
  segments: TrackingSegment[];
  consecutiveMovingPoints: number;
  consecutiveStoppedPoints: number;
  stopPoints: StopPoint[];
  lastLocation?: { lat: number; lng: number };
  lastTimestamp?: number;
  tripIntelligence?: TripIntelligence;
  zoneIntelligence?: ZoneIntelligence;
  hasActiveInsight?: boolean;
  hudState: HUDState;
  lastAlertMessage?: string;
  lastAlerts: Record<string, number>;
}

export type TripStatus = 'good' | 'acceptable' | 'bad' | 'analyzing';
export type DecisionSource = 'realtime' | 'profile' | 'mixed';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TripIntelligence {
  score: number;
  status: TripStatus;
  label: string;
  message: string;
  maturity: {
    isMature: boolean;
    reason?: string;
  };
  metrics: {
    grossPerKm: number;
    netPerKm: number;
    perHour: number;
    efficiency: number;
    profitPerKm: number;
  };
}

export type ZoneStatus = 'good_zone' | 'neutral_zone' | 'bad_zone' | 'monitoring';
export type ZoneSeverity = 'low' | 'medium' | 'high';
export type ZoneReason = 'high_idle_km' | 'long_wait_time' | 'low_efficiency' | 'low_demand' | 'none';

export interface ZoneIntelligence {
  status: ZoneStatus;
  severity: ZoneSeverity;
  label: string;
  message: string;
  reason: ZoneReason;
  score: number;
  metrics: {
    idleKm: number;
    searchingMinutes: number;
    currentEfficiency: number;
    recentRevenue: number;
  };
  maturity: {
    isMature: boolean;
    reason?: string;
  };
  regionName?: string;
  confidence?: ConfidenceLevel;
  decisionSource?: DecisionSource;
  bestZone?: {
    label: string;
    distance: number;
    direction: string;
  };
  // Internal state for persistence and cooldown
  lastAlertTime?: number;
  lastZoneState?: ZoneStatus;
  badZoneCandidateStartTime?: number;
  lastStateChangeTime?: number;
}

export type SyncStatus = 'idle' | 'online' | 'offline' | 'syncing' | 'synced';

export enum UserRole {
  ADMIN = 'admin',
  DRIVER = 'driver',
  PASSENGER = 'passenger',
  RETAILER = 'retailer',
  SUPPLIER = 'supplier'
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended'
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface FaturamentoLog {
  id: string;
  user_id: string;
  date: string;
  vehicle_mode: 'carro' | 'moto';
  uber_amount: number;
  noventanove_amount: number;
  indriver_amount: number;
  extra_amount: number;
  km_total: number;
  active_hours_total: number;
  fuel_total: number;
  fuel_price: number;
  fuel_type: 'gasolina' | 'etanol' | 'energia';
  additional_expense: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportedReport {
  id: string;
  user_id: string;
  vehicle_id?: string;
  platform: AppType;
  report_type: 'daily' | 'weekly' | 'ride_offer' | 'ride_detail';
  period_start: string;
  period_end: string;
  total_earnings: number;
  cash_earnings: number;
  app_earnings: number;
  platform_fee: number;
  promotions: number;
  taxes: number;
  requests_count: number;
  // Ride specific fields
  ride_km?: number;
  ride_duration_mins?: number;
  passenger_rating?: number;
  surge_multiplier?: number;
  value_per_km?: number;
  value_per_hour?: number;
  image_url?: string;
  image_hash: string;
  content_fingerprint: string;
  source: 'screenshot';
  imported_at: string;
  status: 'confirmed';
  confidence_score: number;
  uncertain_fields: string[];
  updated_at?: string;
}

export interface FinancialEntry {
  id: string;
  cycle_id: string;
  user_id: string;
  platform: 'uber' | 'noventanove' | 'indriver' | 'extra';
  value: number; // Valor líquido (Net)
  gross_value?: number;
  tips?: number;
  bonuses?: number;
  platform_fee?: number;
  timestamp: string;
  origin: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DriverPerformanceRecord {
  id: string;
  user_id: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  earnings: number;
  distance: number;
  profitPerKm: number;
  profitPerHour: number;
  region: string;
  dayOfWeek: number; // 0-6
  hour: number; // 0-23
  created_at?: string;
}

export interface DriverProfile {
  avgProfitPerHour: number;
  avgProfitPerKm: number;
  bestHours: number[];
  worstHours: number[];
  bestRegions: string[];
  worstRegions: string[];
  totalRides: number;
  lastUpdated: string;
  score: number;
  badges: string[];
}

export interface PerformanceInsight {
  type: 'positive' | 'negative' | 'neutral';
  message: string;
  value?: string;
}

export interface DriverState {
  user: AuthUser | null;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  syncError: string | null;
  hasSynced: boolean;
  rides: Ride[];
  workLogs: WorkLog[];
  faturamentoLogs: FaturamentoLog[];
  cycles: Cycle[];
  hasOpenCycle: boolean;
  expenses: Expense[];
  fuelings: Fueling[];
  maintenances: Maintenance[];
  importedReports: ImportedReport[];
  vehicles: VehicleProfile[];
  settings: UserSettings;
  tracking: TrackingSession;
  isWatching: boolean;
  activeVehicleId: string | undefined;
  isSaving: boolean;
  financialEntries: FinancialEntry[];
  performanceRecords: DriverPerformanceRecord[];
  driverProfile: DriverProfile;
  
  // HUD Interaction State
  isQuickActionsOpen: boolean;
  setQuickActionsOpen: (isOpen: boolean) => void;
  postTripActionSheet: {
    isOpen: boolean;
    tripId?: string;
    autoCloseTimer?: number;
    suggestedValue?: number;
    suggestedDistance?: number;
  };
  setPostTripActionSheet: (data: Partial<{
    isOpen: boolean;
    tripId?: string;
    autoCloseTimer?: number;
    suggestedValue?: number;
    suggestedDistance?: number;
  }>) => void;
  
  miniMapOpen: boolean;
  setMiniMapOpen: (isOpen: boolean) => void;
  setHudState: (state: HUDState) => void;
  triggerAlert: (type: string, severity: AlertSeverity, message: string) => void;

  // Voice State
  voiceState: {
    isListening: boolean;
    lastSpokenMessage?: string;
    lastSpokenAt?: number;
  };
  setVoiceListening: (isListening: boolean) => void;
  setLastSpoken: (message: string) => void;

  userLearning: {
    consecutiveIgnores: number;
    isSilentMode: boolean;
    acceptedSuggestions: number;
    ignoredSuggestions: number;
    editedValues: number;
    ignoredTypes: Record<string, number>;
  };
  updateUserLearning: (action: 'accept' | 'ignore' | 'edit', type?: string) => void;

  addFinancialEntry: (entry: Omit<FinancialEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateFinancialEntry: (id: string, data: Partial<FinancialEntry>) => Promise<void>;
  deleteFinancialEntry: (id: string) => Promise<void>;
  loadFinancialEntries: () => Promise<void>;

  setUser: (user: AuthUser | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  
  // Cycle methods
  startCycle: () => Promise<string>;
  addCycle: (cycle: Omit<Cycle, 'id' | 'user_id'>) => Promise<string>;
  closeCycle: (id: string) => Promise<void>;
  updateCycle: (id: string, data: Partial<Cycle>) => Promise<void>;
  addCycleAmount: (id: string, platform: 'uber' | 'noventanove' | 'indriver' | 'extra', amount: number) => void;
  checkAndCloseCycles: () => void;

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addFueling: (fueling: Omit<Fueling, 'id'>) => Promise<void>;
  addMaintenance: (maintenance: Omit<Maintenance, 'id'>) => Promise<void>;
  addImportedReport: (report: Omit<ImportedReport, 'id' | 'user_id' | 'imported_at'>) => Promise<void>;
  addFaturamentoLog: (log: Omit<FaturamentoLog, 'id' | 'user_id'>) => Promise<void>;
  deleteCycle: (id: string) => Promise<void>;
  deleteImportedReport: (id: string) => Promise<void>;
  
  // Vehicle methods
  loadVehicles: () => Promise<void>;
  addVehicle: (vehicle: Omit<VehicleProfile, 'id' | 'createdAt'>) => Promise<void>;
  updateVehicle: (id: string, updates: Partial<VehicleProfile>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setActiveVehicle: (id: string) => Promise<void>;
  initVehicle: () => Promise<void>;

  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateTracking: (tracking: Partial<TrackingSession>) => void;
  updateTrackingPosition: (position: { lat: number; lng: number; speed: number; timestamp: number; accuracy?: number }) => void;
  setHasActiveInsight: (hasInsight: boolean) => void;
  startTracking: () => Promise<void>;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopTracking: () => Promise<void>;
  startTrip: () => void;
  endTrip: () => void;
  importData: (data: { 
    cycles?: Cycle[], 
    expenses?: Expense[], 
    fuelings?: Fueling[], 
    maintenances?: Maintenance[], 
    settings?: Partial<UserSettings>, 
    importedReports?: ImportedReport[], 
    vehicles?: VehicleProfile[],
    faturamentoLogs?: FaturamentoLog[],
    financialEntries?: FinancialEntry[]
  }) => void;
  syncData: () => Promise<void>;
  resetStore: () => void;
  clearData: () => void;
  clearCloudData: () => Promise<{ success: boolean; error?: any }>;
  
  // Performance methods
  loadPerformanceData: () => Promise<void>;
  addPerformanceRecord: (record: Omit<DriverPerformanceRecord, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateDriverProfile: () => void;
}
