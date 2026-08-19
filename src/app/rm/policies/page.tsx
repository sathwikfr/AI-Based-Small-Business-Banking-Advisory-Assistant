'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface Policy {
  id: string;
  productType: string;
  title: string;
  summary: string;
  eligibility: string;
}

export default function CreditPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/policies');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setPolicies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/rm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Credit Policies</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              This is the grounding data behind every next-best-action recommendation — the system never suggests a product that isn't listed here.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {policies.map((policy) => (
            <div key={policy.id} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
                {policy.productType.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                {policy.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24, flex: 1 }}>
                {policy.summary}
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-hair)', paddingTop: 16 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>
                  Eligibility
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {policy.eligibility}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
