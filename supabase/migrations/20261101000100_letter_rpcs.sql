-- The only surface anonymous visitors can touch. Every function is SECURITY DEFINER with a fixed
-- search_path. Nothing is returned that identifies a bridesmaid until the PIN is correct.

-- ---------------------------------------------------------------------------
-- Helpers (private schema: not exposed through the API)
-- ---------------------------------------------------------------------------

-- Checks a PIN with brute-force protection: 5 wrong tries lock the link for 15 minutes.
-- Locks the row for the rest of the transaction. result is one of:
--   'ok', 'wrong_pin', 'locked', 'unavailable'
create function private.verify_pin(p_token text, p_pin text)
returns table (result text, attempts_left int, until_ts timestamptz, bid uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.bridesmaids;
begin
  select * into r from public.bridesmaids where token = p_token for update;
  if not found or not r.is_active then
    return query select 'unavailable'::text, null::int, null::timestamptz, null::uuid;
    return;
  end if;

  if r.locked_until is not null and r.locked_until > now() then
    return query select 'locked'::text, null::int, r.locked_until, r.id;
    return;
  end if;

  -- A lock that has run out starts a fresh set of attempts.
  if r.locked_until is not null then
    update public.bridesmaids set locked_until = null, failed_attempts = 0 where id = r.id;
    r.failed_attempts := 0;
  end if;

  if p_pin is null or p_pin !~ '^\d{4}$' or p_pin <> r.pin then
    r.failed_attempts := r.failed_attempts + 1;
    if r.failed_attempts >= 5 then
      update public.bridesmaids
        set failed_attempts = 0, locked_until = now() + interval '15 minutes'
        where id = r.id
        returning locked_until into r.locked_until;
      return query select 'locked'::text, null::int, r.locked_until, r.id;
    else
      update public.bridesmaids set failed_attempts = r.failed_attempts where id = r.id;
      return query select 'wrong_pin'::text, 5 - r.failed_attempts, null::timestamptz, r.id;
    end if;
    return;
  end if;

  update public.bridesmaids set failed_attempts = 0, locked_until = null where id = r.id;
  return query select 'ok'::text, null::int, null::timestamptz, r.id;
end;
$$;

-- What the browser needs to render one letter. A signed letter always returns exactly what she
-- signed (the snapshot), so later edits to the shared letter never change it.
create function private.letter_json(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.bridesmaids;
  t public.letter_template;
begin
  select * into r from public.bridesmaids where id = p_id;
  select * into t from public.letter_template where id = 1;

  if r.signed_at is not null then
    return jsonb_build_object(
      'name', r.signed_snapshot -> 'name',
      'personalNote', r.signed_snapshot -> 'personalNote',
      'font', r.signed_snapshot -> 'font',
      'content', r.signed_snapshot -> 'content',
      'signed', jsonb_build_object('at', r.signed_at, 'name', r.signed_name)
    );
  end if;

  return jsonb_build_object(
    'name', r.name,
    'personalNote', r.personal_note,
    'font', coalesce(r.font, t.default_font),
    'content', t.content,
    'signed', null
  );
end;
$$;

-- Turns a failed verify_pin row into the JSON the client expects.
create function private.verify_failure(p_result text, p_attempts_left int, p_until timestamptz)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_result
    when 'wrong_pin' then jsonb_build_object('status', 'wrong_pin', 'attempts_left', p_attempts_left)
    when 'locked' then jsonb_build_object('status', 'locked', 'locked_until', p_until)
    else jsonb_build_object('status', 'unavailable')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Can this link be used? Returns no name or content. Unknown and inactive tokens look the same.
create function public.check_link(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.bridesmaids;
begin
  select * into r from public.bridesmaids where token = p_token;
  if not found or not r.is_active then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return jsonb_build_object('status', 'locked', 'locked_until', r.locked_until);
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Opens the letter with the PIN. p_count_view = false is used when the page resumes from a
-- refresh, so a refresh doesn't inflate the view count.
create function public.unlock_letter(p_token text, p_pin text, p_count_view boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from private.verify_pin(p_token, p_pin);
  if v.result <> 'ok' then
    return private.verify_failure(v.result, v.attempts_left, v.until_ts);
  end if;

  if p_count_view then
    update public.bridesmaids
      set first_opened_at = coalesce(first_opened_at, now()),
          last_opened_at = now(),
          open_count = open_count + 1
      where id = v.bid;
  end if;

  return jsonb_build_object('status', 'ok', 'letter', private.letter_json(v.bid));
end;
$$;

-- Signs the letter. Re-checks the PIN, uses server time, freezes a snapshot, and is idempotent:
-- signing twice returns the first signature.
create function public.sign_letter(p_token text, p_pin text, p_signed_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  r public.bridesmaids;
  t public.letter_template;
  clean text;
begin
  select * into v from private.verify_pin(p_token, p_pin);
  if v.result <> 'ok' then
    return private.verify_failure(v.result, v.attempts_left, v.until_ts);
  end if;

  select * into r from public.bridesmaids where id = v.bid;
  if r.signed_at is not null then
    return jsonb_build_object('status', 'ok', 'letter', private.letter_json(v.bid));
  end if;

  clean := btrim(regexp_replace(coalesce(p_signed_name, ''), '[[:cntrl:]]', '', 'g'));
  if char_length(clean) < 1 or char_length(clean) > 60 then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  select * into t from public.letter_template where id = 1;
  update public.bridesmaids
    set signed_at = now(),
        signed_name = clean,
        signed_snapshot = jsonb_build_object(
          'name', r.name,
          'personalNote', r.personal_note,
          'font', coalesce(r.font, t.default_font),
          'content', t.content
        )
    where id = v.bid;

  return jsonb_build_object('status', 'ok', 'letter', private.letter_json(v.bid));
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: the three RPCs are callable by anyone; everything else is not.
-- ---------------------------------------------------------------------------
revoke execute on function public.check_link(text) from public, anon, authenticated;
revoke execute on function public.unlock_letter(text, text, boolean) from public, anon, authenticated;
revoke execute on function public.sign_letter(text, text, text) from public, anon, authenticated;
grant execute on function public.check_link(text) to anon, authenticated;
grant execute on function public.unlock_letter(text, text, boolean) to anon, authenticated;
grant execute on function public.sign_letter(text, text, text) to anon, authenticated;

-- Supabase's default privileges grant EXECUTE to anon/authenticated on new functions, so revoke
-- explicitly rather than relying on `from public` alone.
revoke execute on function private.verify_pin(text, text) from public, anon, authenticated;
revoke execute on function private.letter_json(uuid) from public, anon, authenticated;
revoke execute on function private.verify_failure(text, int, timestamptz) from public, anon, authenticated;
