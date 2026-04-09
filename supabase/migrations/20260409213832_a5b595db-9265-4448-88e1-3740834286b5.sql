
-- Create enum for absence types
CREATE TYPE public.tipo_ausencia AS ENUM ('ferias', 'licenca_medica', 'licenca_maternidade');

-- Create absences table
CREATE TABLE public.ausencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo public.tipo_ausencia NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view ausencias" ON public.ausencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ausencias" ON public.ausencias FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
