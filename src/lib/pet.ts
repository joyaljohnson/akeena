import { fillTemplate } from './format';
import type { LetterContent } from './letterTypes';

export type PetLines = { name: string; sealLine: string; witnessLine: string };

/** The pet's lines with {pet} filled in, or null when there is no pet or it is switched off. */
export function petLines(content: Pick<LetterContent, 'pet'>): PetLines | null {
  const pet = content.pet;
  if (!pet || !pet.enabled) return null;
  const values = { pet: pet.name };
  return {
    name: pet.name,
    sealLine: fillTemplate(pet.sealLine, values),
    witnessLine: fillTemplate(pet.witnessLine, values),
  };
}
