import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { supabase } from '../lib/supabaseClient';
import { useTenant } from '../context/TenantContext';

export function Layout() {
  const { organizations, branches, periods, activeOrgId, activeBranchId, activePeriodId, setActiveOrgId, setActiveBranchId, setActivePeriodId } = useTenant();
  const [displayName, setDisplayName] = React.useState<string>('');

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!cancelled) setDisplayName(user?.email ?? '');
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="container" style={{ flex: 1 }}>
        <div className="card" style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={activeOrgId ?? ''} onChange={(e) => setActiveOrgId(e.target.value || null)}>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <select value={activeBranchId ?? ''} onChange={(e) => setActiveBranchId(e.target.value || null)}>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
            <select value={activePeriodId ?? ''} onChange={(e) => setActivePeriodId(e.target.value || null)}>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
          </div>
          <div style={{ fontWeight: 700, textAlign: 'center' }}>
            {organizations.find(o => o.id === activeOrgId)?.name?.toUpperCase() ?? ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <span style={{ opacity: 0.9 }}>{displayName}</span>
            <button className="btn" onClick={onSignOut}>Çıkış</button>
          </div>
        </div>
        <div className="card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


