import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createItem, deleteItem, listItems, updateItem, type Item, type UnitType, generateNextItemCode } from '../services/items';

type FormState = {
  id?: string;
  code: string;
  name: string;
  unit: UnitType;
  vat_rate?: number;
  price?: number;
};

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [authed, setAuthed] = useState<boolean>(false);

  const [form, setForm] = useState<FormState>({
    code: '',
    name: '',
    unit: 'ADET',
    vat_rate: 20,
    price: 0,
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

  const isValid = useMemo(() => form.code.trim().length > 0 && form.name.trim().length > 0, [form.code, form.name]);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await listItems(search);
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
        const { error } = await updateItem(editingId, form);
        if (error) throw error;
      } else {
        const { error } = await createItem(form);
        if (error) throw error;
      }
      await load();
      onReset();
      if (!editingId) { setShowAdd(false); }
    } catch (e: any) {
      setMessage(e?.message ?? 'Kaydetme hatası');
    } finally {
      setLoading(false);
    }
  }

  function onEdit(row: Item) {
    setEditingId(row.id);
    setForm({ id: row.id, code: row.code, name: row.name, unit: row.unit, vat_rate: row.vat_rate, price: row.price });
    setShowAdd(true);
  }

  async function onDelete(id: string) {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await deleteItem(id);
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
    setForm({ code: '', name: '', unit: 'ADET', vat_rate: 20, price: 0 });
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Stok / Ürünler</h2>
      {!authed && (
        <div className="card" style={{ marginBottom: 12, background: '#fff8e1' }}>
          Supabase RLS politikaları nedeniyle işlemler için giriş gereklidir. Login akışı etkinleştirildiğinde CRUD çalışacaktır.
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{editingId ? 'Ürün düzenle' : 'Yeni ürün ekle'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={async () => { onReset(); const { code } = await generateNextItemCode(); setForm((p) => ({ ...p, code })); setShowAdd(true); }}>Yeni Ürün Ekle</button>
            {(showAdd || editingId) && (
              <button type="button" className="btn btn-secondary" onClick={() => { onReset(); setShowAdd(false); }}>Kapat</button>
            )}
          </div>
        </div>
        <div className={`collapse ${showAdd || editingId ? 'open' : ''}`}>
          <form onSubmit={onSubmit} className="grid-3" style={{ paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Kod</div>
            <input className="form-control" value={form.code} readOnly placeholder="Yeni ürün açılınca otomatik oluşur" required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Ad</div>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Birim</div>
            <select className="form-control" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as UnitType })}>
              <option value="ADET">ADET</option>
              <option value="KG">KG</option>
              <option value="LT">LT</option>
              <option value="PAKET">PAKET</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>KDV (%)</div>
            <input className="form-control" type="number" step="0.01" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Birim Fiyat</div>
            <input className="form-control" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
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
          <input className="form-control" placeholder="Ara: kod veya ad" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
          <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>Yenile</button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Birim</th>
                <th>KDV (%)</th>
                <th>Birim Fiyat</th>
                <th style={{ width: 160 }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.unit}</td>
                  <td>{r.vat_rate}</td>
                  <td>{r.price}</td>
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
                  <td colSpan={6}>{loading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


