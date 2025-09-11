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
};
