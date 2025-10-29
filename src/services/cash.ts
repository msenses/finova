import { supabase } from '../lib/supabaseClient';

export type CashTxnType = 'tahsilat' | 'odeme' | 'avans' | 'virman';

export interface CashTransaction {
  id: string;
  type: CashTxnType;
  cari_id: string | null;
  amount: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function listCashTransactions() {
  return await supabase.from('cash_transactions').select('*').order('created_at', { ascending: false });
}

export async function createCashTransaction(payload: Partial<CashTransaction>) {
  const insert = {
    type: (payload.type ?? 'tahsilat') as CashTxnType,
    cari_id: payload.cari_id ?? null,
    amount: payload.amount ?? 0,
    description: payload.description ?? null,
  };
  return await supabase.from('cash_transactions').insert(insert).select('*').single();
}

export async function updateCashTransaction(id: string, payload: Partial<CashTransaction>) {
  const update = {
    type: payload.type as CashTxnType | undefined,
    cari_id: payload.cari_id ?? null,
    amount: payload.amount,
    description: payload.description ?? null,
  };
  return await supabase.from('cash_transactions').update(update).eq('id', id).select('*').single();
}

export async function deleteCashTransaction(id: string) {
  return await supabase.from('cash_transactions').delete().eq('id', id);
}


