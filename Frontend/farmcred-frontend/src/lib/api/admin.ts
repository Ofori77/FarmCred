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
} from '@/lib/types/admintypes';
import apiClient from '../axios';

export const adminService = {
  // User Management
  async getUsers(filters?: ApiFilters): Promise<{ results: AdminUser[], count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/api/platform-admin/admin/users/?${params.toString()}`);
    
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return {
        results: response.data,
        count: response.data.length
      };
    }
    
    return response.data;
  },

  async getUserDetails(userId: number): Promise<AdminUser> {
    const response = await apiClient.get(`/api/platform-admin/admin/users/${userId}/`);
    return response.data;
  },

  async updateUser(userId: number, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await apiClient.patch(`/api/platform-admin/admin/users/${userId}/`, data);
    return response.data;
  },

  async bulkUserAction(data: BulkActionRequest): Promise<{ success: boolean, message: string }> {
    const response = await apiClient.post('/api/platform-admin/admin/users/bulk-action/', data);
    return response.data;
  },

  // Order & Payment Management
  async getOrders(filters?: ApiFilters): Promise<{ results: AdminOrder[], count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/api/platform-admin/admin/orders/?${params.toString()}`);
    
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return {
        results: response.data,
        count: response.data.length
      };
    }
    
    return response.data;
  },

  async bulkOrderAction(data: BulkActionRequest): Promise<{ success: boolean, message: string }> {
    const response = await apiClient.post('/api/platform-admin/admin/orders/bulk-action/', data);
    return response.data;
  },

  async getTransactions(filters?: ApiFilters): Promise<{ results: AdminTransaction[], count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/api/platform-admin/admin/transactions/?${params.toString()}`);
    
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return {
        results: response.data,
        count: response.data.length
      };
    }
    
    return response.data;
  },

  async getEscrowOverview(): Promise<AdminEscrowOverview> {
    const response = await apiClient.get('/api/platform-admin/admin/escrow/overview/');
    return response.data;
  },

  // Trust System Management
  async getTrustAnalytics(): Promise<AdminTrustAnalytics> {
    const response = await apiClient.get('/api/platform-admin/admin/trust/analytics/');
    return response.data;
  },

  async adjustTrustScore(userId: number, data: { new_score: number, reason: string }): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/platform-admin/admin/trust/adjust/${userId}/`, data);
    return response.data;
  },

  // Loan Management
  async getLoans(filters?: ApiFilters): Promise<{ results: AdminLoan[], count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/api/platform-admin/admin/loans/?${params.toString()}`);
    return response.data;
  },

  // Dashboard Analytics
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await apiClient.get('/api/platform-admin/dashboard-stats/');
    console.log('Dashboard Stats API Response:', response.data);
    return response.data;
  },

  // Dispute Management
  async getDisputes(): Promise<AdminDispute[]> {
    const response = await apiClient.get('/api/payments/orders/disputes/');
    return response.data;
  },

  async resolveDispute(orderId: number, data: { resolution: string, resolution_notes?: string }): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/payments/orders/${orderId}/resolve-dispute/`, data);
    return response.data;
  },

  // Platform Orders (existing endpoint)
  async getPlatformOrders(filters?: ApiFilters): Promise<{ results: AdminOrder[], count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/api/platform-admin/orders/?${params.toString()}`);
    return response.data;
  },

  async getPlatformOrderDetails(orderId: number): Promise<AdminOrder> {
    const response = await apiClient.get(`/api/platform-admin/orders/${orderId}/`);
    return response.data;
  },
};
