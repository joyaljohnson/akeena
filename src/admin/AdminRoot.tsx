import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { AdminContext, type ConfirmOptions } from './context';
import styles from './admin.module.css';
import { BridesmaidFormPage } from './BridesmaidFormPage';
import { Dashboard } from './Dashboard';
import { LetterEditor } from './LetterEditor';
import { PreviewPage } from './PreviewPage';
import type { AdminApi } from './types';

type Gate = 'loading' | 'signedOut' | 'noAccess' | 'ready' | 'error';

type Toast = { id: number; message: string; tone: 'ok' | 'error' };
type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

function Centered({ children }: { children: ReactNode }) {
  return <div className={styles.centerScreen}>{children}</div>;
}

function LoginScreen({ api }: { api: AdminApi }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem('');
    const result = await api.signIn(email, password);
    setBusy(false);
    if (result === 'invalid') setProblem("That email or password isn't right.");
    if (result === 'error')
      setProblem("We couldn't reach the server. Check your connection and try again.");
  };

  return (
    <Centered>
      <form className={`${styles.card} ${styles.loginCard}`} onSubmit={(e) => void submit(e)}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>
          Bridesmaid letters
        </h1>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Password</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <p className={styles.error} role="alert">
          {problem}
        </p>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Centered>
  );
}

type AdminRootProps = { api: AdminApi; base: string };

/** Sign-in gate, page shell, notifications and confirm dialogs for every admin screen. */
export function AdminRoot({ api, base }: AdminRootProps) {
  const [gate, setGate] = useState<Gate>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const toastId = useRef(0);

  const evaluate = useCallback(
    async (sessionEmail: string | null) => {
      setEmail(sessionEmail);
      if (!sessionEmail) return setGate('signedOut');
      try {
        setGate((await api.isAdmin()) ? 'ready' : 'noAccess');
      } catch {
        setGate('error');
      }
    },
    [api],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .getSessionEmail()
      .then((e) => {
        if (!cancelled) void evaluate(e);
      })
      .catch(() => {
        if (!cancelled) setGate('error');
      });
    const off = api.onAuthChange((e) => void evaluate(e));
    return () => {
      cancelled = true;
      off();
    };
  }, [api, evaluate]);

  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const ask = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const ctx = useMemo(() => ({ api, base, notify, ask }), [api, base, notify, ask]);

  if (gate === 'loading') {
    return (
      <Centered>
        <p role="status">Loading…</p>
      </Centered>
    );
  }
  if (gate === 'signedOut') return <LoginScreen api={api} />;
  if (gate === 'error') {
    return (
      <Centered>
        <p>We couldn't check your access. Check your connection and try again.</p>
        <button className={styles.btn} onClick={() => window.location.reload()}>
          Try again
        </button>
      </Centered>
    );
  }
  if (gate === 'noAccess') {
    return (
      <Centered>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>
          No access
        </h1>
        <p>{email} isn't on the list of people who can manage these letters.</p>
        <button className={styles.btn} onClick={() => void api.signOut()}>
          Sign out
        </button>
      </Centered>
    );
  }

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <AdminContext.Provider value={ctx}>
      <div className={styles.shell}>
        <Routes>
          {/* The preview is full-screen like the real letter, so it has no header. */}
          <Route path="preview/:id" element={<PreviewPage />} />
          <Route
            path="*"
            element={
              <>
                <header className={styles.header}>
                  <span className={styles.brand}>Bridesmaid letters</span>
                  <nav className={styles.nav} aria-label="Admin">
                    <NavLink
                      to={base}
                      end
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                    >
                      Bridesmaids
                    </NavLink>
                    <NavLink
                      to={`${base}/letter`}
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                    >
                      Shared letter
                    </NavLink>
                    <button
                      className={styles.btnGhost + ' ' + styles.btn}
                      onClick={() => void api.signOut()}
                    >
                      Sign out
                    </button>
                  </nav>
                </header>
                <main className={styles.main}>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="new" element={<BridesmaidFormPage />} />
                    <Route path="edit/:id" element={<BridesmaidFormPage />} />
                    <Route path="letter" element={<LetterEditor />} />
                  </Routes>
                </main>
              </>
            }
          />
        </Routes>

        <div className={styles.toasts} aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${styles.toast} ${t.tone === 'error' ? styles.toastError : ''}`}
            >
              {t.message}
            </div>
          ))}
        </div>

        {pending && (
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={pending.title}
          >
            <div className={styles.dialog}>
              <h2>{pending.title}</h2>
              <div>{pending.body}</div>
              <div className={styles.dialogActions}>
                <button className={styles.btn} onClick={() => close(false)} autoFocus>
                  Cancel
                </button>
                <button
                  className={`${styles.btn} ${pending.danger ? styles.btnDanger : styles.btnPrimary}`}
                  onClick={() => close(true)}
                >
                  {pending.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminContext.Provider>
  );
}
