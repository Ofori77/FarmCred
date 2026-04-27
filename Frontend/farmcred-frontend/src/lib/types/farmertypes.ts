
export interface FarmerProfile {
  id?: number;
  account_id: number;
  email: string;
  full_name: string;
  phone_number: string;
  country: string;
  region: string;
  dob: string;
  national_id: string;
  home_address: string;
  produce: string[];
  trust_level_stars: number;
  trust_score_percent: number;
  total_income_last_12_months: number;
  is_discoverable_by_investors: boolean;
  receive_level_notifications: boolean;
  receive_sms_notifications: boolean;
  receive_email_notifications: boolean;
}

export interface FarmerOverview {
  id: number;
  full_name: string;
  trust_level_stars: number;
  trust_score_percent: number;
  total_income_last_12_months: number;
  total_expenses: number;
  current_month_income: number;
  current_month_expenses: number;
  total_loans_taken: number;
  active_loans: number;
  overdue_loans: number;
}

export interface Transaction {
  id: number;
  account_party_full_name: string;
  buyer_full_name: string;
  farmer_full_name: string;
  name: string;
  description: number;
  amount: number;
  category: string;
  status: 'income' | 'expense';
  date: string;
  created_at: string;
  updated_at: string;
  buyer: string;
  related_order: string;
  account_party: number;
}

export interface TransactionInput {
  amount: number;
  category: string;
  description: string;
  status: 'income' | 'expense';
  date: string;
}

export interface Transfer {
  length: number;
  recipient_or_sender: any;
  id: number;
  transfer_id : string;
  farmer: number;
  amount: number;
  recipient: string;
  type: 'sent' | 'received';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}


export interface TransferInput {
  amount: number;
  recipient_or_sender: string;
  type: 'sent' | 'received';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description?: string;
}

export interface ChartData {
  period: string;
  month: string;
  income: number;
  expenses: number;
}

export interface TrustBreakdown {
  id: number;
  trust_level_stars: number;
  trust_score_percent: number;
  total_loans_taken: number;
  on_time_repayment: number;
  missed_repayment: number;
  total_income_last_12_months: number;
  income_consistency_months: number;
  average_monthly_income: number;
  payment_history: Array<{
    month: string;
    on_time: number;
    missed: number;
  }>;
}

export interface FarmerLoans{
      id: number;
      lender_full_name: string;
      farmer_full_name: string;
      amount: number,
      date_taken: string;
      due_date: string;
      date_repaid: string;
      status:'pending' | 'approved' | 'repaid' | 'declined' | 'active';
      on_time: boolean;
      interest_rate: number;
      repayment_period_months: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      farmer: number;
      lender: number;
}

export interface FarmerDiscoverability {
  is_discoverable_by_investors: boolean; // Indicates if the farmer is discoverable by investors
  message: string; // Message indicating the current state or action taken    
}

export interface StatLogs{
  message: string;
}

export interface FarmerOrder{
  id: number;
  product: string;
  buyerName: string;
  quantity: number;
  price: number;
  status: "paid" | "delivered" | "completed";
};

export interface FarmerProduct {
  dateAdded: string;
  imageUrl: string;
  name: string;
  price: number;
}

export interface FarmerProductInput {
  image?: File | null;
  name: string;
  price: number;
}

export interface DisputedOrder {
  id: number;
  produce_listing?: {
    produce_type: string;
  };
  reason: string;
  created_at: string;
  resolution_status: string;
  comments?: Comment[];
  timeline?: TimelineEvent[];
};

export interface TimelineEvent{
  id: number;
  action: string;
  performed_by: string;
  timestamp: string;
};

export interface Comment{
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

/* Messages between farmer and buyer*/
export interface Message{
  id: number;
  sender: string;
  content: string;
  timestamp: string;
}

export interface Conversation{
  id: number;
  buyerName: string;
}

export interface RepaymentConfirmationPayload {
  loan_id: number;
  amount_confirmed: number;
}

export interface RepaymentConfirmationResponse {
  message: string;
  confirmation_id?: string;
}

export interface LoanQualificationResponse{

}

export interface LoanRequestPayload{

}

export interface LoanRequestResponse{

}

export interface Conversation{
  id: number;
  buyerName: string;
}

export interface ApiFilters {
  category?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}