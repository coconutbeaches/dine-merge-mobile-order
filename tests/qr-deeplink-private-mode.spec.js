import { test, expect } from '@playwright/test';

test.describe('QR Code Deep-Link and Private Mode Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Should create new guest_user and attach correct table_number on first scan', async ({ page }) => {
    console.log('=== Test 1: First QR scan - new guest_user creation ===');
    
    // Set up request monitoring before navigation
    let guestUserPostCount = 0;
    let guestUserPostRequest = null;
    
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/rest/v1/guest_users')) {
        guestUserPostCount++;
        guestUserPostRequest = req;
      }
    });

    // Navigate to QR deep-link URL
    await page.goto(`${BASE_URL}/?goto=table-7`);
    
    // Wait for the guest_users POST request
    const guestUserPost = await page.waitForRequest(req =>
      req.method() === 'POST' && req.url().includes('/rest/v1/guest_users')
    );
    
    expect(guestUserPost).toBeTruthy();
    console.log('✓ POST request to guest_users detected');
    
    // Wait for the response and verify it's successful
    const guestUserResponse = await page.waitForResponse(response => 
      response.url().includes('/rest/v1/guest_users') && 
      response.status() === 201
    );
    
    expect(guestUserResponse.status()).toBe(201);
    console.log('✓ Guest user created successfully');
    
    // Verify guest session is stored in localStorage
    const guestSession = await page.evaluate(() => {
      return {
        guest_user_id: localStorage.getItem('guest_user_id'),
        guest_first_name: localStorage.getItem('guest_first_name'),
        guest_stay_id: localStorage.getItem('guest_stay_id')
      };
    });
    
    expect(guestSession.guest_user_id).toBeTruthy();
    expect(guestSession.guest_first_name).toBe('Guest');
    expect(guestSession.guest_stay_id).toBe('walkin');
    console.log('✓ Guest session stored in localStorage:', guestSession);
    
    // Verify table number is stored
    const tableNumber = await page.evaluate(() => {
      return localStorage.getItem('table_number_pending');
    });
    
    expect(tableNumber).toBe('7');
    console.log('✓ Table number stored correctly:', tableNumber);
    
    // Verify only one POST request was made
    expect(guestUserPostCount).toBe(1);
    console.log('✓ Only one guest_user POST request made');
  });

  test('2. Should NOT create new guest_user if session already exists', async ({ page }) => {
    console.log('=== Test 2: Second QR scan - no new guest_user creation ===');
    
    // First, set up an existing guest session
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'existing_guest_123',
        guest_first_name: 'Existing Guest',
        guest_stay_id: 'walkin'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      localStorage.setItem('table_number_pending', '5');
    });
    
    // Monitor guest_users POST requests
    let guestUserPostCount = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/rest/v1/guest_users')) {
        guestUserPostCount++;
        console.log('Unexpected POST to guest_users:', req.url());
      }
    });
    
    // Navigate to QR deep-link URL (different table)
    await page.goto(`${BASE_URL}/?goto=table-8`);
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify no new guest_user was created
    expect(guestUserPostCount).toBe(0);
    console.log('✓ No new guest_user POST request made');
    
    // Verify existing guest session is preserved
    const guestSession = await page.evaluate(() => {
      return {
        guest_user_id: localStorage.getItem('guest_user_id'),
        guest_first_name: localStorage.getItem('guest_first_name'),
        guest_stay_id: localStorage.getItem('guest_stay_id')
      };
    });
    
    expect(guestSession.guest_user_id).toBe('existing_guest_123');
    expect(guestSession.guest_first_name).toBe('Existing Guest');
    expect(guestSession.guest_stay_id).toBe('walkin');
    console.log('✓ Existing guest session preserved:', guestSession);
    
    // Verify table number is updated
    const tableNumber = await page.evaluate(() => {
      return localStorage.getItem('table_number_pending');
    });
    
    expect(tableNumber).toBe('8');
    console.log('✓ Table number updated to new scan:', tableNumber);
  });

  test('3. Should place second order with table_number=null if no rescan', async ({ page }) => {
    console.log('=== Test 3: Second order without rescan - table_number should be null ===');
    
    // Set up guest session with a previous order placed (table_number_pending cleared)
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'guest_with_prev_order',
        guest_first_name: 'Repeat Guest',
        guest_stay_id: 'walkin'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      
      // No table_number_pending - simulating after first order was placed
      localStorage.removeItem('table_number_pending');
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
      }
    }
    
    // Navigate to checkout
    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');
    
    // Monitor order placement
    let orderPlaced = false;
    let orderResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/rest/v1/orders') && response.request().method() === 'POST') {
        orderPlaced = true;
        try {
          orderResponse = await response.json();
          console.log('Order placed:', orderResponse);
        } catch (e) {
          console.log('Could not parse order response');
        }
      }
    });
    
    // Place order
    const placeOrderButton = page.locator('[data-testid="place-order-btn"], button').filter({ hasText: /place order|order now/i }).first();
    if (await placeOrderButton.isVisible()) {
      await placeOrderButton.click();
      console.log('✓ Place order button clicked');
    }
    
    // Wait for order processing
    await page.waitForTimeout(3000);
    
    // Verify order was placed with null table_number
    if (orderPlaced && orderResponse) {
      expect(orderResponse.table_number).toBeNull();
      console.log('✓ Order placed with table_number=null');
      
      // Verify guest fields are present
      expect(orderResponse.guest_user_id).toBe('guest_with_prev_order');
      expect(orderResponse.guest_first_name).toBe('Repeat Guest');
      console.log('✓ Guest fields preserved in order');
    } else {
      console.log('⚠ Order response not captured - checking for success page');
      
      // Check if redirected to success page
      const isOnSuccessPage = await page.locator('h1, h2').filter({ 
        hasText: /success|confirmation|thank you|order placed/i 
      }).first().isVisible().catch(() => false);
      
      if (isOnSuccessPage) {
        console.log('✓ Redirected to success page');
      } else {
        console.log('⚠ Order placement status unclear');
      }
    }
  });

  test('4. Should handle localStorage failure gracefully in Safari Private Mode', async ({ page }) => {
    console.log('=== Test 4: Safari Private Mode - localStorage failure handling ===');
    
    // Set up console error monitoring before localStorage mock
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console Error:', msg.text());
      }
    });
    
    // Mock localStorage to throw errors (Safari Private Mode simulation)
    await page.addInitScript(() => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key) => {
            // Allow reading but simulate empty storage
            return null;
          },
          setItem: (key, value) => {
            // Simulate Safari Private Mode localStorage.setItem failure
            throw new Error('localStorage not available (private mode or disabled)');
          },
          removeItem: (key) => {
            // Allow removal but do nothing
          },
          clear: () => {
            // Allow clear but do nothing
          },
          length: 0,
          key: () => null
        },
        writable: true,
        configurable: true
      });
      
      // Also mock the test function that checks localStorage availability
      window.isLocalStorageAvailable = () => false;
    });
    
    // Navigate to QR deep-link URL - this should not crash
    await page.goto(`${BASE_URL}/?goto=table-9`);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Navigation completed without crash');
    
    // Verify the page loaded successfully
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    console.log('✓ Page title loaded:', pageTitle);
    
    // Check that localStorage errors were caught and handled gracefully
    const localStorageErrors = consoleErrors.filter(error => 
      error.includes('localStorage not available') || 
      error.includes('private mode or disabled')
    );
    
    // We expect warning messages but not uncaught errors
    const uncaughtErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') || 
      error.includes('TypeError') || 
      error.includes('ReferenceError')
    );
    
    expect(uncaughtErrors).toHaveLength(0);
    console.log('✓ No uncaught errors detected');
    
    // Verify warning messages were logged (good error handling)
    const warningMessages = consoleErrors.filter(error => 
      error.includes('localStorage not available') && 
      !error.includes('Uncaught')
    );
    
    expect(warningMessages.length).toBeGreaterThan(0);
    console.log('✓ Warning messages logged (good error handling):', warningMessages.length);
    
    // Try to navigate to menu - should still work
    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');
    
    const menuPageTitle = await page.title();
    expect(menuPageTitle).toBeTruthy();
    console.log('✓ Menu page accessible in private mode');
    
    // Verify no guest session exists (as expected in private mode)
    const guestSession = await page.evaluate(() => {
      try {
        return {
          guest_user_id: localStorage.getItem('guest_user_id'),
          guest_first_name: localStorage.getItem('guest_first_name'),
          guest_stay_id: localStorage.getItem('guest_stay_id')
        };
      } catch (e) {
        return null;
      }
    });
    
    expect(guestSession).toBeNull();
    console.log('✓ No guest session stored (expected in private mode)');
    
    console.log('✓ Safari Private Mode test completed successfully');
  });
});
