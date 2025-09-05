// Test file to understand Bible Brain API structure
export const testBibleBrainApi = async () => {
  const API_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef';
  const BASE_URL = 'https://4.dbt.io/api';
  
  try {
    console.log('🔍 Testing Bible Brain API endpoints...');
    
    // 1. Test getting all Bibles
    console.log('\n=== Testing /bibles endpoint ===');
    const biblesResponse = await fetch(`${BASE_URL}/bibles?v=4&key=${API_KEY}&limit=10`);
    const biblesData = await biblesResponse.json();
    console.log('Bibles response:', JSON.stringify(biblesData, null, 2));
    
    if (biblesData.data && biblesData.data.length > 0) {
      const firstBible = biblesData.data[0];
      console.log('\nFirst Bible structure:', JSON.stringify(firstBible, null, 2));
      
      // 2. Test getting specific Bible info
      console.log(`\n=== Testing specific Bible: ${firstBible.abbr} ===`);
      const bibleInfoResponse = await fetch(`${BASE_URL}/bibles/${firstBible.abbr}?v=4&key=${API_KEY}`);
      const bibleInfoData = await bibleInfoResponse.json();
      console.log('Bible info response:', JSON.stringify(bibleInfoData, null, 2));
      
      // 3. Test getting books for this Bible
      console.log(`\n=== Testing books for Bible: ${firstBible.abbr} ===`);
      const booksResponse = await fetch(`${BASE_URL}/bibles/${firstBible.abbr}/books?v=4&key=${API_KEY}`);
      const booksData = await booksResponse.json();
      console.log('Books response:', JSON.stringify(booksData, null, 2));
      
      // 4. Try to get chapter text using different patterns
      console.log(`\n=== Testing chapter text patterns for Bible: ${firstBible.abbr} ===`);
      
      // Pattern 1: /text endpoint
      try {
        const textResponse1 = await fetch(`${BASE_URL}/bibles/${firstBible.abbr}/text/JHN/3?v=4&key=${API_KEY}`);
        const textData1 = await textResponse1.json();
        console.log('Text Pattern 1 (/text/JHN/3):', JSON.stringify(textData1, null, 2));
      } catch (e) {
        console.log('Text Pattern 1 failed:', e.message);
      }
      
      // Pattern 2: /chapters endpoint
      try {
        const textResponse2 = await fetch(`${BASE_URL}/bibles/${firstBible.abbr}/chapters/JHN.3?v=4&key=${API_KEY}`);
        const textData2 = await textResponse2.json();
        console.log('Text Pattern 2 (/chapters/JHN.3):', JSON.stringify(textData2, null, 2));
      } catch (e) {
        console.log('Text Pattern 2 failed:', e.message);
      }
      
      // Pattern 3: /filesets approach (current approach)
      if (bibleInfoData.data && bibleInfoData.data.filesets) {
        console.log('\nFilesets available:', Object.keys(bibleInfoData.data.filesets));
        
        for (const [source, filesets] of Object.entries(bibleInfoData.data.filesets)) {
          if (Array.isArray(filesets)) {
            const textFileset = filesets.find((fs: any) => 
              fs.type === 'text_plain' || fs.type === 'text_format'
            );
            
            if (textFileset) {
              console.log(`\nFound text fileset: ${textFileset.id} (${textFileset.type})`);
              
              try {
                const textResponse3 = await fetch(`${BASE_URL}/bibles/${firstBible.abbr}/filesets/${textFileset.id}/JHN/3?v=4&key=${API_KEY}`);
                const textData3 = await textResponse3.json();
                console.log('Text Pattern 3 (/filesets approach):', JSON.stringify(textData3, null, 2));
                break;
              } catch (e) {
                console.log('Text Pattern 3 failed:', e.message);
              }
            }
          }
        }
      }
    }
    
    // 5. Test different Bible IDs that might work
    console.log('\n=== Testing common Bible IDs ===');
    const commonIds = ['KJVPCE', 'KJV', 'ENGESV', 'ESV', 'NIV', 'ENGNIV', 'NASB', 'ENGNAS'];
    
    for (const id of commonIds) {
      try {
        const response = await fetch(`${BASE_URL}/bibles/${id}?v=4&key=${API_KEY}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${id}: Found - ${data.data?.name || 'Unknown'}`);
          
          // Try to get John 3 for working Bibles
          if (data.data && data.data.filesets) {
            for (const [source, filesets] of Object.entries(data.data.filesets)) {
              if (Array.isArray(filesets)) {
                const textFileset = filesets.find((fs: any) => 
                  fs.type === 'text_plain' || fs.type === 'text_format'
                );
                
                if (textFileset) {
                  try {
                    const chapterResponse = await fetch(`${BASE_URL}/bibles/${id}/filesets/${textFileset.id}/JHN/3?v=4&key=${API_KEY}`);
                    if (chapterResponse.ok) {
                      const chapterData = await chapterResponse.json();
                      console.log(`  📖 Chapter data available: ${chapterData.data?.length || 0} verses`);
                      if (chapterData.data && chapterData.data.length > 0) {
                        console.log(`  📝 Sample verse: ${chapterData.data[0].verse_text?.substring(0, 100)}...`);
                      }
                    }
                  } catch (e) {
                    // Silent fail for chapter test
                  }
                  break;
                }
              }
            }
          }
        } else {
          console.log(`❌ ${id}: Not found (${response.status})`);
        }
      } catch (e) {
        console.log(`❌ ${id}: Error - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Bible Brain API test failed:', error);
  }
};