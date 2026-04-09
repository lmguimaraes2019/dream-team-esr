
-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'leitura');
CREATE TYPE public.nivel_complexidade AS ENUM ('junior', 'pleno', 'senior', 'especialista', 'master');
CREATE TYPE public.tipo_vinculo AS ENUM ('clt', 'terceirizado');
CREATE TYPE public.genero AS ENUM ('masculino', 'feminino', 'outro');

-- 2. Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'leitura',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. RLS for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'leitura');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Colaboradores
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  genero public.genero NOT NULL,
  lideranca BOOLEAN NOT NULL DEFAULT false,
  data_admissao DATE NOT NULL,
  gerencia TEXT NOT NULL,
  diretoria TEXT NOT NULL,
  cargo TEXT NOT NULL,
  trajetoria TEXT NOT NULL,
  nivel_complexidade public.nivel_complexidade NOT NULL,
  grupo INTEGER NOT NULL CHECK (grupo IN (1, 2)),
  tipo_vinculo public.tipo_vinculo NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view colaboradores" ON public.colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert colaboradores" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update colaboradores" ON public.colaboradores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete colaboradores" ON public.colaboradores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_colaboradores_updated_at BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Custos mensais
CREATE TABLE public.custos_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  mes_referencia TEXT NOT NULL,
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  inss NUMERIC(12,2) NOT NULL DEFAULT 0,
  fgts NUMERIC(12,2) NOT NULL DEFAULT 0,
  pis NUMERIC(12,2) NOT NULL DEFAULT 0,
  vr_va NUMERIC(12,2) NOT NULL DEFAULT 0,
  vt NUMERIC(12,2) NOT NULL DEFAULT 0,
  plano_saude NUMERIC(12,2) NOT NULL DEFAULT 0,
  seguro NUMERIC(12,2) NOT NULL DEFAULT 0,
  internet NUMERIC(12,2) NOT NULL DEFAULT 0,
  ferias NUMERIC(12,2) NOT NULL DEFAULT 0,
  um_terco_ferias NUMERIC(12,2) NOT NULL DEFAULT 0,
  decimo_terceiro NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_anual NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, mes_referencia)
);
ALTER TABLE public.custos_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view custos" ON public.custos_mensais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert custos" ON public.custos_mensais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update custos" ON public.custos_mensais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete custos" ON public.custos_mensais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_custos_mes ON public.custos_mensais (mes_referencia);
CREATE INDEX idx_custos_colab ON public.custos_mensais (colaborador_id);

-- 10. Configurações de encargos
CREATE TABLE public.configuracoes_encargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  taxa NUMERIC(6,4) NOT NULL,
  data_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes_encargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view config" ON public.configuracoes_encargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage config" ON public.configuracoes_encargos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON public.configuracoes_encargos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Importações
CREATE TABLE public.importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome_arquivo TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  qtd_registros INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view importacoes" ON public.importacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert importacoes" ON public.importacoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
