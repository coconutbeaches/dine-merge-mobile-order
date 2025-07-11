const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcplwmvbhreevxvsdmog.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo"
);

async function debugCustomers() {
  console.log('🔍 Debugging customers data...\n');
  
  // Check profiles table
  console.log('📋 Checking profiles table:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, created_at, archived')
    .order('created_at', { ascending: false });
  
  if (profilesError) {
    console.error('Profiles error:', profilesError);
  } else {
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(profile => {
      console.log(`  - ${profile.name || profile.email} (${profile.id})`);
    });
  }
  
  console.log('\n🏨 Checking guest_users table:');
  const { data: guestUsers, error: guestError } = await supabase
    .from('guest_users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (guestError) {
    console.error('Guest users error:', guestError);
  } else {
    console.log(`Found ${guestUsers.length} guest users:`);
    guestUsers.forEach(guest => {
      console.log(`  - ${guest.name} (stay_id: ${guest.stay_id})`);
    });
  }
  
  console.log('\n🛒 Checking orders table for hotel guests:');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, stay_id, guest_user_id, total_amount, created_at')
    .not('guest_user_id', 'is', null)
    .not('stay_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (ordersError) {
    console.error('Orders error:', ordersError);
  } else {
    console.log(`Found ${orders.length} recent guest orders:`);
    orders.forEach(order => {
      console.log(`  - Order ${order.id}: stay_id=${order.stay_id}, guest_user_id=${order.guest_user_id}, amount=${order.total_amount}`);
    });
  }
  
  console.log('\n🔄 Testing RPC function:');
  try {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_all_customers_with_total_spent_grouped', {
        p_limit: 100,
        p_offset: 0,
        p_include_archived: false
      });
    
    if (rpcError) {
      console.error('RPC error:', rpcError);
    } else {
      console.log(`RPC returned ${rpcData.length} customers:`);
      rpcData.forEach(customer => {
        console.log(`  - ${customer.name} (${customer.customer_type}) - spent: ${customer.total_spent}`);
      });
    }
  } catch (error) {
    console.error('RPC function not available:', error.message);
  }
}

debugCustomers().catch(console.error);
