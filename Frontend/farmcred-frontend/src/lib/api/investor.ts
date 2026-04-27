import {
  InvestorProfile,
  InvestorReview,
  InvestorFarmers,
  ReviewInput,
  FarmerProfile,
  InvestorLoans,
  InvestorInvestment,
  ApiFilters,
} from "@/lib/types/investortypes";

import apiClient from "../axios";

export const investorService = {
  //Profile
  async getProfile(): Promise<InvestorProfile> {
    const response = await apiClient.get("/api/investor/profile/");
    return response.data;
  },

  async updateProfile(
    data: Partial<InvestorProfile>
  ): Promise<InvestorProfile> {
    const response = await apiClient.put("/api/investor/profile/", data);
    return response.data;
  },

  //Get review for farmers
  async getFarmerReview(): Promise<InvestorReview> {
    const response = await apiClient.get("/api/investor/farmers/reviewed/");
    return response.data;
  },

  async createReviewforFarmer(
    pk: number,
    reviewData: ReviewInput
  ): Promise<InvestorReview> {
    const response = await apiClient.post(
      `/api/investor/farmers/${pk}/review/`,
      reviewData
    );
    return response.data;
  },

  async updateFarmerReview(
    data: Partial<InvestorReview>
  ): Promise<InvestorReview> {
    const response = await apiClient.put(
      "/api/investor/farmers/reviewed/",
      data
    );
    return response.data;
  },

  //All Farmers Connected to Investor
  async getFarmerList(): Promise<InvestorFarmers[]> {
    const response = await apiClient.get("/api/investor/farmers/");
    return response.data;
  },

  //Shows full profile of one specific farmer(already invested in)
  async getDetailsforSpecificFarmer(pk: number): Promise<FarmerProfile> {
    const response = await apiClient.get(
      `/api/investor/farmers/${pk}/profile/`
    );
    return response.data;
  },

  //Update list of farmers associated with the investor
  async updateFarmerList(
    data: Partial<InvestorFarmers>
  ): Promise<InvestorFarmers> {
    const response = await apiClient.put("/api/investor/farmers/", data);
    return response.data;
  },

  //Get discoverable farmers who can be viewed by investors
  async getDiscoverableFarmers(): Promise<InvestorFarmers[]> {
    const response = await apiClient.get("/api/ussd-web/investor/farmers/");
    return response.data;
  },

  //Investor loans (legacy method)
  async getInvestorLoans(filters?: ApiFilters): Promise<InvestorLoans[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    }
  );
  }
     const response = await apiClient.get('/api/investor/loans/');
    return response.data;
  },

  //Investor investments (proper terminology)
  async getInvestorInvestments(filters?: ApiFilters): Promise<InvestorInvestment[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get('/api/investor/loans/'); // Backend still uses loans endpoint
    return response.data;
  },

  //Get reviewed farmers (farmers marked for review)
  async getReviewedFarmers(): Promise<InvestorReview[]> {
    const response = await apiClient.get('/api/investor/farmers/reviewed/');
    return response.data;
  },

  //Add farmer to review list
  async addReview(farmerId: number): Promise<InvestorReview> {
    const response = await apiClient.post(`/api/investor/farmers/${farmerId}/review/`);
    return response.data;
  },

  //Remove farmer from review list
  async removeReview(farmerId: number): Promise<void> {
    await apiClient.delete(`/api/investor/farmers/${farmerId}/review/`);
  },



  // Delete Account
async deleteInvestorAccount(): Promise<boolean> {
  try {
    await apiClient.delete('/api/delete-account/');
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete account");
  }
},
};
