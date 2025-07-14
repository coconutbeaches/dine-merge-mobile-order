#!/usr/bin/env node
/**
 * Auth Regression Test Suite
 * 
 * Based on root cause analysis findings, this test suite validates that:
 * 1. getSession({ force: true }) does not hang in browser environments
 * 2. Cookie behavior is consistent
 * 3. Network requests are handled properly
 * 4. No performance regressions occur
 */

const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class AuthRegressionTester {
  constructor() {
    this.results = [];
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ testName, status: 'PASS', duration });
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({ testName, status: 'FAIL', duration, error: error.message });
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
    }
  }

  async testNodeJsPerformance() {
    const tests = [
      { name: 'getSession', fn: () => this.supabase.auth.getSession() },
      { name: 'getSession({ force: true })', fn: () => this.supabase.auth.getSession({ force: true }) }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      await test.fn();
      const duration = Date.now() - startTime;
      
      // Regression test: Should complete in under 100ms
      if (duration > 100) {
        throw new Error(`${test.name} took ${duration}ms, expected < 100ms`);
      }
    }
  }

  async testBrowserPerformance() {
    const browser = await puppeteer.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      
      // Track any hanging requests
      const requests = [];
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        requests.push({ url: request.url(), timestamp: Date.now() });
        request.continue();
      });
      
      await page.goto('http://localhost:3002');
      
      // Test getSession performance in browser
      const result = await page.evaluate(async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);
        
        await new Promise(resolve => script.onload = resolve);
        
        const { createClient } = window.supabase;
        const client = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        await client.auth.getSession({ force: true });
        const duration = Date.now() - startTime;
        
        return { duration };
      });
      
      // Regression test: Should complete in under 100ms
      if (result.duration > 100) {
        throw new Error(`Browser getSession took ${result.duration}ms, expected < 100ms`);
      }
      
      // Check for hanging requests
      const authRequests = requests.filter(req => req.url.includes('auth/v1'));
      if (authRequests.length > 0) {
        throw new Error(`Unexpected auth requests detected: ${authRequests.length}`);
      }
      
    } finally {
      await browser.close();
    }
  }

  async testCookieBehavior() {
    const browser = await puppeteer.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:3002');
      
      // Test cookie setting
      const cookieResult = await page.evaluate(() => {
        document.cookie = 'sb-access-token=test-token; path=/; SameSite=Lax';
        return document.cookie.includes('sb-access-token=test-token');
      });
      
      if (!cookieResult) {
        throw new Error('Cookie setting failed');
      }
      
    } finally {
      await browser.close();
    }
  }

  async testPromiseResolution() {
    // Test that promises resolve within expected timeframe
    const timeout = (ms) => new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
    
    // Should resolve much faster than 5 seconds
    await Promise.race([
      this.supabase.auth.getSession({ force: true }),
      timeout(5000)
    ]);
  }

  async testEnvironmentConsistency() {
    // Test Node.js behavior
    const nodeStart = Date.now();
    const nodeResult = await this.supabase.auth.getSession({ force: true });
    const nodeDuration = Date.now() - nodeStart;
    
    // Test browser behavior
    const browser = await puppeteer.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:3002');
      
      const browserResult = await page.evaluate(async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(script);
        
        await new Promise(resolve => script.onload = resolve);
        
        const { createClient } = window.supabase;
        const client = createClient(
          'https://wcplwmvbhreevxvsdmog.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
        );
        
        const startTime = Date.now();
        const { data: { session }, error } = await client.auth.getSession({ force: true });
        const duration = Date.now() - startTime;
        
        return { session: !!session, error: error?.message, duration };
      });
      
      // Both should return no session (null) and no error
      if (!!nodeResult.data.session !== browserResult.session) {
        throw new Error('Session results differ between environments');
      }
      
      if (nodeResult.error || browserResult.error) {
        throw new Error(`Errors detected - Node: ${nodeResult.error}, Browser: ${browserResult.error}`);
      }
      
      // Performance should be similar (within 50ms)
      const performanceDiff = Math.abs(nodeDuration - browserResult.duration);
      if (performanceDiff > 50) {
        throw new Error(`Performance difference too large: ${performanceDiff}ms`);
      }
      
    } finally {
      await browser.close();
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Auth Regression Test Suite');
    console.log('=' .repeat(60));
    
    await this.runTest('Node.js Performance', () => this.testNodeJsPerformance());
    await this.runTest('Browser Performance', () => this.testBrowserPerformance());
    await this.runTest('Cookie Behavior', () => this.testCookieBehavior());
    await this.runTest('Promise Resolution', () => this.testPromiseResolution());
    await this.runTest('Environment Consistency', () => this.testEnvironmentConsistency());
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Results Summary');
    console.log('=' .repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  - ${result.testName}: ${result.error}`);
      });
    }
    
    console.log(`\n${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
    
    return failed === 0;
  }
}

// Run the test suite
async function main() {
  const tester = new AuthRegressionTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AuthRegressionTester };
