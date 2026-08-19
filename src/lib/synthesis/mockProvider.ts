import { Business, Signal, PolicyReference } from '@prisma/client';
import { SynthesisProvider, SignalExplanation, NBAResult } from './types';

export class MockSynthesisProvider implements SynthesisProvider {
  async explainSignals(signals: Signal[]): Promise<SignalExplanation[]> {
    return signals.map(sig => {
      let explanation = `The metric '${sig.metricLabel}' is currently ${sig.metricValue}.`;
      
      if (sig.code === 'RECEIVABLES_AGING') {
        explanation = `Receivables have slowed — average collection time is now ${sig.metricValue} days, up from the prior period. This ties up working capital that could otherwise fund day-to-day operations.`;
      } else if (sig.code === 'SEASONAL_DIP') {
        // Assume we check some pattern here, we can hardcode for demo
        explanation = `Expected — happens every season, no concern. Cash flow drops slightly but aligns with prior year patterns.`;
      } else if (sig.code === 'PAYROLL_STRESS') {
        explanation = `Payroll outflows exceed the available cash buffer. Urgent liquidity management is needed to avoid delayed payments.`;
      } else if (sig.code === 'GROWTH_SPURT') {
        explanation = `Revenue has grown significantly over the last quarter. This presents an opportunity to review scaling needs.`;
      } else if (sig.code === 'LOAN_MATURITY_UPCOMING') {
        explanation = `An existing loan is maturing within 45 days. No renewal discussions have been logged recently.`;
      }

      return {
        signalId: sig.id,
        explanation
      };
    });
  }

  async generateNBA(business: Business, signals: Signal[], policies: PolicyReference[]): Promise<NBAResult[]> {
    if (signals.length === 0) return [];

    const results: NBAResult[] = [];
    
    // Group signals by code to determine NBA
    const hasReceivables = signals.some(s => s.code === 'RECEIVABLES_AGING');
    const hasGrowth = signals.some(s => s.code === 'GROWTH_SPURT');
    const hasMaturity = signals.some(s => s.code === 'LOAN_MATURITY_UPCOMING');
    
    if (hasReceivables) {
      results.push({
        title: 'Offer Invoice Financing',
        description: 'Propose invoice financing to unlock tied-up working capital.',
        rationale: 'With receivables aging increasing, invoice financing can convert unpaid invoices into immediate cash.',
        triggeringSignalIds: signals.filter(s => s.code === 'RECEIVABLES_AGING').map(s => s.id),
        suggestedProductType: 'invoice_financing'
      });
    }

    if (hasGrowth) {
      results.push({
        title: 'Working Capital Top-up',
        description: 'Discuss a working capital line increase to support ongoing growth.',
        rationale: 'Revenue growth indicates scaling operations, which typically requires a larger liquidity buffer.',
        triggeringSignalIds: signals.filter(s => s.code === 'GROWTH_SPURT').map(s => s.id),
        suggestedProductType: 'working_capital'
      });
    }

    if (hasMaturity) {
      results.push({
        title: 'Initiate Loan Renewal',
        description: 'Contact the owner to discuss renewing the upcoming maturing loan.',
        rationale: 'Proactive engagement before maturity prevents accidental default or competitor refinancing.',
        triggeringSignalIds: signals.filter(s => s.code === 'LOAN_MATURITY_UPCOMING').map(s => s.id),
        suggestedProductType: 'term_loan'
      });
    }

    // Fallback if no specific matched products
    if (results.length === 0 && signals.length > 0) {
       results.push({
        title: 'Review Account Health',
        description: 'Schedule a general review with the client.',
        rationale: 'Recent account activity suggests a check-in is warranted to ensure needs are met.',
        triggeringSignalIds: [signals[0].id],
      });
    }

    return results;
  }

  async generateCustomerSummary(business: Business, signals: Signal[], nbaList: NBAResult[]): Promise<string> {
    if (signals.length === 0) {
      return `Dear ${business.name} Team, your account is in excellent standing. We have no new recommendations at this time.`;
    }
    return `Dear ${business.name} Team, we noticed some recent changes in your cash flow patterns. Based on our analysis, exploring ${nbaList[0]?.title || 'our advisory services'} could help optimize your operations over the next quarter. Let's schedule a brief call to discuss.`;
  }

  async chat(messages: { role: string; content: string }[], contextData: { business?: Business; signals?: Signal[]; policies?: PolicyReference[] }): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    // Very simple mock logic for the demo
    if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
      return `Hello! I'm your Vantage RM Copilot. I can help you analyze the portfolio or dive into specific signals for ${contextData.business?.name || 'your clients'}.`;
    }
    
    if (lastMessage.includes('signal') || lastMessage.includes('health')) {
      if (contextData.business && contextData.signals && contextData.signals.length > 0) {
        return `For ${contextData.business.name}, I see ${contextData.signals.length} active signals. The primary driver is ${contextData.signals[0].code}, which is having a ${contextData.signals[0].severity} impact.`;
      }
      return "There are no active stress signals right now, so the health score looks stable.";
    }

    if (lastMessage.includes('recommend') || lastMessage.includes('action') || lastMessage.includes('product')) {
      return "Based on the credit policies and current signals, I typically recommend reviewing Invoice Financing for cash flow dips, or Working Capital Loans for sustained expansion. Want me to run a simulation?";
    }

    return "I'm running in Mock Mode right now, so I can only provide limited conversational responses. Ask me about 'signals', 'health', or 'recommendations' to see my contextual awareness! (To use the real LLM, add an Anthropic API key).";
  }
}
