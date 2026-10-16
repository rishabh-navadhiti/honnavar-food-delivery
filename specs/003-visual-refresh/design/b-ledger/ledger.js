/* B · Ledger — mockup helper (review artefact only).
   1. Injects the custom SVG sprite: veg / non-veg marks, the app mark,
      the two map pins and the empty-state illustration.
   2. Clones a 390 px screen into a 360 px frame (data-clone-of) so the
      narrow fit is checked against the exact same markup.
   3. Draws Lucide icons. Load this last on every page. */
(function () {
  var sprite = '' +
  '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' +
    /* Indian veg mark: square outline + filled circle */
    '<symbol id="i-veg" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="3.6" fill="currentColor"/></symbol>' +
    /* Non-veg mark: square outline + filled triangle */
    '<symbol id="i-nonveg" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.9 12.2 11.3H3.8Z" fill="currentColor"/></symbol>' +
    /* App mark: a bowl under a turmeric tide line (river meets sea) */
    '<symbol id="i-mark" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" style="fill:var(--c-primary)"/><path d="M6.5 15.5h19c0 5.25-4.25 9.5-9.5 9.5s-9.5-4.25-9.5-9.5Z" fill="#fff"/><path d="M7.5 11.2c1.6-1.5 3.2-1.5 4.8 0s3.2 1.5 4.8 0 3.2-1.5 4.8 0 2.4 1.1 3.2.6" fill="none" style="stroke:var(--c-accent)" stroke-width="2" stroke-linecap="round"/></symbol>' +
    /* Kitchen pin: rounded tag in brand teal with a steaming bowl */
    '<symbol id="i-pin-kitchen" viewBox="0 0 40 50"><ellipse cx="20" cy="47" rx="7" ry="2.2" fill="rgba(20,25,31,.22)"/><path d="M8 2h24a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6h-7.2L20 44l-4.8-8H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z" style="fill:var(--c-primary)" stroke="#fff" stroke-width="2"/><path d="M10.5 18.5h19c0 5.2-4.25 9-9.5 9s-9.5-3.8-9.5-9Z" fill="#fff"/><path d="M15.5 9.5c-1.3 1.5 1.3 2.7 0 4.3M20 8.5c-1.3 1.5 1.3 2.7 0 4.3M24.5 9.5c-1.3 1.5 1.3 2.7 0 4.3" fill="none" style="stroke:var(--c-accent)" stroke-width="1.9" stroke-linecap="round"/></symbol>' +
    /* Delivery pin: ink teardrop with a house, turmeric door */
    '<symbol id="i-pin-home" viewBox="0 0 40 50"><ellipse cx="20" cy="47" rx="7" ry="2.2" fill="rgba(20,25,31,.22)"/><path d="M20 2a16 16 0 0 1 16 16c0 11.5-16 27-16 27S4 29.5 4 18A16 16 0 0 1 20 2Z" style="fill:var(--c-ink)" stroke="#fff" stroke-width="2"/><path d="M12.5 18.6 20 12.2l7.5 6.4V26h-15Z" fill="#fff"/><rect x="18" y="20.5" width="4" height="5.5" rx=".8" style="fill:var(--c-accent)"/></symbol>' +
    /* Empty state: an empty banana-leaf plate and katori */
    '<symbol id="i-empty" viewBox="0 0 120 96">' +
      '<ellipse cx="60" cy="86" rx="44" ry="5" style="fill:var(--c-sunken)"/>' +
      '<path d="M10 66c16-26 74-34 102-14-18 22-80 32-102 14Z" style="fill:var(--map-green);stroke:var(--c-primary-line)" stroke-width="1.5"/>' +
      '<path d="M14 65c30-6 62-12 94-13" fill="none" style="stroke:var(--c-primary-line)" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M36 60l-6 9M50 57l-5 11M64 55l-4 11M78 53l-3 11M92 52l-2 9" fill="none" style="stroke:var(--c-primary-line)" stroke-width="1" stroke-linecap="round"/>' +
      '<ellipse cx="80" cy="44" rx="15" ry="4.5" style="fill:var(--c-surface);stroke:var(--c-line-strong)" stroke-width="1.5"/>' +
      '<path d="M65 44c0 9 6.7 14 15 14s15-5 15-14" style="fill:var(--c-surface);stroke:var(--c-line-strong)" stroke-width="1.5"/>' +
      '<path d="M74 22c-2 3 2 5 0 8M81 18c-2 3 2 5 0 8M88 22c-2 3 2 5 0 8" fill="none" style="stroke:var(--c-faint)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 3"/>' +
      '<circle cx="34" cy="30" r="3" style="fill:var(--c-accent)"/><circle cx="24" cy="40" r="1.8" style="fill:var(--c-primary-line)"/><circle cx="102" cy="30" r="2" style="fill:var(--c-primary-line)"/>' +
    '</symbol>' +
  '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  document.querySelectorAll('[data-clone-of]').forEach(function (el) {
    var src = document.getElementById(el.getAttribute('data-clone-of'));
    if (src) el.innerHTML = src.innerHTML;
  });

  if (window.lucide) window.lucide.createIcons();
})();
