import { useState, useEffect, useCallback } from 'react';
import { marketplaceService } from '@/lib/api/marketplace';
import { 
  CreateListingInput, 
  SendMessageInput, 
  InitiateOrderInput, 
  CreateReviewInput,
  ProduceListing,
  Order,
  Conversation,
  Message,
  BuyerReview,
  ApiFilters
} from '@/lib/types/marketplacetypes';

// Updated types to support guest orders
export interface GuestOrderInput {
  listing_id: number;
  quantity: number;
  delivery_date?: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
}

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

// Listings
export function useListings(filters?: ApiFilters) {
  return useApiCall(() => marketplaceService.getAllListings(filters), [filters]);
}

export function useListing(id: number) {
  return useApiCall(() => marketplaceService.getListingById(id), [id]);
}

export function useFarmerListings() {
  return useApiCall(() => marketplaceService.getFarmerListings());
}

// Orders
export function useBuyerOrders(filters?: ApiFilters) {
  return useApiCall(() => marketplaceService.getBuyerOrders(filters), [filters]);
}

export function useOrder(id: number) {
  return useApiCall(() => marketplaceService.getOrderById(id), [id]);
}

// Conversations
export function useConversations() {
  return useApiCall(() => marketplaceService.getConversations());
}

export function useConversationMessages(conversationId: number) {
  return useApiCall(() => marketplaceService.getMessages(conversationId), [conversationId]);
}

// Reviews
export function useBuyerReviews() {
  return useApiCall(() => marketplaceService.getBuyerReviews());
}

export function useFarmerReviews(farmerId: number) {
  return useApiCall(() => marketplaceService.getFarmerReviews(farmerId), [farmerId]);
}

// Create Listing
export function useCreateListing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createListing = async (data: CreateListingInput) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.createFarmerListing(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createListing, loading, error };
}

// Updated Initiate Order - supports both authenticated and guest users
export function useInitiateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateOrder = async (data: InitiateOrderInput | GuestOrderInput) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if this is a guest order (has guest_name field)
      const isGuestOrder = 'guest_name' in data;
      
      if (isGuestOrder) {
        // For guest orders, use the marketplace endpoint directly
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/marketplace/initiate-order/${data.listing_id}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quantity: data.quantity,
            delivery_date: data.delivery_date,
            guest_name: data.guest_name,
            guest_email: data.guest_email,
            guest_phone: data.guest_phone,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to initiate order');
        }
        
        return await response.json();
      } else {
        // For authenticated users, use the original service
        return await marketplaceService.initiateOrder(data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { initiateOrder, loading, error };
}

// Send Message
export function useSendMessage(conversationId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (data: SendMessageInput) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.sendMessage(conversationId, data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, error };
}

// Initiate Conversation
export function useInitiateConversation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateConversation = async (listing_id: number, initial_message: string) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.initiateConversation({ listing_id, initial_message });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { initiateConversation, loading, error };
}

// Create Review
export function useCreateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = async (data: CreateReviewInput) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.createReview(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createReview, loading, error };
}

// Confirm Order Delivery
export function useConfirmOrderDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelivery = async (orderId: number) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.confirmOrderDelivery(orderId);
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

// Raise Dispute
export function useRaiseDispute() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const raiseDispute = async (orderId: number, reason: string) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.raiseDispute(orderId, reason);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { raiseDispute, loading, error };
}