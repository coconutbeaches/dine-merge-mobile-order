// Debug script to check what guest customers are in the database
// Run this in the browser console on the /admin/customers page

console.log('=== DEBUG: Checking Guest Customers ===');

// Check ALL orders first
supabase
  .from('orders')
  .select('id, stay_id, guest_user_id, user_id, total_amount, created_at')
  .limit(10)
  .then(result => {
    console.log('All orders (first 10):', result);
  })
  .catch(err => console.error('Error fetching all orders:', err));

// Check what guest orders exist
supabase
  .from('orders')
  .select('stay_id, guest_user_id, total_amount, created_at')
  .not('guest_user_id', 'is', null)
  .not('stay_id', 'is', null)
  .then(result => {
    console.log('Guest orders with both guest_user_id and stay_id:', result);
    
    if (result.data) {
      const uniqueStayIds = [...new Set(result.data.map(order => order.stay_id))];
      console.log('Unique stay_ids:', uniqueStayIds);
      
      // Group by stay_id
      const groups = result.data.reduce((acc, order) => {
        if (!acc[order.stay_id]) {
          acc[order.stay_id] = [];
        }
        acc[order.stay_id].push(order);
        return acc;
      }, {});
      
      console.log('Grouped by stay_id:', groups);
    }
  })
  .catch(err => console.error('Error:', err));

// Check guest orders with just stay_id (not null)
supabase
  .from('orders')
  .select('stay_id, guest_user_id, user_id, total_amount, created_at')
  .not('stay_id', 'is', null)
  .then(result => {
    console.log('Orders with stay_id (not null):', result);
  })
  .catch(err => console.error('Error fetching orders with stay_id:', err));

// Also check guest_users table
supabase
  .from('guest_users')
  .select('*')
  .then(result => {
    console.log('Guest users:', result);
  })
  .catch(err => console.error('Error fetching guest_users:', err));

// Check profiles table
supabase
  .from('profiles')
  .select('id, name, email, created_at')
  .limit(5)
  .then(result => {
    console.log('Profiles (first 5):', result);
  })
  .catch(err => console.error('Error fetching profiles:', err));
