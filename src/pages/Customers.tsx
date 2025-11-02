import React, { useEffect, useMemo, useState } from 'react';
import { createCariAccount, deleteCariAccount, updateCariAccount, type CariAccount, generateNextCariCode, paginatedCariAccounts } from '../services/cari';
import { supabase } from '../lib/supabaseClient';
import { DataGrid, type DataGridFetchResult } from '../components/datagrid/DataGrid';
import { toCSV } from '../utils/csv';

type FormState = {
  id?: string;
  code: string;
  title: string;
  type: '' | 'musteri' | 'tedarikci' | 'diger';
  tax_number?: string;
  tax_office?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export default function Customers() {
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [authed, setAuthed] = useState<boolean>(false);
  const [dueInfo, setDueInfo] = useState<{ count: number; total: number; nearest?: string } | null>(null);

  const [form, setForm] = useState<FormState>({
    code: '',
    title: '',
    type: '',
    tax_number: '',
    tax_office: '',
    email: '',
    phone: '',
    address: ''
  });

  // Kısayollar: / -> arama odağı, r -> yenile, n -> yeni kayıt formu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/') {
        const el = document.querySelector<HTMLInputElement>('input[placeholder^="Ara"]');
        if (el) { e.preventDefault(); el.focus(); }
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        const btn = document.querySelector<HTMLButtonElement>('button.btn.btn-secondary');
        btn?.click();
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        setShowAdd(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const isValid = useMemo(() => form.code.trim().length > 0 && form.title.trim().length > 0 && !!form.type, [form.code, form.title, form.type]);

  async function gridFetcher(args: { page: number; pageSize: number; sortBy?: string | null; sortDir?: 'asc' | 'desc' | null; search?: string; }): Promise<DataGridFetchResult<CariAccount>> {
    const { rows, total, error } = await paginatedCariAccounts({
      page: args.page,
      pageSize: args.pageSize,
      sortBy: (args.sortBy as any) ?? 'created_at',
      sortDir: args.sortDir ?? 'desc',
      search: args.search ?? '',
    });
    if (error) throw error;
    return { rows, total };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setMessage('');
    try {
      if (editingId) {
        const { error } = await updateCariAccount(editingId, { ...form, type: (form.type || undefined) as any });
        if (error) throw error;
      } else {
        const { error } = await createCariAccount({ ...form, type: (form.type || undefined) as any });
        if (error) throw error;
      }
      // grid otomatik yenilenecek; formu kapatıyoruz
      onReset();
      if (!editingId) { setShowAdd(false); }
    } catch (e: any) {
      setMessage(e?.message ?? 'Kaydetme hatası');
    } finally {
      setLoading(false);
    }
  }

  function onEdit(row: CariAccount) {
    setEditingId(row.id);
    setShowAdd(true);
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
    void loadDueInfo(row.id);
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
    setForm({ code: '', title: '', type: '', tax_number: '', tax_office: '', email: '', phone: '', address: '' });
    setDueInfo(null);
  }

  async function loadDueInfo(cariId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id,due_date,gross_total,status')
      .eq('status', 'draft')
      .eq('cari_id', cariId);
    if (error) return;
    const count = (data as any)?.length ?? 0;
    const total = ((data as any) ?? []).reduce((s: number, x: any) => s + (x.gross_total || 0), 0);
    const nearest = ((data as any) ?? [])
      .map((x: any) => x.due_date)
      .filter(Boolean)
      .sort()[0];
    setDueInfo({ count, total, nearest });
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
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>
            {editingId ? 'Cari düzenle' : 'Yeni cari ekle'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => { onReset(); setShowAdd(true); }}>
              Yeni Cari Hesap Ekle
            </button>
            {(showAdd || editingId) && (
              <button type="button" className="btn btn-secondary" onClick={() => { onReset(); setShowAdd(false); }}>
                Kapat
              </button>
            )}
          </div>
        </div>
        <div className={`collapse ${showAdd || editingId ? 'open' : ''}`}>
          <form onSubmit={onSubmit} className="grid-3" style={{ paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Kod</div>
            <input className="form-control" value={form.code} readOnly placeholder="Tür seçince otomatik oluşur" required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Unvan</div>
            <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Tür</div>
            <select
              className="form-control"
              value={form.type}
              onChange={async (e) => {
                const val = e.target.value as FormState['type'];
                // Tür değişince otomatik kod üret (yalnızca yeni kayıtta)
                if (!editingId && val) {
                  const { code } = await generateNextCariCode(val);
                  setForm((prev) => ({ ...prev, type: val, code }));
                } else {
                  setForm((prev) => ({ ...prev, type: val }));
                }
              }}
            >
              <option value="">Tür seçin</option>
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
          <div className="md-col-span-2">
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
          {editingId && (
            <div className="card" style={{ margin: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Vadeli Açık Faturalar</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Adet: <b>{dueInfo?.count ?? 0}</b> • Toplam: <b>{(dueInfo?.total ?? 0).toFixed(2)} TL</b> {dueInfo?.nearest ? `• En yakın vade: ${dueInfo.nearest}` : ''}
              </div>
            </div>
          )}
        </div>
        {message && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{message}</div>}
      </div>

      <div className="card">
        <DataGrid<CariAccount>
          tableKey="customers"
          columns={[
            { key: 'code', title: 'Kod', width: 140 },
            { key: 'title', title: 'Unvan' },
            { key: 'type', title: 'Tür', width: 120 },
            { key: 'tax_number', title: 'Vergi No', width: 140 },
            { key: 'email', title: 'E-posta', width: 200 },
            { key: 'phone', title: 'Telefon', width: 140 },
          ]}
          fetchData={gridFetcher}
          rowActions={(r) => <>
            <button className="btn btn-secondary" onClick={() => onEdit(r)}>Düzenle</button>
            <button className="btn btn-danger" onClick={() => onDelete(r.id)}>Sil</button>
          </>}
          toolbar={<>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                const { rows } = await gridFetcher({ page: 1, pageSize: 1000, sortBy: 'created_at', sortDir: 'desc', search: '' });
                const csv = toCSV(rows, [
                  { key: 'code', title: 'Kod' },
                  { key: 'title', title: 'Unvan' },
                  { key: 'type', title: 'Tür' },
                  { key: 'tax_number', title: 'Vergi No' },
                  { key: 'email', title: 'E-posta' },
                  { key: 'phone', title: 'Telefon' },
                ]);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cari_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              CSV İndir
            </button>
          </>}
        />
      </div>
    </div>
  );
}


