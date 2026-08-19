import * as fs from 'fs';

const filePath = 'src/app/rm/business/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const layoutStartIdx = content.indexOf('{/* ── Layout: 2-col ───────────────────────────────────────────────── */}');
const modalStartIdx = content.indexOf('{/* ── Customer Summary Modal ───────────────────────────────────────── */}');

if (layoutStartIdx === -1 || modalStartIdx === -1) {
  console.error("Could not find start/end markers");
  process.exit(1);
}

// We will construct the new layout using the existing components in the file.
// Let's just write the new JSX string.
const newLayout = `      {/* ── Layout: Single Column ───────────────────────────────────────── */}
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
                        width: \`\${Math.min((acct.balance / acct.creditLimit) * 100, 100)}%\`,
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
                            <ExplainTreeNode node={buildExplainTree(action as any, business.signals)} />
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
                  formatter={(val: number) => \`₹\${Math.round(val/1000)}K\`}
                  labelFormatter={(label) => \`Day \${label}\`}
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
`;

content = content.substring(0, layoutStartIdx) + newLayout + '\n' + content.substring(modalStartIdx);

// Also need to add "Last contact" to header
// Header is around line 440
content = content.replace(
  /<span>Onboarded \{new Date\(business.onboardedAt\).toLocaleDateString\('en-IN', \{ year: 'numeric', month: 'short' \}\)\}<\/span>/g,
  "<span>Onboarded {new Date(business.onboardedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>\n              <span>·</span>\n              <span>Last contact: {notes[0] ? new Date(notes[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'None'}</span>"
);

fs.writeFileSync(filePath, content);
console.log("Rewrote page.tsx layout");
