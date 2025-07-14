const puppeteer = require('puppeteer');

async function testBrowserAuthDiagnosis() {
  console.log('🔄 Testing Browser Auth Diagnosis...');
  console.log('='.repeat(50));
  
  const browser = await puppeteer.launch({
    headless: false, // Keep browser open for inspection
    devtools: true,  // Open DevTools
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up comprehensive logging
    page.on('console', (msg) => {
      const type = msg.type().toUpperCase();
      const text = msg.text();
      console.log(`[BROWSER ${type}] ${text}`);
    });
    
    // Network monitoring specifically for auth requests
    await page.setRequestInterception(true);
    const networkLog = [];
    
    page.on('request', (request) => {
      if (request.url().includes('auth/v1') || request.url().includes('supabase')) {
        const logEntry = {
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          timestamp: Date.now(),
          type: 'REQUEST'
        };
        networkLog.push(logEntry);
        console.log(`[NETWORK] 🔄 ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    page.on('response', (response) => {
      if (response.url().includes('auth/v1') || response.url().includes('supabase')) {
        const logEntry = {
          status: response.status(),
          url: response.url(),
          headers: response.headers(),
          timestamp: Date.now(),
          type: 'RESPONSE'
        };
        networkLog.push(logEntry);
        console.log(`[NETWORK] ✅ ${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to the app
    console.log('🌐 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
    
    // Test 1: Check initial cookies
    console.log('\n1. Checking initial cookies...');
    console.log('-'.repeat(30));
    
    const cookies = await page.cookies();
    console.log(`Found ${cookies.length} cookies:`);
    
    cookies.forEach(cookie => {
      console.log(`  ${cookie.name}=${cookie.value.slice(0, 20)}... (domain: ${cookie.domain}, secure: ${cookie.secure}, sameSite: ${cookie.sameSite})`);
    });
    
    // Look specifically for sb-access-token
    const sbAccessToken = cookies.find(cookie => cookie.name === 'sb-access-token');
    if (sbAccessToken) {
      console.log('✅ sb-access-token cookie found');
      console.log(`  - Domain: ${sbAccessToken.domain}`);
      console.log(`  - Secure: ${sbAccessToken.secure}`);
      console.log(`  - SameSite: ${sbAccessToken.sameSite}`);
      console.log(`  - HttpOnly: ${sbAccessToken.httpOnly}`);
    } else {
      console.log('❌ sb-access-token cookie NOT found');
    }
    
    // Test 2: Check localStorage
    console.log('\n2. Checking localStorage...');
    console.log('-'.repeat(30));
    
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        const value = window.localStorage.getItem(key);
        items[key] = value;
      }
      return items;
    });
    
    console.log('LocalStorage items:');
    Object.entries(localStorage).forEach(([key, value]) => {
      if (key.includes('supabase') || key.includes('auth')) {
        console.log(`  ${key}: ${value.slice(0, 50)}...`);
      }
    });
    
    // Test 3: Test getSession() call directly in browser
    console.log('\n3. Testing getSession() call in browser...');
    console.log('-'.repeat(30));
    
    const sessionTest = await page.evaluate(async () => {
      try {
        // Import Supabase client from the app
        const { createClient } = window.supabase || await import('@supabase/supabase-js');
        
        const supabase = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        console.log(`[${startTime}] BEFORE supabase.auth.getSession()`);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`[${endTime}] AFTER supabase.auth.getSession() - ${latency}ms`);
        
        return {
          session: session ? {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at,
            accessTokenLength: session.access_token.length,
            refreshTokenLength: session.refresh_token.length
          } : null,
          error: error ? error.message : null,
          latency
        };
        
      } catch (e) {
        console.error('Exception in getSession():', e);
        return { error: e.message };
      }
    });
    
    console.log('Browser getSession() result:', sessionTest);
    
    // Test 4: Test getSession({ force: true }) call in browser
    console.log('\n4. Testing getSession({ force: true }) call in browser...');
    console.log('-'.repeat(30));
    
    const forceSessionTest = await page.evaluate(async () => {
      try {
        const { createClient } = window.supabase || await import('@supabase/supabase-js');
        
        const supabase = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        console.log(`[${startTime}] BEFORE supabase.auth.getSession({ force: true })`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Force session timeout')), 15000);
        });
        
        const sessionPromise = supabase.auth.getSession({ force: true });
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`[${endTime}] AFTER supabase.auth.getSession({ force: true }) - ${latency}ms`);
        
        return {
          session: session ? {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at,
            accessTokenLength: session.access_token.length,
            refreshTokenLength: session.refresh_token.length
          } : null,
          error: error ? error.message : null,
          latency
        };
        
      } catch (e) {
        console.error('Exception in getSession({ force: true }):', e);
        return { error: e.message };
      }
    });
    
    console.log('Browser getSession({ force: true }) result:', forceSessionTest);
    
    // Test 5: Check if there are any hanging network requests
    console.log('\n5. Checking for hanging network requests...');
    console.log('-'.repeat(30));
    
    // Wait a bit to see if there are any long-running requests
    console.log('Waiting 5 seconds to monitor network activity...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Network activity log:');
    networkLog.forEach(entry => {
      console.log(`[${entry.timestamp}] ${entry.type}: ${entry.method || ''} ${entry.url} ${entry.status || ''}`);
    });
    
    // Test 6: Check cookies after auth operations
    console.log('\n6. Checking cookies after auth operations...');
    console.log('-'.repeat(30));
    
    const cookiesAfter = await page.cookies();
    const sbAccessTokenAfter = cookiesAfter.find(cookie => cookie.name === 'sb-access-token');
    
    if (sbAccessTokenAfter) {
      console.log('✅ sb-access-token cookie still present after auth operations');
    } else {
      console.log('❌ sb-access-token cookie missing after auth operations');
    }
    
    // Test 7: Try to manually set a cookie and test
    console.log('\n7. Testing manual cookie setting...');
    console.log('-'.repeat(30));
    
    await page.setCookie({
      name: 'test-sb-access-token',
      value: 'test-value',
      domain: 'localhost',
      path: '/',
      secure: false,
      sameSite: 'Lax'
    });
    
    const testCookie = await page.cookies();
    const manualCookie = testCookie.find(cookie => cookie.name === 'test-sb-access-token');
    
    if (manualCookie) {
      console.log('✅ Manual cookie setting works');
    } else {
      console.log('❌ Manual cookie setting failed');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Browser auth diagnosis completed');
console.log('Closing browser automatically after 2 seconds...');
    
    // Wait a bit then close browser
    setTimeout(() => {
      browser.close();
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error during browser test:', error);
  } finally {
    // Don't close browser automatically - let user inspect
    // await browser.close();
  }
}

testBrowserAuthDiagnosis();
