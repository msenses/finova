import { supabase } from '../lib/supabaseClient';

export interface CariAccount {
  id: string;
  code: string;
  title: string;
  type: 'musteri' | 'tedarikci' | 'diger';
  tax_number: string | null;
  tax_office: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export async function listCariAccounts(query?: string) {
  let req = supabase.from('cari_accounts').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    req = req.or(`code.ilike.${q},title.ilike.${q}`);
  }
  return await req;
}

export async function createCariAccount(payload: Partial<CariAccount>) {
  const insert = {
    code: payload.code,
    title: payload.title,
    type: payload.type ?? 'musteri',
    tax_number: payload.tax_number ?? null,
    tax_office: payload.tax_office ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
  };
  return await supabase.from('cari_accounts').insert(insert).select('*').single();
}

export async function updateCariAccount(id: string, payload: Partial<CariAccount>) {
  const update = {
    code: payload.code,
    title: payload.title,
    type: payload.type,
    tax_number: payload.tax_number ?? null,
    tax_office: payload.tax_office ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
  };
  return await supabase.from('cari_accounts').update(update).eq('id', id).select('*').single();
}

export async function deleteCariAccount(id: string) {
  return await supabase.from('cari_accounts').delete().eq('id', id);
}


