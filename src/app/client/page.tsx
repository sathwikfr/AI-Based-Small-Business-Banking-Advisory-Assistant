import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Info, Sparkles } from 'lucide-react';
import HealthTimelineChartComponent from '@/components/HealthTimelineChart';
import CashFlowChartComponent from '@/components/CashFlowChart';

function getInsightCopy(healthScore: number, driverCode: string | null, daysAgo: number): string {
  if (!driverCode) {
    return `No active concerns detected. Your last review was ${daysAgo} days ago.`;
  }
  const copyMap: Record<string, string> = {
    RECEIVABLES_AGING: "Some customer payments have been taking longer to come in lately.",
    SEASONAL_DIP_APPROACHING: "This dip is expected for this time of year based on your usual pattern.",
    UNDERUTILIZED_CREDIT: "You have available credit that isn't being used — worth a look if you're planning growth.",
    LOAN_MATURITY_UPCOMING: "One of your loans is coming up for renewal soon.",
    CASH_FLOW_VOLATILITY: "Your cash flow has been more volatile than usual lately.",
    PAYROLL_STRESS: "Upcoming payroll obligations might put a squeeze on your current cash buffer.",
    GROWTH_SPURT: "Your revenue is growing faster than usual — a great time to review scaling options."
  };
  return copyMap[driverCode] ?? "Your account activity has a few points worth reviewing.";
}

export default async function ClientDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'client') {
    redirect('/login');
  }

  const res = await fetch(`http://localhost:3000/api/businesses/${session.userId}`, { cache: 'no-store' });
  if (!res.ok) {
    return <div style={{ padding: 48, color: 'var(--text-muted)' }}>Business not found.</div>;
  }
  const business = await res.json();

  const latestScore = business.healthScores.length > 0 
    ? business.healthScores[business.healthScores.length - 1] 
    : null;

  const daysAgo = business.notes.length > 0 
    ? Math.floor((new Date().getTime() - new Date(business.notes[0].date).getTime()) / (1000 * 3600 * 24))
    : 14; // default fallback

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Welcome back, {business.name}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Here is your business health overview as of today.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Key Insights Panel */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label" style={{ marginBottom: 16 }}>Key Insights</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-panel-alt)', padding: 16, borderRadius: 8, border: '1px solid var(--border-hair)' }}>
              <Info size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {getInsightCopy(latestScore?.score ?? 100, latestScore?.driverCode ?? null, daysAgo)}
              </div>
            </div>
          </div>

          {/* Health Timeline */}
          {business.healthScores.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div className="section-label">Your Business Health Over Time</div>
              <HealthTimelineChartComponent data={business.healthScores} />
            </div>
          )}

          {/* Cash Flow Snapshot */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label">Cash Flow Snapshot</div>
            {business.cashFlow.length > 0 ? (
              <CashFlowChartComponent data={business.cashFlow} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No transaction data available
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Health Score Card */}
          {latestScore && (
            (() => {
              let bandName = "At risk";
              let accentColor = "var(--accent-atrisk)";
              let bgTint = "rgba(239, 68, 68, 0.08)";
              if (latestScore.score >= 80) { bandName = "Healthy"; accentColor = "var(--accent-healthy)"; bgTint = "rgba(34, 197, 94, 0.08)"; }
              else if (latestScore.score >= 60) { bandName = "Stable, monitor"; accentColor = "var(--accent-stable)"; bgTint = "rgba(234, 179, 8, 0.08)"; }
              else if (latestScore.score >= 40) { bandName = "Needs attention"; accentColor = "var(--accent-attention)"; bgTint = "rgba(249, 115, 22, 0.08)"; }
              
              return (
                <div className="card" style={{ padding: '24px 20px', textAlign: 'center', borderColor: accentColor, background: bgTint }}>
                  <div style={{ fontSize: 60, fontWeight: 700, color: accentColor, lineHeight: 1 }}>{latestScore.score}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: accentColor, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bandName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                    Your Vantage Health Score
                  </div>
                </div>
              );
            })()
          )}

          {/* Account Summary */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label">Account Summary</div>
            {business.accounts.map((acct: any) => (
              <div key={acct.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-hair)' }}>
                <div className="label-above-value">
                  <span className="label">{acct.accountType.replace('_', ' ')}</span>
                  <span className="value font-mono" style={{ fontSize: 18 }}>₹{acct.balance.toLocaleString('en-IN')}</span>
                </div>
                {acct.creditLimit !== null && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Utilization: You're using {((acct.balance / acct.creditLimit) * 100).toFixed(0)}% of your available credit</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-panel-alt)', borderRadius: 2 }}>
                      <div style={{
                        height: 4,
                        width: `${Math.min((acct.balance / acct.creditLimit) * 100, 100)}%`,
                        background: 'var(--accent)',
                        borderRadius: 2
                      }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {business.loans.map((loan: any) => (
              <div key={loan.id} style={{ marginBottom: 8 }}>
                <div className="label-above-value">
                  <span className="label">{loan.productType.replace(/_/g, ' ')} · Active Loan</span>
                  <span className="value font-mono" style={{ fontSize: 18 }}>₹{loan.outstanding.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Total outstanding
                </div>
              </div>
            ))}
          </div>

          {/* Recommended for you */}
          <div className="card" style={{ padding: 24, background: 'var(--bg-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <div className="section-label" style={{ margin: 0 }}>Recommended for you</div>
            </div>
            
            {business.latestSummary ? (
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {business.latestSummary.content}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Your receivables have been taking a bit longer to collect lately. It might be worth a quick chat with your relationship manager about options like invoice financing to keep cash flow steady.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
