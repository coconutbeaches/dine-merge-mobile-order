// src/lib/api/orders.ts
export {
  updateOrderPaymentStatus,
  updateOrderStatus,
  addOrderNotes,
  markOrderAsWhatsappSent,
  deleteOrder,
  createOrder, // This was placeOrderInSupabase
  getAllOrdersForAdmin,
  fetchUserOrders, // This was not in the original list but is a key order function
  getFilteredOrderHistory // This was not in the original list but is a key order function
} from '../../../services/orderService'; // Adjust path as needed
