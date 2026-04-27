
import apiClient from '../axios';
import { ApiFilters, BuyerProfile, BuyerTransaction } from '../types/marketplacetypes';

export const buyerService = {
  // Profile
  async getProfile(): Promise<BuyerProfile> {
    const response = await apiClient.get('/api/buyer/profile/');
    return response.data;
  },

  async updateProfile(data: Partial<BuyerProfile>): Promise<BuyerProfile> {
    const response = await apiClient.put('/api/buyer/profile/', data);
    return response.data;
  },

  // Transaction
  async getTransactions(filters?: ApiFilters): Promise<BuyerTransaction[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get(`/api/buyer/transactions/?${params.toString()}`);
    return response.data;
  },

  async createTransaction(data: any): Promise<BuyerTransaction> {
    const response = await apiClient.post('/api/buyer/transactions/', data);
    return response.data;
  },

};