const puppeteer = require('puppeteer');

async function testBrowserAuthDetailed() {
  console.log('🔄 Testing Browser Auth - Detailed Analysis...');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
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
    
    // Track auth-related network requests
    await page.setRequestInterception(true);
    const authRequests = [];
    
    page.on('request', (request) => {
      if (request.url().includes('auth/v1') || request.url().includes('/user')) {
        authRequests.push({
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          timestamp: Date.now(),
          type: 'REQUEST'
        });
        console.log(`[AUTH REQUEST] ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    page.on('response', (response) => {
      if (response.url().includes('auth/v1') || response.url().includes('/user')) {
        authRequests.push({
          status: response.status(),
          url: response.url(),
          headers: response.headers(),
          timestamp: Date.now(),
          type: 'RESPONSE'
        });
        console.log(`[AUTH RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to the app
    console.log('🌐 Navigating to application...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1: Check initial state
    console.log('\n1. Checking initial application state...');
    console.log('-'.repeat(40));
    
    const initialState = await page.evaluate(() => {
      return {
        cookies: document.cookie,
        localStorageKeys: Object.keys(localStorage),
        supabaseAvailable: typeof window.supabase !== 'undefined' || typeof window.createClient !== 'undefined',
        origin: window.location.origin,
        userAgent: navigator.userAgent.slice(0, 50),
        isSecureContext: window.isSecureContext
      };
    });
    
    console.log('Initial state:', initialState);
    
    // Test 2: Try to access existing Supabase client from the app
    console.log('\n2. Testing access to existing Supabase client...');
    console.log('-'.repeat(40));
    
    const supabaseClientTest = await page.evaluate(async () => {
      // Try to find the existing Supabase client in the app
      if (typeof window.supabase !== 'undefined') {
        return { found: true, source: 'window.supabase' };
      }
      
      // Try to access through React context or modules
      const rootElement = window.document.getElementById('root');
      if (rootElement) {
        const reactFiberKey = Object.keys(rootElement).find(key => key.startsWith('__reactFiber'));
        if (reactFiberKey) {
          return { found: true, source: 'React fiber detected' };
        }
      }
      
      return { found: false, source: 'none' };
    });
    
    console.log('Supabase client test:', supabaseClientTest);
    
    // Test 3: Create a new Supabase client and test getSession
    console.log('\n3. Testing getSession with new client...');
    console.log('-'.repeat(40));
    
    const sessionTest = await page.evaluate(async () => {
      try {
        // Create a new Supabase client directly
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);
        
        // Wait for the script to load
        await new Promise((resolve) => {
          script.onload = resolve;
        });
        
        const { createClient } = window.supabase;
        const client = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        console.log(`[${startTime}] BEFORE client.auth.getSession()`);
        
        const { data: { session }, error } = await client.auth.getSession();
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`[${endTime}] AFTER client.auth.getSession() - ${latency}ms`);
        
        return {
          session: session ? {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          } : null,
          error: error ? error.message : null,
          latency,
          success: true
        };
        
      } catch (e) {
        console.error('Exception in getSession test:', e);
        return { error: e.message, success: false };
      }
    });
    
    console.log('Session test result:', sessionTest);
    
    // Test 4: Test getSession({ force: true })
    console.log('\n4. Testing getSession({ force: true })...');
    console.log('-'.repeat(40));
    
    const forceSessionTest = await page.evaluate(async () => {
      try {
        const { createClient } = window.supabase;
        const client = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        console.log(`[${startTime}] BEFORE client.auth.getSession({ force: true })`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Force session timeout after 15 seconds')), 15000);
        });
        
        const sessionPromise = client.auth.getSession({ force: true });
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        console.log(`[${endTime}] AFTER client.auth.getSession({ force: true }) - ${latency}ms`);
        
        return {
          session: session ? {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: session.expires_at
          } : null,
          error: error ? error.message : null,
          latency,
          success: true
        };
        
      } catch (e) {
        console.error('Exception in getSession({ force: true }):', e);
        return { error: e.message, success: false };
      }
    });
    
    console.log('Force session test result:', forceSessionTest);
    
    // Test 5: Check for any hanging requests
    console.log('\n5. Monitoring for hanging requests...');
    console.log('-'.repeat(40));
    
    console.log('Waiting 10 seconds to monitor network activity...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('Auth-related network activity:');
    if (authRequests.length === 0) {
      console.log('❌ No auth requests detected');
    } else {
      authRequests.forEach((req, index) => {
        console.log(`[${index + 1}] ${req.type}: ${req.method || ''} ${req.url} ${req.status || ''} at ${req.timestamp}`);
      });
    }
    
    // Test 6: Test cookie behavior
    console.log('\n6. Testing cookie behavior...');
    console.log('-'.repeat(40));
    
    const cookieTest = await page.evaluate(async () => {
      // Try to manually set a Supabase-like cookie
      document.cookie = 'sb-access-token=test-token; path=/; domain=localhost; SameSite=Lax';
      
      // Check if it was set
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sbCookie = cookies.find(c => c.startsWith('sb-access-token'));
      
      return {
        allCookies: document.cookie,
        sbCookieSet: !!sbCookie,
        sbCookieValue: sbCookie || null,
        domain: window.location.hostname,
        protocol: window.location.protocol,
        isSecure: window.location.protocol === 'https:'
      };
    });
    
    console.log('Cookie test result:', cookieTest);
    
    // Test 7: Test with admin login simulation
    console.log('\n7. Testing admin login simulation...');
    console.log('-'.repeat(40));
    
    // Navigate to login page
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    
    // Wait for login form
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      console.log('✅ Login form found');
      
      const loginTest = await page.evaluate(async () => {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (emailInput && passwordInput) {
          emailInput.value = 'steepdecline+3@gmail.com';
          passwordInput.value = 'test123';
          
          // Simulate form submission without actually submitting
          const form = emailInput.closest('form');
          return {
            formFound: true,
            formAction: form?.action || 'none',
            emailSet: emailInput.value === 'steepdecline+3@gmail.com',
            passwordSet: passwordInput.value === 'test123'
          };
        }
        
        return { formFound: false };
      });
      
      console.log('Login form test:', loginTest);
      
    } catch (e) {
      console.log('❌ Login form not found:', e.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Detailed browser auth analysis completed');
    console.log('Closing browser in 3 seconds...');
    
    setTimeout(() => {
      browser.close();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error during detailed browser test:', error);
    browser.close();
    process.exit(1);
  }
}

testBrowserAuthDetailed();
