const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking for admin users...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying profiles:', error);
      return;
    }
    
    console.log('✅ Admin users found:', data?.length || 0);
    if (data && data.length > 0) {
      data.forEach(user => {
        console.log('  - ID:', user.id, 'Email:', user.email, 'Name:', user.name, 'Role:', user.role);
      });
    } else {
      console.log('⚠️  No admin users found in database');
    }
    
    // Also check current session
    console.log('\n🔍 Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
    } else if (session) {
      console.log('✅ Current session found:');
      console.log('  - User ID:', session.user.id);
      console.log('  - Email:', session.user.email);
      console.log('  - Expires at:', session.expires_at);
    } else {
      console.log('⚠️  No current session found');
    }
    
  } catch (e) {
    console.error('❌ Exception:', e);
  }
}

checkAdminUsers();
