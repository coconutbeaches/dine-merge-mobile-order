const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnoseLogin() {
  console.log('🔍 Comprehensive Login Diagnostics');
  console.log('='.repeat(50));
  
  // 1. Test basic connectivity
  console.log('\n1. Testing basic Supabase connectivity...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('✅ Connection successful');
    console.log(`   Current session: ${session ? 'Active' : 'None'}`);
    if (error) console.log(`   Error: ${error.message}`);
  } catch (e) {
    console.log('❌ Connection failed:', e.message);
    return; // Exit if basic connection fails
  }
  
  // 2. Test admin user exists
  console.log('\n2. Checking for admin users...');
  try {
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin');
    
    if (error) {
      console.log('❌ Error querying admin users:', error.message);
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (ID: ${admin.id})`);
      });
    }
  } catch (e) {
    console.log('❌ Admin query failed:', e.message);
  }
  
  // 3. Test login with admin credentials
  console.log('\n3. Testing admin login...');
  const testCredentials = [
    { email: 'steepdecline+3@gmail.com', desc: 'Primary admin' },
    { email: 'admin@coconut.holiday', desc: 'Alternative admin' },
  ];
  
  for (const cred of testCredentials) {
    console.log(`\n   Testing ${cred.desc} (${cred.email}):`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: 'test123' // Common test password
      });
      
      if (error) {
        console.log(`   ❌ Login failed: ${error.message}`);
      } else {
        console.log(`   ✅ Login successful!`);
        console.log(`      User ID: ${data.user.id}`);
        console.log(`      Email verified: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
        
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          console.log(`      Role: ${profile.role}`);
          console.log(`      Name: ${profile.name || 'Not set'}`);
        }
        
        // Sign out for next test
        await supabase.auth.signOut();
        break;
      }
    } catch (e) {
      console.log(`   ❌ Exception during login: ${e.message}`);
    }
  }
  
  // 4. Test Supabase auth endpoints directly
  console.log('\n4. Testing Supabase auth endpoints...');
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      console.log('✅ Auth settings retrieved:');
      console.log(`   External providers: ${Object.keys(settings.external || {}).join(', ') || 'None'}`);
      console.log(`   Email auth enabled: ${settings.disable_signup ? 'No' : 'Yes'}`);
    } else {
      console.log(`❌ Auth endpoint error: ${response.status} ${response.statusText}`);
    }
  } catch (e) {
    console.log('❌ Auth endpoint test failed:', e.message);
  }
  
  // 5. Check for RLS policies
  console.log('\n5. Testing Row Level Security policies...');
  try {
    // Test if we can read from profiles without auth
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('ℹ️  RLS is active (expected):', error.message);
    } else {
      console.log('⚠️  Public access to profiles table detected');
    }
  } catch (e) {
    console.log('❌ RLS test failed:', e.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Diagnostic complete!');
  console.log('\nNext steps if login still fails:');
  console.log('1. Check browser console for errors');
  console.log('2. Clear browser storage and cookies');
  console.log('3. Try login in incognito/private mode');
  console.log('4. Check network tab for failed requests');
}

diagnoseLogin().catch(console.error);
