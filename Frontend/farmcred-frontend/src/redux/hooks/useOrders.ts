import { useAppDispatch, useAppSelector } from '../store';
import { 
  setLoading,
  setError,
  setOrders,
  addOrder,
  updateOrder,
  setSelectedOrder,
  setFilters,
  clearFilters,
  removeOrder
} from '../features/ordersSlice';
import { Order } from '@/lib/types/marketplacetypes';

export const useOrders = () => {
  const dispatch = useAppDispatch();
  const {
    orders,
    loading,
    error,
    selectedOrder,
    filters,
  } = useAppSelector((state) => state.orders);

  const setOrdersData = (ordersData: Order[]) => {
    dispatch(setOrders(ordersData));
  };

  const setLoadingState = (isLoading: boolean) => {
    dispatch(setLoading(isLoading));
  };

  const setErrorState = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const addNewOrder = (order: Order) => {
    dispatch(addOrder(order));
  };

  const updateOrderData = (order: Order) => {
    dispatch(updateOrder(order));
  };

  const selectOrder = (order: Order | null) => {
    dispatch(setSelectedOrder(order));
  };

  const updateFilters = (newFilters: { status?: string; dateFrom?: string; dateTo?: string }) => {
    dispatch(setFilters(newFilters));
  };

  const resetFilters = () => {
    dispatch(clearFilters());
  };

  const removeOrderData = (orderId: number) => {
    dispatch(removeOrder(orderId));
  };

  // Filter orders based on current filters
  const filteredOrders = orders.filter(order => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.dateFrom && new Date(order.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(order.created_at) > new Date(filters.dateTo)) return false;
    return true;
  });

  // Get orders by status
  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status);
  };

  // Get order statistics
  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending_payment').length,
    active: orders.filter(o => ['paid_to_escrow', 'farmer_confirmed_delivery'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    disputed: orders.filter(o => o.status === 'dispute').length,
  };

  return {
    // Data
    orders,
    filteredOrders,
    loading,
    error,
    selectedOrder,
    filters,
    orderStats,
    
    // Actions
    setOrdersData,
    setLoadingState,
    setErrorState,
    addNewOrder,
    updateOrderData,
    selectOrder,
    updateFilters,
    resetFilters,
    removeOrderData,
    getOrdersByStatus,
  };
};
