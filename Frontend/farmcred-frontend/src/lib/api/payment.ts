import apiClient from "../axios";

export const paymentService = {
  // --- Order Management ---
  async initiateOrder(data: { produce_listing_id: number; quantity: number; delivery_date?: string }) {
    const res = await apiClient.post("/api/payments/orders/initiate/", data);
    return res.data;
  },

  async confirmPayment(orderId: number, payload: { status: string; transaction_reference: string }) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/payment-callback/`, payload);
    return res.data;
  },

  async confirmDelivery(orderId: number) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/confirm-delivery/`);
    return res.data;
  },

  async confirmReceipt(orderId: number) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/confirm-receipt/`);
    return res.data;
  },

  async cancelOrder(orderId: number) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/cancel/`);
    return res.data;
  },

  async getOrderDetail(orderId: number) {
    const res = await apiClient.get(`/api/payments/orders/${orderId}/`);
    return res.data;
  },

  async getMyOrders() {
    const res = await apiClient.get("/api/payments/my-orders/");
    return res.data;
  },

  // --- Reviews ---
  async createReview(data: { order: number; rating: number; comment: string }) {
    const res = await apiClient.post("/api/payments/reviews/", data);
    return res.data;
  },

  async getMyReviews() {
    const res = await apiClient.get("/api/payments/my-reviews/");
    return res.data;
  },

  // --- Disputes ---
  async raiseDispute(orderId: number, reason: string) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/raise-dispute/`, { reason });
    return res.data;
  },

  async resolveDispute(orderId: number, payload: { resolution_type: string; amount_to_farmer?: number; resolution_notes?: string }) {
    const res = await apiClient.post(`/api/payments/orders/${orderId}/resolve-dispute/`, payload);
    return res.data;
  },
};
