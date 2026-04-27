import { useState, useEffect, useCallback } from 'react';
import { confirmationService } from '@/lib/api/confirmation';
import { 
  InitiatePurchasePayload, 
  ConfirmationActionPayload,
  InitiatePurchaseResponse,
  PendingConfirmation
} from '@/lib/types/confirmation';

function useApiCall<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (dependencies.some(dep => !dep)) {
        setLoading(false);
        return;
    }
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

export function usePendingConfirmations() {
  return useApiCall<PendingConfirmation[]>(() => confirmationService.getPendingConfirmations());
}

export function useConfirmationStatus(pk: number) {
  return useApiCall<PendingConfirmation>(() => confirmationService.getConfirmationStatus(pk), [pk]);
}

export function useInitiateProducePurchase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePurchase = async (data: InitiatePurchasePayload): Promise<InitiatePurchaseResponse | undefined> => {
    try {
      setLoading(true);
      setError(null);
      const result = await confirmationService.initiateProducePurchase(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to initiate purchase';
      setError(errorMessage);
      throw new Error(errorMessage); 
    } finally {
      setLoading(false);
    }
  };

  return { initiatePurchase, loading, error };
}

export function useConfirmRequestAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performAction = async (pk: number, payload: ConfirmationActionPayload): Promise<{ message: string } | undefined> => {
    try {
      setLoading(true);
      setError(null);
      const result = await confirmationService.confirmRequestAction(pk, payload);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to perform action';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { performAction, loading, error };
}