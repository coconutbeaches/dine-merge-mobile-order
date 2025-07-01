const puppeteer = require('puppeteer');
const fs = require('fs');

async function runPerformanceTests() {
    console.log('🎯 Starting Puppeteer performance tests...');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.setCacheEnabled(false);
    
    try {
        console.log('📊 Testing Coconut Beach app performance...');
        
        // Navigate to your app
        const response = await page.goto('http://localhost:8080', { 
            waitUntil: 'networkidle0' 
        });
        
        // Collect performance metrics
        const performanceMetrics = await page.evaluate(() => {
            const timing = performance.timing;
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
                firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
            };
        });
        
        // Test drink category interactions
        console.log('🥤 Testing drink category interactions...');
        
        // Wait for categories to load
        await page.waitForSelector('img[alt*="Water"], img[alt*="Soft"], img[alt*="Coconut"]', { timeout: 5000 });
        
        // Click on different drink categories
        const categories = await page.$$('div[class*="grid"] > div');
        const categoryTests = [];
        
        for (let i = 0; i < Math.min(categories.length, 3); i++) {
            const startTime = Date.now();
            await categories[i].click();
            await page.waitForTimeout(500); // Wait for any animations
            const endTime = Date.now();
            categoryTests.push({
                category: i + 1,
                responseTime: endTime - startTime
            });
        }
        
        // Test scroll performance
        console.log('📜 Testing scroll performance...');
        const scrollStart = Date.now();
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
        const scrollTime = Date.now() - scrollStart;
        
        // Compile results
        const results = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:8080',
            performanceMetrics,
            categoryInteractionTests: categoryTests,
            scrollPerformance: { time: scrollTime },
            pageLoadSuccess: response.ok(),
            responseStatus: response.status()
        };
        
        // Save results
        const resultsDir = './test-results';
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.writeFileSync(
            `${resultsDir}/puppeteer-performance-${timestamp}.json`, 
            JSON.stringify(results, null, 2)
        );
        
        console.log('✅ Puppeteer performance tests completed');
        console.log(`📊 DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
        console.log(`📊 Load Complete: ${performanceMetrics.loadComplete}ms`);
        console.log(`📊 First Paint: ${performanceMetrics.firstPaint}ms`);
        console.log(`📊 Average Category Response: ${categoryTests.reduce((a, b) => a + b.responseTime, 0) / categoryTests.length}ms`);
        
    } catch (error) {
        console.error('❌ Puppeteer test failed:', error);
    } finally {
        await browser.close();
    }
}

runPerformanceTests().catch(console.error);
