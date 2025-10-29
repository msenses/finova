import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { supabase } from '../lib/supabaseClient';

export function Layout() {
  const [orgName, setOrgName] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (user?.id) {
        const [{ data: member }, { data: profData }] = await Promise.all([
          supabase
            .from('organization_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single(),
          supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single(),
        ]);
        let name = '';
        if (member?.org_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', member.org_id)
            .single();
          name = (org as any)?.name ?? '';
        }
        if (!cancelled) {
          if (name) setOrgName(String(name));
          const dn = (profData as any)?.display_name ?? user.email ?? '';
          if (dn) setDisplayName(String(dn));
        }
      }
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
        <div className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>
            {orgName ? orgName.toUpperCase() : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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


