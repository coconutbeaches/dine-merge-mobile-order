const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthHanging() {
  console.log('🔄 Testing auth hanging behavior...');
  
  // First, let's test getSession() call with timing
  console.log(`[${new Date().toISOString()}] Starting getSession() test...`);
  
  try {
    const startTime = Date.now();
    console.log(`[${startTime}] BEFORE supabase.auth.getSession() call`);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Session check timeout')), 10000);
    });
    
    const sessionPromise = supabase.auth.getSession();
    
    const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`[${endTime}] AFTER supabase.auth.getSession() call completed`);
    console.log(`⏱️  Auth latency: ${latency}ms`);
    
    if (error) {
      console.error('❌ Error getting session:', error);
    } else {
      console.log('✅ Session obtained:', !!session);
      if (session) {
        console.log('  - User ID:', session.user.id);
        console.log('  - Email:', session.user.email);
        console.log('  - Expires at:', session.expires_at);
      }
    }
    
  } catch (e) {
    console.error('❌ Exception during auth test:', e);
  }
  
  // Now test login with admin credentials
  console.log('\n🔐 Testing admin login...');
  
  try {
    const startTime = Date.now();
    console.log(`[${startTime}] BEFORE signInWithPassword() call`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'steepdecline+3@gmail.com',
      password: 'test123' // This might not work, just testing the auth flow
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`[${endTime}] AFTER signInWithPassword() call completed`);
    console.log(`⏱️  Login latency: ${latency}ms`);
    
    if (error) {
      console.log('ℹ️  Login error (expected if password is wrong):', error.message);
    } else {
      console.log('✅ Login successful');
    }
    
  } catch (e) {
    console.error('❌ Exception during login test:', e);
  }
  
  // Test network connectivity to auth endpoint
  console.log('\n🌐 Testing network connectivity...');
  
  try {
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
    console.log(`Testing endpoint: ${authUrl}`);
    
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
  } catch (e) {
    console.error('❌ Network test failed:', e);
  }
}

testAuthHanging();
