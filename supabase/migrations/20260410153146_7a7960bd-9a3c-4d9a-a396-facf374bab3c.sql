ALTER TABLE public.ferias_periodos 
  ADD COLUMN numero_programacao smallint NOT NULL DEFAULT 1;

ALTER TABLE public.ferias_periodos 
  ADD CONSTRAINT ferias_numero_prog_check 
  CHECK (numero_programacao BETWEEN 1 AND 3);