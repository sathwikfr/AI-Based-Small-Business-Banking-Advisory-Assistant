'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SidebarNav() {
  const pathname = usePathname();
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If we're on a business page, save the id to localStorage
    if (pathname.startsWith('/rm/business/')) {
      const id = pathname.split('/').pop();
      if (id) {
        localStorage.setItem('lastBusinessId', id);
        setLastViewedId(id);
      }
    } else {
      // If we're elsewhere, read from localStorage
      const stored = localStorage.getItem('lastBusinessId');
      if (stored) {
        setLastViewedId(stored);
      }
    }
  }, [pathname]);

  const isPortfolio = pathname === '/rm' || pathname === '/rm/portfolio';
  const isCustomer360 = pathname.startsWith('/rm/business/');
  const isPolicies = pathname === '/rm/policies';

  const activeStyle = {
    background: 'var(--bg-panel-alt)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    borderLeft: '2px solid var(--chart-line)',
  };

  const inactiveStyle = {
    color: 'var(--text-secondary)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
  };

  const disabledStyle = {
    ...inactiveStyle,
    cursor: 'not-allowed',
    opacity: 0.7,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Link href="/rm" style={{ textDecoration: 'none' }}>
        <div style={isPortfolio ? activeStyle : inactiveStyle}>
          Portfolio Overview
        </div>
      </Link>
      
      {isCustomer360 ? (
        <div style={activeStyle}>
          Customer 360
        </div>
      ) : (mounted && lastViewedId) ? (
        <Link href={`/rm/business/${lastViewedId}`} style={{ textDecoration: 'none' }}>
          <div style={inactiveStyle}>
            Customer 360
          </div>
        </Link>
      ) : (
        <div style={disabledStyle} title="Select a business from the Portfolio to view its 360 profile">
          Customer 360
        </div>
      )}

      <Link href="/rm/policies" style={{ textDecoration: 'none' }}>
        <div style={isPolicies ? activeStyle : inactiveStyle}>
          Credit Policies
        </div>
      </Link>
    </div>
  );
}
