CREATE TABLE public.movimentacoes_carreira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo_movimentacao text NOT NULL,
  cargo text,
  salario numeric,
  trajetoria text,
  nivel text,
  grupo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_carreira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage movimentacoes" ON public.movimentacoes_carreira
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth can view movimentacoes" ON public.movimentacoes_carreira
  FOR SELECT TO authenticated USING (true);

CREATE UNIQUE INDEX idx_movimentacoes_unique 
  ON public.movimentacoes_carreira (colaborador_id, data, tipo_movimentacao);