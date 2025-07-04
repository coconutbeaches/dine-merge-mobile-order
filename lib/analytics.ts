/**
 * Analytics utilities for tracking user events and order conversions
 */

// Google Analytics configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID) {
    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    script1.async = true;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_TRACKING_ID}', {
        page_title: document.title,
        page_location: window.location.href,
      });
    `;
    document.head.appendChild(script2);
  }
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_title: title,
      page_location: url,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track order completion
export const trackOrderComplete = (orderData: {
  orderId: string;
  totalAmount: number;
  itemCount: number;
  customerType: 'guest' | 'registered';
  paymentMethod?: string;
}) => {
  const { orderId, totalAmount, itemCount, customerType, paymentMethod } = orderData;

  // Google Analytics Enhanced Ecommerce tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      value: totalAmount,
      currency: 'THB',
      items: [{
        item_id: orderId,
        item_name: 'Order',
        category: 'Food Order',
        quantity: itemCount,
        price: totalAmount,
      }],
      // Custom parameters
      customer_type: customerType,
      payment_method: paymentMethod || 'whatsapp',
    });
  }

  // Track custom conversion event
  trackEvent('order_completed', 'ecommerce', `Order ${orderId}`, totalAmount);
  
  // Track customer type
  trackEvent('customer_type', 'user', customerType);
  
  // Track order value range
  const valueRange = getValueRange(totalAmount);
  trackEvent('order_value_range', 'ecommerce', valueRange);

  // Log to console for debugging
  console.log('Order tracking completed:', {
    orderId,
    totalAmount,
    itemCount,
    customerType,
    paymentMethod,
  });
};

// Track WhatsApp conversion
export const trackWhatsAppSend = (orderId: string, totalAmount: number) => {
  trackEvent('whatsapp_send', 'conversion', `Order ${orderId}`, totalAmount);
  console.log('WhatsApp send tracked:', { orderId, totalAmount });
};

// Track cart actions
export const trackCartAction = (action: 'add_to_cart' | 'remove_from_cart' | 'view_cart', itemName?: string, price?: number) => {
  trackEvent(action, 'cart', itemName, price);
};

// Track menu interactions
export const trackMenuInteraction = (action: 'view_item' | 'view_category', itemName: string, category?: string) => {
  trackEvent(action, 'menu', itemName);
  if (category) {
    trackEvent('category_view', 'menu', category);
  }
};

// Helper function to categorize order values
const getValueRange = (amount: number): string => {
  if (amount < 100) return '0-99';
  if (amount < 250) return '100-249';
  if (amount < 500) return '250-499';
  if (amount < 1000) return '500-999';
  return '1000+';
};

// TypeScript declaration for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
