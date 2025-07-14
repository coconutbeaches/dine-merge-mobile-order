const puppeteer = require('puppeteer');

async function testBrowserAuthHanging() {
  console.log('🔄 Testing auth hanging behavior in browser...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true,  // Open DevTools
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    // Enable network request logging
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('auth/v1/user')) {
        console.log(`[NETWORK] 🔄 Starting request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    page.on('response', (response) => {
      if (response.url().includes('auth/v1/user')) {
        console.log(`[NETWORK] ✅ Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to the app
    console.log('🌐 Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
    
    // Wait a bit to capture initial auth behavior
    console.log('⏱️  Waiting for auth to complete...');
    await page.waitForTimeout(5000);
    
    // Try to navigate to login page
    console.log('🔐 Navigating to login page...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    
    // Wait for login form to appear
    await page.waitForSelector('input[type="email"]');
    
    // Fill in admin credentials
    console.log('📝 Filling login form...');
    await page.type('input[type="email"]', 'steepdecline+3@gmail.com');
    await page.type('input[type="password"]', 'test123'); // You'll need to provide the real password
    
    // Submit form and monitor network
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for auth response
    console.log('⏱️  Waiting for auth response...');
    await page.waitForTimeout(10000);
    
    // Capture any hanging network requests
    const pendingRequests = await page.evaluate(() => {
      // This won't work directly, but we can check the network tab manually
      return 'Network monitoring logged in console';
    });
    
    console.log('✅ Test completed. Check browser DevTools Network tab for hanging requests.');
    
  } catch (error) {
    console.error('❌ Error during browser test:', error);
  } finally {
    // Don't close browser automatically so we can inspect
    console.log('🔍 Browser left open for manual inspection. Press Ctrl+C to exit.');
    process.stdin.resume();
  }
}

testBrowserAuthHanging();
