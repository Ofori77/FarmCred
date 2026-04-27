export interface InvestmentReport{
  id: number;
  investor: string;
  project: string;
  amount: number;
  returns: string;
  status: string;
  startDate: string;
  endDate: string;
  notes: string;
  repayment: string;
};

export interface Announcement{
  id: number;
  title: string;
  message: string;
  audience:"All Users | Farmers | Investors"
  status: "Delivered | Pending | Failed"
  date: string;
}

export interface ReportOptions{
  key: "monthly-platform | user-growth | loan-performance | investment-returns | trust-changes"
  title: string;
  description: string;
  metric: string;
}
export interface ScheduledReport{
  id: string;
  reportKey: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  time: string; // HH:MM
  recipients: string;
  enabled: boolean;
  nextRun: string;
};

export interface Transactions{
    id: string;
    user: string;
    amount: number;
    type: "Loan Payout | Produce Sale | Repayment";
    status: "Successful | Failed";
    date: string;
    flagged: boolean;
}
export interface InvestorDetail {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  total_investments: number;
  created_at: string;
  is_active: boolean;
  investments: {
    project: string;
    amount: number;
    date: string;
  }[];
}

export interface Roles{
    name: string;
    permissions: string[];
    active: boolean;
}

export interface Logs{
    admin: string;
    action: string;
    timestamp: string;
}

export interface Admin{
  id:number;
  name:string;
  email: string;
  role:string;
}

export interface LenderProfile{
    id: number;
    full_name: string;
    email: string;
    phone_number: number;
    total_loans_issued_by_platform: number;
    total_repayments_received_by_platform: number;
  }

export interface LenderLoans{
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

export interface InvestorProfile{
  account: number;
  full_name:string;
  phone_number?: number;
  country?: string;
  region?: string;
  created_at: string;
  updated_at?: number;
  farmers?: string[];
  farmers_reviewed?: number; //farmers invested in and reviewed 
  farmers_funded?: number; // farmers funded
  total_investments: number; //total amount invested
  return_on_investments?:number; // calculated price on how much an investor gets after investing 
  email: string;
  bio?: string;
  password?: string;
  showPassword?: boolean;
}

export interface ApiFilters {
  // General filters
  search?: string;
  category?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  date_range?: string;
  ordering?: string;
  
  // User filters
  role?: string;
  is_active?: string | boolean;
  
  // Order filters
  payment_status?: string;
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
  
  // Loan filters
  lender_type?: string;
  
  // Transaction filters
  transaction_type?: string;
  
  // Pagination
  page?: number;
  limit?: number;
}

//Backend Data
export interface Profile{
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  total_loans_issued_by_platform: number;
  total_repayments_received_by_platform: number;
}

export interface Loans{
  id: number;
  lender_full_name: string;
  farmer_full_name: string;
  roi: number;
  amount: number;
  date_taken: string;
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

export interface Orders{
  id: number;
  buyer: number;
  buyer_full_name: string;
  farmer: number;
  farmer_full_name: string;
  produce_type:string
  quantity: number;
  unit_of_measure: 'pieces' | 'kg' | 'crates';
  total_amount: number;
  order_date: string;
  status: 'disputed' | 'paid_to_escrow' | 'completed';
  delivery_date: string;
  created_at: string;
  updated_at: string;
}

export interface Overview{
  total_funds_in_escrow: number;
  total_active_orders: number;
  total_disputed_orders: number;
  total_completed_orders_last_30_days: number;
  total_transactions_value_last_30_days: number;
  new_farmers_last_30_days: number;
  new_buyers_last_30_days: number;
}

// New Admin Dashboard Types
export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  role: 'farmer' | 'investor' | 'buyer' | 'admin' | 'platform_lender' | 'platform_escrow';
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_activity?: string;
  profile_type: string;
  trust_score?: number;
  total_investments?: number;
  total_orders?: number;
  total_loans?: number;
  farmer_profile?: {
    trust_level_stars?: number;
    trust_score_percent?: number;
    produce?: string[];
    is_discoverable_by_investors?: boolean;
  };
  investor_profile?: {
    total_invested?: number;
  };
  buyer_profile?: any;
}

export interface AdminOrder {
  id: number;
  buyer: number;
  buyer_name: string;
  farmer: number;
  farmer_name: string;
  produce_type: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'disputed';
  delivery_date?: string;
  is_paid: boolean;
  is_delivered: boolean;
  is_disputed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminTransaction {
  id: number;
  transaction_id: string;
  user_name: string;
  user_role: string;
  amount: number;
  transaction_type: 'loan_payout' | 'produce_sale' | 'repayment' | 'investment' | 'platform_fee';
  status: 'successful' | 'pending' | 'failed';
  created_at: string;
  order_id?: number;
  loan_id?: number;
  description?: string;
}

export interface AdminEscrowOverview {
  total_escrow_balance: number;
  pending_releases: number;
  held_funds: number;
  recent_transactions: AdminTransaction[];
  monthly_volume: number;
  dispute_funds: number;
}

export interface AdminTrustAnalytics {
  average_trust_score: number;
  total_farmers: number;
  monthly_reviews_count: number;
  
  // Updated to match the page exactly
  trust_level_distribution: {
    level_5_stars: number;
    level_4_stars: number;
    level_3_stars: number;
    level_2_stars: number;
    level_1_stars: number;
  };
  
  // Updated to match the page exactly
  recent_reviews: {
    id: number;
    investor_name: string;
    farmer_name: string;
    created_at: string;
  }[];
}

export interface AdminLoan {
  id: number;
  loan_id: string;
  farmer_name: string;
  lender: number;
  lender_name: string;
  lender_type: 'platform' | 'investor';
  amount: number;
  interest_rate: number;
  status: 'active' | 'completed' | 'defaulted' | 'pending';
  disbursed_date: string;
  date_taken: string;
  due_date: string;
  repaid_date?: string;
  remaining_balance: number;
  trust_score_at_approval: number;
}

export interface AdminDashboardStats {
  // Platform Lender Dashboard Stats structure (actual API response)
  total_funds_in_escrow?: number;
  total_active_orders?: number;
  total_disputed_orders?: number;
  total_completed_orders_last_30_days?: number;
  total_transaction_value_last_30_days?: number;
  new_farmers_last_30_days?: number;
  new_buyers_last_30_days?: number;
  
  // The following are from other potential endpoints or future expansions
  // Making them all optional to avoid type errors
  user_metrics?: {
    total_farmers: number;
    total_investors: number;
    total_buyers: number;
    active_users_30d: number;
    new_users_30d: number;
  };
  financial_metrics?: {
    total_transaction_volume: number;
    monthly_revenue: number;
    total_loans_issued: number;
    total_investments: number;
    escrow_balance: number;
  };
  order_metrics?: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    disputed_orders: number;
    orders_growth_30d: number;
  };
  trust_metrics?: {
    average_trust_score: number;
    trust_warnings: number;
    recent_disputes: number;
  };
}

export interface AdminDispute {
  id: number;
  order_id: number;
  order_details: {
    farmer_name: string;
    buyer_name: string;
    product_name: string;
    amount: number;
  };
  dispute_reason: string;
  raised_by: string;
  raised_at: string;
  status: 'open' | 'under_review' | 'resolved';
  resolution?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  dispute_date: string;
}

export interface BulkActionRequest {
  user_ids?: number[];
  order_ids?: number[];
  action: 'activate' | 'deactivate' | 'change_role' | 'confirm' | 'mark_ready' | 'cancel';
  new_role?: string;
  reason?: string;
}