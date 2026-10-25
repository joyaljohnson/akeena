import { useMemo } from 'react';
import { AdminRoot } from './AdminRoot';
import styles from './admin.module.css';
import { createSupabaseApi } from './supabaseApi';

/** `#/admin`: the real admin area, talking to Supabase. Loaded only when someone opens it. */
export default function AdminApp() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const api = useMemo(() => (url && key ? createSupabaseApi(url, key) : null), [url, key]);

  if (!api) {
    return (
      <div className={styles.centerScreen}>
        <p>The app isn't connected to its database yet.</p>
      </div>
    );
  }
  return <AdminRoot api={api} base="/admin" />;
}
