export interface CashFlowDataPoint {
  date: string;
  netCashFlow: number;
}

export interface ProjectionDataPoint {
  day: number;
  date: string;
  noActionBalance: number;
  withActionBalance: number;
}

/**
 * Deterministic projection for the Decision Simulator.
 * Computes a simple linear trend based on the last 90 days of cash flow data,
 * and projects the cash balance 30 days forward.
 * The 'withAction' scenario applies a generic positive modifier based on the NBA type.
 */
export function projectCashFlow(
  currentBalance: number,
  last90DaysFlows: CashFlowDataPoint[],
  nbaProductType?: string
): ProjectionDataPoint[] {
  // Calculate average daily net cash flow over the period provided
  let totalNet = 0;
  for (const p of last90DaysFlows) {
    totalNet += p.netCashFlow;
  }
  const averageDailyNet = last90DaysFlows.length > 0 ? totalNet / last90DaysFlows.length : 0;
  
  // Baseline trajectory
  let dailyDrift = averageDailyNet;

  // Apply modifiers for "with action" scenario
  let actionModifier = 0;
  if (nbaProductType === 'invoice_financing' || nbaProductType === 'receivables_financing') {
    // Accelerates cash inflow
    actionModifier = Math.abs(dailyDrift) * 0.4 + 500;
  } else if (nbaProductType === 'working_capital' || nbaProductType === 'overdraft') {
    // Provides immediate liquidity buffer and smooths outflows
    actionModifier = 1000;
  } else if (nbaProductType) {
    // Generic positive intervention
    actionModifier = Math.abs(dailyDrift) * 0.2 + 200;
  }

  const projection: ProjectionDataPoint[] = [];
  const now = new Date();
  
  // Start from today
  projection.push({
    day: 0,
    date: now.toISOString().split('T')[0],
    noActionBalance: currentBalance,
    withActionBalance: currentBalance
  });

  // Project 30 days forward
  let currentNoAction = currentBalance;
  let currentWithAction = currentBalance;

  for (let i = 1; i <= 30; i++) {
    const projDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    
    currentNoAction += dailyDrift;
    
    // The action takes effect over time, assuming a ramp-up
    const effectiveModifier = actionModifier * Math.min(i / 10, 1); 
    currentWithAction += dailyDrift + effectiveModifier;

    projection.push({
      day: i,
      date: projDate.toISOString().split('T')[0],
      noActionBalance: Math.round(currentNoAction),
      withActionBalance: Math.round(currentWithAction)
    });
  }

  return projection;
}
