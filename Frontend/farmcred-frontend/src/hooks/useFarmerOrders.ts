/**
 * Farmer Orders Hooks
 * 
 * This file contains React hooks for managing farmer orders using the new backend endpoints:
 * - GET /api/farmer/orders/ - List all orders for the authenticated farmer
 * - GET /api/farmer/orders/{id}/ - Get a specific order
 * - POST /api/farmer/orders/{id}/confirm-delivery/ - Confirm delivery of an order
 * - PATCH /api/farmer/orders/{id}/ - Update order status and notes
 * 
 * All hooks use the updated authentication system with automatic token refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { marketplaceService } from '@/lib/api/marketplace';
import { Order, ApiFilters } from '@/lib/types/marketplacetypes';
import apiClient from '@/lib/axios';

// Type for valid order status values that farmers can update to
export type FarmerOrderStatus = 'pending_payment' | 'paid_to_escrow' | 'farmer_confirmed_delivery' | 'buyer_confirmed_receipt' | 'completed' | 'dispute' | 'cancelled';

// Farmer Orders Hook - Gets orders for farmer's listings
export function useFarmerOrders(filters?: ApiFilters) {
  const [data, setData] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new farmer orders endpoint
      const response = await apiClient.get('/api/farmer/orders/', {
        params: filters
      });
      
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Confirm Delivery Hook for Farmers
export function useConfirmDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelivery = async (orderId: number, deliveryNotes?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post(`/api/farmer/orders/${orderId}/confirm-delivery/`, {
        delivery_notes: deliveryNotes
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { confirmDelivery, loading, error };
}

// Order Status Updates Hook
export function useUpdateOrderStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (orderId: number, status: FarmerOrderStatus, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.patch(`/api/farmer/orders/${orderId}/`, {
        status,
        notes
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateStatus, loading, error };
}

// Get Single Farmer Order Hook
export function useFarmerOrder(orderId: number) {
  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/farmer/orders/${orderId}/`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchData();
    }
  }, [fetchData, orderId]);

  return { data, loading, error, refetch: fetchData };
}

// Order Statistics Hook for Farmers
export function useFarmerOrderStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all farmer orders and calculate stats
      const response = await apiClient.get('/api/farmer/orders/');
      const orders = response.data;
      
      // Calculate statistics using correct order status values
      const stats = {
        total: orders.length,
        pendingPayment: orders.filter((o: Order) => o.status === 'pending_payment').length,
        paidToEscrow: orders.filter((o: Order) => o.status === 'paid_to_escrow').length,
        farmerConfirmedDelivery: orders.filter((o: Order) => o.status === 'farmer_confirmed_delivery').length,
        buyerConfirmedReceipt: orders.filter((o: Order) => o.status === 'buyer_confirmed_receipt').length,
        completed: orders.filter((o: Order) => o.status === 'completed').length,
        dispute: orders.filter((o: Order) => o.status === 'dispute').length,
        cancelled: orders.filter((o: Order) => o.status === 'cancelled').length,
        totalRevenue: orders
          .filter((o: Order) => o.status === 'completed')
          .reduce((sum: number, order: Order) => sum + Number(order.total_amount || 0), 0),
        averageOrderValue: 0
      };
      
      // Calculate average order value
      const completedOrders = orders.filter((o: Order) => o.status === 'completed');
      if (completedOrders.length > 0) {
        stats.averageOrderValue = stats.totalRevenue / completedOrders.length;
      }
      
      setData(stats);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
