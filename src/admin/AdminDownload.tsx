import { useState } from 'react';
import { deliver } from '../export/deliver';
import { exportFilename } from '../export/utils';
import { useAdmin } from './context';
import styles from './admin.module.css';
import type { BridesmaidRecord, TemplateRecord } from './types';
import { toLetterData } from './utils';

/** Downloads a signed letter as a picture or a PDF, drawn from what she actually signed. */
export function AdminDownload({
  record,
  template,
}: {
  record: BridesmaidRecord;
  template: TemplateRecord;
}) {
  const { notify } = useAdmin();
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);

  const run = async (kind: 'png' | 'pdf') => {
    const { data, signed } = toLetterData(record, template);
    if (!signed || busy) return;
    setBusy(kind);
    try {
      const { captureLetter } = await import('../export/captureLetter');
      const picture = await captureLetter(data, signed);
      let blob = picture.blob;
      if (kind === 'pdf') {
        const { pictureToPdf } = await import('../export/pdf');
        blob = await pictureToPdf(blob, picture.width, picture.height);
      }
      const result = await deliver(blob, exportFilename(signed.name, kind));
      if (result === 'modal')
        notify('Your browser could not save the picture. Try a desktop browser.', 'error');
    } catch {
      notify("Couldn't prepare that letter. Please try again.", 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button className={styles.btn} onClick={() => void run('png')} disabled={busy !== null}>
        {busy === 'png' ? 'Preparing…' : 'Download'}
      </button>
      <button className={styles.btn} onClick={() => void run('pdf')} disabled={busy !== null}>
        {busy === 'pdf' ? 'Preparing…' : 'PDF'}
      </button>
    </>
  );
}
