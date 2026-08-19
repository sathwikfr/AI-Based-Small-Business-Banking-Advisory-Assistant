// src/lib/llm/schemas.ts
// Zod schemas for Claude structured output validation.
// Every next-best-action MUST cite at least one signalId — enforced at schema level.

import { z } from 'zod';

export const SignalExplanationSchema = z.object({
  signalId:    z.string(),
  explanation: z.string().max(240),
});

export const NextBestActionSchema = z.object({
  title:               z.string().max(100),
  rationale:           z.string().max(300),
  triggeringSignalIds: z.array(z.string()).min(1), // schema-enforced — no action without a signal
  suggestedProductType: z
    .enum(['working_capital', 'invoice_financing', 'overdraft', 'term_loan'])
    .nullable(),
  priority: z.number().int().min(1).max(3),
});

export const NBAOutputSchema = z.object({
  signalExplanations: z.array(SignalExplanationSchema),
  nextBestActions:    z.array(NextBestActionSchema).max(3),
});

export type NBAOutput = z.infer<typeof NBAOutputSchema>;

export const CustomerSummarySchema = z.object({
  summary: z.string().max(900), // ~120 words max
});
export type CustomerSummaryOutput = z.infer<typeof CustomerSummarySchema>;
