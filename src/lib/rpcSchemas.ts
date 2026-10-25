import { z } from 'zod';
import { letterContentSchema } from './letterTypes';

/** Everything the three public functions can return, validated before the app trusts it. */

export const checkLinkSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok') }),
  z.object({ status: z.literal('unavailable') }),
  z.object({ status: z.literal('locked'), locked_until: z.string() }),
]);

const letterPayloadSchema = z.object({
  name: z.string(),
  personalNote: z.string(),
  font: z.string(),
  content: letterContentSchema,
  signed: z.object({ at: z.string(), name: z.string() }).nullable(),
});

const failureShapes = [
  z.object({ status: z.literal('wrong_pin'), attempts_left: z.number().int().min(0) }),
  z.object({ status: z.literal('locked'), locked_until: z.string() }),
  z.object({ status: z.literal('unavailable') }),
] as const;

export const unlockSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), letter: letterPayloadSchema }),
  ...failureShapes,
]);

export const signSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), letter: letterPayloadSchema }),
  z.object({ status: z.literal('invalid_name') }),
  ...failureShapes,
]);

export type CheckLinkResult = z.infer<typeof checkLinkSchema>;
export type UnlockResponse = z.infer<typeof unlockSchema>;
export type SignResponse = z.infer<typeof signSchema>;
export type LetterPayload = z.infer<typeof letterPayloadSchema>;
