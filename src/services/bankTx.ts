import { supabase } from '../lib/supabaseClient';

export type BankTxnType = 'giris' | 'cikis';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  type: BankTxnType;
  amount: number;
  description: string | null;
  cari_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function createBankTransaction(payload: Partial<BankTransaction>) {
  const insert = {
    bank_account_id: payload.bank_account_id,
    type: (payload.type ?? 'giris') as BankTxnType,
    amount: payload.amount ?? 0,
    description: payload.description ?? null,
    cari_id: payload.cari_id ?? null,
  };
  return await supabase.from('bank_transactions').insert(insert).select('*').single();
}
