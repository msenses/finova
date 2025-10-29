import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Tab = 'cari' | 'stok' | 'fatura' | 'banka' | 'kasa' | 'pos' | 'tahsilat';

export default function Reports() {
  const [tab, setTab] = useState<Tab>('fatura');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [invoices, setInvoices] = useState<Array<{ id: string; type: string; cari_id: string; gross_total: number }>>([]);
  const [cashTx, setCashTx] = useState<Array<{ type: string; amount: number; cari_id: string | null }>>([]);
  const [posBlocks, setPosBlocks] = useState<Array<{ status: string; net_amount: number }>>([]);
  const [invoiceLines, setInvoiceLines] = useState<Array<{ invoice_id: string; item_id: string; qty: number }>>([]);
  const [items, setItems] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [caris, setCaris] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [bankTx, setBankTx] = useState<Array<{ type: string; amount: number; cari_id: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessage('');
      try {
        const [invRes, cashRes, posRes] = await Promise.all([
          supabase.from('invoices').select('id,type,cari_id,gross_total'),
          supabase.from('cash_transactions').select('type,amount,cari_id'),
          supabase.from('pos_blocks').select('status,net_amount'),
        ]);
        if (!cancelled) {
          if (!invRes.error) setInvoices((invRes.data as any) ?? []);
          if (!cashRes.error) setCashTx((cashRes.data as any) ?? []);
          if (!posRes.error) setPosBlocks((posRes.data as any) ?? []);
        }
        // invoice_lines ve referans listeleri
        const invIds = ((invRes.data as any) ?? []).map((r: any) => r.id);
        if (invIds.length) {
          const [linesRes, itemsRes, carisRes] = await Promise.all([
            supabase.from('invoice_lines').select('invoice_id,item_id,qty').in('invoice_id', invIds),
            supabase.from('items').select('id,code,name'),
            supabase.from('cari_accounts').select('id,title,type'),
          ]);
          if (!cancelled) {
            if (!linesRes.error) setInvoiceLines((linesRes.data as any) ?? []);
            if (!itemsRes.error) setItems((itemsRes.data as any) ?? []);
            if (!carisRes.error) setCaris((carisRes.data as any) ?? []);
          }
        }
        const bankRes = await supabase.from('bank_transactions').select('type,amount,cari_id');
        if (!cancelled && !bankRes.error) setBankTx((bankRes.data as any) ?? []);
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

  // Cari raporlari hesaplari
  const itemIdTo = useMemo(() => Object.fromEntries(items.map(it => [it.id, it])), [items]);
  const cariIdTo = useMemo(() => Object.fromEntries(caris.map(c => [c.id, c])), [caris]);

  // Tedarikçi bazlı toplam alış ve ödeme/borç
  const supplierTotals = useMemo(() => {
    const totals: Record<string, { title: string; totalPurchase: number; paid: number; debt: number }> = {};
    const alisByCari = new Map<string, number>();
    invoices.filter(i => i.type === 'alis').forEach(i => {
      alisByCari.set(i.cari_id, (alisByCari.get(i.cari_id) || 0) + (i.gross_total || 0));
    });
    const odemeByCari = new Map<string, number>();
    cashTx.filter(c => c.type === 'odeme' && c.cari_id).forEach(c => {
      const key = c.cari_id as string;
      odemeByCari.set(key, (odemeByCari.get(key) || 0) + (c.amount || 0));
    });
    bankTx.filter(b => b.type === 'cikis' && b.cari_id).forEach(b => {
      const key = b.cari_id as string;
      odemeByCari.set(key, (odemeByCari.get(key) || 0) + (b.amount || 0));
    });
    // cash_transactions seçimi cari_id içermiyor; güvenli tarafta sıfır kabul edelim
    alisByCari.forEach((total, cariId) => {
      const title = cariIdTo[cariId]?.title || cariId;
      const paid = odemeByCari.get(cariId) || 0;
      const debt = Math.max(0, total - paid);
      totals[cariId] = { title, totalPurchase: total, paid, debt };
    });
    return totals;
  }, [invoices, cashTx, bankTx, cariIdTo]);

  // Tedarikçilerden alınan ürünlerin ürün bazlı toplam adeti
  const supplierItemQty = useMemo(() => {
    const set = new Set(invoices.filter(i => i.type === 'alis').map(i => i.id));
    const byItem: Record<string, number> = {};
    invoiceLines.filter(l => set.has(l.invoice_id)).forEach(l => {
      byItem[l.item_id] = (byItem[l.item_id] || 0) + (l.qty || 0);
    });
    return byItem;
  }, [invoices, invoiceLines]);

  // Müşteri bazlı toplam satış adet ve tutar; alacak = satış toplamı - tahsilat
  const customerTotals = useMemo(() => {
    const satisByCari = new Map<string, number>();
    invoices.filter(i => i.type === 'satis').forEach(i => {
      satisByCari.set(i.cari_id, (satisByCari.get(i.cari_id) || 0) + (i.gross_total || 0));
    });
    const qtyByCari = new Map<string, number>();
    const satisIds = new Set(invoices.filter(i => i.type === 'satis').map(i => i.id));
    invoiceLines.filter(l => satisIds.has(l.invoice_id)).forEach(l => {
      // satış adet toplamı (ürün ayrımı yapılmadan)
      const inv = invoices.find(i => i.id === l.invoice_id);
      if (inv) qtyByCari.set(inv.cari_id, (qtyByCari.get(inv.cari_id) || 0) + (l.qty || 0));
    });
    const tahsilatByCari = new Map<string, number>();
    cashTx.filter(c => c.type === 'tahsilat' && c.cari_id).forEach(c => {
      const key = c.cari_id as string;
      tahsilatByCari.set(key, (tahsilatByCari.get(key) || 0) + (c.amount || 0));
    });
    bankTx.filter(b => b.type === 'giris' && b.cari_id).forEach(b => {
      const key = b.cari_id as string;
      tahsilatByCari.set(key, (tahsilatByCari.get(key) || 0) + (b.amount || 0));
    });
    const result: Record<string, { title: string; totalQty: number; totalSales: number; receivable: number }> = {};
    satisByCari.forEach((totalSales, cariId) => {
      const title = cariIdTo[cariId]?.title || cariId;
      const totalQty = qtyByCari.get(cariId) || 0;
      const paid = tahsilatByCari.get(cariId) || 0;
      result[cariId] = { title, totalQty, totalSales, receivable: Math.max(0, totalSales - paid) };
    });
    return result;
  }, [invoices, invoiceLines, cashTx, bankTx, cariIdTo]);

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
          <div className="card md-col-span-2">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Tedarikçi Bazlı Alış ve Ödeme</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tedarikçi</th>
                    <th>Toplam Alış</th>
                    <th>Ödenen</th>
                    <th>Borç</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(supplierTotals).map(([id, r]) => (
                    <tr key={id}><td>{r.title}</td><td>{r.totalPurchase.toFixed(2)} TL</td><td>{r.paid.toFixed(2)} TL</td><td>{r.debt.toFixed(2)} TL</td></tr>
                  ))}
                  {!Object.keys(supplierTotals).length && (
                    <tr><td colSpan={4}>{loading ? 'Yükleniyor...' : 'Kayıt yok'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Ürün Bazlı Alınan Adet (Tüm Tedarikçiler)</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Toplam Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(supplierItemQty).map(([itemId, qty]) => (
                    <tr key={itemId}><td>{itemIdTo[itemId]?.code} - {itemIdTo[itemId]?.name}</td><td>{Number(qty).toFixed(3)}</td></tr>
                  ))}
                  {!Object.keys(supplierItemQty).length && (
                    <tr><td colSpan={2}>{loading ? 'Yükleniyor...' : 'Kayıt yok'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card md-col-span-2">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Müşteri Bazlı Satış ve Alacak</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Müşteri</th>
                    <th>Satılan Ürün Toplam Adet</th>
                    <th>Toplam Satış</th>
                    <th>Alacak</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(customerTotals).map(([id, r]) => (
                    <tr key={id}><td>{r.title}</td><td>{(r.totalQty % 1 === 0 ? r.totalQty : Number(r.totalQty).toFixed(3))}</td><td>{r.totalSales.toFixed(2)} TL</td><td>{r.receivable.toFixed(2)} TL</td></tr>
                  ))}
                  {!Object.keys(customerTotals).length && (
                    <tr><td colSpan={4}>{loading ? 'Yükleniyor...' : 'Kayıt yok'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
