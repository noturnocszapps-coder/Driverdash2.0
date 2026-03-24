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
}

export interface Fueling {
  id: string;
  date: string;
  liters: number;
  value: number;
  odometer: number;
}

export interface Maintenance {
  id: string;
  date: string;
  type: string;
  value: number;
  currentKm: number;
  nextChangeKm: number;
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
}

export interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  isProductive?: boolean;
}

export type TripDetectionState = 'idle' | 'pickup_candidate' | 'trip_started' | 'dropoff_candidate';

export type TrackingMode = 'stopped' | 'searching' | 'on_trip';

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

export interface TrackingSession {
  isActive: boolean;
  isLoading: boolean;
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
  isProductive: boolean;
  isManualOverride: boolean;
  mode: TrackingMode;
  tripDetectionState: TripDetectionState;
  lastStopTimestamp?: number;
  isWarmingUp?: boolean;
  points: TrackingPoint[];
  lastPoint?: TrackingPoint;
  segments: TrackingSegment[];
  consecutiveMovingPoints: number;
  consecutiveStoppedPoints: number;
  lastLocation?: { lat: number; lng: number };
  lastTimestamp?: number;
}

export type SyncStatus = 'idle' | 'online' | 'offline' | 'syncing' | 'synced';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
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
}

export interface ImportedReport {
  id: string;
  user_id: string;
  vehicle_id?: string;
  platform: AppType;
  report_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  total_earnings: number;
  cash_earnings: number;
  app_earnings: number;
  platform_fee: number;
  promotions: number;
  taxes: number;
  requests_count: number;
  image_url?: string;
  image_hash: string;
  content_fingerprint: string;
  source: 'screenshot';
  imported_at: string;
  status: 'confirmed';
  confidence_score: number;
  uncertain_fields: string[];
}

export interface DriverState {
  user: AuthUser | null;
  syncStatus: SyncStatus;
  hasSynced: boolean;
  rides: Ride[];
  workLogs: WorkLog[];
  faturamentoLogs: FaturamentoLog[];
  cycles: Cycle[];
  expenses: Expense[];
  fuelings: Fueling[];
  maintenances: Maintenance[];
  importedReports: ImportedReport[];
  vehicles: VehicleProfile[];
  settings: UserSettings;
  tracking: TrackingSession;
  activeVehicleId: string | undefined;
  isSaving: boolean;
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
  startTracking: () => void;
  stopTracking: () => Promise<void>;
  startTrip: () => void;
  endTrip: () => void;
  importData: (data: { cycles?: Cycle[], expenses?: Expense[], fuelings?: Fueling[], maintenances?: Maintenance[], settings?: Partial<UserSettings>, importedReports?: ImportedReport[], vehicles?: VehicleProfile[] }) => void;
  syncData: () => Promise<void>;
  clearData: () => void;
  clearCloudData: () => Promise<{ success: boolean; error?: any }>;
}
