import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { FiHome, FiPlus, FiMinus, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

// Components
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Checkout | ชำระเงิน',
  description: 'Complete your order at Coconut Beach Restaurant',
};

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="bg-white py-4 px-4 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-gray-500">Checkout</h1>
          <h2 className="text-3xl font-bold">Coconut Beach</h2>
          <Link href="/" className="absolute top-5 right-4">
            <FiHome size={24} />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        <Suspense fallback={<CheckoutSkeleton />}>
          {/* Customer Information Form */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">
              Customer <span className="text-red-500">*</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block mb-1 font-medium">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="whatsapp" className="block mb-1 font-medium">
                  WhatsApp number
                </label>
                <div className="flex">
                  <div className="relative">
                    <select
                      className="appearance-none bg-white border border-gray-300 rounded-l-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 pr-8"
                      defaultValue="+66"
                    >
                      <option value="+66">+66</option>
                      <option value="+61">+61</option>
                      <option value="+1">+1</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                  <input
                    type="tel"
                    id="whatsapp"
                    className="flex-1 px-4 py-3 rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="812345678"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Items</h3>
            
            <button className="w-full border border-gray-300 rounded-lg py-3 px-4 text-left mb-4 flex items-center">
              <FiPlus className="mr-2" /> Add item
            </button>
            
            {/* Sample Item - This will be replaced with dynamic content */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex items-start">
                <Image
                  src="/images/placeholder-water.png"
                  alt="Water"
                  width={60}
                  height={60}
                  className="rounded-md object-cover mr-3"
                />
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium">Water</h4>
                    <button className="text-gray-400" aria-label="Remove item">
                      <FiX size={18} />
                    </button>
                  </div>
                  
                  <p className="text-lg font-medium">฿20.00</p>
                  
                  <div className="flex items-center mt-2">
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-l-md border border-gray-300 text-gray-600"
                      aria-label="Decrease quantity"
                    >
                      <FiMinus size={16} />
                    </button>
                    <div className="w-10 h-8 flex items-center justify-center border-t border-b border-gray-300">
                      1
                    </div>
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-r-md border border-gray-300 text-gray-600"
                      aria-label="Increase quantity"
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Number Section */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">
              Table # (above QR code) <span className="text-red-500">*</span>
            </h3>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your answer"
              required
            />
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Items (1)</span>
                <span>฿20.00</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 flex justify-between text-gray-500">
                <span>Others</span>
                <span>฿0.00</span>
              </div>
              
              <div className="flex justify-between text-gray-500">
                <span>Service</span>
                <span>฿0.00</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span>Subtotal</span>
                <span>฿20.00</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>฿20.00</span>
              </div>
            </div>
          </div>
        </Suspense>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 safe-bottom">
        <button 
          className="w-full bg-black text-white py-4 rounded-lg font-medium text-lg"
          onClick={() => window.location.href = '/checkout/whatsapp'}
        >
          Place order
        </button>
      </div>
    </div>
  );
}

// Loading skeleton
function CheckoutSkeleton() {
  return (
    <div className="space-y-6">
      {/* Customer Info Skeleton */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <Skeleton className="h-7 w-32 mb-4" />
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
      
      {/* Items Skeleton */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <Skeleton className="h-7 w-24 mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <div className="flex items-start mb-4">
          <Skeleton className="h-16 w-16 rounded-md mr-3" />
          <div className="flex-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-6 w-16 mb-3" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </div>
      
      {/* Table Number Skeleton */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <Skeleton className="h-7 w-48 mb-4" />
        <Skeleton className="h-12 w-full" />
      </div>
      
      {/* Order Summary Skeleton */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        <Skeleton className="h-7 w-36 mb-4" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="pt-3">
            <Skeleton className="h-5 w-full" />
          </div>
          <Skeleton className="h-5 w-full" />
          <div className="pt-3">
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="pt-3">
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
