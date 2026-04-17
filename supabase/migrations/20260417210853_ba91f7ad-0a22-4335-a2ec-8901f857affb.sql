-- 1. Wipe existing generations (clean slate so user_id can be NOT NULL)
DELETE FROM public.generations;

-- 2. Add user_id to generations
ALTER TABLE public.generations
  ADD COLUMN user_id uuid NOT NULL;

CREATE INDEX idx_generations_user_id ON public.generations(user_id);

-- 3. Replace permissive RLS with owner-scoped policies
DROP POLICY IF EXISTS "Anyone can create generations" ON public.generations;
DROP POLICY IF EXISTS "Anyone can view generations" ON public.generations;

CREATE POLICY "Users can view their own generations"
  ON public.generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generations"
  ON public.generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON public.generations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Tighten storage policies
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view generated" ON storage.objects;

CREATE POLICY "Users can upload to their own folder (uploads)"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wishwave-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'wishwave-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wishwave-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view generated videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'wishwave-generated');