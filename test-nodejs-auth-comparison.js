#!/usr/bin/env node
/**
 * Node.js Auth Comparison Test
 * 
 * This script tests supabase.auth.getSession({ force: true }) behavior in Node.js
 * to establish a baseline for comparison with browser behavior.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testNodeJsAuth() {
  console.log('🔄 Testing Node.js Auth Behavior...');
  console.log('='.repeat(50));
  
  // Test 1: Standard getSession() call
  console.log('\n1. Testing standard getSession() call...');
  console.log('-'.repeat(30));
  
  try {
    const startTime = Date.now();
    console.log(`[${startTime}] BEFORE supabase.auth.getSession()`);
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`[${endTime}] AFTER supabase.auth.getSession() - ${latency}ms`);
    console.log(`Result: ${session ? 'Session found' : 'No session'}`);
    
    if (error) {
      console.error('❌ Error:', error.message);
    }
    
    if (session) {
      console.log('✅ Session details:');
      console.log(`  - User ID: ${session.user.id}`);
      console.log(`  - Email: ${session.user.email}`);
      console.log(`  - Expires at: ${session.expires_at}`);
      console.log(`  - Access token length: ${session.access_token.length}`);
      console.log(`  - Refresh token length: ${session.refresh_token.length}`);
    }
    
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
  
  // Test 2: Force refresh getSession() call
  console.log('\n2. Testing getSession({ force: true }) call...');
  console.log('-'.repeat(30));
  
  try {
    const startTime = Date.now();
    console.log(`[${startTime}] BEFORE supabase.auth.getSession({ force: true })`);
    
    const { data: { session }, error } = await supabase.auth.getSession({ force: true });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`[${endTime}] AFTER supabase.auth.getSession({ force: true }) - ${latency}ms`);
    console.log(`Result: ${session ? 'Session found' : 'No session'}`);
    
    if (error) {
      console.error('❌ Error:', error.message);
    }
    
    if (session) {
      console.log('✅ Session details:');
      console.log(`  - User ID: ${session.user.id}`);
      console.log(`  - Email: ${session.user.email}`);
      console.log(`  - Expires at: ${session.expires_at}`);
      console.log(`  - Access token length: ${session.access_token.length}`);
      console.log(`  - Refresh token length: ${session.refresh_token.length}`);
    }
    
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
  
  // Test 3: Test direct network call to auth endpoint
  console.log('\n3. Testing direct network call to auth endpoint...');
  console.log('-'.repeat(30));
  
  try {
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
    console.log(`Testing endpoint: ${authUrl}`);
    
    const startTime = Date.now();
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`Network call completed - ${latency}ms`);
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Response data:`, data);
    }
    
  } catch (e) {
    console.error('❌ Network test failed:', e.message);
  }
  
  // Test 4: Test admin login flow
  console.log('\n4. Testing admin login flow...');
  console.log('-'.repeat(30));
  
  try {
    const startTime = Date.now();
    console.log(`[${startTime}] BEFORE signInWithPassword()`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'steepdecline+3@gmail.com',
      password: 'test123'
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log(`[${endTime}] AFTER signInWithPassword() - ${latency}ms`);
    
    if (error) {
      console.log('ℹ️  Login error (expected if password is wrong):', error.message);
    } else {
      console.log('✅ Login successful');
      console.log(`  - User ID: ${data.user.id}`);
      console.log(`  - Email: ${data.user.email}`);
    }
    
  } catch (e) {
    console.error('❌ Login test failed:', e.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Node.js auth test completed');
}

// Execute the test
testNodeJsAuth().catch(console.error);
