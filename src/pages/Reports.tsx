import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Tab = 'cari' | 'stok' | 'fatura' | 'banka' | 'kasa' | 'pos' | 'tahsilat';

export default function Reports() {
  const [tab, setTab] = useState<Tab>('fatura');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [invoices, setInvoices] = useState<Array<{ type: string; gross_total: number }>>([]);
  const [cashTx, setCashTx] = useState<Array<{ type: string; amount: number }>>([]);
  const [posBlocks, setPosBlocks] = useState<Array<{ status: string; net_amount: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessage('');
      try {
        const [invRes, cashRes, posRes] = await Promise.all([
          supabase.from('invoices').select('type,gross_total'),
          supabase.from('cash_transactions').select('type,amount'),
          supabase.from('pos_blocks').select('status,net_amount'),
        ]);
        if (!cancelled) {
          if (!invRes.error) setInvoices((invRes.data as any) ?? []);
          if (!cashRes.error) setCashTx((cashRes.data as any) ?? []);
          if (!posRes.error) setPosBlocks((posRes.data as any) ?? []);
        }
      } catch (e: any) {
        if (!cancelled) setMessage(e?.message ?? 'Raporlar yüklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const faturaAlisCount = useMemo(() => invoices.filter(i => i.type === 'alis').length, [invoices]);
  const faturaAlisTotal = useMemo(() => invoices.filter(i => i.type === 'alis').reduce((s, x) => s + (x.gross_total || 0), 0), [invoices]);
  const faturaSatisCount = useMemo(() => invoices.filter(i => i.type === 'satis').length, [invoices]);
  const faturaSatisTotal = useMemo(() => invoices.filter(i => i.type === 'satis').reduce((s, x) => s + (x.gross_total || 0), 0), [invoices]);

  const kasaTahsilat = useMemo(() => cashTx.filter(c => c.type === 'tahsilat').reduce((s, x) => s + (x.amount || 0), 0), [cashTx]);
  const kasaOdeme = useMemo(() => cashTx.filter(c => c.type === 'odeme').reduce((s, x) => s + (x.amount || 0), 0), [cashTx]);

  const posBlokedeToplam = useMemo(() => posBlocks.filter(p => p.status === 'blocked').reduce((s, x) => s + (x.net_amount || 0), 0), [posBlocks]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Raporlar</h2>

      <div className="toolbar" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'cari' ? '' : 'btn-secondary'}`} onClick={() => setTab('cari')}>Cari Raporları</button>
        <button className={`btn ${tab === 'stok' ? '' : 'btn-secondary'}`} onClick={() => setTab('stok')}>Stok Raporları</button>
        <button className={`btn ${tab === 'fatura' ? '' : 'btn-secondary'}`} onClick={() => setTab('fatura')}>Fatura Raporları</button>
        <button className={`btn ${tab === 'banka' ? '' : 'btn-secondary'}`} onClick={() => setTab('banka')}>Banka Hesap Raporları</button>
        <button className={`btn ${tab === 'kasa' ? '' : 'btn-secondary'}`} onClick={() => setTab('kasa')}>Kasa Raporları</button>
        <button className={`btn ${tab === 'pos' ? '' : 'btn-secondary'}`} onClick={() => setTab('pos')}>POS Raporları</button>
        <button className={`btn ${tab === 'tahsilat' ? '' : 'btn-secondary'}`} onClick={() => setTab('tahsilat')}>Tahsilat Raporları</button>
      </div>

      {message && <div className="text-muted" style={{ marginBottom: 8 }}>{message}</div>}

      {tab === 'cari' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Cari Bazlı Kar Raporları</div>
            <div className="text-muted" style={{ fontSize: 12 }}>Alış maliyeti ve satış fiyatları üzerinden kârlılık. Not: Maliyet/stoğa giriş verileri eklendikten sonra hesaplanacak.</div>
          </div>
        </div>
      )}

      {tab === 'stok' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Stok Adetleri</div>
            <div className="text-muted" style={{ fontSize: 12 }}>Stok hareketleri modülü eklendikten sonra adetler hesaplanacak.</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Stok Bazlı Kar Raporları</div>
            <div className="text-muted" style={{ fontSize: 12 }}>Alış maliyet verileri eklendiğinde kârlılık üretilecek.</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Stok Bazlı Ortalama Fiyat</div>
            <div className="text-muted" style={{ fontSize: 12 }}>İleride fatura satırlarından ortalama satış fiyatı hesaplanacak.</div>
          </div>
        </div>
      )}

      {tab === 'fatura' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Alış Faturası Adedi</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : faturaAlisCount}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Alış Faturası Toplamı</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : faturaAlisTotal.toFixed(2)} TL</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Satış Faturası Adedi</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : faturaSatisCount}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Satış Faturası Toplamı</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : faturaSatisTotal.toFixed(2)} TL</div>
          </div>
        </div>
      )}

      {tab === 'banka' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Hesap Bazlı Bakiyeler</div>
            <div className="text-muted" style={{ fontSize: 12 }}>Banka hareketleri modülü ile bakiyeler hesaplanacak.</div>
          </div>
        </div>
      )}

      {tab === 'kasa' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Toplam Nakit Giriş (Tahsilat)</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : kasaTahsilat.toFixed(2)} TL</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Toplam Nakit Çıkış (Ödeme)</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : kasaOdeme.toFixed(2)} TL</div>
          </div>
        </div>
      )}

      {tab === 'pos' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Blokede Bekleyen İşlemler (Net)</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : posBlokedeToplam.toFixed(2)} TL</div>
          </div>
        </div>
      )}

      {tab === 'tahsilat' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Toplam Tahsilat</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : kasaTahsilat.toFixed(2)} TL</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 12, opacity: 0.8 }}>Toplam Ödeme</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{loading ? '...' : kasaOdeme.toFixed(2)} TL</div>
          </div>
        </div>
      )}
    </div>
  );
}
