// Debug script to check what guest customers are in the database
// Run this in the browser console on the /admin/customers page

console.log('=== DEBUG: Checking Guest Customers ===');

// Check what guest orders exist
supabase
  .from('orders')
  .select('stay_id, guest_user_id, total_amount, created_at')
  .not('guest_user_id', 'is', null)
  .not('stay_id', 'is', null)
  .then(result => {
    console.log('Guest orders:', result);
    
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

// Also check guest_users table
supabase
  .from('guest_users')
  .select('*')
  .then(result => {
    console.log('Guest users:', result);
  })
  .catch(err => console.error('Error fetching guest_users:', err));
