-- Branches & Fiscal Periods (Org-scoped) and RLS refinements

create extension if not exists pgcrypto;

-- Branches
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_branches_org_code on public.branches(org_id, code);
create index if not exists idx_branches_org on public.branches(org_id);

-- Branch members (reuse org_role enum)
create table if not exists public.organization_branch_members (
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'user',
  created_at timestamptz not null default now(),
  primary key(branch_id, user_id)
);

-- Current user helper views
create or replace view public.v_current_user_branches as
  select obm.branch_id
  from public.organization_branch_members obm
  where obm.user_id = auth.uid();

-- Fiscal periods (optionally branch-scoped)
create table if not exists public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  code text not null, -- e.g. 2025-01, 2025H1, 2025
  start_date date not null,
  end_date date not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_fiscal_periods_org on public.fiscal_periods(org_id);
create index if not exists idx_fiscal_periods_branch on public.fiscal_periods(branch_id);

-- Add branch/period refs to business tables (nullable for backward compatibility)
do $$ begin
  alter table public.invoices add column if not exists branch_id uuid references public.branches(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.invoices add column if not exists fiscal_period_id uuid references public.fiscal_periods(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.cash_transactions add column if not exists branch_id uuid references public.branches(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.cash_transactions add column if not exists fiscal_period_id uuid references public.fiscal_periods(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bank_accounts add column if not exists branch_id uuid references public.branches(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bank_transactions add column if not exists branch_id uuid references public.branches(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bank_transactions add column if not exists fiscal_period_id uuid references public.fiscal_periods(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.pos_blocks add column if not exists branch_id uuid references public.branches(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.pos_blocks add column if not exists fiscal_period_id uuid references public.fiscal_periods(id);
exception when duplicate_column then null; end $$;

create index if not exists idx_invoices_branch on public.invoices(branch_id);
create index if not exists idx_invoices_period on public.invoices(fiscal_period_id);
create index if not exists idx_cash_tx_branch on public.cash_transactions(branch_id);
create index if not exists idx_cash_tx_period on public.cash_transactions(fiscal_period_id);
create index if not exists idx_bank_accounts_branch on public.bank_accounts(branch_id);
create index if not exists idx_bank_tx_branch on public.bank_transactions(branch_id);
create index if not exists idx_bank_tx_period on public.bank_transactions(fiscal_period_id);
create index if not exists idx_pos_blocks_branch on public.pos_blocks(branch_id);
create index if not exists idx_pos_blocks_period on public.pos_blocks(fiscal_period_id);

-- RLS enable
alter table public.branches enable row level security;
alter table public.organization_branch_members enable row level security;
alter table public.fiscal_periods enable row level security;

-- Branches policy: user must belong to org
drop policy if exists p_branches_rw on public.branches;
create policy p_branches_rw on public.branches
  for all to authenticated
  using (org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id in (select org_id from public.v_current_user_orgs));

-- Branch members policy: user must belong to same org as branch
drop policy if exists p_branch_members_rw on public.organization_branch_members;
create policy p_branch_members_rw on public.organization_branch_members
  for all to authenticated
  using (exists (
    select 1 from public.branches b
    where b.id = organization_branch_members.branch_id
      and b.org_id in (select org_id from public.v_current_user_orgs)
  ))
  with check (exists (
    select 1 from public.branches b
    where b.id = organization_branch_members.branch_id
      and b.org_id in (select org_id from public.v_current_user_orgs)
  ));

-- Fiscal periods policy: user must belong to org
drop policy if exists p_periods_rw on public.fiscal_periods;
create policy p_periods_rw on public.fiscal_periods
  for all to authenticated
  using (org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id in (select org_id from public.v_current_user_orgs));

-- Refine business table policies: org + optional branch membership
-- invoices
drop policy if exists p_invoices_org_rw on public.invoices;
create policy p_invoices_org_rw on public.invoices
  for all to authenticated
  using (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  )
  with check (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  );

-- invoice_lines via parent invoice (org + optional branch)
drop policy if exists p_invoice_lines_org_rw on public.invoice_lines;
create policy p_invoice_lines_org_rw on public.invoice_lines
  for all to authenticated
  using (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and inv.org_id is not null
      and inv.org_id in (select org_id from public.v_current_user_orgs)
      and (inv.branch_id is null or inv.branch_id in (select branch_id from public.v_current_user_branches))
  ))
  with check (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and inv.org_id is not null
      and inv.org_id in (select org_id from public.v_current_user_orgs)
      and (inv.branch_id is null or inv.branch_id in (select branch_id from public.v_current_user_branches))
  ));

-- cash_transactions
drop policy if exists p_cash_org_rw on public.cash_transactions;
create policy p_cash_org_rw on public.cash_transactions
  for all to authenticated
  using (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  )
  with check (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  );

-- bank_accounts
drop policy if exists p_bank_accounts_org_rw on public.bank_accounts;
create policy p_bank_accounts_org_rw on public.bank_accounts
  for all to authenticated
  using (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  )
  with check (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  );

-- bank_transactions
drop policy if exists p_bank_tx_org_rw on public.bank_transactions;
create policy p_bank_tx_org_rw on public.bank_transactions
  for all to authenticated
  using (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  )
  with check (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  );

-- pos_blocks
drop policy if exists p_pos_org_rw on public.pos_blocks;
create policy p_pos_org_rw on public.pos_blocks
  for all to authenticated
  using (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  )
  with check (
    org_id is not null
    and org_id in (select org_id from public.v_current_user_orgs)
    and (branch_id is null or branch_id in (select branch_id from public.v_current_user_branches))
  );

-- Cleanup: drop initial wide-open policies from early setup
drop policy if exists p_cari_accounts_rw on public.cari_accounts;
drop policy if exists p_items_rw on public.items;
drop policy if exists p_invoices_rw on public.invoices;
drop policy if exists p_invoice_lines_rw on public.invoice_lines;
drop policy if exists p_cash_tx_rw on public.cash_transactions;
drop policy if exists p_bank_accounts_rw on public.bank_accounts;
drop policy if exists p_bank_tx_rw on public.bank_transactions;
drop policy if exists p_pos_blocks_rw on public.pos_blocks;


