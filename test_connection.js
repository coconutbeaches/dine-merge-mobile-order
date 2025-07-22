const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Testing Supabase connection...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);

supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session check result:', { 
    hasSession: !!data.session, 
    error: error?.message || 'none' 
  });
  
  // Test a simple query to profiles table
  return supabase.from('profiles').select('id, role').eq('role', 'admin').limit(1);
}).then(({ data, error }) => {
  console.log('Admin query result:', { 
    adminCount: data?.length || 0, 
    error: error?.message || 'none' 
  });
}).catch(e => {
  console.error('Connection failed:', e.message);
});
