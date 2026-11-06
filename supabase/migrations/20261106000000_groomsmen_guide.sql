-- The groomsmen page: one private page with a single shared link and PIN.
-- It shows the four chapters from the shared letter (dates, places) plus its own dress-code text
-- and pictures. Same rules as the letters: RLS on, anon has no table access, two public RPCs.

create table public.groomsmen_guide (
  id int primary key default 1 check (id = 1),
  token text not null unique default substr(
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 40
  ),
  pin text not null check (pin ~ '^\d{4}$'),
  -- heading, intro, per-chapter dress code and pictures, optional moodboard (see guideTypes.ts)
  content jsonb not null,
  is_active boolean not null default true,
  open_count int not null default 0,
  last_opened_at timestamptz,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create trigger groomsmen_guide_touch
before update on public.groomsmen_guide
for each row execute function private.touch_updated_at();

alter table public.groomsmen_guide enable row level security;
revoke all on public.groomsmen_guide from public, anon, authenticated;
grant select, insert, update on public.groomsmen_guide to authenticated;

create policy guide_admin_all on public.groomsmen_guide
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Same brute-force protection as the letters: 5 wrong tries lock the link for 15 minutes.
create function private.verify_guide_pin(p_token text, p_pin text)
returns table (result text, attempts_left int, until_ts timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groomsmen_guide;
begin
  select * into g from public.groomsmen_guide where token = p_token for update;
  if not found or not g.is_active then
    return query select 'unavailable'::text, null::int, null::timestamptz;
    return;
  end if;

  if g.locked_until is not null and g.locked_until > now() then
    return query select 'locked'::text, null::int, g.locked_until;
    return;
  end if;

  if g.locked_until is not null then
    update public.groomsmen_guide set locked_until = null, failed_attempts = 0 where id = g.id;
    g.failed_attempts := 0;
  end if;

  if p_pin is null or p_pin !~ '^\d{4}$' or p_pin <> g.pin then
    g.failed_attempts := g.failed_attempts + 1;
    if g.failed_attempts >= 5 then
      update public.groomsmen_guide
        set failed_attempts = 0, locked_until = now() + interval '15 minutes'
        where id = g.id
        returning locked_until into g.locked_until;
      return query select 'locked'::text, null::int, g.locked_until;
    else
      update public.groomsmen_guide set failed_attempts = g.failed_attempts where id = g.id;
      return query select 'wrong_pin'::text, 5 - g.failed_attempts, null::timestamptz;
    end if;
    return;
  end if;

  update public.groomsmen_guide set failed_attempts = 0, locked_until = null where id = g.id;
  return query select 'ok'::text, null::int, null::timestamptz;
end;
$$;

-- Can this link be used? No content. Unknown and switched-off links look the same.
create function public.check_guide(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  g public.groomsmen_guide;
begin
  select * into g from public.groomsmen_guide where token = p_token;
  if not found or not g.is_active then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if g.locked_until is not null and g.locked_until > now() then
    return jsonb_build_object('status', 'locked', 'locked_until', g.locked_until);
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Opens the page with the PIN. p_count_view = false when resuming after a refresh.
create function public.unlock_guide(p_token text, p_pin text, p_count_view boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  g public.groomsmen_guide;
  t public.letter_template;
begin
  select * into v from private.verify_guide_pin(p_token, p_pin);
  if v.result <> 'ok' then
    return case v.result
      when 'wrong_pin' then jsonb_build_object('status', 'wrong_pin', 'attempts_left', v.attempts_left)
      when 'locked' then jsonb_build_object('status', 'locked', 'locked_until', v.until_ts)
      else jsonb_build_object('status', 'unavailable')
    end;
  end if;

  if p_count_view then
    update public.groomsmen_guide
      set last_opened_at = now(), open_count = open_count + 1
      where token = p_token;
  end if;

  select * into g from public.groomsmen_guide where token = p_token;
  select * into t from public.letter_template where id = 1;

  -- Only the chapters and the font are taken from the shared letter, nothing else.
  return jsonb_build_object(
    'status', 'ok',
    'guide', jsonb_build_object(
      'font', t.default_font,
      'chapters', coalesce(t.content -> 'chapters', '[]'::jsonb),
      'content', g.content
    )
  );
end;
$$;

revoke execute on function public.check_guide(text) from public, anon, authenticated;
revoke execute on function public.unlock_guide(text, text, boolean) from public, anon, authenticated;
grant execute on function public.check_guide(text) to anon, authenticated;
grant execute on function public.unlock_guide(text, text, boolean) to anon, authenticated;
revoke execute on function private.verify_guide_pin(text, text) from public, anon, authenticated;
