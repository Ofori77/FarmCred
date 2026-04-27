import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CartItem } from "@/lib/types/marketplacetypes";

interface CartState {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

// Load cart from localStorage if available
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window !== 'undefined') {
    try {
      const cartData = localStorage.getItem('farmcred-cart');
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return [];
    }
  }
  return [];
};

// Save cart to localStorage
const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('farmcred-cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }
};

const initialItems = loadCartFromStorage();
const initialTotals = calculateTotals(initialItems);

const initialState: CartState = {
  items: initialItems,
  totalAmount: initialTotals.totalAmount,
  totalItems: initialTotals.totalItems,
};

// Helper function to calculate totals
function calculateTotals(items: CartItem[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return { totalItems, totalAmount };
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        // If item exists, increase quantity up to max available
        existingItem.quantity = Math.min(
          existingItem.quantity + 1, 
          existingItem.max_quantity
        );
      } else {
        // Add new item with quantity 1
        state.items.push({ ...action.payload, quantity: 1 });
      }
      
      const totals = calculateTotals(state.items);
      state.totalAmount = totals.totalAmount;
      state.totalItems = totals.totalItems;
      
      // Save to localStorage
      saveCartToStorage(state.items);
    },

    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      
      const totals = calculateTotals(state.items);
      state.totalAmount = totals.totalAmount;
      state.totalItems = totals.totalItems;
      
      // Save to localStorage
      saveCartToStorage(state.items);
    },

    updateQuantity: (state, action: PayloadAction<{ id: number; delta: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      
      if (item) {
        item.quantity = Math.max(
          1, 
          Math.min(item.quantity + action.payload.delta, item.max_quantity)
        );
        
        const totals = calculateTotals(state.items);
        state.totalAmount = totals.totalAmount;
        state.totalItems = totals.totalItems;
        
        // Save to localStorage
        saveCartToStorage(state.items);
      }
    },

    updateDeliveryDate: (state, action: PayloadAction<{ id: number; date: string }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.delivery_date = action.payload.date;
        // Save to localStorage
        saveCartToStorage(state.items);
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.totalItems = 0;
      
      // Save to localStorage
      saveCartToStorage(state.items);
    },

    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      const totals = calculateTotals(state.items);
      state.totalAmount = totals.totalAmount;
      state.totalItems = totals.totalItems;
      
      // Save to localStorage
      saveCartToStorage(state.items);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateDeliveryDate,
  clearCart,
  setCartItems,
} = cartSlice.actions;

export default cartSlice.reducer;
