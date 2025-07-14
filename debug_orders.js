const { supabase } = require('./src/integrations/supabase/client');

async function checkOrders() {
  const customerId = 'A4_Natascha';
  
  // Check orders with stay_id
  const { data: stayIdOrders, error: stayIdError } = await supabase
    .from('orders')
    .select('*')
    .eq('stay_id', customerId)
    .order('created_at', { ascending: false });
  
  console.log('Orders with stay_id =', customerId, ':', stayIdOrders?.length || 0);
  if (stayIdOrders && stayIdOrders.length > 0) {
    console.log('Sample order:', stayIdOrders[0]);
  }
  if (stayIdError) {
    console.error('Error fetching stay_id orders:', stayIdError);
  }
  
  // Check orders with user_id (should be none for guest)
  const { data: userIdOrders, error: userIdError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false });
  
  console.log('Orders with user_id =', customerId, ':', userIdOrders?.length || 0);
  if (userIdOrders && userIdOrders.length > 0) {
    console.log('Sample order:', userIdOrders[0]);
  }
  if (userIdError) {
    console.error('Error fetching user_id orders:', userIdError);
  }
}

checkOrders().catch(console.error);
