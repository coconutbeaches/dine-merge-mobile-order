#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminUser() {
  try {
    const email = 'admin@test.com';
    const password = 'admin123'; // Change this to a secure password
    
    console.log(`Creating admin user: ${email}`);
    
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: 'Admin User' }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('✅ User created in auth:', authData.user.id);

    // Create/update profile with admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        name: 'Admin User',
        role: 'admin'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('✅ Profile created with admin role');
    
    // Verify the creation
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', authData.user.id)
      .single();

    if (!verifyError) {
      console.log(`✅ Verified: ${profile.email} has role: ${profile.role}`);
    }
    
    console.log(`\n🎉 Admin user created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔐 Password: ${password}`);
    console.log(`\nYou can now log in with these credentials to see the admin cog.`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser();
