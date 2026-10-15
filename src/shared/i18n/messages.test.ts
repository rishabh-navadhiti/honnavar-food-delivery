import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import kn from './messages/kn.json';
import drafted from './messages/machine-drafted.json';

type Tree = { [key: string]: string | Tree };

function leafPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafPaths(value, path);
  });
}

function lookup(tree: Tree, path: string): string | Tree | undefined {
  return path.split('.').reduce<string | Tree | undefined>(
    (node, key) => (node && typeof node === 'object' ? node[key] : undefined),
    tree,
  );
}

describe('message catalogues (Principle II parity)', () => {
  const enKeys = leafPaths(en as Tree).sort();
  const knKeys = leafPaths(kn as Tree).sort();

  it('English and Kannada have exactly the same keys', () => {
    expect(knKeys).toEqual(enKeys);
  });

  it('no message is empty', () => {
    for (const [name, tree] of [
      ['en', en],
      ['kn', kn],
    ] as const) {
      for (const path of leafPaths(tree as Tree)) {
        expect(String(lookup(tree as Tree, path)).trim(), `${name}:${path}`).not.toBe('');
      }
    }
  });

  it('every machine-drafted entry exists in kn.json', () => {
    for (const path of drafted.kn) {
      expect(lookup(kn as Tree, path), path).toBeDefined();
    }
  });

  it('every Kannada namespace is listed as machine-drafted until reviewed', () => {
    for (const namespace of Object.keys(kn)) {
      expect(
        drafted.kn.some((entry) => entry === namespace || entry.startsWith(`${namespace}.`)),
        namespace,
      ).toBe(true);
    }
  });
});
