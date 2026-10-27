/* Electrica Substation: the page. Sets up the 3D viewer, links it to the single-line
   diagram and the network, and runs the details panel, the exercises, the arrangement
   comparison and the guided tour. */
(function () {
  const SS = window.SS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stage = $('#stage'), statusEl = $('#status'), app = $('#app');
  if (!window.THREE || !THREE.OrbitControls) {
    statusEl.textContent = 'The 3D library did not load. Check that js/vendor/three.min.js and js/vendor/OrbitControls.js are in place.';
    return;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const EQ = SS.EQUIP, DEV = SS.DEV;
  const net = new SS.Network();

  /* ---------- renderer, scene, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.domElement.className = 'gl';
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const scene = new THREE.Scene();
  const bg = new THREE.Color(tok('--stage') || '#d6dde2');
  scene.background = bg; scene.fog = new THREE.Fog(bg, 300, 760);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 1400);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.09; controls.minDistance = 3; controls.maxDistance = 360;
  controls.maxPolarAngle = Math.PI / 2 - 0.04; controls.rotateSpeed = 0.7; controls.zoomSpeed = 1.1;

  scene.add(new THREE.HemisphereLight(0xeef3f8, 0x5f5c52, 0.62));
  const sun = new THREE.DirectionalLight(0xfff3e0, 0.95);
  sun.position.set(70, 115, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 80, top: 70, bottom: -70, near: 20, far: 360 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xcfdcff, 0.32); fill.position.set(-70, 45, -90); scene.add(fill);
  /* a soft sky for reflections on metal and porcelain */
  (function env() {
    const es = new THREE.Scene();
    const geo = new THREE.SphereGeometry(50, 32, 16), col = [], c = new THREE.Color();
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = geo.attributes.position.getY(i) / 50;
      c.setRGB(0.42, 0.45, 0.47).lerp(new THREE.Color(0.86, 0.9, 0.95), Math.max(0, y) * 0.9 + 0.1);
      if (y < 0) c.setRGB(0.36, 0.34, 0.3);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    es.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(es, 0.04).texture;
    pm.dispose();
  })();

  let S;
  try { S = SS.buildScene(THREE, {}); }
  catch (err) { statusEl.textContent = 'The substation model could not be built: ' + err.message; console.error(err); return; }
  scene.add(S.root);
  S.root.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = 0.55; });

  /* ---------- power-flow particles ---------- */
  const dotTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const dotMat = (col, over, sz) => new THREE.PointsMaterial({ color: col, map: dotTex, size: sz || 9, sizeAttenuation: false, transparent: true, depthWrite: false, depthTest: !over });
  const DM = { 110: dotMat(0xff7a1f), 22: dotMat(0x2a86ff, false, 7), o110: dotMat(0xff7a1f, true), o22: dotMat(0x2a86ff, true, 7) };
  const flowG = new THREE.Group(); scene.add(flowG);
  const flows = S.routes.map((r) => {
    const seg = [0];
    for (let i = 1; i < r.pts.length; i++) seg.push(seg[i - 1] + r.pts[i].distanceTo(r.pts[i - 1]));
    const L = seg[seg.length - 1], n = Math.max(3, Math.round(L / (r.kv === 110 ? 3.2 : 2.6)));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(geo, DM[(r.over ? 'o' : '') + r.kv]);
    pts.frustumCulled = false; pts.renderOrder = r.over ? 5 : 1; flowG.add(pts);
    return { r: r, seg: seg, L: L, n: n, pts: pts, flow: 0, ph: Math.random() * L };
  });
  const tmp = new THREE.Vector3();
  function placeFlows(dt) {
    flows.forEach((f) => {
      const on = Math.abs(f.flow) > 0.05;
      f.pts.visible = on && layers.flow;
      if (!f.pts.visible) return;
      const speed = (f.r.kv === 110 ? 7 : 3) * (0.6 + Math.min(1, Math.abs(f.flow) / 25)) * (reduceMotion ? 0.35 : 1);
      f.ph = (f.ph + Math.sign(f.flow) * speed * dt + f.L) % f.L;
      const a = f.pts.geometry.attributes.position;
      for (let i = 0; i < f.n; i++) {
        const s = (f.ph + (i * f.L) / f.n) % f.L;
        let k = 1; while (k < f.seg.length - 1 && f.seg[k] < s) k++;
        const u = (s - f.seg[k - 1]) / Math.max(1e-6, f.seg[k] - f.seg[k - 1]);
        tmp.lerpVectors(f.r.pts[k - 1], f.r.pts[k], u);
        a.setXYZ(i, tmp.x, tmp.y + 0.12, tmp.z);
      }
      a.needsUpdate = true;
    });
  }

  /* ---------- labels and dimensions ---------- */
  const labelsEl = $('#labels');
  const labs = S.labels.map((l) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lab lab-' + l.cls; b.textContent = l.text; b.dataset.eq = l.eq || '';
    labelsEl.appendChild(b);
    return { l: l, el: b };
  });
  labelsEl.addEventListener('click', (e) => { const b = e.target.closest('.lab'); if (b && b.dataset.eq) select(b.dataset.eq, { fly: true }); });
  const selLab = document.createElement('div'); selLab.className = 'lab lab-sel'; selLab.hidden = true; labelsEl.appendChild(selLab);
  const dimG = new THREE.Group(); dimG.visible = false; scene.add(dimG);
  const dimMat = new THREE.LineBasicMaterial({ color: 0x1b2a36, depthTest: false, transparent: true });
  S.dims.forEach((d) => {
    const t = d.tick, p = [d.a, d.b, d.a.clone().sub(t), d.a.clone().add(t), d.b.clone().sub(t), d.b.clone().add(t)];
    const ln = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p), dimMat); ln.renderOrder = 6; dimG.add(ln);
    const b = document.createElement('div'); b.className = 'lab lab-dim'; b.textContent = d.text; labelsEl.appendChild(b);
    labs.push({ l: { pos: d.at === 'end' ? d.b.clone().add(V(0, 0.9, 0)) : d.a.clone().add(d.b).multiplyScalar(0.5), cls: 'dim' }, el: b });
  });
  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    labs.forEach((o) => {
      const c = o.l.cls;
      const show = c === 'dim' ? layers.dims : c === 'room' ? layers.roof : layers.labels;
      if (!show) { if (!o.el.hidden) o.el.hidden = true; return; }
      tmp.copy(o.l.pos).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      const dist = camera.position.distanceTo(o.l.pos);
      const hide = tmp.z > 1 || x < 4 || y < 4 || x > w - 4 || y > h - 4 || (c === 'dev' && dist > 62) || (c === 'room' && dist > 150) || (c === 'big' && dist < 14) ||
        (o.l.eq && o.l.eq === sel && c !== 'room') || (o.l.eq === 'building' && layers.roof);
      o.el.hidden = hide;
      if (!hide) o.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,' + (c === 'dim' ? '-50%' : '-100%') + ')';
    });
    if (sel && selBox) {
      selBox.getCenter(tmp); tmp.y = selBox.max.y + 0.6; tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      selLab.hidden = tmp.z > 1 || x < 0 || y < 0 || x > w || y > h;
      selLab.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
    } else selLab.hidden = true;
  }

  /* ---------- layers ---------- */
  const layers = { flow: true, labels: true, dims: false, earth: false, roof: false };
  function setLayer(k, on) {
    layers[k] = on;
    $$('[data-layer="' + k + '"]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    if (k === 'earth') S.earth.visible = on;
    if (k === 'dims') dimG.visible = on;
    if (k === 'roof') { S.roof.visible = !on; S.upper.visible = !on; renderer.shadowMap.needsUpdate = true; }
    if (k === 'flow') S.apply(net, on);
  }
  $$('[data-layer]').forEach((b) => b.addEventListener('click', () => setLayer(b.dataset.layer, !layers[b.dataset.layer])));

  /* ---------- camera moves ---------- */
  let fly = null;
  function flyTo(pos, target, dur) {
    if (reduceMotion || dur === 0) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
    fly = { t0: performance.now(), dur: dur || 1100, fP: camera.position.clone(), tP: pos, fT: controls.target.clone(), tT: target };
  }
  const VIEWS = {
    overview: () => [V(-24, 54, 76), V(-6, 0, 3)],
    plan: () => [V(-4, 150, 0.01), V(-4, 0, 0)],
    elevation: () => [V(-24, 6.5, 80), V(-24, 6, 16)],
  };
  function view(name, dur) {
    const v = VIEWS[name]();
    const asp = camera.aspect || 1.6, k = asp < 1.1 ? 1.55 : asp < 1.5 ? 1.18 : 1;
    const dir = v[0].clone().sub(v[1]).multiplyScalar(k);
    flyTo(v[1].clone().add(dir), v[1], dur);
  }
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => { stopTour(); view(b.dataset.view); }));
  function frameEq(id) {
    let eq = id, bx = S.boundsOf(eq);
    if (!bx && DEV[id] && DEV[id].kind === 'es') { eq = id === 'A831' || id === 'B831' ? 'sb22' : relatedPanel(id); bx = S.boundsOf(eq); }
    if (!bx && id === 'remA') bx = S.boundsOf('lineA');
    if (!bx && id === 'remB') bx = S.boundsOf('lineB');
    if (!bx) return;
    const c = bx.getCenter(new THREE.Vector3()), size = bx.getSize(new THREE.Vector3());
    let r = Math.max(size.x, size.y, size.z);
    if (id === 'remA' || id === 'remB') { flyTo(V(-150, 40, c.z + 60), V(-90, 10, c.z)); return; }
    if (S.isIndoor(eq) || S.isIndoor(id)) {
      if (!layers.roof) setLayer('roof', true);
      r = Math.max(r, 3.5);
      flyTo(c.clone().add(V(r * 1.5 + 5, r * 1.1 + 6, r * 0.9 + 3)), c);
      return;
    }
    r = Math.max(r, 4);
    const dir = camera.position.clone().sub(controls.target); dir.y = 0;
    if (dir.lengthSq() < 1) dir.set(0.4, 0, 1);
    dir.normalize();
    const d = Math.min(150, r * 1.9 + 6);
    flyTo(c.clone().add(dir.multiplyScalar(d)).add(V(0, d * 0.55, 0)), c);
  }
  function relatedPanel(es) {
    if (es === 'A531') return 'A552';
    if (es === 'B531') return 'B552';
    const f = Object.keys(SS.FEEDERS).find((k) => k[0] === es[0]);
    return f || 'sb22';
  }

  /* ---------- picking and selection ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(S.pickables, false);
    for (const h of hits) { if (visibleChain(h.object)) return h.object.userData.eq; }
    return null;
  }
  let sel = null, selBox = null;
  const selHelper = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0xe07a2e));
  selHelper.material.depthTest = false; selHelper.material.transparent = true; selHelper.renderOrder = 7; selHelper.visible = false; scene.add(selHelper);
  function eqInfo(id) { return EQ[id] || null; }
  function select(id, o) {
    o = o || {};
    if (id === 'sb22b') id = 'sb22';
    sel = id && (eqInfo(id) || DEV[id]) ? id : null;
    let bx = sel ? S.boundsOf(sel) : null;
    if (sel && !bx && DEV[sel] && DEV[sel].kind === 'es') bx = S.boundsOf(sel === 'A831' || sel === 'B831' ? 'sb22' : relatedPanel(sel));
    selBox = bx;
    if (bx) { selHelper.box.copy(bx).expandByScalar(0.25); selHelper.visible = true; } else selHelper.visible = false;
    selLab.textContent = sel ? (eqInfo(sel) ? eqInfo(sel).id : sel) : '';
    sld.select(sel);
    renderDetails();
    if (o.fly && sel) frameEq(sel);
    if (o.pop) showPop(sel); else if (!o.keepPop) hidePop();
    if (sel && o.tab !== false) showTab('details');
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; if (fly) fly = null; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    const id = pick(e);
    select(id, { pop: id && sld.has(id) && DEV[id] && DEV[id].kind !== 'tx' });
  });
  const tipEl = $('#tip');
  let hoverQ = false;
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || down || hoverQ) return;
    hoverQ = true;
    requestAnimationFrame(() => {
      hoverQ = false;
      const id = pick(e), info = id && eqInfo(id);
      renderer.domElement.style.cursor = info ? 'pointer' : 'grab';
      if (!info) { tipEl.hidden = true; return; }
      const r = stage.getBoundingClientRect();
      tipEl.textContent = info.name; tipEl.hidden = false;
      tipEl.style.transform = 'translate(' + (e.clientX - r.left + 14) + 'px,' + (e.clientY - r.top + 12) + 'px)';
    });
  });
  renderer.domElement.addEventListener('pointerleave', () => { tipEl.hidden = true; });

  /* ---------- single-line diagram and operating popover ---------- */
  const popEl = $('#pop'), wrap = $('#sldWrap'), msgEl = $('#sldMsg');
  const sld = SS.SLD($('#sld'), net, (id) => {
    if (!id) { hidePop(); return; }
    select(id, { fly: true, pop: true });
  });
  const KIND = { cb: 'Circuit breaker', ds: 'Disconnector', es: 'Earth switch', src: 'Remote end breaker' };
  function stateWord(id) { const d = DEV[id]; return net.st[id] ? (d.kind === 'es' ? 'Closed (earthed)' : 'Closed') : 'Open'; }
  function opButton(id, cls) {
    const c = net.check(id), verb = net.st[id] ? 'Open' : 'Close';
    return '<button type="button" class="op ' + (cls || '') + (net.st[id] ? ' to-open' : ' to-close') + '" data-op="' + id + '"' + (c.ok ? '' : ' aria-disabled="true"') + '>' + verb + ' ' + esc(id[0] === 'r' ? 'remote end' : id) + '</button>' +
      (c.ok ? '' : '<p class="why">' + esc(c.reason) + '</p>');
  }
  function showPop(id) {
    if (!id || !DEV[id] || DEV[id].kind === 'tx') { hidePop(); return; }
    const info = eqInfo(id);
    popEl.innerHTML = '<button type="button" class="x" aria-label="Close">×</button><p class="pk">' + esc(KIND[DEV[id].kind]) + '</p><p class="pt"><b>' + esc(info ? info.id : id) + '</b> <span class="st ' + (net.st[id] ? 'on' : 'off') + '">' + stateWord(id) + '</span></p>' + opButton(id);
    popEl.hidden = false; popEl.dataset.id = id;
    const r = sld.rectOf(id), wr = wrap.getBoundingClientRect();
    if (!r) return;
    const pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    let x = r.left - wr.left + wrap.scrollLeft + r.width / 2 - pw / 2, y = r.bottom - wr.top + wrap.scrollTop + 6;
    x = Math.max(4 + wrap.scrollLeft, Math.min(x, wrap.scrollLeft + wr.width - pw - 4));
    if (y + ph > wrap.scrollTop + wr.height - 2) y = r.top - wr.top + wrap.scrollTop - ph - 6;
    popEl.style.left = x + 'px'; popEl.style.top = Math.max(2, y) + 'px';
  }
  function hidePop() { popEl.hidden = true; popEl.dataset.id = ''; }
  popEl.addEventListener('click', (e) => { if (e.target.closest('.x')) hidePop(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    if (!b) return;
    operate(b.dataset.op);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePop(); });
  function say(msg, kind) {
    msgEl.textContent = msg; msgEl.className = 'sld-msg ' + (kind || '');
  }
  function operate(id) {
    const r = net.operate(id);
    if (!r.ok) say(r.reason, 'blocked');
  }
  net.on((ev) => {
    if (ev.msg) say(ev.msg, ev.type === 'blocked' ? 'blocked' : ev.type === 'trip' ? 'trip' : '');
    refresh();
    if (popEl.dataset.id) showPop(popEl.dataset.id);
  });
  $('#sldSize').addEventListener('click', (e) => {
    const on = !app.classList.contains('sld-big');
    app.classList.toggle('sld-big', on); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'Smaller' : 'Enlarge';
    hidePop();
  });

  /* ---------- supply status chips ---------- */
  const supplyEl = $('#supply');
  function chip(state, label, value) { return '<span class="chip s-' + state + '"><i></i>' + esc(label) + (value ? ' <b>' + esc(value) + '</b>' : '') + '</span>'; }
  function renderSupply() {
    const h = [];
    ['A', 'B'].forEach((L) => {
      const n = 'L' + L, s = net.fault.indexOf(n) >= 0 && !net.st['rem' + L] ? 'fault' : net.nodeState(n);
      h.push(chip(s, 'Line ' + L, s === 'l110' ? net.lineMW[L].toFixed(1) + ' MW' : s === 'fault' ? 'fault' : s === 'earthed' ? 'earthed' : 'dead'));
    });
    ['1', '2'].forEach((T) => {
      const live = net.isLive('T' + T + 'H'), mw = net.txMW('T' + T);
      const faulted = net.fault.indexOf('T' + T + 'H') >= 0;
      h.push(chip(faulted ? 'fault' : live ? 'l110' : 'dead', 'T' + T, live ? mw.toFixed(1) + ' MW · ' + Math.round(mw / 0.95 / 60 * 100) + '%' : faulted ? 'tripped' : 'off'));
    });
    const on = net.customersOn(), all = net.CUST.length;
    h.push(chip(on === all ? 'l22' : on ? 'warn' : 'dead', 'Customers', on + ' / ' + all));
    const st = (net.supplied.D252 ? 1 : 0) + (net.supplied.E252 ? 1 : 0);
    h.push(chip(st ? 'l22' : 'dead', 'Station supply', st === 2 ? 'ST1 + ST2' : st ? (net.supplied.D252 ? 'ST1 only' : 'ST2 only') : 'on batteries'));
    supplyEl.innerHTML = h.join('');
  }

  /* ---------- details panel ---------- */
  const pDet = $('#p-details');
  function devBlock(id) {
    const d = DEV[id];
    if (!d || d.kind === 'tx') return '';
    const info = eqInfo(id);
    return '<div class="devctl"><p><span class="kind">' + esc(KIND[d.kind]) + ' ' + esc(info ? info.id : id) + '</span> <span class="st ' + (net.st[id] ? 'on' : 'off') + '">' + stateWord(id) + '</span></p>' + opButton(id, 'big') +
      (info && info.interlock ? '<p class="il"><b>Interlock</b> ' + esc(info.interlock) + '</p>' : '') + '</div>';
  }
  function renderDetails() {
    if (!sel) { pDet.innerHTML = introHtml(); return; }
    const e = eqInfo(sel) || { name: sel, kind: KIND[DEV[sel].kind], id: sel, role: '', specs: [] };
    let h = '<p class="eyebrow">' + esc(e.kind) + '</p><h3 class="dh">' + esc(e.name) + '</h3>';
    h += devBlock(sel);
    const selSw = DEV[sel] && DEV[sel].kind !== 'tx';
    (e.rel || []).forEach((r) => { if (DEV[r] && DEV[r].kind !== 'tx' && r !== sel && (DEV[r].kind === 'es' || !selSw)) h += devBlock(r); });
    h += '<p class="role">' + esc(e.role) + '</p>';
    h += '<dl class="dd">';
    if (e.notice) h += '<dt>What to look for</dt><dd>' + esc(e.notice) + '</dd>';
    if (e.std) h += '<dt>In the standard</dt><dd>' + esc(e.std) + '</dd>';
    h += '</dl>';
    if (e.specs && e.specs.length) h += '<table class="specs"><tbody>' + e.specs.map((s) => '<tr><th scope="row">' + esc(s[0]) + '</th><td>' + esc(s[1]) + '</td></tr>').join('') + '</tbody></table>';
    const rel = (e.rel || []).filter((r) => r !== sel && (eqInfo(r)));
    if (rel.length) h += '<p class="rel"><span>Related</span>' + rel.map((r) => '<button type="button" class="relb" data-sel="' + r + '">' + esc(eqInfo(r).id) + '</button>').join('') + '</p>';
    h += '<p class="rel"><button type="button" class="relb" data-sel="">Back to overview</button></p>';
    pDet.innerHTML = h;
  }
  function introHtml() {
    return '<p class="eyebrow">About this model</p><h3 class="dh">A through-fed zone substation</h3>' +
      '<p class="role">Two 110 kV lines feed two 60 MVA transformers through an ‘H’ arrangement: each line has its own breaker and the bus section breaker A752 forms the bar of the H. The transformers supply an indoor 22 kV switchboard with a sectionalised single bus and ten circuits.</p>' +
      '<dl class="dd"><dt>Try this</dt><dd>Click any piece of equipment in 3D or on the single-line diagram. Operate a breaker or switch and watch the colours and the power flow change. Then try the Exercises.</dd>' +
      '<dt>Colours</dt><dd>Copper: live at 110 kV. Blue: live at 22 kV. Green: earthed. Grey: dead. Breakers: red when closed, green when open.</dd>' +
      '<dt>Based on</dt><dd>TasNetworks “Substation General Equipment Detail and Layout Standard” (R1089602, July 2018): the equipment list in section 2, the ‘H’ arrangement in Appendix D and the single bus in Appendix F. Layout, dimensions and ratings marked “typical” are illustrative; clearances in a real design follow AS 2067 / IEC 61936-1.</dd></dl>' +
      '<table class="specs"><tbody><tr><th scope="row">Rated currents of a 60 MVA transformer</th><td>I = S / (√3 V) = 315 A at 110 kV, 1575 A at 22 kV</td></tr>' +
      '<tr><th scope="row">Phase-to-earth clearance at 123 kV (typical)</th><td>N ≈ 1.1 m</td></tr><tr><th scope="row">Live parts above ground (typical)</th><td>at least N + 2.25 m ≈ 3.35 m; insulator bases at least 2.25 m</td></tr>' +
      '<tr><th scope="row">Load in this model</th><td>' + Object.keys(SS.FEEDERS).reduce((a, k) => a + (SS.FEEDERS[k].mw || 0), 0).toFixed(1) + ' MW on six customer feeders and two station transformers</td></tr></tbody></table>';
  }
  pDet.addEventListener('click', (e) => { const b = e.target.closest('[data-sel]'); if (b) select(b.dataset.sel || null, { fly: !!b.dataset.sel }); });

  /* ---------- tabs ---------- */
  const tabs = $$('[role="tab"]');
  function showTab(name) {
    tabs.forEach((t) => {
      const on = t.id === 't-' + name;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t.id.slice(2)));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); showTab(n.id.slice(2));
    });
  });

  /* ---------- exercises ---------- */
  const pEx = $('#p-ex');
  let active = null, hintN = 0, showAns = false, done = false;
  function renderEx() {
    let h = '';
    if (active) {
      const sc = active, goals = sc.goals.map(([t, f]) => [t, f(net)]), ok = goals.every((g) => g[1]);
      if (ok && !done) { done = true; say('Exercise complete: ' + sc.title + '. Well done.', 'done'); }
      h += '<div class="exhead"><p class="eyebrow">Exercise · level ' + sc.level + '</p><h3 class="dh">' + esc(sc.title) + '</h3></div>';
      h += '<p class="story">' + esc(sc.story) + '</p><p class="task"><b>Your task</b> ' + esc(sc.task) + '</p>';
      h += '<ul class="goals">' + goals.map((g) => '<li class="' + (g[1] ? 'ok' : '') + '"><i aria-hidden="true"></i>' + esc(g[0]) + '<span class="vh">' + (g[1] ? ' (done)' : ' (not yet)') + '</span></li>').join('') + '</ul>';
      if (ok) h += '<p class="win">Complete in ' + net.undoStack.length + ' operation' + (net.undoStack.length === 1 ? '' : 's') + '. The model answer used ' + sc.answer.length + '.</p>';
      h += '<div class="exbtns"><button type="button" class="tool" data-x="undo"' + (net.undoStack.length ? '' : ' disabled') + '>Undo</button><button type="button" class="tool" data-x="restart">Restart</button>' +
        (hintN < sc.hints.length ? '<button type="button" class="tool" data-x="hint">Hint</button>' : '') + '<button type="button" class="tool" data-x="answer">' + (showAns ? 'Hide answer' : 'Show answer') + '</button><button type="button" class="tool" data-x="leave">All exercises</button></div>';
      if (hintN) h += '<ol class="hints">' + sc.hints.slice(0, hintN).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol>';
      if (showAns) h += '<ol class="answer">' + sc.answer.map((t) => '<li><button type="button" class="relb" data-sel="' + t.split(' ')[1] + '">' + esc(t) + '</button></li>').join('') + '</ol>';
    } else {
      h += '<p class="eyebrow">Switching practice</p><h3 class="dh">Exercises</h3><p class="role">Each exercise starts with something gone wrong (or a job to do). Operate breakers and switches on the diagram or in 3D. The interlocks stop unsafe moves and explain why.</p>';
      h += '<ol class="exlist">' + SS.SCENARIOS.map((s) => '<li><button type="button" data-start="' + s.id + '"><b>' + esc(s.title) + '</b><span>Level ' + s.level + ' · ' + esc(s.task) + '</span></button></li>').join('') + '</ol>';
      h += '<div class="exbtns"><button type="button" class="tool" data-x="undo"' + (net.undoStack.length ? '' : ' disabled') + '>Undo</button><button type="button" class="tool" data-x="reset">Reset to normal</button></div>';
    }
    if (net.log.length) h += '<p class="eyebrow logh">Switching log</p><ol class="log">' + net.log.slice().reverse().map((l) => '<li class="k-' + l.kind + '"><time>' + l.t + '</time> ' + esc(l.msg) + '</li>').join('') + '</ol>';
    pEx.innerHTML = h;
  }
  pEx.addEventListener('click', (e) => {
    const s = e.target.closest('[data-start]'), x = e.target.closest('[data-x]'), sb = e.target.closest('[data-sel]');
    if (s) startScenario(s.dataset.start);
    if (sb) select(sb.dataset.sel, { fly: true, pop: true, tab: false });
    if (!x) return;
    const k = x.dataset.x;
    if (k === 'undo') net.undo();
    if (k === 'restart') startScenario(active.id);
    if (k === 'hint') { hintN++; renderEx(); }
    if (k === 'answer') { showAns = !showAns; renderEx(); }
    if (k === 'leave') { active = null; net.reset(); }
    if (k === 'reset') net.reset();
  });
  function startScenario(id) {
    active = SS.SCENARIOS.find((s) => s.id === id); hintN = 0; showAns = false; done = false;
    net.startScenario(active);
    showTab('ex');
    const f = active.fault[0];
    const where = { LA: 'lineA', BA: 'busA', T1H: 'T1', FC: 'C252' }[f] || 'T1';
    select(where, { fly: true, tab: false });
  }

  /* ---------- arrangements ---------- */
  $('#p-arr').innerHTML = '<p class="eyebrow">Section 3 of the standard</p><h3 class="dh">Switchyard arrangements</h3><p class="role">“TasNetworks utilising typical breaker and a half or double bus for switching stations and ‘H’ arrangement for through fed substations.” This model uses the ‘H’ arrangement at 110 kV and a sectionalised single bus at 22 kV.</p>' +
    '<div class="arrs">' + SS.ARRANGEMENTS.map((a) => '<article class="arr' + (a.id === 'h' || a.id === 'sb' ? ' here' : '') + '"><svg viewBox="0 0 160 96" aria-hidden="true">' + a.svg + '</svg><div><h4>' + esc(a.t) + (a.id === 'h' || a.id === 'sb' ? ' <span class="badge">this model</span>' : '') + '</h4><p class="ref">' + esc(a.ref) + ' · ' + esc(a.use) + '</p><p><b>Breakers:</b> ' + esc(a.cb) + '</p><p><b>Strength:</b> ' + esc(a.good) + '</p><p><b>Weakness:</b> ' + esc(a.bad) + '</p></div></article>').join('') + '</div>';

  /* ---------- guided tour ---------- */
  const tourEl = $('#tour'), tourText = $('#tourText'), tourBtn = $('#tourBtn');
  let tourI = -1;
  function goStop(i) {
    tourI = Math.max(0, Math.min(SS.TOUR.length - 1, i));
    app.classList.add('tour-on');
    const t = SS.TOUR[tourI];
    tourEl.hidden = false; tourBtn.setAttribute('aria-pressed', 'true');
    tourText.innerHTML = '<b>' + (tourI + 1) + ' / ' + SS.TOUR.length + '</b><strong>' + esc(t.t) + '</strong> ' + esc(t.d);
    $('#tourPrev').disabled = tourI === 0; $('#tourNext').textContent = tourI === SS.TOUR.length - 1 ? 'Finish' : 'Next';
    if (!!t.roof !== layers.roof) setLayer('roof', !!t.roof);
    setLayer('earth', !!t.earth);
    if (t.view) view(t.view); else flyTo(V(t.cam[0], t.cam[1], t.cam[2]), V(t.at[0], t.at[1], t.at[2]), 1400);
    if (t.eq) select(t.eq, { tab: true }); else select(null);
  }
  function stopTour() { if (tourI < 0) return; tourI = -1; tourEl.hidden = true; app.classList.remove('tour-on'); tourBtn.setAttribute('aria-pressed', 'false'); }
  tourBtn.addEventListener('click', () => { if (tourI >= 0) stopTour(); else goStop(0); });
  $('#tourPrev').addEventListener('click', () => goStop(tourI - 1));
  $('#tourNext').addEventListener('click', () => { if (tourI >= SS.TOUR.length - 1) { stopTour(); view('overview'); } else goStop(tourI + 1); });
  $('#tourStop').addEventListener('click', () => { stopTour(); });

  /* ---------- full screen ---------- */
  const fsBtn = $('#fsBtn'), viewerEl = $('#viewer');
  if (viewerEl.requestFullscreen) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else viewerEl.requestFullscreen().catch(() => {}); });
    document.addEventListener('fullscreenchange', () => { fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
  }

  /* ---------- everything that follows a change in the network ---------- */
  function refresh() {
    S.apply(net, layers.flow);
    flows.forEach((f) => { f.flow = net.flow[f.r.edge] || 0; });
    sld.update(); renderSupply();
    if (sel) renderDetails();
    renderEx();
  }

  /* ---------- theme ---------- */
  function applyTheme() { bg.set(tok('--stage') || '#d6dde2'); scene.fog.color.copy(bg); dimMat.color.set(tok('--ink') || '#121c25'); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();

  /* ---------- size and loop ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  S.apply(net, true); S.snap(); refresh(); renderDetails();
  view('overview', 0);
  renderer.shadowMap.needsUpdate = true;
  statusEl.hidden = true;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.update(dt)) renderer.shadowMap.needsUpdate = true;
    placeFlows(dt);
    if (fly) {
      const u = Math.min(1, (now - fly.t0) / fly.dur), e = ease(u);
      controls.target.lerpVectors(fly.fT, fly.tT, e); camera.position.lerpVectors(fly.fP, fly.tP, e);
      if (u >= 1) fly = null;
    }
    controls.update();
    placeLabels();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
  window.__SS = { net: net, S: S, camera: camera, controls: controls, select: select, view: view, setLayer: setLayer, renderer: renderer };
})();
