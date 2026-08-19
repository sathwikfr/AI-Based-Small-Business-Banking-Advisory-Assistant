import { Business, Signal, PolicyReference } from '@prisma/client';
import { SynthesisProvider, SignalExplanation, NBAResult } from './types';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy',
});

// We keep the old schemas for validation if needed, but adapt to the new interface

export class ClaudeSynthesisProvider implements SynthesisProvider {
  async explainSignals(signals: Signal[]): Promise<SignalExplanation[]> {
    if (!signals.length) return [];
    
    // In a real implementation we would batch call Claude to generate explanations,
    // For now we'll do a simplified pass or fallback to mock if no key
    // Given the hackathon constraints, we can just stub this to use mock logic
    // or actually call the API if needed.
    
    // For this build, we will simulate a real call structure
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: "You are a banking analyst. Explain these financial signals in 1-2 sentences each, citing the metric value.",
        messages: [{
          role: 'user',
          content: JSON.stringify(signals)
        }]
      });
      // This is a stub for the hackathon. A full implementation would parse JSON out of Claude.
      throw new Error("Full Claude parsing not implemented in hackathon stub");
    } catch (e) {
      console.warn("Falling back to Mock explanation due to error or missing key");
      // Fallback to Mock
      const { MockSynthesisProvider } = require('./mockProvider');
      return new MockSynthesisProvider().explainSignals(signals);
    }
  }

  async generateNBA(business: Business, signals: Signal[], policies: PolicyReference[]): Promise<NBAResult[]> {
    try {
      // Stub implementation calling the real API
      const msg = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: "You are an AI Relationship Manager assistant. Suggest next best actions based on signals and policies.",
        messages: [{
          role: 'user',
          content: `Business: ${business.name}\nSignals: ${JSON.stringify(signals)}\nPolicies: ${JSON.stringify(policies)}`
        }]
      });
      throw new Error("Full Claude parsing not implemented in hackathon stub");
    } catch (e) {
      const { MockSynthesisProvider } = require('./mockProvider');
      return new MockSynthesisProvider().generateNBA(business, signals, policies);
    }
  }

  async generateCustomerSummary(business: Business, signals: Signal[], nbaList: NBAResult[]): Promise<string> {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: "You are a professional banking relationship manager. Write a concise 120-word summary email for the client based on these signals and recommendations.",
        messages: [{
          role: 'user',
          content: `Business: ${business.name}\nSignals: ${JSON.stringify(signals)}\nRecommendations: ${JSON.stringify(nbaList)}`
        }]
      });
      return (msg.content[0] as any).text;
    } catch (e) {
      const { MockSynthesisProvider } = require('./mockProvider');
      return new MockSynthesisProvider().generateCustomerSummary(business, signals, nbaList);
    }
  }

  async chat(messages: { role: string; content: string }[], contextData: { business?: Business; signals?: Signal[]; policies?: PolicyReference[] }): Promise<string> {
    const systemPrompt = `You are the Vantage RM Copilot, an AI banking assistant for Relationship Managers.
Context:
Business Name: ${contextData.business?.name || 'Unknown'}
Active Signals: ${JSON.stringify(contextData.signals || [])}
Credit Policies: ${JSON.stringify(contextData.policies || [])}

Rules:
1. Always be professional, concise, and helpful.
2. Rely strictly on the provided signals and credit policies.
3. If asked for recommendations, only suggest products listed in the policies.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages as any,
    });

    const block = response.content[0];
    if (block.type === 'text') {
      return block.text;
    }
    return 'Error: unexpected response type from Claude.';
  }
}
