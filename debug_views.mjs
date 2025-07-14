import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

async function testOrderFetching() {
  const adminUserId = '1fb151d2-b08a-4e51-9e6c-191ce0ef0adb'; // Your admin user ID
  const guestCustomerId = 'A4_Natascha';

  console.log('=== Testing Order Fetching ===\n');

  // 1. Test: Admin user orders (what shows in admin's personal order history)
  console.log('1. Admin user orders (your personal order history):');
  const { data: adminOrders, error: adminError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', adminUserId)
    .order('created_at', { ascending: false });
  
  console.log(`   Found ${adminOrders?.length || 0} orders`);
  if (adminOrders && adminOrders.length > 0) {
    adminOrders.forEach((order, index) => {
      console.log(`   Order ${index + 1}: ID=${order.id}, customer_name="${order.customer_name}", stay_id="${order.stay_id}", created_at="${order.created_at}"`);
    });
  }
  console.log();

  // 2. Test: Guest customer orders (what shows in /admin/customer-orders/A4_Natascha)
  console.log('2. Guest customer orders (A4_Natascha customer page):');
  const { data: guestOrders, error: guestError } = await supabase
    .from('orders')
    .select('*')
    .eq('stay_id', guestCustomerId)
    .order('created_at', { ascending: false });
  
  console.log(`   Found ${guestOrders?.length || 0} orders`);
  if (guestOrders && guestOrders.length > 0) {
    guestOrders.forEach((order, index) => {
      console.log(`   Order ${index + 1}: ID=${order.id}, customer_name="${order.customer_name}", user_id="${order.user_id}", created_at="${order.created_at}"`);
    });
  }
  console.log();

  // 3. Test: All recent orders (what shows in /admin/orders)
  console.log('3. All recent orders (admin orders dashboard):');
  const { data: allOrders, error: allError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`   Found ${allOrders?.length || 0} recent orders`);
  if (allOrders && allOrders.length > 0) {
    allOrders.forEach((order, index) => {
      console.log(`   Order ${index + 1}: ID=${order.id}, user_id="${order.user_id}", stay_id="${order.stay_id}", customer_name="${order.customer_name}"`);
    });
  }
  console.log();

  // 4. Test: Check for duplicate orders or related issues
  console.log('4. Potential duplicate analysis:');
  const { data: duplicateCheck, error: dupError } = await supabase
    .from('orders')
    .select('*')
    .or(`user_id.eq.${adminUserId},stay_id.eq.${guestCustomerId}`)
    .order('created_at', { ascending: false });
  
  console.log(`   Found ${duplicateCheck?.length || 0} orders related to admin or A4_Natascha`);
  if (duplicateCheck && duplicateCheck.length > 0) {
    duplicateCheck.forEach((order, index) => {
      console.log(`   Order ${index + 1}: ID=${order.id}, user_id="${order.user_id}", stay_id="${order.stay_id}", customer_name="${order.customer_name}"`);
    });
  }
}

testOrderFetching().catch(console.error);
