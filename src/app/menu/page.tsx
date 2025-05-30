import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FiShoppingBag, FiMenu, FiSearch } from 'react-icons/fi';

// Components
import CartButton from '@/components/cart/cart-button';
import MenuItemCard from '@/components/menu/menu-item-card';
import CategoryHeader from '@/components/menu/category-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/lib/api/categories';
import { getMenuItems } from '@/lib/api/menu-items';

export const metadata: Metadata = {
  title: 'Menu | เมนู',
  description: 'Browse our restaurant menu with delicious Thai food and drinks',
};

export const revalidate = 3600; // Revalidate this page every hour

export default async function MenuPage() {
  // Fetch categories and menu items
  const categoriesPromise = getCategories();
  const menuItemsPromise = getMenuItems();
  
  const [categories, menuItems] = await Promise.all([
    categoriesPromise,
    menuItemsPromise,
  ]);

  if (!categories || !menuItems) {
    notFound();
  }

  // Group menu items by category
  const menuItemsByCategory = categories.map(category => {
    const items = menuItems.filter(item => item.categoryId === category.id);
    return {
      ...category,
      items,
    };
  }).filter(category => category.items.length > 0);

  return (
    <div className="pb-24">
      {/* Header with logo and navigation */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2" aria-label="Menu">
            <FiMenu size={24} />
          </button>
          
          <Link href="/" className="flex items-center justify-center">
            <Image 
              src="/images/logo.png" 
              alt="Coconut Beach" 
              width={48} 
              height={48} 
              className="rounded-full"
              priority
            />
          </Link>
          
          <div className="flex items-center gap-3">
            <button className="p-2" aria-label="Search">
              <FiSearch size={22} />
            </button>
            <Link href="/cart" className="p-2 relative" aria-label="Cart">
              <FiShoppingBag size={22} />
              <CartButton clientOnly />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 pt-4">
        <Suspense fallback={<MenuSkeleton />}>
          {menuItemsByCategory.map((category) => (
            <section key={category.id} className="mb-8">
              <CategoryHeader name={category.name} />
              
              <div className="grid grid-cols-2 gap-4">
                {category.items.map((item) => (
                  <MenuItemCard 
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    price={item.price}
                    image={item.image || '/images/placeholder.png'}
                  />
                ))}
              </div>
            </section>
          ))}
        </Suspense>
      </main>

      {/* Cart button (fixed at bottom) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
        <CartButton showTotal clientOnly />
      </div>
    </div>
  );
}

// Loading skeleton
function MenuSkeleton() {
  return (
    <>
      {[1, 2, 3].map((category) => (
        <section key={category} className="mb-8">
          <Skeleton className="h-10 w-full max-w-[180px] bg-gray-200 rounded-lg mb-4" />
          
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex flex-col">
                <Skeleton className="aspect-square w-full rounded-lg mb-2" />
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
