// src/lib/signals/types.ts
// Shared types for the signal detection engine.
// Module 2 never imports from the LLM layer — direction is always upward.

export type SignalCode =
  | 'RECEIVABLES_AGING'
  | 'CASH_FLOW_VOLATILITY'
  | 'SEASONAL_DIP_APPROACHING'
  | 'UNDERUTILIZED_CREDIT'
  | 'LOAN_MATURITY_UPCOMING'
  | 'PAYROLL_STRESS'
  | 'GROWTH_SPURT';

export type SignalType = 'stress' | 'opportunity';
export type Severity   = 'low' | 'medium' | 'high';

export interface DetectorInput {
  businessId:   string;
  transactions: Array<{
    date:      Date;
    amount:    number; // already parsed from Decimal
    direction: string;
    category:  string;
  }>;
  accounts: Array<{
    accountType: string;
    balance:     number;
    creditLimit: number | null;
  }>;
  loans: Array<{
    maturityDate: Date;
    status:       string;
    productType:  string;
    outstanding:  number;
  }>;
  lastInteractionDate: Date | null;
}

export interface DetectorResult {
  code:        SignalCode;
  type:        SignalType;
  severity:    Severity;
  metricValue: number;
  metricLabel: string;
}
