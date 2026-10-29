import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { formatEventDate } from '../lib/format';
import { HANDWRITING_FONTS, getHandwritingFont, loadHandwritingFont } from '../lib/handwriting';
import { CHAPTER_THEMES, letterContentSchema, type LetterContent } from '../lib/letterTypes';
import styles from './admin.module.css';
import { useAdmin } from './context';
import type { TemplateRecord } from './types';
import { useAdminData } from './useAdminData';
import { getIn, issuesByPath, move, normalizeContent, setIn } from './utils';

type Path = ReadonlyArray<string | number>;

const THEME_LABELS: Record<(typeof CHAPTER_THEMES)[number], string> = {
  pearl: 'Pearl (shades of white)',
  jewel: 'Jewel (rich brights, no red)',
  gold: 'Gold (sunset glow)',
  'pastel-metallic': 'Pastel metallic (tissue silk)',
};
const ICONS = [
  ['', 'Automatic (from the theme)'],
  ['home', 'Home'],
  ['ring', 'Ring box'],
  ['sunset', 'Sunset / sun'],
  ['bible', 'Bible'],
] as const;

type FieldControl = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean };

/** A labelled field. The label names only the control; hint and error are linked, not part of it. */
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (control: FieldControl) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function Editor({ template }: { template: TemplateRecord }) {
  const { api, notify } = useAdmin();
  const [content, setContent] = useState<LetterContent>(template.content);
  const [defaultFont, setDefaultFont] = useState(template.defaultFont);
  const [whatsapp, setWhatsapp] = useState(template.whatsappTemplate);
  const [saved, setSaved] = useState({
    content: template.content,
    defaultFont: template.defaultFont,
    whatsapp: template.whatsappTemplate,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    HANDWRITING_FONTS.forEach((f) => void loadHandwritingFont(f.id));
  }, []);

  const parsed = useMemo(() => letterContentSchema.safeParse(normalizeContent(content)), [content]);
  const errors = useMemo(() => (parsed.success ? {} : issuesByPath(parsed.error.issues)), [parsed]);
  const whatsappError = !whatsapp.includes('{link}')
    ? 'The message needs {link} so she can open her letter.'
    : '';
  const hasErrors = !parsed.success || Boolean(whatsappError);
  const dirty =
    JSON.stringify([content, defaultFont, whatsapp]) !==
    JSON.stringify([saved.content, saved.defaultFont, saved.whatsapp]);

  const set = (path: Path, value: unknown) => setContent((c) => setIn(c, path, value));
  const err = (path: Path) => errors[path.join('.')];
  const val = (path: Path) => String(getIn(content, path) ?? '');

  const text = (
    label: string,
    path: Path,
    opts: { multiline?: boolean; hint?: string; type?: string } = {},
  ) => (
    <Field label={label} error={err(path)} hint={opts.hint}>
      {(c) =>
        opts.multiline ? (
          <textarea
            {...c}
            className={styles.textarea}
            value={val(path)}
            onChange={(e) => set(path, e.target.value)}
          />
        ) : (
          <input
            {...c}
            className={styles.input}
            type={opts.type ?? 'text'}
            value={val(path)}
            onChange={(e) => set(path, e.target.value)}
          />
        )
      }
    </Field>
  );

  const save = async () => {
    if (!parsed.success || whatsappError || saving) return;
    setSaving(true);
    try {
      const clean = parsed.data;
      await api.saveTemplate({ content: clean, defaultFont, whatsappTemplate: whatsapp });
      setContent(clean);
      setSaved({ content: clean, defaultFont, whatsapp });
      notify('Saved. Unsigned letters now show this version.');
    } catch {
      notify("Couldn't save. Check your connection and try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const items = content.duties.items;

  return (
    <>
      <h1 className={styles.pageTitle}>Shared letter</h1>
      <p className={styles.banner}>
        Changes apply to all letters that aren't signed yet. Signed letters keep the version she
        signed.
      </p>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Greeting</h2>
        {text('Your first name', ['bride', 'firstName'])}
        {text('Sign-off', ['bride', 'signOff'])}
        {text('Cover headline', ['cover', 'headlineTemplate'], {
          hint: 'Use {name} where her name goes.',
        })}
        <Field label="Default handwriting">
          {(c) => (
            <>
              <select
                {...c}
                className={styles.select}
                value={defaultFont}
                onChange={(e) => setDefaultFont(e.target.value)}
              >
                {HANDWRITING_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <span
                className={styles.fontSample}
                style={{ fontFamily: `'${getHandwritingFont(defaultFont).family}', cursive` }}
              >
                Riya, would you be my bridesmaid?
              </span>
            </>
          )}
        </Field>
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Duties</h2>
        {text('Title', ['duties', 'title'])}
        {items.map((_, i) => (
          <div key={i} className={styles.listRow}>
            <Field label={`Duty ${i + 1}`} error={err(['duties', 'items', i])}>
              {(c) => (
                <input
                  {...c}
                  className={styles.input}
                  value={items[i] ?? ''}
                  onChange={(e) => set(['duties', 'items', i], e.target.value)}
                />
              )}
            </Field>
            <span className={styles.miniActions} style={{ marginTop: '1.4rem' }}>
              <button
                type="button"
                className={styles.miniBtn}
                aria-label={`Move duty ${i + 1} up`}
                disabled={i === 0}
                onClick={() => set(['duties', 'items'], move(items, i, i - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.miniBtn}
                aria-label={`Move duty ${i + 1} down`}
                disabled={i === items.length - 1}
                onClick={() => set(['duties', 'items'], move(items, i, i + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={styles.miniBtn}
                aria-label={`Remove duty ${i + 1}`}
                onClick={() =>
                  set(
                    ['duties', 'items'],
                    items.filter((_, k) => k !== i),
                  )
                }
              >
                ✕
              </button>
            </span>
          </div>
        ))}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => set(['duties', 'items'], [...items, ''])}
          >
            Add a duty
          </button>
        </div>
      </section>

      {content.chapters.map((chapter, ci) => (
        <section key={chapter.id} className={`${styles.card} ${styles.section}`}>
          <details className={styles.details} open={ci === 0}>
            <summary>
              Chapter {chapter.number}: {chapter.title || 'Untitled'}
            </summary>
            <div className={styles.section} style={{ marginTop: '0.5rem' }}>
              {text('Title', ['chapters', ci, 'title'])}
              <div className={styles.twoCols}>
                <Field label="Colour theme">
                  {(c) => (
                    <select
                      {...c}
                      className={styles.select}
                      value={chapter.theme}
                      onChange={(e) => set(['chapters', ci, 'theme'], e.target.value)}
                    >
                      {CHAPTER_THEMES.map((t) => (
                        <option key={t} value={t}>
                          {THEME_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Icon">
                  {(c) => (
                    <select
                      {...c}
                      className={styles.select}
                      value={chapter.icon ?? ''}
                      onChange={(e) =>
                        set(
                          ['chapters', ci, 'icon'],
                          e.target.value === '' ? undefined : e.target.value,
                        )
                      }
                    >
                      {ICONS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              {chapter.events.map((ev, ei) => (
                <div key={ei} className={styles.subCard}>
                  <h3 className={styles.label} style={{ margin: 0 }}>
                    {chapter.events.length > 1 ? `Event ${ei + 1}` : 'Event'}
                  </h3>
                  <div className={styles.twoCols}>
                    {text('Label (optional)', ['chapters', ci, 'events', ei, 'label'], {
                      hint: 'For example Ceremony or Evening.',
                    })}
                    {text('Venue name', ['chapters', ci, 'events', ei, 'venueName'])}
                  </div>
                  <div className={styles.twoCols}>
                    <Field
                      label="Date"
                      error={err(['chapters', ci, 'events', ei, 'date'])}
                      hint={
                        /^\d{4}-\d{2}-\d{2}$/.test(ev.date) ? formatEventDate(ev.date) : undefined
                      }
                    >
                      {(c) => (
                        <input
                          {...c}
                          className={styles.input}
                          type="date"
                          value={ev.date}
                          onChange={(e) =>
                            set(['chapters', ci, 'events', ei, 'date'], e.target.value)
                          }
                        />
                      )}
                    </Field>
                    <Field
                      label="Time"
                      error={err(['chapters', ci, 'events', ei, 'time'])}
                      hint="Leave empty if it isn't decided yet."
                    >
                      {(c) => (
                        <input
                          {...c}
                          className={styles.input}
                          type="time"
                          value={ev.time ?? ''}
                          onChange={(e) =>
                            set(
                              ['chapters', ci, 'events', ei, 'time'],
                              e.target.value === '' ? null : e.target.value,
                            )
                          }
                        />
                      )}
                    </Field>
                  </div>
                  {text('Time note (optional)', ['chapters', ci, 'events', ei, 'timeNote'], {
                    hint: 'Shown with the time, or instead of it.',
                  })}
                  {text('Google Maps link', ['chapters', ci, 'events', ei, 'mapsUrl'], {
                    type: 'url',
                  })}
                  {chapter.events.length > 1 && (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() =>
                          set(
                            ['chapters', ci, 'events'],
                            chapter.events.filter((_, k) => k !== ei),
                          )
                        }
                      >
                        Remove this event
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {chapter.events.length < 2 && (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      set(
                        ['chapters', ci, 'events'],
                        [
                          ...chapter.events,
                          {
                            date: chapter.events[0]?.date ?? '',
                            time: null,
                            venueName: '',
                            mapsUrl: '',
                          },
                        ],
                      )
                    }
                  >
                    Add a second event
                  </button>
                </div>
              )}

              {text('Vibe', ['chapters', ci, 'vibe'], { multiline: true })}
              {text('The colour', ['chapters', ci, 'dressCode'], { multiline: true })}
              {text('Note under the colour (optional)', ['chapters', ci, 'dressCodeNote'], {
                hint: 'For example "I will send you pictures".',
              })}
            </div>
          </details>
        </section>
      ))}

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Cover film and music (optional)</h2>
        <p className={styles.hint}>
          A quiet looping film behind the cover, and music that starts when the envelope opens.
          Paste the web links of the files you uploaded. Leave all three empty for the plain cover.
        </p>
        {text('Film link (.mp4)', ['cover', 'background', 'videoUrl'], { type: 'url' })}
        {text('Still picture link (.jpg)', ['cover', 'background', 'posterUrl'], {
          type: 'url',
          hint: 'Shown first, and instead of the film when someone has motion turned off.',
        })}
        {text('Music link (optional)', ['cover', 'background', 'musicUrl'], { type: 'url' })}
        <Field label="Soft veil over the film">
          {(c) => (
            <select
              {...c}
              className={styles.select}
              value={content.cover.background?.veil === false ? 'off' : 'on'}
              onChange={(e) => set(['cover', 'background', 'veil'], e.target.value === 'on')}
            >
              <option value="on">On (easier to read)</option>
              <option value="off">Off (film at full strength)</option>
            </select>
          )}
        </Field>
        <Field label="Cover writing colour">
          {(c) => (
            <select
              {...c}
              className={styles.select}
              value={content.cover.background?.textColour ?? 'dark'}
              onChange={(e) => set(['cover', 'background', 'textColour'], e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="white">White</option>
            </select>
          )}
        </Field>
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Moodboard link (optional)</h2>
        <p className={styles.hint}>
          Shows as a small card after the chapters, for example a Pinterest board. Leave both boxes
          empty to hide it.
        </p>
        {text('Label', ['moodboard', 'label'], {
          hint: 'For example "Join my group board, Bridesmaids on Pinterest!"',
        })}
        {text('Link', ['moodboard', 'url'], { type: 'url' })}
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Ending</h2>
        {text('Closing quote', ['closingQuote'], { multiline: true })}
        {text('Question', ['acceptance', 'question'])}
        {text('Yes button', ['acceptance', 'yesLabel'])}
        {text('Oath', ['oath'], { multiline: true })}
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>WhatsApp message</h2>
        <Field
          label="Message template"
          error={whatsappError}
          hint="Use {name}, {link} and {pin}. Remove {pin} if you'd rather send the PIN separately."
        >
          {(c) => (
            <textarea
              {...c}
              className={styles.textarea}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              rows={5}
            />
          )}
        </Field>
      </section>

      <div className={styles.saveBar}>
        {hasErrors && <span className={styles.error}>Some fields need attention.</span>}
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => void save()}
          disabled={!dirty || hasErrors || saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </>
  );
}

export function LetterEditor() {
  const { state, reload } = useAdminData();
  if (state.status === 'loading') return <p role="status">Loading…</p>;
  if (state.status === 'error') {
    return (
      <div className={styles.card}>
        <p>We couldn't load the shared letter. Check your connection and try again.</p>
        <button className={styles.btn} onClick={reload}>
          Try again
        </button>
      </div>
    );
  }
  return <Editor template={state.template} />;
}
