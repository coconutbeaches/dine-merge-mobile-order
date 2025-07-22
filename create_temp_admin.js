const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTempAdmin() {
  console.log('Creating temporary admin user...');
  
  const tempEmail = 'temp-admin@coconut.holiday';
  const tempPassword = 'TempAdmin123!';
  
  try {
    // Create new user with service role
    const { data, error } = await supabase.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: 'Temporary Admin' }
    });
    
    if (error) {
      console.log('❌ Failed to create user:', error.message);
      return;
    }
    
    console.log('✅ User created successfully!');
    console.log('Email:', tempEmail);
    console.log('Password:', tempPassword);
    console.log('User ID:', data.user.id);
    
    // Update user profile to admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin', name: 'Temporary Admin' })
      .eq('id', data.user.id);
    
    if (profileError) {
      console.log('⚠️  User created but profile update failed:', profileError.message);
    } else {
      console.log('✅ Profile updated to admin role');
    }
    
    console.log('\n🎯 You can now login with:');
    console.log('Email:', tempEmail);
    console.log('Password:', tempPassword);
    
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

createTempAdmin();
