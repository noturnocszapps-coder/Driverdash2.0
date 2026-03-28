-- 1. ADICIONAR COLUNAS FALTANTES (SE NÃO EXISTIREM)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'driver',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. PADRONIZAR CONSTRAINTS DE VALIDAÇÃO
-- Removemos as antigas para garantir que os novos valores sejam aceitos
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'driver', 'passenger', 'retailer', 'supplier'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'pending', 'blocked', 'suspended'));

-- 3. CORRIGIR DADOS EXISTENTES
UPDATE public.profiles SET role = 'driver' WHERE role IS NULL OR role NOT IN ('admin', 'driver', 'passenger', 'retailer', 'supplier');
UPDATE public.profiles SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'pending', 'blocked', 'suspended');

-- 4. ATUALIZAR TRIGGER DE CRIAÇÃO DE PERFIL
-- Garante que novos usuários via Auth recebam os valores padrão corretos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Motorista'), 
    COALESCE(new.raw_user_meta_data->>'role', 'driver'), 
    COALESCE(new.raw_user_meta_data->>'status', 'active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular o trigger (por segurança)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
