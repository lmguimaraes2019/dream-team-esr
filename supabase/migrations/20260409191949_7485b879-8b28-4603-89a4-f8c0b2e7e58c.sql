
-- Widen taxa column to hold both rates and fixed values
ALTER TABLE public.configuracoes_encargos
ALTER COLUMN taxa TYPE numeric USING taxa::numeric;

-- Add tipo column
ALTER TABLE public.configuracoes_encargos
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'taxa';

-- Clear existing defaults and insert standard parameters
DELETE FROM public.configuracoes_encargos;

INSERT INTO public.configuracoes_encargos (nome, taxa, tipo) VALUES
  ('INSS', 0.255, 'taxa'),
  ('FGTS', 0.08, 'taxa'),
  ('PIS', 0.01, 'taxa'),
  ('VR/VA', 1069.77, 'valor'),
  ('Seguro Vida', 0.005811, 'taxa'),
  ('Internet', 100.00, 'valor'),
  ('VT', 0, 'valor'),
  ('Plano Saúde', 0, 'valor');
