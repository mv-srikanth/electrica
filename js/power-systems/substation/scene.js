/* Electrica Substation: the 3D model.
   Units are metres. x runs west to east (lines arrive from the west), z runs north to south,
   y is up. Line bay A is at z = -16 and line bay B at z = +16; the 110 kV buses run north-south
   at x = -15, -12, -9; the transformers stand at x = 8.6; the control building is at x 28 to 44.

   Every pickable piece carries userData.eq, the equipment id used in data.js and network.js. */
(function () {
  const SS = (window.SS = window.SS || {});

  SS.buildScene = function (THREE, opts) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const root = new THREE.Group();
    const TAU = Math.PI * 2;

    /* ---------- materials ---------- */
    const std = (c, m, r, x) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, x || {}));
    const M = {
      galv: std(0xaab3b9, 0.55, 0.42), galvDk: std(0x8d969c, 0.55, 0.5),
      porc: std(0x76381d, 0.05, 0.28), poly: std(0x8c9499, 0, 0.55), polyLt: std(0xb6bdc1, 0, 0.5),
      alu: std(0xc9ced2, 0.75, 0.32), cab: std(0xbcc3c7, 0.25, 0.5), cabDk: std(0x6b757c, 0.3, 0.5),
      tank: std(0x7b878e, 0.25, 0.55), tankDk: std(0x5f6a71, 0.3, 0.55),
      concrete: std(0x9d9a92, 0, 0.95), concreteLt: std(0xb7b3a9, 0, 0.92), conDk: std(0x84817a, 0, 0.95),
      wall: std(0xd4cfc3, 0, 0.88), joint: std(0xaaa497, 0, 0.9), roof: std(0x56626b, 0.45, 0.5), trim: std(0x3f4a52, 0.4, 0.5),
      asphalt: std(0x45494c, 0, 0.92), copper: std(0xc4703a, 0.75, 0.3), cable: std(0x232628, 0.05, 0.65),
      yellow: std(0xe0aa1f, 0.2, 0.55), red: std(0xb83a2c, 0.2, 0.5), white: std(0xeeeeea, 0, 0.6),
      glass: std(0x7f9fae, 0.35, 0.1), panel: std(0xd8dbd6, 0.15, 0.55), panelDk: std(0x9fa5a2, 0.2, 0.55),
      floor: std(0x9da3a2, 0, 0.75), dark: std(0x2f363c, 0.4, 0.55), black: std(0x1d2124, 0.2, 0.6),
      reactor: std(0x8a7a5c, 0.1, 0.6), capcan: std(0xd5d8d4, 0.4, 0.35), gravelDk: std(0x8f8b80, 0, 1),
      fanBlade: std(0x404a52, 0.5, 0.45), batt: std(0x2c3238, 0.1, 0.5), battTop: std(0xc8452d, 0.1, 0.5),
      signal: std(0xd83b2a, 0.1, 0.4, { emissive: 0x7a1208, emissiveIntensity: 0.6 }),
    };

    /* ---------- geometry helpers ---------- */
    const G = {
      box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl8: new THREE.CylinderGeometry(1, 1, 1, 7),
      cyl24: new THREE.CylinderGeometry(1, 1, 1, 28), sph: new THREE.SphereGeometry(1, 14, 10), cone: new THREE.CylinderGeometry(0, 1, 1, 10),
    };
    const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), UP = V(0, 1, 0);
    function mtx(p, r, s) {
      _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e);
      if (s == null) _s.set(1, 1, 1); else if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
      return new THREE.Matrix4().compose(_p.set(p[0], p[1], p[2]), _q, _s);
    }
    function merge(list) {
      let nv = 0, ni = 0;
      list.forEach(([g]) => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
      const nm = new THREE.Matrix3(), v = new THREE.Vector3();
      let vo = 0, io = 0;
      list.forEach(([g, m]) => {
        nm.getNormalMatrix(m);
        const pa = g.attributes.position, na = g.attributes.normal, c = pa.count;
        for (let k = 0; k < c; k++) {
          v.fromBufferAttribute(pa, k).applyMatrix4(m); P[(vo + k) * 3] = v.x; P[(vo + k) * 3 + 1] = v.y; P[(vo + k) * 3 + 2] = v.z;
          v.fromBufferAttribute(na, k).applyMatrix3(nm).normalize(); N[(vo + k) * 3] = v.x; N[(vo + k) * 3 + 1] = v.y; N[(vo + k) * 3 + 2] = v.z;
        }
        if (g.index) { const ix = g.index.array; for (let j = 0; j < ix.length; j++) I[io++] = ix[j] + vo; }
        else for (let j = 0; j < c; j++) I[io++] = vo + j;
        vo += c;
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(P, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      out.setIndex(new THREE.BufferAttribute(I, 1));
      out.computeBoundingSphere(); out.computeBoundingBox();
      return out;
    }
    const pickables = [], byEq = {};
    function tag(obj, eq) {
      if (!eq) return;
      obj.userData.eq = eq;
      (byEq[eq] = byEq[eq] || []).push(obj);
      if (obj.isMesh) pickables.push(obj);
    }
    function Batch() { this.items = new Map(); }
    Batch.prototype = {
      put: function (mat, g, m) { if (!this.items.has(mat)) this.items.set(mat, []); this.items.get(mat).push([g, m]); return this; },
      box: function (mat, w, h, d, x, y, z, r) { return this.put(mat, G.box, mtx([x, y, z], r, [w, h, d])); },
      cyl: function (mat, rad, h, x, y, z, r, g) { return this.put(mat, g || G.cyl, mtx([x, y, z], r, [rad, h, rad])); },
      sph: function (mat, rad, x, y, z, s) { return this.put(mat, G.sph, mtx([x, y, z], null, s || rad)); },
      seg: function (mat, a, b, w, d, g) {
        const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
        if (len < 1e-4) return this;
        const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
        return this.put(mat, g || G.box, new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(w, len, d == null ? w : d)));
      },
      rod: function (mat, a, b, r) { return this.seg(mat, a, b, r, r, G.cyl8); },
      path: function (mat, pts, r) { for (let i = 1; i < pts.length; i++) this.rod(mat, pts[i - 1], pts[i], r); return this; },
      flush: function (parent, eq, o) {
        o = o || {};
        this.items.forEach((list, mat) => {
          const mesh = new THREE.Mesh(merge(list), mat);
          mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false;
          parent.add(mesh); tag(mesh, eq);
        });
        this.items = new Map();
        return parent;
      },
    };
    /* insulators: a lathe profile with alternating large and small sheds */
    const insCache = {};
    function insGeo(h, rc, r1, r2, pitch) {
      const key = [h, rc, r1, r2, pitch].join();
      if (insCache[key]) return insCache[key];
      const p = [new THREE.Vector2(0, 0), new THREE.Vector2(rc + 0.035, 0), new THREE.Vector2(rc + 0.035, 0.07), new THREE.Vector2(rc, 0.08)];
      let y = 0.12, k = 0;
      while (y < h - 0.14) {
        const r = k % 2 ? r2 : r1;
        p.push(new THREE.Vector2(rc, y), new THREE.Vector2(r, y + 0.012), new THREE.Vector2(r, y + 0.026), new THREE.Vector2(rc, y + pitch * 0.55));
        y += pitch; k++;
      }
      p.push(new THREE.Vector2(rc, h - 0.08), new THREE.Vector2(rc + 0.035, h - 0.07), new THREE.Vector2(rc + 0.035, h), new THREE.Vector2(0, h));
      return (insCache[key] = new THREE.LatheGeometry(p, 16));
    }
    const INS = {
      post: () => insGeo(1.3, 0.085, 0.17, 0.13, 0.085),
      ds: () => insGeo(1.55, 0.09, 0.18, 0.14, 0.085),
      cbSup: () => insGeo(1.55, 0.12, 0.23, 0.19, 0.09),
      cbInt: () => insGeo(1.25, 0.15, 0.25, 0.22, 0.09),
      ct: () => insGeo(1.6, 0.13, 0.23, 0.19, 0.09),
      cvt: () => insGeo(1.2, 0.13, 0.23, 0.19, 0.085),
      sa: () => insGeo(0.8, 0.1, 0.17, 0.14, 0.075),
      bush: () => insGeo(2.6, 0.12, 0.22, 0.18, 0.09),
      bushLV: () => insGeo(0.9, 0.08, 0.15, 0.12, 0.08),
    };
    const torusCache = {};
    function torus(R, r) { const k = R + ',' + r; return torusCache[k] || (torusCache[k] = new THREE.TorusGeometry(R, r, 6, 28)); }

    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
      return t;
    }
    function noiseTex(base, spread, size, rep) {
      const t = canvasTex(size, size, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        const n = w * h / 6;
        for (let i = 0; i < n; i++) {
          const v = Math.random();
          g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + (spread * Math.random()) + ')' : 'rgba(255,255,255,' + (spread * Math.random()) + ')';
          g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
      return t;
    }
    function plane(mat, w, d, x, y, z, eq) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); tag(m, eq);
      return m;
    }
    function group(eq, x, y, z, ry) {
      const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (ry) g.rotation.y = ry;
      root.add(g); g.updateMatrixWorld(true); if (eq) g.userData.eq = eq; return g;
    }
    const labels = [], dims = [], routes = [];
    function label(text, pos, cls, eq) { labels.push({ text: text, pos: pos, cls: cls || 'eq', eq: eq }); }

    /* conductors are batched per network node, each node with its own material for live colouring */
    const nodeMat = {}, nodeBatch = {};
    function nodeB(n, cable) {
      if (!nodeBatch[n]) {
        nodeMat[n] = std(cable ? 0x26292b : 0xc9ced2, cable ? 0.05 : 0.75, cable ? 0.65 : 0.32);
        nodeMat[n].userData = { base: nodeMat[n].color.getHex(), cable: !!cable };
        nodeBatch[n] = new Batch();
      }
      return nodeBatch[n];
    }
    function wire(n, pts, r) { nodeB(n).path(nodeMat[n], pts, r || 0.028); }
    function sag(a, b, s, k) { const out = []; k = k || 12; for (let i = 0; i <= k; i++) { const t = i / k; out.push(new THREE.Vector3().lerpVectors(a, b, t).add(V(0, -s * 4 * t * (1 - t), 0))); } return out; }
    function smooth(pts, k) { return new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(k || 16); }

    /* ---------- common structures ---------- */
    function footing(b, x, z, w) { b.box(M.concrete, w || 0.75, 0.35, w || 0.75, x, 0.12, z); }
    function column(b, x, z, h, r) { footing(b, x, z); b.cyl(M.galv, r || 0.13, h, x, h / 2, z); b.box(M.galv, 0.42, 0.03, 0.42, x, h, z); }
    function earthTail(b, x, z, h) { b.box(M.copper, 0.04, h, 0.006, x + 0.15, h / 2, z); }

    /* ---------- 110 kV equipment (built in a bay's local frame: x along the bay, z = phase offset) ---------- */
    const PH = [-3, 0, 3], BUSX = [-15, -12, -9], HB = 7.42, ZC = { A: -16, B: 16 };
    const XS = { far: -125, tower: -64, gantry: -41, cvt: -37.2, ds1: -32.5, ct: -28.2, cb: -24.2, ds2: -19.6, ds4: -5.2, sa: 0.6, tx: 8.6 };
    const anim = {};     // device id -> { parts: [{ obj, axis, open, closed }], v, target }
    const cbInd = {};    // breaker id -> indicator material
    const W = (g, x, y, z) => g.localToWorld(V(x, y, z));

    function disconnector(id, gx, gz, ry, ph, esId) {
      const g = group(id, gx, 0, gz, ry), b = new Batch();
      ph = ph || PH;
      const zEnd = Math.max.apply(null, ph.map(Math.abs)) + 1.2;
      [-1, 1].forEach((sx) => {
        [-zEnd, zEnd].forEach((cz) => { footing(b, sx * 1.0, cz); b.cyl(M.galv, 0.12, 2.4, sx * 1.0, 1.2, cz); });
        b.box(M.galv, 0.18, 0.22, zEnd * 2 + 0.3, sx * 1.0, 2.36, 0);
      });
      const part = { parts: [], v: 1, target: 1 };
      const term = { w: [], e: [] };
      ph.forEach((pz) => {
        b.box(M.galvDk, 2.8, 0.14, 0.18, 0, 2.54, pz);
        [-1, 1].forEach((sx) => {
          b.cyl(M.galv, 0.16, 0.06, sx * 1.0, 2.64, pz);
          b.box(M.alu, 0.3, 0.06, 0.13, sx * 1.22, 4.42, pz);
          b.cyl(M.alu, 0.07, 0.18, sx * 1.32, 4.5, pz);
          const piv = new THREE.Group(); piv.position.set(sx * 1.0, 0, pz); g.add(piv);
          const pb = new Batch();
          pb.cyl(M.galvDk, 0.12, 0.12, 0, 2.73, 0);
          pb.put(M.porc, INS.ds(), mtx([0, 2.79, 0]));
          pb.cyl(M.galvDk, 0.12, 0.12, 0, 4.4, 0);
          pb.box(M.alu, 0.98, 0.07, 0.09, -sx * 0.49, 4.42, 0);
          pb.box(M.alu, 0.12, 0.12, 0.14, -sx * 0.96, 4.42, 0);
          pb.flush(piv, id);
          part.parts.push({ obj: piv, axis: 'y', closed: 0, open: sx < 0 ? Math.PI / 2 : -Math.PI / 2 });
        });
        term.w.push(W(g, -1.36, 4.5, pz)); term.e.push(W(g, 1.36, 4.5, pz));
      });
      /* drive: interphase tube and motor mechanism */
      b.rod(M.galvDk, V(-1.0, 2.2, ph[0]), V(-1.0, 2.2, ph[2]), 0.035);
      b.box(M.cab, 0.5, 0.85, 0.36, -1.0, 1.35, zEnd + 0.38);
      b.rod(M.galvDk, V(-1.0, 1.8, zEnd + 0.2), V(-1.0, 2.2, ph[2] + 0.4), 0.03);
      earthTail(b, -1.0, -zEnd, 2.4);
      b.flush(g, id);
      anim[id] = part;
      if (esId) {
        const ep = { parts: [], v: 0, target: 0 };
        const eb = new Batch();
        ph.forEach((pz) => {
          const piv = new THREE.Group(); piv.position.set(-1.42, 2.62, pz + 0.24); g.add(piv);
          const pb = new Batch();
          pb.cyl(M.alu, 0.04, 1.72, 0.86, 0, 0, [0, 0, Math.PI / 2], G.cyl8);
          pb.box(M.alu, 0.12, 0.08, 0.08, 1.7, 0, 0);
          pb.cyl(M.galvDk, 0.07, 0.12, 0, 0, 0, [Math.PI / 2, 0, 0]);
          pb.flush(piv, esId);
          ep.parts.push({ obj: piv, axis: 'z', closed: Math.PI / 2, open: 0 });
          eb.box(M.alu, 0.06, 0.06, 0.26, -1.42, 4.38, pz + 0.12);
        });
        eb.rod(M.galvDk, V(-1.42, 2.62, ph[0] + 0.24), V(-1.42, 2.62, ph[2] + 0.24), 0.03);
        eb.box(M.yellow, 0.3, 0.45, 0.2, -1.42, 1.5, -zEnd - 0.3);
        eb.flush(g, esId);
        anim[esId] = ep;
      }
      return term;
    }

    function breaker(id, gx, gz, ry, ph) {
      const g = group(id, gx, 0, gz, ry), b = new Batch();
      ph = ph || PH;
      const zEnd = 4.3;
      [-zEnd, zEnd].forEach((cz) => { footing(b, 0, cz, 0.9); b.box(M.galv, 0.28, 2.3, 0.28, 0, 1.15, cz); });
      b.box(M.galv, 0.32, 0.36, zEnd * 2 + 0.4, 0, 2.42, 0);
      const term = { w: [], e: [] };
      ph.forEach((pz) => {
        b.box(M.cab, 0.44, 0.4, 0.44, 0, 2.8, pz);
        b.box(M.dark, 0.08, 0.1, 0.08, 0.26, 2.85, pz + 0.12);
        b.put(M.poly, INS.cbSup(), mtx([0, 3.0, pz]));
        b.cyl(M.alu, 0.21, 0.18, 0, 4.64, pz);
        b.box(M.alu, 0.34, 0.05, 0.15, -0.34, 4.64, pz);
        b.put(M.poly, INS.cbInt(), mtx([0, 4.73, pz]));
        b.cyl(M.alu, 0.21, 0.22, 0, 6.09, pz);
        b.box(M.alu, 0.34, 0.05, 0.15, 0.34, 6.12, pz);
        term.w.push(W(g, -0.5, 4.64, pz)); term.e.push(W(g, 0.5, 6.12, pz));
      });
      /* mechanism cabinet with position indicator on top */
      const cz = Math.sign(ph[2] - ph[0] || 1) * (zEnd + 0.62);
      b.box(M.cab, 0.75, 1.25, 0.62, 0, 1.55, cz);
      b.box(M.cabDk, 0.77, 0.08, 0.64, 0, 2.2, cz);
      b.box(M.dark, 0.02, 0.5, 0.3, 0.385, 1.6, cz);
      b.rod(M.galvDk, V(0, 2.25, cz), V(0, 2.6, ph[2]), 0.04);
      earthTail(b, 0, -zEnd, 2.3);
      b.flush(g, id);
      const ind = std(0xc62828, 0.1, 0.4, { emissive: 0xc62828, emissiveIntensity: 0.7 });
      const im = new THREE.Mesh(G.box, ind); im.scale.set(0.3, 0.3, 0.3); im.position.set(0, 2.42, cz); g.add(im); tag(im, id);
      cbInd[id] = ind;
      return term;
    }

    function ctSet(id, gx, gz, ry, ph) {
      const g = group(id, gx, 0, gz, ry), b = new Batch(), term = { w: [], e: [] };
      (ph || PH).forEach((pz) => {
        column(b, 0, pz, 2.5); earthTail(b, 0, pz, 2.5);
        b.box(M.tank, 0.56, 0.46, 0.56, 0, 2.75, pz);
        b.box(M.cab, 0.22, 0.26, 0.16, 0, 2.6, pz + 0.36);
        b.put(M.poly, INS.ct(), mtx([0, 2.98, pz]));
        b.cyl(M.tank, 0.33, 0.78, 0, 4.92, pz, [0, 0, Math.PI / 2], G.cyl24);
        b.cyl(M.tank, 0.2, 0.16, 0, 5.3, pz);
        b.sph(M.tank, 0.2, 0, 5.38, pz, [0.2, 0.1, 0.2]);
        b.cyl(M.alu, 0.055, 0.22, -0.5, 4.92, pz, [0, 0, Math.PI / 2]);
        b.cyl(M.alu, 0.055, 0.22, 0.5, 4.92, pz, [0, 0, Math.PI / 2]);
        term.w.push(W(g, -0.6, 4.92, pz)); term.e.push(W(g, 0.6, 4.92, pz));
      });
      b.flush(g, id);
      return term;
    }

    function cvtSet(id, gx, gz) {
      const g = group(id, gx, 0, gz), b = new Batch(), top = [];
      PH.forEach((pz) => {
        column(b, 0, pz, 2.2); earthTail(b, 0, pz, 2.2);
        b.box(M.tank, 0.72, 0.62, 0.62, 0, 2.53, pz);
        b.box(M.cab, 0.3, 0.32, 0.18, 0.22, 2.4, pz + 0.4);
        b.put(M.polyLt, INS.cvt(), mtx([0, 2.84, pz]));
        b.cyl(M.galvDk, 0.17, 0.08, 0, 4.07, pz);
        b.put(M.polyLt, INS.cvt(), mtx([0, 4.1, pz]));
        b.cyl(M.alu, 0.17, 0.14, 0, 5.36, pz);
        b.cyl(M.alu, 0.05, 0.16, 0, 5.5, pz);
        top.push(W(g, 0, 5.56, pz));
      });
      b.flush(g, id);
      return top;
    }

    function vtUnit(b, x, z) {
      column(b, x, z, 2.5); earthTail(b, x, z, 2.5);
      b.box(M.tank, 0.5, 0.5, 0.5, x, 2.77, z);
      b.put(M.poly, INS.ct(), mtx([x, 3.02, z]));
      b.cyl(M.tank, 0.26, 0.3, x, 4.77, z, null, G.cyl24);
      b.sph(M.tank, 0.26, x, 4.92, z, [0.26, 0.12, 0.26]);
      b.cyl(M.alu, 0.05, 0.16, x, 5.08, z);
      return V(x, 5.14, z);
    }

    function arresters(id, gx, gz) {
      const g = group(id, gx, 0, gz), b = new Batch(), top = [];
      PH.forEach((pz) => {
        column(b, 0, pz, 2.4); earthTail(b, 0, pz, 2.4);
        b.box(M.cab, 0.16, 0.22, 0.1, 0, 1.4, pz + 0.17);
        b.box(M.dark, 0.1, 0.1, 0.012, 0, 1.42, pz + 0.226);
        b.cyl(M.polyLt, 0.12, 0.12, 0, 2.48, pz);
        b.put(M.poly, INS.sa(), mtx([0, 2.54, pz]));
        b.cyl(M.galvDk, 0.12, 0.06, 0, 3.37, pz);
        b.put(M.poly, INS.sa(), mtx([0, 3.4, pz]));
        b.cyl(M.alu, 0.11, 0.08, 0, 4.24, pz);
        b.put(M.alu, torus(0.34, 0.03), mtx([0, 4.05, pz], [Math.PI / 2, 0, 0]));
        [0, 1, 2, 3].forEach((k) => b.rod(M.alu, V(0, 4.24, pz), V(0.34 * Math.cos(k * TAU / 4), 4.05, pz + 0.34 * Math.sin(k * TAU / 4)), 0.012));
        b.cyl(M.alu, 0.04, 0.16, 0, 4.36, pz);
        b.rod(M.copper, V(0, 2.42, pz + 0.04), V(0, 1.52, pz + 0.17), 0.012);
        top.push(W(g, 0, 4.42, pz));
      });
      b.flush(g, id);
      return top;
    }

    /* post insulator on a column, carrying a conductor at height y */
    function postSupport(b, x, z, y) {
      const h = y - 1.3 - 0.1;
      column(b, x, z, h, 0.12);
      b.put(M.porc, INS.post(), mtx([x, h + 0.02, z]));
      b.box(M.alu, 0.18, 0.08, 0.18, x, y - 0.06, z);
    }

    /* lattice members between two points */
    function lattice(b, mat, legs, levels, w) {
      // legs: function(y) -> array of 4 corner points (counter-clockwise); levels: list of y
      for (let i = 0; i < levels.length - 1; i++) {
        const a = legs(levels[i]), c = legs(levels[i + 1]);
        for (let k = 0; k < a.length; k++) {
          const k2 = (k + 1) % a.length;
          b.seg(mat, a[k], c[k], w * 1.6, w * 1.6);
          b.seg(mat, a[k], c[k2], w, w); b.seg(mat, a[k2], c[k], w, w);
          b.seg(mat, c[k], c[k2], w, w);
        }
      }
    }
    function sq(cx, cz, half) { return (y) => { const h = half(y); return [V(cx - h, y, cz - h), V(cx + h, y, cz - h), V(cx + h, y, cz + h), V(cx - h, y, cz + h)]; }; }
    function rng(a, b, n) { const o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; }

    function strainString(b, a, c) {
      b.rod(M.galvDk, a, c, 0.02);
      const n = 12;
      for (let i = 1; i < n; i++) {
        const p = new THREE.Vector3().lerpVectors(a, c, i / n);
        const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3().subVectors(c, a).normalize());
        b.put(M.poly, G.cyl, new THREE.Matrix4().compose(p, q, V(0.13, 0.03, 0.13)));
      }
    }

    function gantry(id, gx, zc) {
      const b = new Batch(), g = group(id, 0, 0, 0);
      [-6.5, 6.5].forEach((dz) => {
        const cz = zc + dz;
        footing(b, gx, cz, 1.4);
        lattice(b, M.galv, sq(gx, cz, (y) => 0.55 - y * 0.018), rng(0.2, 12.2, 8), 0.06);
      });
      for (let i = 0; i <= 13; i++) {
        const z0 = zc - 6.5 + i, z1 = z0 + 1;
        [11.4, 12.2].forEach((y) => { [-0.4, 0.4].forEach((dx) => { if (i < 13) b.seg(M.galv, V(gx + dx, y, z0), V(gx + dx, y, z1), 0.08, 0.08); }); });
        b.seg(M.galv, V(gx - 0.4, 11.4, z0), V(gx - 0.4, 12.2, z0), 0.05, 0.05); b.seg(M.galv, V(gx + 0.4, 11.4, z0), V(gx + 0.4, 12.2, z0), 0.05, 0.05);
        if (i < 13) { b.seg(M.galv, V(gx - 0.4, 11.4, z0), V(gx - 0.4, 12.2, z1), 0.04, 0.04); b.seg(M.galv, V(gx + 0.4, 12.2, z0), V(gx + 0.4, 11.4, z1), 0.04, 0.04); b.seg(M.galv, V(gx - 0.4, 12.2, z0), V(gx + 0.4, 12.2, z1), 0.04, 0.04); }
      }
      [-4.5, 4.5].forEach((dz) => {
        const cz = zc + dz;
        lattice(b, M.galv, sq(gx, cz, (y) => 0.4 - (y - 12.2) * 0.13), rng(12.2, 14.8, 3), 0.045);
      });
      const ends = [];
      PH.forEach((pz) => {
        const a = V(gx - 0.45, 11.45, zc + pz), c = V(gx - 2.3, 11.25, zc + pz);
        strainString(b, a, c); ends.push(c);
      });
      b.flush(g, id);
      return { ends: ends, peaks: [V(gx, 14.8, zc - 4.5), V(gx, 14.8, zc + 4.5)] };
    }

    function tower(id, gx, zc, h) {
      const b = new Batch(), g = group(id, 0, 0, 0), half = 5.6;
      [-half, half].forEach((dz) => {
        const cz = zc + dz;
        footing(b, gx, cz, 1.8);
        lattice(b, M.galv, sq(gx, cz, (y) => 1.6 - y * (1.15 / h)), rng(0.3, h, 9), 0.07);
      });
      const yb = h - 1.4;
      for (let i = 0; i < 12; i++) {
        const z0 = zc - half + i * (2 * half / 12), z1 = z0 + 2 * half / 12;
        [yb, h].forEach((y) => [-0.5, 0.5].forEach((dx) => b.seg(M.galv, V(gx + dx, y, z0), V(gx + dx, y, z1), 0.09, 0.09)));
        b.seg(M.galv, V(gx - 0.5, yb, z0), V(gx - 0.5, h, z1), 0.05, 0.05); b.seg(M.galv, V(gx + 0.5, h, z0), V(gx + 0.5, yb, z1), 0.05, 0.05);
        b.seg(M.galv, V(gx - 0.5, h, z0), V(gx + 0.5, h, z1), 0.045, 0.045);
      }
      [-half, half].forEach((dz) => lattice(b, M.galv, sq(gx, zc + dz, (y) => 0.45 - (y - h) * 0.14), rng(h, h + 3, 3), 0.05));
      const west = [], east = [];
      [-3.6, 0, 3.6].forEach((pz) => {
        const a = V(gx - 0.55, yb + 0.05, zc + pz), c = V(gx - 2.5, yb - 0.2, zc + pz);
        const a2 = V(gx + 0.55, yb + 0.05, zc + pz), c2 = V(gx + 2.5, yb - 0.2, zc + pz);
        strainString(b, a, c); strainString(b, a2, c2);
        west.push(c); east.push(c2);
      });
      b.flush(g, id);
      return { west: west, east: east, peaks: [V(gx, h + 3, zc - half), V(gx, h + 3, zc + half)] };
    }

    function busSupport(b, z, x0, x1) {
      const top = HB - 1.3 - 0.12;
      [x0, x1].forEach((x) => { footing(b, x, z, 0.8); b.box(M.galv, 0.26, top, 0.26, x, top / 2, z); });
      b.box(M.galv, x1 - x0 + 0.4, 0.3, 0.26, (x0 + x1) / 2, top - 0.15, z);
      BUSX.forEach((x) => { b.put(M.porc, INS.post(), mtx([x, top, z])); b.box(M.alu, 0.22, 0.12, 0.3, x, HB - 0.06, z); });
      earthTail(b, x0, z, top);
    }

    /* ---------- power transformer ---------- */
    function transformer(id, gx, zc, s) {
      const g = group(id, gx, 0, zc), b = new Batch(), Z = (z) => z * s;
      /* plinth, rails and bund */
      b.box(M.concrete, 4.4, 0.4, 7.6, 0, 0.2, 0);
      [-1.0, 1.0].forEach((x) => b.box(M.galvDk, 0.14, 0.12, 7.4, x, 0.46, 0));
      const bz0 = Z(-7.2), bz1 = Z(4.8), bzc = (bz0 + bz1) / 2, bl = Math.abs(bz1 - bz0);
      b.box(M.concreteLt, 0.3, 0.55, bl, -3.6, 0.27, bzc); b.box(M.concreteLt, 0.3, 0.55, bl, 3.7, 0.27, bzc);
      b.box(M.concreteLt, 7.6, 0.55, 0.3, 0.05, 0.27, bz0); b.box(M.concreteLt, 7.6, 0.55, 0.3, 0.05, 0.27, bz1);
      b.box(M.gravelDk, 7.0, 0.04, bl - 0.3, 0.05, 0.03, bzc);
      /* tank */
      b.box(M.tankDk, 3.4, 0.2, 6.6, 0, 0.62, 0);
      b.box(M.tank, 3.2, 3.5, 6.4, 0, 2.47, 0);
      for (let z = -2.8; z <= 2.81; z += 0.8) { b.box(M.tank, 0.1, 3.5, 0.16, -1.65, 2.47, z); b.box(M.tank, 0.1, 3.5, 0.16, 1.65, 2.47, z); }
      [-1.0, 0, 1.0].forEach((x) => { b.box(M.tank, 0.16, 3.5, 0.1, x, 2.47, 3.25); b.box(M.tank, 0.16, 3.5, 0.1, x, 2.47, -3.25); });
      b.box(M.tank, 3.4, 0.14, 6.6, 0, 4.27, 0);
      for (let z = -3.2; z <= 3.21; z += 0.4) { b.sph(M.tankDk, 0.03, -1.67, 4.28, z); b.sph(M.tankDk, 0.03, 1.67, 4.28, z); }
      [[-1.5, -3.1], [1.5, -3.1], [-1.5, 3.1], [1.5, 3.1]].forEach(([x, z]) => b.box(M.tankDk, 0.3, 0.3, 0.3, x, 4.45, z));
      /* HV turrets and bushings */
      const hv = [];
      [-1.6, 0, 1.6].forEach((z) => {
        b.cyl(M.tank, 0.3, 0.38, -1.0, 4.53, z);
        b.cyl(M.alu, 0.2, 0.1, -1.0, 4.76, z);
        b.put(M.poly, INS.bush(), mtx([-1.0, 4.8, z]));
        b.cyl(M.alu, 0.13, 0.12, -1.0, 7.42, z); b.cyl(M.alu, 0.05, 0.14, -1.0, 7.54, z);
        hv.push(W(g, -1.0, 7.6, z));
      });
      b.cyl(M.tank, 0.18, 0.25, -0.2, 4.47, Z(-2.5)); b.put(M.poly, INS.bushLV(), mtx([-0.2, 4.6, Z(-2.5)]));
      /* conservator, Buchholz relay, breather */
      const c0 = Z(-0.3), c1 = Z(-3.7), cm = (c0 + c1) / 2, cl = Math.abs(c1 - c0);
      b.cyl(M.tank, 0.52, cl, 0.95, 5.55, cm, [Math.PI / 2, 0, 0], G.cyl24);
      b.sph(M.tank, 0.52, 0.95, 5.55, c0, [0.52, 0.52, 0.14]); b.sph(M.tank, 0.52, 0.95, 5.55, c1, [0.52, 0.52, 0.14]);
      [Z(-0.9), Z(-3.1)].forEach((z) => { b.seg(M.tankDk, V(0.6, 4.33, z), V(0.85, 5.1, z), 0.1, 0.1); b.seg(M.tankDk, V(1.3, 4.33, z), V(1.05, 5.1, z), 0.1, 0.1); });
      b.rod(M.tankDk, V(0.95, 4.33, Z(-1.6)), V(0.95, 5.05, Z(-1.6)), 0.06);
      b.box(M.cab, 0.24, 0.2, 0.3, 0.95, 4.66, Z(-1.6));
      b.cyl(M.white, 0.16, 0.03, 0.95, 5.55, c1 + Z(-0.08), [Math.PI / 2, 0, 0]);
      b.path(M.tankDk, [V(1.3, 5.2, c1 - Z(0.1)), V(1.75, 5.0, c1 - Z(0.1)), V(1.75, 1.7, Z(-3.05))], 0.03);
      b.cyl(M.glass, 0.11, 0.42, 1.75, 1.45, Z(-3.05));
      /* on-load tap changer at the near end */
      b.box(M.tank, 1.3, 3.0, 0.75, -0.5, 2.6, Z(3.55));
      b.cyl(M.tank, 0.4, 0.3, -0.5, 4.38, Z(2.6));
      b.box(M.cab, 0.7, 1.3, 0.42, 0.75, 1.5, Z(3.45));
      b.rod(M.galvDk, V(0.75, 2.15, Z(3.45)), V(0.75, 4.5, Z(3.45)), 0.03);
      b.rod(M.galvDk, V(0.75, 4.5, Z(3.45)), V(-0.3, 4.5, Z(2.7)), 0.03);
      /* cooling: six radiators with header pipes, and fans */
      const rz = [Z(-3.95), Z(-4.7)];
      [-1.15, 0, 1.15].forEach((x) => {
        rz.forEach((z) => {
          for (let k = 0; k < 16; k++) b.box(M.tank, 0.018, 2.5, 0.56, x - 0.42 + k * 0.056, 2.45, z);
          b.cyl(M.tankDk, 0.06, 0.95, x, 3.78, z, [0, 0, Math.PI / 2]); b.cyl(M.tankDk, 0.06, 0.95, x, 1.15, z, [0, 0, Math.PI / 2]);
        });
        b.rod(M.tankDk, V(x, 3.78, Z(-3.2)), V(x, 3.78, rz[1]), 0.09); b.rod(M.tankDk, V(x, 1.15, Z(-3.2)), V(x, 1.15, rz[1]), 0.09);
        b.cyl(M.galvDk, 0.05, 1.0, x, 0.6, rz[1], [0, 0, 0]);
      });
      [-1.15, 0, 1.15].forEach((x) => {
        [1.6, 3.2].forEach((y) => {
          const fz = Z(-5.22);
          b.put(M.galvDk, torus(0.36, 0.025), mtx([x, y, fz]));
          b.cyl(M.fanBlade, 0.34, 0.03, x, y, fz, [Math.PI / 2, 0, 0], G.cyl24);
          b.cyl(M.dark, 0.1, 0.22, x, y, fz + Z(-0.1), [Math.PI / 2, 0, 0]);
        });
      });
      /* 22 kV cable box and cables */
      b.box(M.tank, 0.7, 1.5, 2.1, 1.95, 3.1, 0);
      b.box(M.tank, 0.75, 0.1, 2.15, 1.95, 3.88, 0);
      for (let k = -2; k <= 3; k++) b.rod(M.cable, V(2.0, 2.4, k * 0.28 - 0.14), V(2.0, 0.6, k * 0.28 - 0.14), 0.045);
      b.box(M.galvDk, 0.08, 2.0, 1.9, 2.45, 1.3, 0);
      /* marshalling box, rating plate base, earth bonds */
      b.box(M.cab, 0.4, 1.2, 0.8, -1.85, 1.6, Z(1.4));
      [[-1.6, -3.2], [1.6, 3.2]].forEach(([x, z]) => b.box(M.copper, 0.05, 0.8, 0.008, x, 0.6, Z(z)));
      b.flush(g, id);
      /* rating plate */
      const plate = canvasTex(256, 160, (c, w, h) => {
        c.fillStyle = '#d9dcdc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#333'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
        c.fillStyle = '#222'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
        c.fillText('POWER TRANSFORMER ' + id, w / 2, 34);
        c.font = '17px sans-serif';
        ['60 MVA   ONAN/ONAF', '110 / 22 kV   50 Hz', 'OLTC on HV winding', '315 A / 1575 A'].forEach((t, i) => c.fillText(t, w / 2, 66 + i * 24));
      });
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.47), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6, metalness: 0.2 }));
      pm.position.set(1.71, 2.2, Z(-1.6)); pm.rotation.y = Math.PI / 2; g.add(pm); tag(pm, id);
      return { hv: hv, lvBox: W(g, 2.0, 2.4, 0), trench: W(g, 2.7, 0.15, 0) };
    }

    /* ======================================================================
       Assemble the switchyard
       ====================================================================== */
    const bayTerms = {};
    ['A', 'B'].forEach((L) => {
      const zc = ZC[L], T = L === 'A' ? '1' : '2', BUS = 'B' + L, LN = 'L' + L, s = L === 'A' ? 1 : -1;
      const far = tower('line' + L, XS.far, zc, 15.5), term = tower('line' + L, XS.tower, zc, 17);
      const gan = gantry('gantry' + L, XS.gantry, zc);
      const cvt = cvtSet(L + '197', XS.cvt, zc);
      const d1 = disconnector(L + '129', XS.ds1, zc, 0, PH, L + '131');
      const ct = ctSet(L + '196', XS.ct, zc, 0);
      const cbT = breaker(L + '152', XS.cb, zc, 0);
      const d2 = disconnector(L + '129' + L, XS.ds2, zc, 0);
      const d4 = disconnector(L + '429' + L, XS.ds4, zc, 0);
      const sa = arresters(L + '45D', XS.sa, zc);
      const tx = transformer('T' + T, XS.tx, zc, s);
      bayTerms[L] = { tx: tx };
      const sb = new Batch();
      PH.forEach((pz, i) => {
        const z = zc + pz;
        /* line spans: off to the west, far tower, terminal tower, gantry */
        wire(LN, sag(V(XS.far - 70, 13.5, z + (i - 1) * 0.6), far.west[i], 3.2), 0.024);
        wire(LN, smooth([far.west[i], V(XS.far, far.west[i].y - 1.1, far.west[i].z), far.east[i]], 8), 0.024);
        wire(LN, sag(far.east[i], term.west[i], 2.4, 16), 0.024);
        wire(LN, smooth([term.west[i], V(XS.tower, term.west[i].y - 1.2, term.west[i].z), term.east[i]], 8), 0.024);
        wire(LN, sag(term.east[i], gan.ends[i], 0.9, 14), 0.024);
        /* gantry dropper to the CVT and the line disconnector */
        const cv = cvt[i];
        wire(LN, smooth([gan.ends[i], V(XS.gantry - 1.2, 9.4, z), V(XS.gantry + 1.2, 7.0, z), V(cv.x - 0.6, cv.y + 0.6, z), cv], 18));
        wire(LN, smooth([cv, V((cv.x + d1.w[i].x) / 2, 4.85, z), d1.w[i]], 10));
        wire(L + '1', smooth([d1.e[i], V((d1.e[i].x + ct.w[i].x) / 2, 4.6, z), ct.w[i]], 8));
        wire(L + '1', [ct.w[i], ct.e[i]], 0.03);
        wire(L + '1', smooth([ct.e[i], V((ct.e[i].x + cbT.w[i].x) / 2, 4.62, z), cbT.w[i]], 8));
        wire(L + '2', smooth([cbT.e[i], V(cbT.e[i].x + 1.6, 5.4, z), V(d2.w[i].x - 0.8, 4.7, z), d2.w[i]], 12));
        /* bay conductor under the bus, with the riser to this phase's bus tube */
        const rx = BUSX[i], base = V(rx, 4.5, z);
        wire(BUS, [d2.e[i], base, d4.w[i]], 0.035);
        wire(BUS, [base, V(rx, HB - 0.1, z)], 0.035);
        postSupport(sb, rx, z, 4.5);
        /* transformer connection: disconnector, arrester, bushing */
        const tH = 'T' + T + 'H', bt = tx.hv[i];
        wire(tH, smooth([d4.e[i], V((d4.e[i].x + sa[i].x) / 2, 4.75, z), sa[i]], 8));
        wire(tH, smooth([sa[i], V(sa[i].x + 2.5, 5.0, (z + bt.z) / 2), V(bt.x - 1.4, 6.7, bt.z), bt], 14));
      });
      /* earth wires */
      [0, 1].forEach((k) => {
        nodeB('EW').path(nodeMat.EW, sag(V(XS.far - 70, 17.5, far.peaks[k].z), far.peaks[k], 2.6), 0.014);
        nodeB('EW').path(nodeMat.EW, sag(far.peaks[k], term.peaks[k], 2.0, 16), 0.014);
        nodeB('EW').path(nodeMat.EW, sag(term.peaks[k], gan.peaks[k], 0.8, 14), 0.014);
      });
      /* bus tubes and supports */
      const z0 = L === 'A' ? -21.5 : 7.6, z1 = L === 'A' ? -7.6 : 21.5;
      BUSX.forEach((x) => wire(BUS, [V(x, HB, z0), V(x, HB, z1)], 0.065));
      (L === 'A' ? [-21, -14.5, -8.2] : [8.2, 14.5, 21]).forEach((z) => busSupport(sb, z, -16.7, -7.3));
      sb.flush(group('bus' + L), 'bus' + L);
      /* bus VTs at the far end of each bus */
      const vb = new Batch(), vg = group(L + '797'), vz = L === 'A' ? -23.2 : 23.2;
      BUSX.forEach((x) => {
        const t = vtUnit(vb, x, vz);
        wire(BUS, smooth([V(x, HB, L === 'A' ? z0 : z1), V(x, HB - 0.5, (vz + (L === 'A' ? z0 : z1)) / 2), t], 8), 0.025);
      });
      vb.flush(vg, L + '797');
      /* labels */
      label('Line ' + L, V(XS.tower, 22, zc), 'big', 'line' + L);
      label(L + '197', V(XS.cvt, 6.4, zc + 4.2), 'dev', L + '197');
      label(L + '129 / ' + L + '131', V(XS.ds1, 5.4, zc + 4.6), 'dev', L + '129');
      label(L + '196', V(XS.ct, 5.9, zc + 4.2), 'dev', L + '196');
      label(L + '152', V(XS.cb, 7.0, zc + 4.6), 'dev', L + '152');
      label(L + '129' + L, V(XS.ds2, 5.4, zc + 4.6), 'dev', L + '129' + L);
      label('Bus ' + L, V(-12, HB + 1.2, L === 'A' ? -10 : 10), 'big', 'bus' + L);
      label(L + '797', V(-12, 6.2, vz), 'dev', L + '797');
      label(L + '429' + L, V(XS.ds4, 5.4, zc + 4.6), 'dev', L + '429' + L);
      label(L + '45D', V(XS.sa, 5.2, zc + 4.2), 'dev', L + '45D');
      label('T' + T, V(XS.tx, 9.2, zc), 'big', 'T' + T);
    });

    /* ---------- bus section: runs along the buses (local x = world z) ---------- */
    const RY = -Math.PI / 2, PHS = [3, 0, -3];
    const s1 = disconnector('A729A', -12, -5, RY, PHS);
    const sct = ctSet('A796', -12, -1.6, RY, PHS);
    const scb = breaker('A752', -12, 1.6, RY, PHS);
    const s2 = disconnector('A729B', -12, 5, RY, PHS);
    BUSX.forEach((x, i) => {
      wire('BA', smooth([V(x, HB, -7.6), V(x, 6.2, -7.2), s1.w[i]], 10));
      wire('S1', smooth([s1.e[i], V(x, 4.65, (s1.e[i].z + sct.w[i].z) / 2), sct.w[i]], 6));
      wire('S1', [sct.w[i], sct.e[i]], 0.03);
      wire('S1', smooth([sct.e[i], V(x, 4.62, (sct.e[i].z + scb.w[i].z) / 2), scb.w[i]], 6));
      wire('S2', smooth([scb.e[i], V(x, 5.3, scb.e[i].z + 0.8), s2.w[i]], 8));
      wire('BB', smooth([s2.e[i], V(x, 6.2, 7.2), V(x, HB, 7.6)], 10));
    });
    label('A729A', V(-12, 5.4, -5), 'dev', 'A729A'); label('A796', V(-12, 6.0, -1.6), 'dev', 'A796');
    label('A752', V(-12, 7.0, 1.6), 'dev', 'A752'); label('A729B', V(-12, 5.4, 5), 'dev', 'A729B');

    /* ======================================================================
       Control building and the 22 kV switchboard
       ====================================================================== */
    const BX0 = 28, BX1 = 44, BZ0 = -16, BZ1 = 16, WH = 5.0, LOW = 1.15;
    const upper = new THREE.Group(), roofG = new THREE.Group();
    root.add(upper, roofG);
    (function building() {
      const b = new Batch(), ub = new Batch(), g = group('building');
      b.box(M.concrete, BX1 - BX0 + 0.8, 0.3, BZ1 - BZ0 + 0.8, (BX0 + BX1) / 2, 0.15, 0);
      b.box(M.floor, BX1 - BX0 - 0.4, 0.02, BZ1 - BZ0 - 0.4, (BX0 + BX1) / 2, 0.31, 0);
      /* outer walls with openings: [axis, fixed, from, to, openings [a, b, sill, head]] */
      const walls = [
        ['z', BZ0, BX0, BX1, [[39, 41, 0.3, 2.4]]],
        ['z', BZ1, BX0, BX1, [[30.5, 33.5, 0.3, 3.6], [38.5, 41.5, 0.3, 3.6]]],
        ['x', BX0, BZ0, BZ1, [[-1.6, 1.6, 0.3, 3.6], [-13, -11, 0.3, 2.4]]],
        ['x', BX1, BZ0, BZ1, [[-6, -4, 1.1, 2.4], [-2.5, -0.5, 1.1, 2.4], [1, 3, 1.1, 2.4], [-13.5, -11.5, 0.3, 2.4]]],
      ];
      const t = 0.25;
      function wallRun(bb, ax, f, a0, a1, y0, y1, mat) {
        if (a1 - a0 < 0.01 || y1 - y0 < 0.01) return;
        const c = (a0 + a1) / 2, len = a1 - a0, h = y1 - y0, y = (y0 + y1) / 2;
        if (ax === 'z') bb.box(mat, len, h, t, c, y, f); else bb.box(mat, t, h, len, f, y, c);
      }
      function wallWithOpenings(ax, f, a0, a1, ops, inner) {
        const segs = [[0.3, LOW], [LOW, WH]];
        segs.forEach(([y0, y1], si) => {
          const bb = si === 0 ? b : ub;
          let cur = a0;
          ops.slice().sort((p, q) => p[0] - q[0]).forEach(([o0, o1, s, hd]) => {
            wallRun(bb, ax, f, cur, o0, y0, y1, M.wall);
            if (s > y0) wallRun(bb, ax, f, o0, o1, y0, Math.min(s, y1), M.wall);
            if (hd < y1) wallRun(bb, ax, f, o0, o1, Math.max(hd, y0), y1, M.wall);
            cur = o1;
          });
          wallRun(bb, ax, f, cur, a1, y0, y1, M.wall);
        });
        if (inner) return;
        ops.forEach(([o0, o1, s, hd]) => {
          const c = (o0 + o1) / 2, len = o1 - o0;
          const isDoor = s < 0.5, mat = isDoor ? (len > 2.5 ? M.galvDk : M.trim) : M.glass;
          const lo = Math.max(s, 0.3), y = (lo + hd) / 2, hh = hd - lo;
          const targ = hd > LOW ? ub : b;
          if (ax === 'z') targ.box(mat, len, hh, 0.06, c, y, f); else targ.box(mat, 0.06, hh, len, f, y, c);
        });
      }
      walls.forEach((w) => wallWithOpenings(w[0], w[1], w[2], w[3], w[4]));
      /* panel joints */
      for (let x = BX0 + 3.2; x < BX1 - 0.5; x += 3.2) { [BZ0 - 0.13, BZ1 + 0.13].forEach((z) => ub.box(M.joint, 0.05, WH - LOW, 0.02, x, (WH + LOW) / 2, z)); }
      for (let z = BZ0 + 3.2; z < BZ1 - 0.5; z += 3.2) { [BX0 - 0.13, BX1 + 0.13].forEach((x) => ub.box(M.joint, 0.02, WH - LOW, 0.05, x, (WH + LOW) / 2, z)); }
      /* internal walls */
      const inner = [
        ['x', 36, BZ0, BZ1, [[-12.5, -11.3, 0.3, 2.3], [-2, -0.8, 0.3, 2.3], [6, 7.2, 0.3, 2.3], [11.5, 12.7, 0.3, 2.3]]],
        ['z', -8, BX0, BX1, [[32, 33.2, 0.3, 2.3]]],
        ['z', 8, BX0, BX1, [[33.5, 34.7, 0.3, 2.3]]],
        ['z', 4, 36, BX1, [[37, 38.2, 0.3, 2.3]]],
      ];
      inner.forEach((w) => wallWithOpenings(w[0], w[1], w[2], w[3], w[4], true));
      b.flush(g, 'building'); ub.flush(upper, 'building');
      /* roof */
      const rb = new Batch(), pitch = Math.atan2(0.9, 8.4), rl = 8.4 / Math.cos(pitch) + 0.5;
      rb.box(M.roof, rl, 0.12, BZ1 - BZ0 + 1.0, 32 - 0.25, WH + 0.45, 0, [0, 0, pitch]);
      rb.box(M.roof, rl, 0.12, BZ1 - BZ0 + 1.0, 40 + 0.25, WH + 0.45, 0, [0, 0, -pitch]);
      for (let z = BZ0 - 0.4; z <= BZ1 + 0.41; z += 0.5) { rb.box(M.trim, rl, 0.03, 0.04, 32 - 0.25, WH + 0.52, z, [0, 0, pitch]); rb.box(M.trim, rl, 0.03, 0.04, 40 + 0.25, WH + 0.52, z, [0, 0, -pitch]); }
      [BZ0, BZ1].forEach((z) => rb.put(M.wall, new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(BX0, 0), new THREE.Vector2(BX1, 0), new THREE.Vector2(36, 0.9)]), { depth: 0.25, bevelEnabled: false }), mtx([0, WH, z - 0.125])));
      rb.flush(roofG, 'building');
      label('Control building', V(36, WH + 2.6, 0), 'big', 'building');
    })();

    /* rooms and their equipment */
    const PANELS = ['A552', 'A252', 'B252', 'C252', 'D252', 'K252', 'A852', 'RISER', 'L252', 'E252', 'F252', 'G252', 'H252', 'B552'];
    const panelZ = {};
    PANELS.forEach((p, k) => { panelZ[p] = -5.2 + 0.8 * k; });
    const PX = 30.55, PF = 31.3;
    const lamps = {};      // device id -> { on: material, off: material, es: material, esId }
    const mimics = [];     // { mat, node }
    (function switchboard() {
      const g = group('sb22');
      const lb = new Batch();
      lb.box(M.panelDk, 1.6, 0.1, 11.4, PX, 0.36, 0);
      lb.box(M.panelDk, 0.5, 0.42, 11.2, PX - 0.5, 2.82, 0);
      lb.box(M.panelDk, 1.52, 2.3, 0.04, PX, 1.55, -5.62); lb.box(M.panelDk, 1.52, 2.3, 0.04, PX, 1.55, 5.62);
      lb.flush(g, 'sb22');
      PANELS.forEach((p) => {
        const z = panelZ[p], pg = group(p === 'RISER' ? 'A852' : p), b = new Batch();
        b.box(M.panel, 1.5, 2.3, 0.78, PX, 1.55, z);
        b.box(M.panelDk, 0.02, 0.5, 0.7, PF + 0.01, 2.1, z);
        b.box(M.panelDk, 0.02, 0.72, 0.7, PF + 0.01, 1.28, z);
        b.box(M.panelDk, 0.02, 0.55, 0.7, PF + 0.01, 0.62, z);
        b.box(M.panelDk, 0.03, 0.08, 0.04, PF + 0.025, 0.95, z + 0.28);
        if (p !== 'RISER') {
          b.box(M.black, 0.03, 0.22, 0.2, PF + 0.02, 2.14, z - 0.14);
          b.box(M.glass, 0.02, 0.24, 0.32, PF + 0.025, 1.3, z);
          b.cyl(M.dark, 0.03, 0.03, PF + 0.03, 1.0, z - 0.2, [0, 0, Math.PI / 2]);
        }
        b.flush(pg, p === 'RISER' ? 'A852' : p);
        /* label strip */
        const tx = canvasTex(256, 48, (c, w, h) => {
          c.fillStyle = '#20262b'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f2ee'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center';
          c.fillText(p === 'RISER' ? 'BUS RISER' : p, w / 2, 34);
        });
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.12), new THREE.MeshBasicMaterial({ map: tx }));
        lm.position.set(PF + 0.035, 2.5, z); lm.rotation.y = Math.PI / 2; pg.add(lm); tag(lm, p === 'RISER' ? 'A852' : p);
        /* mimic strips: bus (horizontal) and circuit (vertical) */
        const busNode = z < 0 ? 'QA' : 'QB';
        const circ = p === 'A552' ? 'T1L' : p === 'B552' ? 'T2L' : p === 'A852' ? 'QA' : p === 'RISER' ? 'QB' : 'F' + p[0];
        [[busNode, 0.035, 0.82, 1.83, z], [circ, 0.3, 0.035, 1.68, z + 0.12]].forEach(([n, h, w, y, zz]) => {
          const mm = std(0x2b2f33, 0.1, 0.5); mimics.push({ mat: mm, node: n });
          const mesh = new THREE.Mesh(G.box, mm); mesh.scale.set(0.012, h, w); mesh.position.set(PF + 0.03, y, zz); pg.add(mesh);
        });
        if (p === 'RISER') return;
        const mk = (c) => std(0x333333, 0.1, 0.4, { emissive: c, emissiveIntensity: 0 });
        const L = { on: mk(0xff3b2f), off: mk(0x35d05a), es: mk(0xffb02e) };
        [[L.on, -0.29], [L.off, -0.21], [L.es, -0.04]].forEach(([mat, dz], i) => {
          if (i === 2 && p === 'A852') return;
          const m = new THREE.Mesh(G.sph, mat); m.scale.set(0.03, 0.03, 0.03); m.position.set(PF + 0.03, 1.96, z + dz + 0.3); pg.add(m);
        });
        L.esId = p === 'A552' ? 'A531' : p === 'B552' ? 'B531' : p === 'A852' ? null : p[0] + '231';
        lamps[p] = L;
      });
      label('22 kV switchboard', V(PF, 3.6, -6.6), 'room', 'sb22');
    })();

    (function rooms() {
      /* control room: two rows of relay panels and a desk */
      const relay = canvasTex(128, 256, (c, w, h) => {
        c.fillStyle = '#c9cdca'; c.fillRect(0, 0, w, h);
        for (let r = 0; r < 5; r++) {
          for (let k = 0; k < 2; k++) {
            const x = 12 + k * 56, y = 16 + r * 46;
            c.fillStyle = '#2c3237'; c.fillRect(x, y, 48, 36);
            c.fillStyle = '#7fb0c9'; c.fillRect(x + 5, y + 5, 26, 12);
            c.fillStyle = r % 2 ? '#e2443a' : '#47c36a'; c.fillRect(x + 36, y + 7, 6, 6);
            c.fillStyle = '#d8d8d8'; for (let q = 0; q < 4; q++) c.fillRect(x + 6 + q * 9, y + 24, 6, 6);
          }
        }
      });
      const relayMat = new THREE.MeshStandardMaterial({ map: relay, roughness: 0.4, metalness: 0.1 });
      const cg = group('ctrl'), cb = new Batch();
      [37.6, 40.6].forEach((x) => {
        for (let k = 0; k < 12; k++) {
          const z = -7.0 + k * 0.82;
          cb.box(M.panel, 0.6, 2.2, 0.8, x, 1.41, z);
          const f = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 2.0), relayMat); f.position.set(x + 0.305, 1.41, z); f.rotation.y = Math.PI / 2; cg.add(f); tag(f, 'ctrl');
        }
      });
      cb.box(M.wall, 1.0, 0.75, 3.2, 43.0, 0.68, -4.5);
      [-5.4, -4.5, -3.6].forEach((z) => { cb.box(M.black, 0.05, 0.42, 0.7, 43.25, 1.35, z, [0, 0, 0.12]); });
      cb.box(M.black, 0.6, 0.9, 0.6, 42.0, 0.75, -4.5);
      cb.flush(cg, 'ctrl');
      label('Control and protection', V(40, 3.2, -2), 'room', 'ctrl');
      /* battery room */
      const bg = group('batt'), bb = new Batch();
      [[37.6, 0], [39.8, 1]].forEach(([x]) => {
        bb.box(M.galvDk, 0.8, 0.06, 3.4, x, 0.65, 6.0); bb.box(M.galvDk, 0.8, 0.06, 3.4, x, 1.25, 6.0);
        for (let k = 0; k < 10; k++) {
          [0.68, 1.28].forEach((y) => { bb.box(M.batt, 0.3, 0.34, 0.26, x - 0.18, y + 0.2, 4.6 + k * 0.31); bb.box(M.batt, 0.3, 0.34, 0.26, x + 0.18, y + 0.2, 4.6 + k * 0.31); bb.box(M.battTop, 0.06, 0.03, 0.06, x - 0.18, y + 0.39, 4.6 + k * 0.31); });
        }
      });
      bb.box(M.panel, 0.7, 2.0, 0.8, 43.2, 1.31, 5.0); bb.box(M.panel, 0.7, 2.0, 0.8, 43.2, 1.31, 6.9);
      bb.flush(bg, 'batt');
      label('Batteries', V(40, 3.0, 6), 'room', 'batt');
      /* capacitor rooms */
      ['1', '2'].forEach((n) => {
        const x0 = n === '1' ? 32 : 40, g = group('cap' + n), b = new Batch();
        b.box(M.galvDk, 3.6, 0.1, 3.0, x0, 0.36, 12);
        for (let ph = 0; ph < 3; ph++) {
          const z = 10.9 + ph * 1.1;
          b.box(M.galv, 0.08, 2.4, 0.08, x0 - 1.5, 1.5, z - 0.45); b.box(M.galv, 0.08, 2.4, 0.08, x0 + 0.7, 1.5, z - 0.45);
          [0.9, 1.75].forEach((y) => {
            b.box(M.galv, 2.3, 0.06, 0.9, x0 - 0.4, y - 0.36, z);
            for (let k = 0; k < 5; k++) {
              const cx = x0 - 1.3 + k * 0.45;
              b.box(M.capcan, 0.36, 0.55, 0.16, cx, y, z); b.cyl(M.polyLt, 0.03, 0.12, cx - 0.08, y + 0.33, z); b.cyl(M.polyLt, 0.03, 0.12, cx + 0.08, y + 0.33, z);
            }
          });
          b.cyl(M.reactor, 0.36, 0.8, x0 + 1.35, 1.5, z, null, G.cyl24); b.cyl(M.polyLt, 0.08, 0.5, x0 + 1.35, 0.85, z);
        }
        b.flush(g, 'cap' + n);
        const meshTex = canvasTex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(70,80,86,0.9)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } });
        meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping; meshTex.repeat.set(8, 6);
        const mm = new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), mm); sc.position.set(x0, 1.6, 9.8); g.add(sc); tag(sc, 'cap' + n);
        label('Capacitor bank ' + n, V(x0, 3.2, 12), 'room', 'cap' + n);
      });
      /* comms room and store */
      const og = group('comms'), ob = new Batch();
      for (let k = 0; k < 4; k++) { ob.box(M.black, 0.6, 2.1, 0.8, 38 + k * 0.7, 1.36, -15.2); ob.box(M.signal, 0.02, 0.02, 0.02, 38 + k * 0.7 + 0.2, 1.9, -14.79); }
      ob.flush(og, 'comms');
      label('Comms', V(40, 3.0, -12), 'room', 'comms');
      const ag = group('amen'), ab = new Batch();
      ab.box(M.wall, 1.6, 0.75, 0.9, 31, 0.68, -12); for (let k = 0; k < 4; k++) ab.box(M.panelDk, 0.5, 1.9, 0.5, 29 + k * 0.55, 1.26, -15.4);
      ab.flush(ag, 'amen');
      label('Store and amenities', V(32, 3.0, -12), 'room', 'amen');
      label('Switch room', V(33.5, 3.0, 6.6), 'room', 'sb22');
    })();

    /* station transformers */
    const stPos = { ST1: V(24.5, 0, -22), ST2: V(24.5, 0, 22) };
    Object.keys(stPos).forEach((id) => {
      const p = stPos[id], g = group(id, p.x, 0, p.z), b = new Batch();
      b.box(M.concrete, 2.4, 0.3, 2.0, 0, 0.15, 0);
      b.box(M.tank, 1.4, 1.3, 0.9, 0, 0.95, 0);
      for (let k = 0; k < 9; k++) { b.box(M.tank, 0.02, 1.0, 0.25, -0.55 + k * 0.14, 0.95, 0.57); b.box(M.tank, 0.02, 1.0, 0.25, -0.55 + k * 0.14, 0.95, -0.57); }
      b.box(M.tank, 1.5, 0.08, 1.0, 0, 1.64, 0);
      [-0.4, 0, 0.4].forEach((x) => { b.put(M.porc, INS.bushLV(), mtx([x, 1.68, -0.2], null, [0.8, 0.5, 0.8])); b.cyl(M.alu, 0.03, 0.18, x, 1.68, 0.25); });
      b.box(M.cab, 0.6, 0.8, 0.35, 0.95, 0.75, 0);
      b.flush(g, id);
      label(id, V(p.x, 2.8, p.z), 'dev', id);
    });

    /* ======================================================================
       Site: ground, gravel, roads, trenches, fence, masts, comms tower
       ====================================================================== */
    const FX0 = -48, FX1 = 50, FZ0 = -32, FZ1 = 32;
    const grass = new THREE.MeshStandardMaterial({ color: 0x7f8c69, roughness: 1, map: noiseTex('#a3ad8a', 0.2, 256, [60, 50]) });
    plane(grass, 900, 700, -40, 0, 0);
    const gravel = new THREE.MeshStandardMaterial({ color: 0xa29e95, roughness: 1, map: noiseTex('#c9c4b8', 0.4, 256, [24, 16]) });
    plane(gravel, FX1 - FX0, FZ1 - FZ0, (FX0 + FX1) / 2, 0.01, 0);
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x7d8285, roughness: 0.95, map: noiseTex('#8a8f92', 0.22, 128, [1, 1]) });
    function road(x0, x1, z0, z1) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), asphalt);
      m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); m.receiveShadow = true; root.add(m);
    }
    road(-40, 40.5, 24.8, 29.2); road(-40, 22, -29.2, -24.8); road(17.8, 22.2, -29.2, 29.2); road(-3, 28, -2.4, 2.4); road(35.5, 40.5, 24.8, 64); road(-200, 220, 60, 66);
    /* cable trenches (covered) */
    const tb = new Batch(), tg = group('trench');
    function trench(x0, z0, x1, z1, w) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const lx = Math.abs(x1 - x0) + w, lz = Math.abs(z1 - z0) + w;
      tb.box(M.concreteLt, lx, 0.1, lz, cx, 0.05, cz);
      const n = Math.floor(Math.max(lx, lz) / 1.0);
      for (let i = 1; i < n; i++) {
        if (lx > lz) tb.box(M.conDk, 0.02, 0.012, lz - 0.04, Math.min(x0, x1) - w / 2 + i * 1.0, 0.105, cz);
        else tb.box(M.conDk, lx - 0.04, 0.012, 0.02, cx, 0.105, Math.min(z0, z1) - w / 2 + i * 1.0);
      }
    }
    ['A', 'B'].forEach((L) => {
      trench(bayTerms[L].tx.trench.x, ZC[L], 26, ZC[L], 0.9);
    });
    trench(26, -22, 26, 22, 0.9); trench(26, -5.2, 28, -5.2, 0.9); trench(26, 5.2, 28, 5.2, 0.9);
    trench(24.5, -22, 26, -22, 0.7); trench(24.5, 22, 26, 22, 0.7);
    trench(44, 0, 56, 0, 1.8);
    tb.flush(tg, 'trench', { cast: false });
    /* oil separators */
    const ob = new Batch(), og = group('bund');
    [-1, 1].forEach((s) => { ob.cyl(M.concreteLt, 1.1, 0.16, 15.8, 0.08, s * 20.5, null, G.cyl24); ob.cyl(M.conDk, 0.35, 0.04, 15.6, 0.17, s * 20.5); ob.rod(M.conDk, V(13.3, 0.05, s * 20.5), V(14.7, 0.05, s * 20.5), 0.06); });
    ob.flush(og, 'bund');

    /* fence with a yellow vehicle gate on the south side */
    (function fence() {
      const b = new Batch(), g = group('fence');
      const meshTex = canvasTex(64, 64, (c, w, h) => {
        c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(150,158,162,0.95)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke();
      });
      meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
      const runs = [[FX0, FZ0, FX1, FZ0], [FX1, FZ0, FX1, FZ1], [FX1, FZ1, 42, FZ1], [34, FZ1, FX0, FZ1], [FX0, FZ1, FX0, FZ0]];
      runs.forEach(([x0, z0, x1, z1]) => {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 3);
        for (let i = 0; i <= n; i++) {
          const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
          b.cyl(M.galv, 0.04, 2.45, x, 1.22, z, null, G.cyl8);
          const ox = (z1 - z0) / len * 0.35, oz = -(x1 - x0) / len * 0.35;
          b.rod(M.galv, V(x, 2.44, z), V(x - ox, 2.8, z - oz), 0.02);
        }
        b.rod(M.galv, V(x0, 2.42, z0), V(x1, 2.42, z1), 0.022); b.rod(M.galv, V(x0, 0.08, z0), V(x1, 0.08, z1), 0.018);
        const ox = (z1 - z0) / len * 0.35, oz = -(x1 - x0) / len * 0.35;
        [0.4, 0.7, 1.0].forEach((f) => b.rod(M.galvDk, V(x0 - ox * f, 2.44 + 0.36 * f, z0 - oz * f), V(x1 - ox * f, 2.44 + 0.36 * f, z1 - oz * f), 0.008));
        const t = meshTex.clone(); t.needsUpdate = true; t.repeat.set(len / 0.6, 2.4 / 0.6);
        const mm = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.35), mm);
        m.position.set((x0 + x1) / 2, 1.22, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(m); tag(m, 'fence');
      });
      [[34, 38], [38, 42]].forEach(([x0, x1]) => {
        b.box(M.yellow, x1 - x0, 0.08, 0.08, (x0 + x1) / 2, 2.1, FZ1); b.box(M.yellow, x1 - x0, 0.08, 0.08, (x0 + x1) / 2, 0.15, FZ1);
        b.box(M.yellow, 0.08, 2.0, 0.08, x0 + 0.05, 1.12, FZ1); b.box(M.yellow, 0.08, 2.0, 0.08, x1 - 0.05, 1.12, FZ1);
        b.rod(M.yellow, V(x0, 0.15, FZ1), V(x1, 2.1, FZ1), 0.03);
      });
      b.cyl(M.yellow, 0.1, 2.5, 34, 1.25, FZ1); b.cyl(M.yellow, 0.1, 2.5, 42, 1.25, FZ1);
      const sign = canvasTex(128, 96, (c, w, h) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#c62828'; c.fillRect(0, 0, w, 30);
        c.fillStyle = '#fff'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('DANGER', w / 2, 23);
        c.fillStyle = '#111'; c.font = 'bold 15px sans-serif'; c.fillText('HIGH VOLTAGE', w / 2, 52); c.fillText('KEEP OUT', w / 2, 74);
      });
      const sm = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 });
      [[-20, FZ1 + 0.05, 0], [10, FZ1 + 0.05, 0], [30, FZ1 + 0.05, 0], [-20, FZ0 - 0.05, Math.PI], [20, FZ0 - 0.05, Math.PI], [FX0 - 0.05, 0, -Math.PI / 2], [FX1 + 0.05, 10, Math.PI / 2]].forEach(([x, z, r]) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), sm);
        s.position.set(x, 1.5, z);
        s.rotation.y = r; g.add(s);
      });
      b.flush(g, 'fence');
      label('Vehicle gate', V(38, 3.4, FZ1), 'dev', 'fence');
    })();

    /* lightning masts */
    (function masts() {
      const b = new Batch(), g = group('masts');
      const tap = new THREE.CylinderGeometry(0.1, 0.32, 1, 12);
      [[-45.5, -30], [-45.5, 30], [-6, -30.5], [-6, 30.5], [24, -30.5], [24, 30.5]].forEach(([x, z]) => {
        b.box(M.concrete, 1.4, 0.4, 1.4, x, 0.2, z);
        b.put(M.galv, tap, mtx([x, 10.9, z], null, [1, 21, 1]));
        b.cyl(M.galv, 0.025, 1.6, x, 22.2, z, null, G.cyl8);
        earthTail(b, x, z, 0.6);
      });
      b.flush(g, 'masts');
    })();
    /* communications tower */
    (function commsTower() {
      const b = new Batch(), g = group('comms'), cx = 46, cz = -27.5, h = 30;
      const tri = (y) => { const r = 1.6 - y * 0.042; return [0, 1, 2].map((k) => V(cx + r * Math.cos(k * TAU / 3 + 0.5), y, cz + r * Math.sin(k * TAU / 3 + 0.5))); };
      lattice(b, M.galv, tri, rng(0.3, h, 12), 0.05);
      tri(0).forEach((p) => footing(b, p.x, p.z, 0.8));
      b.cyl(M.white, 0.55, 0.3, cx + 0.6, 25.5, cz, [0, 0, Math.PI / 2], G.cyl24);
      b.box(M.white, 0.12, 1.4, 0.35, cx - 0.5, 27.8, cz + 0.4); b.box(M.white, 0.12, 1.4, 0.35, cx - 0.4, 27.8, cz - 0.5);
      b.cyl(M.galv, 0.03, 2.5, cx, h + 1.2, cz, null, G.cyl8);
      b.put(M.signal, G.sph, mtx([cx, h + 2.5, cz], null, 0.12));
      b.flush(g, 'comms');
    })();

    /* earth grid (shown with the Earthing layer) */
    const earthG = new THREE.Group(); earthG.visible = false; root.add(earthG);
    (function earthGrid() {
      const pts = [];
      for (let x = -46; x <= 48; x += 6) pts.push(V(x, 0.06, -30), V(x, 0.06, 30));
      for (let z = -30; z <= 30; z += 6) pts.push(V(-46, 0.06, z), V(48, 0.06, z));
      [[-49, -33, 51, -33], [51, -33, 51, 33], [51, 33, -49, 33], [-49, 33, -49, -33]].forEach(([a, b2, c, d]) => pts.push(V(a, 0.06, b2), V(c, 0.06, d)));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const lm = new THREE.LineBasicMaterial({ color: 0xd2742e, transparent: true, opacity: 0.95 });
      const ls = new THREE.LineSegments(geo, lm); ls.renderOrder = 2; earthG.add(ls);
      const b = new Batch();
      for (let x = -46; x <= 48; x += 6) for (let z = -30; z <= 30; z += 6) b.cyl(M.copper, 0.09, 0.02, x, 0.065, z, null, G.cyl8);
      b.flush(earthG, 'earthgrid', { cast: false });
      const hitP = new THREE.Mesh(new THREE.PlaneGeometry(100, 66), new THREE.MeshBasicMaterial({ visible: false }));
      hitP.rotation.x = -Math.PI / 2; hitP.position.set(1, 0.07, 0); earthG.add(hitP); tag(hitP, 'earthgrid');
    })();

    /* ---------- 22 kV cables: visible where they leave the transformers ---------- */
    ['A', 'B'].forEach((L) => {
      const n = L === 'A' ? 'T1L' : 'T2L', tx = bayTerms[L].tx;
      nodeB(n, true).path(nodeMat[n], [V(tx.lvBox.x + 0.15, 0.62, tx.lvBox.z - 0.7), V(tx.trench.x, 0.12, tx.lvBox.z - 0.7)], 0.06);
      nodeB(n, true).path(nodeMat[n], [V(tx.lvBox.x + 0.15, 0.62, tx.lvBox.z + 0.7), V(tx.trench.x, 0.12, tx.lvBox.z + 0.7)], 0.06);
    });

    /* flush conductor batches */
    Object.keys(nodeBatch).forEach((n) => {
      const g = new THREE.Group(); root.add(g);
      const eq = n === 'EW' ? 'line' : (SS.NODE_EQ[n] || (nodeMat[n].userData.cable ? 'cable22' : 'cond110'));
      nodeBatch[n].flush(g, eq === 'line' ? null : eq, { cast: true });
    });

    /* ======================================================================
       Power-flow routes (centre phase), dimensions
       ====================================================================== */
    function route(edge, kv, pts, over) { routes.push({ edge: edge, kv: kv, pts: pts, over: !!over }); }
    ['A', 'B'].forEach((L) => {
      const zc = ZC[L], T = L === 'A' ? '1' : '2', tx = bayTerms[L].tx, zp = L === 'A' ? -5.2 : 5.2;
      route(L + '129', 110, [V(XS.far - 60, 14.5, zc), V(XS.far - 2.5, 14.0, zc), V(XS.far + 2.5, 14.0, zc), V(XS.tower - 2.5, 15.3, zc), V(XS.tower + 2.5, 15.3, zc), V(XS.gantry - 2.3, 11.25, zc),
        V(XS.gantry + 1.2, 7.0, zc), V(XS.cvt, 5.56, zc), V(XS.ds1 - 1.36, 4.5, zc), V(XS.ds1 + 1.36, 4.5, zc), V(XS.ct - 0.6, 4.92, zc), V(XS.ct + 0.6, 4.92, zc),
        V(XS.cb - 0.5, 4.64, zc), V(XS.cb, 5.4, zc), V(XS.cb + 0.5, 6.12, zc), V(XS.ds2 - 1.36, 4.5, zc), V(XS.ds2 + 1.36, 4.5, zc), V(-12, 4.5, zc)]);
      route(L + '429' + L, 110, [V(-12, 4.5, zc), V(XS.ds4 - 1.36, 4.5, zc), V(XS.ds4 + 1.36, 4.5, zc), V(XS.sa, 4.42, zc), V(XS.sa + 3.0, 5.3, zc), tx.hv[1], V(XS.tx, 4.2, zc)]);
      route(L + '552', 22, [V(XS.tx + 1.0, 3.2, zc), tx.lvBox, V(tx.lvBox.x, 0.4, zc), V(26, 0.4, zc), V(26, 0.4, zp), V(PX - 0.4, 0.4, zp), V(PX - 0.4, 2.0, zp)], true);
    });
    route('A752', 110, [V(-12, 4.5, -16), V(-12, HB, -16), V(-12, HB, -7.6), V(-12, 4.5, -6.36), V(-12, 4.5, -3.64), V(-12, 4.92, -2.2), V(-12, 4.92, -1.0),
      V(-12, 4.64, 1.1), V(-12, 6.12, 2.1), V(-12, 4.5, 3.64), V(-12, 4.5, 6.36), V(-12, HB, 7.6), V(-12, HB, 16), V(-12, 4.5, 16)]);
    route('A852', 22, [V(PX, 2.4, panelZ.A852), V(PX, 2.4, panelZ.RISER)], true);
    let cust = 0;
    Object.keys(SS.FEEDERS).forEach((id) => {
      const f = SS.FEEDERS[id], z = panelZ[id];
      if (f.what === 'cust') {
        const tz = -0.75 + 0.3 * cust++;
        route(id, 22, [V(PX - 0.2, 1.6, z), V(PX - 0.2, 0.25, z), V(44, 0.25, tz), V(56, 0.25, tz), V(64, 0.25, tz * 6)], true);
      } else if (f.what === 'st') {
        const sz = f.to.slice(-1) === '1' ? -22 : 22;
        route(id, 22, [V(PX - 0.2, 1.6, z), V(PX - 0.2, 0.25, z), V(26, 0.25, z), V(26, 0.25, sz), V(24.5, 1.0, sz)], true);
      }
    });

    function dim(a, b, text, tick, at) { dims.push({ a: a, b: b, text: text, tick: tick || V(0, 0, 0.4), at: at }); }
    dim(V(XS.cb + 1.4, 7.0, 13), V(XS.cb + 1.4, 7.0, 16), '3.0 m phase spacing', V(0.3, 0, 0));
    dim(V(-15, 0.05, 23.6), V(-15, HB, 23.6), '7.42 m bus height', null, 'end');
    dim(V(XS.ds1 - 2.4, 0.05, 20.4), V(XS.ds1 - 2.4, 4.5, 20.4), '4.4 m terminals', null, 'end');
    dim(V(XS.ct + 1.0, 0.05, 20.4), V(XS.ct + 1.0, 2.5, 20.4), '2.5 m insulator base (≥ 2.25 m)', null, 'end');
    dim(V(XS.gantry, 0.05, 23.6), V(XS.gantry, 12.2, 23.6), '12 m gantry', null, 'end');
    dim(V(-34, 0.4, -16), V(-34, 0.4, 16), '32 m between bay centres', V(0.5, 0, 0));
    dim(V(XS.cb, 0.4, 25.2), V(XS.tx, 0.4, 25.2), '32.8 m: breaker to transformer');

    /* ---------- state updates ---------- */
    const COL = { l110: new THREE.Color(0xe07a2e), l22: new THREE.Color(0x2f7fe0), earthed: new THREE.Color(0x2fa36b), dead: new THREE.Color(0x7b858c) };
    function apply(net, flowOn) {
      Object.keys(nodeMat).forEach((n) => {
        if (n === 'EW') return;
        const m = nodeMat[n], s = net.nodeState(n);
        if (!flowOn) { m.color.setHex(m.userData.base); m.emissive.setHex(0x000000); return; }
        if (s === 'dead') { m.color.setHex(m.userData.cable ? 0x26292b : 0x9aa1a6); m.emissive.setHex(0); }
        else { m.color.copy(COL[s]); m.emissive.copy(COL[s]).multiplyScalar(m.userData.cable ? 0.55 : 0.4); }
      });
      mimics.forEach((mm) => {
        const s = net.nodeState(mm.node);
        if (!flowOn || s === 'dead') { mm.mat.color.setHex(0x2b2f33); mm.mat.emissive.setHex(0); }
        else { mm.mat.color.copy(COL[s]); mm.mat.emissive.copy(COL[s]).multiplyScalar(0.7); }
      });
      Object.keys(anim).forEach((id) => { anim[id].target = net.st[id] ? 1 : 0; });
      Object.keys(cbInd).forEach((id) => { const c = net.st[id] ? 0xc62828 : 0x2e9d4a; cbInd[id].color.setHex(c); cbInd[id].emissive.setHex(c); });
      Object.keys(lamps).forEach((id) => {
        const L = lamps[id], on = !!net.st[id];
        L.on.emissiveIntensity = on ? 1.6 : 0; L.on.color.setHex(on ? 0xff6a5e : 0x553333);
        L.off.emissiveIntensity = on ? 0 : 1.6; L.off.color.setHex(on ? 0x335533 : 0x6ee08a);
        const es = L.esId && net.st[L.esId];
        L.es.emissiveIntensity = es ? 1.6 : 0; L.es.color.setHex(es ? 0xffc35e : 0x554a33);
      });
    }
    let moving = false;
    function update(dt) {
      moving = false;
      Object.keys(anim).forEach((id) => {
        const a = anim[id];
        if (a.v === a.target) return;
        const sp = dt / 1.6;
        a.v = a.target > a.v ? Math.min(a.target, a.v + sp) : Math.max(a.target, a.v - sp);
        const e = a.v < 0.5 ? 2 * a.v * a.v : 1 - Math.pow(-2 * a.v + 2, 2) / 2;
        a.parts.forEach((p) => { p.obj.rotation[p.axis] = p.open + (p.closed - p.open) * e; });
        moving = true;
      });
      return moving;
    }
    function snap() { Object.keys(anim).forEach((id) => { const a = anim[id]; a.v = a.target; a.parts.forEach((p) => { p.obj.rotation[p.axis] = a.v ? p.closed : p.open; }); }); }

    const box = new THREE.Box3();
    function boundsOf(eq) {
      const list = byEq[eq];
      if (!list) return null;
      box.makeEmpty();
      list.forEach((o) => box.expandByObject(o));
      return box.isEmpty() ? null : box.clone();
    }
    const indoor = { sb22: 1, ctrl: 1, batt: 1, cap1: 1, cap2: 1, comms: 0, amen: 1 };
    PANELS.forEach((p) => { indoor[p] = 1; });
    Object.keys(SS.FEEDERS).forEach((id) => { indoor[id[0] + '231'] = 1; });
    ['A531', 'B531', 'A831', 'B831'].forEach((id) => { indoor[id] = 1; });

    return {
      root: root, pickables: pickables, labels: labels, dims: dims, routes: routes, ground: grass,
      upper: upper, roof: roofG, earth: earthG, apply: apply, update: update, snap: snap,
      boundsOf: boundsOf, isIndoor: (eq) => !!indoor[eq], panelZ: panelZ, PX: PX,
    };
  };
})();
