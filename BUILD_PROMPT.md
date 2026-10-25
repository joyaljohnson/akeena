# Build Prompt — "Will You Be My Bridesmaid?" Letters for Akeena Paul

> Paste this file into Claude Code (or keep it in the repo root and say: "Read BUILD_PROMPT.md and start Phase 0").
> Private letter content (names, venues, map links) lives in `letter-content.md`, which must be **gitignored** and never committed.

---

## 0. How I want you to work (read first)

- This is a **meticulous, quality-first** personal project. Correctness, polish and privacy matter more than speed.
- **Start in plan mode.** Before writing code, read this whole file and `letter-content.md`, then give me a plan plus any questions. Don't guess on anything ambiguous; ask.
- Build in the **phases in §14**. **Stop at the end of every phase**, summarise what was built, list anything you were unsure about, and wait for my go-ahead.
- In Phase 0, create a `CLAUDE.md` that condenses the standing rules from this file (stack, design tokens, privacy rules, mobile-first rules, definition of done) so every future session stays consistent.
- Never commit secrets, private letter content, or anything from `letter-content.md`.
- When something in this spec is technically wrong or there's a clearly better approach, **say so and propose it** rather than silently following or silently deviating.
- I will provide image assets (see §11). Where an asset isn't there yet, use a tasteful placeholder of the **exact same dimensions and filename**, so swapping in the final art is a drop-in replacement.

---

## 1. What we're building

A mobile-first web app that lets **Akeena Paul** (the bride) send each of her bridesmaids a private, beautifully designed "Will you be my bridesmaid?" letter.

- Akeena writes one shared letter (duties, four event "chapters", closing quote, oath) **once**.
- For each bridesmaid she adds a **name**, a **personal note**, a **4-digit PIN**, and optionally a **handwriting font** (or uses the default).
- Each bridesmaid gets a **unique private link**. Akeena sends the link and PIN on WhatsApp.
- The bridesmaid opens the link → enters her PIN → an **envelope opens** → she reads a swipeable letter booklet → taps **"Yes, I do!"**, swears the oath, **types her name to sign** → an official stamp lands beside her signature with a timestamp → she **downloads the entire signed letter as an image**.
- Akeena sees a dashboard: not opened / opened / ✅ "Signed by Riya · 3 Nov 2026".
- There is **no "No" option**. This is a celebration.

Audience reality: bridesmaids open this from a **WhatsApp link on their phone**, often on mobile data in Kerala, India. Design, performance and download behaviour must be tuned for that first.

---

## 2. Tech stack (fixed)

| Area | Choice |
|---|---|
| Frontend | **Vite + React + TypeScript** (strict mode) |
| Styling | Plain CSS with custom properties (design tokens) + CSS Modules. No UI kit. |
| Animation | **Framer Motion** (respect `prefers-reduced-motion`) |
| Routing | **HashRouter** (GitHub Pages has no server rewrites) |
| Backend | **Supabase**: Postgres, Auth (admin only), RPC functions, Row Level Security |
| Validation | **zod** for the shared letter content JSON and all RPC responses |
| Image export | **html-to-image** (see §9 for the required robustness work) |
| Fonts | **Self-hosted** woff2 via `@fontsource/*` packages. No Google Fonts CDN at runtime (export reliability and privacy). |
| Hosting | **GitHub Pages**, deployed by a GitHub Actions workflow |
| DB changes | Supabase CLI migrations in `supabase/migrations/` |
| Code quality | ESLint + Prettier, `tsc --noEmit` clean, no `any` |

Environment variables (build-time, via GitHub Actions secrets → Vite):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (safe to expose by design; security comes from RLS and RPCs)
- **Never** use or commit the service role key in frontend code.

Provide `.env.example` with placeholder values.

---

## 3. Privacy and security model (non-negotiable)

The repo is **public** (free GitHub Pages), so all protection lives in Supabase.

1. **Anonymous users get zero direct table access.** RLS is enabled on every table with **no anon policies**. Bridesmaids interact only through `SECURITY DEFINER` RPC functions (set `search_path = public`, `GRANT EXECUTE ... TO anon`).
2. **No letter content, name, venue or map link leaves the database until the correct PIN is verified.** The pre-PIN screen shows only a generic envelope ("A letter for you").
3. **Unguessable links**: each bridesmaid has a `token` of at least 128 bits of randomness, URL-safe, generated in the database.
4. **PIN brute-force protection**: 5 wrong attempts → link locked for 15 minutes (stored server-side per token). Error messages are generic: never reveal whether a token exists.
5. **Admin access** is via Supabase Auth email + password. **Public sign-ups disabled.** Admin rights come from an `admins` allowlist table (Akeena and Jo). All admin table policies check membership of that table.
6. **Signed letters are frozen**: at signing, a full snapshot of the content she saw is stored. Later edits to the shared letter never change a signed letter.
7. **No private data in the repo**: seed content goes in a gitignored `supabase/seed.private.sql` generated from `letter-content.md`, or is entered via the admin UI.
8. `index.html` includes `<meta name="robots" content="noindex,nofollow">`, and `robots.txt` disallows all.
9. The WhatsApp link preview (Open Graph) is **generic**: no names, dates or venues (see §10).
10. Display all times in **Asia/Kolkata**; store UTC; use server time (`now()`) for signing, never client time.

---

## 4. Data model

```
admins
  user_id uuid PK → auth.users(id)

letter_template            -- singleton row, id = 1
  id int PK default 1, CHECK (id = 1)
  content jsonb NOT NULL   -- shared letter content, shape in §4.1
  default_font text NOT NULL
  whatsapp_message_template text NOT NULL
  updated_at timestamptz default now()

bridesmaids
  id uuid PK default gen_random_uuid()
  token text UNIQUE NOT NULL default <url-safe random, ≥128 bits>
  name text NOT NULL                    -- as shown on the cover
  personal_note text NOT NULL           -- max 600 chars
  font text NULL                        -- NULL = use template default
  pin text NOT NULL                     -- exactly 4 digits; admin-only via RLS (see note)
  is_active boolean NOT NULL default true
  sort_order int NOT NULL default 0
  created_at timestamptz default now()
  first_opened_at timestamptz NULL
  last_opened_at timestamptz NULL
  open_count int NOT NULL default 0
  failed_attempts int NOT NULL default 0
  locked_until timestamptz NULL
  signed_at timestamptz NULL
  signed_name text NULL
  signed_snapshot jsonb NULL            -- full rendered content at signing time
```

**PIN storage note:** the PIN is stored readable *only* to admins (RLS) so Akeena can re-copy the invite message later. Anon can never read the table. If you believe hashing (pgcrypto `crypt`) with a "reset PIN" flow is meaningfully better here, raise it in your plan and explain the UX trade-off.

**Triggers / constraints:**
- `pin` must match `^\d{4}$`.
- Once `signed_at` is set, block updates to `name`, `personal_note`, `font`, `signed_*` (allow `is_active` and `sort_order` only).
- `personal_note` length ≤ 600.

### 4.1 `letter_template.content` shape (validate with zod, mirror as TS types)

```ts
type LetterContent = {
  bride: { firstName: string; signOff: string };          // "Akeena", "With love,"
  cover: { headlineTemplate: string };                     // "{name}, would you be my bridesmaid?"
  duties: { title: string; items: string[] };
  chapters: Array<{
    id: string;
    number: number;                                        // 1–4
    title: string;                                         // "Maduram vepp"
    theme: 'pearl' | 'jewel' | 'gold' | 'pastel-metallic'; // drives page styling, §6.4
    events: Array<{                                        // 1 or 2 per chapter
      label?: string;                                      // e.g. "Ceremony", "Evening"
      date: string;                                        // ISO date "2026-12-25"
      time: string | null;                                 // "18:30" or null if TBC
      timeNote?: string;                                   // e.g. "Evening function"
      venueName: string;
      mapsUrl: string;
    }>;
    vibe: string;
    dressCode: string;
    dressCodeNote?: string;                                // "I will send you pictures"
  }>;
  closingQuote: string;
  acceptance: { question: string; yesLabel: string };      // "Will you accept?", "Yes, I do!"
  oath: string;
};
```

Weekdays are **computed** from `date` (never typed by hand). Format dates as "Friday, 25 December 2026" and times as "6:30 pm". If `time` is null, show `timeNote` or "Time to be confirmed".

---

## 5. RPC functions (the only anon surface)

All return JSON validated by zod on the client. All are `SECURITY DEFINER`, `search_path = public`, `EXECUTE` granted to `anon`.

1. **`check_link(p_token text)`** → `{ status: 'ok' | 'unavailable' | 'locked', locked_until?: timestamptz }`
   Unknown token and inactive token both return `'unavailable'`. Returns **no** name or content.

2. **`unlock_letter(p_token text, p_pin text)`** →
   - wrong PIN: increment `failed_attempts`; on the 5th set `locked_until = now() + 15 min` and reset the counter; return `{ status: 'wrong_pin', attempts_left }` or `{ status: 'locked', locked_until }`
   - correct PIN: reset `failed_attempts`, set `first_opened_at` if null, update `last_opened_at`, increment `open_count`, and return
     `{ status: 'ok', letter: { name, personalNote, font (resolved), content (template or signed_snapshot if signed), signed: { at, name } | null } }`
   - inactive or unknown: `{ status: 'unavailable' }`

3. **`sign_letter(p_token text, p_pin text, p_signed_name text)`** →
   Re-verifies the PIN (and respects the lock). Trims the name; requires 1–60 chars. If already signed, return the existing signature (**idempotent**: double taps are safe). Otherwise set `signed_at = now()`, `signed_name`, and `signed_snapshot` (resolved name, note, font, content). Return the same shape as `unlock_letter`.

Client keeps the PIN **in memory only** for the session (also in `sessionStorage` so a refresh doesn't force re-entry; cleared when the tab closes). Never in `localStorage`, never in the URL.

Admin operations use normal Supabase queries under RLS (admins only).

---

## 6. Design system

### 6.1 Direction
Soft, luxe, romantic and faithful: **ivory embossed paper, 3D floral relief, a blush/dusty-rose peony wax seal, light glowing from inside the envelope**, with sage, dusty blue and soft gold accents. Elegant, never loud. Every screen should feel like holding a real, expensive letter.

### 6.2 Tokens (starting point; refine to match the final artwork)
```css
--ivory:#F7F1E6; --paper:#FBF7EF; --paper-shadow:#E9DFCC;
--ink:#3A2F2A;  --ink-soft:#6E625A;
--blush:#E6CBC3; --rose:#C9A3A0; --sage:#A9B39A; --dusty-blue:#A9BCD0;
--gold:#B8925A; --gold-light:#D9BE8C;
--burgundy:#7E2E3A;   /* from Jo's stamp: use sparingly as an accent */
```
The letter is paper: **force a light appearance**; don't implement dark mode for the letter.

### 6.3 Typography
- **Display / headings**: Cormorant Garamond (incl. italic), self-hosted.
- **Small caps labels** (chapter numbers, "DETAILS", "VIBE", "THE COLOUR"): Cinzel or Cormorant SC, letter-spaced. It should echo Jo's stamp.
- **Body**: Cormorant Garamond at a comfortable mobile size (≥18px), or EB Garamond if legibility needs it. Justify your choice.
- **Handwriting font** (Akeena's choice; one default plus optional per-bridesmaid override) applies to: the cover greeting with the bridesmaid's name, the personal note, "With love, Akeena", and the bridesmaid's **live signature**.
  Offer these options (all OFL/Apache, self-hosted): Great Vibes, Parisienne, Allura, Pinyon Script, Alex Brush, Sacramento, Dancing Script, Homemade Apple. Each option previews **in its own font** in the admin picker.
- Every handwriting font needs a sensible size/line-height tuning map, since script fonts vary wildly in x-height. The note must stay readable at 360px width.

### 6.4 Chapter themes (the dress code becomes the design)
Each chapter page tints its paper and accents to its dress code, subtly and tastefully, never garish:
- **Ch1 `pearl`**: shades of white, pearl and ivory; soft shimmer.
- **Ch2 `jewel`**: rich traditional brights (marigold, magenta, emerald, peacock blue). **No red.** Used as accents on ivory, not full-bleed.
- **Ch3 `gold`**: shades of gold, warm sunset glow.
- **Ch4 `pastel-metallic`**: pastel metallic tissue silk (champagne, lilac, mint shimmer).

### 6.5 Jo's stamp ("God has joined them together · Mark 10:9")
Jo's **original design** (image provided as `assets/stamp-reference.png`). Rebuild it faithfully as an **SVG React component** `<UnionStamp />`:
rounded square, perforated/dashed gold outer border, thin gold inner rounded square, gold circle, circular text "GOD HAS JOINED THEM TOGETHER" along the upper arc, burgundy cross, open book in gold outline, "MARK 10:9" in burgundy below; default rotation about −6°.
For export reliability, convert circular text to **outlined paths** (or guarantee the font is embedded). Compare side by side with the reference image and iterate until it matches.

Placements:
1. **Envelope front**, top-right, as a postage stamp.
2. **Acceptance page**: it **stamps down** beside the signature at the moment of signing (scale 1.4 → 1, slight rotation settle, soft "thud" shadow, `navigator.vibrate(25)` where supported). It appears in the downloaded image.
3. Optional (ask me after Phase 5): a faint watermark on Chapter 4.

---

## 7. Bridesmaid experience (route `#/l/:token`)

### 7.1 Screens and flow
1. **Envelope front + PIN**: envelope front art, stamp top-right, "A letter for you" in handwriting font (generic, no name), and a 4-digit PIN entry (4 boxes, numeric keypad via `inputmode="numeric"`, auto-advance, paste support, auto-submit on 4th digit). Wrong PIN: a gentle shake and "That's not quite it, try again" with attempts left. Locked: "Too many tries. Try again in X minutes, or message Akeena."
2. **Envelope back**: after a correct PIN the envelope flips to the back: floral cluster on the flap and the **peony wax seal**. Prompt: "Tap the seal to open".
3. **Reveal animation** (the signature moment, so make it beautiful): the seal lifts and cracks or fades, the flap rotates open (3D, `perspective`), a warm **glow spills from inside**, and the letter slides up out of the envelope into the booklet. About 2.5–3.5s total, skippable by tap. Reduced motion: a simple crossfade.
4. **Booklet**: horizontally swipeable pages (pointer and touch swipe, prev/next buttons, ← → keys, page dots, "1 / 8" indicator). Pages:
   1. **Cover**: "{Name}, would you be my bridesmaid?" (handwriting), personal note (handwriting), "With love, / Akeena" (handwriting), floral corner art.
   2. **Duties**: title "Duties" with a playful flourish; each duty as an elegant list item with small floral bullets.
   3–6. **Chapters 1–4**: chapter number in small caps ("CHAPTER ONE"), title in display serif, then sections **Details** (date with weekday, time, venue for each event, each venue with a **"Get directions"** button → `mapsUrl` in a new tab, `rel="noopener"`), **Vibe**, **The colour** (+ "I'll send you pictures" note styled as a little handwritten aside). Themed per §6.4.
   7. **Closing quote**: large, centred, display italic.
   8. **Acceptance**: see §7.2.
5. **Signed state**: on revisit with a correct PIN, an already-signed letter skips the envelope-opening prompt (or offers a "replay" link) and lands on the booklet with the acceptance page showing the signature, stamp and timestamp, plus the **Download** button.

### 7.2 Acceptance and signing interaction
1. "Will you accept?" → large **"Yes, I do!"** button. On tap: soft petal or confetti burst (subtle, ivory/blush/gold, ≤1.5s).
2. **The oath** card appears: "I solemnly swear I am up to no good (and ready to celebrate)". A **"Tap to swear 🤞"** button marks it sworn (small check animation).
3. **Signature**: an input styled as a signature line. As she types, her name renders live in the chosen handwriting font above the line. A "Seal it" button activates when there are 1–60 non-space characters. It does not need to match the bridesmaid name (nicknames allowed).
4. On "Seal it": call `sign_letter`. While pending, disable the button and show a gentle loader. On success: **stamp-down animation**, then reveal "✅ Signed by {signed_name} · {d MMM yyyy, h:mm a}" in IST, then a large **"Download your letter"** button.
5. The signature is final: no editing, no unsign.

### 7.3 Error and edge states (all designed, never raw errors)
Invalid or inactive link ("This letter isn't available. Please reach out to Akeena."), locked, offline/network failure (retry button, PIN kept), Supabase slow (skeleton on paper), refresh mid-flow (resume from the booklet using the session PIN), double-tap sign (idempotent), very long names (wrap gracefully), emoji in names/notes, a font failing to load (serif fallback, and still allow export once loaded), no JavaScript (simple `<noscript>` note).

---

## 8. Admin experience (route `#/admin`, lazy-loaded chunk)

Login: email + password (Supabase Auth). Non-admins see "No access". Session persists. Admin UI is mobile-friendly too (Akeena may manage it from her phone) but can be denser than the letter.

### 8.1 Dashboard (landing)
- Progress header: "4 of 6 signed".
- List of bridesmaids (ordered by `sort_order`, drag to reorder or up/down buttons) showing name, font, and a status chip:
  - **Not opened**
  - **Opened** · first opened {date} · {open_count} views
  - **✅ Signed by {signed_name} · 3 Nov 2026**
  - **Deactivated** (muted)
- Per row: **Copy link**, **Copy PIN**, **Copy WhatsApp message**, **Send via WhatsApp** (`https://wa.me/?text=` + encoded message), **Preview**, **Edit** (disabled once signed), **Download** (signed letters), **Deactivate/Reactivate**, **Delete** (confirm dialog; warn strongly if signed).

### 8.2 Add / edit bridesmaid
Fields: Name, Personal note (textarea, live counter to 600), PIN (4 digits, with a "Generate" button; must be unique across bridesmaids to avoid mix-ups), Font (Default or one of the options, each previewed in its own font). **Live preview** of the cover page beside or below the form.

### 8.3 Shared letter editor
Edit everything in `LetterContent`: duties (add/remove/reorder), each chapter (title, theme, 1–2 events with label/date/time/timeNote/venue/maps URL, vibe, dress code, note), closing quote, acceptance labels, oath, default font, WhatsApp message template. Validate with zod; show inline errors. A banner explains: "Changes apply to all letters that aren't signed yet. Signed letters keep the version she signed."

### 8.4 Preview
Renders the **exact** bridesmaid components with data passed directly (no PIN), with a slim top banner "Preview: this is exactly what {name} will see". Signing is simulated locally, never saved. Can replay the envelope animation.

### 8.5 WhatsApp message template
Default (casual, no formal sign-off, editable):
```
Hey {name} 💌 I've got something special for you…

Open it here: {link}
Your secret PIN: {pin}
```
Placeholders: `{name}`, `{link}`, `{pin}`. The link format is `https://<pages-domain>/<repo>/#/l/<token>` (build from `import.meta.env.BASE_URL` + `window.location.origin`).

---

## 9. Download: the entire signed letter as one image

Requirement: the bridesmaid (after signing) and Akeena (for any signed letter) can download **the entire signed letter as a single PNG**.

Implementation requirements:
1. A dedicated **`<ExportLetter />`** layout, separate from the interactive booklet: all pages stacked vertically in order (cover → duties → 4 chapters → quote → acceptance with signature, stamp and timestamp), fixed width **1080 CSS px**, no animations, no buttons ("Get directions" becomes a small venue-name line), rendered off-screen.
2. Before capture: `await document.fonts.ready`, explicitly `document.fonts.load()` the chosen handwriting font and all heading fonts, and `await img.decode()` for every image.
3. **Canvas size safety**: compute `pixelRatio` so total pixels stay **≤ 16,000,000** (iOS Safari limit). Prefer quality within that limit.
4. **Safari workaround**: run `toPng` once to warm up (images/fonts), then capture for real. Verify both outputs are identical on iOS.
5. Filename: `Akeena-bridesmaid-letter-{Name}.png` (sanitised).
6. Delivery fallbacks, in order:
   1. `navigator.canShare({ files })` → `navigator.share` (best on iOS/Android; lets her save to Photos or send on).
   2. `<a download>` blob link.
   3. A full-screen modal showing the generated image with "Press and hold the image to save it".
7. **In-app browser detection** (WhatsApp/Instagram/Facebook user agents): show a gentle hint above the download button: "For the best download, open this in Safari/Chrome (⋯ → Open in browser)". Still attempt the download.
8. Show progress ("Preparing your letter…") since capture can take a few seconds.
9. Admin downloads of signed letters render from `signed_snapshot` so they match exactly what was signed.

---

## 10. Hosting, deploy, link previews

- `vite.config.ts` `base: '/<repo-name>/'` (read the repo name from an env var so a custom domain can switch it to `/` later).
- GitHub Actions workflow `.github/workflows/deploy.yml`: on push to `main` → install → typecheck → lint → build (with `VITE_SUPABASE_*` from repo secrets) → `actions/upload-pages-artifact` → `actions/deploy-pages`. Add `.nojekyll`.
- HashRouter, so no 404 rewrite hacks.
- **Open Graph** (static, in `index.html`): `og:title` "You've got a letter 💌", neutral `og:description` ("Something special is waiting for you."), `og:image` = a **1200×630 envelope image** (absolute URL), `og:type` website, `twitter:card` summary_large_image. No personal details. Test the WhatsApp preview by sending the link to yourself.
- Favicon / apple-touch-icon: a tiny wax-seal mark.
- Provide a `README.md` covering local setup, Supabase setup (CLI link, run migrations, disable sign-ups, create the two admin users, insert them into `admins`, run the private seed), GitHub secrets, and deploy.

---

## 11. Assets (Jo provides; AI-generated)

Place originals in `assets-src/` (committed is fine, no private info), and have a script (`sharp` or `vite-imagetools`) produce optimised **AVIF + WebP** at 1x/2x into `public/img/`. Use `<picture>` with fallbacks. If any asset is missing, create a same-size placeholder and list what's missing at the end of each phase.

Expected source files (transparent PNG unless noted, minimum 2x of display size):

| File | Purpose |
|---|---|
| `envelope-front.png` (opaque) | Envelope front, plain ivory embossed paper, room for the stamp top-right |
| `envelope-back-body.png` | Envelope back body/pocket, **without** the flap |
| `envelope-flap.png` | Top flap only (transparent outside the flap shape) so it can rotate open |
| `flap-florals.png` | Floral relief cluster that sits on the flap's tip |
| `wax-seal.png` | Blush/dusty-rose wax seal with embossed peony (or initial "A") |
| `paper-texture.png` (opaque, tileable) | Letter page background |
| `floral-corner.png` | Corner ornament for cover and pages |
| `stamp-reference.png` | Jo's stamp design, reference for the SVG rebuild |
| `og-envelope.jpg` (1200×630) | WhatsApp/OG preview image |

If the provided art isn't layered the way the animation needs (e.g. flap not separate), tell me exactly what to regenerate rather than faking it.

---

## 12. Mobile-first, accessibility, performance

**Mobile**
- Design at **360–430px** first; test 360×740, 390×844, 430×932. On desktop, centre a phone-width column on a soft ambient background.
- Use `100dvh`, respect safe-area insets, no horizontal page scroll, touch targets ≥ 44px, no hover-only interactions.
- Swipe gestures must not fight vertical scrolling inside long pages.

**Accessibility**
- Semantic headings per page; buttons are `<button>`; images have meaningful `alt` or `alt=""` if decorative.
- Text contrast WCAG AA on all paper tints (check jewel and gold themes especially).
- Visible focus styles; full keyboard navigation; `aria-live` for PIN errors and signing status.
- `prefers-reduced-motion`: replace all motion with fades; no confetti.

**Performance budget** (test on simulated Slow 4G, mid-range Android)
- Envelope visible ≤ 2.5s; initial JS ≤ 200KB gzipped (admin is a separate lazy chunk; html-to-image loaded only when downloading).
- Preload envelope art and the default handwriting font; lazy-load chapter decorations.
- Total images on the bridesmaid path ≤ ~1.2MB at 2x.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.

---

## 13. Testing

- **Unit** (Vitest): date/weekday formatting (IST), placeholder substitution, zod schemas, pixel-ratio calculation, in-app browser detection.
- **DB tests** (SQL or a script against a local Supabase): anon cannot select any table; `check_link` reveals nothing; wrong PIN increments and locks on the 5th; lock expires; correct PIN returns letter and updates open stats; `sign_letter` is idempotent; signed rows can't be edited; template edits don't change signed snapshots.
- **E2E** (Playwright, mobile viewports): full bridesmaid flow; admin create → preview → copy link; download produces a PNG of expected dimensions.
- **Manual device checklist** (write it in `docs/QA.md`): iPhone Safari, iPhone WhatsApp in-app browser, Android Chrome, Android WhatsApp in-app browser, the WhatsApp link preview, downloads saving to Photos/Gallery on both, slow network, reduced motion, airplane mode mid-flow.

---

## 14. Build phases (stop and report after each)

**Phase 0: Setup**
Repo scaffold, TS strict, ESLint/Prettier, folder structure, tokens, self-hosted fonts, `CLAUDE.md`, `.env.example`, `.gitignore` (include `letter-content.md`, `supabase/seed.private.sql`, `.env*`), GitHub Actions deploy with a "hello" page live on Pages.

**Phase 1: Letter design (static, seed data in a local untracked fixture)**
All booklet pages, chapter themes, `<UnionStamp />` matched to Jo's reference, handwriting font system with tuning map. Pixel-polish at 360/390/430. *This is the most important phase: show screenshots at each width.*

**Phase 2: Envelope and reveal**
Envelope front with stamp, PIN UI (visual only), flip to back, wax seal, the opening animation, reduced-motion path.

**Phase 3: Supabase**
Migrations (tables, constraints, triggers, RLS, RPCs, grants), DB tests, private seed script generated from `letter-content.md`, README setup steps.

**Phase 4: Bridesmaid flow wired up**
`check_link` → PIN → `unlock_letter` → booklet; lock and error states; session PIN handling; signed-state revisit.

**Phase 5: Signing and download**
Acceptance interaction, oath, live signature, `sign_letter`, stamp-down, IST timestamp, `<ExportLetter />`, robust download with all fallbacks.

**Phase 6: Admin**
Auth, dashboard with statuses, add/edit bridesmaid with live preview, shared letter editor, preview mode, WhatsApp message tools, deactivate/delete, admin download.

**Phase 7: QA and polish**
Run all tests, Lighthouse, accessibility pass, `docs/QA.md` checklist, fix everything found. Final screenshots of every screen at 390px.

**Phase 8: Extras (only after I confirm v1 is perfect)**
- Optional background music toggle (off by default; Akeena supplies a licensed track).
- Chapter photo slots for the dress-code inspiration pictures (private Supabase Storage bucket, served via signed URLs returned only by the PIN-verified RPC).
- "My bridal party" collage export for Akeena combining all signed acceptance pages.
- Faint stamp watermark on Chapter 4.

---

## 15. Definition of done (every phase)

- `tsc`, lint and tests pass; no console errors or warnings.
- Looks right at 360, 390 and 430px; no layout shift when fonts load.
- Reduced motion respected.
- No private data in git (`git grep` for venue names and map links returns nothing).
- You've listed: what was done, what's left, any assumptions, and any assets still missing.
