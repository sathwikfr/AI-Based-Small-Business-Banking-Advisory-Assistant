import { getSession } from '@/lib/auth';
import { logout } from '@/app/actions';
import Link from 'next/link';
import { LayoutDashboard, LogOut } from 'lucide-react';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
            }}>C</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Client Portal</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Vantage Banking</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/client" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-panel-alt)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                borderLeft: '2px solid var(--accent-healthy)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <LayoutDashboard size={14} />
                My Business
              </div>
            </Link>
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session?.name || 'Client'}
            </div>
            
            <form action={logout}>
              <button 
                type="submit" 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
