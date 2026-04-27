
-- Tabela principal de descrição de cargo (1 por colaborador)
CREATE TABLE public.descricao_cargo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL UNIQUE,
  missao TEXT,
  formacao_minima TEXT,
  formacao_desejavel TEXT,
  competencias TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.descricao_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view descricao_cargo"
ON public.descricao_cargo FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestores can manage descricao_cargo"
ON public.descricao_cargo FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_descricao_cargo_updated_at
BEFORE UPDATE ON public.descricao_cargo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Responsabilidades (N por descrição), agrupadas por processo
CREATE TABLE public.descricao_cargo_responsabilidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao_cargo_id UUID NOT NULL REFERENCES public.descricao_cargo(id) ON DELETE CASCADE,
  processo TEXT NOT NULL,
  responsabilidade TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_resp_descricao ON public.descricao_cargo_responsabilidades(descricao_cargo_id);

ALTER TABLE public.descricao_cargo_responsabilidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view descricao_cargo_resp"
ON public.descricao_cargo_responsabilidades FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and gestores can manage descricao_cargo_resp"
ON public.descricao_cargo_responsabilidades FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));
