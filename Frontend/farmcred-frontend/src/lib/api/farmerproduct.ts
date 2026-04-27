
import apiClient from '../axios';
import { FarmerProduct, FarmerProductInput } from '../types/farmertypes';

export const farmerProductService = {
  // Farmer Products
  async getFarmerProducts(): Promise<FarmerProduct[]> {
    const response = await apiClient.get('/api/ussd-web/farmer/products/');
    return response.data;
  },

  //Adds New Farmer Product
  async createFarmerProduct(data: FarmerProductInput): Promise<FarmerProduct> {
    const form = new FormData();
    form.append('name', data.name);
    form.append('price', String(data.price));
    if (data.image) form.append('image', data.image);
    const response = await apiClient.post('/api/ussd-web/farmer/products/', form,
      { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },

  //Update Farmer Product Prices 
  async updateFarmerProduct(name: string, data: Partial<Omit<FarmerProductInput, 'name'>>): Promise<FarmerProduct> {
    const response = await apiClient.put(`/api/ussd-web/farmer/products/update-price/${name}/`, {price: data.price});
    return response.data;
  },

  //Delete Farmer Product
  async deleteFarmerProduct(name: string): Promise<void> {
    await apiClient.delete(`/api/ussd-web/farmer/products/remove/${name}/`);
  }
};