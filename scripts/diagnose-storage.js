#!/usr/bin/env node

/**
 * Quick Storage Diagnostic
 * Analyzes current browser storage state to identify issues
 */

const puppeteer = require('puppeteer');

async function diagnoseStorage() {
  console.log('🔍 Storage Diagnostic Tool\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  console.log('Navigating to application...');
  await page.goto('http://localhost:3000/admin/orders', { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });

  console.log('Analyzing storage...\n');

  const analysis = await page.evaluate(() => {
    const results = {
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      supabaseTokens: {},
      reactQueryCache: null,
      totalSizes: {
        cookies: 0,
        localStorage: 0,
        sessionStorage: 0
      }
    };

    // Analyze cookies
    document.cookie.split(';').forEach(cookie => {
      if (!cookie.trim()) return;
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('=');
      const size = cookie.length * 2;
      
      results.cookies.push({
        name: name,
        size: size,
        isSupabase: name.includes('sb-') || name.includes('supabase'),
        preview: value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : ''
      });
      results.totalSizes.cookies += size;
    });

    // Analyze localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = (key.length + value.length) * 2;
      
      results.localStorage[key] = {
        size: size,
        type: 'unknown',
        preview: value.substring(0, 100) + (value.length > 100 ? '...' : '')
      };
      
      // Detect type
      if (key.includes('supabase') || key.includes('sb-')) {
        results.localStorage[key].type = 'supabase';
        results.supabaseTokens[key] = {
          size: size,
          preview: value.substring(0, 50)
        };
      } else if (key.includes('react-query') || key.includes('REACT_QUERY')) {
        results.localStorage[key].type = 'react-query';
        try {
          const parsed = JSON.parse(value);
          results.reactQueryCache = {
            size: size,
            queryCount: parsed.queries ? Object.keys(parsed.queries).length : 0,
            mutationCount: parsed.mutations ? Object.keys(parsed.mutations).length : 0
          };
        } catch (e) {}
      } else if (key === 'cart' || key.includes('cart')) {
        results.localStorage[key].type = 'cart';
      } else if (key.includes('guest') || key.includes('stay_id')) {
        results.localStorage[key].type = 'guest-session';
      }
      
      results.totalSizes.localStorage += size;
    }

    // Analyze sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      const size = (key.length + value.length) * 2;
      
      results.sessionStorage[key] = {
        size: size,
        preview: value.substring(0, 100) + (value.length > 100 ? '...' : '')
      };
      results.totalSizes.sessionStorage += size;
    }

    return results;
  });

  // Print analysis
  console.log('=== STORAGE ANALYSIS ===\n');
  
  console.log('📊 Total Sizes:');
  console.log(`  • Cookies: ${(analysis.totalSizes.cookies / 1024).toFixed(2)} KB`);
  console.log(`  • LocalStorage: ${(analysis.totalSizes.localStorage / 1024).toFixed(2)} KB`);
  console.log(`  • SessionStorage: ${(analysis.totalSizes.sessionStorage / 1024).toFixed(2)} KB`);
  console.log(`  • TOTAL: ${((analysis.totalSizes.cookies + analysis.totalSizes.localStorage + analysis.totalSizes.sessionStorage) / 1024).toFixed(2)} KB\n`);

  console.log('🍪 Cookies (' + analysis.cookies.length + ' total):');
  analysis.cookies.forEach(cookie => {
    const flag = cookie.isSupabase ? '🔐 ' : '';
    console.log(`  ${flag}${cookie.name}: ${cookie.size} bytes`);
  });

  console.log('\n💾 LocalStorage (' + Object.keys(analysis.localStorage).length + ' items):');
  const byType = {};
  Object.entries(analysis.localStorage).forEach(([key, data]) => {
    if (!byType[data.type]) byType[data.type] = [];
    byType[data.type].push({ key, ...data });
  });
  
  Object.entries(byType).forEach(([type, items]) => {
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    console.log(`  ${type.toUpperCase()} (${items.length} items, ${(totalSize / 1024).toFixed(2)} KB):`);
    items.forEach(item => {
      console.log(`    • ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
    });
  });

  if (analysis.reactQueryCache) {
    console.log('\n⚡ React Query Cache:');
    console.log(`  • Size: ${(analysis.reactQueryCache.size / 1024).toFixed(2)} KB`);
    console.log(`  • Queries cached: ${analysis.reactQueryCache.queryCount}`);
    console.log(`  • Mutations cached: ${analysis.reactQueryCache.mutationCount}`);
  }

  if (Object.keys(analysis.supabaseTokens).length > 0) {
    console.log('\n🔑 Supabase Tokens:');
    Object.entries(analysis.supabaseTokens).forEach(([key, data]) => {
      console.log(`  • ${key}: ${(data.size / 1024).toFixed(2)} KB`);
    });
  }

  // Warnings
  console.log('\n⚠️  Potential Issues:');
  const issues = [];
  
  if (analysis.totalSizes.cookies > 4096) {
    issues.push(`Cookie size (${(analysis.totalSizes.cookies / 1024).toFixed(2)} KB) exceeds 4KB limit`);
  }
  
  if (analysis.totalSizes.localStorage > 5 * 1024 * 1024) {
    issues.push(`LocalStorage size (${(analysis.totalSizes.localStorage / 1024 / 1024).toFixed(2)} MB) exceeds 5MB`);
  }
  
  const duplicateCookies = {};
  analysis.cookies.forEach(cookie => {
    const baseName = cookie.name.replace(/-\d+$/, '');
    if (!duplicateCookies[baseName]) duplicateCookies[baseName] = 0;
    duplicateCookies[baseName]++;
  });
  
  Object.entries(duplicateCookies).forEach(([name, count]) => {
    if (count > 1) {
      issues.push(`Duplicate cookie pattern detected: ${name} (${count} instances)`);
    }
  });
  
  if (analysis.reactQueryCache && analysis.reactQueryCache.queryCount > 100) {
    issues.push(`Large React Query cache: ${analysis.reactQueryCache.queryCount} queries`);
  }
  
  if (issues.length === 0) {
    console.log('  ✅ No immediate issues detected');
  } else {
    issues.forEach(issue => console.log(`  ❌ ${issue}`));
  }

  console.log('\n📝 Recommendations:');
  
  if (analysis.reactQueryCache && analysis.reactQueryCache.size > 100 * 1024) {
    console.log('  • Consider reducing React Query cache time or implementing selective persistence');
  }
  
  if (analysis.cookies.filter(c => c.isSupabase).length > 2) {
    console.log('  • Multiple Supabase tokens detected - check token refresh logic');
  }
  
  if (Object.keys(analysis.localStorage).some(k => k.includes('cart_backup'))) {
    console.log('  • Cart backup found - ensure proper cleanup after checkout');
  }

  await browser.close();
}

// Run diagnostic
diagnoseStorage().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});