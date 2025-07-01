import puppeteer from 'puppeteer';

(async () => {
  console.log('Testing API call directly...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', (msg) => {
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen to page errors
  page.on('pageerror', (error) => {
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  // Listen to network responses
  page.on('response', async (response) => {
    if (response.url().includes('get_customers_with_total_spent')) {
      console.log('API Response Status:', response.status());
      try {
        const data = await response.json();
        console.log('API Response Data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });
  
  try {
    console.log('Navigating to home page first...');
    await page.goto('http://localhost:8080/', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('Home page loaded, now going to customers dashboard...');
    await page.goto('http://localhost:8080/customers-dashboard', {
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    console.log('Page loaded successfully');
    
    // Wait for the data to load
    await page.waitForTimeout(5000);
    
    // Check what's in the last order cells
    const lastOrderCells = await page.$$eval('table tbody tr td:nth-child(6)', cells => 
      cells.map(cell => cell.textContent?.trim())
    );
    console.log('Last Order Cell Contents:', lastOrderCells);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
