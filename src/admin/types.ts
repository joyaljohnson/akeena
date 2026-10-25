import type { LetterContent } from '../lib/letterTypes';

export type BridesmaidRecord = {
  id: string;
  token: string;
  name: string;
  personalNote: string;
  /** null means "use the shared letter's default font". */
  font: string | null;
  pin: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
  signedAt: string | null;
  signedName: string | null;
  /** Exactly what she saw when she signed: { name, personalNote, font, content }. */
  signedSnapshot: unknown | null;
};

export type TemplateRecord = {
  content: LetterContent;
  defaultFont: string;
  whatsappTemplate: string;
};

export type BridesmaidInput = {
  name: string;
  personalNote: string;
  font: string | null;
  pin: string;
};

export type SaveResult =
  | { ok: true; record: BridesmaidRecord }
  | { ok: false; reason: 'duplicate_pin' | 'invalid' | 'signed' | 'error' };

export type SignInResult = 'ok' | 'invalid' | 'error';

/** Everything the admin screens need. One implementation talks to Supabase, one is in memory. */
export interface AdminApi {
  getSessionEmail(): Promise<string | null>;
  onAuthChange(callback: (email: string | null) => void): () => void;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  isAdmin(): Promise<boolean>;
  listBridesmaids(): Promise<BridesmaidRecord[]>;
  getTemplate(): Promise<TemplateRecord>;
  saveTemplate(template: TemplateRecord): Promise<void>;
  createBridesmaid(input: BridesmaidInput): Promise<SaveResult>;
  updateBridesmaid(id: string, input: BridesmaidInput): Promise<SaveResult>;
  setActive(id: string, active: boolean): Promise<void>;
  /** Saves the order the list is now in. */
  setOrder(idsInOrder: string[]): Promise<void>;
  deleteBridesmaid(id: string): Promise<void>;
}
