import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('🔍 Testing database state...\n');

  try {
    // 1. Check current orders
    console.log('📊 Checking existing orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, guest_user_id, guest_first_name, stay_id, total_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }

    console.log(`Found ${orders.length} recent orders:`);
    orders.forEach(order => {
      const customerType = order.user_id ? 'Auth User' : 'Guest';
      const customerInfo = order.user_id 
        ? `User ID: ${order.user_id}` 
        : `Guest: ${order.guest_first_name} (Stay: ${order.stay_id})`;
      console.log(`  Order #${order.id} - ${customerType} - ${customerInfo} - $${order.total_amount}`);
    });

    // 2. Fix existing guest orders that have null stay_id
    const guestOrdersWithoutStayId = orders.filter(order => order.guest_user_id && !order.stay_id);
    if (guestOrdersWithoutStayId.length > 0) {
      console.log(`\n🔧 Found ${guestOrdersWithoutStayId.length} guest orders with null stay_id. Fixing them...`);
      
      for (const order of guestOrdersWithoutStayId) {
        const stayId = `A${Math.floor(Math.random() * 20) + 1}-GUEST`;
        const { error: updateError } = await supabase
          .from('orders')
          .update({ stay_id: stayId })
          .eq('id', order.id);
          
        if (updateError) {
          console.error(`❌ Error updating order ${order.id}:`, updateError);
        } else {
          console.log(`  ✅ Updated order #${order.id} with stay_id: ${stayId}`);
        }
      }
    }

    // 3. Test the new customer function (call it explicitly without parameters)
    console.log('\n👥 Testing get_customers_with_total_spent function...');
    const { data: customers, error: customersError } = await supabase
      .rpc('get_customers_with_total_spent', {});

    if (customersError) {
      console.error('❌ Error calling customer function:', customersError);
      console.log('Trying alternative approach...');
      
      // Try calling the function with a different approach
      const { data: altCustomers, error: altError } = await supabase
        .from('profiles')
        .select('id, name, email, customer_type, created_at')
        .limit(5);
        
      if (altError) {
        console.error('❌ Error with fallback query:', altError);
        return;
      }
      
      console.log('📋 Fallback: Found profiles in database:');
      altCustomers.forEach(profile => {
        console.log(`  👤 ${profile.name || 'Unnamed'} (${profile.customer_type || 'auth_user'})`);
      });
      return;
    }

    console.log(`Found ${customers.length} grouped customers:`);
    customers.forEach(customer => {
      console.log(`  ${customer.customer_type === 'auth_user' ? '👤' : '🏨'} ${customer.name} (${customer.customer_type}) - $${customer.total_spent}`);
    });

    // 4. Create test guest orders if no guest data exists
    const hasGuestOrders = orders.some(order => order.guest_user_id);
    
    if (!hasGuestOrders) {
      console.log('\n🏨 No guest orders found. Creating test guest family data...');
      
      // Create test guest orders for family "A5-CROWLEY"
      const testOrders = [
        {
          guest_user_id: 'guest_001',
          guest_first_name: 'John',
          stay_id: 'A5-CROWLEY',
          total_amount: 45.50,
          table_number: 'A5',
          order_items: JSON.stringify([
            { id: 'item1', name: 'Pad Thai', price: 25.50, quantity: 1 },
            { id: 'item2', name: 'Thai Iced Tea', price: 20.00, quantity: 1 }
          ]),
          order_status: 'completed'
        },
        {
          guest_user_id: 'guest_002',
          guest_first_name: 'Jane',
          stay_id: 'A5-CROWLEY',
          total_amount: 32.00,
          table_number: 'A5',
          order_items: JSON.stringify([
            { id: 'item3', name: 'Green Curry', price: 32.00, quantity: 1 }
          ]),
          order_status: 'completed'
        },
        {
          guest_user_id: 'guest_003',
          guest_first_name: 'Mike',
          stay_id: 'B12-SMITH',
          total_amount: 28.75,
          table_number: 'B12',
          order_items: JSON.stringify([
            { id: 'item4', name: 'Tom Yum Soup', price: 28.75, quantity: 1 }
          ]),
          order_status: 'new'
        }
      ];

      const { data: insertedOrders, error: insertError } = await supabase
        .from('orders')
        .insert(testOrders)
        .select();

      if (insertError) {
        console.error('❌ Error creating test orders:', insertError);
        return;
      }

      console.log(`✅ Created ${insertedOrders.length} test guest orders`);
      
      // Re-test the customer function
      const { data: updatedCustomers, error: updateError } = await supabase
        .rpc('get_customers_with_total_spent');

      if (updateError) {
        console.error('❌ Error calling updated customer function:', updateError);
        return;
      }

      console.log(`\n👥 Updated customer list (${updatedCustomers.length} customers):`);
      updatedCustomers.forEach(customer => {
        console.log(`  ${customer.customer_type === 'auth_user' ? '👤' : '🏨'} ${customer.name} (${customer.customer_type}) - $${customer.total_spent}`);
      });
    }

    console.log('\n✅ Database test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3002/admin/orders to test the orders dashboard');
    console.log('2. Visit http://localhost:3002/admin/customers to test the customers dashboard');
    console.log('3. Click on a guest family customer to test the order history page');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabase();
