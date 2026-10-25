import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoverPage } from '../letter/pages/CoverPage';
import {
  HANDWRITING_FONTS,
  getHandwritingFont,
  handwritingVars,
  loadHandwritingFont,
} from '../lib/handwriting';
import styles from './admin.module.css';
import { useAdmin } from './context';
import type { BridesmaidRecord, TemplateRecord } from './types';
import { useAdminData } from './useAdminData';
import { generatePin, isValidPin } from './utils';

const NOTE_LIMIT = 600;

const SAVE_PROBLEMS: Record<string, string> = {
  duplicate_pin: 'Another bridesmaid already has that PIN. Pick a different one.',
  invalid: "That didn't pass the checks. Look over the name, note and PIN.",
  signed: "This letter has been signed, so it can't be edited any more.",
  error: "We couldn't save that. Check your connection and try again.",
};

/** The cover page at phone size, scaled to fit, so changes can be seen as they are typed. */
function CoverPreview(props: {
  name: string;
  note: string;
  fontId: string;
  headline: string;
  signOff: string;
  bride: string;
}) {
  const data = {
    name: props.name.trim() || 'Name',
    personalNote: props.note || 'Your note will appear here.',
    fontId: props.fontId,
    content: {
      bride: { firstName: props.bride, signOff: props.signOff },
      cover: { headlineTemplate: props.headline },
      duties: { title: '', items: [] },
      chapters: [],
      closingQuote: '',
      acceptance: { question: '', yesLabel: '' },
      oath: '',
    },
  };
  const scale = 0.92;
  return (
    <div
      className={styles.phoneFrame}
      style={{ height: 540 * scale }}
      aria-label="Preview of the cover"
    >
      <div
        className={styles.phoneInner}
        style={{
          ...(handwritingVars(props.fontId) as CSSProperties),
          transform: `scale(${scale})`,
        }}
      >
        <CoverPage data={data} />
      </div>
    </div>
  );
}

export function BridesmaidFormPage() {
  const { id } = useParams();
  const { state } = useAdminData();
  if (state.status === 'loading') return <p role="status">Loading…</p>;
  if (state.status === 'error')
    return <p className={styles.card}>We couldn't load this page. Go back and try again.</p>;
  const existing = id ? (state.list.find((b) => b.id === id) ?? null) : null;
  if (id && !existing) return <p className={styles.card}>That bridesmaid wasn't found.</p>;
  if (existing?.signedAt) {
    return (
      <div className={styles.card}>
        <p>{existing.name} has signed, so her letter can't be edited any more.</p>
      </div>
    );
  }
  return (
    <BridesmaidForm
      key={existing?.id ?? 'new'}
      existing={existing}
      list={state.list}
      template={state.template}
    />
  );
}

type FormProps = {
  existing: BridesmaidRecord | null;
  list: BridesmaidRecord[];
  template: TemplateRecord;
};

function BridesmaidForm({ existing, list, template }: FormProps) {
  const id = existing?.id;
  const editing = existing !== null;
  const { api, base, notify } = useAdmin();
  const navigate = useNavigate();

  const [name, setName] = useState(existing?.name ?? '');
  const [note, setNote] = useState(existing?.personalNote ?? '');
  const [pin, setPin] = useState(existing?.pin ?? '');
  const [font, setFont] = useState<string | null>(existing?.font ?? null);
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    HANDWRITING_FONTS.forEach((f) => void loadHandwritingFont(f.id));
  }, []);

  const taken = new Set(list.filter((b) => b.id !== id).map((b) => b.pin));
  const errors = {
    name:
      name.trim() === ''
        ? 'Please enter a name.'
        : name.trim().length > 80
          ? 'That name is too long.'
          : '',
    note: note.length > NOTE_LIMIT ? `Please keep the note to ${NOTE_LIMIT} characters.` : '',
    pin: !isValidPin(pin)
      ? 'The PIN must be exactly 4 digits.'
      : taken.has(pin)
        ? 'Another bridesmaid already has that PIN.'
        : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : '');
  const effectiveFont = font ?? template.defaultFont;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || saving) return;
    setSaving(true);
    setProblem('');
    const input = { name: name.trim(), personalNote: note, font, pin };
    const result =
      editing && id ? await api.updateBridesmaid(id, input) : await api.createBridesmaid(input);
    setSaving(false);
    if (result.ok) {
      notify(editing ? 'Saved' : `${input.name} added`);
      navigate(base);
    } else {
      setProblem(SAVE_PROBLEMS[result.reason] ?? SAVE_PROBLEMS.error!);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>
        {editing ? `Edit ${existing?.name ?? ''}` : 'Add a bridesmaid'}
      </h1>
      <div className={styles.split}>
        <form
          className={`${styles.card} ${styles.form}`}
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="bm-name" className={styles.label}>
              Name
            </label>
            <input
              id="bm-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              aria-invalid={Boolean(show('name'))}
              aria-describedby="bm-name-err"
              autoComplete="off"
            />
            <p id="bm-name-err" className={styles.error}>
              {show('name')}
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="bm-note" className={styles.label}>
              Personal note
            </label>
            <textarea
              id="bm-note"
              className={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-invalid={Boolean(show('note'))}
              aria-describedby="bm-note-count bm-note-err"
              rows={6}
            />
            <span
              id="bm-note-count"
              className={styles.counter}
              style={note.length > NOTE_LIMIT ? { color: '#8f2f2a' } : undefined}
            >
              {note.length} / {NOTE_LIMIT}
            </span>
            <p id="bm-note-err" className={styles.error}>
              {show('note')}
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="pin" className={styles.label}>
              PIN
            </label>
            <div className={styles.pinRow}>
              <input
                id="pin"
                className={styles.input}
                value={pin}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                aria-invalid={Boolean(show('pin'))}
                aria-describedby="bm-pin-hint bm-pin-err"
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.btn}
                onClick={() => setPin(generatePin(taken))}
              >
                Generate
              </button>
            </div>
            <p className={styles.hint}>
              She types this to open her letter. Each bridesmaid needs a different one.
            </p>
            <p id="bm-pin-err" className={styles.error}>
              {show('pin')}
            </p>
          </div>

          <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className={styles.label}>Handwriting</legend>
            <div className={styles.fontList}>
              {[null, ...HANDWRITING_FONTS.map((f) => f.id)].map((fid) => {
                const f = getHandwritingFont(fid ?? template.defaultFont);
                const on = font === fid;
                return (
                  <label
                    key={fid ?? 'default'}
                    className={`${styles.fontOption} ${on ? styles.fontOptionOn : ''}`}
                  >
                    <input type="radio" name="font" checked={on} onChange={() => setFont(fid)} />
                    <span
                      className={styles.fontSample}
                      style={{ fontFamily: `'${f.family}', cursive` }}
                    >
                      {fid === null ? `Default · ${f.label}` : f.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className={styles.error} role="alert">
            {problem}
          </p>
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add bridesmaid'}
            </button>
            <button type="button" className={styles.btn} onClick={() => navigate(base)}>
              Cancel
            </button>
          </div>
        </form>

        <aside className={styles.previewCol}>
          <p className={styles.label} style={{ marginBottom: '0.5rem' }}>
            Cover preview
          </p>
          <CoverPreview
            name={name}
            note={note}
            fontId={effectiveFont}
            headline={template.content.cover.headlineTemplate}
            signOff={template.content.bride.signOff}
            bride={template.content.bride.firstName}
          />
        </aside>
      </div>
    </>
  );
}
