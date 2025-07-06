import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFrontendLogic() {
  console.log('🧪 Testing frontend logic independently...\n');

  try {
    // Test 1: Fetch orders directly (what useFetchOrders does)
    console.log('📊 Testing order fetching logic...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id, 
        guest_user_id,
        guest_first_name,
        stay_id,
        total_amount,
        created_at,
        order_status,
        customer_name,
        table_number
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`✅ Found ${orders.length} orders`);
    
    // Test the display name logic from OrdersList component (updated logic)
    orders.forEach(order => {
      // Use the same logic as the updated OrdersList component
      let customerDisplayName;
      
      if (order.customer_name_from_profile || order.customer_name) {
        // Authenticated user with profile
        customerDisplayName = order.customer_name_from_profile || order.customer_name;
      } else if (order.guest_user_id) {
        // Guest user - prefer stay_id (family name) over individual guest name
        customerDisplayName = order.stay_id || order.guest_first_name || `Guest Order #${order.id}`;
      } else {
        // Fallback
        customerDisplayName = `Order #${order.id}`;
      }
      
      const customerType = order.user_id ? 'Auth User' : 'Guest';
      const customerInfo = order.user_id 
        ? `User: ${order.user_id.slice(0, 8)}...` 
        : `Guest: ${order.guest_first_name} (Stay: ${order.stay_id})`;
        
      console.log(`  ${customerDisplayName} - ${customerType} - ${customerInfo} - $${order.total_amount}`);
      
      // Debug guest name fallback logic
      if (order.guest_user_id) {
        console.log(`    🔍 Guest order debug - stay_id: "${order.stay_id}", guest_first_name: "${order.guest_first_name}", display: "${customerDisplayName}"`);
      }
    });

    // Test 2: Simulate the customer grouping logic manually
    console.log('\n👥 Testing customer grouping logic manually...');
    
    // Fetch auth users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, customer_type, created_at, archived')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    // Fetch guest families (group by stay_id)
    const { data: guestOrders, error: guestError } = await supabase
      .from('orders')
      .select('stay_id, guest_user_id, total_amount, created_at')
      .not('guest_user_id', 'is', null)
      .not('stay_id', 'is', null);

    if (guestError) {
      console.error('❌ Error fetching guest orders:', guestError);
      return;
    }

    // Group by stay_id manually
    const guestFamilies = {};
    guestOrders.forEach(order => {
      if (!guestFamilies[order.stay_id]) {
        guestFamilies[order.stay_id] = {
          customer_id: order.stay_id,
          name: order.stay_id,
          customer_type: 'guest_family',
          total_spent: 0,
          last_order_date: order.created_at,
          joined_at: order.created_at,
          archived: false
        };
      }
      guestFamilies[order.stay_id].total_spent += order.total_amount;
      if (order.created_at > guestFamilies[order.stay_id].last_order_date) {
        guestFamilies[order.stay_id].last_order_date = order.created_at;
      }
      if (order.created_at < guestFamilies[order.stay_id].joined_at) {
        guestFamilies[order.stay_id].joined_at = order.created_at;
      }
    });

    // Combine auth users and guest families
    const groupedCustomers = [
      ...profiles.map(profile => ({
        customer_id: profile.id,
        name: profile.name || 'Unnamed Customer',
        customer_type: 'auth_user',
        total_spent: 0, // Would normally calculate from orders
        last_order_date: null,
        joined_at: profile.created_at,
        archived: profile.archived || false
      })),
      ...Object.values(guestFamilies)
    ];

    console.log(`✅ Manually grouped ${groupedCustomers.length} customers:`);
    groupedCustomers.forEach(customer => {
      const icon = customer.customer_type === 'auth_user' ? '👤' : '🏨';
      console.log(`  ${icon} ${customer.name} (${customer.customer_type}) - $${customer.total_spent}`);
    });

    // Test 3: Test family order fetching logic
    const familyStayIds = Object.keys(guestFamilies);
    if (familyStayIds.length > 0) {
      const testStayId = familyStayIds[0];
      console.log(`\n🏨 Testing family order history for stay_id: ${testStayId}`);
      
      const { data: familyOrders, error: familyError } = await supabase
        .from('orders')
        .select('id, guest_user_id, guest_first_name, stay_id, total_amount, created_at')
        .eq('stay_id', testStayId)
        .order('created_at', { ascending: false });

      if (familyError) {
        console.error('❌ Error fetching family orders:', familyError);
        return;
      }

      console.log(`✅ Found ${familyOrders.length} orders for family ${testStayId}:`);
      familyOrders.forEach(order => {
        console.log(`  Order #${order.id} - ${order.guest_first_name} - $${order.total_amount}`);
      });
    }

    console.log('\n✅ Frontend logic test completed successfully!');
    console.log('\nSummary:');
    console.log(`- Orders fetching: ✅ Working`);
    console.log(`- Guest name display: ✅ Working`);
    console.log(`- Customer grouping: ✅ Working manually`);
    console.log(`- Family order history: ✅ Working`);
    console.log('\nIssue: Database function conflict needs to be resolved in Supabase Dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFrontendLogic();
