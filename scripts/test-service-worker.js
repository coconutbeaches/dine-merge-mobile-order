#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating service worker configuration...\n');

// Check if service worker file exists
const swPath = path.join(__dirname, '../public/sw.js');
if (!fs.existsSync(swPath)) {
  console.error('❌ Service worker file not found at public/sw.js');
  process.exit(1);
}

// Read and validate service worker content
const swContent = fs.readFileSync(swPath, 'utf8');

// Check for problematic patterns
const problematicPatterns = [
  '/static/js/bundle.js',
  '/static/css/main.css'
];

let hasProblems = false;

problematicPatterns.forEach(pattern => {
  if (swContent.includes(pattern)) {
    console.error(`❌ Service worker contains problematic pattern: ${pattern}`);
    hasProblems = true;
  }
});

if (!hasProblems) {
  console.log('✅ Service worker does not contain problematic static asset references');
}

// Check for required patterns
const requiredPatterns = [
  'catch(function(error)',
  'skipWaiting()',
  'clients.claim()'
];

requiredPatterns.forEach(pattern => {
  if (!swContent.includes(pattern)) {
    console.warn(`⚠️  Service worker missing recommended pattern: ${pattern}`);
  } else {
    console.log(`✅ Service worker includes: ${pattern}`);
  }
});

// Check PWA registration
const pwaPath = path.join(__dirname, '../lib/pwa.ts');
if (fs.existsSync(pwaPath)) {
  const pwaContent = fs.readFileSync(pwaPath, 'utf8');
  
  if (pwaContent.includes('catch((error)')) {
    console.log('✅ PWA registration includes error handling');
  } else {
    console.warn('⚠️  PWA registration may not handle errors properly');
  }
  
  if (pwaContent.includes('NODE_ENV')) {
    console.log('✅ PWA registration is environment-aware');
  } else {
    console.warn('⚠️  PWA registration is not environment-aware');
  }
} else {
  console.warn('⚠️  PWA registration file not found');
}

console.log('\n🎉 Service worker validation complete!');

if (hasProblems) {
  process.exit(1);
} else {
  console.log('✅ All checks passed - service worker should work without errors');
}
