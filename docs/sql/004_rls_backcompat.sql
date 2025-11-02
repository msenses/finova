-- Transitional RLS: allow reading legacy rows where org_id is NULL
-- Note: with check clauses keep writes constrained to user's org

-- cari_accounts
drop policy if exists p_cari_org_rw on public.cari_accounts;
create policy p_cari_org_rw on public.cari_accounts
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- items
drop policy if exists p_items_org_rw on public.items;
create policy p_items_org_rw on public.items
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- invoices
drop policy if exists p_invoices_org_rw on public.invoices;
create policy p_invoices_org_rw on public.invoices
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- invoice_lines via parent invoice (permit null-org invoices for read)
drop policy if exists p_invoice_lines_org_rw on public.invoice_lines;
create policy p_invoice_lines_org_rw on public.invoice_lines
  for all to authenticated
  using (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and ((inv.org_id is null) or (inv.org_id in (select org_id from public.v_current_user_orgs)))
  ))
  with check (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and (inv.org_id is not null and inv.org_id in (select org_id from public.v_current_user_orgs))
  ));

-- cash_transactions
drop policy if exists p_cash_org_rw on public.cash_transactions;
create policy p_cash_org_rw on public.cash_transactions
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- bank_accounts
drop policy if exists p_bank_accounts_org_rw on public.bank_accounts;
create policy p_bank_accounts_org_rw on public.bank_accounts
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- bank_transactions
drop policy if exists p_bank_tx_org_rw on public.bank_transactions;
create policy p_bank_tx_org_rw on public.bank_transactions
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );

-- pos_blocks
drop policy if exists p_pos_org_rw on public.pos_blocks;
create policy p_pos_org_rw on public.pos_blocks
  for all to authenticated
  using (
    (org_id is null) or (org_id in (select org_id from public.v_current_user_orgs))
  )
  with check (
    org_id is not null and org_id in (select org_id from public.v_current_user_orgs)
  );


