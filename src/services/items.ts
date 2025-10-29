import { supabase } from '../lib/supabaseClient';

export type UnitType = 'ADET' | 'KG' | 'LT' | 'PAKET';

export interface Item {
  id: string;
  code: string;
  name: string;
  unit: UnitType;
  vat_rate: number;
  price: number;
  created_at?: string;
  updated_at?: string;
}

export async function listItems(query?: string) {
  let req = supabase.from('items').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    req = req.or(`code.ilike.${q},name.ilike.${q}`);
  }
  return await req;
}

export async function createItem(payload: Partial<Item>) {
  const insert = {
    code: payload.code,
    name: payload.name,
    unit: (payload.unit ?? 'ADET') as UnitType,
    vat_rate: payload.vat_rate ?? 20,
    price: payload.price ?? 0,
  };
  return await supabase.from('items').insert(insert).select('*').single();
}

export async function updateItem(id: string, payload: Partial<Item>) {
  const update = {
    code: payload.code,
    name: payload.name,
    unit: payload.unit as UnitType | undefined,
    vat_rate: payload.vat_rate,
    price: payload.price,
  };
  return await supabase.from('items').update(update).eq('id', id).select('*').single();
}

export async function deleteItem(id: string) {
  return await supabase.from('items').delete().eq('id', id);
}


