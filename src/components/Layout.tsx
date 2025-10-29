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
        // 1) user_profiles -> user_id & display_name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .eq('user_id', user.id)
          .single();

        // 2) organization_members -> org_id (user_id ile)
        let orgId: string | null = null;
        if (profile?.user_id) {
          const { data: memberRow } = await supabase
            .from('organization_members')
            .select('org_id')
            .eq('user_id', profile.user_id)
            .limit(1)
            .single();
          orgId = (memberRow as any)?.org_id ?? null;
        }

        // 3) organizations -> name (org_id ile)
        let name = '';
        if (orgId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single();
          name = (org as any)?.name ?? '';
        }

        if (!cancelled) {
          if (name) setOrgName(String(name));
          const dn = (profile as any)?.display_name ?? user.email ?? '';
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
        <div className="card" style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          <div />
          <div style={{ fontWeight: 700, textAlign: 'center' }}>
            {orgName ? orgName.toUpperCase() : ''}
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


