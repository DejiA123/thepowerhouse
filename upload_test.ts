
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://swjzhzmhqyvwfwevijja.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpload() {
    try {
        console.log("Testing upload to 'backing-tracks' bucket...");
        const testContent = "This is a test file";
        const fileName = `test_${Date.now()}.txt`;

        // Try to upload using SDK
        const { data, error } = await supabase.storage
            .from('backing-tracks')
            .upload(fileName, testContent, {
                contentType: 'text/plain',
                upsert: false
            });

        if (error) {
            console.error("SDK Upload failed:", error);
            // Check if bucket exists
            const { data: buckets } = await supabase.storage.listBuckets();
            console.log("Available buckets:", buckets?.map(b => b.name));
        } else {
            console.log("SDK Upload successful!", data);

            // Try to get public URL
            const { data: urlData } = supabase.storage.from('backing-tracks').getPublicUrl(fileName);
            console.log("Public URL:", urlData.publicUrl);

            // Clean up
            await supabase.storage.from('backing-tracks').remove([fileName]);
            console.log("Cleanup successful.");
        }
    } catch (err) {
        console.error("Unexpected error during test:", err);
    }
}

testUpload();
