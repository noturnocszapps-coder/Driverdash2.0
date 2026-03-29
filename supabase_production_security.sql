-- ===============================================================
-- DRIVERDASH BETA - PRODUCTION SECURITY MIGRATION
-- ===============================================================

-- 1. AJUSTAR TABELA PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'driver',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Constraints de validação
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'driver', 'passenger', 'retailer', 'supplier'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'pending', 'blocked', 'suspended'));

-- 2. CRIAR TABELA FINANCIAL_ENTRIES (SE NÃO EXISTIR)
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('uber', 'noventanove', 'indriver', 'extra')),
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  origin TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO (RLS) - ISOLAMENTO TOTAL

-- Função auxiliar para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- PROTEÇÃO DE ROLE E STATUS VIA TRIGGER
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não for admin, impede alteração de role e status
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
  END IF;
  
  -- Atualiza o timestamp de modificação
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_protect ON public.profiles;
CREATE TRIGGER on_profile_update_protect
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_fields();

-- VEHICLES
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
CREATE POLICY "Users can view own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
CREATE POLICY "Users can insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
CREATE POLICY "Users can update own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;
CREATE POLICY "Users can delete own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- CYCLES
DROP POLICY IF EXISTS "Users can view own cycles" ON public.cycles;
CREATE POLICY "Users can view own cycles" ON public.cycles FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own cycles" ON public.cycles;
CREATE POLICY "Users can insert own cycles" ON public.cycles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own cycles" ON public.cycles;
CREATE POLICY "Users can update own cycles" ON public.cycles FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own cycles" ON public.cycles;
CREATE POLICY "Users can delete own cycles" ON public.cycles FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- FINANCIAL_ENTRIES
DROP POLICY IF EXISTS "Users can view own financial_entries" ON public.financial_entries;
CREATE POLICY "Users can view own financial_entries" ON public.financial_entries FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own financial_entries" ON public.financial_entries;
CREATE POLICY "Users can insert own financial_entries" ON public.financial_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own financial_entries" ON public.financial_entries;
CREATE POLICY "Users can update own financial_entries" ON public.financial_entries FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own financial_entries" ON public.financial_entries;
CREATE POLICY "Users can delete own financial_entries" ON public.financial_entries FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- DEMAIS TABELAS (REPETIR PADRÃO)
-- imported_reports, expenses, fuel_logs, maintenance_logs, faturamento_logs
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('imported_reports', 'expenses', 'fuel_logs', 'maintenance_logs', 'faturamento_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Users can view own %I" ON public.%I FOR SELECT USING (auth.uid() = user_id OR is_admin())', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Users can insert own %I" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Users can update own %I" ON public.%I FOR UPDATE USING (auth.uid() = user_id OR is_admin())', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Users can delete own %I" ON public.%I FOR DELETE USING (auth.uid() = user_id OR is_admin())', t, t);
  END LOOP;
END $$;

-- 5. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PROFILE (ROBUSTO)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT := 'driver';
  default_status TEXT := 'active';
BEGIN
  -- Se o email for o do dono do projeto, define como admin
  IF new.email = 'noturnocszapps@gmail.com' THEN
    default_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, name, role, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Motorista'), 
    default_role, 
    default_status
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    role = CASE WHEN profiles.role = 'admin' THEN profiles.role ELSE EXCLUDED.role END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atachar trigger à auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. GARANTIR QUE O ADMIN ATUAL ESTEJA CORRETO
UPDATE public.profiles 
SET role = 'admin', status = 'active' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'noturnocszapps@gmail.com');
