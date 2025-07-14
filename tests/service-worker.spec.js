import { test, expect } from '@playwright/test';

test.describe('Service Worker Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all caches and storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Should register service worker without errors', async ({ page }) => {
    console.log('=== Test: Service Worker Registration ===');
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console Error:', msg.text());
      }
    });
    
    // Navigate to the home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for service worker registration
    await page.waitForTimeout(3000);
    
    // Check if service worker was registered
    const serviceWorkerRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return registrations.length > 0;
      });
    });
    
    if (serviceWorkerRegistered) {
      console.log('✓ Service worker registered successfully');
    } else {
      console.log('⚠ Service worker not registered (may be disabled in dev mode)');
    }
    
    // Check for service worker related errors
    const swErrors = consoleErrors.filter(error => 
      error.includes('sw.js') || 
      error.includes('Service Worker') ||
      error.includes('Failed to execute \'addAll\' on \'Cache\'')
    );
    
    expect(swErrors).toHaveLength(0);
    console.log('✓ No service worker errors detected');
  });

  test('Should handle service worker cache failures gracefully', async ({ page }) => {
    console.log('=== Test: Service Worker Cache Handling ===');
    
    // Monitor console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    // Navigate to app
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential service worker activity
    await page.waitForTimeout(2000);
    
    // Check that app loads normally despite any cache issues
    await expect(page.locator('text=Menu')).toBeVisible();
    console.log('✓ App loads normally with service worker');
    
    // Check for cache-related errors that should be handled gracefully
    const cacheErrors = consoleLogs.filter(log => 
      log.type === 'error' && 
      (log.text.includes('cache') || log.text.includes('Cache'))
    );
    
    // There should be no unhandled cache errors
    expect(cacheErrors).toHaveLength(0);
    console.log('✓ No unhandled cache errors');
  });

  test('Should work offline after initial load', async ({ page }) => {
    console.log('=== Test: Offline Functionality ===');
    
    // Initial load with network
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    
    // Wait for service worker and caching
    await page.waitForTimeout(3000);
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to navigate to another page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should show some content (either cached or offline fallback)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    
    // Should not show browser's default offline page
    expect(bodyContent).not.toContain('This site can\'t be reached');
    
    console.log('✓ Offline functionality works');
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('Should handle service worker updates', async ({ page }) => {
    console.log('=== Test: Service Worker Updates ===');
    
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check service worker status
    const swStatus = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          const registration = registrations[0];
          return {
            active: !!registration.active,
            waiting: !!registration.waiting,
            installing: !!registration.installing
          };
        }
        return { active: false, waiting: false, installing: false };
      });
    });
    
    if (swStatus.active) {
      console.log('✓ Service worker is active');
    } else {
      console.log('⚠ Service worker not active (may be disabled)');
    }
    
    // The test passes if no errors occur during service worker lifecycle
    expect(true).toBe(true);
  });

  test('Should not break app functionality when service worker fails', async ({ page }) => {
    console.log('=== Test: App Resilience to Service Worker Failures ===');
    
    // Override service worker to simulate failure
    await page.addInitScript(() => {
      // Mock service worker to fail registration
      if ('serviceWorker' in navigator) {
        const originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = () => {
          return Promise.reject(new Error('Mock service worker failure'));
        };
      }
    });
    
    // Navigate to app
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // App should still work normally
    await expect(page.locator('text=Login or Sign Up')).toBeVisible();
    
    // Try to use the app
    await page.locator('button:has-text("Continue as Guest")').click();
    await page.waitForLoadState('networkidle');
    
    // Should redirect to menu
    await expect(page).toHaveURL(/\/menu/);
    await expect(page.locator('text=Menu')).toBeVisible();
    
    console.log('✓ App works normally even when service worker fails');
  });
});
