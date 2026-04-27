export interface InvestorProfile{
  account_id: number;
  full_name:string;
  bio?: string;
  phone_number?: number;
  country?: string;
  region?: string;
  total_principal_lent: number;
  total_investments?: number; // New field to align with backend
  num_farmers_funded: number;
  farmers_funded?: number; // Alternative naming
  farmers_reviewed?: number; // Number of farmers reviewed
  investor_profit_loss: number;
  email: string;
  receive_level_notifications: boolean;
  receive_email_notifications: boolean;
  receive_sms_notifications: boolean;
}

export interface FarmerProfile {
  id: number;
  account_id: number;
  email: string;
  full_name: string;
  phone_number: string;
  country?: string;
  region: string;
  dob?: string;
  national_id?: string;
  home_address?: string;
  produce: string[];
  trust_level_stars: number;
  trust_score_percent: number;
  total_income_last_12_months: number;
  total_loans: number;
  active_investments: number;
  created_at?: string;
  updated_at?: string;
  receive_level_notifications?: boolean;
  receive_sms_notifications?: boolean;
  receive_email_notifications?: boolean;
  transactions?: any[];
}

export interface InvestorReview{
  id: number;
  farmer_full_name: string;
  farmer_phone_number: number;
  investor: number;
  farmer: number;
  investor_full_name: string;
  created_at: string;
}


export interface InvestorFarmers{
  id: number;
  full_name: string;
  trust_level_stars: number;
  trust_score_percent: number;
  total_income_last_12_months:number;
  current_month_income: number;
  current_month_expenses: number;
  total_loans_taken: number;
  active_loans: number;
  overdue_loans: number;
}

export interface ReviewInput{
  detail: string;
  review_id: number;
}

export interface InvestorLoans{
      id: number;
      lender_full_name: string;
      farmer_full_name: string;
      amount: number,
      date_taken: string;
      due_date: string;
      date_repaid: string;
      status:'pending' | 'approved' | 'repaid' | 'declined' | 'active' | 'cancelled';
      on_time: boolean;
      interest_rate: number;
      repayment_period_months: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      farmer: number;
      lender: number;
}

// Investment type (proper terminology for investor side)
export interface InvestorInvestment{
      id: number;
      lender_full_name: string;
      farmer_full_name: string;
      amount: number,
      date_taken: string;
      due_date: string;
      date_repaid: string | null;
      status:'pending' | 'approved' | 'repaid' | 'declined' | 'active' | 'cancelled';
      on_time: boolean;
      interest_rate: number;
      repayment_period_months: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      farmer: number;
      lender: number;
}

export interface ApiFilters {
  category?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}