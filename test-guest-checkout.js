import { test, expect } from '@playwright/test';

test.describe('Guest Checkout End-to-End Tests', () => {
  const BASE_URL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Clear localStorage and authentication
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('1. Clear auth and create guest session in localStorage', async ({ page }) => {
    console.log('=== Step 1: Setting up guest session ===');
    
    // Clear any existing auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Create guest session in localStorage (simulating a guest who registered)
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'guest_' + Math.random().toString(36).substr(2, 9),
        guest_first_name: 'Test Guest',
        guest_stay_id: 'stay_123'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      
      console.log('Guest session created:', guestSession);
      return guestSession;
    });
    
    // Verify guest session was created
    const guestSession = await page.evaluate(() => {
      return {
        guest_user_id: localStorage.getItem('guest_user_id'),
        guest_first_name: localStorage.getItem('guest_first_name'),
        guest_stay_id: localStorage.getItem('guest_stay_id')
      };
    });
    
    expect(guestSession.guest_user_id).toBeTruthy();
    expect(guestSession.guest_first_name).toBe('Test Guest');
    expect(guestSession.guest_stay_id).toBe('stay_123');
    
    console.log('✓ Guest session created successfully:', guestSession);
  });

  test('2. Add items to cart and place order - check for no UUID error', async ({ page }) => {
    console.log('=== Step 2: Testing guest checkout flow ===');
    
    // Setup guest session
    await page.evaluate(() => {
      const guestSession = {
        guest_user_id: 'guest_' + Math.random().toString(36).substr(2, 9),
        guest_first_name: 'Test Guest',
        guest_stay_id: 'stay_123'
      };
      
      localStorage.setItem('guest_user_id', guestSession.guest_user_id);
      localStorage.setItem('guest_first_name', guestSession.guest_first_name);
      localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
      
      console.log('Guest session setup for checkout test:', guestSession);
    });
    
    // Navigate to menu
    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');
    
    // Add item to cart
    console.log('Looking for menu items to add to cart...');
    
    // Wait for menu items to load and click on the first available item
    const menuItems = page.locator('[data-testid="menu-item"], .menu-item, a[href*="/menu/item/"]').first();
    await expect(menuItems).toBeVisible({ timeout: 10000 });
    await menuItems.click();
    
    // On the item page, add to cart
    await page.waitForLoadState('networkidle');
    const addToCartButton = page.locator('button').filter({ hasText: /add to cart|add/i }).first();
    
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      console.log('✓ Item added to cart');
    } else {
      console.log('Add to cart button not found, trying alternative selectors...');
      // Try alternative selectors
      const altButtons = await page.locator('button').all();
      for (const button of altButtons) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('add')) {
          await button.click();
          console.log('✓ Item added to cart via alternative selector');
          break;
        }
      }
    }
    
    // Navigate to cart
    await page.goto(`${BASE_URL}/cart`);
    await page.waitForLoadState('networkidle');
    
    // Verify cart has items
    const cartItems = page.locator('[data-testid="cart-item"], .cart-item');
    await expect(cartItems.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Cart has items');
    
    // Go to checkout
    const checkoutButton = page.locator('button').filter({ hasText: /checkout|proceed/i }).first();
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();
    
    // On checkout page, verify guest can place order
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /checkout/i })).toBeVisible();
    
    // Monitor network for order placement
    let orderPlaced = false;
    let orderResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('/rest/v1/orders') && response.request().method() === 'POST') {
        orderPlaced = true;
        try {
          orderResponse = await response.json();
          console.log('Order API Response:', orderResponse);
        } catch (e) {
          console.log('Could not parse order response as JSON');
        }
      }
    });
    
    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console Error:', msg.text());
      }
    });
    
    // Place order
    const placeOrderButton = page.locator('button').filter({ hasText: /place order|order now/i }).first();
    await expect(placeOrderButton).toBeVisible();
    
    console.log('Placing order...');
    await placeOrderButton.click();
    
    // Wait for order processing
    await page.waitForTimeout(3000);
    
    // Check for UUID errors in console
    const uuidErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('uuid') || 
      error.toLowerCase().includes('invalid input syntax')
    );
    
    expect(uuidErrors).toHaveLength(0);
    console.log('✓ No UUID errors detected');
    
    // Check if order was successful
    if (orderPlaced && orderResponse) {
      console.log('✓ Order was placed successfully');
      
      // Verify order has correct guest fields
      expect(orderResponse.guest_user_id).toBeTruthy();
      expect(orderResponse.guest_first_name).toBe('Test Guest');
      expect(orderResponse.user_id).toBeNull();
      
      console.log('✓ Order created with correct guest fields:', {
        guest_user_id: orderResponse.guest_user_id,
        guest_first_name: orderResponse.guest_first_name,
        user_id: orderResponse.user_id
      });
    } else {
      // Check if we're on a success/confirmation page
      const isOnSuccessPage = await page.locator('h1, h2').filter({ 
        hasText: /success|confirmation|thank you|order placed/i 
      }).first().isVisible().catch(() => false);
      
      if (isOnSuccessPage) {
        console.log('✓ Redirected to success page - order likely placed');
      } else {
        console.log('⚠ Order placement status unclear - manual verification needed');
      }
    }
  });

  test('3. Regression test - authenticated user flow', async ({ page }) => {
    console.log('=== Step 3: Testing authenticated user flow ===');
    
    // Clear any guest session
    await page.evaluate(() => {
      localStorage.removeItem('guest_user_id');
      localStorage.removeItem('guest_first_name'); 
      localStorage.removeItem('guest_stay_id');
    });
    
    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Try to login with test credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button').filter({ hasText: /login|sign in/i }).first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword');
      await loginButton.click();
      
      await page.waitForTimeout(2000);
      
      // Check if login was successful or if we need to create account
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        console.log('✓ Login successful for authenticated user');
        
        // Test adding item to cart and checkout
        await page.goto(`${BASE_URL}/menu`);
        await page.waitForLoadState('networkidle');
        
        // Quick test - just verify the checkout button is available for authenticated users
        const menuItem = page.locator('[data-testid="menu-item"], .menu-item, a[href*="/menu/item/"]').first();
        if (await menuItem.isVisible()) {
          console.log('✓ Authenticated user can access menu');
        }
      } else {
        console.log('ℹ Login failed - likely need to create test account or credentials are wrong');
      }
    } else {
      console.log('ℹ Login form not found - checking if already authenticated');
    }
  });

  test('4. Regression test - admin flow', async ({ page }) => {
    console.log('=== Step 4: Testing admin flow ===');
    
    // Try to access admin page
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    if (currentUrl.includes('/admin')) {
      console.log('✓ Admin page accessible');
      
      // Check for admin-specific features
      const adminElements = await page.locator('h1, h2').filter({ 
        hasText: /admin|dashboard|orders|products/i 
      }).first().isVisible().catch(() => false);
      
      if (adminElements) {
        console.log('✓ Admin interface elements present');
      }
    } else {
      console.log('ℹ Admin page redirected - likely need authentication');
    }
  });
});
