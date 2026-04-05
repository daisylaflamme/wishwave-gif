
-- Create generations table
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  recipient_name TEXT,
  motion_style TEXT NOT NULL DEFAULT 'wave',
  audio_style TEXT NOT NULL DEFAULT 'cheerful',
  status TEXT NOT NULL DEFAULT 'pending',
  video_url TEXT,
  audio_url TEXT,
  runway_job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write generations (no auth required for MVP)
CREATE POLICY "Anyone can view generations" ON public.generations FOR SELECT USING (true);
CREATE POLICY "Anyone can create generations" ON public.generations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update generations" ON public.generations FOR UPDATE USING (true);

-- Create timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('wishwave-uploads', 'wishwave-uploads', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('wishwave-generated', 'wishwave-generated', true);

-- Storage policies
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'wishwave-uploads');
CREATE POLICY "Anyone can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wishwave-uploads');
CREATE POLICY "Anyone can view generated" ON storage.objects FOR SELECT USING (bucket_id = 'wishwave-generated');
CREATE POLICY "Anyone can upload generated" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wishwave-generated');
