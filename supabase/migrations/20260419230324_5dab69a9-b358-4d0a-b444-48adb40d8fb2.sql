
-- USER CREDITS TABLE
create table public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  lifetime_purchased integer not null default 0,
  lifetime_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

create policy "Users can view their own credits"
  on public.user_credits for select
  to authenticated
  using (auth.uid() = user_id);

create trigger update_user_credits_updated_at
  before update on public.user_credits
  for each row execute function public.update_updated_at_column();

-- PURCHASES TABLE
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text unique,
  stripe_event_id text unique,
  price_id text not null,
  product_id text,
  package_name text not null,
  credits_added integer not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'completed',
  environment text not null default 'sandbox',
  created_at timestamptz not null default now()
);

create index idx_purchases_user_id on public.purchases(user_id);
create index idx_purchases_created_at on public.purchases(created_at desc);

alter table public.purchases enable row level security;

create policy "Users can view their own purchases"
  on public.purchases for select
  to authenticated
  using (auth.uid() = user_id);

-- AUTO-CREATE CREDIT ROW WITH 1 FREE CREDIT ON SIGNUP
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits, lifetime_purchased, lifetime_used)
  values (new.id, 1, 0, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();

-- BACKFILL: existing users get 1 credit if they don't have a row
insert into public.user_credits (user_id, credits)
select id, 1 from auth.users
on conflict (user_id) do nothing;

-- CONSUME ONE CREDIT (atomic, returns true if successful)
create or replace function public.consume_credit(_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.user_credits
     set credits = credits - 1,
         lifetime_used = lifetime_used + 1,
         updated_at = now()
   where user_id = _user_id
     and credits > 0;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- ADD CREDITS FROM PURCHASE (idempotent via stripe_event_id)
create or replace function public.add_credits_from_purchase(
  _user_id uuid,
  _stripe_session_id text,
  _stripe_event_id text,
  _price_id text,
  _product_id text,
  _package_name text,
  _credits_added integer,
  _amount_cents integer,
  _currency text,
  _environment text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.purchases (
    user_id, stripe_session_id, stripe_event_id, price_id, product_id,
    package_name, credits_added, amount_cents, currency, status, environment
  )
  values (
    _user_id, _stripe_session_id, _stripe_event_id, _price_id, _product_id,
    _package_name, _credits_added, _amount_cents, _currency, 'completed', _environment
  )
  on conflict (stripe_event_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false; -- duplicate event, nothing to do
  end if;

  insert into public.user_credits (user_id, credits, lifetime_purchased)
  values (_user_id, _credits_added, _credits_added)
  on conflict (user_id) do update
    set credits = public.user_credits.credits + excluded.credits,
        lifetime_purchased = public.user_credits.lifetime_purchased + excluded.lifetime_purchased,
        updated_at = now();

  return true;
end;
$$;
