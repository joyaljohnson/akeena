/**
 * Wraps the finished letter picture in a one-page PDF (no library needed: a PDF can hold a JPEG
 * as it is). The page is as wide as a phone letter and as tall as the picture, so nothing is cut.
 */
const PAGE_WIDTH_PT = 450;

async function toJpeg(png: Blob, width: number, height: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.fillStyle = '#F2F8F4';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
  if (!jpeg) throw new Error('Could not compress the letter');
  return new Uint8Array(await jpeg.arrayBuffer());
}

/** Builds the PDF bytes around an already compressed JPEG. Exported for tests. */
export function buildPdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  const pageH = Math.round((PAGE_WIDTH_PT * height) / width);
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string, stream?: Uint8Array) => {
    offsets[n] = length;
    push(`${n} 0 obj\n${body}`);
    if (stream) {
      push('\nstream\n');
      push(stream);
      push('\nendstream');
    }
    push('\nendobj\n');
  };

  const content = `q ${PAGE_WIDTH_PT} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH_PT} ${pageH}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg,
  );
  object(5, `<< /Length ${content.length} >>`, enc.encode(content));

  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export async function pictureToPdf(png: Blob, width: number, height: number): Promise<Blob> {
  const jpeg = await toJpeg(png, width, height);
  return new Blob([buildPdf(jpeg, width, height) as BlobPart], { type: 'application/pdf' });
}
