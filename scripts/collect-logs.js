#!/usr/bin/env node
import puppeteer from 'puppeteer';

// Determine which port the Vite server is listening on (default 8080)
const port = process.env.VITE_PORT || process.env.PORT || 8080;
const url = `http://localhost:${port}`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Log everything from console (log, warn, error, etc.)
  page.on('console', msg => console.log('PAGE LOG ▶', msg.type(), msg.text()));
  // Also catch uncaught exceptions and page errors
  page.on('pageerror', err => console.log('PAGE ERROR ▶', err.message));
  page.on('error', err => console.log('ERROR ▶', err.message));
  // Navigate to the local dev server, retrying if it's not yet listening
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
      break;
    } catch (err) {
      console.log(`⏳ Attempt ${attempt} to connect to ${url} failed: ${err.message}`);
      if (attempt === maxAttempts) throw err;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  // Give the page time to load additional scripts
  await new Promise(resolve => setTimeout(resolve, 10000));
  await browser.close();
})();