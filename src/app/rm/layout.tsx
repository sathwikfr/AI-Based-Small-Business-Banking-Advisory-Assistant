import { getSession } from '@/lib/auth';
import { logout } from '@/app/actions';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';
import SidebarNav from '@/components/SidebarNav';

export default async function RmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
            }}>V</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Vantage</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>RM Advisory Copilot</div>
            </div>
          </div>
          <SidebarNav />
        </div>
        
        <div style={{ marginTop: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-panel-alt)',
                border: '1px solid var(--border-hair)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
              }}>PS</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{session?.name || 'Priya Sharma'}</div>
                <div>RM · North Region</div>
              </div>
            </div>
            
            <form action={logout}>
              <button 
                type="submit" 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <Chatbot />
    </div>
  );
}
