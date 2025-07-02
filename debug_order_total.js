import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log('PAGE CONSOLE:', msg.text());
  });

  try {
    // 1. Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:8086/login', { waitUntil: 'networkidle0' });

    // 2. Enter credentials and login
    console.log('Entering credentials...');
    await page.type('input[name="email"], input[id="email"], input[type="email"]', 'steepdecline+a3@gmail.com');
    await page.type('input[name="password"], input[id="password"], input[type="password"]', 'nopass');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }); // Increased timeout to 60 seconds
    console.log('Logged in successfully.');

    // 3. Navigate to the customer orders page
    const orderPageUrl = 'http://localhost:8086/admin/customer-orders/fcd401ed-9d23-4561-ae74-3f9992b4e64c';
    console.log(`Navigating to order page: ${orderPageUrl}`);
    await page.goto(orderPageUrl, { waitUntil: 'networkidle0' });

    // 4. Click on "Order #0088" to open the edit dialog
    console.log('Clicking on Order #0088...');
    await page.evaluate(() => {
      const order88 = Array.from(document.querySelectorAll('h3.font-semibold.cursor-pointer')).find(el => el.textContent.includes('Order #0088'));
      if (order88) {
        order88.click();
        console.log('Order #0088 element found and clicked.');
      } else {
        console.error('Order #0088 element not found.');
      }
    });
    await page.waitForSelector('.sm\:max-w-\[425px\]'); // Wait for the dialog to appear
    console.log('Edit dialog opened.');

    // 5. Change the quantity of the first item from 2 to 4
    console.log('Changing quantity of the first item...');
    await page.waitForSelector('input[id^="item-quantity-"]');
    const quantityInput = await page.$('input[id^="item-quantity-"]');
    if (quantityInput) {
      await quantityInput.focus();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Delete');
      await quantityInput.type('4');
      console.log('Quantity changed to 4.');
    } else {
      console.error('Quantity input not found.');
    }

    // 6. Click the "Save changes" button
    console.log('Clicking Save button...');
    await page.click('button:has-text("Save")');
    await page.waitForSelector('.sm\:max-w-\[425px\]', { hidden: true }); // Wait for the dialog to close
    console.log('Save changes button clicked and dialog closed.');

    // 7. Capture the final displayed total amount on the card
    console.log('Capturing final displayed total amount...');
    await page.waitForSelector('.food-card .font-semibold span:last-child');
    const finalTotalElement = await page.$('.food-card .font-semibold span:last-child');
    const finalTotalText = finalTotalElement ? await finalTotalElement.evaluate(el => el.textContent) : 'N/A';
    console.log('Final displayed total amount:', finalTotalText);

  } catch (error) {
    console.error('Puppeteer script failed:', error);
    await page.screenshot({ path: 'error_screenshot.png' });
  } finally {
    await browser.close();
  }
})();
