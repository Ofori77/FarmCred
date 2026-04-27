import { useAppDispatch, useAppSelector } from '../store';
import { 
  setLoading,
  setError,
  setListings,
  setSearchQuery,
  setCategoryFilter,
  setSortBy,
  setCurrentPage,
  clearFilters,
  updateListing,
  removeListing
} from '../features/marketplaceSlice';
import { ProduceListing } from '@/lib/types/marketplacetypes';

export const useMarketplace = () => {
  const dispatch = useAppDispatch();
  const {
    listings,
    filteredListings,
    loading,
    error,
    searchQuery,
    categoryFilter,
    sortBy,
    currentPage,
    pageSize,
  } = useAppSelector((state) => state.marketplace);

  const setListingsData = (listingsData: ProduceListing[]) => {
    dispatch(setListings(listingsData));
  };

  const setLoadingState = (isLoading: boolean) => {
    dispatch(setLoading(isLoading));
  };

  const setErrorState = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const updateSearchQuery = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const updateCategoryFilter = (category: string) => {
    dispatch(setCategoryFilter(category));
  };

  const updateSortBy = (sort: string) => {
    dispatch(setSortBy(sort));
  };

  const updateCurrentPage = (page: number) => {
    dispatch(setCurrentPage(page));
  };

  const resetFilters = () => {
    dispatch(clearFilters());
  };

  const updateListingData = (listing: ProduceListing) => {
    dispatch(updateListing(listing));
  };

  const removeListingData = (listingId: number) => {
    dispatch(removeListing(listingId));
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredListings.length / pageSize);
  const paginatedListings = (() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  })();

  return {
    // Data
    listings,
    filteredListings,
    paginatedListings,
    loading,
    error,
    
    // Aliases for component compatibility
    isLoading: loading,
    updatePage: updateCurrentPage,
    
    // Filters
    searchQuery,
    categoryFilter,
    sortBy,
    currentPage,
    pageSize,
    totalPages,
    
    // Actions
    setListingsData,
    setLoadingState,
    setErrorState,
    updateSearchQuery,
    updateCategoryFilter,
    updateSortBy,
    updateCurrentPage,
    resetFilters,
    updateListingData,
    removeListingData,
  };
};
