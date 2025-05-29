import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { FiPlus, FiSearch, FiSliders, FiDownload, FiList } from 'react-icons/fi';
import { notFound } from 'next/navigation';

// Components
import { Skeleton } from '@/components/ui/skeleton';
import AdminHeader from '@/components/admin/admin-header';
import AdminProtected from '@/components/admin/admin-protected';
import { getOrders } from '@/lib/api/orders';

export const metadata: Metadata = {
  title: 'Orders | Admin Dashboard',
  description: 'Manage restaurant orders',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const status = typeof searchParams.status === 'string' ? searchParams.status : 'all';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
  
  return (
    <AdminProtected>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <AdminHeader />
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow">
            {/* Orders Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">Orders</h1>
                <button className="ml-2 text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Help</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 17.5C14.1421 17.5 17.5 14.1421 17.5 10C17.5 5.85786 14.1421 2.5 10 2.5C5.85786 2.5 2.5 5.85786 2.5 10C2.5 14.1421 5.85786 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11.25V10C11.0355 10 11.875 9.16055 11.875 8.125C11.875 7.08945 11.0355 6.25 10 6.25C8.96447 6.25 8.125 7.08945 8.125 8.125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.99707 13.75H10.0046" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <Link 
                href="/admin/orders/create" 
                className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
              >
                <FiPlus className="mr-1" size={16} />
                Create order
              </Link>
            </div>
            
            {/* Filter Tabs */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/orders?status=all"
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    status === 'all' || !status
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </Link>
                <Link
                  href="/admin/orders?status=unpaid"
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    status === 'unpaid'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unpaid
                </Link>
                <Link
                  href="/admin/orders?status=confirming"
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    status === 'confirming'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Confirming payment
                </Link>
                <Link
                  href="/admin/orders?status=paid"
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    status === 'paid'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Paid
                </Link>
              </div>
            </div>
            
            {/* Search and Controls */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Search by customer, product, order number"
                    defaultValue={search}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                    <FiSliders className="mr-1" size={16} />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                      <path d="M2 4.66667H14M4.66667 8H11.3333M6.66667 11.3333H9.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
                      <path d="M8 3.33334V12.6667M8 3.33334L4.66667 6.66667M8 3.33334L11.3333 6.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                    <FiDownload className="mr-1" size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                    <FiList className="mr-1" size={16} />
                    <span className="hidden sm:inline">Summary</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Orders List */}
            <Suspense fallback={<OrdersListSkeleton />}>
              <OrdersList status={status} search={search} page={page} />
            </Suspense>
          </div>
        </main>
      </div>
    </AdminProtected>
  );
}

async function OrdersList({ 
  status, 
  search,
  page 
}: { 
  status: string;
  search: string;
  page: number;
}) {
  // Fetch orders based on filters
  const { orders, totalOrders, totalPages } = await getOrders({
    status,
    search,
    page,
    limit: 20,
  });

  if (!orders || orders.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">No orders found</p>
        <Link 
          href="/admin/orders/create" 
          className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
        >
          <FiPlus className="mr-1" size={16} />
          Create order
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-gray-900">
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`} className="text-sm text-gray-900">
                    {order.customerName}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-gray-900">
                    ฿{order.total.toFixed(2)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`} className="flex flex-col gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.paymentStatus === 'UNPAID' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link href={`/admin/orders/${order.id}`} className="flex flex-col">
                    <span>{new Date(order.createdAt).toLocaleDateString('th-TH')}</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString('th-TH')}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <Link
              href={`/admin/orders?status=${status}&search=${search}&page=${page > 1 ? page - 1 : 1}`}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/admin/orders?status=${status}&search=${search}&page=${page < totalPages ? page + 1 : totalPages}`}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next
            </Link>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 20, totalOrders)}</span> of{' '}
                <span className="font-medium">{totalOrders}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Link
                  href={`/admin/orders?status=${status}&search=${search}&page=${page > 1 ? page - 1 : 1}`}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                    page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Link
                      key={i}
                      href={`/admin/orders?status=${status}&search=${search}&page=${pageNum}`}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pageNum
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
                
                <Link
                  href={`/admin/orders?status=${status}&search=${search}&page=${page < totalPages ? page + 1 : totalPages}`}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                    page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersListSkeleton() {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-4 w-4 rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-16" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-32" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Skeleton className="h-5 w-20" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
