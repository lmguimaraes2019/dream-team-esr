
-- Make matricula nullable for terceirizados
ALTER TABLE public.colaboradores ALTER COLUMN matricula DROP NOT NULL;

-- Add CLT-specific field
ALTER TABLE public.colaboradores ADD COLUMN origem_recurso text;

-- Add terceirizado-specific fields
ALTER TABLE public.colaboradores ADD COLUMN empresa_terceirizada text;
ALTER TABLE public.colaboradores ADD COLUMN custo_mensal_terceirizado numeric;
ALTER TABLE public.colaboradores ADD COLUMN duracao_contrato text;
ALTER TABLE public.colaboradores ADD COLUMN gestor_contrato text;
