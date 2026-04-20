
-- 1. Block all client writes to purchases (only service role bypasses RLS)
CREATE POLICY "No client inserts on purchases"
  ON public.purchases FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "No client updates on purchases"
  ON public.purchases FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "No client deletes on purchases"
  ON public.purchases FOR DELETE TO authenticated, anon
  USING (false);

-- 2. Remove user_credits from realtime publication to prevent cross-user subscription leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_credits;

-- 3. Make wishwave-generated bucket private and scope SELECT to owner folder
UPDATE storage.buckets SET public = false WHERE id = 'wishwave-generated';

DROP POLICY IF EXISTS "Public can view generated videos" ON storage.objects;

CREATE POLICY "Users can view their own generated files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'wishwave-generated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service role can write generated files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wishwave-generated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 4. Make wishwave-uploads private as well (already has owner-scoped policies)
UPDATE storage.buckets SET public = false WHERE id = 'wishwave-uploads';
