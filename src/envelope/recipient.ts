import type { LetterContent } from '../lib/letterTypes';
import { petLines } from '../lib/pet';

/** What the envelope says: who the letter is for and from, and the seal's wording. */
export type Recipient = {
  name: string;
  /** For example "With love, Akeena". */
  from: string;
  /** Her chosen handwriting, so her name is written the way the letter will be. */
  fontId?: string;
  /** "Sealed by Loki", shown under the seal; absent when the pet lines are off. */
  sealLine?: string;
  /** The seal button's accessible name. */
  sealLabel: string;
};

export function makeRecipient(name: string, content: LetterContent, fontId?: string): Recipient {
  const pet = petLines(content);
  return {
    name,
    from: `${content.bride.signOff} ${content.bride.firstName}`,
    fontId,
    sealLine: pet?.sealLine,
    sealLabel: pet ? `Tap ${pet.name}'s seal to open your letter` : 'Open your letter',
  };
}
