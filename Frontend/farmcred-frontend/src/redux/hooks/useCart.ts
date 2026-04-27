import { useAppDispatch, useAppSelector } from '../store';
import { 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  updateDeliveryDate, 
  clearCart,
  setCartItems 
} from '../features/cartSlice';
import { CartItem } from '@/lib/types/marketplacetypes';

export const useCart = () => {
  const dispatch = useAppDispatch();
  const { items, totalAmount, totalItems } = useAppSelector((state) => state.cart);

  const addItem = (item: CartItem) => {
    dispatch(addToCart(item));
  };

  const removeItem = (id: number) => {
    dispatch(removeFromCart(id));
  };

  const updateItemQuantity = (id: number, delta: number) => {
    dispatch(updateQuantity({ id, delta }));
  };

  const updateItemDeliveryDate = (id: number, date: string) => {
    dispatch(updateDeliveryDate({ id, date }));
  };

  const clear = () => {
    dispatch(clearCart());
  };

  const isInCart = (id: number) => {
    return items.some(item => item.id === id);
  };

  const getItem = (id: number) => {
    return items.find(item => item.id === id);
  };

  const setItems = (cartItems: CartItem[]) => {
    dispatch(setCartItems(cartItems));
  };

  return {
    items,
    totalAmount,
    totalItems,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemDeliveryDate,
    clear,
    isInCart,
    getItem,
    setItems,
  };
};
