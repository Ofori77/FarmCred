import apiClient from '../axios';
import {
  InitiatePurchasePayload,
  ConfirmationActionPayload,
  PendingConfirmation,
  InitiatePurchaseResponse,
} from '../types/confirmation';

export const confirmationService = {
  async initiateProducePurchase(payload: InitiatePurchasePayload): Promise<InitiatePurchaseResponse> {
    const response = await apiClient.post('/buyer/initiate-produce-purchase/', payload);
    return response.data;
  },

  async getPendingConfirmations(): Promise<PendingConfirmation[]> {
    const response = await apiClient.get('/pending-confirmations/');
    return response.data;
  },

  async getConfirmationStatus(pk: number): Promise<PendingConfirmation> {
    const response = await apiClient.get(`/pending-confirmations/${pk}/status/`);
    return response.data;
  },

  async confirmRequestAction(pk: number, payload: ConfirmationActionPayload): Promise<{ message: string }> {
    const response = await apiClient.post(`/pending-confirmations/${pk}/action/`, payload);
    return response.data;
  },
};