import { describe, expect, it } from 'vitest';
import { computePixelRatio, exportFilename, isInAppBrowser, MAX_CANVAS_PIXELS } from './utils';

describe('computePixelRatio', () => {
  it('aims for 1080px across when the letter is short', () => {
    expect(computePixelRatio(390, 2000)).toBeCloseTo(1080 / 390, 5);
  });

  it('backs off so the canvas stays within the pixel budget', () => {
    const w = 390;
    const h = 20000;
    const ratio = computePixelRatio(w, h);
    expect(ratio).toBeLessThan(1080 / 390);
    expect(w * ratio * (h * ratio)).toBeLessThanOrEqual(MAX_CANVAS_PIXELS + 1);
  });

  it('never goes below 1', () => {
    expect(computePixelRatio(390, 1_000_000)).toBe(1);
  });
});

describe('isInAppBrowser', () => {
  it.each([
    ['Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 Instagram 300.0', true],
    ['Mozilla/5.0 (Linux; Android 13) WhatsApp/2.23', true],
    ['Mozilla/5.0 (Linux; Android 13) [FB_IAB/FB4A;FBAV/400.0]', true],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Version/17.0 Mobile Safari/604.1',
      false,
    ],
    ['Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Mobile Safari/537.36', false],
  ])('%s', (ua, expected) => {
    expect(isInAppBrowser(ua)).toBe(expected);
  });
});

describe('exportFilename', () => {
  it('builds the expected name', () => {
    expect(exportFilename('Riya')).toBe('Akeena-bridesmaid-letter-Riya.png');
    expect(exportFilename('Riya K.')).toBe('Akeena-bridesmaid-letter-Riya-K.png');
  });

  it('strips unsafe characters and keeps non-Latin letters', () => {
    expect(exportFilename('a/b\\c:*?"<>|d')).toBe('Akeena-bridesmaid-letter-abcd.png');
    expect(exportFilename('രിയ')).toContain('രിയ');
  });

  it('falls back when nothing is left', () => {
    expect(exportFilename('💖💖')).toBe('Akeena-bridesmaid-letter-Letter.png');
    expect(exportFilename('   ')).toBe('Akeena-bridesmaid-letter-Letter.png');
  });

  it('keeps very long names short', () => {
    expect(exportFilename('x'.repeat(200)).length).toBeLessThan(80);
  });
});
