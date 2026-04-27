// Backend API Types
export interface ProduceListing {
  id: number;
  farmer: number;
  farmer_full_name: string;
  produce_type: string;
  quantity_available: number;
  unit_of_measure: 'kg' | 'pieces' | 'crates' | 'bags';
  base_price_per_unit: number;
  discount_percentage: number;
  current_price_per_unit: number;
  location_description: string;
  available_from: string;
  available_until: string;
  status: 'active' | 'sold' | 'inactive' | 'expired' | 'deleted';
  image_url: string;
  created_at: string;
  updated_at: string;
  farmer_trust_level_stars: number;
  farmer_trust_score_percent: number;
}

export interface Order {
  id: number;
  buyer: number;
  farmer: number;
  produce_listing: number;
  quantity: number;
  total_amount: number;
  delivery_date: string;
  status: 'pending_payment' | 'paid_to_escrow' | 'farmer_confirmed_delivery' | 'buyer_confirmed_receipt' | 'completed' | 'dispute' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  dispute_status?: 'none' | 'raised' | 'under_review' | 'resolved';
  escrow_release_date?: string;
  created_at: string;
  updated_at: string;
  // Expanded fields
  buyer_full_name?: string;
  farmer_full_name?: string;
  produce_type?: string;
  farmer_trust_level_stars?: number;
}

export interface Conversation {
  id: number;
  buyer: number;
  farmer: number;
  produce_listing: number;
  created_at: string;
  updated_at: string;
  // Expanded fields
  buyer_full_name?: string;
  farmer_full_name?: string;
  produce_type?: string;
  last_message?: string;
  last_message_timestamp?: string;
}

export interface Message {
  id: number;
  conversation: number;
  sender: number;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_full_name?: string;
}

export interface BuyerReview {
  id: number;
  order: number;
  buyer: number;
  farmer: number;
  rating: number;
  comment: string;
  created_at: string;
  buyer_full_name?: string;
  farmer_full_name?: string;
  produce_type?: string;
}

// Input Types
export interface SendMessageInput {
  message: string;
}

export interface CreateListingInput {
  produce_type: string;
  quantity_available: number;
  unit_of_measure: 'kg' | 'pieces' | 'crates' | 'bags';
  base_price_per_unit: number;
  discount_percentage?: number;
  location_description: string;
  available_from: string;
  available_until: string;
  image_url?: string;
}

export interface InitiateOrderInput {
  listing_id: number;
  quantity: number;
  delivery_date: string;
}

export interface CreateReviewInput {
  order_id: number;
  rating: number;
  comment: string;
}

// Legacy Product interface for backward compatibility
export interface Product {
  id: number;
  name: string;
  imageURL: string;
  price: number;
  description: string;
  farmerName: string;
  category: "Grains" | "Tubers" | "Vegetables" | "Fruits";
  quantity?: string;
  delivery?: string;
  stock?: number;
}

// Cart Types
export interface CartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  farmerName: string;
  description: string;
  unit_of_measure: string;
  max_quantity: number;
  delivery_date?: string;
}

export interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
  isInCart: (id: number) => boolean;
  updateQuantity: (id: number, delta: number) => void;
  updateDeliveryDate: (id: number, date: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
}

export interface BuyerOrders {
  id: number;
  name: string;
  image: string;
  price: number;
  status: "Delivered" | "Out for Delivery" | "Preparing";
}

export interface BuyerProfile {
  account_id: number;
  full_name: string;
  phone_number: string;
  email: string;
  country: string;
  region: string;
  receive_level_notifications: boolean;
  receive_sms_notifications: boolean;
  receive_email_notifications: boolean;
}

export interface BuyerTransaction {
  id: number;
  account_party_full_name: string;
  buyer_full_name: string;
  farmer_full_name: string;
  name: string;
  date: string;
  category: string;
  status: 'income' | 'expense';
  amount: number;
  description: string;
  created_at: string;
  updated_at: string;
  account_party: number;
  buyer: number;
}

export interface ApiFilters {
  category?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  produce_type?: string;
  location?: string;
  price_min?: number;
  price_max?: number;
}

//Backend Data 
export interface FarmerListings {
  id: number;
  farmer: number;
  farmer_full_name: string;
  produce_type: string;
  quantity_available: number;
  unit_of_measure: 'kg' | 'pieces' | 'crates' | 'bags';
  base_price_per_unit: number;
  discount_percentage: number;
  current_price_per_unit: number;
  location_description: string;
  available_from: string;
  available_until: string;
  status: 'active' | 'sold' | 'inactive' | 'expired' | 'deleted';
  image_url: string;
  created_at: string;
  updated_at: string;
  farmer_trust_level_stars: number;
  farmer_trust_score_percent: number;
}