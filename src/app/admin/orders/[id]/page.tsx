"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminHeader from '@/components/admin/admin-header';
import { formatThaiCurrency } from '@/lib/utils/format-thai-currency';
import { formatDate } from '@/lib/utils/format-date';
import { Skeleton } from '@/components/ui/skeleton';
import OrderStatusDropdown from '@/components/admin/order-status-dropdown';
import MarkAsPaidButton from '@/components/admin/mark-as-paid-button';
import type { OrderStatus as PrismaOrderStatus, Customer as PrismaCustomer, OrderItem as PrismaOrderItemBase, MenuItem as PrismaMenuItemBase } from '@prisma/client'; // Import base Prisma types

// Define types locally for this component based on expected API response
// These should match the structure of OrderWithDetails from the backend API

interface MenuItemForOrder {
  id: string;
  name: string;
  image?: string | null;
  price: number; // Price of the menu item itself
  // Add other menu item fields if needed for display
}

interface EnrichedOrderItem extends Omit<PrismaOrderItemBase, 'menuItemId' | 'orderId'> {
  // menuItemId and orderId are still present from PrismaOrderItemBase
  menuItemId: string;
  orderId: string;
  menuItem: MenuItemForOrder | null; 
}

interface OrderWithDetails {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  status: PrismaOrderStatus;
  isPaid: boolean;
  createdAt: string | Date; // API might return string, convert to Date if needed
  updatedAt: string | Date;
  items: EnrichedOrderItem[];
  customer?: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  tableNumber?: number | null;
  isTakeAway: boolean;
  notes?: string | null;
  whatsappMessageGenerated: boolean;
}


export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch order details: ${response.status}`);
      }
      const fetchedOrder: OrderWithDetails = await response.json();
      setOrder({
        ...fetchedOrder,
        createdAt: new Date(fetchedOrder.createdAt),
        updatedAt: new Date(fetchedOrder.updatedAt),
      });
    } catch (err) {
      console.error("Error fetching order details:", err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching order details.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleStatusChange = async (newStatus: PrismaOrderStatus) => {
    if (!order) return;
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }
      const updatedOrder: OrderWithDetails = await response.json();
      setOrder({
        ...updatedOrder,
        createdAt: new Date(updatedOrder.createdAt),
        updatedAt: new Date(updatedOrder.updatedAt),
      });
      // Consider adding a success toast notification here
    } catch (err) {
      console.error("Error updating order status:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status.';
      setError(errorMessage); // Display error to user
      // Consider adding an error toast notification here
    }
  };

  const handlePaymentStatusChange = async (isPaid: boolean) => {
    if (!order) return;
    try {
      const response = await fetch(`/api/orders/${order.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment status');
      }
      const updatedOrder: OrderWithDetails = await response.json();
      setOrder({
        ...updatedOrder,
        createdAt: new Date(updatedOrder.createdAt),
        updatedAt: new Date(updatedOrder.updatedAt),
      });
      // Consider adding a success toast notification here
    } catch (err) {
      console.error("Error updating payment status:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment status.';
      setError(errorMessage);
      // Consider adding an error toast notification here
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminHeader title={`Order Details`} backLink="/admin/orders" />
        <div className="p-4 md:p-8">
          <Skeleton className="h-12 w-3/4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
              <Skeleton className="h-8 w-1/2 mb-4" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center border-b py-3">
                  <Skeleton className="w-16 h-16 rounded-md mr-4" />
                  <div className="flex-grow">
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-1/4" />
                </div>
              ))}
              <Skeleton className="h-8 w-1/3 mt-4 ml-auto" />
            </div>
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-5 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminHeader title="Order Error" backLink="/admin/orders" />
        <div className="p-4 md:p-8 text-center text-red-600">
          <p className="text-xl">{error}</p>
          <button 
            onClick={fetchOrderDetails} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminHeader title="Order Not Found" backLink="/admin/orders" />
        <div className="p-4 md:p-8 text-center text-gray-500">
          <p className="text-xl">Order not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader title={`Order #${order.id.substring(0, 8)}`} backLink="/admin/orders" />
      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Items Section */}
          <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Items</h2>
            <ul className="divide-y divide-gray-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center py-4">
                  <div className="flex-shrink-0 mr-4">
                    <Image
                      src={item.menuItem?.image || '/logo-placeholder.png'} // Accessing item.menuItem.image
                      alt={item.name}
                      width={60}
                      height={60}
                      className="rounded-md object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-lg font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x {formatThaiCurrency(item.price)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatThaiCurrency(item.quantity * item.price)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t text-right">
              <p className="text-2xl font-bold">Total: {formatThaiCurrency(order.total)}</p>
            </div>
          </div>

          {/* Order Details & Actions Section */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Customer Details</h3>
              <p><strong>Name:</strong> {order.customerName || order.customer?.name || 'N/A'}</p>
              <p><strong>Phone:</strong> {order.customerPhone || order.customer?.phone || 'N/A'}</p>
              <p><strong>Table/Take Away:</strong> {order.isTakeAway ? 'Take Away' : `Table ${order.tableNumber || 'N/A'}`}</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Order Info</h3>
              <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
              <p><strong>Last Updated:</strong> {formatDate(order.updatedAt)}</p>
              <p><strong>WhatsApp Sent:</strong> {order.whatsappMessageGenerated ? 'Yes' : 'No'}</p>
            </div>
            
            {order.notes && (
              <div>
                <h3 className="text-xl font-semibold mb-1">Notes:</h3>
                <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">{order.notes}</p>
              </div>
            )}

            <div>
              <h3 className="text-xl font-semibold mb-2">Status</h3>
              <OrderStatusDropdown
                currentStatus={order.status}
                onStatusChange={handleStatusChange}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Payment</h3>
              <MarkAsPaidButton
                isPaid={order.isPaid}
                onPaymentChange={handlePaymentStatusChange}
              />
            </div>
             {/* Future actions like "Add Notes" or "Delete Order" can be added here */}
          </div>
        </div>
      </div>
    </div>
  );
}
