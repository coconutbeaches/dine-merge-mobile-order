import React, { memo } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  image_url?: string | null;
  price?: number;
  category_id?: string | null;
}

interface MenuItemCardProps {
  product: Product;
}

const MenuItemCard = memo(({ product }: MenuItemCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/menu/item/${product.id}`);
  };

  return (
    <div
      className="food-card cursor-pointer"
      onClick={handleClick}
    >
      <div className="menu-item-image">
        <img 
          src={product.image_url || '/placeholder.svg'} 
          alt={product.name} 
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <h3 className="menu-item-name">{product.name}</h3>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
