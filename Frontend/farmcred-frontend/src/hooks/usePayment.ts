import { useState, useEffect, useCallback } from "react";
import { paymentService } from "@/lib/api/payment";

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
      setError(err.response?.data?.detail || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMyOrders() {
  return useApiCall(() => paymentService.getMyOrders());
}

export function useOrderDetail(orderId: number) {
  return useApiCall(() => paymentService.getOrderDetail(orderId), [orderId]);
}

export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateOrder = async (data: { produce_listing_id: number; quantity: number; delivery_date?: string }) => {
    try {
      setLoading(true);
      setError(null);
      return await paymentService.initiateOrder(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to initiate order";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { initiateOrder, loading, error };
}

export function useConfirmPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (orderId: number, payload: { status: string; transaction_reference: string }) => {
    try {
      setLoading(true);
      setError(null);
      return await paymentService.confirmPayment(orderId, payload);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Payment confirmation failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { confirm, loading, error };
}

export function useConfirmDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (orderId: number) => {
    try {
      setLoading(true);
      return await paymentService.confirmDelivery(orderId);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { confirm, loading, error };
}

export function useConfirmReceipt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (orderId: number) => {
    try {
      setLoading(true);
      return await paymentService.confirmReceipt(orderId);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { confirm, loading, error };
}

export function useCancelOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async (orderId: number) => {
    try {
      setLoading(true);
      return await paymentService.cancelOrder(orderId);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { cancel, loading, error };
}

export function useSubmitReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (data: { order: number; rating: number; comment: string }) => {
    try {
      setLoading(true);
      return await paymentService.createReview(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}

export function useRaiseDispute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const raise = async (orderId: number, reason: string) => {
    try {
      setLoading(true);
      return await paymentService.raiseDispute(orderId, reason);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { raise, loading, error };
}

export function useResolveDispute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (orderId: number, payload: { resolution_type: string; amount_to_farmer?: number; resolution_notes?: string }) => {
    try {
      setLoading(true);
      return await paymentService.resolveDispute(orderId, payload);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { resolve, loading, error };
}
