import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { getHandwritingFont, loadHandwritingFont } from '../lib/handwriting';
import type { LetterData, SignedInfo } from '../lib/letterTypes';
import { EXPORT_CSS_WIDTH, ExportLetter } from './ExportLetter';
import { computePixelRatio } from './utils';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Waits until every font and picture the export needs has really loaded. */
async function settle(host: HTMLElement, fontId: string): Promise<void> {
  await loadHandwritingFont(fontId);
  const family = getHandwritingFont(fontId).family;
  await Promise.all(
    [
      `400 1em '${family}'`,
      `400 1em 'Cormorant Garamond'`,
      `italic 400 1em 'Cormorant Garamond'`,
      `600 1em 'Cormorant Garamond'`,
      `400 1em 'Cinzel'`,
    ].map((f) => document.fonts.load(f).catch(() => [])),
  );
  await document.fonts.ready;

  // A <picture> wrapper makes the renderer keep the WebP <source> instead of its inlined copy,
  // so the export uses the plain <img> (JPEG) inside it.
  host.querySelectorAll('picture').forEach((p) => {
    const img = p.querySelector('img');
    if (img) p.replaceWith(img);
  });

  const images = [...host.querySelectorAll('img')];
  images.forEach((img) => {
    img.loading = 'eager';
  });
  await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
  await nextFrame();
  await nextFrame();
}

/**
 * Draws the signed letter as one PNG. The letter is rendered off-screen, so nothing flickers on
 * the page. Returns the PNG and its size in pixels.
 */
export async function captureLetter(
  data: LetterData,
  signed: SignedInfo,
): Promise<{ blob: Blob; width: number; height: number }> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${EXPORT_CSS_WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(<ExportLetter data={data} signed={signed} />));
    await settle(host, data.fontId);

    const node = host.querySelector<HTMLElement>('[data-export-root]');
    if (!node) throw new Error('Export layout missing');
    const width = EXPORT_CSS_WIDTH;
    const height = Math.ceil(node.getBoundingClientRect().height);
    const pixelRatio = computePixelRatio(width, height);

    const { toBlob } = await import('html-to-image');
    const options = { pixelRatio, width, height, backgroundColor: '#F2F8F4', cacheBust: false };
    // Safari draws images and fonts only on the second pass, so the first render is a warm-up.
    await toBlob(node, options);
    const blob = await toBlob(node, options);
    if (!blob) throw new Error('Could not draw the letter');
    return { blob, width: Math.round(width * pixelRatio), height: Math.round(height * pixelRatio) };
  } finally {
    root.unmount();
    host.remove();
  }
}
