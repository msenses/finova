import { supabase } from '../lib/supabaseClient';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function listBankAccounts(query?: string) {
  let req = supabase.from('bank_accounts').select('*').order('created_at', { ascending: false });
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    req = req.or(`name.ilike.${q},bank_name.ilike.${q},iban.ilike.${q}`);
  }
  return await req;
}

export async function createBankAccount(payload: Partial<BankAccount>) {
  const insert = {
    name: payload.name,
    bank_name: payload.bank_name ?? null,
    iban: payload.iban ?? null,
  };
  return await supabase.from('bank_accounts').insert(insert).select('*').single();
}

export async function updateBankAccount(id: string, payload: Partial<BankAccount>) {
  const update = {
    name: payload.name,
    bank_name: payload.bank_name ?? null,
    iban: payload.iban ?? null,
  };
  return await supabase.from('bank_accounts').update(update).eq('id', id).select('*').single();
}

export async function deleteBankAccount(id: string) {
  return await supabase.from('bank_accounts').delete().eq('id', id);
}


