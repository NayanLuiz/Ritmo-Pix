-- RitmoPix: esquema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro em Supabase > SQL Editor > New query > Run.
-- É seguro rodar mais de uma vez.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------
create table if not exists public.settings (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  pix_key        text not null default '',
  pix_key_type   text not null default '' check (pix_key_type in ('', 'cpf', 'cnpj', 'phone', 'email', 'random')),
  merchant_name  text not null default 'MEU NEGOCIO' check (char_length(merchant_name) between 1 and 100),
  merchant_city  text not null default 'NATAL'       check (char_length(merchant_city) between 1 and 100),
  updated_at     timestamptz not null default now()
);

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  phone       text not null check (phone ~ '^\d{10,11}$'),
  amount      numeric(12,2) not null check (amount >= 0.01 and amount <= 999999999),
  due_day     int not null check (due_day between 1 and 31),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

create table if not exists public.charges (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  reference_month  text not null check (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  due_date         date not null,
  amount           numeric(12,2) not null check (amount >= 0.01),
  status           text not null default 'pendente' check (status in ('pendente', 'pago')),
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  unique (client_id, reference_month)
);
create index if not exists charges_user_month_idx on public.charges(user_id, reference_month);

create table if not exists public.message_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  charge_id  uuid not null references public.charges(id) on delete cascade,
  type       text not null check (type in ('charge', 'receipt')),
  sent_at    timestamptz not null default now()
);
create index if not exists message_log_charge_idx on public.message_log(charge_id);

-- ---------------------------------------------------------------
-- Segurança: cada usuário só vê e altera os próprios dados (RLS)
-- ---------------------------------------------------------------
alter table public.settings    enable row level security;
alter table public.clients     enable row level security;
alter table public.charges     enable row level security;
alter table public.message_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings', 'clients', 'charges', 'message_log'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Gera as cobranças de um mês para os clientes ativos (idempotente).
-- O vencimento é limitado ao último dia do mês (ex.: dia 31 em fevereiro).
-- ---------------------------------------------------------------
create or replace function public.ensure_month_charges(ref_month text)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  first_day date;
  last_day  date;
  inserted  int;
begin
  if ref_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Mês inválido: %', ref_month;
  end if;

  first_day := (ref_month || '-01')::date;
  last_day  := (first_day + interval '1 month - 1 day')::date;

  insert into public.charges (user_id, client_id, reference_month, due_date, amount)
  select c.user_id, c.id, ref_month,
         first_day + (least(c.due_day, extract(day from last_day)::int) - 1),
         c.amount
  from public.clients c
  where c.user_id = auth.uid() and c.active
  on conflict (client_id, reference_month) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end $$;

revoke all on function public.ensure_month_charges(text) from public, anon;
grant execute on function public.ensure_month_charges(text) to authenticated;
