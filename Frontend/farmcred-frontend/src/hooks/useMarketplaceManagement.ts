import { useState } from 'react';
import { marketplaceService } from '@/lib/api/marketplace';
import { CreateListingInput, ProduceListing } from '@/lib/types/marketplacetypes';

// Update Listing Hook
export function useUpdateListing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateListing = async (id: number, data: Partial<CreateListingInput>) => {
    try {
      setLoading(true);
      setError(null);
      return await marketplaceService.updateFarmerListing(id, data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateListing, loading, error };
}

// Delete Listing Hook
export function useDeleteListing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteListing = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await marketplaceService.deleteFarmerListing(id);
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { deleteListing, loading, error };
}

// Bulk Actions Hook
export function useBulkListingActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bulkUpdateStatus = async (listingIds: number[], newStatus: string) => {
    try {
      setLoading(true);
      setError(null);
      const promises = listingIds.map(id => 
        marketplaceService.updateFarmerListing(id, { status: newStatus } as any)
      );
      return await Promise.all(promises);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async (listingIds: number[]) => {
    try {
      setLoading(true);
      setError(null);
      const promises = listingIds.map(id => 
        marketplaceService.deleteFarmerListing(id)
      );
      await Promise.all(promises);
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { bulkUpdateStatus, bulkDelete, loading, error };
}
