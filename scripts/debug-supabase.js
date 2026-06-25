#!/usr/bin/env node

// Simple script to test Supabase connection and query performance
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcplwmvbhreevxvsdmog.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const startTime = Date.now();
    const { data, error } = await supabase.from('categories').select('count').limit(1);
    const endTime = Date.now();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    
    console.log(`✅ Connection successful (${endTime - startTime}ms)`);
    
    // Test categories query
    console.log('\n2. Testing categories query...');
    const catStartTime = Date.now();
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    const catEndTime = Date.now();
    
    if (catError) {
      console.error('❌ Categories query failed:', catError.message);
    } else {
      console.log(`✅ Categories query successful (${catEndTime - catStartTime}ms)`);
      console.log(`   Found ${categories.length} categories`);
    }
    
    // Test products query
    console.log('\n3. Testing products query...');
    const prodStartTime = Date.now();
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, image_url, price, category_id')
      .order('sort_order', { ascending: true });
    const prodEndTime = Date.now();
    
    if (prodError) {
      console.error('❌ Products query failed:', prodError.message);
    } else {
      console.log(`✅ Products query successful (${prodEndTime - prodStartTime}ms)`);
      console.log(`   Found ${products.length} products`);
    }
    
    // Test parallel queries
    console.log('\n4. Testing parallel queries...');
    const parallelStartTime = Date.now();
    const [catResult, prodResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('id, name, image_url, price, category_id').order('sort_order', { ascending: true })
    ]);
    const parallelEndTime = Date.now();
    
    if (catResult.error || prodResult.error) {
      console.error('❌ Parallel queries failed:', catResult.error || prodResult.error);
    } else {
      console.log(`✅ Parallel queries successful (${parallelEndTime - parallelStartTime}ms)`);
      console.log(`   Categories: ${catResult.data.length}, Products: ${prodResult.data.length}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();
