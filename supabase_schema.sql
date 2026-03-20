-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  city TEXT,
  car_model TEXT,
  fuel_type TEXT,
  km_per_liter NUMERIC,
  daily_goal NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trips Table
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  app TEXT NOT NULL, -- 'Uber', '99', 'Particular'
  gross NUMERIC DEFAULT 0,
  tips NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  hours_online NUMERIC DEFAULT 0,
  rides INTEGER DEFAULT 0,
  km_driven NUMERIC DEFAULT 0,
  tolls NUMERIC DEFAULT 0,
  passenger_paid_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Expenses Table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  value NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Fuel Logs Table
CREATE TABLE fuel_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  liters NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  odometer NUMERIC,
  fuel_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Maintenance Logs Table
CREATE TABLE maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  odometer NUMERIC,
  next_change_km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Goals Table
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  daily_goal NUMERIC DEFAULT 0,
  weekly_goal NUMERIC DEFAULT 0,
  monthly_goal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Settings Table
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'dark',
  default_trip_time NUMERIC,
  default_trip_km NUMERIC,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trips
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE USING (auth.uid() = user_id);

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

-- Goals
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);

-- Settings
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);

-- 8. Faturamento Logs Table
CREATE TABLE faturamento_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  vehicle_mode TEXT NOT NULL, -- 'carro', 'moto'
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE faturamento_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can view own faturamento_logs" ON faturamento_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own faturamento_logs" ON faturamento_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own faturamento_logs" ON faturamento_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own faturamento_logs" ON faturamento_logs FOR DELETE USING (auth.uid() = user_id);

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
