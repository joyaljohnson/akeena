# Akeena bridesmaid letters: standing rules

Spec: `BUILD_PROMPT.md`. Private content: `letter-content.md` (gitignored, never commit, never paste into tracked files).
Work in phases (§14), stop after each, report: done, left, assumptions, missing assets.

## Stack

Vite + React + TS (strict, no `any`), plain CSS tokens + CSS Modules, Framer Motion, HashRouter, Supabase (RLS + RPC only), zod, html-to-image (lazy), self-hosted `@fontsource` fonts, GitHub Pages via Actions.

## Privacy (non-negotiable)

- Repo is public. Anon has zero table access; only SECURITY DEFINER RPCs. No content before correct PIN.
- Gitignored: `letter-content.md`, `supabase/seed.private.sql`, `src/dev-fixture/`, `.env*`. Never use the service role key in the frontend.
- Dev fixture loads only under `import.meta.env.DEV`; `npm run check:leaks` must pass on `dist/`.
- Generic OG preview, noindex, robots disallow. PIN lives in memory + sessionStorage only. Times: store UTC, show Asia/Kolkata, sign with server `now()`.

## Design

Ivory embossed paper, soft luxe. Tokens in `src/styles/tokens.css`. Letter is light-only. Cormorant Garamond (display/body), Cinzel (small caps labels), chosen handwriting font for greeting, note, sign-off, signature. Chapter themes: pearl, jewel (no red), gold, pastel-metallic.

## Mobile-first

Design at 360/390/430. `100dvh`, safe-area insets, no horizontal scroll, targets >= 44px, no hover-only. Respect `prefers-reduced-motion`. WCAG AA contrast.

## Definition of done (each phase)

`npm run typecheck`, `npm run lint`, `npm test` pass; no console errors; right at 360/390/430; reduced motion works; `git grep` for venues/map links is empty; `npm run check:leaks` passes.

## Working style

Quality over speed. If the spec is wrong or something is better, say so. Missing art: same-size placeholder with the exact filename.

## Decisions that override BUILD_PROMPT.md

- The letter is one continuous vertical scroll (no horizontal swipe, no page dots or arrows). A thin progress line shows reading position. Export (`ExportLetter`, §9) stacks pages the same way.
- Chapters are four expandable cards on one page (themed per chapter, collapsed by default). No "Get directions" button: the venue name is a dotted-underline link with a small pin icon. The image export renders cards with `alwaysOpen`.
- Each chapter card has an icon with closed and open variants that crossfade (home, ring box, sunset/sun, Bible). Optional `icon` field on a chapter; falls back to a default per theme. No chevron.
- No instruction text inside the letter (no "scroll", "tap", "click"). Type is compact (body about 16px); spacing tight. Phase 5 oath button must not say "Tap to swear".
- The cover fills the first screen on its own (greeting, note, sign-off); duties, chapters and the rest sit below the fold.
- The envelope scene shows no instruction text. The seal is a labelled button with a soft pulse. Layered artwork spec: docs/ASSETS.md.
- Database: migrations in `supabase/migrations/`, tests in `supabase/tests/` (PGlite, part of `npm test`). `unlock_letter` has an extra `p_count_view` flag (false when resuming after a refresh, so views are not inflated). Tokens are 40 hex chars (~154 bits). PINs are unique across bridesmaids. Any new table needs RLS, explicit revokes from anon, and a test.
- Before every push run `npm run ci:local` (hides private files, runs typecheck, lint, tests, build as CI does). After every push check the Actions run actually succeeded: `curl -s "https://api.github.com/repos/joyaljohnson/akeena/actions/runs?per_page=1"`. Deploys silently failed from Phase 1 to Phase 4 because the gitignored fixture was imported directly.
- Image export (src/export): the letter is laid out at 390px then scaled to 1080px wide by pixel ratio (not laid out at 1080). The paper-grain SVG background and <picture> wrappers break html-to-image, so the export root sets --paper-noise: none and swaps <picture> for <img>. Filenames keep combining marks (Malayalam). Signing rules: no instruction text in the letter; oath button is 'I swear'.
- Admin (`src/admin`, route `#/admin`, lazy chunk): talks to Supabase through the `AdminApi` interface (`supabaseApi.ts`); `mockApi.ts` backs the dev-only `#/dev/admin` so screens can be tested without a login. Preview renders the real letter components with local data; signing there is never saved. Signed letters use `signed_snapshot` everywhere (preview, download). Letter validation messages live in `src/lib/letterTypes.ts`.
- Quality gates: `npm run ci:local` before every push; `npm run e2e` (Playwright with installed Chrome, made-up content, mocked backend) and axe accessibility checks cover every screen; Lighthouse mobile targets Performance >= 90, Accessibility >= 95, Best Practices >= 95. First load stays light: the envelope PIN screen is separate from the animation code (EnvelopeStage) and the letter pages (Letter chunk); index.html draws the envelope before any script runs, so keep it matching src/envelope. Manual device checks live in docs/QA.md.
- Artwork: final pictures are in public/img (WebP). The flap and pocket are both cut from the closed-back picture (outline measured in src/envelope/EnvelopeArt.tsx); seal, florals and corner have their dark backdrops removed by scripts/process-art.mjs (`npm run art:build`). Large originals are in assets-src/ but gitignored. index.html draws the same front picture before any script runs. See docs/ASSETS.md.
- Cover note and sign-off are written out letter by letter like a pen (src/letter/PenWriting.tsx, penTiming.ts): smooth overlapping wipes, pauses at punctuation, capped at about 24 s, tap skips, reduced motion shows all at once, full text always available to screen readers. Plays only on the first opening (not on refresh, signed revisit, or the downloaded picture).
- A small fountain pen (src/letter/PenCursor.tsx) travels with the cover writing: its path is measured from the real letter positions and played back on the same clock; it leaves on tap-skip, resize or reduced motion, and never appears in the downloaded picture.
- The writing pen is a feather quill (PenCursor.tsx). No CSS filters or will-change on it (they paint a rectangle on some phones); its shadow is part of the SVG. Its clock is taken from the letters' real CSS animation startTime, and the nib is timed to the ink's leading edge (inkEdgeMs). Paper texture keeps only fibres over flat colour (process-art.mjs). Test visual changes in WebKit too: npx playwright install webkit.
- Optional moodboard link (content.moodboard: label + url) shows as a card after the chapters; not in the downloaded picture; edited in the admin under Shared letter. The real link lives only in the private fixture/letter-content.md and the database, never in git; check-leaks watches pin.it links.

## Cover film and music (Oct 2026)
- Optional `cover.background {videoUrl, posterUrl, musicUrl?}` in content. Personal media is never committed; see `docs/COVER-MEDIA.md`.
- Music is `src/letter/music.ts` (one Audio, started from the seal tap via `onSealTap` threaded EnvelopeGate -> Scene -> Stage); `SoundButton` toggles it. `CoverBackground` only shows in the real letter (`showBackground`), never in export or admin preview.
- E2E stubs media at `media.example.test`; a11y scans use `preload:false` (axe otherwise waits 10 s per scan on the stub video).
- First opening only (`writeCover`): 3 s after the cover writing ends (or is skipped) the scroller eases down to the duties (`autoAdvanceAfterMs` in LetterScroll); any touch, wheel or key cancels it; skipped for reduced motion. Chapter one opens by itself once all four cards have been fully on screen for 2 s, unless she has opened a card (no instruction text, per the rules above).

## River-green palette (Oct 2026)
- The letter (not the envelope) uses `data-palette="river"` (tokens.css): mint paper `paper-river.webp` (made by process-art.mjs), sea-green accents sampled from the cover film, forest-green `--burgundy` for buttons and sign-off. All four chapter themes are greens. Letter CSS uses `color-mix` on tokens instead of hard-coded rgba. Export root carries the same attribute (with `--paper-noise: none`).
- Duties use a heart bullet. The shades-of-white/gold pictures are gone; "The colour" shows named colour chips instead (`chapter.swatches` = [{name,hex}], edited as "Name #HEX" lines in the admin; pearl and gold themes have built-in ten-shade defaults in ChaptersPage). `colourImage` is removed from the schema.

## Opening sequence (Oct 2026)
- First screen is plain mint paper: "A letter for you" in handwriting, then the PIN boxes (no envelope). index.html draws the same thing before any script. After the right PIN the envelope flies in from far away (EnvelopeStage: `fly` motion value), front shows her name (her chosen handwriting), "With love, Akeena" and the Mark 10:9 stamp top right; after 3 s (a tap sooner) it flips to the back with the paw-print seal; tapping the seal opens the letter. Recipient comes from `getRecipient` (EnvelopeGate -> Scene -> Stage), read only after the PIN succeeded, so nothing private shows earlier.
- The seal is drawn and is itself paw-shaped: `public/img/paw-seal.svg` (no flower; the flap florals and corner art are removed). The back picture's own embossed vine border is part of the photograph and stays. The whole flow uses `data-palette="river"`; the envelope pictures stay cream.
