import apiClient from "../axios";
import { 
  SendMessageInput, 
  CreateListingInput, 
  InitiateOrderInput, 
  CreateReviewInput,
  ProduceListing,
  Order,
  Conversation,
  Message,
  BuyerReview,
  ApiFilters
} from "../types/marketplacetypes";

export const marketplaceService = {
  // --- Produce Listings ---
  async getAllListings(filters?: ApiFilters): Promise<ProduceListing[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const url = params.toString() ? `/api/marketplace/listings/?${params.toString()}` : '/api/marketplace/listings/';
    const res = await apiClient.get(url);
    return res.data;
  },

  async getListingById(id: number): Promise<ProduceListing> {
    try {
      // Try the direct endpoint first
      const res = await apiClient.get(`/api/marketplace/listings/${id}/`);
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // If authentication is required, fetch from the public listings endpoint
        console.log('Authentication required for individual listing, fetching from public list...');
        const allListings = await this.getAllListings();
        const listing = allListings.find(listing => listing.id === id);
        if (!listing) {
          throw new Error('Product not found');
        }
        return listing;
      }
      throw error;
    }
  },

  async getFarmerListings(): Promise<ProduceListing[]> {
    const res = await apiClient.get("/api/marketplace/farmer/listings/");
    return res.data;
  },

  // Enhanced farmer-specific endpoints
  async getFarmerOrders(): Promise<Order[]> {
    const res = await apiClient.get("/api/farmer/orders/");
    return res.data;
  },

  async confirmFarmerDelivery(orderId: number, notes?: string): Promise<Order> {
    const res = await apiClient.post(`/api/farmer/orders/${orderId}/confirm-delivery/`, { notes });
    return res.data;
  },

  async updateOrderStatus(orderId: number, status: string, notes?: string): Promise<Order> {
    const res = await apiClient.patch(`/api/farmer/orders/${orderId}/`, { status, notes });
    return res.data;
  },

  async createFarmerListing(data: CreateListingInput): Promise<ProduceListing> {
    const res = await apiClient.post("/api/marketplace/farmer/listings/", data);
    return res.data;
  },

  async updateFarmerListing(id: number, data: Partial<CreateListingInput>): Promise<ProduceListing> {
    const res = await apiClient.put(`/api/marketplace/farmer/listings/${id}/`, data);
    return res.data;
  },

  async deleteFarmerListing(id: number): Promise<void> {
    await apiClient.delete(`/api/marketplace/farmer/listings/${id}/`);
  },

  // --- Orders ---
  async initiateOrder(data: InitiateOrderInput): Promise<Order> {
    const res = await apiClient.post(`/api/marketplace/initiate-order/${data.listing_id}/`, {
      quantity: data.quantity,
      delivery_date: data.delivery_date
    });
    return res.data;
  },

  async getBuyerOrders(filters?: ApiFilters): Promise<Order[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const url = params.toString() ? `/api/buyer/orders/?${params.toString()}` : '/api/buyer/orders/';
    const res = await apiClient.get(url);
    return res.data;
  },

  async getOrderById(id: number): Promise<Order> {
    const res = await apiClient.get(`/api/buyer/orders/${id}/`);
    return res.data;
  },

  async confirmOrderDelivery(orderId: number): Promise<Order> {
    const res = await apiClient.post(`/api/buyer/orders/${orderId}/confirm-delivery/`);
    return res.data;
  },

  async raiseDispute(orderId: number, reason: string): Promise<Order> {
    const res = await apiClient.post(`/api/buyer/orders/${orderId}/dispute/`, { reason });
    return res.data;
  },

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get("/api/marketplace/conversations/");
    return res.data;
  },

  async initiateConversation(payload: {
    listing_id: number;
    initial_message: string;
  }): Promise<Conversation> {
    const res = await apiClient.post("/api/marketplace/conversations/", payload);
    return res.data;
  },

  async getMessages(convoId: number): Promise<Message[]> {
    const res = await apiClient.get(`/api/marketplace/conversations/${convoId}/messages/`);
    return res.data;
  },

  async sendMessage(convoId: number, data: SendMessageInput): Promise<Message> {
    const res = await apiClient.post(`/api/marketplace/conversations/${convoId}/send-message/`, data);
    return res.data;
  },

  // --- Reviews ---
  async createReview(data: CreateReviewInput): Promise<BuyerReview> {
    const res = await apiClient.post('/api/buyer/reviews/', data);
    return res.data;
  },

  async getBuyerReviews(): Promise<BuyerReview[]> {
    const res = await apiClient.get('/api/buyer/reviews/');
    return res.data;
  },

  async getFarmerReviews(farmerId: number): Promise<BuyerReview[]> {
    const res = await apiClient.get(`/api/farmer/${farmerId}/reviews/`);
    return res.data;
  },

  // --- Purchase Order (Legacy support) ---
  async initiatePurchase(listingId: number, quantity: number): Promise<Order> {
    const res = await apiClient.post(`/api/marketplace/listings/${listingId}/purchase/`, {
      quantity,
    });
    return res.data;
  },
};
