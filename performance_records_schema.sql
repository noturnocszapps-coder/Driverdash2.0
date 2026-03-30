-- 9. Performance Records Table
CREATE TABLE IF NOT EXISTS performance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration NUMERIC NOT NULL,
  earnings NUMERIC NOT NULL,
  distance NUMERIC NOT NULL,
  profit_per_km NUMERIC NOT NULL,
  profit_per_hour NUMERIC NOT NULL,
  region TEXT,
  day_of_week INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own performance_records" ON performance_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance_records" ON performance_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance_records" ON performance_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance_records" ON performance_records FOR DELETE USING (auth.uid() = user_id);

-- RPC to clear all user operational data
CREATE OR REPLACE FUNCTION public.clear_all_user_operational_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.cycles WHERE user_id = auth.uid();
  DELETE FROM public.financial_entries WHERE user_id = auth.uid();
  DELETE FROM public.imported_reports WHERE user_id = auth.uid();
  DELETE FROM public.expenses WHERE user_id = auth.uid();
  DELETE FROM public.fuel_logs WHERE user_id = auth.uid();
  DELETE FROM public.maintenance_logs WHERE user_id = auth.uid();
  DELETE FROM public.faturamento_logs WHERE user_id = auth.uid();
  DELETE FROM public.performance_records WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
