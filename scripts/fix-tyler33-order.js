import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTyler33Order() {
  console.log('🔧 Fixing Tyler33 order to have correct stay_id...\n');

  try {
    // First, find the Tyler33 order with null stay_id
    const { data: tyler33Orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, guest_first_name, stay_id, total_amount')
      .eq('guest_first_name', 'Tyler33')
      .is('stay_id', null);

    if (fetchError) {
      console.error('❌ Error fetching Tyler33 orders:', fetchError);
      return;
    }

    if (!tyler33Orders || tyler33Orders.length === 0) {
      console.log('ℹ️ No Tyler33 orders with null stay_id found');
      return;
    }

    console.log(`Found ${tyler33Orders.length} Tyler33 orders with null stay_id:`);
    tyler33Orders.forEach(order => {
      console.log(`  Order #${order.id} - ${order.guest_first_name} - $${order.total_amount} - stay_id: ${order.stay_id}`);
    });

    // Update Tyler33 orders to use "A5-CROWLEY" as the stay_id
    for (const order of tyler33Orders) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ stay_id: 'A5-CROWLEY' })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error updating order ${order.id}:`, updateError);
      } else {
        console.log(`✅ Updated order #${order.id} - Tyler33 -> stay_id: A5-CROWLEY`);
      }
    }

    // Verify the changes
    console.log('\n🔍 Verifying updates...');
    const { data: updatedOrders, error: verifyError } = await supabase
      .from('orders')
      .select('id, guest_first_name, stay_id, total_amount')
      .eq('guest_first_name', 'Tyler33');

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
      return;
    }

    console.log('Updated Tyler33 orders:');
    updatedOrders.forEach(order => {
      console.log(`  Order #${order.id} - ${order.guest_first_name} - $${order.total_amount} - stay_id: ${order.stay_id}`);
    });

    console.log('\n✅ Tyler33 order fix completed successfully!');
    console.log('Now Tyler33 orders should display as "🛖 A5-CROWLEY" in the admin dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTyler33Order();
