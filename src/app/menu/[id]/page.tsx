"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { addItem } from "@/store/cart-slice";
import { getMenuItemById } from "@/lib/api/menu-items";
import { formatThaiCurrency } from "@/lib/utils/format-thai-currency";
import { QuantitySelector } from "@/components/ui/quantity-selector"; // Changed from default to named import
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function MenuItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const menuItemId = params.id as string;
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const [menuItem, setMenuItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchMenuItem() {
      setLoading(true);
      const item = await getMenuItemById(menuItemId);
      setMenuItem(item);
      setLoading(false);
    }
    fetchMenuItem();
  }, [menuItemId]);

  const handleAddToCart = () => {
    if (menuItem) {
      dispatch(
        addItem({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          image: menuItem.image,
        })
      );
      router.push("/menu"); // Navigate back to the menu after adding
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton className="w-full h-64 rounded-lg mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!menuItem) {
    return <div className="p-4 text-center">Menu item not found.</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="relative w-full h-64 rounded-lg overflow-hidden mb-4">
        <Image
          src={menuItem.image || "/placeholder.png"}
          alt={menuItem.name}
          layout="fill"
          objectFit="cover"
          className="rounded-lg"
        />
      </div>
      <h1 className="text-3xl font-bold mb-2">{menuItem.name}</h1>
      <p className="text-2xl text-gray-700 mb-4">
        {formatThaiCurrency(menuItem.price)}
      </p>
      {menuItem.description && (
        <p className="text-gray-600 mb-6">{menuItem.description}</p>
      )}

      <div className="flex items-center justify-between mb-6">
        <span className="text-lg font-medium">Quantity:</span>
        <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
      </div>

      <button
        onClick={handleAddToCart}
        className="w-full bg-black text-white py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors duration-200"
      >
        Add to Cart
      </button>
    </div>
  );
}
