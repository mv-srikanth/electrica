/* Electrica: the colour-theme switch in the header, shared by every page.
   Auto follows the computer's light or dark setting; Light and Dark override it.
   The choice is remembered in this browser. The 3D views watch data-theme and recolour. */
(function () {
  'use strict';
  const KEY = 'electrica-theme', ORDER = ['auto', 'light', 'dark'];
  const NAME = { auto: 'Auto (follows the computer)', light: 'Light', dark: 'Dark' };
  const root = document.documentElement, btn = document.getElementById('themeBtn');
  let mode = 'auto';
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) { /* remembering is optional */ }
  if (ORDER.indexOf(mode) < 0) mode = 'auto';

  function apply() {
    if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    if (!btn) return;
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    btn.dataset.mode = mode;
    btn.title = 'Theme: ' + NAME[mode] + '. Click for ' + NAME[next].split(' ')[0] + '.';
    btn.setAttribute('aria-label', btn.title);
  }
  apply();
  if (btn) btn.addEventListener('click', () => {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, mode); } catch (e) { /* remembering is optional */ }
    apply();
  });
})();
