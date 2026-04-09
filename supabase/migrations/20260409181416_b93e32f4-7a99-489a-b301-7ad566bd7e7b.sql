
-- Add new values to nivel_complexidade enum
ALTER TYPE public.nivel_complexidade ADD VALUE IF NOT EXISTS 'assistente';
ALTER TYPE public.nivel_complexidade ADD VALUE IF NOT EXISTS 'gerente_01';
ALTER TYPE public.nivel_complexidade ADD VALUE IF NOT EXISTS 'gerente_02';
ALTER TYPE public.nivel_complexidade ADD VALUE IF NOT EXISTS 'gerente_03';

-- Add foto_url column to colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS foto_url text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));
