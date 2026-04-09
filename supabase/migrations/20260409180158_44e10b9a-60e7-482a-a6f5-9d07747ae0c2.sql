
CREATE POLICY "Admins can delete importacoes"
ON public.importacoes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update importacoes"
ON public.importacoes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
