/*
  Electrica core: the 3D viewer, the view modes and the page around them.

  You normally do not need to edit this file. Each machine lives in its own
  file in js/machines/ and calls Electrica.register({...}). See README.md and
  js/machines/_template.js for how to add one.
*/
window.Electrica = (function () {
  'use strict';

  const defs = [];

  function register(def) {
    if (!def || !def.id || typeof def.build !== 'function') {
      console.error('Electrica.register needs at least an id and a build function.', def);
      return;
    }
    defs.push(def);
  }

  function start() {
    const $ = (s) => document.querySelector(s);
    const stageEl = $('#stage');
    const statusEl = $('#status');
    if (!window.THREE || !THREE.OrbitControls) {
      statusEl.textContent = 'The 3D library did not load. Check that js/vendor/three.min.js and js/vendor/OrbitControls.js are in place.';
      return;
    }
    if (!defs.length) {
      statusEl.textContent = 'No machines are registered. Add machine script lines to index.html.';
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const toV = (a, fallback) => (a instanceof THREE.Vector3 ? a.clone() : Array.isArray(a) ? V(a[0], a[1], a[2]) : fallback);
    const TAU = Math.PI * 2;
    const pad = (n) => String(n).padStart(2, '0');
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* ---------- colours from the page theme ---------- */
    const COL = {};
    const fluxMats = [];
    function readColors() {
      ['--stage', '--bench', '--flux', '--copper', '--ink', '--muted', '--line', '--phR', '--phY', '--phB'].forEach((k) => { COL[k] = tok(k) || '#888888'; });
    }
    readColors();

    /* ---------- renderer, camera, lights ---------- */
    /* The canvas is see-through: the soft studio backdrop behind it is drawn by the page (.stage in style.css). */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.localClippingEnabled = true;
    renderer.domElement.className = 'gl';
    stageEl.insertBefore(renderer.domElement, stageEl.firstChild);
    const scene = new THREE.Scene();
    /* An isometric (orthographic) camera, as in the Anatomy figures: parallel edges stay parallel and
       nothing shrinks with distance. The frustum is 2 units tall; zoom sets how much of the machine fills it.
       Each machine starts from its own camDir side, raised to the isometric 30 degrees. */
    const CAM_DIST = 60, ISO_ELEV = THREE.MathUtils.degToRad(30), FILL = 1.02;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    let aspect = 1, stageH = 1;
    const isoDir = (v) => { const az = Math.atan2(v.x, v.z); return V(Math.sin(az) * Math.cos(ISO_ELEV), Math.sin(ISO_ELEV), Math.cos(az) * Math.cos(ISO_ELEV)); };
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.09; controls.minZoom = 0.05; controls.maxZoom = 3; controls.rotateSpeed = 0.8;
    scene.add(new THREE.HemisphereLight(0xf4f7fa, 0x36414b, 0.85));
    const keyL = new THREE.DirectionalLight(0xffffff, 0.95); keyL.position.set(6, 10, 8); scene.add(keyL);
    const rimL = new THREE.DirectionalLight(0xc9dcff, 0.45); rimL.position.set(-8, 4, -6); scene.add(rimL);
    const lowL = new THREE.DirectionalLight(0xffe6d2, 0.22); lowL.position.set(2, -6, 5); scene.add(lowL);
    /* The bench level. As in the Anatomy figures the machine stands on the card itself with a soft halo
       under it (the contact shadow made in build), so the floor only marks the level and is not drawn. */
    const floorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL['--bench']) });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.visible = false; scene.add(floor);

    const clipA = new THREE.Plane(V(-1, 0, 0), 99);
    const clipB = new THREE.Plane(V(0, -1, 0), 99);

    /* Material names a machine file can use with add(). */
    const PAL = {
      lamA: [0x8e9aa5, 0.6, 0.36], lamB: [0x7c8893, 0.6, 0.4], steel: [0x6e7a85, 0.55, 0.45],
      copper: [0xc4703a, 0.75, 0.3], copperDk: [0xa95a2c, 0.75, 0.34], board: [0xcbb27a, 0, 0.85],
      paint: [0x40566a, 0.3, 0.55], shaft: [0xc8cfd6, 0.92, 0.2], alu: [0xc6cbd0, 0.85, 0.28],
      carbon: [0x2b2c30, 0.1, 0.85], brass: [0xc9a04a, 0.85, 0.28], porcelain: [0xe9e5dd, 0, 0.3],
      mica: [0x5d3c28, 0.1, 0.6], dark: [0x2c353d, 0.4, 0.55],
      R: [0xc23a2c, 0.3, 0.45], Y: [0xd9a21c, 0.3, 0.45], B: [0x2e66b2, 0.3, 0.45],
      oil: [0xc98f2a, 0, 0.2], glass: [0xcfe2ea, 0.1, 0.05], gel: [0x3d72d4, 0, 0.6], gelPink: [0xe38aa8, 0, 0.6],
      tank: [0x66737a, 0.25, 0.6], porcelainBr: [0x7b3a1f, 0.05, 0.22], rubber: [0x2a2b2d, 0, 0.9],
      galv: [0xaeb6bb, 0.85, 0.35], concrete: [0x9a968c, 0, 0.95], white: [0xf2f2ef, 0, 0.6],
    };
    function mat(k) {
      const p = PAL[k] || PAL.steel;
      if (!PAL[k]) console.warn('Electrica: unknown material "' + k + '", using steel. Known materials: ' + Object.keys(PAL).join(', '));
      return new THREE.MeshStandardMaterial({ color: p[0], metalness: p[1], roughness: p[2], side: THREE.DoubleSide, clippingPlanes: [clipA, clipB], clipIntersection: true });
    }

    /* ---------- geometry helpers (shared with machine files) ---------- */
    function rrInto(p, w, h, r) {
      const x = -w / 2, y = -h / 2;
      p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
      p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
      p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
    }
    /* Rounded rectangle W x H with a rounded rectangular hole w x h (both centred). */
    function frameShape(W, H, R, w, h, r) {
      const s = new THREE.Shape(); rrInto(s, W, H, R);
      const hole = new THREE.Path(); rrInto(hole, w, h, r); s.holes.push(hole); return s;
    }
    /* Extrude a flat shape along z, centred on z = 0. */
    function extrude(shape, depth, segs) {
      const g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: segs || 12 });
      g.translate(0, 0, -depth / 2); return g;
    }
    /* A coil (or bobbin) wound round a w x d rectangular limb: wall thickness t, inner corner radius r, height h along y. */
    function ringRR(w, d, t, r, h) {
      const g = extrude(frameShape(w + 2 * t, d + 2 * t, r + t, w, d, r), h, 8);
      g.rotateX(Math.PI / 2); return g;
    }
    /* Tube with outer radius ro and inner radius ri, length len along z. Pass a0/a1 (radians) for a sector. */
    function annulus(ro, ri, len, a0, a1, segs) {
      const s = new THREE.Shape();
      if (a0 === undefined || a0 === null) {
        s.absarc(0, 0, ro, 0, TAU, false);
        const h = new THREE.Path(); h.absarc(0, 0, ri, 0, TAU, true); s.holes.push(h);
        return extrude(s, len, segs || 48);
      }
      s.absarc(0, 0, ro, a0, a1, false); s.absarc(0, 0, ri, a1, a0, true);
      return extrude(s, len, segs || 16);
    }
    const P2 = (r, a) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));
    /* Points round a circle (for polyShape outlines and holes). */
    function circlePts(r, n, cx, cy) {
      const pts = []; cx = cx || 0; cy = cy || 0;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
      return pts;
    }
    /* A circle of radius r with n slots of the given depth. dir = +1 cuts outward (stator bore), -1 inward (rotor surface). */
    function slotPts(r, n, depth, frac, dir) {
      const pts = [], step = TAU / n, half = (step * frac) / 2, res = 4;
      for (let k = 0; k < n; k++) {
        const a0 = k * step, c = a0 + step / 2, a1 = c - half, a2 = c + half, a3 = a0 + step;
        for (let i = 0; i < res; i++) pts.push(P2(r, a0 + ((a1 - a0) * i) / res));
        pts.push(P2(r, a1)); pts.push(P2(r + dir * depth, a1)); pts.push(P2(r + dir * depth, a2)); pts.push(P2(r, a2));
        for (let i = 1; i < res; i++) pts.push(P2(r, a2 + ((a3 - a2) * i) / res));
      }
      return pts;
    }
    function polyShape(pts, holes) {
      const s = new THREE.Shape(pts);
      (holes || []).forEach((h) => s.holes.push(new THREE.Path(h)));
      return s;
    }
    const cyl = (r, len, seg) => new THREE.CylinderGeometry(r, r, len, seg || 24);
    const pol = (r, a, z) => V(r * Math.cos(a), r * Math.sin(a), z);

    /* ---------- flux particles ---------- */
    const DOT = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const SHADOW = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    /* Particles that travel round closed loops. loops: arrays of Vector3; per: particles per loop.
       Returns { obj, mat, update(shift) }: add obj to m.fluxGroup, call update(distance) from m.fluxUpdate. */
    function makeFlux(loops, per, size, color) {
      const L = loops.map((pts) => {
        const cum = [0];
        for (let i = 0; i < pts.length; i++) cum.push(cum[i] + pts[i].distanceTo(pts[(i + 1) % pts.length]));
        return { pts: pts, cum: cum, len: cum[pts.length] };
      });
      const arr = new Float32Array(loops.length * per * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const tk = '--' + (color || 'flux');
      const m = new THREE.PointsMaterial({ size: size || 0.24, map: DOT, transparent: true, depthTest: false, depthWrite: false, color: new THREE.Color(COL[tk] || COL['--flux']), opacity: 0.95 });
      m.userData.tok = tk; m.userData.size = m.size; fluxMats.push(m);
      const obj = new THREE.Points(geo, m); obj.renderOrder = 20; obj.frustumCulled = false;
      function update(shift) {
        let k = 0;
        for (const l of L) {
          const np = l.pts.length;
          for (let j = 0; j < per; j++) {
            let s = (j / per) * l.len + shift; s = ((s % l.len) + l.len) % l.len;
            let i = 0; while (i < np - 1 && l.cum[i + 1] < s) i++;
            const a = l.pts[i], b = l.pts[(i + 1) % np], seg = l.cum[i + 1] - l.cum[i], u = seg > 0 ? (s - l.cum[i]) / seg : 0;
            arr[k++] = a.x + (b.x - a.x) * u; arr[k++] = a.y + (b.y - a.y) * u; arr[k++] = a.z + (b.z - a.z) * u;
          }
        }
        geo.attributes.position.needsUpdate = true;
      }
      update(0);
      return { obj: obj, mat: m, update: update };
    }
    /* A see-through material in the flux colour, for arrows and the like. */
    function fluxMaterial(opacity, color) {
      const tk = '--' + (color || 'flux');
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL[tk] || COL['--flux']), transparent: true, opacity: opacity == null ? 0.5 : opacity, depthTest: false, depthWrite: false });
      m.userData.tok = tk; fluxMats.push(m); return m;
    }
    /* A named material with extra settings, such as a canvas texture: material('alu', { map: texture }). */
    function material(name, extra) {
      const m = mat(name);
      Object.assign(m, extra || {});
      m.needsUpdate = true; return m;
    }

    /* ---------- building a machine ---------- */
    let B = null;
    function part(o) {
      if (!B) throw new Error('part() can only be called inside a machine build function');
      o = o || {};
      const p = { name: o.name || 'Part ' + (B.parts.length + 1), role: o.role || '', material: o.material || '', look: o.look || '', meshes: [], casing: !!o.casing, idx: B.parts.length };
      B.parts.push(p); return p;
    }
    function add(p, geo, mk, o) {
      if (!B) throw new Error('add() can only be called inside a machine build function');
      o = o || {};
      const m = new THREE.Mesh(geo, mk && mk.isMaterial ? mk : mat(mk));
      m.userData.op = o.opacity == null ? 1 : o.opacity;
      if (m.userData.op < 1) { m.material.transparent = true; m.material.opacity = m.userData.op; m.material.depthWrite = false; }
      if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
      if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      m.userData.base = m.position.clone();
      m.userData.ex = o.ex ? V(o.ex[0], o.ex[1], o.ex[2]) : V(0, 0, 0);
      m.userData.part = p;
      (o.rotor ? B.rotor : B.fixed).add(m);
      p.meshes.push(m); return m;
    }
    /* Many small pieces as one mesh: merge([[geometry, { pos, rot, scale }], ...]). Faster than one mesh each. */
    function merge(items) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
      let allUv = true;
      const gs = items.map((it) => {
        const g0 = Array.isArray(it) ? it[0] : it, o = (Array.isArray(it) ? it[1] : null) || {};
        const g = g0.index ? g0.toNonIndexed() : g0.clone();
        const r = o.rot || [0, 0, 0], t = o.pos || [0, 0, 0], s = o.scale == null ? [1, 1, 1] : (typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale);
        e.set(r[0], r[1], r[2]); q.setFromEuler(e); p.set(t[0], t[1], t[2]); sc.set(s[0], s[1], s[2]);
        g.applyMatrix4(m4.compose(p, q, sc));
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) allUv = false;
        return g;
      });
      let n = 0; gs.forEach((g) => { n += g.attributes.position.count; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = allUv ? new Float32Array(n * 2) : null;
      let o3 = 0, o2 = 0;
      gs.forEach((g) => {
        P.set(g.attributes.position.array, o3); N.set(g.attributes.normal.array, o3); o3 += g.attributes.position.count * 3;
        if (U) { U.set(g.attributes.uv.array, o2); o2 += g.attributes.uv.count * 2; }
        g.dispose();
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(P, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      if (U) out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      return out;
    }
    /* A box w x h x d with softly rounded edges of radius r. */
    function rbox(w, h, d, r) {
      r = Math.max(0.0005, Math.min(r == null ? 0.02 : r, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005));
      const s = new THREE.Shape(); rrInto(s, Math.max(0.001, w - 2 * r), Math.max(0.001, h - 2 * r), Math.min(r * 0.05, 0.0004));
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0005, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 6 });
      g.translate(0, 0, -(d - 2 * r) / 2); return g;
    }

    const kit = {
      merge: merge, rbox: rbox,
      THREE: THREE, V: V, TAU: TAU, pol: pol, cyl: cyl, annulus: annulus, ringRR: ringRR, extrude: extrude,
      frameShape: frameShape, polyShape: polyShape, circlePts: circlePts, slotPts: slotPts,
      part: part, add: add, makeFlux: makeFlux, fluxMaterial: fluxMaterial, material: material,
    };

    function build(D) {
      const M = {
        root: new THREE.Group(), fixed: new THREE.Group(), rotor: new THREE.Group(), fluxGroup: new THREE.Group(), parts: [],
        speed: 0, waves: [], fluxUpdate: function () {}, cutNormals: [[-1, 0, 0], [0, -1, 0]], camDir: [7, 4, 7.5],
      };
      M.root.add(M.fixed, M.rotor, M.fluxGroup);
      B = M;
      try { D.build(kit, M); } finally { B = null; }
      M.meshes = [];
      M.parts.forEach((p) => p.meshes.forEach((m) => M.meshes.push(m)));
      if (!M.meshes.length) throw new Error('the build function did not add any parts');
      M.cutNormals = M.cutNormals.map((n) => toV(n, V(-1, 0, 0)).normalize());
      M.camDir = toV(M.camDir, V(7, 4, 7.5));
      M.waves = (M.waves || []).map((w) => ({ label: w.label || '', c: '--' + (w.color || 'flux'), f: w.f || (() => 0) }));
      M.fluxGroup.visible = false;
      const b0 = boxAt(M, M.meshes, 0), b1 = boxAt(M, M.meshes, 1);
      M.floorY = b0.min.y - 0.01;
      M.floorDrop = Math.max(0, M.floorY - (b1.min.y - 0.05));
      /* a soft contact shadow under the machine */
      const sz = b0.getSize(V(0, 0, 0)), ctr = b0.getCenter(V(0, 0, 0));
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SHADOW, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.scale.set(sz.x * 1.25 + 0.6, sz.z * 1.25 + 0.6, 1); sh.position.set(ctr.x, M.floorY + 0.006, ctr.z); sh.renderOrder = -1;
      M.root.add(sh); M.shadow = sh;
      return M;
    }

    /* ---------- state and helpers ---------- */
    const state = { mi: -1, mode: 'assembled', sep: 0, sepTarget: 0, appliedSep: -1, cut: 0, cutTarget: 0, run: false, clock: 0, sel: -1, hover: -1, step: 0 };
    let cur = null, fly = null;

    function boxAt(M, meshes, sep) {
      M.root.updateMatrixWorld(true);
      const box = new THREE.Box3();
      for (const m of meshes) {
        const saved = m.position.clone();
        m.position.copy(m.userData.base).addScaledVector(m.userData.ex, sep);
        m.updateMatrixWorld(true); box.expandByObject(m);
        m.position.copy(saved); m.updateMatrixWorld(true);
      }
      return box;
    }
    function applySep(s) {
      for (const m of cur.meshes) m.position.copy(m.userData.base).addScaledVector(m.userData.ex, s);
      floor.position.y = cur.floorY - cur.floorDrop * s;
      if (cur.shadow) { cur.shadow.position.y = floor.position.y + 0.006; cur.shadow.material.opacity = 0.5 * (1 - 0.7 * Math.min(1, s)); }
      state.appliedSep = s;
    }
    function setZoom(z) { camera.zoom = z; camera.updateProjectionMatrix(); }
    function flyTo(target, pos, zoom, instant) {
      if (instant || reduceMotion) { fly = null; controls.target.copy(target); camera.position.copy(pos); setZoom(zoom); controls.update(); return; }
      fly = { t0: performance.now(), dur: 900, fT: controls.target.clone(), tT: target.clone(), fP: camera.position.clone(), tP: pos.clone(), fZ: camera.zoom, tZ: zoom };
    }
    /* Frame the whole machine so it fills about 60 per cent of the card. */
    function frameView(sep, instant, dir) {
      const box = boxAt(cur, cur.meshes, sep), c = box.getCenter(V(0, 0, 0)), r = box.getSize(V(0, 0, 0)).length() / 2;
      const d = (dir || camera.position.clone().sub(controls.target)).clone().normalize();
      flyTo(c, c.clone().addScaledVector(d, CAM_DIST), (FILL * Math.min(1, aspect)) / r, instant);
    }
    function focusPart(i) {
      const p = cur.parts[i]; if (!p) return;
      const box = boxAt(cur, p.meshes, state.sepTarget), c = box.getCenter(V(0, 0, 0)), size = box.getSize(V(0, 0, 0)).length();
      const half = Math.max(1.05, Math.min(4.4, (size * 1.9 + 2.2) * 0.29));
      const d = camera.position.clone().sub(controls.target).normalize();
      flyTo(c, c.clone().addScaledVector(d, CAM_DIST), Math.min(1, aspect) / half);
    }
    controls.addEventListener('start', () => { fly = null; });

    /* ---------- material looks ---------- */
    const hl = new THREE.Color();
    function refreshLook() {
      if (!cur) return;
      hl.set(COL['--flux']);
      for (const p of cur.parts) {
        let op = 1;
        if (state.mode === 'flux' && p.casing) op = 0.12;
        if (state.mode === 'walkthrough' && state.sel >= 0 && p.idx !== state.sel) op = 0.14;
        const glow = p.idx === state.sel ? 0.38 : p.idx === state.hover ? 0.2 : 0;
        for (const m of p.meshes) {
          const o = Math.min(m.userData.op, op), mt = m.material, tr = o < 1;
          if (mt.transparent !== tr) { mt.transparent = tr; mt.needsUpdate = true; }
          mt.opacity = o; mt.depthWrite = !tr;
          mt.emissive.copy(hl); mt.emissiveIntensity = glow;
        }
      }
    }

    /* ---------- page UI ---------- */
    const machinesEl = $('#machines'), partsEl = $('#parts'), markersEl = $('#markers'), detailEl = $('#detail');
    const sepEl = $('#sep'), sepOut = $('#sepOut'), runBtn = $('#run'), walkEl = $('#walk'), walkText = $('#walkText');
    const scopeEl = $('#scope'), scopeC = $('#scopeC'), legendEl = $('#legend');
    const modeBtns = Array.from(document.querySelectorAll('.seg button'));
    const cFig = $('#cFig'), cTitle = $('#cTitle'), cRead = $('#cRead');

    /* The live readout in the card's bottom-right corner: what the figure is showing right now. */
    const MODE_WORD = { assembled: 'Assembled', cutaway: 'Cutaway', exploded: 'Exploded', walkthrough: 'Walkthrough', flux: 'Flux' };
    function readout() {
      if (!cur || !cRead) return;
      let s = state.sel >= 0 ? 'Part ' + pad(state.sel + 1) + ' / ' + pad(cur.parts.length) + ' · ' + cur.parts[state.sel].name
        : (MODE_WORD[state.mode] || '') + (state.sepTarget > 0.005 ? ' · ' + Math.round(state.sepTarget * 100) + '% apart' : ' · ' + cur.parts.length + ' parts');
      if (state.run) s += ' · running';
      cRead.textContent = s;
    }

    machinesEl.innerHTML = defs.map((m, i) => '<button type="button" class="mbtn" data-i="' + i + '" aria-current="false"><svg viewBox="0 0 44 44" aria-hidden="true">' + (m.icon || '<circle cx="22" cy="22" r="16"/>') + '</svg><span class="mtxt"><b>' + esc(m.short || m.name) + '</b><span>' + esc(m.kind) + '</span></span></button>').join('');
    machinesEl.addEventListener('click', (e) => { const b = e.target.closest('.mbtn'); if (b) showMachine(+b.dataset.i); });

    function renderDetail() {
      const D = defs[state.mi];
      detailEl.classList.toggle('empty', state.sel < 0);
      if (state.sel < 0) {
        detailEl.innerHTML = '<h2 class="eyebrow">Component</h2><p class="muted">Pick a component in the list, or click it in the viewer, to see what it does and what it is made of.</p>';
        return;
      }
      const p = cur.parts[state.sel];
      detailEl.innerHTML = '<h2 class="eyebrow">Component ' + pad(p.idx + 1) + ' of ' + pad(cur.parts.length) + '<span>' + esc(D.short || D.name) + '</span></h2>' +
        '<h3>' + esc(p.name) + '</h3><p>' + esc(p.role) + '</p><dl>' +
        (p.material ? '<div><dt>Made of</dt><dd>' + esc(p.material) + '</dd></div>' : '') +
        (p.look ? '<div><dt>Look for</dt><dd>' + esc(p.look) + '</dd></div>' : '') + '</dl>';
    }
    function selectPart(i, flyThere) {
      state.sel = i;
      partsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
      markersEl.querySelectorAll('.marker').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
      if (state.mode === 'walkthrough' && i >= 0) { state.step = i; walkText.innerHTML = '<b>Step ' + pad(i + 1) + ' of ' + pad(cur.parts.length) + '</b>' + esc(cur.parts[i].name); }
      renderDetail(); refreshLook(); readout();
      if (flyThere && i >= 0) focusPart(i);
      /* on a wide screen the information column scrolls by itself: bring the component card (at its top) into view */
      const infoEl = detailEl.parentElement;
      if (i >= 0 && infoEl.scrollTop > 0 && getComputedStyle(infoEl).overflowY === 'auto') infoEl.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    partsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectPart(+b.dataset.i, true); });
    markersEl.addEventListener('click', (e) => { const b = e.target.closest('.marker'); if (b) selectPart(+b.dataset.i, state.mode === 'walkthrough'); });

    function setSep(v, instant) {
      state.sepTarget = v; sepEl.value = String(Math.round(v * 100)); sepOut.textContent = Math.round(v * 100) + '%';
      if (instant) state.sep = v;
      readout();
    }
    sepEl.addEventListener('input', () => {
      setSep(+sepEl.value / 100);
      if (state.mode === 'assembled' && state.sepTarget > 0) { state.mode = 'exploded'; markModes(); }
    });
    sepEl.addEventListener('change', () => { if (cur && state.mode !== 'walkthrough') frameView(state.sepTarget); });

    function setRun(on) {
      state.run = !!on && cur.speed > 0;
      runBtn.setAttribute('aria-pressed', String(state.run));
      runBtn.disabled = cur.speed === 0;
      runBtn.textContent = cur.speed === 0 ? 'No moving parts' : state.run ? 'Pause' : 'Run';
      readout();
    }
    runBtn.addEventListener('click', () => { if (cur) setRun(!state.run); });

    function markModes() { modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode))); readout(); }
    function setMode(m, instant) {
      if (!cur) return;
      state.mode = m; markModes();
      viewerEl.dataset.mode = m;
      state.cutTarget = m === 'cutaway' ? 1 : 0;
      let sepT = state.sepTarget;
      if (m === 'assembled' || m === 'flux') sepT = 0;
      else if (m === 'exploded') sepT = 0.85;
      else if (m === 'walkthrough') sepT = 0.55;
      setSep(sepT, instant);
      walkEl.hidden = m !== 'walkthrough';
      scopeEl.hidden = m !== 'flux' || (!cur.waves.length && !defs[state.mi].fluxNote);
      if (m === 'flux' && cur.speed > 0 && !reduceMotion) setRun(true);
      if (m === 'walkthrough') { selectPart(Math.max(0, state.sel), true); }
      else { refreshLook(); frameView(sepT, instant); }
    }
    modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    /* Focus view hides the side panels; Full screen fills the screen with the viewer. */
    const appEl = $('#app'), viewerEl = $('#viewer'), focusBtn = $('#focusBtn'), fsBtn = $('#fsBtn');
    function reframeSoon() { requestAnimationFrame(() => requestAnimationFrame(() => { resize(); if (!cur) return; if (state.mode === 'walkthrough' && state.sel >= 0) focusPart(state.sel); else frameView(state.sepTarget); })); }
    function setFocus(on, quiet) {
      appEl.classList.toggle('focus', on);
      focusBtn.setAttribute('aria-pressed', String(on));
      focusBtn.textContent = on ? 'Show panels' : 'Focus view';
      try { localStorage.setItem('electrica-focus', on ? '1' : '0'); } catch (e) { /* remembering is optional */ }
      if (!quiet) reframeSoon();
    }
    focusBtn.addEventListener('click', () => setFocus(!appEl.classList.contains('focus')));
    try { if (localStorage.getItem('electrica-focus') === '1') setFocus(true, true); } catch (e) { /* ignore */ }
    if (document.fullscreenEnabled && viewerEl.requestFullscreen) {
      fsBtn.hidden = false;
      fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else viewerEl.requestFullscreen().catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => {
        fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
        reframeSoon();
      });
    }

    $('#prev').addEventListener('click', () => { if (cur) selectPart((state.step - 1 + cur.parts.length) % cur.parts.length, true); });
    $('#next').addEventListener('click', () => { if (cur) selectPart((state.step + 1) % cur.parts.length, true); });

    function showError(D, err) {
      console.error('Electrica: could not build "' + D.id + '"', err);
      statusEl.hidden = false;
      statusEl.textContent = 'Could not build ' + (D.name || D.id) + ': ' + (err && err.message ? err.message : err) + '. Check js/machines/' + D.id + '.js and the browser console.';
    }
    /* Optional sliders with a live calculation and an equivalent-circuit drawing (see README). */
    const calcEl = $('#calc');
    function renderCalc(D) {
      if (!D.params || !D.calc) { calcEl.hidden = true; calcEl.innerHTML = ''; return; }
      D.values = D.values || {};
      D.params.forEach((p) => { if (D.values[p.id] == null) D.values[p.id] = p.value; });
      calcEl.hidden = false;
      calcEl.innerHTML = '<h2 class="eyebrow">' + esc(D.calcTitle || 'Try it') + '</h2><div class="params">' +
        D.params.map((p) => '<label class="param" for="p-' + p.id + '"><span>' + esc(p.label) + '</span><output for="p-' + p.id + '"></output>' +
          '<input type="range" id="p-' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + D.values[p.id] + '"></label>').join('') + '</div>' +
        (D.diagram ? '<div class="diagram">' + D.diagram + '</div>' : '') + '<dl class="calc-out"></dl><p class="calc-note"></p>';
      calcEl.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => { D.values[inp.id.slice(2)] = +inp.value; updateCalc(D); }));
      updateCalc(D);
    }
    function updateCalc(D) {
      D.params.forEach((p) => {
        const o = calcEl.querySelector('output[for="p-' + p.id + '"]');
        if (o) o.textContent = (p.format ? p.format(D.values[p.id]) : D.values[p.id]) + (p.unit ? ' ' + p.unit : '');
      });
      let res = {};
      try { res = D.calc(D.values) || {}; } catch (err) { console.error('Electrica: calc failed for "' + D.id + '"', err); }
      calcEl.querySelector('.calc-out').innerHTML = (res.rows || []).map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
      calcEl.querySelector('.calc-note').textContent = res.note || '';
      if (D.B && D.B.onParams) {
        try { D.B.onParams(D.values, res); } catch (err) { console.error('Electrica: onParams failed for "' + D.id + '"', err); }
        state.appliedSep = -1;
      }
    }

    function showMachine(i) {
      if (i === state.mi) return true;
      const D = defs[i];
      if (!D.B) {
        try { D.B = build(D); scene.add(D.B.root); D.B.root.visible = false; }
        catch (err) { showError(D, err); return false; }
      }
      statusEl.hidden = true;
      if (cur) cur.root.visible = false;
      cur = D.B; cur.root.visible = true; state.mi = i;
      clipA.normal.copy(cur.cutNormals[0]); clipB.normal.copy(cur.cutNormals[1] || cur.cutNormals[0]);
      state.sel = -1; state.hover = -1; state.clock = 0; state.step = 0; state.sep = 0; state.cut = 0;
      applySep(0);
      machinesEl.querySelectorAll('.mbtn').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.i === i)));
      $('#mName').textContent = D.name || D.short; $('#mSub').textContent = D.sub || '';
      cFig.textContent = 'Fig ' + (i + 1); cTitle.textContent = D.short || D.name;
      $('#count').textContent = cur.parts.length + ' parts · ' + cur.meshes.length + ' pieces';
      partsEl.innerHTML = cur.parts.map((p, k) => '<li><button type="button" data-i="' + k + '" aria-pressed="false"><span class="num">' + pad(k + 1) + '</span><span>' + esc(p.name) + '</span></button></li>').join('');
      markersEl.innerHTML = cur.parts.map((p, k) => '<button type="button" class="marker" data-i="' + k + '" aria-pressed="false" aria-label="' + esc(p.name) + '">' + pad(k + 1) + '</button>').join('');
      $('#plate').innerHTML = '<h2>' + esc(D.short || D.name) + '</h2><dl>' + (D.plate || []).map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl><p class="ex">' + esc(D.plateNote || 'Example rating for teaching') + '</p>';
      $('#principle').innerHTML = '<h2 class="eyebrow">Working principle</h2><p>' + esc(D.principle) + '</p><div class="formulas">' + (D.formulas || []).map((f) => '<div class="formula">' + esc(f) + '</div>').join('') + '</div>';
      legendEl.innerHTML = cur.waves.map((w) => '<span><i style="background:var(' + w.c + ')"></i>' + esc(w.label) + '</span>').join('');
      $('#scopeNote').textContent = D.fluxNote || '';
      scopeC.hidden = !cur.waves.length; legendEl.hidden = !cur.waves.length;
      renderCalc(D);
      renderDetail();
      setRun(false);
      camera.position.copy(isoDir(cur.camDir)).multiplyScalar(CAM_DIST); controls.target.set(0, 0, 0);
      setMode('assembled', true);
      try { history.replaceState(null, '', '#' + D.id); } catch (e) { /* the address is only a convenience */ }
      return true;
    }

    /* ---------- picking ---------- */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function clippedAway(pt) { return clipA.constant < 50 && clipA.distanceToPoint(pt) < 0 && clipB.distanceToPoint(pt) < 0; }
    function pick(ev) {
      if (!cur) return -1;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(cur.meshes, false);
      for (const h of hits) {
        if (clippedAway(h.point)) continue;
        if (h.object.material.opacity < 0.5) continue;
        return h.object.userData.part.idx;
      }
      return -1;
    }
    let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 6) return;
      const i = pick(e);
      if (i >= 0) selectPart(i, state.mode === 'walkthrough');
      else if (state.mode !== 'walkthrough') selectPart(-1, false);
    });
    let hoverQueued = false;
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || down || hoverQueued) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        const i = pick(e);
        renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'grab';
        if (i !== state.hover) { state.hover = i; refreshLook(); }
      });
    });
    renderer.domElement.addEventListener('pointerleave', () => { if (state.hover !== -1) { state.hover = -1; refreshLook(); } });

    /* ---------- markers and scope ---------- */
    const tmpBox = new THREE.Box3(), tmpV = new THREE.Vector3();
    function updateMarkers() {
      const show = state.sep > 0.22 && state.mode !== 'flux';
      markersEl.hidden = !show;
      if (!show) return;
      const w = stageEl.clientWidth, h = stageEl.clientHeight, btns = markersEl.children;
      cur.parts.forEach((p, k) => {
        tmpBox.makeEmpty(); p.meshes.forEach((m) => tmpBox.expandByObject(m));
        tmpBox.getCenter(tmpV).project(camera);
        const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h, b = btns[k];
        if (!b) return;
        b.hidden = tmpV.z > 1 || x < 14 || y < 14 || x > w - 14 || y > h - 14;
        b.style.left = x.toFixed(1) + 'px'; b.style.top = y.toFixed(1) + 'px';
      });
    }
    const sctx = scopeC.getContext('2d');
    function drawScope() {
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = scopeC.clientWidth, h = scopeC.clientHeight;
      if (!w || !h) return;
      if (scopeC.width !== Math.round(w * dpr) || scopeC.height !== Math.round(h * dpr)) { scopeC.width = Math.round(w * dpr); scopeC.height = Math.round(h * dpr); }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.clearRect(0, 0, w, h);
      sctx.strokeStyle = COL['--line']; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(0, h / 2); sctx.lineTo(w, h / 2); sctx.stroke();
      const N = 140, span = 4;
      for (const wv of cur.waves) {
        sctx.strokeStyle = COL[wv.c] || COL['--flux']; sctx.lineWidth = 2; sctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const t = state.clock - span + (span * i) / N, x = (i / N) * w, y = h / 2 - wv.f(t) * h * 0.4;
          if (i) sctx.lineTo(x, y); else sctx.moveTo(x, y);
        }
        sctx.stroke();
      }
    }

    /* ---------- theme ---------- */
    function applyTheme() {
      readColors();
      floorMat.color.set(COL['--bench']);
      fluxMats.forEach((m) => m.color.set(COL[m.userData.tok || '--flux'] || COL['--flux']));
      refreshLook();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    /* ---------- sizing and the animation loop ---------- */
    function resize() {
      const w = stageEl.clientWidth, h = stageEl.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); aspect = w / h; stageH = h;
      camera.left = -aspect; camera.right = aspect; camera.top = 1; camera.bottom = -1; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(stageEl);
    resize();

    let last = performance.now();
    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!cur) return;
      const k = 1 - Math.exp(-dt * 7);
      state.sep += (state.sepTarget - state.sep) * k;
      if (Math.abs(state.sepTarget - state.sep) < 0.0005) state.sep = state.sepTarget;
      if (state.sep !== state.appliedSep) applySep(state.sep);
      state.cut += (state.cutTarget - state.cut) * (1 - Math.exp(-dt * 5));
      if (Math.abs(state.cutTarget - state.cut) < 0.001) state.cut = state.cutTarget;
      const cc = state.cut < 0.002 ? 99 : 2.7 * (1 - state.cut);
      clipA.constant = cc; clipB.constant = cc;
      const flux = state.mode === 'flux';
      if (state.run || (flux && cur.speed === 0)) state.clock += dt * (reduceMotion ? 0.5 : 1);
      cur.rotor.rotation.z = cur.speed * state.clock;
      cur.fluxGroup.visible = flux;
      if (flux) { cur.fluxUpdate(state.clock); if (cur.waves.length) drawScope(); }
      if (fly) {
        const u = Math.min(1, (now - fly.t0) / fly.dur), e = ease(u);
        controls.target.lerpVectors(fly.fT, fly.tT, e); camera.position.lerpVectors(fly.fP, fly.tP, e);
        setZoom(fly.fZ * Math.pow(fly.tZ / fly.fZ, e));
        if (u >= 1) fly = null;
      }
      controls.update();
      /* flux dots are sized in world units; an orthographic view needs that in screen pixels */
      if (flux) { const ppu = (stageH / 2) * camera.zoom; for (const m of fluxMats) if (m.isPointsMaterial) m.size = m.userData.size * ppu; }
      updateMarkers();
      renderer.render(scene, camera);
    }

    /* Open the machine named in the address (#induction-motor), else the first one that builds. */
    const fromHash = defs.findIndex((m) => '#' + m.id === location.hash);
    const order = fromHash >= 0 ? [fromHash].concat(defs.map((_, i) => i).filter((i) => i !== fromHash)) : defs.map((_, i) => i);
    for (const i of order) { if (showMachine(i)) break; }
    requestAnimationFrame(loop);
  }

  return { register: register, start: start };
})();
