/** Total pixel budget for the exported canvas. iOS Safari fails on canvases above ~16.7M pixels. */
export const MAX_CANVAS_PIXELS = 16_000_000;

/**
 * Chooses the scale for the export. We want `targetWidth` pixels across, but never more pixels in
 * total than `maxPixels`, so a long letter still renders on iPhones.
 */
export function computePixelRatio(
  cssWidth: number,
  cssHeight: number,
  targetWidth = 1080,
  maxPixels = MAX_CANVAS_PIXELS,
): number {
  const wanted = targetWidth / cssWidth;
  const allowed = Math.sqrt(maxPixels / (cssWidth * cssHeight));
  return Math.max(1, Math.min(wanted, allowed));
}

/** WhatsApp, Instagram and Facebook open links in their own browser, where downloads often fail. */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger|Snapchat/i.test(userAgent);
}

/** "Riya K." -> "Akeena-bridesmaid-letter-Riya-K.png", safe on every file system. */
export function exportFilename(name: string): string {
  const safe = name
    .normalize('NFKC')
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `Akeena-bridesmaid-letter-${safe || 'Letter'}.png`;
}
