import { describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { formatCHF, validateSwissPLZ, calculateMWST } from '../swiss';

describe('swiss helpers', () => {
  it('formats CHF correctly', () => {
    expect(formatCHF(1234.5)).toContain('1');
    expect(formatCHF(1234.5)).toContain('234');
  });

  it('validates Swiss PLZ', () => {
    expect(validateSwissPLZ('8001')).toBe(true);
    expect(validateSwissPLZ('9999')).toBe(false);
    expect(validateSwissPLZ('abc')).toBe(false);
  });

  it('calculates MWST from gross', () => {
    const { netPrice, vatAmount } = calculateMWST(108.1);
    expect(netPrice).toBe(100);
    expect(vatAmount).toBe(8.1);
  });
});

describe('auth password hashing', () => {
  it('hashes and verifies passwords', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 4);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});
