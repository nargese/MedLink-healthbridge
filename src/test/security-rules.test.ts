import { describe, it, expect } from 'vitest';
import { passwordIssues, homeFor } from '@/lib/auth';
import { callReduction } from '@/lib/metrics';
describe('MedLink rules', () => {
  it('requires at least 12 password characters', () => {
    expect(passwordIssues('Aa1!aaaaaaa')).toContain('12 caractères minimum');
    expect(passwordIssues('Aa1!aaaaaaaa')).toEqual([]);
  });
  it.each(['aaaaaaaaaa1!', 'AAAAAAAAAA1!', 'Aaaaaaaaaaa!', 'Aaaaaaaaaaa1'])('rejects missing complexity in %s', pw => expect(passwordIssues(pw).length).toBeGreaterThan(0));
  it.each([['admin', '/admin'], ['praticien', '/praticien'], ['patient', '/patient'], ['super_admin', '/super-admin']] as const)('routes %s to %s', (role, path) => expect(homeFor([role])).toBe(path));
  it('calculates reduction from measured calls', () => expect(callReduction(200, 150)).toBe(25));
  it('does not invent a reduction without a baseline', () => expect(callReduction(0, 150)).toBeNull());
});