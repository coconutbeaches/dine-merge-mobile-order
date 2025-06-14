
import { useCartContext } from '@/context/CartContext';

export function useAppCart() {
  const { cart, addToCart, removeFromCart, updateCartItemQuantity, cartTotal } = useCartContext();

  return {
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    cartTotal,
  };
}
