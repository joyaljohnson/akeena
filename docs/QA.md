# QA checklist

What is already checked by machines, and what still needs a real phone.

## Checked automatically

Run all of it with `npm run ci:local` (type check, lint, unit and database tests, build) and
`npm run e2e` (the browser tests). The browser tests use made-up content and a pretend backend,
so they touch nothing real.

| Area                                                                                                                                                                                            | How                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Dates, weekdays, times (India), placeholders, name and PIN rules, pixel budget, in-app browser detection, filenames (including Malayalam)                                                       | Unit tests (`src/**/*.test.ts`)          |
| Database privacy: anonymous visitors can read nothing, 5 wrong PINs lock for 15 minutes, signing is final and idempotent, signed letters never change, admin-only access                        | `supabase/tests` against a real Postgres |
| Whole bridesmaid journey at 360, 390 and 430 px: PIN, envelope, letter, cards, accept, oath, sign, download (1080 px wide PNG under the 16-million-pixel limit)                                 | `e2e/bridesmaid.spec.ts`                 |
| Wrong PIN, locked link, unknown link, network failure (PIN and name kept), refresh resume (view not recounted), signed revisit                                                                  | `e2e/bridesmaid.spec.ts`                 |
| Long names, emoji, 600-character note, handwriting fonts failing to load, reduced motion, no console errors or warnings                                                                         | `e2e/bridesmaid.spec.ts`                 |
| Admin: statuses, copy link/PIN/message, add with validation and a generated PIN, live preview, reorder, deactivate, delete warning for signed letters, shared letter editor validation, sign-in | `e2e/admin.spec.ts`                      |
| Accessibility (WCAG 2.1 A and AA) on every screen, with axe                                                                                                                                     | `e2e/a11y.spec.ts`                       |

Lighthouse (mobile, simulated slow 4G on a mid-range phone), last run on the production build with
the final artwork: Performance 97 to 98, Accessibility 100, Best Practices 100. SEO is not a goal:
the pages are deliberately kept out of search engines. The envelope appears in about 2.3 to 2.4
seconds; the first script download is about 118 KB (gzipped) plus a 15 KB envelope picture.

## Still needs a real phone

Do these on real devices before sending any invite. Use a throwaway bridesmaid in the admin and
delete her afterwards (a signed test letter can only be removed by deleting it).

### 1. iPhone, Safari

- [ ] Open the link from a message. The envelope appears quickly, nothing jumps.
- [ ] Tap the first PIN box: the number keypad appears. Type the PIN: it moves along by itself and opens by itself.
- [ ] A wrong PIN shakes gently and says how many tries are left.
- [ ] The envelope turns over, the seal can be tapped, the flap opens, the letter rises. Tap during it: it skips to the end.
- [ ] Swiping on the letter scrolls it smoothly. Nothing scrolls sideways. The bottom bar and notch do not cover text.
- [ ] Chapter cards open and close; the map links open the map.
- [ ] Yes, I do! then I swear, then type a name with a long surname. The name appears in handwriting as you type.
- [ ] Seal it: the stamp lands, with a small buzz on supported phones.
- [ ] **Download your letter**: the share sheet opens. Choose Save Image. Check Photos: one tall picture, the stamp, the signature and the time are all there, nothing is black or missing.
- [ ] Rotate to landscape: still usable. Turn on Dark Mode: the letter stays light.

### 2. iPhone, inside WhatsApp (tap the link in a chat)

- [ ] Everything above works.
- [ ] The hint to open in Safari or Chrome appears above the download button.
- [ ] Download either saves, or shows the picture screen; holding the picture offers Save to Photos.

### 3. Android, Chrome

- [ ] The same journey as Safari.
- [ ] Download: the share sheet or a download notification appears; the picture is in Gallery or Files and is complete.
- [ ] Back button leaves the letter sensibly (it does not reopen the PIN screen by accident).

### 4. Android, inside WhatsApp

- [ ] The journey works. The in-app browser hint appears. Download works or falls back to the picture screen.

### 5. The WhatsApp link preview

- [ ] Send the link to yourself in WhatsApp. The preview shows the envelope picture and "You've got a letter" with the line "Something special is waiting for you."
- [ ] The preview shows **no** names, dates or venues. (Link previews are cached by WhatsApp; if you change the picture, test with a fresh link.)

### 6. Slow network

- [ ] Phone settings or Chrome DevTools: Slow 4G. The envelope still appears within a few seconds, with the PIN boxes greyed out until the link is checked.
- [ ] While the letter opens, nothing flashes or jumps.

### 7. Reduced motion

- [ ] Phone Settings, Accessibility, Reduce Motion on: the envelope fades instead of turning, no petals, and everything still works.

### 8. Offline in the middle

- [ ] Switch on airplane mode on the PIN screen, type the PIN: a calm message with Try again, and the digits are kept.
- [ ] Switch off airplane mode, Try again: it opens.
- [ ] Airplane mode again at Seal it: "We couldn't seal your letter", the name is kept; after reconnecting, Seal it works and she is signed once.

### 9. Admin on Akeena's phone

- [ ] Sign in. The list is readable; every button is easy to tap.
- [ ] Add a bridesmaid: Generate gives a PIN; the cover preview follows what is typed.
- [ ] Send via WhatsApp opens WhatsApp with the message, link and PIN filled in.
- [ ] Preview shows the yellow banner, signing there is not saved.
- [ ] Shared letter: change a word, save, open a test link: the new word shows. A signed letter keeps the old word.
- [ ] Download on a signed letter saves the picture.

## Before the real invites go out

- [ ] Delete all test bridesmaids.
- [ ] Confirm the three open spellings and the two church times from Akeena in the shared letter editor.
- [ ] Check `https://<site>/#/admin` asks for a sign-in, and that sign-ups are off in Supabase.
