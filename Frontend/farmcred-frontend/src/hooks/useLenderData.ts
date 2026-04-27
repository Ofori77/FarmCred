import { useState, useEffect, useCallback } from "react";
import { lenderService } from "@/lib/api/lender";
import { LenderProfile, LenderLoans, ApiFilters } from "@/lib/types/admintypes";

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

//Lender Profile Hook
export function useLenderProfile() {
  return useApiCall(() => lenderService.getProfile());
}

//Lender Loans Hook
export function useLenderLoans(filters?: ApiFilters) {
  return useApiCall(() => lenderService.getLoans(filters), [filters]);
}

// Create Lender Loan Hook
export function useCreateLenderLoan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLoan = async (data: any): Promise<LenderLoans> => {
    try {
      setLoading(true);
      setError(null);
      const result = await lenderService.createLoan(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create loan';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createLoan, loading, error };
}