-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  city TEXT,
  car_model TEXT,
  fuel_type TEXT,
  km_per_liter NUMERIC,
  daily_goal NUMERIC,
  vehicle TEXT,
  fuel_price NUMERIC,
  active_platforms TEXT[],
  transport_mode TEXT,
  dashboard_mode TEXT,
  theme TEXT,
  photo_url TEXT,
  fixed_costs JSONB,
  current_vehicle_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  plate TEXT,
  type TEXT,
  category TEXT,
  insurance NUMERIC DEFAULT 0,
  ipva NUMERIC DEFAULT 0,
  oil_change NUMERIC DEFAULT 0,
  tires NUMERIC DEFAULT 0,
  maintenance NUMERIC DEFAULT 0,
  installment NUMERIC DEFAULT 0,
  rental_type TEXT,
  rental_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cycles Table
CREATE TABLE IF NOT EXISTS cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  uber_amount NUMERIC DEFAULT 0,
  noventanove_amount NUMERIC DEFAULT 0,
  indriver_amount NUMERIC DEFAULT 0,
  extra_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  fuel_expense NUMERIC DEFAULT 0,
  food_expense NUMERIC DEFAULT 0,
  other_expense NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  total_km NUMERIC DEFAULT 0,
  ride_km NUMERIC DEFAULT 0,
  displacement_km NUMERIC DEFAULT 0,
  uber_km NUMERIC DEFAULT 0,
  noventanove_km NUMERIC DEFAULT 0,
  indriver_km NUMERIC DEFAULT 0,
  tracked_km NUMERIC DEFAULT 0,
  tracked_moving_time NUMERIC DEFAULT 0,
  tracked_stopped_time NUMERIC DEFAULT 0,
  productive_km NUMERIC DEFAULT 0,
  idle_km NUMERIC DEFAULT 0,
  efficiency_percentage NUMERIC DEFAULT 0,
  driver_score NUMERIC DEFAULT 0,
  route_points JSONB DEFAULT '[]',
  segments JSONB DEFAULT '[]',
  vehicle_id UUID,
  vehicle_name TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Imported Reports Table
CREATE TABLE IF NOT EXISTS imported_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  vehicle_id UUID,
  platform TEXT NOT NULL,
  report_type TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_earnings NUMERIC DEFAULT 0,
  cash_earnings NUMERIC DEFAULT 0,
  app_earnings NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  promotions NUMERIC DEFAULT 0,
  taxes NUMERIC DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  image_url TEXT,
  image_hash TEXT,
  content_fingerprint TEXT,
  source TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'processed',
  confidence_score NUMERIC,
  uncertain_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Fuel Logs Table
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  liters NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  odometer NUMERIC,
  fuel_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Maintenance Logs Table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  odometer NUMERIC,
  next_change_km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Faturamento Logs Table
CREATE TABLE IF NOT EXISTS faturamento_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  vehicle_mode TEXT NOT NULL,
  uber_amount NUMERIC DEFAULT 0,
  noventanove_amount NUMERIC DEFAULT 0,
  indriver_amount NUMERIC DEFAULT 0,
  extra_amount NUMERIC DEFAULT 0,
  km_total NUMERIC DEFAULT 0,
  active_hours_total NUMERIC DEFAULT 0,
  fuel_total NUMERIC DEFAULT 0,
  fuel_price NUMERIC DEFAULT 0,
  fuel_type TEXT,
  additional_expense NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Vehicles
CREATE POLICY "Users can view own vehicles" ON vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vehicles" ON vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicles" ON vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicles" ON vehicles FOR DELETE USING (auth.uid() = user_id);

-- Cycles
CREATE POLICY "Users can view own cycles" ON cycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycles" ON cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycles" ON cycles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cycles" ON cycles FOR DELETE USING (auth.uid() = user_id);

-- Imported Reports
CREATE POLICY "Users can view own imported_reports" ON imported_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imported_reports" ON imported_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own imported_reports" ON imported_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own imported_reports" ON imported_reports FOR DELETE USING (auth.uid() = user_id);

-- Expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Fuel Logs
CREATE POLICY "Users can view own fuel_logs" ON fuel_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fuel_logs" ON fuel_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fuel_logs" ON fuel_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fuel_logs" ON fuel_logs FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Logs
CREATE POLICY "Users can view own maintenance_logs" ON maintenance_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own maintenance_logs" ON maintenance_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own maintenance_logs" ON maintenance_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own maintenance_logs" ON maintenance_logs FOR DELETE USING (auth.uid() = user_id);

-- Faturamento Logs
CREATE POLICY "Users can view own faturamento_logs" ON faturamento_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own faturamento_logs" ON faturamento_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own faturamento_logs" ON faturamento_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own faturamento_logs" ON faturamento_logs FOR DELETE USING (auth.uid() = user_id);

-- Trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
