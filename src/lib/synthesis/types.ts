import { Business, Signal, PolicyReference } from '@prisma/client';

export interface SignalExplanation {
  signalId: string;
  explanation: string;
}

export interface NBAResult {
  title: string;
  description: string;
  rationale: string;
  triggeringSignalIds: string[];
  suggestedProductType?: string;
}

export interface SynthesisProvider {
  explainSignals(signals: Signal[]): Promise<SignalExplanation[]>;
  generateNBA(business: Business, signals: Signal[], policies: PolicyReference[]): Promise<NBAResult[]>;
  generateCustomerSummary(business: Business, signals: Signal[], nbaList: NBAResult[]): Promise<string>;
  chat(messages: { role: string; content: string }[], contextData: { business?: Business; signals?: Signal[]; policies?: PolicyReference[] }): Promise<string>;
}
