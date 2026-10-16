import type { ReactNode } from 'react';

/**
 * Empty-state illustrations (003, research R3): one banana-leaf scene with a different object on it,
 * drawn from the Coast reference. Decorative: the empty state's title says what is shown.
 */
function Scene({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 220 160" className="h-32 w-44" aria-hidden="true">
      <ellipse cx="110" cy="92" rx="96" ry="62" className="fill-primary-soft" />
      <path d="M24 128c22-6 42-6 64 0s42 6 64 0 34-6 46 0" fill="none" stroke="#b9e1db" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 140c18-5 34-5 52 0s34 5 52 0 30-5 46 0" fill="none" stroke="#dff2ef" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 112C58 74 132 52 196 66c-20 30-86 64-166 46Z" fill="#3f8f5a" />
      <path d="M30 112C58 74 132 52 196 66c-30 6-110 24-166 46Z" fill="#5aa86f" />
      <path d="M30 112C80 92 140 74 196 66" fill="none" stroke="#2f7347" strokeWidth="2.2" strokeLinecap="round" />
      {children}
    </svg>
  );
}

/** An empty bowl with a wisp of steam: empty cart. */
export function EmptyCart() {
  return (
    <Scene>
      <path d="M74 86h72c0 22-16 34-36 34S74 108 74 86Z" className="fill-primary" />
      <ellipse cx="110" cy="86" rx="36" ry="9" fill="#fff6ea" className="stroke-primary" strokeWidth="3" />
      <ellipse cx="110" cy="87" rx="28" ry="5.5" fill="#f6cdb4" />
      <g fill="none" stroke="#f2a541" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 6">
        <path d="M98 70c-6-8 6-12 0-22" />
        <path d="M110 66c-6-8 6-12 0-22" />
        <path d="M122 70c-6-8 6-12 0-22" />
      </g>
    </Scene>
  );
}

/** A blank order slip: no orders yet. */
export function NoOrders() {
  return (
    <Scene>
      <path d="M86 40h48v64l-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5Z" fill="#fff6ea" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" />
      <path d="M96 56h28M96 68h20M96 80h24" className="stroke-primary" strokeWidth="3" strokeLinecap="round" opacity=".45" />
    </Scene>
  );
}

/** A closed envelope: no messages yet. */
export function NoMessages() {
  return (
    <Scene>
      <rect x="78" y="56" width="64" height="44" rx="6" fill="#fff6ea" className="stroke-primary" strokeWidth="3" />
      <path d="M80 60l30 22 30-22" fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" />
    </Scene>
  );
}

/** A magnifying glass over the leaf: no kitchens match. */
export function NoKitchens() {
  return (
    <Scene>
      <circle cx="104" cy="74" r="22" fill="#fff6ea" className="stroke-sea" strokeWidth="5" />
      <path d="M120 90l20 20" className="stroke-sea" strokeWidth="7" strokeLinecap="round" />
      <path d="M96 70h16" className="stroke-sea" strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </Scene>
  );
}

/** A signpost: page not found. */
export function NotFound() {
  return (
    <Scene>
      <path d="M108 44v66" className="stroke-primary" strokeWidth="5" strokeLinecap="round" />
      <path d="M84 50h44l10 9-10 9H84Z" fill="#fff6ea" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" />
      <path d="M132 74H88l-10 9 10 9h44Z" fill="#fff6ea" className="stroke-sea" strokeWidth="3" strokeLinejoin="round" />
    </Scene>
  );
}

export const illustrations = { EmptyCart, NoOrders, NoMessages, NoKitchens, NotFound } as const;
export type IllustrationName = keyof typeof illustrations;
