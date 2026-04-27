import {
  ApiFilters,
  LenderProfile,
  LenderLoans,
} from '@/lib/types/admintypes';

import apiClient from '../axios';

export const lenderService = {
  //Profile 
  async getProfile(): Promise<LenderProfile> {
    const response = await apiClient.get('/api/platform-lender/profile/');
    return response.data;
  },

  async updateProfile(data: Partial<LenderProfile>): Promise<LenderProfile> {
    const response = await apiClient.put('/api/platform-lender/profile/', data);
    return response.data;
  },

  // Loans
  async getLoans(filters?: ApiFilters): Promise<LenderLoans[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get(`/api/platform-lender/loans/?${params.toString()}`);
    return response.data;
  },

  async createLoan(data: any): Promise<LenderLoans> {
    const response = await apiClient.post('/api/platform-lender/loans/', data);
    return response.data;
  },
}