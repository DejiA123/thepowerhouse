// Debug script to check profiles and group members
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://swjzhzmhqyvwfwevijja.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugProfiles() {
  try {
    console.log('🔍 Debugging profiles and group members...\n');

    // 1. Check profiles table
    console.log('📊 Checking profiles table:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    console.log('Sample profiles:');
    profiles.forEach(profile => {
      console.log(`  - ID: ${profile.id.substring(0, 8)}...`);
      console.log(`    Full Name: ${profile.full_name || 'NULL'}`);
      console.log(`    Email: ${profile.email || 'NULL'}`);
      console.log('');
    });

    // 2. Check group members
    console.log('📊 Checking group members:');
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        user_id, 
        group_name, 
        profiles!group_members_user_id_fkey(full_name, email)
      `)
      .limit(5);

    if (membersError) {
      console.error('❌ Error fetching group members:', membersError);
      return;
    }

    console.log('Sample group members:');
    members.forEach(member => {
      console.log(`  - User ID: ${member.user_id.substring(0, 8)}...`);
      console.log(`    Group: ${member.group_name}`);
      console.log(`    Profile Full Name: ${member.profiles?.full_name || 'NULL'}`);
      console.log(`    Profile Email: ${member.profiles?.email || 'NULL'}`);
      console.log('');
    });

    // 3. Check specifically for Choir members
    console.log('🎵 Checking Choir members specifically:');
    const { data: choirMembers, error: choirError } = await supabase
      .from('group_members')
      .select(`
        user_id, 
        group_name, 
        profiles!group_members_user_id_fkey(full_name, email)
      `)
      .eq('group_name', 'Choir')
      .limit(10);

    if (choirError) {
      console.error('❌ Error fetching choir members:', choirError);
      return;
    }

    console.log(`Found ${choirMembers.length} choir members:`);
    choirMembers.forEach(member => {
      const displayName = member.profiles?.full_name || `User ${member.user_id.substring(0, 8)}`;
      console.log(`  - ${displayName} (${member.profiles?.email || 'No email'})`);
    });

    // 4. Check for any profiles with null full_name
    console.log('\n🔍 Checking for profiles with null full_name:');
    const { data: nullProfiles, error: nullError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .is('full_name', null)
      .limit(5);

    if (nullError) {
      console.error('❌ Error checking null profiles:', nullError);
      return;
    }

    if (nullProfiles.length > 0) {
      console.log(`⚠️  Found ${nullProfiles.length} profiles with null full_name:`);
      nullProfiles.forEach(profile => {
        console.log(`  - ID: ${profile.id.substring(0, 8)}..., Email: ${profile.email}`);
      });
    } else {
      console.log('✅ No profiles with null full_name found!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugProfiles(); 