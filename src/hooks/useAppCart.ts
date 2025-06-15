
import { useCartContext } from '@/context/CartContext';

export function useAppCart() {
  const { cart, addToCart, removeFromCart, updateCartItemQuantity, cartTotal, clearCart } = useCartContext();

  return {
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    cartTotal,
    clearCart,
  };
}
