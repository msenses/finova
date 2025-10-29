import { supabase } from '../lib/supabaseClient';

export type PosStatus = 'blocked' | 'released' | 'transferred';

export interface PosBlock {
  id: string;
  bank_account_id: string;
  reference: string | null;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  block_release_date: string | null;
  status: PosStatus;
  created_at?: string;
  updated_at?: string;
}

export async function listPosBlocks() {
  return await supabase.from('pos_blocks').select('*').order('created_at', { ascending: false });
}

export async function createPosBlock(payload: Partial<PosBlock>) {
  const insert = {
    bank_account_id: payload.bank_account_id,
    reference: payload.reference ?? null,
    gross_amount: payload.gross_amount ?? 0,
    fee_amount: payload.fee_amount ?? 0,
    block_release_date: payload.block_release_date ?? null,
    status: (payload.status ?? 'blocked') as PosStatus,
  };
  return await supabase.from('pos_blocks').insert(insert).select('*').single();
}

export async function updatePosBlock(id: string, payload: Partial<PosBlock>) {
  const update = {
    bank_account_id: payload.bank_account_id,
    reference: payload.reference ?? null,
    gross_amount: payload.gross_amount,
    fee_amount: payload.fee_amount,
    block_release_date: payload.block_release_date ?? null,
    status: payload.status as PosStatus | undefined,
  };
  return await supabase.from('pos_blocks').update(update).eq('id', id).select('*').single();
}

export async function deletePosBlock(id: string) {
  return await supabase.from('pos_blocks').delete().eq('id', id);
}


