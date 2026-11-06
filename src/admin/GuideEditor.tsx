import { useMemo, useState } from 'react';
import { GuidePage } from '../guide/GuidePage';
import { guideContentSchema, type GuideContent } from '../lib/guideTypes';
import styles from './admin.module.css';
import { useAdmin } from './context';
import { contentFromForm, formFromContent, type GuideForm } from './guideForm';
import { Field } from './LetterEditor';
import type { GuideRecord, TemplateRecord } from './types';
import { copyText } from './useAdminData';
import { generatePin, isValidPin } from './utils';
import { useGuideData } from './useGuideData';

function guideLink(token: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}#/g/${token}`;
}

type Saved = { form: GuideForm; pin: string; active: boolean };

function Editor({ template, record }: { template: TemplateRecord; record: GuideRecord | null }) {
  const { api, notify } = useAdmin();
  const chapters = template.content.chapters;
  const ids = useMemo(() => chapters.map((c) => c.id), [chapters]);

  const initial: Saved = {
    form: formFromContent(record?.content ?? null, ids),
    pin: record?.pin ?? generatePin(new Set()),
    active: record?.isActive ?? true,
  };
  const [form, setForm] = useState(initial.form);
  const [pin, setPin] = useState(initial.pin);
  const [active, setActive] = useState(initial.active);
  const [saved, setSaved] = useState<Saved>(initial);
  const [current, setCurrent] = useState<GuideRecord | null>(record);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const parsed = useMemo(
    () => guideContentSchema.safeParse(contentFromForm(form, ids)),
    [form, ids],
  );
  const issues = useMemo(() => {
    const out: Array<[string, string]> = [];
    if (!parsed.success)
      for (const i of parsed.error.issues) out.push([i.path.join('.'), i.message]);
    return out;
  }, [parsed]);
  const errorAt = (prefix: string) =>
    issues.find(([k]) => k === prefix || k.startsWith(`${prefix}.`))?.[1];
  const pinError = isValidPin(pin) ? '' : 'The PIN must be exactly 4 digits.';
  const hasErrors = !parsed.success || Boolean(pinError);
  const dirty =
    JSON.stringify([form, pin, active]) !== JSON.stringify([saved.form, saved.pin, saved.active]);

  const setTop = (key: Exclude<keyof GuideForm, 'chapters'>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setChapter = (id: string, key: keyof GuideForm['chapters'][string], value: string) =>
    setForm((f) => ({
      ...f,
      chapters: {
        ...f.chapters,
        [id]: { ...(f.chapters[id] as GuideForm['chapters'][string]), [key]: value },
      },
    }));

  const save = async () => {
    if (!parsed.success || pinError || saving) return;
    setSaving(true);
    try {
      const next = await api.saveGuide({ content: parsed.data, pin, isActive: active });
      setCurrent(next);
      setSaved({ form, pin, active });
      notify(
        record || current
          ? 'Saved. The groomsmen page now shows this.'
          : 'Saved. The page is ready.',
      );
    } catch {
      notify("Couldn't save. Check your connection and try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string, what: string) =>
    notify((await copyText(text)) ? `${what} copied` : `Couldn't copy the ${what.toLowerCase()}`);

  const previewContent: GuideContent | null = parsed.success ? parsed.data : null;

  return (
    <>
      <h1 className={styles.pageTitle}>Groomsmen page</h1>
      <p className={styles.banner}>
        One link and one PIN for all the groomsmen. Dates, times and venues come from the Shared
        letter, so they are only written once. Here you write the dress code and add the pictures.
      </p>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Link and PIN</h2>
        {current ? (
          <Field label="Link to send">
            {(c) => (
              <div className={styles.inputRow}>
                <input {...c} className={styles.input} readOnly value={guideLink(current.token)} />
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => void copy(guideLink(current.token), 'Link')}
                >
                  Copy link
                </button>
              </div>
            )}
          </Field>
        ) : (
          <p className={styles.hint}>
            The page isn't set up yet. Save once and its link appears here.
          </p>
        )}
        <Field label="PIN" error={pinError} hint="Four digits, the same for everyone.">
          {(c) => (
            <div className={styles.inputRow}>
              <input
                {...c}
                className={styles.input}
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="button"
                className={styles.btn}
                onClick={() => setPin(generatePin(new Set([pin])))}
              >
                New PIN
              </button>
              <button type="button" className={styles.btn} onClick={() => void copy(pin, 'PIN')}>
                Copy PIN
              </button>
            </div>
          )}
        </Field>
        <Field label="Page is" hint="Off shows everyone 'This page isn't available'.">
          {(c) => (
            <select
              {...c}
              className={styles.select}
              value={active ? 'on' : 'off'}
              onChange={(e) => setActive(e.target.value === 'on')}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          )}
        </Field>
        {current && (
          <p className={styles.hint}>
            Opened {current.openCount} {current.openCount === 1 ? 'time' : 'times'}
            {current.lastOpenedAt
              ? `, last on ${new Date(current.lastOpenedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              : ''}
            .
          </p>
        )}
      </section>

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Top and bottom of the page</h2>
        <Field label="Heading" error={errorAt('heading')}>
          {(c) => (
            <input
              {...c}
              className={styles.input}
              value={form.heading}
              onChange={(e) => setTop('heading', e.target.value)}
            />
          )}
        </Field>
        <Field label="Intro" hint="A line or two under the heading.">
          {(c) => (
            <textarea
              {...c}
              className={styles.textarea}
              value={form.intro}
              onChange={(e) => setTop('intro', e.target.value)}
            />
          )}
        </Field>
        <Field label="Closing line (optional)" hint="Written in handwriting at the very end.">
          {(c) => (
            <input
              {...c}
              className={styles.input}
              value={form.closing}
              onChange={(e) => setTop('closing', e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Moodboard label (optional)"
          error={errorAt('moodboard.label')}
          hint='For example "Join my group board, Grooms men on Pinterest!"'
        >
          {(c) => (
            <input
              {...c}
              className={styles.input}
              value={form.moodLabel}
              onChange={(e) => setTop('moodLabel', e.target.value)}
            />
          )}
        </Field>
        <Field label="Moodboard link" error={errorAt('moodboard.url')}>
          {(c) => (
            <input
              {...c}
              className={styles.input}
              type="url"
              value={form.moodUrl}
              onChange={(e) => setTop('moodUrl', e.target.value)}
            />
          )}
        </Field>
      </section>

      {chapters.map((chapter) => {
        const c = form.chapters[chapter.id] ?? {
          dressCode: '',
          details: '',
          swatches: '',
          looks: '',
        };
        const at = `chapters.${chapter.id}`;
        return (
          <section key={chapter.id} className={`${styles.card} ${styles.section}`}>
            <h2 className={styles.sectionTitle}>
              Chapter {chapter.number}: {chapter.title}
            </h2>
            <Field
              label="Dress code"
              error={errorAt(`${at}.dressCode`)}
              hint='A short headline, for example "Cream and white". Leave the whole chapter empty to hide its dress code.'
            >
              {(f) => (
                <input
                  {...f}
                  className={styles.input}
                  value={c.dressCode}
                  onChange={(e) => setChapter(chapter.id, 'dressCode', e.target.value)}
                />
              )}
            </Field>
            <Field label="About the outfit (optional)">
              {(f) => (
                <textarea
                  {...f}
                  className={styles.textarea}
                  value={c.details}
                  onChange={(e) => setChapter(chapter.id, 'details', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Colours (optional)"
              error={errorAt(`${at}.swatches`)}
              hint="One per line, like: Cream #F5EBD7"
            >
              {(f) => (
                <textarea
                  {...f}
                  className={styles.textarea}
                  rows={4}
                  value={c.swatches}
                  onChange={(e) => setChapter(chapter.id, 'swatches', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Picture links (optional)"
              error={
                errorAt(`${at}.looks`) && 'Each line needs a full link, starting with https://'
              }
              hint="One link per line, in the order shown. Upload the pictures to Storage (letter-media, folder groomsmen) and paste each public link."
            >
              {(f) => (
                <textarea
                  {...f}
                  className={styles.textarea}
                  rows={5}
                  value={c.looks}
                  onChange={(e) => setChapter(chapter.id, 'looks', e.target.value)}
                />
              )}
            </Field>
          </section>
        );
      })}

      <section className={`${styles.card} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Preview</h2>
        <button
          type="button"
          className={styles.btn}
          onClick={() => setShowPreview((s) => !s)}
          aria-expanded={showPreview}
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
        {showPreview &&
          (previewContent ? (
            <div
              style={{
                height: 640,
                maxWidth: 390,
                margin: '0 auto',
                border: '1px solid var(--line, #ccc)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
              data-palette="river"
            >
              <GuidePage
                payload={{ font: template.defaultFont, chapters, content: previewContent }}
              />
            </div>
          ) : (
            <p className={styles.hint}>Fix the highlighted fields to see the preview.</p>
          ))}
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

export function GuideEditor() {
  const { state, reload } = useGuideData();
  if (state.status === 'loading') return <p role="status">Loading…</p>;
  if (state.status === 'error') {
    return (
      <div className={styles.card}>
        <p>We couldn't load the groomsmen page. Check your connection and try again.</p>
        <button className={styles.btn} onClick={reload}>
          Try again
        </button>
      </div>
    );
  }
  return <Editor template={state.template} record={state.record} />;
}
