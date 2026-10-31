/** What the envelope's front says: who the letter is for, and who it is from. */
export type Recipient = {
  name: string;
  /** For example "With love, Akeena". */
  from: string;
  /** Her chosen handwriting, so her name is written the way the letter will be. */
  fontId?: string;
};
