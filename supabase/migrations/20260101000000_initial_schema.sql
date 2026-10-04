create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency_code text not null default 'CRC' check (currency_code = 'CRC'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  barcode text,
  category text,
  created_at timestamptz not null default now(),
  check (name is null or length(trim(name)) > 0),
  check (barcode is null or length(trim(barcode)) > 0),
  unique (owner_id, barcode)
);

create type public.purchase_status as enum ('activa', 'finalizada', 'cancelada');

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  store_name_snapshot text,
  budget_amount integer not null check (budget_amount > 0),
  total_amount integer not null default 0 check (total_amount >= 0),
  status public.purchase_status not null default 'activa',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at)
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text,
  unit_price_amount integer not null check (unit_price_amount >= 0),
  quantity integer not null check (quantity > 0),
  subtotal_amount integer generated always as (unit_price_amount * quantity) stored,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_owner_idx on public.stores(owner_id);
create index products_owner_idx on public.products(owner_id);
create index products_barcode_idx on public.products(barcode) where barcode is not null;
create index purchases_owner_status_idx on public.purchases(owner_id, status);
create index purchases_started_at_idx on public.purchases(started_at desc);
create index purchase_items_purchase_idx on public.purchase_items(purchase_id);
create index purchase_items_product_idx on public.purchase_items(product_id) where product_id is not null;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

create policy "profiles own rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "stores own rows" on public.stores
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "products own rows" on public.products
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "purchases own rows" on public.purchases
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "purchase items through owned purchase" on public.purchase_items
  for all using (
    exists (
      select 1 from public.purchases
      where purchases.id = purchase_items.purchase_id
        and purchases.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.purchases
      where purchases.id = purchase_items.purchase_id
        and purchases.owner_id = auth.uid()
    )
  );
