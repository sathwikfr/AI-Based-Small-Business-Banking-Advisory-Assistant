import { Business, Signal, PolicyReference } from '@prisma/client';
import { SynthesisProvider, SignalExplanation, NBAResult } from './types';
import { MockSynthesisProvider } from './mockProvider';
import { GoogleGenAI } from '@google/genai';

export class GeminiSynthesisProvider implements SynthesisProvider {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async explainSignals(signals: Signal[]): Promise<SignalExplanation[]> {
    if (!signals.length) return [];
    
    const prompt = `Explain the following business health signals for a Relationship Manager in one short, plain-language sentence each.
    
Signals:
${JSON.stringify(signals, null, 2)}

Return ONLY valid JSON matching this schema:
[
  { "signalId": "string", "explanation": "string" }
]`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '[]';
      // Basic JSON extraction if markdown block is present
      const jsonStr = text.replace(/```json\n?|\n?```/gi, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Gemini API Error in explainSignals:', e);
      return new MockSynthesisProvider().explainSignals(signals);
    }
  }

  async generateNBA(business: Business, signals: Signal[], policies: PolicyReference[]): Promise<NBAResult[]> {
    const prompt = `Act as an expert banking advisory system.
Based on the following business profile, active signals, and credit policies, generate 1 to 2 Next-Best-Action (NBA) recommendations for the Relationship Manager.

Business: ${JSON.stringify(business)}
Signals: ${JSON.stringify(signals)}
Policies: ${JSON.stringify(policies)}

Rules:
1. ONLY recommend products that exist in the provided Credit Policies.
2. The rationale must explicitly reference the specific metrics from the signals.
3. Keep the description under 15 words.
4. Provide up to 2 recommendations.
5. If no action is needed, return an empty array [].

Return ONLY valid JSON matching this schema:
[
  {
    "title": "Short title",
    "description": "Short description",
    "rationale": "Why we recommend this",
    "triggeringSignalIds": ["id1", "id2"],
    "suggestedProductType": "optional product type from policies"
  }
]`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonStr = text.replace(/```json\n?|\n?```/gi, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Gemini API Error in generateNBA:', e);
      return new MockSynthesisProvider().generateNBA(business, signals, policies);
    }
  }

  async generateCustomerSummary(business: Business, signals: Signal[], nbaList: NBAResult[]): Promise<string> {
    const prompt = `Act as a helpful banking assistant writing a note for a small business owner.
Summarize their current account status based on the following data. Keep it under 100 words.
Do not use alarming language. Do not mention "signals" or "internal metrics".
Tone: professional, reassuring, and helpful.

Business: ${business.name}
Signals: ${JSON.stringify(signals)}
Next Best Actions recommended internally: ${JSON.stringify(nbaList)}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || new MockSynthesisProvider().generateCustomerSummary(business, signals, nbaList);
    } catch (e) {
      console.error('Gemini API Error in generateCustomerSummary:', e);
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

    try {
      // Map OpenAI/Claude style roles to Gemini roles ('user' or 'model')
      const formattedMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedMessages,
        config: { systemInstruction: systemPrompt },
      });

      return response.text || 'Error: unexpected response type from Gemini.';
    } catch (e) {
      console.error('Gemini API Error in chat:', e);
      return 'Sorry, I encountered an error communicating with the AI service.';
    }
  }
}
