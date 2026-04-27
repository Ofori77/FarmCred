import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProduceListing } from "@/lib/types/marketplacetypes";

interface MarketplaceState {
  listings: ProduceListing[];
  filteredListings: ProduceListing[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: string;
  sortBy: string;
  currentPage: number;
  pageSize: number;
}

const initialState: MarketplaceState = {
  listings: [],
  filteredListings: [],
  loading: false,
  error: null,
  searchQuery: "",
  categoryFilter: "All",
  sortBy: "default",
  currentPage: 1,
  pageSize: 12,
};

// Helper function to categorize produce
const categorizeProduct = (produceType: string): string => {
  const type = produceType.toLowerCase();
  if (type.includes('maize') || type.includes('rice') || type.includes('wheat') || type.includes('corn')) {
    return 'Grains';
  }
  if (type.includes('cassava') || type.includes('yam') || type.includes('potato')) {
    return 'Tubers';
  }
  if (type.includes('tomato') || type.includes('pepper') || type.includes('onion') || type.includes('vegetable')) {
    return 'Vegetables';
  }
  if (type.includes('mango') || type.includes('pineapple') || type.includes('orange') || type.includes('fruit')) {
    return 'Fruits';
  }
  return 'Other';
};

// Helper function to filter and sort listings
const filterAndSortListings = (
  listings: ProduceListing[],
  searchQuery: string,
  categoryFilter: string,
  sortBy: string
): ProduceListing[] => {
  let filtered = listings.filter((listing) => {
    // Only show active listings
    if (listing.status !== 'active') return false;

    const category = categorizeProduct(listing.produce_type);
    const matchesCategory = categoryFilter === "All" || category === categoryFilter;

    const queryText = searchQuery.toLowerCase();
    const matchesQuery =
      listing.produce_type.toLowerCase().includes(queryText) ||
      listing.farmer_full_name.toLowerCase().includes(queryText) ||
      listing.location_description.toLowerCase().includes(queryText);

    return matchesCategory && matchesQuery;
  });

  // Sort listings
  switch (sortBy) {
    case "alphabetical":
      filtered.sort((a, b) => a.produce_type.localeCompare(b.produce_type));
      break;
    case "priceHigh":
      filtered.sort((a, b) => b.current_price_per_unit - a.current_price_per_unit);
      break;
    case "priceLow":
      filtered.sort((a, b) => a.current_price_per_unit - b.current_price_per_unit);
      break;
    case "trustScore":
      filtered.sort((a, b) => b.farmer_trust_score_percent - a.farmer_trust_score_percent);
      break;
    default:
      // Keep default order
      break;
  }

  return filtered;
};

export const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setListings: (state, action: PayloadAction<ProduceListing[]>) => {
      state.listings = action.payload;
      state.filteredListings = filterAndSortListings(
        action.payload,
        state.searchQuery,
        state.categoryFilter,
        state.sortBy
      );
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.currentPage = 1; // Reset to first page
      state.filteredListings = filterAndSortListings(
        state.listings,
        action.payload,
        state.categoryFilter,
        state.sortBy
      );
    },

    setCategoryFilter: (state, action: PayloadAction<string>) => {
      state.categoryFilter = action.payload;
      state.currentPage = 1; // Reset to first page
      state.filteredListings = filterAndSortListings(
        state.listings,
        state.searchQuery,
        action.payload,
        state.sortBy
      );
    },

    setSortBy: (state, action: PayloadAction<string>) => {
      state.sortBy = action.payload;
      state.currentPage = 1; // Reset to first page
      state.filteredListings = filterAndSortListings(
        state.listings,
        state.searchQuery,
        state.categoryFilter,
        action.payload
      );
    },

    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    clearFilters: (state) => {
      state.searchQuery = "";
      state.categoryFilter = "All";
      state.sortBy = "default";
      state.currentPage = 1;
      state.filteredListings = filterAndSortListings(
        state.listings,
        "",
        "All",
        "default"
      );
    },

    updateListing: (state, action: PayloadAction<ProduceListing>) => {
      const index = state.listings.findIndex(listing => listing.id === action.payload.id);
      if (index !== -1) {
        state.listings[index] = action.payload;
        state.filteredListings = filterAndSortListings(
          state.listings,
          state.searchQuery,
          state.categoryFilter,
          state.sortBy
        );
      }
    },

    removeListing: (state, action: PayloadAction<number>) => {
      state.listings = state.listings.filter(listing => listing.id !== action.payload);
      state.filteredListings = filterAndSortListings(
        state.listings,
        state.searchQuery,
        state.categoryFilter,
        state.sortBy
      );
    },
  },
});

export const {
  setLoading,
  setError,
  setListings,
  setSearchQuery,
  setCategoryFilter,
  setSortBy,
  setCurrentPage,
  clearFilters,
  updateListing,
  removeListing,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;
