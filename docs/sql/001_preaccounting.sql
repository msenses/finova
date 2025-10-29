-- Finova - Ön Muhasebe Şeması (Supabase / PostgreSQL)
-- Güvenlik notu: Şimdilik basit authenticated politikaları tanımlanmıştır.
-- Çok-tenant mimari ve detaylı RLS, sonraki adımlarda eklenecek.

create extension if not exists pgcrypto;

-- Tipler
do $$ begin
  create type cari_type as enum ('musteri', 'tedarikci', 'diger');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_type as enum ('satis', 'alis', 'iade_satis', 'iade_alis');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'posted', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unit_type as enum ('ADET', 'KG', 'LT', 'PAKET');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_type as enum ('tahsilat', 'odeme', 'avans', 'virman');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pos_status as enum ('blocked', 'released', 'transferred');
exception when duplicate_object then null; end $$;

-- Timestamp trigger (updated_at)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Cari hesaplar
create table if not exists public.cari_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null,
  title text not null,
  type cari_type not null default 'musteri',
  tax_number text,
  tax_office text,
  email text,
  phone text,
  address text,
  balance numeric(14,2) not null default 0
);
create trigger trg_cari_accounts_updated
before update on public.cari_accounts
for each row execute procedure set_updated_at();

-- Stok / ürünler
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null,
  name text not null,
  unit unit_type not null default 'ADET',
  vat_rate numeric(5,2) not null default 20,
  price numeric(14,2) not null default 0
);
create trigger trg_items_updated
before update on public.items
for each row execute procedure set_updated_at();

-- Faturalar (üst bilgi)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type invoice_type not null,
  status invoice_status not null default 'draft',
  cari_id uuid not null references public.cari_accounts(id) on delete restrict,
  invoice_date date not null default current_date,
  due_date date,
  currency text not null default 'TRY',
  net_total numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  gross_total numeric(14,2) not null default 0
);
create trigger trg_invoices_updated
before update on public.invoices
for each row execute procedure set_updated_at();

-- Fatura satırları
create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,4) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  line_total numeric(14,2) not null default 0
);
create index if not exists idx_invoice_lines_invoice on public.invoice_lines(invoice_id);

-- Kasa hareketleri
create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type txn_type not null,
  cari_id uuid references public.cari_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  description text
);
create trigger trg_cash_transactions_updated
before update on public.cash_transactions
for each row execute procedure set_updated_at();

-- Banka hesapları
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  bank_name text,
  iban text
);
create trigger trg_bank_accounts_updated
before update on public.bank_accounts
for each row execute procedure set_updated_at();

-- Banka hareketleri
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  type txn_type not null,
  cari_id uuid references public.cari_accounts(id) on delete set null,
  amount numeric(14,2) not null,
  description text
);
create trigger trg_bank_transactions_updated
before update on public.bank_transactions
for each row execute procedure set_updated_at();
create index if not exists idx_bank_tx_bank on public.bank_transactions(bank_account_id);

-- POS blokeli tahsilatlar
create table if not exists public.pos_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  reference text,
  gross_amount numeric(14,2) not null,
  fee_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) generated always as (gross_amount - fee_amount) stored,
  block_release_date date,
  status pos_status not null default 'blocked'
);
create trigger trg_pos_blocks_updated
before update on public.pos_blocks
for each row execute procedure set_updated_at();
create index if not exists idx_pos_blocks_bank on public.pos_blocks(bank_account_id);

-- RLS
alter table public.cari_accounts enable row level security;
alter table public.items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.pos_blocks enable row level security;

-- Basit politikalar: tüm authenticated kullanıcılar için CRUD (geçici)
do $$ begin
  create policy p_cari_accounts_rw on public.cari_accounts for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_items_rw on public.items for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_invoices_rw on public.invoices for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_invoice_lines_rw on public.invoice_lines for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_cash_tx_rw on public.cash_transactions for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_bank_accounts_rw on public.bank_accounts for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_bank_tx_rw on public.bank_transactions for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_pos_blocks_rw on public.pos_blocks for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- İleri aşama notları:
-- - Çoklu şirket (tenant) ve kullanıcı-şirket yetkilendirmesi eklenecek.
-- - TDHP uyumlu muhasebe fişi üretimi ve entegrasyonlar sonraki sprintlerde.


