-- Organizations, user profiles, org memberships, and org-based RLS

create extension if not exists pgcrypto;

-- Roles
do $$ begin
  create type org_role as enum ('owner','admin','user');
exception when duplicate_object then null; end $$;

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User profiles (username mapping)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Organization members
create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'user',
  created_at timestamptz not null default now(),
  primary key(org_id, user_id)
);

-- Helper view: current user orgs
create or replace view public.v_current_user_orgs as
  select org_id from public.organization_members where user_id = auth.uid();

-- Add org_id to business tables (nullable for backward compatibility)
do $$ begin
  alter table public.cari_accounts add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.items add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.invoices add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

-- invoice_lines: org_id türetmek yerine policy'de invoices ile kontrol edeceğiz

do $$ begin
  alter table public.cash_transactions add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bank_accounts add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.bank_transactions add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.pos_blocks add column if not exists org_id uuid references public.organizations(id);
exception when duplicate_column then null; end $$;

-- RLS policies (add org-scoped; eski geniş politikalar varsa kaldırılması önerilir)
-- Enable RLS (zaten açıksa yeniden enable harmless)
alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists p_orgs_rw on public.organizations;
create policy p_orgs_rw on public.organizations
  for all to authenticated
  using (id in (select org_id from public.organization_members where user_id = auth.uid()))
  with check (true);

drop policy if exists p_profiles_self on public.user_profiles;
create policy p_profiles_self on public.user_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists p_members_rw on public.organization_members;
create policy p_members_rw on public.organization_members
  for all to authenticated
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()))
  with check (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- Business tables RLS based on org_id membership
drop policy if exists p_cari_org_rw on public.cari_accounts;
create policy p_cari_org_rw on public.cari_accounts
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

drop policy if exists p_items_org_rw on public.items;
create policy p_items_org_rw on public.items
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

drop policy if exists p_invoices_org_rw on public.invoices;
create policy p_invoices_org_rw on public.invoices
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

-- invoice_lines policy via parent invoice org
drop policy if exists p_invoice_lines_org_rw on public.invoice_lines;
create policy p_invoice_lines_org_rw on public.invoice_lines
  for all to authenticated
  using (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and inv.org_id is not null
      and inv.org_id in (select org_id from public.v_current_user_orgs)
  ))
  with check (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and inv.org_id is not null
      and inv.org_id in (select org_id from public.v_current_user_orgs)
  ));

drop policy if exists p_cash_org_rw on public.cash_transactions;
create policy p_cash_org_rw on public.cash_transactions
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

drop policy if exists p_bank_accounts_org_rw on public.bank_accounts;
create policy p_bank_accounts_org_rw on public.bank_accounts
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

drop policy if exists p_bank_tx_org_rw on public.bank_transactions;
create policy p_bank_tx_org_rw on public.bank_transactions
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

drop policy if exists p_pos_org_rw on public.pos_blocks;
create policy p_pos_org_rw on public.pos_blocks
  for all to authenticated
  using (org_id is not null and org_id in (select org_id from public.v_current_user_orgs))
  with check (org_id is not null and org_id in (select org_id from public.v_current_user_orgs));

-- Not: Mevcut geniş 'authenticated allow all' politikaları kaldırılmalıdır; bunu yapmadan önce org_id doldurulmuş veri olduğundan emin olun.


