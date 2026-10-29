# Cover film and music

The cover can have a quiet looping film behind it, and music that starts when the envelope's seal is tapped (phones only allow sound after a tap). It is optional: leave the three admin boxes empty for the plain cover.

## Where the files live

The repository is public, so personal film and music are **not** committed (`private-media/` and `public/dev-media/` are gitignored). They are uploaded to a public Supabase Storage bucket under unguessable file names. The links only ever reach a bridesmaid after the correct PIN, because they live in the letter content.

Prepared files (made with `ffmpeg-static`, silent, 576x1024, about 1.8 MB) are in `private-media/`:

- `cover-<random>.mp4`: the film (no sound)
- `cover-<random>-poster.jpg`: the still shown first, and instead of the film for people with reduced motion or data saver on

## Upload steps (Supabase dashboard)

1. Storage, New bucket, name `letter-media`, **Public bucket** on.
2. Upload the `.mp4`, the `-poster.jpg`, and the music file (a licensed track, `.m4a` or `.mp3`).
3. Copy each file's public URL.
4. Admin, Shared letter, **Cover film and music**: paste film, still and music links. Save.

## Behaviour

- Film: muted, looping, `playsInline`, pauses when the page is hidden, fades in over the poster; an ivory veil keeps handwriting readable. Not used in the downloadable picture or the admin preview.
- Music: starts at the seal tap with a 1.6 s fade-in, loops, pauses when she leaves the page and returns on coming back. A round sound button (top right, `aria-pressed`) turns it off and on. If the browser refuses sound, the button shows "off" and a tap starts it.
- The clip's own sound is river ambience, not music, so a separate licensed track is needed.

## Veil and writing colour

Admin, Shared letter, Cover film and music: **Soft veil over the film** (on by default; off shows the film at full strength) and **Cover writing colour** (dark or white; white gets a soft shadow). Both only affect the cover in the real letter.
