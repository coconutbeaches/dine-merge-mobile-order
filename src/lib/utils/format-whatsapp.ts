/**
 * Formats order data into a WhatsApp message for restaurant staff
 * 
 * Creates a structured message with emojis for better readability
 * Includes customer details, order items, and total
 * 
 * @param orderData - The order data to format
 * @returns Formatted WhatsApp message string
 */

// Type definitions for order data
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  customerName: string;
  customerPhone: string;
  tableNumber?: number | string;
  items: OrderItem[];
  total: number;
  isTakeAway?: boolean;
}

/**
 * Formats order data into a WhatsApp message
 */
export function formatWhatsAppMessage(orderData: OrderData | null): string {
  // Handle null or empty order data
  if (!orderData || !orderData.items || orderData.items.length === 0) {
    return "🍽️ No order details available";
  }

  const {
    customerName,
    customerPhone,
    tableNumber,
    items,
    total,
    isTakeAway = false
  } = orderData;

  // Format date and time in Thai locale
  const now = new Date();
  const dateTimeFormatted = now.toLocaleString('th-TH', { 
    timeZone: 'Asia/Bangkok',
    hour12: false
  });

  // Format table information
  const tableInfo = isTakeAway || !tableNumber 
    ? '📦 Take Away' 
    : `🪑 Table: ${tableNumber}`;

  // Format items list
  const itemsList = items
    .map(item => `- ${item.name} x${item.quantity}`)
    .join('\n');

  // Format total price
  const formattedTotal = `฿${total.toFixed(2)}`;

  // Assemble the complete message
  const message = `🍽️ NEW ORDER
👤 Name: ${customerName}
📱 Phone: ${customerPhone}
${tableInfo}
📋 Order:
${itemsList}
💰 Total: ${formattedTotal}
⏰ ${dateTimeFormatted}`;

  return message;
}

/**
 * Generates a WhatsApp deep link with pre-filled message
 * 
 * @param phoneNumber - Restaurant WhatsApp number (without + symbol)
 * @param message - Formatted message to send
 * @returns WhatsApp deep link URL
 */
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  // Remove any '+' symbols or spaces from the phone number
  const formattedPhone = phoneNumber.replace(/[\+\s]/g, '');
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Generate the WhatsApp deep link
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}
