
-- 1. Restrict custos_mensais SELECT to admin/gestor only
DROP POLICY IF EXISTS "Auth can view custos" ON public.custos_mensais;
CREATE POLICY "Admin and gestor can view custos"
  ON public.custos_mensais
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

-- 2. Restrict feedback SELECT to admin/gestor only (they already have ALL policy)
DROP POLICY IF EXISTS "Auth can view feedback" ON public.feedback;

-- 3. Restrict one_on_one: non-admin/gestor cannot see confidential records
DROP POLICY IF EXISTS "Auth can view one_on_one" ON public.one_on_one;
CREATE POLICY "Auth can view non-confidential one_on_one"
  ON public.one_on_one
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR confidencial = false
  );

-- 4. Restrict desenvolvimento_acoes SELECT to admin/gestor (they already have ALL)
DROP POLICY IF EXISTS "Auth can view desenvolvimento_acoes" ON public.desenvolvimento_acoes;
