
CREATE TABLE public.origens_recurso (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.origens_recurso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view origens" ON public.origens_recurso FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage origens" ON public.origens_recurso FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
