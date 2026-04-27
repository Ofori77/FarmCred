import {useState, useEffect, useCallback} from 'react';
import { farmerProductService } from '@/lib/api/farmerproduct';
import { ApiFilters, FarmerProduct, FarmerProductInput } from '@/lib/types/farmertypes';

export function useFarmerProducts(filters?: ApiFilters) {
  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmerProductService.getFarmerProducts();
      // Ensure data is always an array
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      setProducts([]); // Ensure products is always an array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

//Farmer Products Hook with Filters
export function useFilteredFarmerProducts(filters?: ApiFilters) {
  const [products, setProducts] = useState<FarmerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilteredProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await farmerProductService.getFarmerProducts();
      // Apply filters if provided
      const filteredData = filters
        ? data.filter(product => {
            return Object.keys(filters).every(key => 
              product[key as keyof FarmerProduct] === filters[key as keyof ApiFilters]
            );
          })
        : data;
      setProducts(filteredData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [fetchFilteredProducts]);

  return { products, loading, error, refetch: fetchFilteredProducts };
}

//Add New Farmer Product Hook
export function useCreateFarmerProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = async (payload: FarmerProductInput) => {
    try {
      setLoading(true);
      setError(null);
      const newProduct = await farmerProductService.createFarmerProduct(payload);
      return newProduct;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  return { createProduct, loading, error };
}

//Update Farmer Product Prices Hook
export function useUpdateFarmerProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProduct = async (name: string, payload: Partial<Omit<FarmerProduct, 'name'>>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProduct = await farmerProductService.updateFarmerProduct(name, payload);
      return updatedProduct;
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  return { updateProduct, loading, error };
}

//Delete Farmer Product Hook
export function useDeleteFarmerProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProduct = async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      await farmerProductService.deleteFarmerProduct(name);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  return { deleteProduct, loading, error };
}