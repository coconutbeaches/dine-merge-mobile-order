#!/usr/bin/env node

/**
 * Performance Fix Verification Script
 * Confirms that both performance issues have been resolved
 */

const puppeteer = require('puppeteer');

async function verifyPerformance() {
  console.log('🔍 Performance Fix Verification\n');
  console.log('Testing both fixes:');
  console.log('1. Cookie bloat fix (auth storage)');
  console.log('2. Database index fix (customer orders)\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable timing
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = [];
  });

  console.log('📊 Test 1: Storage Check\n');
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  const storageCheck = await page.evaluate(() => {
    const results = {
      cookies: document.cookie.split(';').filter(c => c.trim()).length,
      cookieSize: document.cookie.length,
      localStorage: Object.keys(localStorage).length,
      hasSupabaseInLocalStorage: localStorage.getItem('supabase.auth.token') !== null,
      hasSupabaseInCookies: document.cookie.includes('supabase.auth.token')
    };
    return results;
  });

  console.log('Storage Status:');
  console.log(`  • Cookies: ${storageCheck.cookies} (size: ${storageCheck.cookieSize} bytes)`);
  console.log(`  • LocalStorage items: ${storageCheck.localStorage}`);
  console.log(`  • Supabase auth in localStorage: ${storageCheck.hasSupabaseInLocalStorage ? '✅' : '❌'}`);
  console.log(`  • Supabase auth in cookies: ${storageCheck.hasSupabaseInCookies ? '❌ (should be false)' : '✅'}`);
  
  if (storageCheck.cookieSize > 2000) {
    console.warn('\n⚠️  Warning: Cookie size is large. This might indicate the cookie bloat issue persists.');
  } else {
    console.log('\n✅ Cookie bloat fix appears to be working!');
  }

  console.log('\n📊 Test 2: Customer Orders Page Load Time\n');
  
  // Test a customer orders page
  const startTime = Date.now();
  
  try {
    await page.goto('https://menu.coconut.holiday/admin/customer-orders/New_House_Magid', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Customer orders page load time: ${(loadTime / 1000).toFixed(2)} seconds`);
    
    if (loadTime < 3000) {
      console.log('✅ Database indexes are working! Page loads quickly.');
    } else if (loadTime < 10000) {
      console.log('⚠️  Page is faster but could be improved. Indexes may be partially working.');
    } else {
      console.log('❌ Page is still slow. Database indexes might not be applied correctly.');
    }
    
  } catch (error) {
    console.error('Failed to load customer orders page:', error.message);
    console.log('This might be due to authentication requirements.');
  }

  console.log('\n📊 Test 3: Monitoring Cookie Growth\n');
  console.log('Simulating 2 minutes of usage...\n');
  
  const initialCookieSize = storageCheck.cookieSize;
  
  // Navigate around for 2 minutes
  const pages = [
    'https://menu.coconut.holiday/menu',
    'https://menu.coconut.holiday/admin/orders',
    'https://menu.coconut.holiday/admin/customers'
  ];
  
  for (let i = 0; i < 6; i++) {
    const pageUrl = pages[i % pages.length];
    console.log(`[${i * 20}s] Navigating to ${pageUrl.split('/').pop()}...`);
    
    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
      console.log(`   Skipped (auth required or timeout)`);
    }
    
    await page.waitForTimeout(20000); // Wait 20 seconds
    
    const currentCookies = await page.evaluate(() => ({
      size: document.cookie.length,
      count: document.cookie.split(';').filter(c => c.trim()).length
    }));
    
    console.log(`   Cookie size: ${currentCookies.size} bytes (${currentCookies.count} cookies)`);
    
    if (currentCookies.size > initialCookieSize * 2) {
      console.warn('   ⚠️  Cookie size is growing rapidly!');
    }
  }
  
  const finalCheck = await page.evaluate(() => ({
    cookieSize: document.cookie.length,
    cookieCount: document.cookie.split(';').filter(c => c.trim()).length
  }));
  
  console.log('\n=== Final Results ===\n');
  console.log(`Initial cookie size: ${initialCookieSize} bytes`);
  console.log(`Final cookie size: ${finalCheck.cookieSize} bytes`);
  console.log(`Cookie growth: ${finalCheck.cookieSize - initialCookieSize} bytes`);
  
  if (finalCheck.cookieSize - initialCookieSize < 500) {
    console.log('\n✅ SUCCESS: Cookie bloat is fixed! Minimal cookie growth detected.');
  } else {
    console.log('\n⚠️  WARNING: Cookies are still growing. The issue may persist.');
  }

  console.log('\n📝 Summary:');
  console.log('1. Cookie Bloat Fix: ' + (finalCheck.cookieSize < 2000 ? '✅ Working' : '❌ Needs attention'));
  console.log('2. Database Indexes: Run customer orders page test manually to verify');
  console.log('\nNote: For accurate database performance testing, you need to be logged in as an admin.');

  await browser.close();
}

// Run verification
verifyPerformance().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});