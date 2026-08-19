'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, TrendingUp, Minus, ChevronRight, Calendar, Building2 } from 'lucide-react';
import { getPortfolioSummary } from '@/lib/prediction/portfolioSummary';

interface ActiveSignal {
  id:          string;
  code:        string;
  type:        string;
  severity:    string;
  metricLabel: string;
}

interface Business {
  id:               string;
  name:             string;
  businessType:     string;
  monthlyRevenueAvg: number;
  status:           'stress' | 'opportunity' | 'stable';
  healthScore:      number;
  previousHealthScore: number;
  priorityScore:    number;
  signalCount:      number;
  lastInteraction:  string | null;
  activeSignals:    ActiveSignal[];
  rmName:           string;
}

const SIGNAL_LABELS: Record<string, string> = {
  RECEIVABLES_AGING:       'Receivables Aging',
  CASH_FLOW_VOLATILITY:    'Cash Flow Volatility',
  SEASONAL_DIP_APPROACHING:'Seasonal Dip',
  UNDERUTILIZED_CREDIT:    'Underutilized Credit',
  LOAN_MATURITY_UPCOMING:  'Loan Maturity',
  PAYROLL_STRESS:          'Payroll Stress',
  GROWTH_SPURT:            'Growth Opportunity',
};

function formatCurrency(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StatusChip({ status }: { status: 'stress' | 'opportunity' | 'stable' }) {
  const config = {
    stress:      { label: 'Needs Attention', icon: <AlertTriangle size={9} />, cls: 'badge-severity badge-attention' },
    opportunity: { label: 'Opportunity',      icon: <TrendingUp size={9} />,   cls: 'badge-severity badge-healthy' },
    stable:      { label: 'Stable',           icon: <Minus size={9} />,        cls: 'badge-severity badge-stable' },
  }[status];
  return (
    <span className={config.cls} style={{ gap: 5 }}>
      {config.icon}
      {config.label}
    </span>
  );
}

function SeverityDot({ severity, type }: { severity: string; type: string }) {
  if (type === 'opportunity') return <span className="severity-dot severity-dot-opp" />;
  if (severity === 'high')   return <span className="severity-dot severity-dot-high" />;
  if (severity === 'medium') return <span className="severity-dot severity-dot-medium" />;
  return <span className="severity-dot severity-dot-low" />;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | 'stress' | 'opportunity' | 'stable'>('all');

  const load = useCallback(async () => {
    const res  = await fetch('/api/businesses');
    const data = await res.json();
    setBusinesses(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res  = await fetch('/api/portfolio/refresh', { method: 'POST' });
      const data = await res.json();
      showToast(data.message ?? 'Portfolio refreshed');
      await load();
    } catch {
      showToast('Refresh failed — check console');
    } finally {
      setRefreshing(false);
    }
  };

  // Use our shared helper to guarantee consistent counts between the Daily Brief and Summary Cards
  const summary = getPortfolioSummary(businesses.map(b => ({
    id: b.id,
    name: b.name,
    currentHealthScore: b.healthScore,
    activeSignals: b.activeSignals,
    priorityScore: b.priorityScore,
    status: b.status,
  })));

  // For the actual table filtering, we update the status based on our shared helper logic:
  const businessesWithConsistentStatus = businesses.map(b => {
    let newStatus = b.status;
    if (b.healthScore < 60 || b.activeSignals.some((s) => s.type === 'stress' && s.severity === 'high')) {
      newStatus = 'stress';
    } else if (b.activeSignals.some((s) => s.type === 'opportunity')) {
      newStatus = 'opportunity';
    } else {
      newStatus = 'stable';
    }
    return { ...b, status: newStatus };
  });

  const filtered = filter === 'all' 
    ? businessesWithConsistentStatus 
    : businessesWithConsistentStatus.filter((b) => b.status === filter);

  const counts = {
    stress:      summary.needsAttentionCount,
    opportunity: summary.opportunitiesCount,
    stable:      summary.stableCount,
  };

  const avgHealth = businesses.length > 0
    ? Math.round(businesses.reduce((acc, b) => acc + b.healthScore, 0) / businesses.length)
    : 0;

  const topPriority = summary.topPriority;
  
  const loanMaturingCount = businesses.filter(b => 
    b.activeSignals.some(s => s.code === 'LOAN_MATURITY_UPCOMING')
  ).length;

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      {/* ── AI RM Daily Brief ──────────────────────────────────────────────── */}
      {!loading && businesses.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-hair)',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 32
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
            Good morning, {businesses[0].rmName}.
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            <div>Portfolio: {businesses.length} businesses &middot; {counts.stress} need attention today &middot; {counts.opportunity} growth opportunities &middot; {loanMaturingCount} loan{loanMaturingCount !== 1 ? 's' : ''} maturing soon</div>
            <div>Average portfolio health: <strong style={{ color: 'var(--text-primary)' }}>{avgHealth}</strong></div>
          </div>
          
          {/* Top priority moved to Top 3 cards section */}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Priority Queue
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            Sorted by urgency and health impact
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ gap: 8 }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh Portfolio'}
        </button>
      </div>

      {/* ── Today's Priority (Top 3) ───────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Today's Priority</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {businessesWithConsistentStatus.slice(0, 3).map((b, i) => {
            let reason = 'Action needed today';
            const healthDelta = b.previousHealthScore - b.healthScore;
            if (healthDelta > 0) reason = `Health ↓${healthDelta} points — Action needed today`;
            else if (b.activeSignals.some(s => s.code === 'LOAN_MATURITY_UPCOMING')) reason = 'Loan matures soon';
            else if (b.activeSignals.some(s => s.type === 'opportunity')) {
              const opp = b.activeSignals.find(s => s.type === 'opportunity');
              reason = opp?.metricLabel ? opp.metricLabel : 'Expansion opportunity';
            }
            else reason = b.activeSignals[0] ? b.activeSignals[0].metricLabel : 'Review account';

            return (
              <div 
                key={b.id} 
                className="card" 
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `3px solid ${b.status === 'stress' ? 'var(--accent-attention)' : b.status === 'opportunity' ? 'var(--accent-healthy)' : 'var(--border-hair)'}` }}
                onClick={() => router.push(`/rm/business/${b.id}`)}
              >
                <div style={{ width: 24, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}.</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: 200 }}>{b.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>— {reason}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'stress', 'opportunity', 'stable'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 500,
              background: filter === f ? 'var(--bg-panel-alt)' : 'transparent',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${filter === f ? 'var(--border-subtle)' : 'var(--border-hair)'}`,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f === 'stress' ? 'Needs Attention' : f} 
            <span style={{ marginLeft: 6, opacity: 0.6 }}>
              {f === 'all' ? businesses.length : counts[f as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>No businesses in this category</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Active Signals</th>
                  <th style={{ textAlign: 'right' }}>Monthly Rev.</th>
                  <th>Last Interaction</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/rm/business/${b.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>
                        {b.businessType}
                      </div>
                    </td>
                    <td><StatusChip status={b.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{b.healthScore}</span>
                        {b.previousHealthScore !== b.healthScore && (
                          <span style={{ 
                            fontSize: 11, 
                            color: b.healthScore < b.previousHealthScore ? 'var(--accent-atrisk)' : 'var(--accent-healthy)',
                            display: 'flex', alignItems: 'center'
                          }}>
                            {b.healthScore < b.previousHealthScore ? '↓' : '↑'}
                            {Math.abs(b.healthScore - b.previousHealthScore)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {b.activeSignals.slice(0, 2).map((sig) => (
                          <div key={sig.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <SeverityDot severity={sig.severity} type={sig.type} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {SIGNAL_LABELS[sig.code] ?? sig.code}
                            </span>
                          </div>
                        ))}
                        {b.activeSignals.length > 2 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            +{b.activeSignals.length - 2} more
                          </span>
                        )}
                        {b.activeSignals.length === 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>No active signals</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="metric-value">{formatCurrency(b.monthlyRevenueAvg)}</span>
                      <div className="metric-label">avg/month</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                        <Calendar size={11} />
                        {formatDate(b.lastInteraction)}
                      </div>
                    </td>
                    <td>
                      <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast">
          <span style={{ color: 'var(--opp-high)', marginRight: 8 }}>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
