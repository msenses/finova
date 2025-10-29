import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createBankAccount, deleteBankAccount, listBankAccounts, updateBankAccount, type BankAccount } from '../services/bank';

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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setAuthed(Boolean(data.session));
      if (data.session) void load();
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

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Kasa / Banka</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS politikaları nedeniyle işlemler için giriş gereklidir. Login akışı etkinleştirildiğinde CRUD çalışacaktır.
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <form onSubmit={onSubmit} className="grid-3">
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
    </div>
  );
}


