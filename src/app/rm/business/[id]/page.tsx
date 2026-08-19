'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Copy, Check,
  Sparkles, FileText, Phone, Mail, MapPin, AlertTriangle, TrendingUp,
  Minus, Plus, Calendar, X
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, AreaChart, Area
} from 'recharts';
import { ExplainNode, buildExplainTree } from '@/lib/prediction/explainTree';
import { projectCashFlow } from '@/lib/prediction/projectForward';
import CashFlowChartComponent from '@/components/CashFlowChart';
import HealthTimelineChartComponent from '@/components/HealthTimelineChart';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CashFlowMonth {
  month:   string;
  inflow:  number;
  outflow: number;
  net:     number;
}

interface Signal {
  id:          string;
  code:        string;
  type:        string;
  severity:    string;
  metricValue: number;
  metricLabel: string;
  detectedAt:  string;
}

interface Account {
  id:          string;
  accountType: string;
  balance:     number;
  creditLimit: number | null;
}

interface Loan {
  id:           string;
  productType:  string;
  principal:    number;
  outstanding:  number;
  maturityDate: string;
  status:       string;
}

interface Note {
  id:      string;
  date:    string;
  note:    string;
  channel: string;
}

interface BusinessDetail {
  id:               string;
  name:             string;
  businessType:     string;
  monthlyRevenueAvg: number;
  onboardedAt:      string;
  rm:               { name: string; email: string };
  accounts:         Account[];
  loans:            Loan[];
  signals:          Signal[];
  healthScores:     { score: number; computedAt: string; driverCode: string | null }[];
  notes:            Note[];
  latestSummary:    { content: string; generatedAt: string } | null;
  cashFlow:         CashFlowMonth[];
  recentFlows:      { date: string; netCashFlow: number }[];
}

interface NBAOutput {
  signalExplanations: Array<{ signalId: string; explanation: string }>;
  nextBestActions:    Array<{
    title:               string;
    rationale:           string;
    triggeringSignalIds: string[];
    suggestedProductType: string | null;
    priority:            number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_LABELS: Record<string, string> = {
  RECEIVABLES_AGING:        'Receivables Aging',
  CASH_FLOW_VOLATILITY:     'Cash Flow Volatility',
  SEASONAL_DIP_APPROACHING: 'Seasonal Dip Approaching',
  UNDERUTILIZED_CREDIT:     'Underutilized Credit Line',
  LOAN_MATURITY_UPCOMING:   'Loan Maturity Upcoming',
  PAYROLL_STRESS:           'Payroll Stress',
  GROWTH_SPURT:             'Revenue Growth Spurt',
};

const PRODUCT_LABELS: Record<string, string> = {
  working_capital:    'Working Capital Loan',
  invoice_financing:  'Invoice Financing',
  overdraft:          'Overdraft Facility',
  term_loan:          'Term Loan',
};

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function daysSince(d: string | null): string {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity, type }: { severity: string; type: string }) {
  if (type === 'opportunity') {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'var(--opp-high)', background: 'var(--opp-bg)',
        border: '1px solid var(--opp-border)', padding: '2px 8px', borderRadius: 4,
      }}>Opportunity</span>
    );
  }
  const colors: Record<string, string> = {
    high:   'var(--stress-high)',
    medium: 'var(--stress-medium)',
    low:    'var(--stress-low)',
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      color: colors[severity] ?? 'var(--text-muted)',
      background: 'var(--stress-bg)',
      border: '1px solid var(--stress-border)', padding: '2px 8px', borderRadius: 4,
    }}>{severity} stress</span>
  );
}

function SignalCard({
  signal,
  explanation,
  onHighlight,
}: {
  signal:      Signal;
  explanation: string | undefined;
  onHighlight?: (ids: string[]) => void;
}) {
  const isOpportunity = signal.type === 'opportunity';
  const cardClass     = isOpportunity ? 'signal-card-opportunity' : 'signal-card-stress';

  return (
    <div className={cardClass} style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="code-pill">{signal.code}</span>
            <SeverityBadge severity={signal.severity} type={signal.type} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {SIGNAL_LABELS[signal.code] ?? signal.code}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
            {explanation ?? (
              <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                Click "Generate Advisory" to get AI explanation
              </span>
            )}
          </div>
          <div className="metric-value" style={{ fontSize: 12 }}>{signal.metricLabel}</div>
        </div>
      </div>
    </div>
  );
}



function ExplainTreeNode({ node }: { node: ExplainNode }) {
  return (
    <div style={{ marginLeft: 16, marginTop: 8, position: 'relative' }}>
      <div style={{ position: 'absolute', left: -10, top: 8, width: 6, height: 1, background: 'var(--border-hair)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            {node.type}: {node.label}
          </span>
          {node.value && (
            <span style={{ fontSize: 11, color: 'var(--accent-attention)' }}>
              ({node.value})
            </span>
          )}
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div style={{ borderLeft: '1px solid var(--border-hair)', marginLeft: 8, paddingBottom: 4, paddingTop: 4 }}>
          {node.children.map((child, i) => <ExplainTreeNode key={i} node={child} />)}
        </div>
      )}
    </div>
  );
}

function NoteChannelIcon({ channel }: { channel: string }) {
  if (channel === 'call')  return <Phone size={12} />;
  if (channel === 'email') return <Mail size={12} />;
  return <MapPin size={12} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params.id as string;

  const [business,    setBusiness]    = useState<BusinessDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [nbaData, setNbaData]       = useState<NBAOutput | null>(null);
  const [nbaLoading, setNbaLoading] = useState(false);
  const [expandedNba, setExpandedNba] = useState<number | null>(null);
  const [simulatorAction, setSimulatorAction] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [noteText,    setNoteText]    = useState('');
  const [noteChannel, setNoteChannel] = useState('call');
  const [noteLoading, setNoteLoading] = useState(false);
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [toast,       setToast]       = useState<string | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const res  = await fetch(`/api/businesses/${id}`);
    const data = await res.json();
    setBusiness(data);
    setNotes(data.notes ?? []);
    if (data.latestSummary) setSummaryText(data.latestSummary.content);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRefreshSignals = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/businesses/${id}/signals`, { method: 'POST' });
      await load();
      showToast('Signals refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateAdvisory = async () => {
    setNbaLoading(true);
    try {
      const res  = await fetch(`/api/businesses/${id}/explain`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) setNbaData(data);
      else showToast(`Advisory failed: ${data.error}`);
    } catch {
      showToast('Advisory generation failed — check API key');
    } finally {
      setNbaLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res  = await fetch(`/api/businesses/${id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: nbaData?.nextBestActions ?? [] }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummaryText(data.content);
        setShowSummary(true);
      } else {
        showToast(`Summary failed: ${data.error}`);
      }
    } catch {
      showToast('Summary generation failed — check API key');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summaryText) return;
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/businesses/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText, channel: noteChannel }),
      });
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setNoteText('');
      showToast('Note saved');
    } catch {
      showToast('Failed to save note');
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!business) return <div style={{ padding: 48, color: 'var(--text-muted)' }}>Business not found</div>;

  const explanationMap = new Map(
    nbaData?.signalExplanations.map((e) => [e.signalId, e.explanation]) ?? []
  );

  return (
    <div className="page-container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      {/* ── Back + Header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={12} /> Back to Portfolio
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{business.name}</h1>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
              <span style={{ textTransform: 'capitalize' }}>{business.businessType}</span>
              <span>·</span>
              <span>RM: {business.rm.name}</span>
              <span>·</span>
              <span>Onboarded {new Date(business.onboardedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>
              <span>·</span>
              <span>Last contact: {notes[0] ? new Date(notes[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'None'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={handleRefreshSignals}
              disabled={refreshing}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
              Refresh Signals
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGenerateAdvisory}
              disabled={nbaLoading || business.signals.length === 0}
            >
              {nbaLoading ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Generating…</> : <><Sparkles size={13} /> Generate Advisory</>}
            </button>
          </div>
        </div>
      </div>

            {/* ── Layout: Single Column ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* 2. Health Score Card + Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          {business.healthScores.length > 0 && (
            (() => {
              const latestScore = business.healthScores[business.healthScores.length - 1];
              let bandName = "At risk";
              let accentColor = "var(--accent-atrisk)";
              let bgTint = "rgba(239, 68, 68, 0.08)";
              if (latestScore.score >= 80) { bandName = "Healthy"; accentColor = "var(--accent-healthy)"; bgTint = "rgba(34, 197, 94, 0.08)"; }
              else if (latestScore.score >= 60) { bandName = "Stable, monitor"; accentColor = "var(--accent-stable)"; bgTint = "rgba(234, 179, 8, 0.08)"; }
              else if (latestScore.score >= 40) { bandName = "Needs attention"; accentColor = "var(--accent-attention)"; bgTint = "rgba(249, 115, 22, 0.08)"; }
              
              return (
                <div className="card" style={{ padding: '32px 24px', textAlign: 'center', borderColor: accentColor, background: bgTint, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 72, fontWeight: 700, color: accentColor, lineHeight: 1 }}>{latestScore.score}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: accentColor, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bandName}</div>
                  {latestScore.driverCode && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>
                      mainly: {SIGNAL_LABELS[latestScore.driverCode]?.toLowerCase() || latestScore.driverCode.toLowerCase().replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          <div className="card" style={{ padding: 24 }}>
            <div className="section-label">Score Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {business.signals.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active signals affecting the score.</div>
              ) : (
                business.signals.map(s => {
                  let badgeCls = 'badge-severity badge-attention';
                  let impact = 'high impact';
                  if (s.type === 'opportunity') { badgeCls = 'badge-severity badge-healthy'; impact = 'positive impact'; }
                  else if (s.severity === 'medium') { impact = 'medium impact'; }
                  else if (s.severity === 'low') { badgeCls = 'badge-severity badge-stable'; impact = 'low impact'; }
                  
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid var(--border-hair)', paddingBottom: 12 }}>
                      <div className={badgeCls}>{s.code}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{SIGNAL_LABELS[s.code] || s.code.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.metricLabel}: <span className="font-mono">{s.metricValue}</span> — {impact}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. Health Timeline Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-label">Health Timeline</div>
          <HealthTimelineChartComponent data={business.healthScores} />
        </div>

        {/* 4. Account Summary */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-label">Account Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {business.accounts.map((acct) => (
              <div key={acct.id}>
                <div className="label-above-value">
                  <span className="label">{acct.accountType.replace('_', ' ')}</span>
                  <span className="value font-mono" style={{ fontSize: 20 }}>{formatINR(acct.balance)}</span>
                </div>
                {acct.creditLimit !== null && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>Utilization</span>
                      <span className="font-mono">{((acct.balance / acct.creditLimit) * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-panel-alt)', borderRadius: 3 }}>
                      <div style={{
                        height: 6,
                        width: `${Math.min((acct.balance / acct.creditLimit) * 100, 100)}%`,
                        background: 'var(--accent)',
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>
                      Limit: {formatINR(acct.creditLimit)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {business.loans.map((loan) => (
              <div key={loan.id}>
                <div className="label-above-value">
                  <span className="label">{loan.productType.replace(/_/g, ' ')} · {loan.status}</span>
                  <span className="value font-mono" style={{ fontSize: 20 }}>{formatINR(loan.outstanding)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Matures: {new Date(loan.maturityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Cash Flow Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Cash Flow — 12 Month View</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Inflow · Outflow · Net (₹K)</div>
            </div>
            <div className="label-above-value" style={{ alignItems: 'flex-end' }}>
              <span className="label">Monthly Revenue Avg</span>
              <span className="value font-mono">{formatINR(business.monthlyRevenueAvg)}</span>
            </div>
          </div>
          {business.cashFlow.length > 0 ? (
            <CashFlowChartComponent data={business.cashFlow} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No transaction data available
            </div>
          )}
        </div>

        {/* 6. Active Signals */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-label">Active Signals ({business.signals.length})</div>
          {business.signals.length === 0 ? (
            <div style={{ padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              No active signals detected — business appears stable
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {business.signals.map((sig) => (
                <SignalCard
                  key={sig.id}
                  signal={sig}
                  explanation={explanationMap.get(sig.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 7. Next-Best-Actions */}
        {nbaData && nbaData.nextBestActions.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label">Next-Best-Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
              {nbaData.nextBestActions
                .sort((a, b) => a.priority - b.priority)
                .map((action, i) => (
                  <div key={i} className="card-elevated" style={{ padding: 20, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--accent)', color: '#fff',
                        fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{action.title}</span>
                      {action.suggestedProductType && (
                        <span className="code-pill" style={{ color: 'var(--accent)', borderColor: 'rgba(99,102,241,0.3)', marginLeft: 'auto' }}>
                          {PRODUCT_LABELS[action.suggestedProductType] ?? action.suggestedProductType}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setExpandedNba(expandedNba === i ? null : i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, padding: 0, marginBottom: 12 }}
                    >
                      {expandedNba === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedNba === i ? 'Hide rationale' : 'View rationale'}
                    </button>

                    {expandedNba === i && (
                      <div style={{ padding: 16, background: 'var(--bg-muted)', borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                          {action.rationale}
                        </div>
                        
                        {/* Explainability Tree */}
                        <div style={{ marginTop: 16, marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Audit Trail (Deterministic)</div>
                          <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 8, border: '1px solid var(--border-light)', overflowX: 'auto' }}>
                            <ExplainTreeNode node={buildExplainTree(action as any, business.signals as any)} />
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Triggered by:</span>
                          {action.triggeringSignalIds.map((sid) => {
                            const sig = business.signals.find((s) => s.id === sid);
                            if (!sig) return null;
                            let badgeCls = 'badge-severity badge-attention';
                            if (sig.type === 'opportunity') badgeCls = 'badge-severity badge-healthy';
                            else if (sig.severity === 'low') badgeCls = 'badge-severity badge-stable';
                            return (
                              <span key={sid} className={badgeCls} style={{ fontSize: 10 }}>
                                {sig.code}
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 16 }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 16px', fontSize: 13 }}
                            onClick={() => setSimulatorAction(action.suggestedProductType)}
                          >
                            Simulate Impact
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 8. Decision Simulator */}
        {simulatorAction && (
          <div className="card" style={{ padding: 24, border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="section-label" style={{ margin: 0 }}>Impact Simulator</div>
              <button className="btn btn-ghost" style={{ padding: 6, height: 'auto' }} onClick={() => setSimulatorAction(null)}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              30-day projection with {PRODUCT_LABELS[simulatorAction] ?? simulatorAction}
            </div>
            
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={projectCashFlow(
                business.accounts.reduce((sum, a) => sum + a.balance, 0),
                business.recentFlows,
                simulatorAction
              )} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ fontSize: 12, borderRadius: 6, background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                  formatter={(val: any) => `₹${Math.round(Number(val)/1000)}K`}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Area type="monotone" dataKey="noActionBalance" stackId="1" stroke="var(--text-muted)" fill="var(--text-muted)" fillOpacity={0.1} name="No Action" />
                <Area type="monotone" dataKey="withActionBalance" stackId="2" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} name="With Action" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 9. Generate Customer Summary */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setShowSummary(true); if (!summaryText) handleGenerateSummary(); }}
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <FileText size={16} />
            Generate Customer Summary
          </button>
        </div>

        {/* 10. Interaction Notes */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-label">Interaction Log</div>

          <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add interaction note…"
              style={{ flex: 1, fontSize: 13, minHeight: 40 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                value={noteChannel}
                onChange={(e) => setNoteChannel(e.target.value)}
                style={{ fontSize: 13, padding: '8px 12px' }}
              >
                <option value="call">📞 Call</option>
                <option value="visit">🏢 Visit</option>
                <option value="email">✉️ Email</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={handleAddNote}
                disabled={noteLoading || !noteText.trim()}
              >
                {noteLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <><Plus size={14} /> Add</>}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {notes.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-disabled)', textAlign: 'center', padding: '24px 0' }}>
                No interaction notes yet
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <NoteChannelIcon channel={note.channel} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{note.channel}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 'auto' }}>
                      {daysSince(note.date)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{note.note}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

{/* ── Customer Summary Modal ───────────────────────────────────────── */}
      {showSummary && (
        <div className="modal-backdrop" onClick={() => setShowSummary(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Customer Summary</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  RM-ready summary — safe to read aloud or send
                </div>
              </div>
              <button onClick={() => setShowSummary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {summaryLoading ? (
              <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ width: 28, height: 28 }} />
                <span style={{ fontSize: 12 }}>Generating customer summary…</span>
              </div>
            ) : summaryText ? (
              <>
                <div style={{
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 18,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}>
                  {summaryText}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Based on: {business.signals.length > 0 ? business.signals.map(s => s.code).join(', ') : 'No active signals'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={handleGenerateSummary} disabled={summaryLoading} style={{ fontSize: 12 }}>
                      <RefreshCw size={11} /> Regenerate
                    </button>
                    <button className="btn btn-primary" onClick={handleCopy} style={{ fontSize: 12 }}>
                      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <button className="btn btn-primary" onClick={handleGenerateSummary}>
                  <Sparkles size={13} /> Generate Summary
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
