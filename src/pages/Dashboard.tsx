import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listCashTransactions, type CashTransaction } from '../services/cash';
import { listPosBlocks, type PosBlock } from '../services/pos';
import { listInvoices, type Invoice } from '../services/invoices';

export default function Dashboard() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cash, setCash] = useState<CashTransaction[]>([]);
  const [pos, setPos] = useState<PosBlock[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setAuthed(Boolean(data.session));
      if (data.session) {
        try {
          const { data: userWrap } = await supabase.auth.getUser();
          const user = userWrap.user;
          const [cashRes, posRes, invRes] = await Promise.all([
            listCashTransactions(),
            listPosBlocks(),
            listInvoices(),
          ]);
          let fetchedOrgName = '';
          if (user?.email) {
            const { data: rows } = await supabase
              .from('user_profiles')
              .select('organization_members(org_id, organizations(name))')
              .eq('email', user.email)
              .limit(1);
            fetchedOrgName = (rows as any)?.[0]?.organization_members?.[0]?.organizations?.name ?? '';
          }
          if (!cancelled) {
            if (!cashRes.error) setCash(cashRes.data ?? []);
            if (!posRes.error) setPos(posRes.data ?? []);
            if (!invRes.error) setInvoices(invRes.data ?? []);
            if (fetchedOrgName) setOrgName(fetchedOrgName);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  const cashIn = useMemo(() => cash.filter(c => c.type === 'tahsilat').reduce((s, x) => s + (x.amount || 0), 0), [cash]);
  const cashOut = useMemo(() => cash.filter(c => c.type === 'odeme').reduce((s, x) => s + (x.amount || 0), 0), [cash]);
  const cashNet = useMemo(() => Number((cashIn - cashOut).toFixed(2)), [cashIn, cashOut]);

  const posBlockedNet = useMemo(() => pos.filter(p => p.status === 'blocked').reduce((s, x) => s + (x.net_amount || 0), 0), [pos]);

  const todayStr = new Date().toISOString().slice(0,10);
  const salesToday = useMemo(() => invoices
    .filter(i => i.type === 'satis' && i.invoice_date === todayStr)
    .reduce((s, x) => s + (x.gross_total || 0), 0), [invoices, todayStr]);

  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
        Firma: <strong>{orgName || '-'}</strong>
      </div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS nedeniyle metrikleri görmek için giriş gereklidir.
        </div>
      )}
      <div className="grid-3">
        <div className="card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Kasa Net</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : cashNet.toFixed(2)} TL</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Tahsilat {cashIn.toFixed(2)} • Ödeme {cashOut.toFixed(2)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>POS Blokede (Net)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : posBlockedNet.toFixed(2)} TL</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Blokede bekleyen toplam net tutar</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Bugün Satış (Brüt)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : salesToday.toFixed(2)} TL</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Bugünkü satış faturaları toplamı</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Toplam Fatura</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : invoices.length}</div>
      </div>
    </div>
  );
}


