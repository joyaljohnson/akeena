# Artwork needed (envelope and reveal)

Everything below is currently a drawn placeholder in `src/envelope/EnvelopeArt.tsx`. Each piece is a
separate layer, because the opening animation moves them independently. Swapping in the real art
only touches that file (and a build step through `scripts/build-images.mjs`).

Display geometry: the envelope is 340 CSS px wide at most, aspect ratio 300 : 204 (about 1.47 : 1).
The flap tip (the point of the flap triangle) sits 55% of the way down the envelope.
Deliver at 2x or better. Transparent PNG unless noted. No names, dates or venues in any image.

| File                                   | Size (px)  | What it is                                                                                                                                                                                                                   |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `envelope-front.png` (opaque)          | 1200 x 816 | Envelope front, plain ivory embossed paper. Leave the top-right free: the stamp is drawn over it. Leave the centre free: "A letter for you" is set on it.                                                                    |
| `envelope-back-body.png`               | 1200 x 816 | The back of the envelope without the flap: side and bottom folds meeting at a point 55% of the way down. **The V-shaped area above the folds must be transparent**, so the letter and glow show through when the flap opens. |
| `envelope-flap.png`                    | 1200 x 448 | The flap only: a triangle, wide edge along the top, point at the bottom. Transparent outside the triangle. This is the **outer** face.                                                                                       |
| `envelope-flap-inner.png`              | 1200 x 448 | Same triangle, the **inside** face (plain, slightly darker paper). Seen once the flap has swung open.                                                                                                                        |
| `flap-florals.png`                     | 640 x 280  | Symmetrical floral relief cluster that sits at the flap's point, behind the seal.                                                                                                                                            |
| `wax-seal.png`                         | 256 x 256  | Blush / dusty-rose wax seal with an embossed peony (or the initial "A"). The seal is split into two halves in code to "crack" it, so it should read as one round piece with no hard edge artefacts.                          |
| `paper-texture.png` (opaque, tileable) | 512 x 512  | Letter page background. Currently a generated noise.                                                                                                                                                                         |
| `floral-corner.png`                    | 320 x 320  | Corner ornament for the cover.                                                                                                                                                                                               |
| `og-envelope.jpg` (opaque)             | 1200 x 630 | WhatsApp / link preview image: a closed envelope, nothing personal.                                                                                                                                                          |

If the final art is not split into these layers (for example the flap is baked into the envelope),
it cannot be animated convincingly. Regenerate it as separate pieces rather than faking it.
