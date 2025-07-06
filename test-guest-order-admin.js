import { test, expect } from '@playwright/test';

test('Place guest order and verify admin display', async ({ page }) => {
  const BASE_URL = 'http://localhost:3001';

  // Step 1: Set up guest session
  await page.goto(BASE_URL);
  const guestSession = await page.evaluate(() => {
    localStorage.clear();
    const session = {
      guest_user_id: 'guest_' + Math.random().toString(36).substr(2, 9),
      guest_first_name: 'Debug Guest',
      guest_stay_id: 'stay_456'
    };
    localStorage.setItem('guest_user_id', session.guest_user_id);
    localStorage.setItem('guest_first_name', session.guest_first_name);
    localStorage.setItem('guest_stay_id', session.guest_stay_id);
    console.log('Guest session created:', session);
    return session;
  });

  console.log('Created guest session:', guestSession);

  // Step 2: Navigate to menu and add item
  await page.goto(`${BASE_URL}/menu`);
  await page.waitForLoadState('networkidle');

  // Look for menu items
  const menuItems = page.locator('[href*="/menu/item/"]').first();
  await expect(menuItems).toBeVisible({ timeout: 10000 });
  await menuItems.click();

  // Add to cart
  await page.waitForLoadState('networkidle');
  const addToCartButton = page.locator('button').filter({ hasText: /add to cart|add/i }).first();
  
  if (await addToCartButton.isVisible()) {
    await addToCartButton.click();
    console.log('✓ Item added to cart');
  }

  // Step 3: Go to checkout and place order
  await page.goto(`${BASE_URL}/checkout`);
  await page.waitForLoadState('networkidle');

  // Monitor console for order placement
  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });

  const placeOrderButton = page.locator('button').filter({ hasText: /place order/i }).first();
  await expect(placeOrderButton).toBeVisible();
  await placeOrderButton.click();

  // Wait for order to be placed
  await page.waitForTimeout(3000);

  console.log('Order placement logs:', consoleLogs.filter(log => 
    log.includes('Order inserted') || log.includes('guest_first_name')
  ));

  // Step 4: Go to admin orders and check console
  await page.goto(`${BASE_URL}/admin/orders`);
  await page.waitForLoadState('networkidle');

  // Wait for orders to load and capture debug logs
  await page.waitForTimeout(2000);

  const adminLogs = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Transforming guest order') || 
        msg.text().includes('display name logic')) {
      adminLogs.push(msg.text());
    }
  });

  // Refresh to trigger the logs
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Admin page debug logs:', adminLogs);

  // Check if guest name is displayed correctly
  const orderElements = page.locator('[data-testid="order-row"], .grid').filter({
    hasText: new RegExp(guestSession.guest_first_name)
  });

  const isGuestNameVisible = await orderElements.count() > 0;
  console.log(`Guest name "${guestSession.guest_first_name}" visible in admin:`, isGuestNameVisible);

  if (!isGuestNameVisible) {
    // Check what names are actually displayed
    const displayedNames = await page.locator('div').filter({
      hasText: /Order #|Debug Guest|guest_/
    }).allTextContents();
    console.log('Displayed order names:', displayedNames);
  }
});
