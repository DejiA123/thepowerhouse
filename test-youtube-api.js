// YouTube API Test Script
// This script tests the YouTube API functions to ensure they're working correctly

const testYouTubeAPI = async () => {
  console.log('🧪 Testing YouTube API Functions...\n');

  // Updated with your actual Supabase project URL
  const SUPABASE_URL = 'https://swjzhzmhqyvwfwevijja.supabase.co'; // Your project URL
  
  const testFunctions = [
    {
      name: 'fetch-youtube-videos',
      description: 'Main YouTube videos function'
    },
    {
      name: 'fetch-daily-scripture-video',
      description: 'Daily scripture video function'
    }
  ];

  for (const func of testFunctions) {
    console.log(`📺 Testing ${func.name} (${func.description})...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func.name}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${func.name} is working!`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Cache: ${response.headers.get('X-Cache') || 'Unknown'}`);
        
        if (func.name === 'fetch-youtube-videos') {
          if (data.videos && data.videos.length > 0) {
            console.log(`   Videos returned: ${data.videos.length}`);
            console.log(`   First video: ${data.videos[0].title}`);
          } else {
            console.log(`   ⚠️  No videos returned`);
          }
        } else if (func.name === 'fetch-daily-scripture-video') {
          if (data.video) {
            console.log(`   Daily video: ${data.video.title}`);
          } else {
            console.log(`   ⚠️  No daily video returned`);
          }
        }
        
        if (data.isFallback) {
          console.log(`   ℹ️  Using fallback data (API may be unavailable)`);
        }
        
        if (data.error) {
          console.log(`   ⚠️  Error message: ${data.error}`);
        }
      } else {
        console.log(`❌ ${func.name} failed with status ${response.status}`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${func.name} failed with error: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎯 Test Summary:');
  console.log('   • If you see ✅, the function is working correctly');
  console.log('   • If you see ⚠️, the function is working but using fallback data');
  console.log('   • If you see ❌, there may be an issue with the function');
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Fallback data is normal when YouTube API quota is exceeded');
  console.log('   • Check the YouTube API Monitor dashboard for usage statistics');
  console.log('   • Ensure your YOUTUBE_API_KEY is configured in Supabase');
};

// Run the test
testYouTubeAPI().catch(console.error); 