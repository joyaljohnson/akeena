import { describe, expect, it } from 'vitest';
import { cleanSignedName, isValidSignedName } from './signing';

describe('signed name', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanSignedName('  Riya   K  ')).toBe('Riya K');
  });
  it('accepts 1 to 60 characters and rejects the rest', () => {
    expect(isValidSignedName('R')).toBe(true);
    expect(isValidSignedName('x'.repeat(60))).toBe(true);
    expect(isValidSignedName('x'.repeat(61))).toBe(false);
    expect(isValidSignedName('    ')).toBe(false);
    expect(isValidSignedName('')).toBe(false);
  });
  it('allows nicknames and emoji', () => {
    expect(isValidSignedName('Ri 💖')).toBe(true);
  });
});
