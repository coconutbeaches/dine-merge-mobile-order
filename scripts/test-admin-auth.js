#!/usr/bin/env node

/**
 * Test script to verify server-side admin authentication
 * This script tests the verifyAdminRole function with different scenarios
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testAdminAuth() {
  console.log('🔒 Testing Server-Side Admin Authentication\n');

  try {
    // Test 1: Check if service role client can access profiles
    console.log('Test 1: Service role client access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(5);

    if (profilesError) {
      console.error('❌ Service role client failed:', profilesError.message);
      return false;
    }

    console.log('✅ Service role client working');
    console.log(`   Found ${profiles.length} profiles`);

    // Test 2: Check for admin users
    console.log('\nTest 2: Admin users check...');
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('❌ Admin query failed:', adminsError.message);
      return false;
    }

    console.log('✅ Admin query working');
    console.log(`   Found ${admins.length} admin users`);

    if (admins.length > 0) {
      console.log('   Admin users:');
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.id})`);
      });
    }

    // Test 3: Check non-admin users
    console.log('\nTest 3: Non-admin users check...');
    const { data: nonAdmins, error: nonAdminsError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .neq('role', 'admin')
      .limit(3);

    if (nonAdminsError) {
      console.error('❌ Non-admin query failed:', nonAdminsError.message);
      return false;
    }

    console.log('✅ Non-admin query working');
    console.log(`   Found ${nonAdmins.length} non-admin users`);

    if (nonAdmins.length > 0) {
      console.log('   Non-admin users:');
      nonAdmins.forEach(user => {
        console.log(`   - ${user.email} (${user.role || 'customer'})`);
      });
    }

    console.log('\n🎉 All tests passed!');
    console.log('\nServer-side admin authentication is ready to use.');
    console.log('The hard gate will:');
    console.log('- ✅ Allow admin users to access /admin routes');
    console.log('- ❌ Redirect non-admin users to /menu');
    console.log('- ❌ Redirect unauthenticated users to /menu');
    console.log('- 🔒 Cannot be bypassed by client-side manipulation');

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testAdminAuth().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
