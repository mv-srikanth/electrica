/* Electrica: small helpers that make the controls easier to find and use, shared by every page.
   - icons and plain-language tips on the view buttons
   - zoom in, zoom out and reset-view buttons on each 3D figure
   - a "how to move the model" chip that shows until the first touch and again from the ? button
   Nothing here changes what the pages calculate or draw. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function icon(d) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('aria-hidden', 'true');
    d.split('|').forEach(function (p) { var e = document.createElementNS(NS, 'path'); e.setAttribute('d', p); s.appendChild(e); });
    return s;
  }
  var I = {
    assembled: 'M10 2.5 16.5 6v8L10 17.5 3.5 14V6z|M3.5 6 10 9.5 16.5 6|M10 9.5v8',
    cutaway: 'M10 2.5 3.5 6v8L10 17.5V9.5L3.5 6|M10 2.5 16.5 6 10 9.5|M12.5 12.5l4 2.2M12.5 15.5l4-5',
    exploded: 'M10 7.5 13 9v3l-3 1.5L7 12V9z|M10 2v2.5M10 15.5V18M3 6l2 1.2M15 12.8l2 1.2M17 6l-2 1.2M5 12.8 3 14',
    walkthrough: 'M4 5h2M4 10h2M4 15h2|M9 5h7M9 10h7M9 15h7',
    flux: 'M2.5 10c2.5-6 5-6 7.5 0s5 6 7.5 0',
    overview: 'M10 2.5 16.5 6v8L10 17.5 3.5 14V6z|M3.5 6 10 9.5 16.5 6|M10 9.5v8',
    powerhouse: 'M3 17V8l5-3v3l5-3v3l4-2.5V17z|M7 17v-4h3v4',
    plan: 'M3.5 3.5h13v13h-13z|M3.5 9h13M9 3.5v13',
    elevation: 'M2.5 16.5h15|M5 16.5V7l5-3.5L15 7v9.5|M8.5 16.5v-4h3v4',
    tour: 'M10 17.5s5-4.6 5-8.5a5 5 0 0 0-10 0c0 3.9 5 8.5 5 8.5z|M10 7.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6',
    focus: 'M3.5 7V3.5H7M13 3.5h3.5V7M16.5 13v3.5H13M7 16.5H3.5V13',
    full: 'M3.5 8V3.5H8M12 3.5h4.5V8M16.5 12v4.5H12M8 16.5H3.5V12|M3.5 3.5 8 8M16.5 3.5 12 8M16.5 16.5 12 12M3.5 16.5 8 12',
    plus: 'M10 4.5v11M4.5 10h11', minus: 'M4.5 10h11',
    reset: 'M4 10a6 6 0 1 0 2-4.5|M4 3.5v3.2h3.2',
    help: 'M7.6 7.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9|M10 14.6v.2',
    drag: 'M6.5 10V5.2a1.3 1.3 0 0 1 2.6 0V9M9.1 8.2a1.3 1.3 0 0 1 2.6 0V9.5M11.7 9a1.3 1.3 0 0 1 2.6 0v3.5a4.5 4.5 0 0 1-4.5 4.5h-.6a4 4 0 0 1-3.3-1.8l-2-3a1.2 1.2 0 0 1 2-1.4l.6.8',
    zoom: 'M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z|M13 13l3.5 3.5M9 6.8v4.4M6.8 9h4.4',
    click: 'M5 3.5l9.5 4.7-4 1.4-1.6 4.1z|M11.5 11.5l4 4'
  };
  var TIP = {
    assembled: 'The whole machine, as built', cutaway: 'Slice the casing open to see inside', exploded: 'Pull the parts apart',
    walkthrough: 'Step through the parts one at a time', flux: 'Watch the flux, current or oil move',
    overview: 'The whole plant', powerhouse: 'Cut into the powerhouse'
  };

  function addIcon(btn, name) { if (btn && I[name] && !btn.querySelector('svg')) btn.insertBefore(icon(I[name]), btn.firstChild); }

  document.querySelectorAll('.seg button[data-mode]').forEach(function (b) {
    addIcon(b, b.dataset.mode);
    if (TIP[b.dataset.mode] && !b.title) b.title = TIP[b.dataset.mode];
  });
  document.querySelectorAll('.tool[data-view]').forEach(function (b) { addIcon(b, b.dataset.view); });
  addIcon(document.getElementById('focusBtn'), 'focus');
  addIcon(document.getElementById('fsBtn'), 'full');
  addIcon(document.getElementById('tourBtn'), 'tour');

  /* ---------- the 3D figure: zoom, reset and how-to ---------- */
  var stage = document.getElementById('stage');
  var viewer = document.getElementById('viewer');
  if (!stage || !viewer) return;

  function canvas() { return stage.querySelector('canvas'); }
  function zoom(dir) {
    var c = canvas(); if (!c) return;
    var r = c.getBoundingClientRect();
    for (var i = 0; i < 2; i++) {
      c.dispatchEvent(new WheelEvent('wheel', { deltaY: dir * 120, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
    }
  }
  function reset() {
    if (typeof window.ElectricaResetView === 'function') { window.ElectricaResetView(); return; }
    var b = document.querySelector('.tool[data-view="overview"]') || document.querySelector('.seg button[aria-pressed="true"]');
    if (b) b.click();
  }
  function padBtn(name, label, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.appendChild(icon(I[name]));
    b.addEventListener('click', fn);
    return b;
  }

  var how = document.createElement('p');
  how.className = 'howto'; how.setAttribute('role', 'note');
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  [['drag', touch ? 'Drag to turn' : 'Drag to turn'], ['zoom', touch ? 'Pinch to zoom' : 'Scroll to zoom'], ['click', touch ? 'Tap a part' : 'Click a part']].forEach(function (x) {
    var s = document.createElement('span'); s.appendChild(icon(I[x[0]])); s.appendChild(document.createTextNode(x[1])); how.appendChild(s);
  });
  var hideT = 0;
  function showHow(ms) { how.classList.remove('gone'); clearTimeout(hideT); if (ms) hideT = setTimeout(hideHow, ms); }
  function hideHow() { how.classList.add('gone'); }

  var pad = document.createElement('div');
  pad.className = 'viewpad'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'View');
  pad.appendChild(padBtn('plus', 'Zoom in', function () { zoom(-1); }));
  pad.appendChild(padBtn('minus', 'Zoom out', function () { zoom(1); }));
  pad.appendChild(padBtn('reset', 'Reset the view', reset));
  pad.appendChild(padBtn('help', 'How to move the model', function () { showHow(5000); }));
  stage.appendChild(pad);
  stage.appendChild(how);

  var seen = false;
  try { seen = localStorage.getItem('electrica-howto') === '1'; } catch (e) { /* remembering is optional */ }
  if (seen) how.classList.add('gone');
  stage.addEventListener('pointerdown', function (e) {
    if (pad.contains(e.target)) return;
    hideHow();
    try { localStorage.setItem('electrica-howto', '1'); } catch (err) { /* remembering is optional */ }
  });
})();
