import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listInvoices, createInvoice, type Invoice } from '../services/invoices';
import { listItems, type Item } from '../services/items';
import { listCariAccounts, type CariAccount } from '../services/cari';
import { createCashTransaction } from '../services/cash';
import { listBankAccounts, type BankAccount } from '../services/bank';
import { createBankTransaction } from '../services/bankTx';
import { createPosBlock } from '../services/pos';

type PayMethod = 'NAKIT' | 'IBAN' | 'POS' | 'VADE';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [caris, setCaris] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authed, setAuthed] = useState(false);

  const [cariId, setCariId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(20);
  const [payMethod, setPayMethod] = useState<PayMethod>('NAKIT');
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [posBankAccountId, setPosBankAccountId] = useState('');
  const [dueDate, setDueDate] = useState<string>('');

  const net = useMemo(() => Number((qty * unitPrice).toFixed(2)), [qty, unitPrice]);
  const vat = useMemo(() => Number(((net * vatRate) / 100).toFixed(2)), [net, vatRate]);
  const gross = useMemo(() => Number((net + vat).toFixed(2)), [net, vat]);
  const selectedCari = useMemo(() => caris.find((c) => c.id === cariId), [caris, cariId]);
  const derivedType = useMemo(() => (selectedCari?.type === 'tedarikci' ? 'alis' : 'satis') as 'alis' | 'satis', [selectedCari]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setAuthed(Boolean(data.session));
      if (data.session) {
        await Promise.all([loadInvoices(), loadLists(), loadBanks()]);
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  async function loadInvoices() {
    const { data, error } = await listInvoices();
    if (!error) setInvoices(data ?? []);
  }

  async function loadLists() {
    const [itemsRes, carisRes] = await Promise.all([
      listItems(''),
      listCariAccounts(''),
    ]);
    if (!itemsRes.error) setItems(itemsRes.data ?? []);
    if (!carisRes.error) setCaris(carisRes.data ?? []);
  }

  async function loadBanks() {
    const res = await listBankAccounts('');
    if (!res.error) setBankAccounts(res.data ?? []);
  }

  useEffect(() => {
    // Ürün seçilince varsayılan fiyat ve KDV uygula
    const it = items.find((i) => i.id === itemId);
    if (it) {
      setUnitPrice(it.price);
      setVatRate(it.vat_rate);
    }
  }, [itemId, items]);

  const isValid = useMemo(() => {
    if (!cariId || !itemId || qty <= 0 || unitPrice < 0) return false;
    if (payMethod === 'IBAN' && !bankAccountId) return false;
    if (payMethod === 'POS' && !posBankAccountId) return false;
    if (payMethod === 'VADE' && !dueDate) return false;
    return true;
  }, [cariId, itemId, qty, unitPrice, payMethod, bankAccountId, posBankAccountId, dueDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setMessage('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const inv = {
        type: derivedType,
        cari_id: cariId,
        invoice_date: today,
        due_date: payMethod === 'VADE' ? (dueDate || today) : today,
        currency: 'TRY',
        net_total: net,
        vat_total: vat,
        gross_total: gross,
      };
      const line = {
        item_id: itemId,
        qty,
        unit_price: unitPrice,
        vat_rate: vatRate,
        line_total: gross,
      };
      const { data, error } = await createInvoice(inv, [line]);
      if (error || !data) throw error ?? new Error('Fatura kaydı başarısız');

      if (payMethod === 'NAKIT') {
        const ctType = derivedType === 'alis' ? 'odeme' : 'tahsilat';
        await createCashTransaction({ type: ctType as any, cari_id: cariId, amount: gross, description: `${derivedType === 'alis' ? 'Fatura ödemesi' : 'Fatura tahsilatı'} ${data.id}` });
        await supabase.from('invoices').update({ status: 'posted' }).eq('id', data.id);
      } else if (payMethod === 'IBAN') {
        const bType = derivedType === 'alis' ? 'cikis' : 'giris';
        await createBankTransaction({ bank_account_id: bankAccountId, type: bType as any, amount: gross, description: `Fatura ${derivedType === 'alis' ? 'ödemesi' : 'tahsilatı'} ${data.id}`, cari_id: cariId });
        await supabase.from('invoices').update({ status: 'posted' }).eq('id', data.id);
      } else if (payMethod === 'POS') {
        await createPosBlock({ bank_account_id: posBankAccountId, reference: `Fatura ${data.id}`, gross_amount: gross, fee_amount: 0, status: 'blocked' });
        await supabase.from('invoices').update({ status: 'posted' }).eq('id', data.id);
      } else if (payMethod === 'VADE') {
        await supabase.from('invoices').update({ status: 'draft' }).eq('id', data.id);
      }

      await loadInvoices();
      setCariId(''); setItemId(''); setQty(1); setUnitPrice(0); setVatRate(20); setPayMethod('NAKIT'); setBankAccountId(''); setPosBankAccountId(''); setDueDate(''); setShowAdd(false);
    } catch (e: any) {
      setMessage(e?.message ?? 'Fatura oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Faturalar</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS nedeniyle işlemler için giriş gereklidir. Login açıldığında akış çalışacaktır.
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>Yeni fatura</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => setShowAdd(true)}>Yeni Fatura Oluştur</button>
            {showAdd && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Kapat</button>
            )}
          </div>
        </div>
        <div className={`collapse ${showAdd ? 'open' : ''}`}>
          <form onSubmit={onSubmit} className="grid-3" style={{ paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Cari</div>
            <select className="form-control" value={cariId} onChange={(e) => setCariId(e.target.value)}>
              <option value="">Seçiniz</option>
              {caris.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Ürün</div>
            <select className="form-control" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Seçiniz</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} - {i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Miktar</div>
            <input className="form-control" type="number" step="0.001" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Birim Fiyat</div>
            <input className="form-control" type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>KDV (%)</div>
            <input className="form-control" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Ödeme</div>
            <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)}>
              <option value="NAKIT">Nakit</option>
              <option value="IBAN">IBAN</option>
              <option value="POS">POS</option>
              <option value="VADE">Vade</option>
            </select>
          </div>

          {payMethod === 'IBAN' && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Banka Hesabı</div>
              <select className="form-control" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">Seçiniz</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.iban ? `- ${b.iban}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {payMethod === 'POS' && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>POS Banka Hesabı</div>
              <select className="form-control" value={posBankAccountId} onChange={(e) => setPosBankAccountId(e.target.value)}>
                <option value="">Seçiniz</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.name} {b.iban ? `- ${b.iban}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {payMethod === 'VADE' && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Vade Tarihi</div>
              <input className="form-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}

          <div className="md-col-span-2">
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tutarlar</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div>Net: <b>{net.toFixed(2)}</b></div>
              <div>KDV: <b>{vat.toFixed(2)}</b></div>
              <div>Toplam: <b>{gross.toFixed(2)}</b></div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Fatura Türü</div>
            <input className="form-control" readOnly value={derivedType === 'alis' ? 'Alış' : 'Satış'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn" type="submit" disabled={loading || !isValid}>Kaydet</button>
          </div>
          </form>
        </div>
        {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Net</th>
                <th>KDV</th>
                <th>Toplam</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at ?? '').toLocaleString()}</td>
                  <td>{r.type}</td>
                  <td>{r.net_total}</td>
                  <td>{r.vat_total}</td>
                  <td>{r.gross_total}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
              {!invoices.length && (
                <tr><td colSpan={6}>Kayıt bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


