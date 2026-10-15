import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each(['9876543210', '+91 98765 43210', '09876543210', '98765-43210', '+919876543210', ' 98765 43210 '])(
    'normalises %s to 9876543210',
    (input) => {
      expect(normalizePhone(input)).toBe('9876543210');
    },
  );

  it.each(['987654321', '98765432101', '5876543210', '0123456789', '98765abcde', '', '+1 9876543210'])(
    'rejects %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});
