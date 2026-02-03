-- Create backing-tracks storage bucket for choir instrumental resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('backing-tracks', 'backing-tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for backing-tracks bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload backing tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backing-tracks');

-- Allow public read access to backing tracks
CREATE POLICY "Public users can read backing tracks"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'backing-tracks');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Authenticated users can update backing tracks"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'backing-tracks');

-- Allow authenticated users to delete backing tracks
CREATE POLICY "Authenticated users can delete backing tracks"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backing-tracks');
