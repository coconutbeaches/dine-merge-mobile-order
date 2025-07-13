const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

async function checkGuests() {
  console.log('🔍 Checking guest families in database...\n');
  
  try {
    // Check orders with guest info
    const { data: orders, error } = await supabase
      .from('orders')
      .select('stay_id, guest_first_name, guest_user_id, total_amount, created_at')
      .not('guest_user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 Recent guest orders:');
    if (!orders || orders.length === 0) {
      console.log('  No guest orders found.');
      return;
    }
    
    orders.forEach(order => {
      console.log(`  Stay: ${order.stay_id} | Guest: ${order.guest_first_name} | Amount: ฿${order.total_amount}`);
    });
    
    // Group by stay_id
    const guestFamilies = {};
    orders.forEach(order => {
      if (!guestFamilies[order.stay_id]) {
        guestFamilies[order.stay_id] = {
          stay_id: order.stay_id,
          total_orders: 0,
          total_spent: 0,
          first_order: order.created_at
        };
      }
      guestFamilies[order.stay_id].total_orders++;
      guestFamilies[order.stay_id].total_spent += order.total_amount;
    });
    
    console.log('\n🏨 Guest families summary:');
    Object.values(guestFamilies).forEach(family => {
      console.log(`  ${family.stay_id}: ${family.total_orders} orders, ฿${family.total_spent} total`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGuests();
