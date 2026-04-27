//account involved in a confirmation
export interface ConfirmationAccount {
  id: number;
  full_name: string;
  phone_number: string;
  role: 'farmer' | 'buyer' | 'investor';
}

//data payload for initiating a produce purchase
export interface InitiatePurchasePayload {
  farmer_id: number;
  product_name: string;
  quantity: number;
  total_amount: number;
}

//data payload for accepting/denying a confirmation
export interface ConfirmationActionPayload {
  action: 'accept' | 'deny';
  pin?: string; 
}

// The main object for a pending confirmation request
export interface PendingConfirmation {
  pk: number;
  confirmation_id: string;
  initiator_account: ConfirmationAccount;
  target_account: ConfirmationAccount;
  request_type: 'PRODUCE PURCHASE CONFIRM' | 'LOAN OFFER' | 'TRUST VIEW REQUEST' | 'LOAN REPAYMENT CONFIRM';
  status: 'pending' | 'confirmed' | 'denied' | 'expired';
  data_context: {
    [key: string]: any; 
  };
  created_at: string;
  expires_at: string;
  request_description?: string; 
}

// Response from the initiate purchase endpoint
export interface InitiatePurchaseResponse {
    message: string;
    confirmation_id: string;
}