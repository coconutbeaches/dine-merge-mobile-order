#!/usr/bin/env node

/**
 * Performance Test Script for Admin Dashboard
 * 
 * This script tests the admin dashboard performance improvements:
 * 1. Measures page load times
 * 2. Checks WebSocket channel count
 * 3. Validates realtime subscription efficiency
 */

const puppeteer = require('puppeteer');

async function testAdminPerformance() {
  console.log('🚀 Starting Admin Dashboard Performance Test...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Set to false to see browser actions
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();
    
    // Listen for console logs to track WebSocket connections
    const consoleLogs = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Channel') || text.includes('Realtime') || text.includes('Orders')) {
        consoleLogs.push(text);
      }
    });
    
    // Navigate to admin orders page
    console.log('📊 Testing Admin Orders Dashboard...');
    const ordersStartTime = Date.now();
    
    await page.goto('https://menu.coconut.holiday/admin/orders', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for orders to load
    await page.waitForSelector('.page-container', { timeout: 15000 });
    const ordersLoadTime = Date.now() - ordersStartTime;
    
    console.log(`✅ Orders page loaded in ${ordersLoadTime}ms`);
    
    // Test customers dashboard
    console.log('\n👥 Testing Admin Customers Dashboard...');
    const customersStartTime = Date.now();
    
    await page.goto('https://menu.coconut.holiday/admin/customers', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('.container', { timeout: 15000 });
    const customersLoadTime = Date.now() - customersStartTime;
    
    console.log(`✅ Customers page loaded in ${customersLoadTime}ms`);
    
    // Test individual customer orders page
    console.log('\n🏠 Testing Customer Orders Page...');
    const customerOrdersStartTime = Date.now();
    
    await page.goto('https://menu.coconut.holiday/admin/customer-orders/A8_A9_Ralf', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('.page-container', { timeout: 15000 });
    const customerOrdersLoadTime = Date.now() - customerOrdersStartTime;
    
    console.log(`✅ Customer orders page loaded in ${customerOrdersLoadTime}ms`);
    
    // Performance Summary
    console.log('\n📈 Performance Summary:');
    console.log('========================');
    console.log(`Orders Dashboard: ${ordersLoadTime}ms`);
    console.log(`Customers Dashboard: ${customersLoadTime}ms`);
    console.log(`Customer Orders Page: ${customerOrdersLoadTime}ms`);
    
    const avgLoadTime = (ordersLoadTime + customersLoadTime + customerOrdersLoadTime) / 3;
    console.log(`Average Load Time: ${Math.round(avgLoadTime)}ms`);
    
    // WebSocket Channel Analysis
    console.log('\n🔌 WebSocket Channel Analysis:');
    console.log('===============================');
    const channelLogs = consoleLogs.filter(log => 
      log.includes('Creating new singleton channel') || 
      log.includes('Added subscriber') ||
      log.includes('Removed subscriber')
    );
    
    console.log(`Total channel-related logs: ${channelLogs.length}`);
    channelLogs.forEach(log => console.log(`📡 ${log}`));
    
    // Performance Criteria
    console.log('\n🎯 Performance Criteria Check:');
    console.log('==============================');
    
    const criteria = {
      'Orders page load < 10s': ordersLoadTime < 10000,
      'Customers page load < 10s': customersLoadTime < 10000,
      'Customer orders page load < 10s': customerOrdersLoadTime < 10000,
      'Average load time < 8s': avgLoadTime < 8000,
      'No excessive channel creation': channelLogs.filter(log => log.includes('Creating new')).length <= 2
    };
    
    let allPassed = true;
    Object.entries(criteria).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}`);
      if (!passed) allPassed = false;
    });
    
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed - needs optimization'}`);
    
    return {
      ordersLoadTime,
      customersLoadTime,
      customerOrdersLoadTime,
      avgLoadTime,
      channelLogs,
      allPassed
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  testAdminPerformance()
    .then(results => {
      if (results) {
        console.log('\n✨ Performance test completed successfully!');
        process.exit(results.allPassed ? 0 : 1);
      } else {
        console.log('\n💥 Performance test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = testAdminPerformance;
