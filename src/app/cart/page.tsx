"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  removeItem,
  updateQuantity,
  clearCart,
} from "@/store/cart-slice";
import { QuantitySelector } from "@/components/ui/quantity-selector"; // Changed from default to named import
import RecommendedItems from "@/components/cart/recommended-items";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecommendedItems } from "@/lib/api/recommendations";
import { formatThaiCurrency } from "@/lib/utils/format-thai-currency";
import Link from "next/link";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const totalItems = useAppSelector((state) => state.cart.totalItems);
  const totalPrice = useAppSelector((state) => state.cart.totalPrice);

  const [recommendedItems, setRecommendedItems] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoadingRecommendations(true);
      const items = await getRecommendedItems();
      setRecommendedItems(items);
      setLoadingRecommendations(false);
    }
    fetchRecommendations();
  }, []);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    dispatch(updateQuantity({ id, quantity }));
  };

  const handleRemoveItem = (id: string) => {
    dispatch(removeItem(id));
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center text-gray-500">
          <p className="mb-4">Your cart is empty.</p>
          <Link href="/menu" className="text-blue-600 hover:underline">
            Go to Menu
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center border-b pb-4 last:border-b-0"
              >
                <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden mr-4">
                  <Image
                    src={item.image || "/placeholder.png"}
                    alt={item.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p className="text-gray-600">
                    {formatThaiCurrency(item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(q) => handleUpdateQuantity(item.id, q)}
                      min={1}
                    />
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="font-semibold ml-4 flex-shrink-0">
                  {formatThaiCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-6 text-right">
            <p className="text-xl font-bold">
              Total: {formatThaiCurrency(totalPrice)}
            </p>
            <p className="text-sm text-gray-500">({totalItems} items)</p>
          </div>

          <div className="flex justify-between space-x-4 mb-8">
            <button
              onClick={handleClearCart}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              Clear Cart
            </button>
            <Link
              href="/checkout"
              className="flex-1 bg-black text-white py-3 rounded-lg text-center font-semibold hover:bg-gray-800 transition-colors duration-200"
            >
              Checkout
            </Link>
          </div>

          <RecommendedItems
            items={recommendedItems}
            loading={loadingRecommendations}
          />
        </>
      )}
    </div>
  );
}
