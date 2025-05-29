import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { FiX, FiArrowLeft, FiPlus } from 'react-icons/fi';

// Components
import QuantitySelector from '@/components/ui/quantity-selector';
import RecommendedItems from '@/components/cart/recommended-items';
import { Skeleton } from '@/components/ui/skeleton';
import { getRecommendedItems } from '@/lib/api/recommendations';

export const metadata: Metadata = {
  title: 'Cart | ตะกร้า',
  description: 'Your shopping cart at Coconut Beach Restaurant',
};

export default async function CartPage() {
  // Fetch recommended items for "People also bought" section
  const recommendedItems = await getRecommendedItems(4);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/menu" className="p-2" aria-label="Back to menu">
            <FiArrowLeft size={24} />
          </Link>
          
          <h1 className="text-xl font-semibold">Cart</h1>
          
          <div className="w-10"></div> {/* Empty div for spacing */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pt-4">
        <Suspense fallback={<CartSkeleton />}>
          {/* Cart items - client component will populate this */}
          <div className="cart-items-container" id="cart-items">
            <CartItemsClient />
          </div>

          {/* People also bought section */}
          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">People also bought</h2>
            <RecommendedItems items={recommendedItems} />
          </div>
        </Suspense>
      </main>

      {/* Checkout button (fixed at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
        <CheckoutButtonClient />
      </div>
    </div>
  );
}

// Client components (will be implemented in separate files)
function CartItemsClient() {
  return (
    <div className="cart-items-placeholder">
      {/* This will be replaced by the actual cart items on the client */}
      <div className="cart-item flex items-center py-4 border-b border-gray-200">
        <div className="flex-shrink-0 mr-4">
          <Image
            src="/images/placeholder-water.png"
            alt="Water"
            width={80}
            height={80}
            className="rounded-md object-cover"
          />
        </div>
        
        <div className="flex-grow">
          <h3 className="font-medium">Water</h3>
          <p className="text-lg font-medium">฿20.00</p>
          
          <div className="mt-2">
            <div className="inline-flex items-center border border-gray-300 rounded-md">
              <button className="px-3 py-1 text-gray-500">−</button>
              <span className="px-3 py-1 border-x border-gray-300">1</span>
              <button className="px-3 py-1 text-gray-500">+</button>
            </div>
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600" aria-label="Remove">
          <FiX size={20} />
        </button>
      </div>

      {/* Empty cart message (will be conditionally shown) */}
      <div className="hidden empty-cart-message py-8 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Link 
          href="/menu" 
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg"
        >
          <FiPlus className="mr-2" />
          Add items
        </Link>
      </div>
    </div>
  );
}

function CheckoutButtonClient() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">1</span>
          <span className="font-medium">Checkout</span>
        </div>
        <div className="font-semibold text-lg">฿20.00</div>
      </div>
      
      <Link 
        href="/checkout"
        className="bg-black text-white py-3 px-6 rounded-full font-medium"
      >
        Checkout
      </Link>
    </div>
  );
}

// Loading skeleton
function CartSkeleton() {
  return (
    <div>
      {[1, 2].map((item) => (
        <div key={item} className="flex items-center py-4 border-b border-gray-200">
          <Skeleton className="w-20 h-20 rounded-md mr-4" />
          <div className="flex-grow">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-6 w-16 mb-3" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
      
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((item) => (
            <div key={item} className="flex flex-col">
              <Skeleton className="aspect-square w-full rounded-lg mb-2" />
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
