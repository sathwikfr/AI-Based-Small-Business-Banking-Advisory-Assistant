'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/businesses')
      .then(res => res.json())
      .then(data => setBusinesses(data))
      .catch(console.error);
  }, []);

  const handleLogin = async (role: 'rm' | 'client', userId: string, name: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId, name }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.redirectTo);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <div className="card" style={{ width: 400, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
            margin: '0 auto 16px'
          }}>V</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Vantage</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Select a role to continue</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: 8 }}
            onClick={() => handleLogin('rm', 'rm-1', 'Priya Sharma')}
            disabled={loading}
          >
            <User size={16} />
            Login as RM (Priya Sharma)
          </button>

          <div style={{ height: 1, background: 'var(--border-hair)', margin: '12px 0' }} />
          
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
            Client Logins
          </div>
          
          {businesses.slice(0, 3).map(b => (
            <button 
              key={b.id}
              className="btn btn-ghost" 
              style={{ width: '100%', padding: '10px', justifyContent: 'flex-start', border: '1px solid var(--border-hair)' }}
              onClick={() => handleLogin('client', b.id, b.name)}
              disabled={loading}
            >
              <Building2 size={14} style={{ marginRight: 8, color: 'var(--text-muted)' }} />
              Login as {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
