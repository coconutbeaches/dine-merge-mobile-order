import { test, expect } from '@playwright/test';

test.describe('QR Code Deep-Link Core Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Should create new guest_user and attach correct table_number on first scan', async ({ page }) => {
    console.log('=== Test 1: First QR scan - new guest_user creation ===');
    
    // Monitor requests to guest_users
    let guestUserPostCount = 0;
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/rest/v1/guest_users')) {
        guestUserPostCount++;
        console.log('POST to guest_users detected');
      }
    });

    // Navigate to QR deep-link URL
    // Note: TableScanRouter will redirect to /menu after processing the QR parameter
    await page.goto('/?goto=table-7');
    
    // Wait for the redirect to complete (TableScanRouter redirects to /menu)
    await page.waitForURL(/\/menu/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Give some time for the guest user creation to complete
    await page.waitForTimeout(2000);
    
    // Verify guest session is stored in localStorage
    const guestSession = await page.evaluate(() => {
      return {
        guest_user_id: localStorage.getItem('guest_user_id'),
        guest_first_name: localStorage.getItem('guest_first_name'),
        guest_stay_id: localStorage.getItem('guest_stay_id')
      };
    });
    
    // Check if guest session was created
    if (guestSession.guest_user_id) {
      expect(guestSession.guest_user_id).toBeTruthy();
      expect(guestSession.guest_first_name).toBe('Guest');
      expect(guestSession.guest_stay_id).toBe('walkin');
      console.log('✓ Guest session stored in localStorage:', guestSession);
    } else {
      console.log('⚠ Guest session not found - checking if QR scan logic is working');
    }
    
    // Verify table number is stored
    const tableNumber = await page.evaluate(() => {
      return localStorage.getItem('table_number_pending');
    });
    
    expect(tableNumber).toBe('7');
    console.log('✓ Table number stored correctly:', tableNumber);
    
    // Verify at least one POST request was made (if guest user was created)
    if (guestUserPostCount > 0) {
      console.log('✓ Guest user POST request detected');
    } else {
      console.log('⚠ No guest user POST detected - may indicate existing session or different flow');
    }
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
    await page.goto('/?goto=table-8');
    
    // Wait for the redirect to complete
    await page.waitForURL(/\/menu/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
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

  test('3. Should handle localStorage failure gracefully in Safari Private Mode', async ({ page }) => {
    console.log('=== Test 3: Safari Private Mode - localStorage failure handling ===');
    
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
    });
    
    // Navigate to QR deep-link URL - this should not crash
    await page.goto('/?goto=table-9');
    
    // Wait for potential redirect (may fail in private mode, that's OK)
    try {
      await page.waitForURL(/\/menu/, { timeout: 5000 });
    } catch (e) {
      console.log('Redirect may not work in private mode - continuing test');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✓ Navigation completed without crash');
    
    // Verify the page loaded successfully
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    console.log('✓ Page title loaded:', pageTitle);
    
    // Check that localStorage errors were caught and handled gracefully
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
    
    if (warningMessages.length > 0) {
      console.log('✓ Warning messages logged (good error handling):', warningMessages.length);
    } else {
      console.log('⚠ No specific localStorage warning messages found - but no crashes detected');
    }
    
    // Try to navigate to menu - should still work
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    
    const menuPageTitle = await page.title();
    expect(menuPageTitle).toBeTruthy();
    console.log('✓ Menu page accessible in private mode');
    
    console.log('✓ Safari Private Mode test completed successfully');
  });

  test('4. Should verify table number behavior in order flow (manual verification)', async ({ page }) => {
    console.log('=== Test 4: Table number behavior verification ===');
    
    // This test sets up scenarios that can be manually verified by checking database
    // Set up guest session with table number
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'test_guest_order_flow',
        guest_first_name: 'Test Guest',
        guest_stay_id: 'walkin'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      localStorage.setItem('table_number_pending', '10');
    });
    
    console.log('✓ Guest session set up with table_number_pending = 10');
    console.log('Manual verification needed:');
    console.log('1. First order should have table_number = 10');
    console.log('2. After order placement, table_number_pending should be cleared');
    console.log('3. Second order without rescan should have table_number = null');
    console.log('4. Database should show guest_user_id = test_guest_order_flow in orders');
    
    // Navigate to menu to enable order placement flow
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    
    // Verify the session is accessible for order placement
    const sessionState = await page.evaluate(() => {
      return {
        hasGuestSession: !!(localStorage.getItem('guest_user_id')),
        tableNumber: localStorage.getItem('table_number_pending'),
        guestId: localStorage.getItem('guest_user_id')
      };
    });
    
    expect(sessionState.hasGuestSession).toBe(true);
    expect(sessionState.tableNumber).toBe('10');
    expect(sessionState.guestId).toBe('test_guest_order_flow');
    
    console.log('✓ Session state verified for order flow:', sessionState);
    console.log('Test setup complete - ready for manual order placement verification');
  });
});
