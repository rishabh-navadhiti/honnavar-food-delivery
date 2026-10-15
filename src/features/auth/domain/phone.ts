/**
 * Normalise an Indian mobile number to 10 digits starting with 6–9.
 * Accepts spaces, hyphens, a leading +91 / 91 country code or a leading 0. Returns null otherwise.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s-]/g, '');
  let digits: string;
  if (/^\+91\d{10}$/.test(compact)) digits = compact.slice(3);
  else if (/^91\d{10}$/.test(compact)) digits = compact.slice(2);
  else if (/^0\d{10}$/.test(compact)) digits = compact.slice(1);
  else if (/^\d{10}$/.test(compact)) digits = compact;
  else return null;
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
