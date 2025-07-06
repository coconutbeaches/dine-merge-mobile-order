// Manual test script to run in browser console
// This simulates guest checkout flow

console.log('=== Guest Checkout Manual Test ===');

// Step 1: Clear auth and create guest session
localStorage.clear();
sessionStorage.clear();

const guestSession = {
  guest_user_id: 'guest_' + Math.random().toString(36).substr(2, 9),
  guest_first_name: 'Test Guest',
  guest_stay_id: 'stay_123'
};

localStorage.setItem('guest_user_id', guestSession.guest_user_id);
localStorage.setItem('guest_first_name', guestSession.guest_first_name);
localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);

console.log('✓ Guest session created:', guestSession);

// Step 2: Verify guest session utility functions work
window.guestTestUtils = {
  getGuestSession: () => ({
    guest_user_id: localStorage.getItem('guest_user_id'),
    guest_first_name: localStorage.getItem('guest_first_name'),
    guest_stay_id: localStorage.getItem('guest_stay_id')
  }),
  
  hasGuestSession: () => {
    return localStorage.getItem('guest_user_id') && 
           localStorage.getItem('guest_first_name') && 
           localStorage.getItem('guest_stay_id');
  },
  
  clearGuestSession: () => {
    localStorage.removeItem('guest_user_id');
    localStorage.removeItem('guest_first_name');
    localStorage.removeItem('guest_stay_id');
  }
};

console.log('✓ Guest session utilities added to window.guestTestUtils');
console.log('✓ Has guest session:', window.guestTestUtils.hasGuestSession());

// Step 3: Instructions for manual testing
console.log(`
=== Manual Test Instructions ===

1. The guest session has been set up in localStorage
2. Navigate to /menu and add items to cart
3. Go to /checkout and try to place an order
4. Check browser console for any UUID or database errors
5. Verify the order is created with correct guest fields

Guest Session Info:
- guest_user_id: ${guestSession.guest_user_id}
- guest_first_name: ${guestSession.guest_first_name}
- guest_stay_id: ${guestSession.guest_stay_id}

To check guest session: window.guestTestUtils.getGuestSession()
To clear session: window.guestTestUtils.clearGuestSession()
`);

// Step 4: Add a test cart item if we're on a menu page
if (window.location.pathname.includes('menu')) {
  console.log('On menu page - adding test item to cart if possible');
  
  // Look for add to cart buttons
  const addToCartButtons = document.querySelectorAll('button');
  for (let button of addToCartButtons) {
    if (button.textContent.toLowerCase().includes('add')) {
      console.log('Found potential add to cart button:', button.textContent);
      break;
    }
  }
}
