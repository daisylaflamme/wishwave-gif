-- Drop the overly permissive UPDATE policy on generations
DROP POLICY IF EXISTS "Anyone can update generations" ON public.generations;

-- Drop public INSERT on wishwave-generated bucket (only edge functions w/ service role should write)
DROP POLICY IF EXISTS "Anyone can upload generated" ON storage.objects;