#!/usr/bin/env node

/**
 * Storage Monitoring Script
 * Tracks browser storage growth to identify performance issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const MONITORING_DURATION = 5 * 60 * 1000; // 5 minutes
const SAMPLE_INTERVAL = 10 * 1000; // Sample every 10 seconds
const OUTPUT_DIR = path.join(__dirname, '..', 'storage-reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function monitorStorage() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  const samples = [];
  const startTime = Date.now();
  const reportFile = path.join(OUTPUT_DIR, `storage-${startTime}.json`);

  console.log('Starting storage monitoring...');
  console.log(`Report will be saved to: ${reportFile}`);
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Function to collect storage metrics
  const collectMetrics = async () => {
    return await page.evaluate(() => {
      const metrics = {
        timestamp: Date.now(),
        url: window.location.href,
        storage: {
          cookies: {
            count: 0,
            totalSize: 0,
            details: []
          },
          localStorage: {
            count: 0,
            totalSize: 0,
            items: {}
          },
          sessionStorage: {
            count: 0,
            totalSize: 0,
            items: {}
          }
        },
        performance: {
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : null
        }
      };

      // Analyze cookies
      const cookies = document.cookie.split(';').filter(c => c.trim());
      metrics.storage.cookies.count = cookies.length;
      
      cookies.forEach(cookie => {
        const size = cookie.length * 2; // UTF-16
        metrics.storage.cookies.totalSize += size;
        const [name] = cookie.trim().split('=');
        metrics.storage.cookies.details.push({
          name: name,
          size: size,
          preview: cookie.substring(0, 100) + (cookie.length > 100 ? '...' : '')
        });
      });

      // Analyze localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = (key.length + value.length) * 2;
        
        metrics.storage.localStorage.count++;
        metrics.storage.localStorage.totalSize += size;
        metrics.storage.localStorage.items[key] = {
          size: size,
          preview: value.substring(0, 200) + (value.length > 200 ? '...' : '')
        };
      }

      // Analyze sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        const size = (key.length + value.length) * 2;
        
        metrics.storage.sessionStorage.count++;
        metrics.storage.sessionStorage.totalSize += size;
        metrics.storage.sessionStorage.items[key] = {
          size: size,
          preview: value.substring(0, 200) + (value.length > 200 ? '...' : '')
        };
      }

      return metrics;
    });
  };

  // Initial sample
  const initialMetrics = await collectMetrics();
  samples.push(initialMetrics);
  console.log('\nInitial storage state:');
  console.log(`- Cookies: ${initialMetrics.storage.cookies.count} (${initialMetrics.storage.cookies.totalSize} bytes)`);
  console.log(`- LocalStorage: ${initialMetrics.storage.localStorage.count} items (${initialMetrics.storage.localStorage.totalSize} bytes)`);
  console.log(`- SessionStorage: ${initialMetrics.storage.sessionStorage.count} items (${initialMetrics.storage.sessionStorage.totalSize} bytes)`);
  if (initialMetrics.performance.memory) {
    console.log(`- JS Heap: ${(initialMetrics.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }

  // Navigate to admin section
  console.log('\nNavigating to admin orders page...');
  await page.goto('http://localhost:3000/admin/orders', { waitUntil: 'networkidle0' });

  // Start monitoring interval
  const monitoringInterval = setInterval(async () => {
    const metrics = await collectMetrics();
    samples.push(metrics);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const prevSample = samples[samples.length - 2];
    
    console.log(`\n[${elapsed}s] Storage update:`);
    console.log(`- Cookies: ${metrics.storage.cookies.count} (${metrics.storage.cookies.totalSize} bytes) ` +
      `[Δ ${metrics.storage.cookies.totalSize - prevSample.storage.cookies.totalSize} bytes]`);
    console.log(`- LocalStorage: ${metrics.storage.localStorage.count} items (${metrics.storage.localStorage.totalSize} bytes) ` +
      `[Δ ${metrics.storage.localStorage.totalSize - prevSample.storage.localStorage.totalSize} bytes]`);
    console.log(`- SessionStorage: ${metrics.storage.sessionStorage.count} items (${metrics.storage.sessionStorage.totalSize} bytes) ` +
      `[Δ ${metrics.storage.sessionStorage.totalSize - prevSample.storage.sessionStorage.totalSize} bytes]`);
    
    if (metrics.performance.memory && prevSample.performance.memory) {
      const heapDelta = metrics.performance.memory.usedJSHeapSize - prevSample.performance.memory.usedJSHeapSize;
      console.log(`- JS Heap: ${(metrics.performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB ` +
        `[Δ ${(heapDelta / 1024 / 1024).toFixed(2)} MB]`);
    }

    // Check for concerning growth
    if (metrics.storage.cookies.totalSize > 4096) {
      console.warn('⚠️  Cookie size exceeds 4KB!');
    }
    if (metrics.storage.localStorage.totalSize > 5 * 1024 * 1024) {
      console.warn('⚠️  LocalStorage size exceeds 5MB!');
    }
    
    // Check for new items
    const newLocalStorageKeys = Object.keys(metrics.storage.localStorage.items)
      .filter(key => !prevSample.storage.localStorage.items[key]);
    if (newLocalStorageKeys.length > 0) {
      console.log(`  New localStorage keys: ${newLocalStorageKeys.join(', ')}`);
    }
    
  }, SAMPLE_INTERVAL);

  // Stop monitoring after duration
  setTimeout(async () => {
    clearInterval(monitoringInterval);
    
    console.log('\n=== Monitoring Complete ===\n');
    
    // Final metrics
    const finalMetrics = await collectMetrics();
    samples.push(finalMetrics);
    
    // Generate report
    const report = {
      startTime: new Date(startTime).toISOString(),
      duration: MONITORING_DURATION,
      sampleInterval: SAMPLE_INTERVAL,
      samples: samples,
      summary: {
        cookieGrowth: finalMetrics.storage.cookies.totalSize - initialMetrics.storage.cookies.totalSize,
        localStorageGrowth: finalMetrics.storage.localStorage.totalSize - initialMetrics.storage.localStorage.totalSize,
        sessionStorageGrowth: finalMetrics.storage.sessionStorage.totalSize - initialMetrics.storage.sessionStorage.totalSize,
        heapGrowth: finalMetrics.performance.memory && initialMetrics.performance.memory ? 
          finalMetrics.performance.memory.usedJSHeapSize - initialMetrics.performance.memory.usedJSHeapSize : null,
        problematicKeys: []
      }
    };
    
    // Identify problematic keys (those that grew significantly)
    Object.keys(finalMetrics.storage.localStorage.items).forEach(key => {
      const finalSize = finalMetrics.storage.localStorage.items[key].size;
      const initialSize = initialMetrics.storage.localStorage.items[key]?.size || 0;
      const growth = finalSize - initialSize;
      
      if (growth > 10000 || finalSize > 100000) {
        report.summary.problematicKeys.push({
          type: 'localStorage',
          key: key,
          initialSize: initialSize,
          finalSize: finalSize,
          growth: growth
        });
      }
    });
    
    // Save report
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('Summary:');
    console.log(`- Cookie growth: ${report.summary.cookieGrowth} bytes`);
    console.log(`- LocalStorage growth: ${report.summary.localStorageGrowth} bytes`);
    console.log(`- SessionStorage growth: ${report.summary.sessionStorageGrowth} bytes`);
    if (report.summary.heapGrowth) {
      console.log(`- JS Heap growth: ${(report.summary.heapGrowth / 1024 / 1024).toFixed(2)} MB`);
    }
    
    if (report.summary.problematicKeys.length > 0) {
      console.log('\n⚠️  Problematic storage keys detected:');
      report.summary.problematicKeys.forEach(item => {
        console.log(`  - ${item.type}['${item.key}']: ${item.finalSize} bytes (grew by ${item.growth} bytes)`);
      });
    }
    
    console.log(`\nFull report saved to: ${reportFile}`);
    
    await browser.close();
    process.exit(0);
  }, MONITORING_DURATION);
  
  console.log(`\nMonitoring for ${MONITORING_DURATION / 1000} seconds...`);
  console.log('Please interact with the application to simulate normal usage.');
}

// Run the monitor
monitorStorage().catch(error => {
  console.error('Monitoring failed:', error);
  process.exit(1);
});