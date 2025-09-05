// Script to fix the profiles table - ensure all users have full_name
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://swjzhzmhqyvwfwevijja.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to set this

if (!SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('You can find this in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixProfilesTable() {
  try {
    console.log('🔧 Starting profiles table fix...');

    // 1. Update existing profiles with null/empty full_name
    console.log('📝 Updating existing profiles with null full_name...');
    const { data: updateResult, error: updateError } = await supabase
      .rpc('fix_profiles_full_name');

    if (updateError) {
      console.error('❌ Error updating profiles:', updateError);
      return;
    }

    console.log('✅ Profiles updated successfully');

    // 2. Check current state
    console.log('🔍 Checking current profiles...');
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(10);

    if (checkError) {
      console.error('❌ Error checking profiles:', checkError);
      return;
    }

    console.log('📊 Sample profiles:');
    profiles.forEach(profile => {
      console.log(`  - ${profile.full_name} (${profile.email})`);
    });

    // 3. Check group members
    console.log('🔍 Checking group members...');
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        user_id, 
        group_name, 
        profiles!group_members_user_id_fkey(full_name, email)
      `)
      .eq('group_name', 'Choir')
      .limit(5);

    if (membersError) {
      console.error('❌ Error checking group members:', membersError);
      return;
    }

    console.log('📊 Sample choir members:');
    members.forEach(member => {
      const name = member.profiles?.full_name || `User ${member.user_id.substring(0, 8)}`;
      console.log(`  - ${name} (${member.profiles?.email || 'No email'})`);
    });

    console.log('✅ Database fix completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Create the RPC function first
async function createFixFunction() {
  try {
    console.log('🔧 Creating fix function...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION fix_profiles_full_name()
        RETURNS void AS $$
        BEGIN
          -- Update any existing profiles with null or empty full_name
          UPDATE public.profiles 
          SET full_name = COALESCE(
            full_name, 
            email, 
            'User ' || SUBSTRING(id::text, 1, 8)
          )
          WHERE full_name IS NULL OR full_name = '';

          -- Add NOT NULL constraint if it doesn't exist
          ALTER TABLE public.profiles 
          ALTER COLUMN full_name SET NOT NULL,
          ALTER COLUMN full_name SET DEFAULT 'Unknown User';

          -- Update the trigger function
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.profiles (id, full_name, email)
            VALUES (
              NEW.id, 
              COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.email,
                'User ' || SUBSTRING(NEW.id::text, 1, 8)
              ),
              NEW.email
            )
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('❌ Error creating function:', error);
      return false;
    }

    console.log('✅ Fix function created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating function:', error);
    return false;
  }
}

// Main execution
async function main() {
  const functionCreated = await createFixFunction();
  if (functionCreated) {
    await fixProfilesTable();
  }
}

main(); 