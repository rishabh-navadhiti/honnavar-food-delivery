import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * SC-006: body text at least 4.5:1, large text and meaningful icons at least 3:1, across the palette.
 * Reads the colour tokens straight from the @theme block, so a palette change cannot slip past.
 */
const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');
const theme = css.slice(css.indexOf('@theme'), css.indexOf('}', css.indexOf('@theme')));
const colours = new Map([...theme.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]));

function colour(name: string): string {
  const value = colours.get(name);
  if (!value) throw new Error(`--color-${name} is not defined as a hex colour in @theme`);
  return value;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(colour(a)), luminance(colour(b))].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const statuses = ['placed', 'accepted', 'preparing', 'ready', 'picked', 'delivered', 'rejected', 'cancelled'];

const bodyPairs: [string, string][] = [
  ...['ink', 'muted', 'subtle'].flatMap((text) => ['page', 'surface', 'surface-sunk'].map((bg): [string, string] => [text, bg])),
  ['on-primary', 'primary'],
  ['on-primary', 'primary-strong'],
  ['primary', 'surface'],
  ['on-danger', 'danger'],
  ...statuses.map((s): [string, string] => [`status-${s}`, `status-${s}-soft`]),
  ...['open', 'closed', 'warn', 'danger'].map((m): [string, string] => [m, `${m}-soft`]),
];

const largePairs: [string, string][] = [
  ...['sea', 'veg', 'nonveg'].flatMap((fg) => ['surface', 'page'].map((bg): [string, string] => [fg, bg])),
  ['line-strong', 'surface'],
];

describe('theme contrast (SC-006)', () => {
  it.each(bodyPairs)('body text %s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(largePairs)('large text and icons %s on %s are at least 3:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
