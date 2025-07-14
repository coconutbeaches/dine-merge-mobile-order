const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcplwmvbhreevxvsdmog.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo"
);

async function fixOrderNames() {
  console.log('🔧 Fixing order names in database...\n');
  
  try {
    // Get all orders that need fixing (recently recovered ones)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_name, guest_first_name, stay_id')
      .gte('id', 365) // Orders from the recent recovery
      .order('id', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }
    
    console.log(`📊 Found ${orders.length} orders to potentially fix`);
    
    let fixedCount = 0;
    
    for (const order of orders) {
      const originalCustomerName = order.customer_name;
      
      // Check if this is a hotel guest format (like "A3 Stefan")
      if (originalCustomerName && /^[A-Z]\d+\s/.test(originalCustomerName)) {
        // This should be a hotel guest - move to stay_id and guest_first_name
        const updates = {
          stay_id: originalCustomerName.replace(/\s/g, '_'),
          guest_first_name: originalCustomerName,
          customer_name: null
        };
        
        console.log(`🔄 Fixing order #${order.id}: "${originalCustomerName}" -> stay_id: "${updates.stay_id}"`);
        
        const { error: updateError } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`❌ Error updating order #${order.id}:`, updateError);
        } else {
          console.log(`✅ Fixed order #${order.id}`);
          fixedCount++;
        }
      } else if (originalCustomerName && originalCustomerName.includes('-')) {
        // Handle dash-separated hotel guests (e.g., "A5-CROWLEY")
        const updates = {
          stay_id: originalCustomerName.replace(/\s/g, '_'),
          guest_first_name: originalCustomerName,
          customer_name: null
        };
        
        console.log(`🔄 Fixing order #${order.id}: "${originalCustomerName}" -> stay_id: "${updates.stay_id}"`);
        
        const { error: updateError } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`❌ Error updating order #${order.id}:`, updateError);
        } else {
          console.log(`✅ Fixed order #${order.id}`);
          fixedCount++;
        }
      } else if (originalCustomerName && originalCustomerName.toLowerCase().includes('walkin')) {
        // Handle walk-in customers
        const guestUserId = `guest_${Date.now()}_${order.id}`;
        const updates = {
          stay_id: `walkin-${guestUserId}`,
          guest_user_id: guestUserId,
          customer_name: null,
          guest_first_name: originalCustomerName
        };
        
        console.log(`🔄 Fixing order #${order.id}: "${originalCustomerName}" -> walk-in`);
        
        const { error: updateError } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`❌ Error updating order #${order.id}:`, updateError);
        } else {
          console.log(`✅ Fixed order #${order.id}`);
          fixedCount++;
        }
      } else if (originalCustomerName) {
        // Regular customer - ensure it's in customer_name field
        if (order.guest_first_name === originalCustomerName && !order.customer_name) {
          const updates = {
            customer_name: originalCustomerName,
            guest_first_name: null,
            stay_id: null
          };
          
          console.log(`🔄 Fixing order #${order.id}: moving "${originalCustomerName}" to customer_name`);
          
          const { error: updateError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id);
          
          if (updateError) {
            console.error(`❌ Error updating order #${order.id}:`, updateError);
          } else {
            console.log(`✅ Fixed order #${order.id}`);
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Fixed ${fixedCount} orders`);
    console.log(`📱 Total orders processed: ${orders.length}`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the fix
if (require.main === module) {
  fixOrderNames().then(() => {
    console.log('🎉 Order name fixing completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });
}

module.exports = { fixOrderNames };
