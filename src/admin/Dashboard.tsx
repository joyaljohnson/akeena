import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHandwritingFont } from '../lib/handwriting';
import { AdminDownload } from './AdminDownload';
import styles from './admin.module.css';
import { useAdmin } from './context';
import type { BridesmaidRecord, TemplateRecord } from './types';
import { copyText, useAdminData } from './useAdminData';
import {
  bridesmaidStatus,
  buildInviteMessage,
  buildLink,
  formatShortDate,
  move,
  signedCount,
  whatsappUrl,
} from './utils';

function linkFor(b: BridesmaidRecord): string {
  return buildLink(b.token, window.location.origin, import.meta.env.BASE_URL);
}

function Status({ b }: { b: BridesmaidRecord }) {
  const kind = bridesmaidStatus(b);
  return (
    <span className={styles.chips}>
      {kind === 'signed' && b.signedAt && (
        <span className={`${styles.chip} ${styles.chipSigned}`}>
          ✅ Signed by {b.signedName} · {formatShortDate(b.signedAt)}
        </span>
      )}
      {kind === 'opened' && (
        <span className={`${styles.chip} ${styles.chipOpened}`}>
          Opened{b.firstOpenedAt ? ` · first opened ${formatShortDate(b.firstOpenedAt)}` : ''} ·{' '}
          {b.openCount} {b.openCount === 1 ? 'view' : 'views'}
        </span>
      )}
      {kind === 'unopened' && <span className={styles.chip}>Not opened</span>}
      {!b.isActive && <span className={`${styles.chip} ${styles.chipOff}`}>Deactivated</span>}
    </span>
  );
}

type RowProps = {
  b: BridesmaidRecord;
  index: number;
  count: number;
  template: TemplateRecord;
  onMove: (from: number, to: number) => void;
  onToggle: (b: BridesmaidRecord) => void;
  onDelete: (b: BridesmaidRecord) => void;
};

function Row({ b, index, count, template, onMove, onToggle, onDelete }: RowProps) {
  const { base, notify } = useAdmin();
  const signed = Boolean(b.signedAt);
  const font = b.font
    ? getHandwritingFont(b.font).label
    : `Default (${getHandwritingFont(template.defaultFont).label})`;

  const message = () =>
    buildInviteMessage(template.whatsappTemplate, { name: b.name, link: linkFor(b), pin: b.pin });
  const copy = async (text: string, what: string) => {
    const ok = await copyText(text);
    notify(ok ? `${what} copied` : "Couldn't copy. Try again.", ok ? 'ok' : 'error');
  };

  return (
    <li className={`${styles.card} ${styles.row} ${b.isActive ? '' : styles.cardMuted}`}>
      <div className={styles.rowHead}>
        <h2 className={styles.rowName}>{b.name}</h2>
        <p className={styles.rowMeta}>Font: {font}</p>
      </div>
      <Status b={b} />
      <div className={styles.actions} role="group" aria-label={`Actions for ${b.name}`}>
        <button className={styles.btn} onClick={() => void copy(message(), 'Message')}>
          Copy message
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => window.open(whatsappUrl(message()), '_blank', 'noopener,noreferrer')}
        >
          Send via WhatsApp
        </button>
        <button className={styles.btn} onClick={() => void copy(linkFor(b), 'Link')}>
          Copy link
        </button>
        <button className={styles.btn} onClick={() => void copy(b.pin, 'PIN')}>
          Copy PIN
        </button>
      </div>
      <div className={styles.actions}>
        <Link className={styles.btn} to={`${base}/preview/${b.id}`}>
          Preview
        </Link>
        {signed ? (
          <>
            <button className={styles.btn} disabled title="Signed letters can't be edited">
              Edit
            </button>
            <AdminDownload record={b} template={template} />
          </>
        ) : (
          <Link className={styles.btn} to={`${base}/edit/${b.id}`}>
            Edit
          </Link>
        )}
        <button className={styles.btn} onClick={() => onToggle(b)}>
          {b.isActive ? 'Deactivate' : 'Reactivate'}
        </button>
        <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(b)}>
          Delete
        </button>
        <span className={styles.miniActions}>
          <button
            className={styles.miniBtn}
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move ${b.name} up`}
          >
            ↑
          </button>
          <button
            className={styles.miniBtn}
            onClick={() => onMove(index, index + 1)}
            disabled={index === count - 1}
            aria-label={`Move ${b.name} down`}
          >
            ↓
          </button>
        </span>
      </div>
    </li>
  );
}

export function Dashboard() {
  const { api, base, notify, ask } = useAdmin();
  const { state, reload, setList } = useAdminData();
  const [busy, setBusy] = useState(false);

  if (state.status === 'loading') return <p role="status">Loading…</p>;
  if (state.status === 'error') {
    return (
      <div className={styles.card}>
        <p>We couldn't load the bridesmaids. Check your connection and try again.</p>
        <button className={styles.btn} onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  const { list, template } = state;
  const signed = signedCount(list);

  const onMove = async (from: number, to: number) => {
    if (busy) return;
    const next = move(list, from, to);
    setList(next);
    setBusy(true);
    try {
      await api.setOrder(next.map((b) => b.id));
    } catch {
      notify("Couldn't save the new order.", 'error');
      reload();
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (b: BridesmaidRecord) => {
    try {
      await api.setActive(b.id, !b.isActive);
      notify(b.isActive ? `${b.name}'s link is switched off` : `${b.name}'s link is back on`);
      reload();
    } catch {
      notify("Couldn't change that. Please try again.", 'error');
    }
  };

  const onDelete = async (b: BridesmaidRecord) => {
    const wasSigned = Boolean(b.signedAt);
    const ok = await ask({
      title: wasSigned ? `Delete ${b.name}'s signed letter?` : `Delete ${b.name}?`,
      body: wasSigned ? (
        <p>
          <strong>{b.name} has already signed.</strong> Deleting removes her signature and the
          signed copy for good. You can't undo this. If you only want to switch off her link, use
          Deactivate instead.
        </p>
      ) : (
        <p>This removes her link, PIN and note. You can't undo this.</p>
      ),
      confirmLabel: wasSigned ? 'Delete signed letter' : 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteBridesmaid(b.id);
      notify(`${b.name} deleted`);
      reload();
    } catch {
      notify("Couldn't delete that. Please try again.", 'error');
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>Bridesmaids</h1>
      <section className={`${styles.card} ${styles.progress}`} aria-label="Progress">
        <span className={styles.progressText}>
          {signed} of {list.length} signed
        </span>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-label="Letters signed"
          aria-valuemin={0}
          aria-valuemax={list.length}
          aria-valuenow={signed}
        >
          <div
            className={styles.progressFill}
            style={{ width: list.length ? `${(signed / list.length) * 100}%` : '0%' }}
          />
        </div>
      </section>

      <div className={styles.actions}>
        <Link className={`${styles.btn} ${styles.btnPrimary}`} to={`${base}/new`}>
          Add a bridesmaid
        </Link>
      </div>

      {list.length === 0 ? (
        <p className={styles.card}>
          No bridesmaids yet. Add the first one to create her private link and PIN.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
          {list.map((b, i) => (
            <Row
              key={b.id}
              b={b}
              index={i}
              count={list.length}
              template={template}
              onMove={(from, to) => void onMove(from, to)}
              onToggle={(x) => void onToggle(x)}
              onDelete={(x) => void onDelete(x)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
