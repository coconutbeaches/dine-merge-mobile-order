const { test, expect } = require('@playwright/test');

test.describe('Coconut Beach App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('should load the homepage with Coconut Beach branding', async ({ page }) => {
    // Check for Coconut Beach title/branding
    await expect(page.locator('h1, [class*="title"], [class*="brand"]')).toContainText(/coconut|beach/i);
    
    // Verify the page loads without errors
    await expect(page).toHaveTitle(/coconut|beach|drinks/i);
  });

  test('should display drink categories', async ({ page }) => {
    // Wait for categories to load
    await page.waitForLoadState('networkidle');
    
    // Check for drink categories
    const categories = ['Water', 'Soft Drinks', 'Coconut', 'Beer'];
    
    for (const category of categories) {
      await expect(page.locator(`text=${category}`)).toBeVisible();
    }
  });

  test('should have functional category navigation', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find and click on drink categories
    const categorySelectors = [
      'img[alt*="Water"]',
      'img[alt*="Soft"]', 
      'img[alt*="Coconut"]',
      'img[alt*="Beer"]'
    ];
    
    for (const selector of categorySelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await element.click();
        // Wait for any navigation or state change
        await page.waitForTimeout(500);
      }
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Check that content is still visible and accessible
    await expect(page.locator('body')).toBeVisible();
    
    // Verify no horizontal overflow
    const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should handle network issues gracefully', async ({ page }) => {
    // Test offline behavior
    await page.context().setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // App should still show something meaningful
    await expect(page.locator('body')).toBeVisible();
    
    // Re-enable network
    await page.context().setOffline(false);
  });

  test('should have good accessibility', async ({ page }) => {
    // Check for alt texts on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle drink category interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Click on each visible category and verify no errors
    const categoryElements = await page.locator('[class*="grid"] > div').all();
    
    for (let i = 0; i < Math.min(categoryElements.length, 4); i++) {
      const element = categoryElements[i];
      if (await element.isVisible()) {
        await element.click();
        
        // Check for console errors
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });
        
        await page.waitForTimeout(500);
        expect(errors.length).toBe(0);
      }
    }
  });
});
