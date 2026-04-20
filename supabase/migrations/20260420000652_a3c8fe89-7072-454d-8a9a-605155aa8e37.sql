
-- 1. Explicit deny policies on user_credits to prevent any client-side writes
CREATE POLICY "No client inserts on user_credits"
  ON public.user_credits FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "No client updates on user_credits"
  ON public.user_credits FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "No client deletes on user_credits"
  ON public.user_credits FOR DELETE TO authenticated, anon
  USING (false);

-- 2. Owner-scoped DELETE and UPDATE policies on wishwave-generated bucket
CREATE POLICY "Users can delete their own generated files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'wishwave-generated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own generated files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wishwave-generated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'wishwave-generated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
