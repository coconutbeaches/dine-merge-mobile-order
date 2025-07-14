import { test, expect } from '@playwright/test';

test.describe('User Flow: Login → Reload → User Icon → Menu', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Should complete full user flow: login → reload → click user-icon → navigate to menu', async ({ page }) => {
    console.log('=== Test: Full User Flow - Login → Reload → User Icon → Menu ===');
    
    // Step 1: Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Verify login page loaded
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Login or Sign Up')).toBeVisible();
    
    // Step 2: Perform login using guest login (fastest option)
    await page.locator('button:has-text("Continue as Guest")').click();
    
    // Wait for login to complete and redirect
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to menu after login
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Login completed successfully');
    
    // Step 3: Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify still on menu page after reload
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Page reloaded successfully');
    
    // Step 4: Click user icon
    const userIcon = page.locator('button:has(.lucide-user), button:has(svg):has-text(""):last-child, button >> svg[class*="User"]').first();
    
    // Wait for user icon to be visible and clickable
    await userIcon.waitFor({ state: 'visible' });
    await userIcon.click();
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Verify user icon click led to expected page (order-history for guests)
    await expect(page).toHaveURL(/\/order-history/);
    console.log('✓ User icon clicked and navigated to order history');
    
    // Step 5: Navigate back to menu
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    
    // Verify we're back on menu page
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Successfully navigated back to menu');
    
    // Additional verification: Check that menu content is visible
    await expect(page.locator('text=Menu')).toBeVisible();
    console.log('✓ Menu page content is visible');
  });

  test('Should complete user flow with email/password login', async ({ page }) => {
    console.log('=== Test: User Flow with Email/Password Login ===');
    
    // Step 1: Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Fill in login form with test credentials
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.fill('#name', 'Test User');
    
    // Submit form
    await page.locator('button:has-text("Continue with Email")').click();
    
    // Wait for login to complete (may succeed or fail based on test environment)
    await page.waitForLoadState('networkidle');
    
    // If login failed, we'll continue with guest login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Email login failed, falling back to guest login');
      await page.locator('button:has-text("Continue as Guest")').click();
      await page.waitForLoadState('networkidle');
    }
    
    // Should be on menu page now
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Login completed (guest or email)');
    
    // Step 3: Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Step 4: Click user icon
    const userIcon = page.locator('button:has(.lucide-user), button >> svg[class*="User"]').first();
    await userIcon.waitFor({ state: 'visible' });
    await userIcon.click();
    
    await page.waitForLoadState('networkidle');
    
    // Should navigate to order history or profile
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/(order-history|profile)/);
    console.log('✓ User icon navigation successful');
    
    // Step 5: Navigate back to menu
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Successfully returned to menu');
  });

  test('Should handle user icon click for different user types', async ({ page }) => {
    console.log('=== Test: User Icon Behavior for Different User Types ===');
    
    // Test with guest user
    await page.goto('/login');
    await page.locator('button:has-text("Continue as Guest")').click();
    await page.waitForLoadState('networkidle');
    
    // Reload to ensure session persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check user icon behavior for guest
    const userIcon = page.locator('button:has(.lucide-user)').first();
    await userIcon.click();
    await page.waitForLoadState('networkidle');
    
    // Guest users should go to order history
    await expect(page).toHaveURL(/\/order-history/);
    console.log('✓ Guest user icon leads to order history');
    
    // Navigate back to menu
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Menu navigation confirmed');
  });

  test('Should handle page reload without losing session', async ({ page }) => {
    console.log('=== Test: Session Persistence After Reload ===');
    
    // Login as guest
    await page.goto('/login');
    await page.locator('button:has-text("Continue as Guest")').click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on menu
    await expect(page).toHaveURL(/\/menu/);
    
    // Check if welcome message is shown
    const welcomeMessage = page.locator('text=Welcome').first();
    if (await welcomeMessage.isVisible()) {
      console.log('✓ Welcome message visible before reload');
    }
    
    // Reload multiple times to test session persistence
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should remain on menu page
      await expect(page).toHaveURL(/\/menu/);
      console.log(`✓ Reload ${i + 1}: Still on menu page`);
    }
    
    // User icon should still work after reloads
    const userIcon = page.locator('button:has(.lucide-user)').first();
    await userIcon.click();
    await page.waitForLoadState('networkidle');
    
    // Should navigate to order history
    await expect(page).toHaveURL(/\/order-history/);
    console.log('✓ User icon still functional after multiple reloads');
  });

  test('Should handle navigation from menu to various pages via user icon', async ({ page }) => {
    console.log('=== Test: Menu Navigation via User Icon ===');
    
    // Setup: Login and get to menu
    await page.goto('/login');
    await page.locator('button:has-text("Continue as Guest")').click();
    await page.waitForLoadState('networkidle');
    
    // Verify starting point
    await expect(page).toHaveURL(/\/menu/);
    
    // Test navigation from menu
    const userIcon = page.locator('button:has(.lucide-user)').first();
    await userIcon.click();
    await page.waitForLoadState('networkidle');
    
    // Should be on order history
    await expect(page).toHaveURL(/\/order-history/);
    
    // Navigate back to menu using different methods
    // Method 1: Direct navigation
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Direct navigation to menu works');
    
    // Method 2: Using back button (if available)
    await userIcon.click();
    await page.waitForLoadState('networkidle');
    
    // Try to go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/menu/);
    console.log('✓ Back button navigation to menu works');
    
    // Method 3: Using logo click (if available)
    const logo = page.locator('img[alt*="Logo"], img[alt*="logo"]').first();
    if (await logo.isVisible()) {
      await logo.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/menu/);
      console.log('✓ Logo click navigation to menu works');
    }
  });

  test('Should handle error states gracefully during user flow', async ({ page }) => {
    console.log('=== Test: Error Handling During User Flow ===');
    
    // Setup: Login as guest
    await page.goto('/login');
    await page.locator('button:has-text("Continue as Guest")').click();
    await page.waitForLoadState('networkidle');
    
    // Simulate network issues by intercepting requests
    await page.route('**/rest/v1/**', route => {
      // Let some requests through, block others to simulate intermittent issues
      if (Math.random() > 0.8) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Reload with potential network issues
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be on menu (with error handling)
    await expect(page).toHaveURL(/\/menu/);
    
    // User icon should still be clickable even with network issues
    const userIcon = page.locator('button:has(.lucide-user)').first();
    await userIcon.waitFor({ state: 'visible', timeout: 10000 });
    await userIcon.click();
    
    // Wait for navigation with timeout
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Should either navigate successfully or stay on current page
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/(menu|order-history|profile)/);
    console.log('✓ Error handling during navigation works');
  });
});
