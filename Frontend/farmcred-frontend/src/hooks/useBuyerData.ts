import { useState, useEffect, useCallback } from "react";
import { buyerService } from "@/lib/api/buyer";
import {  ApiFilters } from "@/lib/types/buyertypes";

function useApiCall<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Buyer Profile Hook
export function useBuyerProfile() {
  return useApiCall(() => buyerService.getProfile());
}

//Buyer Transaction Hook
export function useBuyerTransactions(filters?: ApiFilters) {
  return useApiCall(() => buyerService.getTransactions(filters), [filters]);
}

// Create Buyer Transaction Hook
export function useCreateTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransaction = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await buyerService.createTransaction(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create transaction';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createTransaction, loading, error };
}