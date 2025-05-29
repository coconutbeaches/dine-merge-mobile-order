import { Suspense } from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiArrowLeft, FiMoreVertical, FiInfo } from 'react-icons/fi';

// Components
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/admin-header';
import AdminProtected from '@/components/admin/admin-protected';
import OrderStatusDropdown from '@/components/admin/order-status-dropdown';
import MarkAsPaidButton from '@/components/admin/mark-as-paid-button';
import { getOrderById } from '@/lib/api/orders';
import { formatDate, formatTime } from '@/lib/utils/format-date';

// Types
type OrderDetailPageProps = {
  params: {
    id: string;
  };
};

// Generate metadata for the page
export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  const order = await getOrderById(params.id);

  if (!order) {
    return {
      title: 'Order Not Found',
    };
  }

  return {
    title: `Order #${order.orderNumber} | ${order.customerName}`,
    description: `Order details for #${order.orderNumber}`,
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <AdminProtected>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <AdminHeader />
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetail id={params.id} />
          </Suspense>
        </main>
      </div>
    </AdminProtected>
  );
}

async function OrderDetail({ id }: { id: string }) {
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Order Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Link href="/admin/orders" className="mr-3 text-gray-500 hover:text-gray-700">
            <FiArrowLeft size={20} />
          </Link>
          <div className="flex items-center">
            <h1 className="text-xl font-bold">#{order.orderNumber}</h1>
            <div className="flex items-center ml-3">
              <Link href={`/admin/customers/${order.customerId}`} className="text-sm text-gray-500 hover:text-gray-700">
                {order.customerName}
              </Link>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                {formatDate(order.createdAt)} {formatTime(order.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
          <FiMoreVertical size={20} />
        </button>
      </div>
      
      {/* Order Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Left Column - Order Items */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Items</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    <Image
                      src={item.menuItem?.image || '/images/placeholder.png'}
                      alt={item.name}
                      width={60}
                      height={60}
                      className="rounded-md object-cover"
                    />
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="font-medium">฿{item.price.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <p className="text-gray-500 text-sm">Item #{item.menuItemId}</p>
                    <p className="font-medium mt-1">฿{item.subtotal.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items total ({order.items.length})</span>
                  <span>฿{order.total.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Others</span>
                  <span>฿0.00</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service</span>
                  <span>฿0.00</span>
                </div>
                
                <div className="pt-2 border-t border-gray-200 flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>฿{order.total.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>฿{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Order Details & Status */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Status</h2>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Status
                </label>
                <OrderStatusDropdown 
                  orderId={order.id} 
                  initialStatus={order.status}
                  clientOnly
                />
              </div>
            </div>
          </div>
          
          {/* Payment Status */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Payment</h2>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700">
                    Payment Status
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    order.paymentStatus === 'PAID' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
                
                {order.paymentStatus !== 'PAID' && (
                  <MarkAsPaidButton 
                    orderId={order.id}
                    clientOnly
                  />
                )}
              </div>
              
              <div className="text-sm text-gray-500 flex items-center">
                <FiInfo className="mr-1" size={14} />
                <span>Cash payment only</span>
              </div>
            </div>
          </div>
          
          {/* Customer Information */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Customer</h2>
            </div>
            
            <div className="p-4">
              <div className="mb-3">
                <span className="block text-sm font-medium text-gray-700">
                  Name
                </span>
                <span className="block mt-1">
                  {order.customerName}
                </span>
              </div>
              
              <div className="mb-3">
                <span className="block text-sm font-medium text-gray-700">
                  WhatsApp
                </span>
                <a 
                  href={`https://wa.me/${order.customerPhone.replace(/\+/g, '')}`}
                  className="block mt-1 text-primary-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {order.customerPhone}
                </a>
              </div>
              
              <div>
                <span className="block text-sm font-medium text-gray-700">
                  Table #
                </span>
                <span className="block mt-1">
                  {order.tableNumber || 'Take Away'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Order Details */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Order Details</h2>
            </div>
            
            <div className="p-4">
              <div className="mb-3">
                <span className="block text-sm font-medium text-gray-700">
                  Order ID
                </span>
                <span className="block mt-1 text-sm text-gray-500">
                  {order.id}
                </span>
              </div>
              
              <div className="mb-3">
                <span className="block text-sm font-medium text-gray-700">
                  Order Date
                </span>
                <span className="block mt-1">
                  {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                </span>
              </div>
              
              <div className="mb-3">
                <span className="block text-sm font-medium text-gray-700">
                  WhatsApp Sent
                </span>
                <span className="block mt-1">
                  {order.whatsappSent ? 'Yes' : 'No'}
                </span>
              </div>
              
              {order.notes && (
                <div>
                  <span className="block text-sm font-medium text-gray-700">
                    Notes
                  </span>
                  <span className="block mt-1">
                    {order.notes}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Skeleton className="h-6 w-6 mr-3 rounded" />
          <div className="flex items-center">
            <Skeleton className="h-7 w-20 mr-3" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      
      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Left Column */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-6 w-24" />
            </div>
            
            {/* Items Skeleton */}
            {[1, 2].map((item) => (
              <div key={item} className="p-4 flex items-start border-b border-gray-200">
                <Skeleton className="w-16 h-16 rounded-md mr-4" />
                <div className="flex-grow">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            ))}
            
            {/* Summary Skeleton */}
            <div className="p-4 bg-gray-50">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex justify-between mb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          
          {/* Payment Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-4">
              <div className="flex justify-between mb-4">
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          
          {/* Customer Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="mb-3">
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-5 w-48" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Details Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="p-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="mb-3">
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-5 w-48" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
