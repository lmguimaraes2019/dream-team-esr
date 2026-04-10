
-- Enums
CREATE TYPE public.tipo_feedback AS ENUM ('positivo', 'construtivo', 'reconhecimento', 'ajuste');
CREATE TYPE public.tipo_acao_dev AS ENUM ('curso', 'pratica', 'comportamento');
CREATE TYPE public.status_acao_dev AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE public.status_one_on_one AS ENUM ('planejado', 'realizado');
CREATE TYPE public.origem_acao AS ENUM ('one_on_one', 'feedback');

-- one_on_one
CREATE TABLE public.one_on_one (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  gestor_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  status public.status_one_on_one NOT NULL DEFAULT 'planejado',
  pauta text,
  resumo text NOT NULL,
  pontos_positivos text,
  pontos_atencao text,
  riscos text,
  proximos_passos text,
  confidencial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.one_on_one ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestores can manage one_on_one"
  ON public.one_on_one FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Auth can view one_on_one"
  ON public.one_on_one FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_one_on_one_updated_at
  BEFORE UPDATE ON public.one_on_one
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- feedback
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  tipo public.tipo_feedback NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  contexto text,
  descricao text NOT NULL,
  impacto text,
  sugestao_melhoria text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestores can manage feedback"
  ON public.feedback FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Auth can view feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (true);

-- desenvolvimento_acoes
CREATE TABLE public.desenvolvimento_acoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  origem_tipo public.origem_acao,
  origem_id uuid,
  descricao text NOT NULL,
  tipo public.tipo_acao_dev NOT NULL DEFAULT 'pratica',
  prazo date,
  status public.status_acao_dev NOT NULL DEFAULT 'pendente',
  evidencia text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.desenvolvimento_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and gestores can manage desenvolvimento_acoes"
  ON public.desenvolvimento_acoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Auth can view desenvolvimento_acoes"
  ON public.desenvolvimento_acoes FOR SELECT TO authenticated
  USING (true);
