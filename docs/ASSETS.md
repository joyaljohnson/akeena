# Artwork

The final envelope artwork is in. Originals live in `assets-src/` on the machine that made them
(the large originals are not committed to GitHub; keep your copies). The web-ready files are in
`public/img/` and **are** committed.

## How the pictures are used

| File you supplied         | What it is                                         | Used for                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `envelope-front.png`      | Envelope front with embossed ferns                 | The PIN screen (plus the stamp and "A letter for you") and the page shell in `index.html`                                                                                      |
| `envelope-back-body.png`  | The **closed** back of the envelope, flap attached | Both the **flap** (the big triangle) and the **pocket** (everything else). Closed, they line up exactly; when opening, the flap swings away and the inside shows through the V |
| `envelope-flap-inner.png` | Plain warm paper with a glow                       | The inside of the envelope, and the underside of the flap                                                                                                                      |
| (replaced) the seal is now drawn: `public/img/paw-seal.svg` (blush wax seal in the shape of a paw), cracked in two when opened; the icons are rendered from it |
| `paper-texture.png`       | Cream paper with fibres                            | The paper behind the pages, made seamless so it can repeat                                                                                                                     |
| `og-envelope.jpg`         | Envelope on linen with petals                      | The WhatsApp link preview (cropped to 1200 x 630)                                                                                                                              |
| `envelope-flap.png`       | A flat card with ferns                             | **Not used.** The flap is taken from the closed-back picture instead, so it matches the envelope exactly.                                                                      |

The seal also provides the browser-tab icon and the phone home-screen icon.

## Rebuilding after a change

Put a new picture in `assets-src/` with the same file name, then:

```bash
npm run art:build
```

That cuts the dark backdrops away, makes the paper seamless, writes the WebP files and the link
preview, and rebuilds the icons. Then check the opening animation (`#/dev/envelope`) and the
picture download.

## If you ever regenerate the art

- **Closed back picture** (`envelope-back-body.png`): the flap triangle is cut out using its measured
  outline in `src/envelope/EnvelopeArt.tsx` (corner clips at 40 px and 160 px, point at 1251 px, on a
  2528 x 1696 picture). If the flap's shape or position changes, update those numbers. Keep the
  flap's edge crisp and the envelope's aspect ratio at about 1.49 : 1.
- **Transparent pieces** (seal, florals, corner): a flat, plain dark backdrop (anything close to a
  single dark grey) cuts away cleanly. A textured or gradient backdrop will not. Real transparent
  PNGs also work: put them in as they are and skip the cut-out step in `scripts/process-art.mjs`.
- No names, dates or venues in any image (the link preview is seen by anyone with the link).
