
CREATE TABLE public.tabela_salarial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trajetoria text NOT NULL,
  nivel_complexidade text NOT NULL,
  grupo integer NOT NULL DEFAULT 1,
  faixa_inicio numeric NOT NULL,
  faixa_fim numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trajetoria, nivel_complexidade, grupo)
);

ALTER TABLE public.tabela_salarial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view tabela_salarial"
  ON public.tabela_salarial FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tabela_salarial"
  ON public.tabela_salarial FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tabela_salarial_updated_at
  BEFORE UPDATE ON public.tabela_salarial
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
