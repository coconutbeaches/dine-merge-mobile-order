const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

let isRunning = false;
let intervalId = null;
let orderCounter = 0;

// Sample data for generating dummy orders
const dummyCustomers = [
  { name: 'Test Customer 1', email: 'test1@example.com' },
  { name: 'Test Customer 2', email: 'test2@example.com' },
  { name: 'Test Customer 3', email: 'test3@example.com' },
  { name: 'Guest User', email: null },
];

const dummyProducts = [
  { name: 'Test Product 1', price: 100.00 },
  { name: 'Test Product 2', price: 150.50 },
  { name: 'Test Product 3', price: 75.25 },
  { name: 'Test Product 4', price: 200.00 },
];

const orderStatuses = ['new', 'preparing', 'ready', 'delivery', 'completed'];
const tableNumbers = ['1', '2', '3', '4', '5', 'Take Away'];

/**
 * Generate a random dummy order
 */
function generateDummyOrder() {
  const customer = dummyCustomers[Math.floor(Math.random() * dummyCustomers.length)];
  const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)];
  const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
  const tableNumber = tableNumbers[Math.floor(Math.random() * tableNumbers.length)];
  
  orderCounter++;
  
  return {
    customer_name: customer.name,
    customer_email: customer.email,
    order_status: status,
    table_number: tableNumber,
    total_amount: product.price,
    order_items: [
      {
        product: product.name,
        quantity: 1,
        price: product.price
      }
    ],
    special_instructions: `Test order #${orderCounter} - Load testing`,
    created_at: new Date().toISOString(),
    stay_id: customer.email ? null : `stay-${Math.floor(Math.random() * 100)}`,
    guest_first_name: customer.email ? null : customer.name.split(' ')[0],
    guest_user_id: customer.email ? null : `guest-${Math.floor(Math.random() * 1000)}`
  };
}

/**
 * Insert a dummy order into the database
 */
async function insertDummyOrder() {
  try {
    const orderData = generateDummyOrder();
    
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();
    
    if (error) {
      console.error('Error inserting dummy order:', error);
      return false;
    }
    
    console.log(`✅ Inserted dummy order #${orderCounter}:`, {
      id: data[0].id,
      customer: orderData.customer_name,
      status: orderData.order_status,
      amount: orderData.total_amount
    });
    
    return true;
  } catch (error) {
    console.error('Unexpected error inserting dummy order:', error);
    return false;
  }
}

/**
 * Start inserting dummy orders every 5 seconds
 */
function startInsertingOrders() {
  if (isRunning) {
    console.log('⚠️ Dummy order insertion is already running');
    return;
  }
  
  console.log('🚀 Starting dummy order insertion (every 5 seconds)...');
  isRunning = true;
  
  // Insert first order immediately
  insertDummyOrder();
  
  // Then insert every 5 seconds
  intervalId = setInterval(() => {
    insertDummyOrder();
  }, 5000);
  
  console.log('✅ Dummy order insertion started');
}

/**
 * Stop inserting dummy orders
 */
function stopInsertingOrders() {
  if (!isRunning) {
    console.log('⚠️ Dummy order insertion is not running');
    return;
  }
  
  console.log('🛑 Stopping dummy order insertion...');
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  isRunning = false;
  console.log(`✅ Dummy order insertion stopped. Total orders inserted: ${orderCounter}`);
}

/**
 * Clean up dummy orders (for cleanup after testing)
 */
async function cleanupDummyOrders() {
  try {
    console.log('🧹 Cleaning up dummy orders...');
    
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .like('special_instructions', '%Load testing%')
      .select();
    
    if (error) {
      console.error('Error cleaning up dummy orders:', error);
      return false;
    }
    
    console.log(`✅ Cleaned up ${data.length} dummy orders`);
    return true;
  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    return false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📡 Received SIGINT, shutting down gracefully...');
  stopInsertingOrders();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📡 Received SIGTERM, shutting down gracefully...');
  stopInsertingOrders();
  process.exit(0);
});

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'start':
    startInsertingOrders();
    // Keep the process running
    setInterval(() => {
      // Keep alive
    }, 1000);
    break;
    
  case 'stop':
    stopInsertingOrders();
    process.exit(0);
    break;
    
  case 'cleanup':
    cleanupDummyOrders().then(() => {
      process.exit(0);
    });
    break;
    
  default:
    console.log(`
Usage: node scripts/insert-dummy-orders.js [command]

Commands:
  start   - Start inserting dummy orders every 5 seconds
  stop    - Stop inserting dummy orders
  cleanup - Remove all dummy orders from the database

Example:
  node scripts/insert-dummy-orders.js start
    `);
    process.exit(1);
}

// Export functions for programmatic use
module.exports = {
  startInsertingOrders,
  stopInsertingOrders,
  cleanupDummyOrders,
  isRunning: () => isRunning,
  getOrderCount: () => orderCounter
};
