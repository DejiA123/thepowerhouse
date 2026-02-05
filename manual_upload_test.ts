
// Using native fetch in Node 20+
async function testManualUpload() {
    const supabaseUrl = "https://swjzhzmhqyvwfwevijja.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE4NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ";
    const bucket = 'audio-bible'; // Testing this bucket now
    const fileName = `manual_test_${Date.now()}.txt`;
    const content = "Manual test content for audio-bible";

    const bucketUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;

    console.log(`Testing POST to: ${bucketUrl}`);

    try {
        const response = await fetch(bucketUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'text/plain',
                'x-upsert': 'false'
            },
            body: content
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error("Manual test failed with exception:", err);
    }
}

testManualUpload();
