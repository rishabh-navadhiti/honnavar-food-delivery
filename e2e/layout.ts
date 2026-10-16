/**
 * Layout checks for the visual refresh (003, FR-027, research R13). Each helper returns data so the
 * spec can assert on it with a readable failure message.
 */
import type { Locator, Page } from '@playwright/test';

export type Locale = 'en' | 'kn';

/** Sets the existing language cookie for the e2e server's origin (playwright.config.ts). */
export async function setLocale(page: Page, locale: Locale): Promise<void> {
  await page.context().addCookies([{ name: 'locale', value: locale, url: 'http://localhost:3100' }]);
}

/** How far the page scrolls sideways (0 when it fits). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/**
 * Visible interactive elements whose hit area is smaller than 48×48 (FR-011). The hit area is the
 * larger of the element's box and its `tap` pseudo-element (003 density: a compact visual with an
 * invisible 48 px target), or, for a field, the label that wraps it. Links inside running text
 * (`p`) are exempt, as WCAG exempts inline targets.
 */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = 'a[href], button, summary, select, input:not([type=hidden]), [role=button]';
    const out: string[] = [];
    const hitSize = (el: Element) => {
      const box = el.getBoundingClientRect();
      const after = getComputedStyle(el, '::after');
      const pseudo = after.content !== 'none' && after.position === 'absolute';
      return {
        width: Math.max(box.width, pseudo ? parseFloat(after.width) || 0 : 0),
        height: Math.max(box.height, pseudo ? parseFloat(after.height) || 0 : 0),
      };
    };
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.closest('p')) continue;
      if (el.closest('.leaflet-container')) continue;
      // Radio buttons and checkboxes are covered by their (measured) label.
      if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox') && el.closest('label')) continue;
      if (el.classList.contains('sr-only')) continue;
      let hit = hitSize(el);
      const label = el.matches('input, select') ? el.closest('label') : null;
      if (label) {
        const outer = hitSize(label);
        hit = { width: Math.max(hit.width, outer.width), height: Math.max(hit.height, outer.height) };
      }
      if (hit.width < 47.5 || hit.height < 47.5) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        out.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(hit.width)}×${Math.round(hit.height)}`);
      }
    }
    return out;
  });
}

/** Fixed or sticky elements touching the top or bottom edge of the viewport. */
export async function fixedChrome(page: Page): Promise<{ top: number; bottom: number; totalHeight: number }> {
  return page.evaluate(() => {
    let top = 0;
    let bottom = 0;
    let totalHeight = 0;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') continue;
      // Count only outermost bars: skip anything inside another fixed or sticky element.
      let nested = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p).position;
        if (ps === 'fixed' || ps === 'sticky') nested = true;
      }
      if (nested) continue;
      if (box.top <= 1) {
        top += 1;
        totalHeight += box.height;
      } else if (box.bottom >= window.innerHeight - 1) {
        bottom += 1;
        totalHeight += box.height;
      }
    }
    return { top, bottom, totalHeight };
  });
}

/** How many matches lie fully inside the viewport, between the top bar and the bottom bar. */
export async function fullyVisibleCount(page: Page, locator: Locator): Promise<number> {
  const bars = await page.evaluate(() => {
    let topEdge = 0;
    let bottomEdge = window.innerHeight;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      if (style.position !== 'fixed' && style.position !== 'sticky') continue;
      const box = el.getBoundingClientRect();
      if (box.height === 0) continue;
      if (box.top <= 1) topEdge = Math.max(topEdge, box.bottom);
      else if (box.bottom >= window.innerHeight - 1) bottomEdge = Math.min(bottomEdge, box.top);
    }
    return { topEdge, bottomEdge };
  });
  let count = 0;
  for (const box of await locator.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect))) {
    if (box.top >= bars.topEdge - 1 && box.bottom <= bars.bottomEdge + 1) count += 1;
  }
  return count;
}

/** Elements whose text is cut off: content larger than the box while overflow hides it. */
export async function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      if (el.hasAttribute('data-truncate') || el.closest('[data-truncate]')) continue;
      if (el.closest('.leaflet-container, [aria-hidden="true"], .sr-only')) continue;
      if (!el.textContent?.trim()) continue;
      const style = getComputedStyle(el);
      const hidesX = style.overflowX !== 'visible';
      const hidesY = style.overflowY !== 'visible';
      if (!hidesX && !hidesY) continue;
      // Scrolling containers are fine; only clipping (hidden or clip) cuts text off.
      const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip';
      const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip';
      if ((clipsX && el.scrollWidth > el.clientWidth + 1) || (clipsY && el.scrollHeight > el.clientHeight + 1)) {
        out.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`);
      }
    }
    return out;
  });
}

/** Deliberately truncated text that does not expose its full value (title or screen-reader text). */
export async function truncatedWithoutFullText(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-truncate]'))
      .filter((el) => {
        // A title (the full name; a fallback marker may follow it in the text) or screen-reader text.
        if (el.title.trim()) return false;
        const full = el.textContent?.trim() ?? '';
        const sr = el.parentElement?.querySelector('.sr-only');
        return !(sr && sr.textContent?.trim() === full);
      })
      .map((el) => `"${(el.textContent ?? '').trim().slice(0, 40)}"`),
  );
}

/** Text blocks wider than `max` px, for readable line lengths at tablet widths (FR-011). */
export async function wideTextBlocks(page: Page, max: number): Promise<string[]> {
  return page.evaluate(
    (limit) =>
      Array.from(document.querySelectorAll<HTMLElement>('main p, main li, main h1, main h2, main dd'))
        .filter((el) => el.offsetParent && el.getBoundingClientRect().width > limit && (el.textContent ?? '').trim().length > 40)
        .map((el) => `${el.tagName.toLowerCase()} ${Math.round(el.getBoundingClientRect().width)} "${(el.textContent ?? '').trim().slice(0, 30)}"`),
    max,
  );
}
