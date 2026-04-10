
-- Enum for periodo aquisitivo status
CREATE TYPE public.status_periodo_aquisitivo AS ENUM ('aberto', 'parcial', 'concluido', 'vencido', 'desconsiderado');

-- Enum for ferias status
CREATE TYPE public.status_ferias AS ENUM ('agendada', 'concluida', 'cancelada');

-- Enum for licenca tipo
CREATE TYPE public.tipo_licenca AS ENUM ('medica', 'maternidade', 'outros');

-- =====================
-- PERIODOS AQUISITIVOS
-- =====================
CREATE TABLE public.periodos_aquisitivos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  data_limite_concessao date NOT NULL,
  dias_direito integer NOT NULL DEFAULT 30,
  dias_agendados integer NOT NULL DEFAULT 0,
  dias_gozados integer NOT NULL DEFAULT 0,
  dias_abono integer NOT NULL DEFAULT 0,
  saldo_disponivel integer NOT NULL DEFAULT 30,
  status status_periodo_aquisitivo NOT NULL DEFAULT 'aberto',
  desconsiderar_periodo boolean NOT NULL DEFAULT false,
  motivo_desconsideracao text,
  desconsiderado_por uuid,
  desconsiderado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.periodos_aquisitivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage periodos_aquisitivos"
  ON public.periodos_aquisitivos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth can view periodos_aquisitivos"
  ON public.periodos_aquisitivos FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_periodos_aquisitivos_updated_at
  BEFORE UPDATE ON public.periodos_aquisitivos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- FERIAS PERIODOS
-- =====================
CREATE TABLE public.ferias_periodos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_aquisitivo_id uuid NOT NULL REFERENCES public.periodos_aquisitivos(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias_gozo integer NOT NULL,
  abono_pecuniario boolean NOT NULL DEFAULT false,
  dias_abono integer NOT NULL DEFAULT 0,
  decimo_terceiro_antecipado boolean NOT NULL DEFAULT false,
  status status_ferias NOT NULL DEFAULT 'agendada',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ferias_periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ferias_periodos"
  ON public.ferias_periodos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth can view ferias_periodos"
  ON public.ferias_periodos FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_ferias_periodos_updated_at
  BEFORE UPDATE ON public.ferias_periodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- LICENCAS
-- =====================
CREATE TABLE public.licencas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo tipo_licenca NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage licencas"
  ON public.licencas FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auth can view licencas"
  ON public.licencas FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_licencas_updated_at
  BEFORE UPDATE ON public.licencas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- DATA DE CORTE CONFIG
-- =====================
INSERT INTO public.configuracoes_encargos (nome, taxa, tipo, data_vigencia)
VALUES ('data_corte_periodos_aquisitivos', 0, 'config', '2024-01-01');

-- =====================
-- MIGRATE EXISTING DATA from ausencias
-- =====================
-- Migrate licencas (non-ferias)
INSERT INTO public.licencas (colaborador_id, tipo, data_inicio, data_fim, observacao, created_at)
SELECT
  colaborador_id,
  CASE
    WHEN tipo = 'licenca_medica' THEN 'medica'::tipo_licenca
    WHEN tipo = 'licenca_maternidade' THEN 'maternidade'::tipo_licenca
    ELSE 'outros'::tipo_licenca
  END,
  data_inicio,
  data_fim,
  observacao,
  created_at
FROM public.ausencias
WHERE tipo IN ('licenca_medica', 'licenca_maternidade');
