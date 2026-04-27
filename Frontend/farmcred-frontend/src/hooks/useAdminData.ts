import { useState, useEffect, useCallback, useMemo } from "react";
import { adminService } from "@/lib/api/admin";
import { 
  AdminUser, 
  AdminOrder, 
  AdminTransaction, 
  AdminEscrowOverview,
  AdminTrustAnalytics,
  AdminLoan,
  AdminDashboardStats,
  AdminDispute,
  BulkActionRequest,
  ApiFilters 
} from "@/lib/types/admintypes";

function useApiCall<T>(apiCall: () => Promise<T>, dependencyKey?: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Making API call...');
      const result = await apiCall();
      console.log('API call result:', result);
      setData(result);
    } catch (err: any) {
      console.error('API call error:', err);
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dependencyKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Dashboard Stats Hook
export function useAdminDashboardStats() {
  return useApiCall(() => adminService.getDashboardStats());
}

// User Management Hooks
export function useAdminUsers(filters?: ApiFilters) {
  const dependencyKey = useMemo(() => JSON.stringify(filters), [filters]);
  return useApiCall(() => adminService.getUsers(filters), dependencyKey);
}

export function useAdminUserDetails(userId: number) {
  return useApiCall(() => adminService.getUserDetails(userId), userId.toString());
}

export function useUpdateAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = async (userId: number, data: Partial<AdminUser>): Promise<AdminUser> => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.updateUser(userId, data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateUser, loading, error };
}

export function useBulkUserAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performBulkAction = async (data: BulkActionRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.bulkUserAction(data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { performBulkAction, loading, error };
}

// Order Management Hooks
export function useAdminOrders(filters?: ApiFilters) {
  const dependencyKey = useMemo(() => JSON.stringify(filters), [filters]);
  return useApiCall(() => adminService.getOrders(filters), dependencyKey);
}

export function usePlatformOrders(filters?: ApiFilters) {
  const dependencyKey = useMemo(() => JSON.stringify(filters), [filters]);
  return useApiCall(() => adminService.getPlatformOrders(filters), dependencyKey);
}

export function usePlatformOrderDetails(orderId: number) {
  return useApiCall(() => adminService.getPlatformOrderDetails(orderId), orderId.toString());
}

export function useBulkOrderAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: BulkActionRequest, options?: { onSuccess?: () => void }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.bulkOrderAction(data);
      if (options?.onSuccess) {
        options.onSuccess();
      }
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

// Transaction Management Hooks
export function useAdminTransactions(filters?: ApiFilters) {
  const dependencyKey = useMemo(() => JSON.stringify(filters), [filters]);
  return useApiCall(() => adminService.getTransactions(filters), dependencyKey);
}

export function useEscrowOverview() {
  return useApiCall(() => adminService.getEscrowOverview());
}

// Trust System Hooks
export function useTrustAnalytics() {
  return useApiCall(() => adminService.getTrustAnalytics());
}

export function useAdjustTrustScore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustTrustScore = async (userId: number, data: { new_score: number, reason: string }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.adjustTrustScore(userId, data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { adjustTrustScore, loading, error };
}

// Loan Management Hooks
export function useAdminLoans(filters?: ApiFilters) {
  const dependencyKey = useMemo(() => JSON.stringify(filters), [filters]);
  return useApiCall(() => adminService.getLoans(filters), dependencyKey);
}

// Dispute Management Hooks
export function useAdminDisputes() {
  return useApiCall(() => adminService.getDisputes());
}

export function useResolveDispute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveDispute = async (orderId: number, data: { resolution: string, resolution_notes?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.resolveDispute(orderId, data);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { resolveDispute, loading, error };
}
