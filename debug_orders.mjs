import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wcplwmvbhreevxvsdmog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo'
);

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
  
  // Check for any orders where user_id is your admin ID
  const { data: adminIdOrders, error: adminIdError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', 'steepdecline+3@gmail.com')
    .order('created_at', { ascending: false });
  
  console.log('Orders with admin email as user_id:', adminIdOrders?.length || 0);
  if (adminIdOrders && adminIdOrders.length > 0) {
    console.log('Sample admin order:', adminIdOrders[0]);
  }
  if (adminIdError) {
    console.error('Error fetching admin orders:', adminIdError);
  }
  
  // Check for profiles with your email
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'steepdecline+3@gmail.com')
    .single();
  
  console.log('Profile for admin email:', profileData?.id || 'Not found');
  if (profileData) {
    // Check orders with your actual user ID
    const { data: actualUserOrders, error: actualUserError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false });
    
    console.log('Orders with actual admin user_id:', actualUserOrders?.length || 0);
    if (actualUserOrders && actualUserOrders.length > 0) {
      console.log('Sample actual admin order:', actualUserOrders[0]);
    }
  }
}

checkOrders().catch(console.error);
