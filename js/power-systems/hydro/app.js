/* Electrica Hydro: the page. Sets up the isometric 3D view, runs the plant model, and keeps the
   components list, the operating controls, the readings and the walkthrough in step with it. */
(function () {
  const HY = window.HY;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (v, d) => v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const stage = $('#stage'), statusEl = $('#status'), app = $('#app'), viewerEl = $('#viewer');
  if (!window.THREE || !THREE.OrbitControls) {
    statusEl.textContent = 'The 3D library did not load. Check that js/vendor/three.min.js and js/vendor/OrbitControls.js are in place.';
    return;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = HY.PLANT, PARTS = HY.PARTS;

  /* ---------- renderer: see-through, so the card shows behind the block ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.domElement.className = 'gl';
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const scene = new THREE.Scene();

  /* ---------- an isometric camera, raised to look into the valley ---------- */
  const AZ = THREE.MathUtils.degToRad(30), EL = THREE.MathUtils.degToRad(40), DIST = 220;
  const viewDir = (az, el) => V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 700);
  let aspect = 1, stageH = 1;
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, rotateSpeed: 0.7, minZoom: 0.012, maxZoom: 0.6, maxPolarAngle: Math.PI / 2 - 0.06, screenSpacePanning: true });

  scene.add(new THREE.HemisphereLight(0xf4f6f8, 0x6b6558, 0.55));
  const sun = new THREE.DirectionalLight(0xfff6ea, 0.78);
  sun.position.set(40, 110, 70); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 75, bottom: -75, near: 10, far: 420 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xd8e4ff, 0.3); fill.position.set(-80, 50, -40); scene.add(fill);

  let S;
  try { S = HY.buildScene(THREE, tok); }
  catch (err) { statusEl.textContent = 'The plant model could not be built: ' + err.message; console.error(err); return; }
  scene.add(S.root);
  const sim = new HY.Sim();
  S.setLevel(sim.level);

  /* ---------- camera moves ---------- */
  /* frame a box, or a set of points, seen from a direction: centred, filling the card by fillK */
  function fit(what, dir, fillK) {
    const back = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(V(0, 1, 0), back).normalize(), up = new THREE.Vector3().crossVectors(back, right);
    const pts = Array.isArray(what) ? what : [0, 1, 2, 3, 4, 5, 6, 7].map((i) => V(i & 1 ? what.max.x : what.min.x, i & 2 ? what.max.y : what.min.y, i & 4 ? what.max.z : what.min.z));
    let r0 = Infinity, r1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    pts.forEach((p) => { const a = p.dot(right), b = p.dot(up); r0 = Math.min(r0, a); r1 = Math.max(r1, a); u0 = Math.min(u0, b); u1 = Math.max(u1, b); });
    const hw = Math.max(0.5, (r1 - r0) / 2), hh = Math.max(0.5, (u1 - u0) / 2);
    /* the centre of the screen rectangle, put back on the plane through the points' middle depth */
    const c = right.clone().multiplyScalar((r0 + r1) / 2).addScaledVector(up, (u0 + u1) / 2);
    const mid = pts.reduce((a, p) => a + p.dot(back), 0) / pts.length;
    c.addScaledVector(back, mid);
    return { target: c, pos: c.clone().addScaledVector(back, DIST), zoom: Math.min(aspect / hw, 1 / hh) * (fillK || 0.92) };
  }
  let fly = null;
  function go(v, instant) {
    if (instant || reduceMotion) { fly = null; controls.target.copy(v.target); camera.position.copy(v.pos); camera.zoom = v.zoom; camera.updateProjectionMatrix(); controls.update(); return; }
    fly = { t0: performance.now(), dur: 1000, fT: controls.target.clone(), tT: v.target, fP: camera.position.clone(), tP: v.pos, fZ: camera.zoom, tZ: v.zoom };
  }
  controls.addEventListener('start', () => { fly = null; });
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  /* ---------- selection, highlight, details ---------- */
  const partsEl = $('#parts'), detailEl = $('#detail'), infoEl = $('#info');
  const idx = {}; PARTS.forEach((p, i) => { idx[p.id] = i; });
  $('#count').textContent = PARTS.length + ' parts';
  partsEl.innerHTML = PARTS.map((p, i) => '<li><button type="button" data-i="' + i + '" aria-pressed="false"><span class="num">' + pad(i + 1) + '</span><span>' + esc(p.name) + '</span></button></li>').join('');
  let sel = -1, hover = -1;
  const glow = new THREE.Color();
  function refreshLook() {
    glow.set(tok('--flux') || '#2f5fd8');
    PARTS.forEach((p, i) => {
      const k = i === sel ? 0.38 : i === hover ? 0.18 : 0;
      S.parts[p.id].mats.forEach((m) => {
        if (m.emissive) { m.emissive.copy(glow); m.emissiveIntensity = k; }
        else if (m.userData.base && m.userData.base.opacity < 0.5) m.opacity = m.userData.base.opacity + (k ? 0.3 : 0);
      });
    });
  }
  function renderDetail() {
    detailEl.classList.toggle('empty', sel < 0);
    if (sel < 0) { detailEl.innerHTML = '<h2 class="eyebrow">Component</h2><p>Click a part of the plant, or pick one from the list, to see what it does.</p>'; return; }
    const p = PARTS[sel];
    detailEl.innerHTML = '<h2 class="eyebrow">Component ' + pad(sel + 1) + ' of ' + pad(PARTS.length) + '<span>Hydro plant</span></h2><h3>' + esc(p.name) + '</h3><p>' + esc(p.role) + '</p><dl>' +
      (p.material ? '<div><dt>Made of</dt><dd>' + esc(p.material) + '</dd></div>' : '') + (p.look ? '<div><dt>Look for</dt><dd>' + esc(p.look) + '</dd></div>' : '') + '</dl>';
  }
  function select(i, focus) {
    sel = i;
    partsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    renderDetail(); refreshLook(); dirty = true;
    if (mode === 'walkthrough' && i >= 0) $('#walkText').innerHTML = '<b>Step ' + pad(i + 1) + ' of ' + pad(PARTS.length) + '</b>' + esc(PARTS[i].name);
    if (focus && i >= 0) focusPart(i);
    if (i >= 0 && infoEl.scrollTop > 0 && getComputedStyle(infoEl).overflowY === 'auto') infoEl.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function focusPart(i) {
    const p = PARTS[i], inside = p.inside || p.id === 'powerhouse';
    if (inside !== S.cut) { S.setCut(inside); renderer.shadowMap.needsUpdate = true; }
    const b = S.boxOf(p.id), sz = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0)), m = inside ? 9 : 16;
    b.expandByVector(V(Math.max(0, m - sz.x) / 2, Math.max(0, m * 0.5 - sz.y) / 2, Math.max(0, m - sz.z) / 2));
    if (p.inside) b.union(new THREE.Box3(c.clone().add(V(-6, -3, -4)), c.clone().add(V(6, 5, 4))));
    go(fit(b, viewDir(AZ, EL), 0.8));
  }
  partsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) select(+b.dataset.i, true); });

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let blocked = false;
    for (const h of ray.intersectObjects(S.pickables.concat([S.terrain]), false)) {
      if (h.object === S.terrain) { blocked = true; continue; }
      if (!shown(h.object)) continue;
      if (blocked && h.object.material.depthTest !== false) continue;   /* hidden behind the ground, unless drawn through it */
      return idx[h.object.userData.part];
    }
    return -1;
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    select(pick(e), mode === 'walkthrough');
  });
  const tipEl = $('#tip');
  let hoverQ = false;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || down || hoverQ) return;
    hoverQ = true;
    requestAnimationFrame(() => {
      hoverQ = false;
      const i = pick(e);
      renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'grab';
      if (i !== hover) { hover = i; refreshLook(); }
      if (i < 0) { tipEl.hidden = true; return; }
      const r = stage.getBoundingClientRect();
      tipEl.textContent = PARTS[i].name; tipEl.hidden = false;
      tipEl.style.transform = 'translate(' + (e.clientX - r.left + 14) + 'px,' + (e.clientY - r.top + 12) + 'px)';
    });
  });
  renderer.domElement.addEventListener('pointerleave', () => { tipEl.hidden = true; if (hover !== -1) { hover = -1; refreshLook(); } });

  /* ---------- labels on the model ---------- */
  const labelsEl = $('#labels');
  let showLabels = true;
  const labs = S.labels.map((l) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lab' + (l.inside ? ' lab-in' : ''); b.textContent = l.text; b.dataset.part = l.part;
    labelsEl.appendChild(b); return { l: l, el: b };
  });
  labelsEl.addEventListener('click', (e) => { const b = e.target.closest('.lab'); if (b) select(idx[b.dataset.part], true); });
  const tmp = new THREE.Vector3(), cornerEls = $$('.corner', stage);
  /* labels are placed in order of importance; one that would cover a label already placed waits until there is room */
  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight, sr = stage.getBoundingClientRect();
    /* the card's corner labels count as already placed */
    const placed = cornerEls.map((c) => { const r = c.getBoundingClientRect(); return [r.left - sr.left - 4, r.top - sr.top - 4, r.right - sr.left + 4, r.bottom - sr.top + 4]; });
    /* with the powerhouse open, the machines' own labels come first */
    (S.cut ? labs.filter((o) => o.l.inside).concat(labs.filter((o) => !o.l.inside)) : labs).forEach((o) => {
      const want = showLabels && (!o.l.inside || S.cut);
      if (!want) { if (!o.el.hidden) o.el.hidden = true; return; }
      tmp.copy(o.l.pos).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      if (!o.w) { o.el.hidden = false; o.w = o.el.offsetWidth || 80; o.h = o.el.offsetHeight || 20; }
      const r = [x - o.w / 2 - 3, y - o.h - 3, x + o.w / 2 + 3, y + 3];
      const clash = placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      const hide = x < 30 || y < 34 || x > w - 30 || y > h - 30 || (clash && idx[o.l.part] !== sel);
      o.el.hidden = hide;
      if (!hide) { placed.push(r); o.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)'; o.el.classList.toggle('on', idx[o.l.part] === sel); }
    });
  }
  const labelsBtn = $('#labelsBtn');
  labelsBtn.addEventListener('click', () => { showLabels = !showLabels; labelsBtn.setAttribute('aria-pressed', String(showLabels)); });

  /* ---------- view modes ---------- */
  let mode = 'overview';
  const modeBtns = $$('[data-mode]'), walkEl = $('#walk');
  function setMode(m) {
    mode = m;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    viewerEl.dataset.mode = m;
    walkEl.hidden = m !== 'walkthrough';
    if (m === 'overview') { S.setCut(false); go(fit(S.fitPts, viewDir(AZ, EL), 0.97)); }
    else if (m === 'powerhouse') { S.setCut(true); go(fit(S.powerhouse, viewDir(AZ, THREE.MathUtils.degToRad(30)), 0.9)); }
    else select(sel >= 0 ? sel : 0, true);
    renderer.shadowMap.needsUpdate = true; dirty = true;
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#prev').addEventListener('click', () => select((Math.max(sel, 0) - 1 + PARTS.length) % PARTS.length, true));
  $('#next').addEventListener('click', () => select((sel + 1) % PARTS.length, true));

  /* ---------- operating the plant ---------- */
  const opsEl = $('#ops');
  opsEl.innerHTML = '<h2 class="eyebrow">Operate the plant</h2><div class="params">' +
    '<label class="param" for="p-gate"><span>Wicket gate opening</span><output id="o-gate" for="p-gate"></output><input type="range" id="p-gate" min="0" max="100" step="1" value="' + Math.round(sim.gateCmd * 100) + '"></label>' +
    '<label class="param" for="p-level"><span>Reservoir level</span><output id="o-level" for="p-level"></output><input type="range" id="p-level" min="' + P.MDDL + '" max="' + P.FRL + '" step="0.5" value="' + sim.level + '"></label></div>' +
    '<div class="opts"><div class="opt"><span class="fl">Units online</span><div class="seg2" role="group" aria-label="Units online">' + [0, 1, 2, 3].map((n) => '<button type="button" data-units="' + n + '" aria-pressed="' + (n === sim.unitsOn) + '">' + n + '</button>').join('') + '</div></div>' +
    '<div class="opt"><span class="fl">Spillway gates</span><div class="seg2" role="group" aria-label="Spillway gates"><button type="button" data-spill="0" aria-pressed="true">Closed</button><button type="button" data-spill="1" aria-pressed="false">Open</button></div></div></div>' +
    '<dl class="calc-out" id="calcOut"></dl><p class="calc-note" id="calcNote"></p>';
  const gateIn = $('#p-gate'), levelIn = $('#p-level');
  gateIn.addEventListener('input', () => { sim.gateCmd = +gateIn.value / 100; dirty = true; });
  levelIn.addEventListener('input', () => { sim.level = +levelIn.value; sim.settleSurge(); S.setLevel(sim.level); dirty = true; });
  opsEl.addEventListener('click', (e) => {
    const u = e.target.closest('[data-units]'), s = e.target.closest('[data-spill]');
    if (u) { sim.unitsOn = +u.dataset.units; opsEl.querySelectorAll('[data-units]').forEach((b) => b.setAttribute('aria-pressed', String(b === u))); }
    if (s) { sim.spill = s.dataset.spill === '1'; opsEl.querySelectorAll('[data-spill]').forEach((b) => b.setAttribute('aria-pressed', String(b === s))); }
    dirty = true;
  });

  /* ---------- readings: the operate card, the chips under the figure, the card's readout ---------- */
  const calcOut = $('#calcOut'), calcNote = $('#calcNote'), chipsEl = $('#chips'), readEl = $('#cRead');
  const chip = (cls, label, value) => '<span class="chip ' + cls + '"><i></i>' + esc(label) + ' <b>' + esc(value) + '</b></span>';
  let dirty = true;
  function renderReadings(R) {
    $('#o-gate').textContent = Math.round(sim.gateCmd * 100) + '%';
    $('#o-level').textContent = 'RL ' + fmt(R.level, 1) + ' m';
    const rows = [
      ['Gross head', fmt(R.gross, 1) + ' m'], ['Friction losses', '− ' + fmt(R.friction, 1) + ' m'],
      ['Surge tank swing', Math.abs(R.swing) < 0.05 ? 'at rest' : (R.swing > 0 ? '+ ' : '− ') + fmt(Math.abs(R.swing), 1) + ' m'], ['Net head', fmt(R.net, 1) + ' m'],
      ['Flow per unit', fmt(R.Qunit, 1) + ' m³/s'], ['Total flow', fmt(R.Q, 1) + ' m³/s'], ['Turbine efficiency', R.running ? fmt(R.eta * 100, 1) + '%' : '–'],
      ['Output', fmt(R.MW, 1) + ' MW'], ['Speed', R.running ? R.rpm + ' rpm, 50 Hz' : 'stopped'],
    ];
    calcOut.innerHTML = rows.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
    calcNote.textContent = 'P = 9.81 × ' + fmt(R.Q, 1) + ' × ' + fmt(R.net, 1) + ' × ' + (R.running ? fmt(R.eta, 2) : '0') + ' × 0.98 ≈ ' + fmt(R.MW, 1) + ' MW. ' +
      'Surge tank at RL ' + fmt(R.surge, 1) + ' m; its swings are shown 20 times faster than real.' + (R.spill ? ' Spillway passing ' + fmt(R.spill, 0) + ' m³/s.' : '');
    const swing = R.swing;
    chipsEl.innerHTML =
      chip('c-head', 'Net head', fmt(R.net, 1) + ' m') + chip('c-flow', 'Flow', fmt(R.Q, 1) + ' m³/s') + chip('c-mw', 'Output', fmt(R.MW, 1) + ' MW') +
      chip('c-surge', 'Surge tank', 'RL ' + fmt(R.surge, 1) + (Math.abs(swing) > 0.3 ? (swing > 0 ? ' ▲' : ' ▼') : '')) +
      chip(R.spill ? 'c-spill' : 'c-off', 'Spillway', R.spill ? fmt(R.spill, 0) + ' m³/s' : (sim.spill ? 'below crest' : 'closed'));
    readEl.textContent = R.running ? R.running + ' unit' + (R.running > 1 ? 's' : '') + ' · ' + fmt(R.MW, 1) + ' MW · ' + R.rpm + ' rpm' : 'Units stopped · ' + (sim.unitsOn ? 'gates closed' : 'no unit online');
  }

  /* ---------- the rest of the information column ---------- */
  $('#plate').innerHTML = '<h2>Hydro power plant</h2><dl>' + HY.PLATE.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl><p class="ex">Example values for teaching</p>';
  $('#principle').innerHTML = '<h2 class="eyebrow">Working principle</h2><p>' + esc(HY.PRINCIPLE) + '</p><div class="formulas">' + HY.FORMULAS.map((f) => '<div class="formula">' + esc(f) + '</div>').join('') + '</div>';
  renderDetail();

  /* ---------- run and pause, focus view, full screen ---------- */
  let running = !reduceMotion;
  const runBtn = $('#run');
  const markRun = () => { runBtn.setAttribute('aria-pressed', String(running)); runBtn.textContent = running ? 'Pause' : 'Run'; };
  runBtn.addEventListener('click', () => { running = !running; markRun(); });
  markRun();
  const focusBtn = $('#focusBtn'), fsBtn = $('#fsBtn');
  function reframeSoon() { requestAnimationFrame(() => requestAnimationFrame(() => { resize(); if (mode !== 'walkthrough') setMode(mode); else if (sel >= 0) focusPart(sel); })); }
  function setFocus(on, quiet) {
    app.classList.toggle('focus', on); focusBtn.setAttribute('aria-pressed', String(on)); focusBtn.textContent = on ? 'Show panels' : 'Focus view';
    try { localStorage.setItem('electrica-hydro-focus', on ? '1' : '0'); } catch (e) { /* remembering is optional */ }
    if (!quiet) reframeSoon();
  }
  focusBtn.addEventListener('click', () => setFocus(!app.classList.contains('focus')));
  try { if (localStorage.getItem('electrica-hydro-focus') === '1') setFocus(true, true); } catch (e) { /* ignore */ }
  if (document.fullscreenEnabled && viewerEl.requestFullscreen) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else viewerEl.requestFullscreen().catch(() => {}); });
    document.addEventListener('fullscreenchange', () => { fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; reframeSoon(); });
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const n = (k, d) => { const v = parseFloat(tok(k)); return isNaN(v) ? d : v; };
    S.applyTheme({
      ground: tok('--ground') || '#b8b49a', rock: tok('--rock') || '#a49d90', bank: tok('--bank') || '#c9c1ac',
      contour: tok('--contour') || '#4a4a40', contourA: n('--contour-a', 0.22), water: tok('--water') || '#6e9cc4',
      strata: tok('--strata') || '#ffffff', soil: tok('--soil') || '#8a7a62', line: tok('--mid') || '#8a8a8f', halo: n('--halo-a', 0.3), xray: tok('--xray') || '#4f6f8c',
    });
    refreshLook();
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();

  /* ---------- size and loop ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); aspect = w / h; stageH = h;
    camera.left = -aspect; camera.right = aspect; camera.top = 1; camera.bottom = -1; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  setMode('overview');
  go(fit(S.fitPts, viewDir(AZ, EL), 0.97), true);
  renderer.shadowMap.needsUpdate = true;
  statusEl.hidden = true;
  let last = performance.now(), uiT = 1;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) sim.step(dt);
    const R = sim.read();
    S.update(R, dt, running);
    if (fly) {
      const u = Math.min(1, (now - fly.t0) / fly.dur), e = ease(u);
      controls.target.lerpVectors(fly.fT, fly.tT, e); camera.position.lerpVectors(fly.fP, fly.tP, e);
      camera.zoom = fly.fZ * Math.pow(fly.tZ / fly.fZ, e); camera.updateProjectionMatrix();
      if (u >= 1) fly = null;
    }
    controls.update();
    S.setDotScale((stageH / 2) * camera.zoom);
    placeLabels();
    uiT += dt;
    if (dirty || (running && uiT > 0.2)) { uiT = 0; dirty = false; renderReadings(R); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
  window.__HY = { sim: sim, S: S, camera: camera, controls: controls, setMode: setMode, select: select };
})();
