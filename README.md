# Bridesmaid letters

Private "Will you be my bridesmaid?" letters. `CLAUDE.md` has the standing rules, `BUILD_PROMPT.md`
the full spec and `docs/ASSETS.md` the artwork still needed.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in once Supabase exists
npm run dev
```

Design previews (dev only, not in the production build): `#/dev/letter`, `#/dev/envelope`
(mock PIN `1234`), `#/dev/stamp`.

Checks:

- `npm run ci:local` runs what GitHub runs (type check, lint, unit and database tests, build) with the
  private files hidden. Run it before every push.
- `npm run e2e` runs the browser tests (needs Google Chrome installed). They use made-up content and a
  pretend backend. `npm run e2e -- --ui` opens the visual runner.
- `npm run check:leaks` fails if venue names or map links from the private letter appear in `dist/`.
- `npm run shots` takes 390 px screenshots of every screen (local only, shows the real letter).
- `npm run brand:build` redraws the favicon, touch icon and WhatsApp preview image.

The manual device checklist is in `docs/QA.md`.

## Supabase setup (once)

1. **Create the project** at supabase.com. Pick the Mumbai region (`ap-south-1`), which is closest
   to Kerala.
2. **Install the CLI and link it**:
   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. **Apply the migrations** (tables, security rules, functions):
   ```bash
   supabase db push
   ```
4. **Turn off public sign-ups**: Dashboard, Authentication, Sign In / Providers, switch off
   "Allow new users to sign up". Also leave anonymous sign-ins off.
5. **Create the two admin users**: Dashboard, Authentication, Users, "Add user" (email and
   password) for Akeena and for Jo. Tick "Auto Confirm User".
6. **Allow-list them** in the SQL editor (replace the emails):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email in ('akeena@example.com', 'jo@example.com');
   ```
7. **Load the shared letter** (private, never commit):
   ```bash
   npm run seed:build          # writes supabase/seed.private.sql from the local fixture
   ```
   Then paste `supabase/seed.private.sql` into the SQL editor and run it. Re-running it only
   replaces the shared letter; it never touches bridesmaids.
8. **Copy the keys**: Dashboard, Project Settings, API. You need the project URL and the
   `anon` public key. **Never use or share the `service_role` key.**

## GitHub setup

- Repo visibility: public (needed for free Pages).
- Settings, Pages, Source: **GitHub Actions**.
- Settings, Secrets and variables, Actions, new repository secrets:
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is safe to expose by design;
  the security comes from the database rules).
- `deploy.yml` builds and publishes on every push to `main`. `keepalive.yml` pings Supabase twice
  a week so the free project does not pause.

## How the privacy works

The repository is public, so everything private lives in Supabase:

- Row Level Security is on for every table and the anonymous role has **no table access at all**.
- Visitors can only call three functions: `check_link`, `unlock_letter`, `sign_letter`. They return
  no name, note, venue or map link until the PIN is right.
- 5 wrong PINs lock a link for 15 minutes. Tokens are about 154 bits of randomness.
- Admins are the users in `public.admins`. Only they can read or change tables.
- A signed letter keeps a frozen snapshot, and its name, note, font and signature cannot be edited.

`supabase/tests/` runs against a real Postgres (PGlite) and checks all of this, including that
anonymous users cannot read any table. It runs as part of `npm test` and in CI.
