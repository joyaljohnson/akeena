import { useState } from 'react';
import { deliver } from '../export/deliver';
import { exportFilename } from '../export/utils';
import { useAdmin } from './context';
import styles from './admin.module.css';
import type { BridesmaidRecord, TemplateRecord } from './types';
import { toLetterData } from './utils';

/** Downloads a signed letter as one picture, drawn from what she actually signed. */
export function AdminDownload({
  record,
  template,
}: {
  record: BridesmaidRecord;
  template: TemplateRecord;
}) {
  const { notify } = useAdmin();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const { data, signed } = toLetterData(record, template);
    if (!signed || busy) return;
    setBusy(true);
    try {
      const { captureLetter } = await import('../export/captureLetter');
      const { blob } = await captureLetter(data, signed);
      const result = await deliver(blob, exportFilename(signed.name));
      if (result === 'modal')
        notify('Your browser could not save the picture. Try a desktop browser.', 'error');
    } catch {
      notify("Couldn't prepare that letter. Please try again.", 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={styles.btn} onClick={() => void run()} disabled={busy}>
      {busy ? 'Preparing…' : 'Download'}
    </button>
  );
}
