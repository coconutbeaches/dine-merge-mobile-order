const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

async function debugA4Natascha() {
  console.log('🔍 Debugging A4_Natascha customer visibility...\n');
  
  // 1. Check orders for A4_Natascha
  console.log('1. Checking orders for A4_Natascha:');
  const { data: a4Orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, stay_id, guest_first_name, total_amount, created_at, table_number')
    .eq('stay_id', 'A4_Natascha');
    
  if (ordersError) {
    console.error('❌ Error fetching A4 orders:', ordersError);
  } else {
    console.log(`✅ Found ${a4Orders.length} orders for A4_Natascha:`);
    a4Orders.forEach(order => {
      console.log(`   - Order #${order.id}: ${order.guest_first_name} - ฿${order.total_amount} (Table: ${order.table_number})`);
    });
  }
  
  // 2. Check all guest orders to see grouping
  console.log('\n2. Checking all guest orders for grouping:');
  const { data: guestOrders, error: guestError } = await supabase
    .from('orders')
    .select('stay_id, total_amount, created_at, table_number')
    .not('guest_user_id', 'is', null)
    .not('stay_id', 'is', null);
    
  if (guestError) {
    console.error('❌ Error fetching guest orders:', guestError);
  } else {
    console.log(`✅ Found ${guestOrders.length} total guest orders`);
    
    // Group by stay_id
    const groups = guestOrders.reduce((acc, order) => {
      if (!acc[order.stay_id]) acc[order.stay_id] = [];
      acc[order.stay_id].push(order);
      return acc;
    }, {});
    
    console.log('Guest family groups:');
    Object.entries(groups).forEach(([stayId, orders]) => {
      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
      console.log(`   - ${stayId}: ${orders.length} orders, ฿${totalSpent} total`);
    });
  }
  
  // 3. Try the RPC function that should return guest families
  console.log('\n3. Testing RPC functions:');
  
  try {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_customers_with_total_spent');
      
    if (rpcError) {
      console.log('❌ get_customers_with_total_spent error:', rpcError.message);
    } else {
      const guestFamilies = rpcData.filter(c => c.customer_type === 'guest_family');
      console.log(`✅ RPC returned ${guestFamilies.length} guest families`);
      guestFamilies.forEach(family => {
        console.log(`   - ${family.name} (${family.customer_id}): ฿${family.total_spent}`);
      });
    }
  } catch (e) {
    console.log('❌ RPC function not available:', e.message);
  }
  
  // 4. Try the newer RPC function
  try {
    const { data: rpcData2, error: rpcError2 } = await supabase
      .rpc('get_all_customers_with_total_spent_grouped', {
        p_limit: 100,
        p_offset: 0,
        p_include_archived: false
      });
      
    if (rpcError2) {
      console.log('❌ get_all_customers_with_total_spent_grouped error:', rpcError2.message);
    } else {
      const guestFamilies = rpcData2.filter(c => c.customer_type === 'guest_family');
      console.log(`✅ New RPC returned ${guestFamilies.length} guest families`);
      guestFamilies.forEach(family => {
        console.log(`   - ${family.name} (${family.customer_id}): ฿${family.total_spent}`);
      });
    }
  } catch (e) {
    console.log('❌ New RPC function not available:', e.message);
  }
}

debugA4Natascha();
