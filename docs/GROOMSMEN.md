# Groomsmen page

One private page for the groomsmen, at `#/g/<token>`. One shared link and one PIN for everyone (5 wrong tries lock it for 15 minutes, like the letters). It shows the four chapters from the shared letter (dates, times, venues with map links, vibe) so those are only written once, plus a **Dress code** section per chapter with colour chips and the outfit pictures from the Grooms men Pinterest board. Tapping a picture opens it large.

Nothing shows before the correct PIN. The dress-code words, picture links and the Pinterest link live only in the database (`groomsmen_guide`, one row), never in git.

## Files

- `supabase/migrations/20261106000000_groomsmen_guide.sql`: table (RLS, no anon access), `check_guide`, `unlock_guide`. Tests: `supabase/tests/guide.test.ts`.
- `src/guide/`: `GuideRoute` (PIN, refresh, status screens), `GuidePage`, `Lightbox`. The chapter cards are the letter's own (`ChaptersPage` with `renderBody`).
- `src/lib/guideTypes.ts`: the page's content shape (heading, intro, closing, per-chapter `dressCode`, `details`, `swatches`, `looks`, optional `moodboard`).
- Private: `src/dev-fixture/guide.ts` (the words), `supabase/guide.private.sql` (built from it), `private-media/groomsmen/` (web pictures). All gitignored.
- Preview with no PIN while developing: `#/dev/guide`.

## Pictures

The pictures are third-party saves from Pinterest, so they are never committed and are not in `public/`.

1. `node scripts/process-groomsmen.mjs "<folder with one sub-folder per chapter>"` crops black bars, resizes to 720 px wide WebP and gives each a random file name. Output: `private-media/groomsmen/`.
2. Supabase dashboard, Storage, bucket `letter-media` (public), create the folder `groomsmen`, upload every `.webp` from `private-media/groomsmen/` (not `manifest.json`).

## Editing in the admin

Admin, **Groomsmen** (`#/admin/groomsmen`): link and PIN (copy, new PIN), on/off, heading, intro, closing line, Pinterest link, and for each chapter the dress code, outfit text, colours (`Name #HEX` per line) and picture links (one per line, in order). A live preview shows the draft with the real page. The first Save creates the page and its link; later saves keep the link. Pictures are still uploaded in Supabase Storage (`letter-media`, folder `groomsmen`) and their public links pasted in.

## Setting up or changing the page (without the admin)

1. Run the migration once (SQL editor): `supabase/migrations/20261106000000_groomsmen_guide.sql`.
2. Edit the words in `src/dev-fixture/guide.ts`, then `npm run guide:build`.
3. SQL editor: paste `supabase/guide.private.sql`, Run. The result row shows the page link and PIN. Re-running updates words and pictures and keeps the link and PIN.
4. To switch the page off: `update groomsmen_guide set is_active = false;`. To change the PIN: `update groomsmen_guide set pin = '1234';`. To see views: `select open_count, last_opened_at from groomsmen_guide;`.

Send the link and PIN in separate messages if you like; the link alone shows only a PIN screen.
