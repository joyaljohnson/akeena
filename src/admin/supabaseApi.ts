import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { letterContentSchema } from '../lib/letterTypes';
import type {
  AdminApi,
  BridesmaidInput,
  BridesmaidRecord,
  SaveResult,
  SignInResult,
  TemplateRecord,
} from './types';

type Row = {
  id: string;
  token: string;
  name: string;
  personal_note: string;
  font: string | null;
  pin: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  first_opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  signed_at: string | null;
  signed_name: string | null;
  signed_snapshot: unknown | null;
};

const toRecord = (r: Row): BridesmaidRecord => ({
  id: r.id,
  token: r.token,
  name: r.name,
  personalNote: r.personal_note,
  font: r.font,
  pin: r.pin,
  isActive: r.is_active,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  firstOpenedAt: r.first_opened_at,
  lastOpenedAt: r.last_opened_at,
  openCount: r.open_count,
  signedAt: r.signed_at,
  signedName: r.signed_name,
  signedSnapshot: r.signed_snapshot,
});

/** Postgres error codes we turn into friendly outcomes. */
function failure(error: { code?: string; message?: string }): SaveResult {
  if (error.code === '23505') return { ok: false, reason: 'duplicate_pin' };
  if (error.code === '23514') {
    return { ok: false, reason: /signed/i.test(error.message ?? '') ? 'signed' : 'invalid' };
  }
  return { ok: false, reason: 'error' };
}

let cached: { key: string; api: AdminApi } | null = null;

/** One Supabase client per page: a second one would fight over the saved sign-in. */
export function createSupabaseApi(url: string, anonKey: string): AdminApi {
  const key = `${url}|${anonKey}`;
  if (cached?.key !== key) cached = { key, api: buildApi(url, anonKey) };
  return cached.api;
}

function buildApi(url: string, anonKey: string): AdminApi {
  const supabase: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  return {
    async getSessionEmail() {
      const { data } = await supabase.auth.getSession();
      return data.session?.user.email ?? null;
    },

    onAuthChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user.email ?? null);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password): Promise<SignInResult> {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return 'ok';
      return error.status === 400 || error.status === 422 ? 'invalid' : 'error';
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async isAdmin() {
      const { data, error } = await supabase.from('admins').select('user_id').maybeSingle();
      if (error) throw new Error(error.message);
      return data !== null;
    },

    async listBridesmaids() {
      const { data, error } = await supabase
        .from('bridesmaids')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Row[]).map(toRecord);
    },

    async getTemplate(): Promise<TemplateRecord> {
      const { data, error } = await supabase
        .from('letter_template')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) throw new Error(error.message);
      const content = letterContentSchema.safeParse(data.content);
      if (!content.success)
        throw new Error('The shared letter in the database is not in the expected shape');
      return {
        content: content.data,
        defaultFont: data.default_font as string,
        whatsappTemplate: data.whatsapp_message_template as string,
      };
    },

    async saveTemplate(t) {
      const { data, error } = await supabase
        .from('letter_template')
        .update({
          content: t.content,
          default_font: t.defaultFont,
          whatsapp_message_template: t.whatsappTemplate,
        })
        .eq('id', 1)
        .select('id');
      if (error) throw new Error(error.message);
      // Row Level Security hides a refused update as "0 rows", so check it really happened.
      if (!data || data.length !== 1) throw new Error('The change was not saved');
    },

    async createBridesmaid(input: BridesmaidInput): Promise<SaveResult> {
      const { data: last } = await supabase
        .from('bridesmaids')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data, error } = await supabase
        .from('bridesmaids')
        .insert({
          name: input.name,
          personal_note: input.personalNote,
          font: input.font,
          pin: input.pin,
          sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1,
        })
        .select('*')
        .single();
      if (error) return failure(error);
      return { ok: true, record: toRecord(data as Row) };
    },

    async updateBridesmaid(id, input): Promise<SaveResult> {
      const { data, error } = await supabase
        .from('bridesmaids')
        .update({
          name: input.name,
          personal_note: input.personalNote,
          font: input.font,
          pin: input.pin,
        })
        .eq('id', id)
        .select('*');
      if (error) return failure(error);
      const row = (data as Row[] | null)?.[0];
      return row ? { ok: true, record: toRecord(row) } : { ok: false, reason: 'error' };
    },

    async setActive(id, active) {
      const { error } = await supabase
        .from('bridesmaids')
        .update({ is_active: active })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },

    async setOrder(ids) {
      const results = await Promise.all(
        ids.map((id, index) =>
          supabase
            .from('bridesmaids')
            .update({ sort_order: index + 1 })
            .eq('id', id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    },

    async deleteBridesmaid(id) {
      const { data, error } = await supabase.from('bridesmaids').delete().eq('id', id).select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length !== 1) throw new Error('Nothing was deleted');
    },
  };
}
