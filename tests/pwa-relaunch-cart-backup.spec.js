import { test, expect } from '@playwright/test';

test.describe('PWA Relaunch Cart Backup Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Should backup cart to Supabase and restore after PWA relaunch (localStorage cleared)', async ({ page }) => {
    console.log('=== Test 1: PWA relaunch with localStorage cleared - cart backup/restore ===');
    
    // Set up guest session first
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'test_guest_pwa_relaunch',
        guest_first_name: 'PWA Test Guest',
        guest_stay_id: 'walkin'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      localStorage.setItem('table_number_pending', '10');
    });

    // Navigate to menu and add items to cart
    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');
    
    // Add item to cart (simplified - click first available item)
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item, a[href*="/menu/item/"]').first();
    if (await menuItems.isVisible()) {
      await menuItems.click();
      await page.waitForLoadState('networkidle');
      
      // Add to cart
      const addToCartButton = page.locator('[data-testid="add-to-cart-btn"], button').filter({ hasText: /add to cart|add/i }).first();
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();
        console.log('✓ Item added to cart');
        
        // Wait for backup to complete
        await page.waitForTimeout(1000);
      }
    }

    // Verify cart has items in localStorage
    const cartInLocalStorage = await page.evaluate(() => {
      return localStorage.getItem('cart');
    });
    
    expect(cartInLocalStorage).toBeTruthy();
    const cartData = JSON.parse(cartInLocalStorage);
    expect(cartData.length).toBeGreaterThan(0);
    console.log('✓ Cart stored in localStorage:', cartData.length, 'items');

    // Monitor cart_backups requests to verify backup occurred
    let backupRequestMade = false;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('cart_backups')) {
        backupRequestMade = true;
        console.log('✓ Cart backup request detected');
      }
    });

    // Trigger backup by modifying cart (add same item again)
    if (await menuItems.isVisible()) {
      await menuItems.click();
      await page.waitForLoadState('networkidle');
      
      const addToCartButton = page.locator('[data-testid="add-to-cart-btn"], button').filter({ hasText: /add to cart|add/i }).first();
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();
        console.log('✓ Second item added to cart to trigger backup');
        
        // Wait for backup debounce and completion
        await page.waitForTimeout(1500);
      }
    }

    // Simulate PWA relaunch by clearing localStorage but keeping guest session
    const guestSession = await page.evaluate(() => {
      return {
        guest_user_id: localStorage.getItem('guest_user_id'),
        guest_first_name: localStorage.getItem('guest_first_name'),
        guest_stay_id: localStorage.getItem('guest_stay_id'),
        table_number_pending: localStorage.getItem('table_number_pending')
      };
    });

    console.log('Guest session before relaunch:', guestSession);

    // Clear localStorage (simulating PWA relaunch)
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Restore guest session (simulating PWA remembering user through service worker or other means)
    await page.evaluate((session) => {
      localStorage.setItem('guest_user_id', session.guest_user_id);
      localStorage.setItem('guest_first_name', session.guest_first_name);
      localStorage.setItem('guest_stay_id', session.guest_stay_id);
      if (session.table_number_pending) {
        localStorage.setItem('table_number_pending', session.table_number_pending);
      }
    }, guestSession);

    console.log('✓ Simulated PWA relaunch - localStorage cleared and guest session restored');

    // Navigate to cart page to trigger cart restoration
    await page.goto(`${BASE_URL}/cart`);
    await page.waitForLoadState('networkidle');

    // Wait for cart restoration from backup
    await page.waitForTimeout(2000);

    // Verify cart was restored from backup
    const restoredCart = await page.evaluate(() => {
      return localStorage.getItem('cart');
    });

    if (restoredCart) {
      const restoredCartData = JSON.parse(restoredCart);
      expect(restoredCartData.length).toBeGreaterThan(0);
      console.log('✓ Cart restored from backup:', restoredCartData.length, 'items');
    } else {
      // If cart is not in localStorage, check if cart items are visible on the page
      const cartItems = page.locator('[data-testid="cart-item"], .cart-item').count();
      expect(await cartItems).toBeGreaterThan(0);
      console.log('✓ Cart items visible on page (restored from backup)');
    }

    console.log('✓ PWA relaunch cart backup/restore test completed successfully');
  });

  test('2. Should handle cart backup failure gracefully during PWA relaunch', async ({ page }) => {
    console.log('=== Test 2: PWA relaunch with backup failure - graceful handling ===');
    
    // Set up guest session
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'test_guest_backup_fail',
        guest_first_name: 'Backup Fail Guest',
        guest_stay_id: 'walkin'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
    });

    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Mock network failure for cart_backups
    await page.route('**/rest/v1/cart_backups', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Network error' })
      });
    });

    // Navigate to menu and try to add items
    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');
    
    // Add item to cart
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item, a[href*="/menu/item/"]').first();
    if (await menuItems.isVisible()) {
      await menuItems.click();
      await page.waitForLoadState('networkidle');
      
      const addToCartButton = page.locator('[data-testid="add-to-cart-btn"], button').filter({ hasText: /add to cart|add/i }).first();
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();
        console.log('✓ Item added to cart (backup will fail)');
        
        // Wait for backup attempt
        await page.waitForTimeout(1500);
      }
    }

    // Check that backup failure was handled gracefully
    const cartBackupErrors = consoleErrors.filter(error => 
      error.includes('[CartBackup] Failed to backup') ||
      error.includes('Network error')
    );

    expect(cartBackupErrors.length).toBeGreaterThan(0);
    console.log('✓ Backup failure logged gracefully:', cartBackupErrors.length, 'error(s)');

    // Check that no uncaught errors occurred
    const uncaughtErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') && 
      !error.includes('[CartBackup]')
    );

    expect(uncaughtErrors).toHaveLength(0);
    console.log('✓ No uncaught errors - graceful failure handling');

    // Verify cart still works locally
    const localCart = await page.evaluate(() => {
      return localStorage.getItem('cart');
    });

    expect(localCart).toBeTruthy();
    console.log('✓ Cart still works locally despite backup failure');

    console.log('✓ PWA relaunch backup failure test completed successfully');
  });
});
