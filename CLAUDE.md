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
