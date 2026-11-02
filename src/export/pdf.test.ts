import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';

describe('buildPdf', () => {
  it('writes a valid single-page PDF around the picture', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const text = new TextDecoder('latin1').decode(buildPdf(jpeg, 1080, 2160));
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/MediaBox [0 0 450 900]');
    expect(text).toContain('/Filter /DCTDecode /Length 4');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
  });
});
