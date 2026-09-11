export type Verdict = 'BUY' | 'WAIT' | 'SWITCH' | 'NEGOTIATE' | 'DON’T BUY';
export type VerificationStatus = 'VERIFIED' | 'REPORTED' | 'EXPERIMENTAL' | 'EXPIRED';
export type RecordStatus = 'Draft' | 'Active' | 'Needs Review' | 'Suspended' | 'Expired' | 'Archived';
export type Condition = 'new' | 'used' | 'open_box' | 'refurbished' | 'unknown';
export type LoopholeType = 'Price Match' | 'Price Adjustment' | 'Coupon' | 'Cashback' | 'Loyalty Benefit' | 'Credit Card Benefit' | 'Employer Discount' | 'Membership Benefit' | 'Refurbished / Open Box' | 'Trade-In' | 'Rebate' | 'Tax Incentive' | 'Warranty' | 'Purchase Protection' | 'Return Benefit' | 'Financing' | 'Negotiation' | 'Bundle' | 'Timing' | 'Alternative Merchant' | 'Other';
export interface Loophole {
  id: string; title: string; slug: string; summary: string; category: string;
  loophole_type: LoopholeType; trigger: string; purchase_stage: string[];
  product_categories: string[]; merchants: string[]; savings_type: string;
  estimated_savings_min: number | null; estimated_savings_max: number | null;
  requirements: string[]; steps: string[]; difficulty: string; time_required: string | null;
  stackable: boolean; stackable_with: string[]; conflicts_with: string[];
  exclusions: string[]; gotchas: string[]; primary_source_url: string;
  primary_source_name: string; verification_status: VerificationStatus;
  last_verified: string | null; confidence_score: number; status: RecordStatus;
  created_at: string; updated_at: string; conditions: Condition[];
  keywords: string[]; excluded_keywords: string[]; requires_used?: boolean;
  online_only?: boolean; rate?: number;
}
export interface Purchase {
  id: string; product_name: string; product_url: string | null; merchant: string | null; seller: string | null; marketplace: boolean; seller_unconfirmed: boolean;
  current_price: number; condition: Condition; category: string; location: string;
  purchase_stage: string; purchase_timing: 'flexible' | 'soon' | 'today'; created_at: string;
  payment_cards: string[]; memberships: string[]; employer: string | null;
  willing_to_buy_used: boolean; brand_preferences: string[];
  target_card_eligible: boolean; discount_already_applied: boolean; terms_confirmed: boolean;
  alternative: {price: number; url: string; confirmed: boolean; source_type: 'USER_REPORTED'} | null;
}
export interface Outcome {
  id: string; purchase_id: string; loophole_id: string | null;
  action_taken: 'bought' | 'wait' | null; purchase_completed: boolean;
  reported_savings: number | null; success: boolean | null; useful: boolean | null;
  verification_status: 'REPORTED'; created_at: string; updated_at: string;
}
export interface SavingsVerification {
  purchase_id: string; verified_savings: number; evidence_reference: string;
  reviewed_at: string; reviewer: string;
}
