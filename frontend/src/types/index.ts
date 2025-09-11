export type Beneficiary = {
  id: string;
  type: "individual" | "business";
  name: string;
  email?: string;
  country?: string;
  created_at?: string;
};

export type Destination = {
  id: string;
  type: "bank_account" | "card";
  label: string;
  last4?: string;
  currency: string;
  country?: string;
  status: "unverified" | "verified";
  account_number?: string;
  routing_number?: string;
  iban?: string;
  bic?: string;
};

export type PayoutCreate = {
  beneficiary_id: string;
  destination_id: string;
  amount: number;
  currency: string;
  memo?: string;
};

export type Payout = {
  id: string;
  status: "pending" | "processing" | "paid" | "failed" | "canceled";
  amount: number;
  currency: string;
  beneficiary: Beneficiary;
  destination: Destination;
  memo?: string;
  external_id?: string;
  failure_code?: string;
  failure_message?: string;
  created_at: string;
  idempotency_key: string;
  stripe_payout_id?: string;
  stripe_balance_transaction?: string;
  arrival_date?: string;
  processed_at?: string;
};

export type ConnectedAccount = {
  id: string;
  type: "express" | "standard";
  country: string;
  email?: string;
  business_type?: string;
  business_name?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: any;
  created: number;
  is_default: boolean;
};

export type BankAccountCreate = {
  account_number: string;
  routing_number?: string;
  iban?: string;
  bic?: string;
  currency: string;
  country: string;
  account_holder_name: string;
  account_holder_type: "individual" | "company";
};

export type ExternalAccount = {
  id: string;
  bank_name: string;
  last4: string;
  currency: string;
  country: string;
  status: string;
  default_for_currency: boolean;
};

export type Currency = {
  code: string;
  name: string;
  priority: number;
  country: string;
};

export type UserProfile = {
  user_id: number;
  email_hash: string;
  name?: string;
  email?: string;
  picture?: string;
};