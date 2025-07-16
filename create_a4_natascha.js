const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

async function createA4Natascha() {
  console.log('🏨 Creating A4_Natascha guest family...\n');
  
  try {
    const stayId = 'A3_Natascha';
    const guestUserId = `guest_${stayId}_${Date.now()}`;
    const guestFirstName = 'Coconut';
    
    console.log(`📝 Creating guest user:
      Stay ID: ${stayId}
      Guest User ID: ${guestUserId}
      Guest Name: ${guestFirstName}`);
    
    // First check if this stay_id already has orders
    console.log('\n🔍 Checking for existing orders...');
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, guest_first_name, total_amount')
      .eq('stay_id', stayId);
      
    if (checkError) {
      console.error('❌ Error checking existing orders:', checkError);
      return;
    }
    
    if (existingOrders && existingOrders.length > 0) {
      console.log(`✅ Found ${existingOrders.length} existing order(s) for ${stayId}:`);
      existingOrders.forEach(order => {
        console.log(`   - Order #${order.id}: ${order.guest_first_name} - ฿${order.total_amount}`);
      });
      console.log('\n🎉 A4_Natascha family already exists with orders!');
      console.log('🔄 Refresh your admin customer list to see "A4 Natascha" appear!');
      return;
    }
    
    // Find a safe ID that doesn't conflict
    console.log('\n🔍 Finding safe ID for new order...');
    const { data: maxIdData, error: maxIdError } = await supabase
      .from('orders')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
      
    if (maxIdError) {
      console.error('❌ Error finding max ID:', maxIdError);
      return;
    }
    
    // Use a safe ID that's well beyond the current max
    const safeId = (maxIdData[0]?.id || 0) + 1000 + Math.floor(Math.random() * 1000);
    const currentGuestUserId = `guest_${stayId}_${Date.now()}`;
    
    console.log(`🎯 Using safe ID: ${safeId}`);
    
    // Create a test order for A4_Natascha family with explicit safe ID
    const testOrder = {
      id: safeId,
      guest_user_id: currentGuestUserId,
      guest_first_name: guestFirstName,
      stay_id: stayId,
      customer_name: null, // null for guest families
      total_amount: 450,
      table_number: 'A4',
      order_items: JSON.stringify([
        { 
          name: 'Pad Thai',
          price: 300, 
          quantity: 1,
          options: []
        },
        { 
          name: 'Thai Iced Tea', 
          price: 150, 
          quantity: 1,
          options: []
        }
      ]),
      order_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log(`\n💾 Inserting test order with ID ${safeId}...`);
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();
      
    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      return;
    }
    
    console.log(`✅ Order created successfully! Order ID: ${insertedOrder.id}`);
    
    // Also create a guest_users entry for completeness
    console.log('\n👤 Creating guest_users entry...');
    const { data: guestUser, error: guestError } = await supabase
      .from('guest_users')
      .insert([{
        user_id: guestUserId,
        first_name: guestFirstName,
        stay_id: stayId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (guestError) {
      console.warn('⚠️ Warning creating guest user (might already exist):', guestError.message);
    } else {
      console.log(`✅ Guest user created successfully!`);
    }
    
    console.log(`\n🎉 A4_Natascha family setup complete!
    
📊 Summary:
  - Stay ID: ${stayId}
  - Guest Name: ${guestFirstName}  
  - Table: A4
  - Test Order: ฿450 (Pad Thai + Thai Iced Tea)
  - Status: Ready for admin orders
  
🔄 Refresh your admin customer list to see "A4 Natascha" appear!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createA4Natascha();
