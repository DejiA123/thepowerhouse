-- Create RLS policies for the audio-bible bucket
CREATE POLICY "Public can read audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-bible');

CREATE POLICY "Public can list audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-bible');