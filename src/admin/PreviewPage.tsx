import { useCallback, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnvelopeGate } from '../envelope/EnvelopeGate';
import type { UnlockResult } from '../envelope/EnvelopeScene';
import { LetterContent } from '../letter/Letter';
import { PhoneStage } from '../letter/PhoneStage';
import { DEFAULT_FONT_ID, handwritingVars } from '../lib/handwriting';
import type { SignedInfo } from '../lib/letterTypes';
import type { SignOutcome } from '../lib/signing';
import styles from './admin.module.css';
import { useAdmin } from './context';
import { useAdminData } from './useAdminData';
import { toLetterData } from './utils';

/**
 * Shows a bridesmaid's letter exactly as she will see it, using the same components. Nothing is
 * read from or written to her record: signing is simulated here and never saved.
 */
export function PreviewPage() {
  const { id } = useParams();
  const { base } = useAdmin();
  const { state } = useAdminData();
  const [replay, setReplay] = useState(0);
  const [localSigned, setLocalSigned] = useState<SignedInfo | null>(null);

  const record = state.status === 'ready' ? state.list.find((b) => b.id === id) : undefined;
  const pin = record?.pin ?? '';

  // Rehearse the real PIN screen with her actual PIN, entirely in the browser.
  const unlock = async (typed: string): Promise<UnlockResult> =>
    typed === pin ? { status: 'ok' } : { status: 'wrong_pin', attemptsLeft: 4 };
  const onSign = useCallback(async (name: string): Promise<SignOutcome> => {
    await new Promise((r) => setTimeout(r, 500));
    const signed = { name, at: new Date().toISOString() };
    setLocalSigned(signed);
    return { status: 'ok', signed };
  }, []);

  if (state.status === 'loading')
    return (
      <p role="status" style={{ padding: 24 }}>
        Loading…
      </p>
    );
  if (state.status === 'error' || !record) {
    return (
      <div style={{ padding: 24 }}>
        <p>We couldn't load that letter.</p>
        <Link to={base}>Back to the list</Link>
      </div>
    );
  }

  const { data, signed: recordSigned } = toLetterData(record, state.template);
  const signed = recordSigned ?? localSigned;
  const letter = (
    <div style={{ height: '100%', ...(handwritingVars(data.fontId) as CSSProperties) }}>
      <LetterContent data={data} signed={signed} onSign={recordSigned ? undefined : onSign} />
    </div>
  );

  return (
    <div style={{ ['--stage-offset' as string]: '56px' }}>
      <div className={styles.previewBar}>
        <span>
          Preview: this is exactly what <strong>{record.name}</strong> will see.
          {recordSigned ? ' She has signed.' : ' Signing here is not saved.'}
        </span>
        <span className={styles.actions} style={{ flexShrink: 0 }}>
          <button className={styles.btn} onClick={() => setReplay((n) => n + 1)}>
            Replay envelope
          </button>
          <Link className={styles.btn} to={base}>
            Back
          </Link>
        </span>
      </div>
      <PhoneStage style={handwritingVars(replay ? DEFAULT_FONT_ID : data.fontId) as CSSProperties}>
        {replay > 0 ? (
          <EnvelopeGate key={replay} unlock={unlock} fontId={DEFAULT_FONT_ID}>
            {letter}
          </EnvelopeGate>
        ) : (
          letter
        )}
      </PhoneStage>
    </div>
  );
}
