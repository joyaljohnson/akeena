import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './context';
import type { BridesmaidRecord, TemplateRecord } from './types';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; list: BridesmaidRecord[]; template: TemplateRecord };

/** Loads the bridesmaids and the shared letter together, and lets a screen reload them. */
export function useAdminData() {
  const { api } = useAdmin();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listBridesmaids(), api.getTemplate()])
      .then(([list, template]) => {
        if (!cancelled) setState({ status: 'ready', list, template });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [api, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setList = useCallback(
    (list: BridesmaidRecord[]) => setState((s) => (s.status === 'ready' ? { ...s, list } : s)),
    [],
  );
  return { state, reload, setList };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure pages: fall back to selecting a hidden field.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
