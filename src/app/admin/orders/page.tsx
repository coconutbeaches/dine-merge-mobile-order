"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// Removed: import { getAllOrdersForAdmin, OrderWithItems } from '@/lib/api/orders';
import AdminHeader from '@/components/admin/admin-header';
import { formatThaiCurrency } from '@/lib/utils/format-thai-currency';
import { formatDate } from '@/lib/utils/format-date';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrderStatus, Customer as PrismaCustomer, OrderItem as PrismaOrderItem, MenuItem as PrismaMenuItem } from '@prisma/client';

// Define types locally for this component based on expected API response
// This mirrors the structure of OrderWithDetails from the backend
interface MenuItemForOrder {
  id: string;
  name: string;
  image?: string | null;
  // Add other menu item fields if needed for display
}

interface EnrichedOrderItem extends PrismaOrderItem {
  menuItem: MenuItemForOrder | null; 
}

interface OrderWithDetails {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  status: OrderStatus;
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


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/orders'); // Fetch from API endpoint
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch orders: ${response.status}`);
        }
        const fetchedOrders: OrderWithDetails[] = await response.json();
        
        // Convert date strings to Date objects if necessary
        const processedOrders = fetchedOrders.map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
        }));
        setOrders(processedOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching orders.';
        setError(errorMessage);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // const handleOrderCreated = (newOrder: OrderWithDetails) => {
  //   setOrders(prevOrders => [newOrder, ...prevOrders]);
  //   setIsCreateModalOpen(false);
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminHeader title="Manage Orders" />
        <div className="p-4 md:p-8">
          <div className="mb-6 flex justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="bg-white shadow rounded-lg">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-1" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AdminHeader title="Manage Orders" />
        <div className="p-4 md:p-8 text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader title="Manage Orders">
        {/* <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Create New Order
        </button> */}
      </AdminHeader>
      
      <div className="p-4 md:p-8">
        {/* Placeholder for filters and search if needed in the future */}
        {/* <div className="mb-6 p-4 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Filters & Search</h2>
          // Add filter components here
        </div> */}

        <div className="bg-white shadow overflow-hidden rounded-lg">
          <ul className="divide-y divide-gray-200">
            {orders.length === 0 && !loading && (
              <li className="p-6 text-center text-gray-500">No orders found.</li>
            )}
            {orders.map((order) => (
              <li key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <Link href={`/admin/orders/${order.id}`} className="block">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0">
                      <p className="text-lg font-semibold text-blue-600 hover:underline">
                        Order #{order.id.substring(0, 8)}
                      </p>
                      <p className="text-sm text-gray-700">
                        Customer: {order.customerName || order.customer?.name || 'N/A'} ({order.customerPhone || order.customer?.phone || 'N/A'})
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 mb-2 sm:mb-0 sm:text-right">
                      <p>Date: {formatDate(order.createdAt)}</p>
                      <p>Total: {formatThaiCurrency(order.total)}</p>
                    </div>
                    <div className="sm:text-right">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${order.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' : ''}
                          ${order.status === 'READY_FOR_PICKUP' ? 'bg-green-100 text-green-800' : ''}
                          ${order.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' : ''}
                          ${order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                        `}
                      >
                        {order.status}
                      </span>
                      {order.isPaid && (
                        <span className="ml-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* {isCreateModalOpen && (
        <AdminOrderCreator
          onClose={() => setIsCreateModalOpen(false)}
          onOrderCreated={handleOrderCreated}
        />
      )} */}
    </div>
  );
}
