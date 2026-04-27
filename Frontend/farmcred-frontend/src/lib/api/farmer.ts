import { 
  FarmerProfile, 
  FarmerOverview, 
  Transaction, 
  TransactionInput,
  Transfer, 
  TransferInput,
  ChartData, 
  TrustBreakdown,
  ApiFilters, 
  FarmerLoans,
  FarmerDiscoverability,
  StatLogs
} from '@/lib/types/farmertypes';
import { InvestorReview } from '@/lib/types/investortypes';

import apiClient from '../axios';

export const farmerService = {
  // Profile 
  async getProfile(): Promise<FarmerProfile> {
    try {
      const response = await apiClient.get('/api/farmer/profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  async updateProfile(data: Partial<FarmerProfile>): Promise<FarmerProfile> {
    const response = await apiClient.put('/api/farmer/profile/', data);
    return response.data;
  },

  // Overview 
  async getOverview(): Promise<FarmerOverview> {
    try {
      const response = await apiClient.get('/api/farmer/overview/');
      return response.data;
    } catch (error) {
      console.error('Error fetching overview:', error);
      throw error;
    }
  },

  // Transaction 
  async getTransactions(filters?: ApiFilters): Promise<Transaction[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      const response = await apiClient.get(`/api/farmer/transactions/?${params.toString()}`);
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return []; // Return empty array on error
    }
  },

  async createTransaction(data: TransactionInput): Promise<Transaction> {
    const response = await apiClient.post('/api/farmer/transactions/', data);
    return response.data;
  },

  async getTransactionsChart(): Promise<ChartData[]> {
    try {
      const response = await apiClient.get('/api/farmer/transactions/chart/');
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching transactions chart:', error);
      return []; // Return empty array on error
    }
  },

  // Transfer 
  async getTransfers(filters?: ApiFilters): Promise<Transfer[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      const response = await apiClient.get(`/api/farmer/transfers/?${params.toString()}`);
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return []; // Return empty array on error
    }
  },

  async createTransfer(data: TransferInput): Promise<Transfer> {
    const response = await apiClient.post('/api/farmer/transfers/', data);
    return response.data;
  },

  // Trust breakdown 
  async getTrustBreakdown(): Promise<TrustBreakdown> {
    try {
      const response = await apiClient.get('/api/farmer/trust-breakdown/');
      return response.data;
    } catch (error) {
      console.error('Error fetching trust breakdown:', error);
      throw error;
    }
  },

  //Farmer loans
  async getLoans(filters?: ApiFilters): Promise<FarmerLoans[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      const response = await apiClient.get(`/api/farmer/loans/?${params.toString()}`);
      // Ensure we always return an array
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching loans:', error);
      return []; // Return empty array on error
    }
  },

  // Discoverability
  async toggleDiscoverability(): Promise<FarmerDiscoverability> {
    const response = await apiClient.post(' /api/ussd-web/farmer/toggle-discoverability/');
    return response.data;
  },

  //Share Stats Log
  async shareStatsLogs(recipientPhoneNumber: string): Promise<StatLogs> {
    const response = await apiClient.post('/api/ussd-web/farmer/share-stats-logs/', { recipient_number: recipientPhoneNumber });
    return response.data;
  },

  // Get reviews received from investors
  async getReceivedReviews(): Promise<any[]> {
    try {
      const response = await apiClient.get('/api/farmer/received-reviews/');
      return response.data;
    } catch (error) {
      console.error('Error fetching received reviews:', error);
      throw error;
    }
  },

  // Delete Account
  async deleteFarmerAccount(): Promise<boolean> {
    try {
      await apiClient.delete('/api/delete-account/');
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to delete account");
    }
  },
};


