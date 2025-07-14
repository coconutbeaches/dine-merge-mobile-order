const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// WAHA Configuration
const WAHA_URL = 'http://localhost:3001'; // Change this to your WAHA instance URL
const WAHA_API_KEY = 'supersecrethotelkey'; // API key from hotel WAHA instance
const WHATSAPP_NUMBER = '+66631457299';
const SESSION_NAME = 'default'; // WAHA session name

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcplwmvbhreevxvsdmog.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcGx3bXZiaHJlZXZ4dnNkbW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5Njc5MDIsImV4cCI6MjA2MjU0MzkwMn0.lyq2RNg01GDyqkT5yjPSSxs2h3581Hr8QmytpDDzhTo"
);

// Helper function to get axios config with authentication
function getAxiosConfig(additionalConfig = {}) {
  return {
    ...additionalConfig,
    headers: {
      'X-Api-Key': WAHA_API_KEY,
      ...additionalConfig.headers
    }
  };
}

// Step 1: Start WAHA Session and Connect WhatsApp
async function setupWAHA() {
  console.log('🔧 Setting up WAHA connection...');
  
  try {
    // Start session
    console.log('📱 Starting WAHA session...');
    const sessionResponse = await axios.post(`${WAHA_URL}/api/sessions/start`, {
      name: SESSION_NAME,
      config: {
        webhooks: []
      }
    }, getAxiosConfig());
    
    console.log('✅ Session started:', sessionResponse.data);
    
    // Wait for session to reach SCAN_QR_CODE state
    console.log('⏳ Waiting for session to be ready for QR code...');
    let sessionReady = false;
    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutes
    
    while (!sessionReady && attempts < maxAttempts) {
      try {
        const statusCheck = await axios.get(`${WAHA_URL}/api/sessions/${SESSION_NAME}`, getAxiosConfig());
        if (statusCheck.data.status === 'SCAN_QR_CODE') {
          sessionReady = true;
          console.log('✅ Session ready for QR code!');
        } else {
          console.log(`⏳ Session status: ${statusCheck.data.status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          attempts++;
        }
      } catch (error) {
        console.log('⏳ Still waiting for session to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }
    
    if (!sessionReady) {
      throw new Error('Session did not reach SCAN_QR_CODE state in time');
    }
    
    // Get QR code for WhatsApp authentication
    console.log('📲 Getting QR code for WhatsApp authentication...');
    const qrResponse = await axios.get(`${WAHA_URL}/api/${SESSION_NAME}/auth/qr`, getAxiosConfig());
    
    if (qrResponse.data.qr) {
      console.log('📱 QR Code:');
      console.log(qrResponse.data.qr);
      console.log('👆 Scan this QR code with your WhatsApp on +66631457299');
      console.log('⏳ Waiting for authentication...');
      
      // Wait for authentication
      await waitForAuthentication();
    } else {
      console.log('✅ Already authenticated with WhatsApp');
    }
    
  } catch (error) {
    console.error('❌ Error setting up WAHA:', error.response?.data || error.message);
    throw error;
  }
}

// Wait for WhatsApp authentication
async function waitForAuthentication() {
  let authenticated = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes
  
  while (!authenticated && attempts < maxAttempts) {
    try {
      const statusResponse = await axios.get(`${WAHA_URL}/api/sessions/${SESSION_NAME}`, getAxiosConfig());
      if (statusResponse.data.status === 'WORKING') {
        authenticated = true;
        console.log('✅ WhatsApp authenticated successfully!');
      } else {
        console.log(`⏳ Status: ${statusResponse.data.status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      }
    } catch (error) {
      console.log('⏳ Still waiting for authentication...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }
  
  if (!authenticated) {
    throw new Error('Authentication timeout. Please try again.');
  }
}

// Step 2: Fetch messages from the last 12 hours
async function fetchRecentMessages() {
  console.log('📥 Fetching messages from the last 12 hours...');
  
  try {
    // Calculate timestamp for 12 hours ago
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const timestamp = Math.floor(twelveHoursAgo.getTime() / 1000);
    
    // First try to get chats
    console.log('🔍 Trying different API endpoints...');
    let response;
    
    // Try different possible endpoints
    const possibleEndpoints = [
      `/api/${SESSION_NAME}/chats`,
      `/api/sessions/${SESSION_NAME}/chats`,
      `/api/chats`,
      `/api/${SESSION_NAME}/messages`,
      `/api/sessions/${SESSION_NAME}/messages`
    ];
    
    let chats = [];
    let foundEndpoint = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        response = await axios.get(`${WAHA_URL}${endpoint}`, getAxiosConfig({
          params: {
            limit: 100
          }
        }));
        chats = response.data;
        foundEndpoint = endpoint;
        console.log(`✅ Found working endpoint: ${endpoint}`);
        break;
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed: ${error.response?.status}`);
        continue;
      }
    }
    
    if (!foundEndpoint) {
      throw new Error('Could not find working API endpoint for chats');
    }
    
    console.log(`📱 Found ${chats.length} chats`);
    
    // Get messages from all chats
    let allMessages = [];
    for (const chat of chats) {
      try {
        const chatId = chat.id._serialized;
        let messagesEndpoint;
        if (foundEndpoint.includes('sessions')) {
          messagesEndpoint = `/api/sessions/${SESSION_NAME}/chats/${chatId}/messages`;
        } else {
          messagesEndpoint = `/api/${SESSION_NAME}/chats/${chatId}/messages`;
        }
        
        console.log(`📥 Fetching messages from chat ${chatId}...`);
        const messagesResponse = await axios.get(`${WAHA_URL}${messagesEndpoint}`, getAxiosConfig({
          params: {
            limit: 50
          }
        }));
        
        const recentMessages = messagesResponse.data.filter(msg => {
          const messageTime = new Date(msg.timestamp * 1000);
          return messageTime > twelveHoursAgo && msg.body && msg.body.includes('*Order:');
        });
        
        console.log(`📨 Found ${recentMessages.length} order messages in chat ${chatId}`);
        allMessages = allMessages.concat(recentMessages);
      } catch (error) {
        console.log(`⚠️ Error fetching messages from chat ${chatId}:`, error.message);
      }
    }
    
    console.log(`📨 Found ${allMessages.length} total order messages in the last 12 hours`);
    return allMessages;
    
  } catch (error) {
    console.error('❌ Error fetching messages:', error.response?.data || error.message);
    throw error;
  }
}

// Step 3: Parse WhatsApp message to extract order data
function parseOrderFromMessage(message) {
  const text = message.body;
  
  try {
    // Parse order ID
    const orderIdMatch = text.match(/\*Order: #(\d+)\*/);
    if (!orderIdMatch) {
      console.log('⚠️ No order ID found in message');
      return null;
    }
    const orderId = parseInt(orderIdMatch[1]);
    
    // Parse customer name
    const customerMatch = text.match(/\*Customer:\* (.+)/);
    const customerName = customerMatch ? customerMatch[1].trim() : 'Unknown';
    
    // Parse table number
    const tableMatch = text.match(/\*Table:\* (.+)/);
    const tableNumber = tableMatch ? tableMatch[1].trim() : null;
    
    // Parse items
    const itemsSection = text.match(/\*Items:\*\n([\s\S]*?)\n\*Total:/);
    let orderItems = [];
    
    if (itemsSection) {
      const itemLines = itemsSection[1].split('\n').filter(line => line.trim().startsWith('- '));
      
      orderItems = itemLines.map(line => {
        // Parse: "- 2x Product Name (options)"
        const itemMatch = line.match(/- (\d+)x (.+?)(?:\s\((.+)\))?$/);
        if (itemMatch) {
          const quantity = parseInt(itemMatch[1]);
          const name = itemMatch[2].trim();
          const optionsString = itemMatch[3] || null;
          
          return {
            name,
            quantity,
            optionsString,
            price: 0 // We'll need to calculate this or get from products table
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    // Parse total amount
    const totalMatch = text.match(/\*Total:\* ฿([\d,]+)/);
    const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;
    
    const order = {
      // Don't set ID - let Supabase auto-generate it
      customer_name: customerName === 'Guest' ? null : customerName,
      guest_first_name: customerName === 'Guest' ? 'Guest' : null,
      table_number: tableNumber,
      order_items: orderItems,
      total_amount: totalAmount,
      created_at: new Date(message.timestamp * 1000).toISOString(),
      order_status: 'new',
      guest_user_id: customerName === 'Guest' ? `guest_${Date.now()}` : null,
      stay_id: null, // Will be determined based on customer type
      user_id: null,
      // Store original WhatsApp order ID as metadata for reference
      whatsapp_order_id: orderId
    };
    
    // Hotel guest family mappings based on known registrations
    const hotelGuestFamilies = {
      'Nathan': 'Double_Nathan',
      'Charlotte': 'Double_Nathan',
      'Freddie': 'Double_Nathan',
      'Elspeth': 'Double_Nathan',
      'Ana Natascha': 'A4_Natascha',
      'Sabrina': 'A4_Natascha'
    };
    
    // Determine stay_id based on customer name format
    if (customerName && hotelGuestFamilies[customerName]) {
      // Known hotel guest family member
      order.stay_id = hotelGuestFamilies[customerName];
      order.customer_name = null;
      order.guest_first_name = customerName;
      order.guest_user_id = `guest_${hotelGuestFamilies[customerName]}_${Date.now()}`;
    } else if (customerName && (customerName.includes('-') || /^[A-Z]\d+\s/.test(customerName))) {
      // Looks like a hotel stay ID (e.g., "A5-CROWLEY", "A3 Stefan", "B12 John")
      order.stay_id = customerName.replace(/\s/g, '_');
      order.customer_name = null;
      order.guest_first_name = customerName;
      order.guest_user_id = `guest_${customerName.replace(/\s/g, '_')}_${Date.now()}`;
    } else if (customerName && customerName.toLowerCase().includes('walkin')) {
      // Walk-in customer
      order.stay_id = `walkin-${order.guest_user_id}`;
    } else if (customerName === 'Guest') {
      // Generic guest
      order.customer_name = null;
      order.guest_first_name = 'Guest';
      order.guest_user_id = `guest_${Date.now()}`;
    } else {
      // Regular customer - use customer_name field
      order.customer_name = customerName;
      order.guest_first_name = null;
      order.guest_user_id = null;
    }
    
    console.log(`✅ Parsed order #${orderId} for ${customerName} - ฿${totalAmount}`);
    return order;
    
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    console.log('📄 Message text:', text);
    return null;
  }
}

// Step 4: Insert order into Supabase
async function insertOrder(order) {
  try {
    console.log(`💾 Inserting order #${order.id}...`);
    
    const { data, error } = await supabase
      .from('orders')
      .insert([order])
      .select();
    
    if (error) {
      // If order already exists, update it instead
      if (error.code === '23505') { // Unique constraint violation
        console.log(`🔄 Order #${order.id} already exists, updating...`);
        const { data: updateData, error: updateError } = await supabase
          .from('orders')
          .update(order)
          .eq('id', order.id)
          .select();
        
        if (updateError) {
          console.error(`❌ Error updating order #${order.id}:`, updateError);
          return false;
        } else {
          console.log(`✅ Updated order #${order.id}`);
          return true;
        }
      } else {
        console.error(`❌ Error inserting order #${order.id}:`, error);
        return false;
      }
    } else {
      console.log(`✅ Inserted order #${order.id}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Error with order #${order.id}:`, error);
    return false;
  }
}

// Main function to recover orders
async function recoverOrders() {
  console.log('🚀 Starting order recovery from WhatsApp...\n');
  
  try {
    // Check current session status
    console.log('🔍 Checking current WAHA session...');
    const statusResponse = await axios.get(`${WAHA_URL}/api/sessions/${SESSION_NAME}`, getAxiosConfig());
    console.log(`📱 Current session status: ${statusResponse.data.status}`);
    console.log(`📱 Connected to: ${statusResponse.data.me?.pushName || 'Unknown'} (${statusResponse.data.me?.id || 'Unknown'})`);
    
    if (statusResponse.data.status !== 'WORKING') {
      console.log('⚠️ Session is not working. You may need to reconnect WhatsApp.');
      // Step 1: Setup WAHA if not working
      await setupWAHA();
    } else {
      console.log('✅ Session is working, proceeding with message fetch...');
    }
    
    // Step 2: Fetch recent messages
    const messages = await fetchRecentMessages();
    
    if (messages.length === 0) {
      console.log('ℹ️ No order messages found in the last 12 hours');
      return;
    }
    
    // Step 3: Parse and insert orders
    console.log(`\n🔄 Processing ${messages.length} order messages...\n`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const message of messages) {
      const order = parseOrderFromMessage(message);
      
      if (order) {
        const success = await insertOrder(order);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        failureCount++;
      }
    }
    
    console.log(`\n📊 Recovery Summary:`);
    console.log(`✅ Successfully recovered: ${successCount} orders`);
    console.log(`❌ Failed to recover: ${failureCount} orders`);
    console.log(`📱 Total messages processed: ${messages.length}`);
    
  } catch (error) {
    console.error('💥 Fatal error during recovery:', error);
    process.exit(1);
  }
}

// Run the recovery process
if (require.main === module) {
  recoverOrders().then(() => {
    console.log('🎉 Order recovery completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Recovery failed:', error);
    process.exit(1);
  });
}

module.exports = {
  setupWAHA,
  fetchRecentMessages,
  parseOrderFromMessage,
  insertOrder,
  recoverOrders
};
