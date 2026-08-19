import { SynthesisProvider } from './types';
import { MockSynthesisProvider } from './mockProvider';
import { ClaudeSynthesisProvider } from './claudeProvider';
import { GeminiSynthesisProvider } from './geminiProvider';

export const synthesisProvider: SynthesisProvider = 
  process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder'
    ? new GeminiSynthesisProvider()
    : process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder'
      ? new ClaudeSynthesisProvider()
      : new MockSynthesisProvider();
