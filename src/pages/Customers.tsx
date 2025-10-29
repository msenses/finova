import React, { useEffect, useMemo, useState } from 'react';
import { createCariAccount, deleteCariAccount, listCariAccounts, updateCariAccount, type CariAccount } from '../services/cari';
import { supabase } from '../lib/supabaseClient';

type FormState = {
  id?: string;
  code: string;
  title: string;
  type: 'musteri' | 'tedarikci' | 'diger';
  tax_number?: string;
  tax_office?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export default function Customers() {
  const [items, setItems] = useState<CariAccount[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string>('');
  const [authed, setAuthed] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    code: '',
    title: '',
    type: 'musteri',
    tax_number: '',
    tax_office: '',
    email: '',
    phone: '',
    address: ''
  });

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

  const isValid = useMemo(() => form.code.trim().length > 0 && form.title.trim().length > 0, [form.code, form.title]);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await listCariAccounts(search);
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
        const { error } = await updateCariAccount(editingId, form);
        if (error) throw error;
      } else {
        const { error } = await createCariAccount(form);
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

  function onEdit(row: CariAccount) {
    setEditingId(row.id);
    setForm({
      id: row.id,
      code: row.code,
      title: row.title,
      type: row.type,
      tax_number: row.tax_number ?? '',
      tax_office: row.tax_office ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      address: row.address ?? ''
    });
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu cariyi silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await deleteCariAccount(id);
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
    setForm({ code: '', title: '', type: 'musteri', tax_number: '', tax_office: '', email: '', phone: '', address: '' });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Cari Hesaplar</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS politikaları nedeniyle işlemler için giriş gereklidir. Login akışı etkinleştirildiğinde CRUD çalışacaktır.
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <form onSubmit={onSubmit} className="grid-3">
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Kod</div>
            <input className="form-control" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Unvan</div>
            <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tür</div>
            <select className="form-control" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}>
              <option value="musteri">Müşteri</option>
              <option value="tedarikci">Tedarikçi</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Vergi No</div>
            <input className="form-control" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Vergi Dairesi</div>
            <input className="form-control" value={form.tax_office} onChange={(e) => setForm({ ...form, tax_office: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>E-posta</div>
            <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Telefon</div>
            <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Adres</div>
            <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
            <button className="btn" type="submit" disabled={loading || !isValid}>
              {editingId ? 'Güncelle' : 'Ekle'}
            </button>
            {editingId && (
              <button className="btn btn-secondary" type="button" onClick={onReset}>Temizle</button>
            )}
          </div>
        </form>
        {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input className="form-control" placeholder="Ara: kod veya unvan" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
          <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>Yenile</button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Unvan</th>
                <th>Tür</th>
                <th>Vergi No</th>
                <th>E-posta</th>
                <th>Telefon</th>
                <th style={{ width: 160 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.title}</td>
                  <td>{r.type}</td>
                  <td>{r.tax_number}</td>
                  <td>{r.email}</td>
                  <td>{r.phone}</td>
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
                  <td colSpan={7}>
                    {loading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


