#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndSetAdmin() {
  try {
    // Get current user from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log('All users in auth:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });

    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    console.log('\nProfiles with roles:');
    profiles.forEach(profile => {
      console.log(`- ${profile.email} (${profile.id}) - Role: ${profile.role || 'null'}`);
    });

    // Ask user which email to set as admin
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\nEnter email to set as admin: ', async (email) => {
      const profile = profiles.find(p => p.email === email);
      
      if (!profile) {
        console.log('User not found in profiles table');
        readline.close();
        return;
      }

      // Update the user's role to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error updating role:', updateError);
      } else {
        console.log(`Successfully set ${email} as admin`);
        
        // Verify the update
        const { data: updatedProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('email, role')
          .eq('id', profile.id)
          .single();

        if (!verifyError) {
          console.log(`Verified: ${updatedProfile.email} now has role: ${updatedProfile.role}`);
        }
      }
      
      readline.close();
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndSetAdmin();
