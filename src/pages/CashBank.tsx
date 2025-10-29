import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createBankAccount, deleteBankAccount, listBankAccounts, updateBankAccount, type BankAccount } from '../services/bank';
import { createCashTransaction, deleteCashTransaction, listCashTransactions, updateCashTransaction, type CashTransaction, type CashTxnType } from '../services/cash';
import { createPosBlock, deletePosBlock, listPosBlocks, updatePosBlock, type PosBlock, type PosStatus } from '../services/pos';

type FormState = {
  id?: string;
  name: string;
  bank_name?: string;
  iban?: string;
};

export default function CashBank() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string>('');
  const [authed, setAuthed] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({ name: '', bank_name: '', iban: '' });
  const [showBankAdd, setShowBankAdd] = useState<boolean>(false);
  // Kasa state
  const [cash, setCash] = useState<CashTransaction[]>([]);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashEditingId, setCashEditingId] = useState<string | undefined>(undefined);
  const [cashForm, setCashForm] = useState<{ type: CashTxnType; amount: number; description: string; cari_id?: string }>({ type: 'tahsilat', amount: 0, description: '' });
  const [showCashAdd, setShowCashAdd] = useState<boolean>(false);
  // POS state
  const [pos, setPos] = useState<PosBlock[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posEditingId, setPosEditingId] = useState<string | undefined>(undefined);
  const [posForm, setPosForm] = useState<{ bank_account_id: string; reference: string; gross_amount: number; fee_amount: number; block_release_date: string; status: PosStatus }>({ bank_account_id: '', reference: '', gross_amount: 0, fee_amount: 0, block_release_date: '', status: 'blocked' });
  const [showPosAdd, setShowPosAdd] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setAuthed(Boolean(data.session));
      if (data.session) { void load(); void loadCash(); void loadPos(); }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  const isValid = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await listBankAccounts(search);
      if (error) throw error;
      setItems(data ?? []);
    } catch (e: any) {
      setMessage(e?.message ?? 'Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function loadCash() {
    setCashLoading(true);
    try {
      const { data, error } = await listCashTransactions();
      if (error) throw error;
      setCash(data ?? []);
    } catch (e) {
      // ignore
    } finally {
      setCashLoading(false);
    }
  }

  async function loadPos() {
    setPosLoading(true);
    try {
      const { data, error } = await listPosBlocks();
      if (error) throw error;
      setPos(data ?? []);
    } catch (e) {
      // ignore
    } finally {
      setPosLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setMessage('');
    try {
      if (editingId) {
        const { error } = await updateBankAccount(editingId, form);
        if (error) throw error;
      } else {
        const { error } = await createBankAccount(form);
        if (error) throw error;
      }
      await load();
      onReset();
    } catch (e: any) {
      setMessage(e?.message ?? 'Kaydetme hatası');
    } finally {
      setLoading(false);
    }
  }

  function onEdit(row: BankAccount) {
    setEditingId(row.id);
    setShowBankAdd(true);
    setForm({ id: row.id, name: row.name, bank_name: row.bank_name ?? '', iban: row.iban ?? '' });
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu banka hesabını silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await deleteBankAccount(id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? 'Silme hatası');
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    setEditingId(undefined);
    setForm({ name: '', bank_name: '', iban: '' });
  }

  // Kasa handlers
  async function onCashSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCashLoading(true);
    try {
      if (cashEditingId) {
        const { error } = await updateCashTransaction(cashEditingId, cashForm);
        if (error) throw error;
      } else {
        const { error } = await createCashTransaction(cashForm);
        if (error) throw error;
      }
      await loadCash();
      onCashReset();
    } catch (e) {
      // noop
    } finally {
      setCashLoading(false);
    }
  }

  function onCashEdit(row: CashTransaction) {
    setCashEditingId(row.id);
    setShowCashAdd(true);
    setCashForm({ type: row.type, amount: row.amount, description: row.description ?? '', cari_id: row.cari_id ?? undefined });
  }

  async function onCashDelete(id: string) {
    if (!window.confirm('Bu kasa hareketini silmek istediğinize emin misiniz?')) return;
    setCashLoading(true);
    try {
      const { error } = await deleteCashTransaction(id);
      if (error) throw error;
      await loadCash();
    } catch (e) {
      // noop
    } finally {
      setCashLoading(false);
    }
  }

  function onCashReset() {
    setCashEditingId(undefined);
    setCashForm({ type: 'tahsilat', amount: 0, description: '' });
  }

  // POS handlers
  async function onPosSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPosLoading(true);
    try {
      if (posEditingId) {
        const { error } = await updatePosBlock(posEditingId, posForm);
        if (error) throw error;
      } else {
        const { error } = await createPosBlock(posForm);
        if (error) throw error;
      }
      await loadPos();
      onPosReset();
    } catch (e) {
      // noop
    } finally {
      setPosLoading(false);
    }
  }

  function onPosEdit(row: PosBlock) {
    setPosEditingId(row.id);
    setShowPosAdd(true);
    setPosForm({
      bank_account_id: row.bank_account_id,
      reference: row.reference ?? '',
      gross_amount: row.gross_amount,
      fee_amount: row.fee_amount,
      block_release_date: (row.block_release_date ?? ''),
      status: row.status,
    });
  }

  async function onPosDelete(id: string) {
    if (!window.confirm('Bu POS blokesini silmek istediğinize emin misiniz?')) return;
    setPosLoading(true);
    try {
      const { error } = await deletePosBlock(id);
      if (error) throw error;
      await loadPos();
    } catch (e) {
      // noop
    } finally {
      setPosLoading(false);
    }
  }

  function onPosReset() {
    setPosEditingId(undefined);
    setPosForm({ bank_account_id: '', reference: '', gross_amount: 0, fee_amount: 0, block_release_date: '', status: 'blocked' });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Kasa / Banka</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS politikaları nedeniyle işlemler için giriş gereklidir. Login akışı etkinleştirildiğinde CRUD çalışacaktır.
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{editingId ? 'Banka hesabı düzenle' : 'Yeni banka hesabı'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => { onReset(); setShowBankAdd(true); }}>Yeni Banka Hesabı</button>
            {(showBankAdd || editingId) && (
              <button type="button" className="btn btn-secondary" onClick={() => { onReset(); setShowBankAdd(false); }}>Kapat</button>
            )}
          </div>
        </div>
        <div className={`collapse ${showBankAdd || editingId ? 'open' : ''}`}>
          <form onSubmit={onSubmit} className="grid-3" style={{ paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Hesap Adı</div>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Banka</div>
            <input className="form-control" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>IBAN</div>
            <input className="form-control" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn" type="submit" disabled={loading || !isValid}>{editingId ? 'Güncelle' : 'Ekle'}</button>
            {editingId && (
              <button className="btn btn-secondary" type="button" onClick={onReset}>Temizle</button>
            )}
          </div>
          </form>
        </div>
        {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input className="form-control" placeholder="Ara: hesap adı/banka/IBAN" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
          <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>Yenile</button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Hesap Adı</th>
                <th>Banka</th>
                <th>IBAN</th>
                <th style={{ width: 160 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.bank_name}</td>
                  <td>{r.iban}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" onClick={() => onEdit(r)}>Düzenle</button>
                      <button className="btn btn-danger" onClick={() => onDelete(r.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={4}>{loading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Kasa Hareketleri</h3>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{cashEditingId ? 'Kasa hareketi düzenle' : 'Yeni kasa hareketi'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => { onCashReset(); setShowCashAdd(true); }}>Yeni Kasa Hareketi</button>
            {(showCashAdd || cashEditingId) && (
              <button type="button" className="btn btn-secondary" onClick={() => { onCashReset(); setShowCashAdd(false); }}>Kapat</button>
            )}
          </div>
        </div>
        <div className={`collapse ${showCashAdd || cashEditingId ? 'open' : ''}`}>
          <form onSubmit={onCashSubmit} className="grid-3" style={{ marginBottom: 12, paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tür</div>
            <select className="form-control" value={cashForm.type} onChange={(e) => setCashForm({ ...cashForm, type: e.target.value as CashTxnType })}>
              <option value="tahsilat">Tahsilat</option>
              <option value="odeme">Ödeme</option>
              <option value="avans">Avans</option>
              <option value="virman">Virman</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tutar</div>
            <input className="form-control" type="number" step="0.01" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) })} />
          </div>
          <div className="md-col-span-2">
            <div style={{ fontSize: 12, marginBottom: 4 }}>Açıklama</div>
            <input className="form-control" value={cashForm.description} onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn" type="submit" disabled={cashLoading}>{cashEditingId ? 'Güncelle' : 'Ekle'}</button>
            {cashEditingId && (
              <button className="btn btn-secondary" type="button" onClick={onCashReset}>Temizle</button>
            )}
          </div>
          </form>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Tutar</th>
                <th>Açıklama</th>
                <th style={{ width: 160 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {cash.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at ?? '').toLocaleString()}</td>
                  <td>{r.type}</td>
                  <td>{r.amount}</td>
                  <td>{r.description}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" onClick={() => onCashEdit(r)}>Düzenle</button>
                      <button className="btn btn-danger" onClick={() => onCashDelete(r.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!cash.length && (
                <tr>
                  <td colSpan={5}>{cashLoading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>POS Blokeleri</h3>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{posEditingId ? 'POS blokesini düzenle' : 'Yeni POS blokesi'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => { onPosReset(); setShowPosAdd(true); }}>Yeni POS Blokesı</button>
            {(showPosAdd || posEditingId) && (
              <button type="button" className="btn btn-secondary" onClick={() => { onPosReset(); setShowPosAdd(false); }}>Kapat</button>
            )}
          </div>
        </div>
        <div className={`collapse ${showPosAdd || posEditingId ? 'open' : ''}`}>
          <form onSubmit={onPosSubmit} className="grid-3" style={{ marginBottom: 12, paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Banka Hesabı</div>
            <select className="form-control" value={posForm.bank_account_id} onChange={(e) => setPosForm({ ...posForm, bank_account_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {items.map((b) => (
                <option key={b.id} value={b.id}>{b.name} {b.iban ? `(${b.iban})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Referans</div>
            <input className="form-control" value={posForm.reference} onChange={(e) => setPosForm({ ...posForm, reference: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Brüt Tutar</div>
            <input className="form-control" type="number" step="0.01" value={posForm.gross_amount} onChange={(e) => setPosForm({ ...posForm, gross_amount: Number(e.target.value) })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Komisyon</div>
            <input className="form-control" type="number" step="0.01" value={posForm.fee_amount} onChange={(e) => setPosForm({ ...posForm, fee_amount: Number(e.target.value) })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Bloke Çözüm Tarihi</div>
            <input className="form-control" type="date" value={posForm.block_release_date} onChange={(e) => setPosForm({ ...posForm, block_release_date: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Durum</div>
            <select className="form-control" value={posForm.status} onChange={(e) => setPosForm({ ...posForm, status: e.target.value as PosStatus })}>
              <option value="blocked">Blokede</option>
              <option value="released">Çözülmüş</option>
              <option value="transferred">Aktarıldı</option>
            </select>
          </div>
          <div className="md-col-span-2">
            <div style={{ fontSize: 12, marginBottom: 4 }}>Net</div>
            <div><b>{(Number(posForm.gross_amount || 0) - Number(posForm.fee_amount || 0)).toFixed(2)}</b></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn" type="submit" disabled={posLoading}>{posEditingId ? 'Güncelle' : 'Ekle'}</button>
            {posEditingId && (
              <button className="btn btn-secondary" type="button" onClick={onPosReset}>Temizle</button>
            )}
          </div>
          </form>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Banka Hesabı</th>
                <th>Ref</th>
                <th>Brüt</th>
                <th>Komisyon</th>
                <th>Net</th>
                <th>Bloke Çözüm</th>
                <th>Durum</th>
                <th style={{ width: 160 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at ?? '').toLocaleString()}</td>
                  <td>{items.find((b) => b.id === r.bank_account_id)?.name}</td>
                  <td>{r.reference}</td>
                  <td>{r.gross_amount}</td>
                  <td>{r.fee_amount}</td>
                  <td>{r.net_amount}</td>
                  <td>{r.block_release_date}</td>
                  <td>{r.status}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" onClick={() => onPosEdit(r)}>Düzenle</button>
                      <button className="btn btn-danger" onClick={() => onPosDelete(r.id)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pos.length && (
                <tr>
                  <td colSpan={9}>{posLoading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


