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

export type CariListParams = {
  page: number;
  pageSize: number;
  sortBy?: keyof CariAccount | 'created_at' | 'code' | 'title' | null;
  sortDir?: 'asc' | 'desc' | null;
  search?: string;
};

export async function paginatedCariAccounts(params: CariListParams) {
  const { page, pageSize, sortBy, sortDir, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let req = supabase
    .from('cari_accounts')
    .select('*', { count: 'exact' })
    .range(from, to);
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    req = req.or(`code.ilike.${q},title.ilike.${q}`);
  }
  if (sortBy && sortDir) {
    req = req.order(String(sortBy), { ascending: sortDir === 'asc' });
  } else {
    req = req.order('created_at', { ascending: false });
  }
  const { data, count, error } = await req;
  return { rows: (data as CariAccount[]) ?? [], total: count ?? 0, error };
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

export async function generateNextCariCode(byType: 'musteri' | 'tedarikci' | 'diger') {
  const prefix = byType === 'musteri' ? 'MST' : byType === 'tedarikci' ? 'TDR' : 'DGR';
  const { data, error } = await supabase
    .from('cari_accounts')
    .select('code')
    .ilike('code', `${prefix}%`)
    .order('code', { ascending: false })
    .limit(1);
  if (error) return { code: `${prefix}0001`, error };
  const last = data?.[0]?.code ?? '';
  const num = parseInt((last.match(/(\d+)$/)?.[1] ?? '0'), 10) + 1;
  const next = `${prefix}${String(num).padStart(4, '0')}`;
  return { code: next, error: null };
}


