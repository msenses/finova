// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "Missing env" }), { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const today = new Date().toISOString().slice(0, 10);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id,type,cari_id,gross_total,status,due_date")
    .eq("status", "draft")
    .lte("due_date", today)
    .limit(1000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;
  for (const inv of invoices ?? []) {
    const amount = inv.gross_total || 0;
    if (amount <= 0) continue;
    const cashType = inv.type === "alis" ? "odeme" : "tahsilat";
    // create cash transaction
    await supabase.from("cash_transactions").insert({
      type: cashType,
      cari_id: inv.cari_id ?? null,
      amount,
      description: `Vade günü otomatik ${cashType}: ${inv.id}`,
    });
    // update invoice status
    await supabase.from("invoices").update({ status: "posted" }).eq("id", inv.id);
    processed += 1;
  }

  return new Response(JSON.stringify({ processed }), { headers: { "Content-Type": "application/json" } });
});
