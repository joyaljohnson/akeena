import { createContext, useContext, type ReactNode } from 'react';
import type { AdminApi } from './types';

export type ConfirmOptions = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
};

type AdminContextValue = {
  api: AdminApi;
  /** "/admin" in the real app, "/dev/admin" in the design preview. */
  base: string;
  notify: (message: string, tone?: 'ok' | 'error') => void;
  ask: (options: ConfirmOptions) => Promise<boolean>;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminRoot');
  return ctx;
}
