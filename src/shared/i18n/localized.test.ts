import { describe, expect, it } from 'vitest';
import { pickLocalized } from './localized';

describe('pickLocalized', () => {
  it('returns the selected language when present', () => {
    expect(pickLocalized({ en: 'Neer dose', kn: 'ನೀರ್ ದೋಸೆ' }, 'kn')).toEqual({
      text: 'ನೀರ್ ದೋಸೆ',
      lang: 'kn',
      isFallback: false,
    });
    expect(pickLocalized({ en: 'Neer dose', kn: 'ನೀರ್ ದೋಸೆ' }, 'en')).toEqual({
      text: 'Neer dose',
      lang: 'en',
      isFallback: false,
    });
  });

  it('falls back to the other language and flags it', () => {
    expect(pickLocalized({ en: 'Ambade upkari', kn: null }, 'kn')).toEqual({
      text: 'Ambade upkari',
      lang: 'en',
      isFallback: true,
    });
    expect(pickLocalized({ kn: 'ಹೋಳಿಗೆ' }, 'en')).toEqual({ text: 'ಹೋಳಿಗೆ', lang: 'kn', isFallback: true });
  });

  it('treats empty and whitespace values as missing', () => {
    expect(pickLocalized({ en: 'Patrode', kn: '   ' }, 'kn')).toEqual({
      text: 'Patrode',
      lang: 'en',
      isFallback: true,
    });
  });

  it('returns null when neither language has text', () => {
    expect(pickLocalized({ en: '', kn: null }, 'en')).toBeNull();
  });

  it('trims the returned text', () => {
    expect(pickLocalized({ en: '  Goli baje ' }, 'en')?.text).toBe('Goli baje');
  });
});
