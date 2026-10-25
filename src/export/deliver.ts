import { isInAppBrowser } from './utils';

export type Delivery = 'shared' | 'downloaded' | 'cancelled' | 'modal';

/**
 * Hands the finished picture to her. Best first: the phone's share sheet (save to Photos, send
 * on), then a normal file download, then a picture she can long-press to save.
 */
export async function deliver(blob: Blob, filename: string): Promise<Delivery> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My bridesmaid letter' });
      return 'shared';
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') return 'cancelled';
      // Sharing needs a fresh tap; after a long render the browser may refuse. The picture
      // screen gives her a new button for that.
      if (name === 'NotAllowedError') return 'modal';
    }
  }

  const inApp = isInAppBrowser(navigator.userAgent);
  if (!inApp && 'download' in HTMLAnchorElement.prototype) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  }
  return 'modal';
}

export function canShareFile(blob: Blob, filename: string): boolean {
  const file = new File([blob], filename, { type: 'image/png' });
  return typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [file] });
}
