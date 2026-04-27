import { useState, useEffect, useCallback } from "react";
import { investorService } from "@/lib/api/investor";
import { InvestorReview, FarmerProfile, InvestorFarmers, InvestorProfile, ReviewInput, ApiFilters } from "@/lib/types/investortypes";

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

//Investor Profile Hook
export function useInvestorProfile() {
  return useApiCall(() => investorService.getProfile());
}

//Investor Review Hook (legacy - single review)
export function useInvestorReview() {
  return useApiCall(() => investorService.getFarmerReview());
}

//Farmer List Hook
export function useFarmerList() {
  return useApiCall(() => investorService.getFarmerList());
}

//Discoverable Farmers Hook
export function useGetDiscoverableFarmers() {
  return useApiCall(() => investorService.getDiscoverableFarmers());
}

//Investor Review Remark Hook
export function useCreateReviewForFarmer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReview = async (pk: number, reviewData: ReviewInput): Promise<InvestorReview> => {
    try {
      setLoading(true);
      setError(null);
      const result = await investorService.createReviewforFarmer(pk, reviewData);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createReview, loading, error };
}

//Specific Farmer Hook
export function useFarmerDetails(pk: number) {
  const [data, setData] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmerDetails = async () => {
      try {
        setLoading(true);
        const response = await investorService.getDetailsforSpecificFarmer(pk);
        setData(response);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Failed to fetch farmer details");
      } finally {
        setLoading(false);
      }
    };

    if (pk) {
      fetchFarmerDetails();
    }
  }, [pk]);

  return { data, loading, error };
}

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (data: Partial<InvestorProfile>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await investorService.updateProfile(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
}

export function useUpdateFarmerReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFarmerReview = async (data: Partial<InvestorReview>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await investorService.updateFarmerReview(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update farmer review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateFarmerReview, loading, error };
}

export function useUpdateFarmerList() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFarmerList = async (data: Partial<InvestorFarmers>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await investorService.updateFarmerList(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateFarmerList, loading, error };
}

export function useDeleteInvestorAccount() {
  const deleteAccount = async () => {
    try {
      await deleteAccount();
      return true;
    } catch (error: any) {
      console.error("Delete failed:", error.message);
      throw error;
    }
  };

  return { deleteAccount };
}

//Investor Loans Hook (legacy)
export function useInvestorLoans(filters?: ApiFilters) {  
  return useApiCall(() => investorService.getInvestorLoans(filters), [filters]);
}

//Investor Investments Hook (proper terminology)
export function useInvestorInvestments(filters?: ApiFilters) {  
  return useApiCall(() => investorService.getInvestorInvestments(filters), [filters]);
}

export const useInvestorReviews = () => {
  const [data, setData] = useState<InvestorReview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await investorService.getReviewedFarmers();
      setData(response);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch reviewed farmers");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const removeReview = async (farmerId: number) => {
    try {
      await investorService.removeReview(farmerId);
      // Refresh the list after removal
      await fetchReviews();
    } catch (err: any) {
      throw new Error(err.message || "Failed to remove farmer from reviews");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  return { data, loading, error, refetch: fetchReviews, removeReview };
};