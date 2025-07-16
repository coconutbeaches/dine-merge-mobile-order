#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setExistingUserAdmin() {
  try {
    const email = 'steepdecline+3@gmail.com';
    
    console.log(`Setting existing user as admin: ${email}`);
    
    // Get user from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error('User not found in auth');
      return;
    }
    
    console.log('✅ User found in auth:', user.id);
    
    // Create/update profile with admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email,
        name: user.user_metadata?.name || 'Admin User',
        role: 'admin'
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return;
    }

    console.log('✅ Profile updated with admin role');
    
    // Verify the update
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', user.id)
      .single();

    if (!verifyError) {
      console.log(`✅ Verified: ${profile.email} has role: ${profile.role}`);
    }
    
    console.log(`\n🎉 User set as admin successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`\nYou can now log in with this email to see the admin cog.`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setExistingUserAdmin();
