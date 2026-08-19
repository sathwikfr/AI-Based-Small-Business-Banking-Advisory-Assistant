// src/lib/llm/claude.ts
// Claude API wrapper for Vantage.
// Rule: never pass raw transactions to Claude — only pre-computed signals + policy references.

import Anthropic from '@anthropic-ai/sdk';
import { NBAOutputSchema, NBAOutput, CustomerSummarySchema } from './schemas';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = 'claude-sonnet-4-5';

interface SignalPayload {
  id:          string;
  code:        string;
  type:        string;
  severity:    string;
  metricValue: string;
  metricLabel: string;
}

interface PolicyPayload {
  productType: string;
  title:       string;
  summary:     string;
  eligibility: string;
}

interface BusinessProfile {
  name:             string;
  businessType:     string;
  monthlyRevenueAvg: string;
}

// ── NBA + Explanation ─────────────────────────────────────────────────────────

const NBA_SYSTEM_PROMPT = `You are a banking advisory assistant helping a Relationship Manager (RM) support small business clients. You are NOT talking to the customer directly.

You will receive:
1. A business profile
2. A list of detected financial signals with their computed metric values
3. Relevant product policy references for grounding

Your task:
- Write a one-sentence plain-language explanation per signal (signalExplanations)
- Produce 2-3 ranked next-best-actions the RM could take (nextBestActions)
- Every action MUST cite at least one signalId from the list — never recommend anything without a data-backed signal
- If no signals are provided, return empty arrays — do NOT invent reasons to recommend products
- Never invent or modify numbers — only reference metric values given to you exactly
- Use advisory language, not promotional language. This is guidance, not sales.
- If a suggestedProductType is appropriate, pick one from: working_capital, invoice_financing, overdraft, term_loan — or null if no product applies
- Output strict JSON matching this schema exactly, no markdown, no extra text:

{
  "signalExplanations": [{"signalId": "...", "explanation": "..."}],
  "nextBestActions": [{"title": "...", "rationale": "...", "triggeringSignalIds": ["..."], "suggestedProductType": "...|null", "priority": 1}]
}`;

export async function generateNBAExplanation(
  business: BusinessProfile,
  signals:  SignalPayload[],
  policies: PolicyPayload[]
): Promise<NBAOutput> {
  if (signals.length === 0) {
    return { signalExplanations: [], nextBestActions: [] };
  }

  const userMessage = JSON.stringify({
    businessProfile: business,
    signals,
    policyReferences: policies,
  });

  async function attempt(): Promise<NBAOutput> {
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 1200,
      system:     NBA_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);
    return NBAOutputSchema.parse(parsed);
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.warn('[Claude] First attempt failed, retrying once:', firstError);
    try {
      return await attempt();
    } catch (secondError) {
      console.error('[Claude] Both attempts failed:', secondError);
      throw new Error('Failed to generate advisory explanation after 2 attempts');
    }
  }
}

// ── Customer Summary ──────────────────────────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `You are helping a bank Relationship Manager prepare a short, professional message they can read aloud or send to their small business client.

Convert the advisory data provided into a warm, plain-language summary:
- Maximum 120 words
- No financial jargon
- No product pitches or promotional language
- Focus on what is happening in their business and how the bank can help if they want to talk
- Warm and professional tone, as if the RM is speaking directly to the business owner
- Output strict JSON: {"summary": "..."}`;

export async function generateCustomerSummary(
  business: BusinessProfile,
  signals:  SignalPayload[],
  actions:  Array<{ title: string; rationale: string }>
): Promise<string> {
  const userMessage = JSON.stringify({ businessProfile: business, signals, suggestedActions: actions });

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 400,
    system:     SUMMARY_SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text);
  return CustomerSummarySchema.parse(parsed).summary;
}
