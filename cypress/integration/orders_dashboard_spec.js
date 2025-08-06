describe('Orders Dashboard Performance Under Load', () => {
  let initialOrderCount = 0;
  const TEST_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
  const ASSERTION_INTERVAL = 2000; // Check every 2 seconds
  const SCROLL_INTERVAL = 5000; // Scroll every 5 seconds
  
  before(() => {
    // Start the backend dummy order insertion script
    cy.task('startDummyOrderInsertion');
    
    // Visit the Orders Dashboard
    cy.visit('/admin/orders');
    
    // Wait for initial load and get baseline
    cy.wait(3000);
    cy.get('[data-testid="orders-list"]', { timeout: 10000 }).should('be.visible');
  });

  after(() => {
    // Stop the dummy order insertion
    cy.task('stopDummyOrderInsertion');
  });

  it('should handle 10 minutes of load without WebSocket issues', () => {
    let startTime = Date.now();
    let lastOrderCount = 0;
    let maxChannelCount = 0;
    let wsErrors = [];
    
    // Get initial order count
    cy.window().its('supabase').then((supabase) => {
      initialOrderCount = supabase.getChannels().length;
      console.log(`Initial channel count: ${initialOrderCount}`);
    });
    
    // Define the test loop
    function runTestLoop() {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed >= TEST_DURATION) {
        // Test completed - final assertions
        cy.window().its('supabase').then((supabase) => {
          const finalChannelCount = supabase.getChannels().length;
          expect(finalChannelCount).to.be.lte(2, 'Channel count should never exceed 2');
          expect(wsErrors.length).to.equal(0, 'No WebSocket errors should occur');
        });
        return;
      }
      
      // Perform user actions
      cy.scrollTo('bottom', { duration: 1000 });
      cy.wait(1000);
      cy.scrollTo('top', { duration: 1000 });
      
      // Change filters randomly
      if (Math.random() > 0.7) {
        const filters = ['all', 'new', 'preparing', 'ready', 'completed'];
        const randomFilter = filters[Math.floor(Math.random() * filters.length)];
        cy.get(`[data-value="${randomFilter}"]`).click({ force: true });
      }
      
      // Search functionality test
      if (Math.random() > 0.8) {
        cy.get('[aria-label="Search orders"]').clear();
        cy.get('[aria-label="Search orders"]').type('test search', { delay: 100 });
        cy.wait(500);
        cy.get('[aria-label="Search orders"]').clear();
      }
      
      // Perform assertions
      cy.window().then((win) => {
        // Check channel count
        const currentChannelCount = win.supabase.getChannels().length;
        maxChannelCount = Math.max(maxChannelCount, currentChannelCount);
        expect(currentChannelCount).to.be.lte(2, `Channel count exceeded 2: ${currentChannelCount}`);
        
        // Check for WebSocket connection status
        const channels = win.supabase.getChannels();
        channels.forEach(channel => {
          if (channel.state === 'closed' && channel.closeCode === 1006) {
            wsErrors.push(`WebSocket closed with code 1006 at ${new Date().toISOString()}`);
          }
        });
        
        // Check if orders are increasing (from DOM count)
        cy.get('[data-testid="order-row"]').then($orders => {
          const currentOrderCount = $orders.length;
          if (lastOrderCount > 0) {
            // Allow for some variation due to filtering/pagination
            expect(currentOrderCount).to.be.greaterThan(lastOrderCount - 10, 'Orders should keep increasing');
          }
          lastOrderCount = currentOrderCount;
        });
      });
      
      // Continue the loop
      cy.wait(ASSERTION_INTERVAL).then(runTestLoop);
    }
    
    // Start the test loop
    runTestLoop();
  });
  
  it('should handle multiple browser tabs', () => {
    // This test simulates opening the same dashboard in multiple tabs
    cy.window().then((win) => {
      // Open another instance in the same window (simulating tab)
      const newWindow = win.open('/admin/orders', '_blank');
      
      cy.wait(5000); // Allow both instances to load
      
      // Check that channel count is still ≤ 2 with multiple instances
      cy.window().its('supabase').then((supabase) => {
        const channelCount = supabase.getChannels().length;
        expect(channelCount).to.be.lte(2, 'Multiple tabs should not create extra channels');
      });
      
      // Clean up
      if (newWindow) {
        newWindow.close();
      }
    });
  });
});
