import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './context';
import type { GuideRecord, TemplateRecord } from './types';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; record: GuideRecord | null; template: TemplateRecord };

/** Loads the groomsmen page and the shared letter (its chapters) together. */
export function useGuideData() {
  const { api } = useAdmin();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getGuide(), api.getTemplate()])
      .then(([record, template]) => {
        if (!cancelled) setState({ status: 'ready', record, template });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [api, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { state, reload };
}
