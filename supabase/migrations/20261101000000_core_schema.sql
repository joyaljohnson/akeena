-- Core schema for the bridesmaid letters.
-- Privacy model: the repo is public, so all protection lives here.
--   * RLS is on for every table and anon has NO table privileges at all.
--   * Anonymous visitors only ever call the three SECURITY DEFINER functions in 20261101000100.
--   * Admins are the users listed in public.admins; only they can read or write tables.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- True when the signed-in user is on the allowlist. SECURITY DEFINER so policies can call it
-- without granting direct access to public.admins.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Shared letter (singleton)
-- ---------------------------------------------------------------------------
create table public.letter_template (
  id int primary key default 1 check (id = 1),
  content jsonb not null,
  default_font text not null default 'parisienne',
  whatsapp_message_template text not null default
    E'Hey {name} 💌 I''ve got something special for you…\n\nOpen it here: {link}\nYour secret PIN: {pin}',
  updated_at timestamptz not null default now()
);

create function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger letter_template_touch
before update on public.letter_template
for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Bridesmaids
-- ---------------------------------------------------------------------------
create table public.bridesmaids (
  id uuid primary key default gen_random_uuid(),
  -- 40 hex characters taken from two random UUIDs (about 154 bits), URL-safe.
  token text not null unique default substr(
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 40
  ),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  personal_note text not null check (char_length(personal_note) <= 600),
  font text,
  -- Readable by admins only (RLS) so Akeena can re-copy an invite message later.
  pin text not null check (pin ~ '^\d{4}$'),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count int not null default 0,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  signed_at timestamptz,
  signed_name text check (signed_name is null or char_length(signed_name) between 1 and 60),
  signed_snapshot jsonb,
  -- A letter is either fully signed or not signed at all.
  constraint signed_fields_together check (
    (signed_at is null and signed_name is null and signed_snapshot is null)
    or (signed_at is not null and signed_name is not null and signed_snapshot is not null)
  )
);

-- Two bridesmaids must never share a PIN, so a mix-up can't open the wrong letter.
create unique index bridesmaids_pin_key on public.bridesmaids (pin);
create index bridesmaids_sort_idx on public.bridesmaids (sort_order, created_at);

-- Once signed, the signature and what she saw are frozen. Only is_active, sort_order, the PIN
-- and the open/lock counters (maintained by the RPCs) may still change.
create function private.protect_signed()
returns trigger
language plpgsql
as $$
begin
  if old.signed_at is not null then
    if new.name is distinct from old.name
       or new.personal_note is distinct from old.personal_note
       or new.font is distinct from old.font
       or new.signed_at is distinct from old.signed_at
       or new.signed_name is distinct from old.signed_name
       or new.signed_snapshot is distinct from old.signed_snapshot then
      raise exception 'This letter has been signed and can no longer be edited'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger bridesmaids_protect_signed
before update on public.bridesmaids
for each row execute function private.protect_signed();

-- ---------------------------------------------------------------------------
-- Row Level Security and grants
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.letter_template enable row level security;
alter table public.bridesmaids enable row level security;

-- Nothing for anon, ever. Start from zero for authenticated, then grant what admins need.
revoke all on public.admins, public.letter_template, public.bridesmaids from public, anon, authenticated;
grant select on public.admins to authenticated;
grant select, update on public.letter_template to authenticated;
grant select, insert, update, delete on public.bridesmaids to authenticated;

create policy admins_read_self on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy template_admin_read on public.letter_template
  for select to authenticated using (public.is_admin());
create policy template_admin_update on public.letter_template
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy bridesmaids_admin_all on public.bridesmaids
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
