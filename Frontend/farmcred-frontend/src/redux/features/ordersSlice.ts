import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Order } from "@/lib/types/marketplacetypes";

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;
  filters: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
  selectedOrder: null,
  filters: {},
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
    },

    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload); // Add to beginning
    },

    updateOrder: (state, action: PayloadAction<Order>) => {
      const index = state.orders.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
      
      // Update selected order if it's the same one
      if (state.selectedOrder?.id === action.payload.id) {
        state.selectedOrder = action.payload;
      }
    },

    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },

    setFilters: (state, action: PayloadAction<{ status?: string; dateFrom?: string; dateTo?: string }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    removeOrder: (state, action: PayloadAction<number>) => {
      state.orders = state.orders.filter(order => order.id !== action.payload);
      
      // Clear selected order if it was removed
      if (state.selectedOrder?.id === action.payload) {
        state.selectedOrder = null;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setOrders,
  addOrder,
  updateOrder,
  setSelectedOrder,
  setFilters,
  clearFilters,
  removeOrder,
} = ordersSlice.actions;

export default ordersSlice.reducer;
