-- Allow users to read their own files in the wishwave-generated bucket.
-- Files are stored under {user_id}/{...} so we match the first path segment to auth.uid().
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can read their own generated videos'
  ) THEN
    CREATE POLICY "Users can read their own generated videos"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'wishwave-generated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END
$$;