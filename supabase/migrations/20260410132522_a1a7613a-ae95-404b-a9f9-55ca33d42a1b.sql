ALTER TABLE public.ausencias
  ADD COLUMN periodo_aquisitivo_inicio date,
  ADD COLUMN periodo_aquisitivo_fim date,
  ADD COLUMN dias integer,
  ADD COLUMN abono_pecuniario boolean NOT NULL DEFAULT false,
  ADD COLUMN dias_abono integer,
  ADD COLUMN decimo_terceiro_antecipado boolean NOT NULL DEFAULT false;