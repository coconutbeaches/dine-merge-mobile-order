import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { FiArrowLeft, FiShare2 } from 'react-icons/fi';

// Components
import AddToCartButton from '@/components/cart/add-to-cart-button';
import QuantitySelector from '@/components/ui/quantity-selector';
import { getMenuItem } from '@/lib/api/menu-items';

// Types
type MenuItemPageProps = {
  params: {
    id: string;
  };
};

// Generate metadata for the page
export async function generateMetadata({ params }: MenuItemPageProps): Promise<Metadata> {
  const menuItem = await getMenuItem(params.id);

  if (!menuItem) {
    return {
      title: 'Item Not Found',
    };
  }

  return {
    title: `${menuItem.name} | ${menuItem.price} ฿`,
    description: menuItem.description || `Order ${menuItem.name} from Coconut Beach Restaurant`,
    openGraph: {
      images: [
        {
          url: menuItem.image || '/images/placeholder.png',
          width: 1200,
          height: 630,
          alt: menuItem.name,
        },
      ],
    },
  };
}

export default async function MenuItemPage({ params }: MenuItemPageProps) {
  const menuItem = await getMenuItem(params.id);

  if (!menuItem) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/menu" className="p-2" aria-label="Back to menu">
            <FiArrowLeft size={24} />
          </Link>
          
          <button className="p-2" aria-label="Share">
            <FiShare2 size={22} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4">
        {/* Product image */}
        <div className="flex justify-center mb-6 mt-4">
          <Image
            src={menuItem.image || '/images/placeholder.png'}
            alt={menuItem.name}
            width={300}
            height={300}
            className="object-contain max-h-[300px]"
            priority
          />
        </div>

        {/* Product details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{menuItem.name}</h1>
            {menuItem.nameEn && menuItem.nameEn !== menuItem.name && (
              <p className="text-secondary-500 text-sm">{menuItem.nameEn}</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-2">Price</h2>
            <p className="text-2xl font-semibold">฿{menuItem.price.toFixed(2)}</p>
          </div>

          {menuItem.description && (
            <div>
              <h2 className="text-lg font-medium mb-2">Description</h2>
              <p className="text-secondary-600">{menuItem.description}</p>
              {menuItem.descriptionEn && menuItem.descriptionEn !== menuItem.description && (
                <p className="text-secondary-500 text-sm mt-1">{menuItem.descriptionEn}</p>
              )}
            </div>
          )}

          {/* Quantity selector */}
          <div>
            <h2 className="text-lg font-medium mb-2">Quantity</h2>
            <QuantitySelector
              id={menuItem.id}
              minValue={1}
              maxValue={99}
              defaultValue={1}
              clientOnly
            />
          </div>
        </div>
      </main>

      {/* Add to cart button (fixed at bottom) */}
      <div className="fixed bottom-6 left-0 right-0 px-4">
        <AddToCartButton
          item={{
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            image: menuItem.image || '/images/placeholder.png',
          }}
          fullWidth
          showPrice
          clientOnly
        />
      </div>
    </div>
  );
}
