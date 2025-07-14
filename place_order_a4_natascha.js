const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

async function placeOrder() {
  try {
    // Create a new order with a safe ID beyond the current max ID
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
    
    const safeId = (maxIdData[0]?.id || 0) + 1000 + Math.floor(Math.random() * 1000);
    const stayId = 'A4_Natascha';
    const guestUserId = `guest_${stayId}_${Date.now()}`;
    const guestFirstName = 'Coconut';
    
    console.log(`🎯 Using safe ID: ${safeId}`);

    const orderItems = [
      { name: 'Green Curry', price: 180, quantity: 2, options: [] },
      { name: 'Rice', price: 50, quantity: 2, options: [] },
      { name: 'Chang Beer', price: 120, quantity: 2, options: [] }
    ];

    const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);

    const newOrder = {
      id: safeId,
      guest_user_id: guestUserId,
      guest_first_name: guestFirstName,
      stay_id: stayId,
      customer_name: null, // null for guest families
      total_amount: totalAmount,
      table_number: '33',
      order_items: JSON.stringify(orderItems),
      order_status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`\n💾 Inserting order with ID ${safeId}...`);
    const { data: placedOrder, error: orderError } = await supabase
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error placing order:', orderError);
      return;
    }

    console.log(`✅ Order placed successfully! Order ID: ${placedOrder.id}, Table: ${placedOrder.table_number}, Amount: ฿${placedOrder.total_amount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

placeOrder();
