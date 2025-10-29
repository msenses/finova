import { supabase } from '../lib/supabaseClient';

export type InvoiceType = 'satis' | 'alis' | 'iade_satis' | 'iade_alis';
export type InvoiceStatus = 'draft' | 'posted' | 'cancelled';

export interface Invoice {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  cari_id: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
}

export async function listInvoices() {
  return await supabase.from('invoices').select('*').order('created_at', { ascending: false });
}

export async function createInvoice(inv: Omit<Invoice, 'id' | 'status' | 'created_at' | 'updated_at'>, lines: Array<Omit<InvoiceLine, 'id' | 'invoice_id'>>) {
  // 1) Insert invoice
  const { data: invData, error: invErr } = await supabase
    .from('invoices')
    .insert({
      type: inv.type,
      status: 'draft',
      cari_id: inv.cari_id,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date ?? null,
      currency: inv.currency ?? 'TRY',
      net_total: inv.net_total,
      vat_total: inv.vat_total,
      gross_total: inv.gross_total,
    })
    .select('*')
    .single();
  if (invErr || !invData) return { data: null, error: invErr ?? new Error('invoice insert failed') };

  // 2) Insert lines
  const insertLines = lines.map((l) => ({ ...l, invoice_id: invData.id }));
  const { error: lineErr } = await supabase.from('invoice_lines').insert(insertLines);
  if (lineErr) return { data: null, error: lineErr };

  return { data: invData, error: null };
}


