/* Electrica Hydro: the 3D model, a block of valley cut out of the ground like a textbook block diagram.
   Units: 1 = 5 m. x runs downstream (west to east), z runs north to south (+z faces the viewer), y is up.
   Heights come from levels in metres with HY.Y(RL): tailwater at 400 m is y = 0, the dam crest at 512 m is y = 22.4.
   Every pickable piece carries userData.part, a component id from data.js.

   The water's path: reservoir, intake tower, headrace tunnel (inside the north hill, drawn through the ground),
   surge tank, valve house at the tunnel portal, penstock down the hillside, header, three units in the
   powerhouse (spiral casing, wicket gates, runner, draft tube), tailrace, river. */
(function () {
  const HY = (window.HY = window.HY || {});
  HY.Y = (rl) => (rl - 400) / 5;

  HY.buildScene = function (THREE, tok) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const TAU = Math.PI * 2;
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const root = new THREE.Group();

    /* ======================================================================
       The ground: a valley closed at its head, a gorge at the dam, a wide floodplain below
       ====================================================================== */
    const X0 = -64, X1 = 64, Z0 = -36, Z1 = 36, BASE = -14, DAM_X = -24;
    const riverZ = (x) => 8 + 2.2 * Math.sin((x + 6) / 19);
    const noise = (x, z) => 0.55 * Math.sin(x * 0.29 + z * 0.17) + 0.45 * Math.sin(x * 0.11 - z * 0.31 + 1.7) + 0.22 * Math.sin(x * 0.63 + z * 0.47 + 0.4) + 0.12 * Math.sin(x * 1.3 - z * 0.9);
    function natural(x, z) {
      const u = sm(DAM_X + 5, DAM_X - 5, x), g = sm(-8, -26, x);
      const d = z - riverZ(x), ad = Math.abs(d);
      const floor = lerp(-1.6 + 2.2 * sm(2.6, 5.2, ad), 0, u);
      const rise = d < 0 ? lerp(31.4 * sm(8, 36, ad), 32 * sm(5, 21, ad), g) : lerp(3.4 * sm(6, 26, ad), 24 * sm(5, 13, ad), g);
      const rough = noise(x, z) * (0.35 + 1.25 * sm(6, 18, ad)) * sm(4, 9, ad);
      const h = floor + rise + rough;
      const close = 36 * sm(-44, -63, x) + rough - 40 * sm(-46, -40, x);
      return 0.5 * (h + close + Math.sqrt((h - close) * (h - close) + 9));   /* soft max: the head of the valley closes the reservoir */
    }
    const PADS = [
      { x0: 21.4, x1: 36.6, z0: -5.4, z1: 3.4, y: 0.6, e: 2.5 },     // powerhouse
      { x0: 22.2, x1: 35.8, z0: 3.4, z1: 8.6, y: -1.6, e: 1.2 },     // tailrace
      { x0: 37.2, x1: 54, z0: -6.4, z1: 5.2, y: 0.9, e: 2.5 },       // switchyard
      { x0: 4.2, x1: 10.6, z0: -12, z1: -7, y: 8.0, e: 2.0 },        // tunnel portal and valve house
      { x0: -8.2, x1: -1.4, z0: 1.0, z1: 11.9, y: -2.2, e: 1.0 },    // stilling basin
    ];
    const SURGE = { x: 1, z: -13, r: 2.6 };
    SURGE.y = natural(SURGE.x, SURGE.z) + 0.2;
    const PEN_S = V(8.8, 8.6, -8.2), PEN_E = V(21.6, 1.4, -4.6);
    function H(x, z) {
      let h = natural(x, z);
      for (const p of PADS) {
        const dx = Math.max(p.x0 - x, 0, x - p.x1), dz = Math.max(p.z0 - z, 0, z - p.z1);
        h = lerp(h, p.y, 1 - sm(0, p.e, Math.hypot(dx, dz)));
      }
      h = lerp(h, SURGE.y - 0.2, 1 - sm(SURGE.r, SURGE.r + 2, Math.hypot(x - SURGE.x, z - SURGE.z)));
      /* the penstock corridor: the ground is cut to just below the pipe */
      const ax = PEN_E.x - PEN_S.x, az = PEN_E.z - PEN_S.z, t = Math.max(0, Math.min(1, ((x - PEN_S.x) * ax + (z - PEN_S.z) * az) / (ax * ax + az * az)));
      const dist = Math.hypot(x - (PEN_S.x + ax * t), z - (PEN_S.z + az * t)), ly = lerp(PEN_S.y, PEN_E.y, t) - 0.9;
      return lerp(h, Math.min(h, ly), 1 - sm(1.4, 3.4, dist));
    }

    /* ---------- materials ---------- */
    const std = (c, m, r, x) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m, roughness: r }, x || {}));
    const M = {
      concrete: std(0xbab6ac, 0, 0.92), conDk: std(0x96928a, 0, 0.95), conLt: std(0xcdc9bf, 0, 0.9),
      steel: std(0x8d979e, 0.4, 0.5), steelDk: std(0x4a535a, 0.5, 0.5), pen: std(0x58626a, 0.5, 0.45),
      stainless: std(0xd0d5d8, 0.6, 0.3), gate: std(0xc9a243, 0.3, 0.5), gen: std(0x6a8399, 0.3, 0.45), genDk: std(0x3c4d5d, 0.35, 0.5),
      wall: std(0xd9d4c8, 0, 0.85), roof: std(0x5b666e, 0.35, 0.55), glass: std(0x7e98a6, 0.3, 0.12), dark: std(0x2a2f33, 0.2, 0.7),
      rack: std(0x33393e, 0.6, 0.5), galv: std(0xa7b0b6, 0.6, 0.42), tank: std(0x7b878e, 0.25, 0.55), porc: std(0x76381d, 0.05, 0.3),
      alu: std(0xc0c6ca, 0.7, 0.35), yellow: std(0xd9a823, 0.2, 0.55), white: std(0xeeeeea, 0, 0.6), cable: std(0x2a2d2f, 0.1, 0.6),
      water: std(0x5f8fb8, 0.05, 0.18, { transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
    };
    const sheet = new THREE.MeshBasicMaterial({ color: 0xdcecff, transparent: true, opacity: 0, depthWrite: false });
    const xray = new THREE.MeshBasicMaterial({ color: 0x5d7f9e, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false });
    const xrayWater = new THREE.MeshBasicMaterial({ color: 0x3f8fe0, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8a8a8f });

    /* ---------- components: each one's pieces, with its own materials so it can glow when picked ---------- */
    const parts = {}, pickables = [];
    HY.PARTS.forEach((p) => { parts[p.id] = { meshes: [], mats: new Map() }; });
    function pmat(id, base) {
      if (!id) return base;
      const P = parts[id];
      if (!P.mats.has(base)) { const m = base.clone(); m.userData.base = base; P.mats.set(base, m); }
      return P.mats.get(base);
    }
    function own(mesh, id) {
      if (!id) return mesh;
      mesh.userData.part = id; parts[id].meshes.push(mesh); pickables.push(mesh);
      return mesh;
    }

    /* ---------- geometry helpers ---------- */
    const G = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 20), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), sph: new THREE.SphereGeometry(1, 16, 10) };
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
        if (!g.attributes.normal) g.computeVertexNormals();
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
    const ID = new THREE.Matrix4();
    function Batch() { this.items = new Map(); }
    Batch.prototype = {
      put(mat, g, m) { if (!this.items.has(mat)) this.items.set(mat, []); this.items.get(mat).push([g, m || ID]); return this; },
      /* a box from corner to corner */
      span(mat, x0, x1, y0, y1, z0, z1) { return this.put(mat, G.box, mtx([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], null, [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)])); },
      box(mat, w, h, d, x, y, z, r) { return this.put(mat, G.box, mtx([x, y, z], r, [w, h, d])); },
      cyl(mat, rad, h, x, y, z, r, g) { return this.put(mat, g || G.cyl, mtx([x, y, z], r, [rad, h, rad])); },
      sph(mat, rad, x, y, z) { return this.put(mat, G.sph, mtx([x, y, z], null, rad)); },
      seg(mat, a, b, w, d, g) {
        const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
        if (len < 1e-4) return this;
        const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
        return this.put(mat, g || G.box, new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(w, len, d == null ? w : d)));
      },
      rod(mat, a, b, r, g) { return this.seg(mat, a, b, r, r, g || G.cyl8); },
      pipe(mat, a, b, r) { return this.seg(mat, a, b, r, r, G.cyl); },
      path(mat, pts, r) { for (let i = 1; i < pts.length; i++) this.rod(mat, pts[i - 1], pts[i], r); return this; },
      flush(id, parent, o) {
        o = o || {};
        this.items.forEach((list, base) => {
          const mesh = new THREE.Mesh(merge(list), pmat(id, base));
          mesh.castShadow = o.cast !== false; mesh.receiveShadow = true;
          (parent || root).add(mesh); own(mesh, id);
          if (o.into) o.into.push(mesh);
        });
        this.items = new Map();
        return this;
      },
    };
    /* a ring (annulus) of radii r0..r1 between heights y0 and y1, about the y axis */
    function ring(r0, r1, y0, y1, seg) {
      const p = [new THREE.Vector2(r0, y0), new THREE.Vector2(r1, y0), new THREE.Vector2(r1, y1), new THREE.Vector2(r0, y1), new THREE.Vector2(r0, y0)];
      return new THREE.LatheGeometry(p, seg || 40);
    }
    /* a shape in the x-y plane pushed along z from z0 to z1 */
    function prism(pts, z0, z1) {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: z1 - z0, bevelEnabled: false });
      g.translate(0, 0, z0); return g;
    }
    /* a tube along a curve whose radius changes from end to end: r(t) for t in 0..1 */
    function varTube(pts, segs, radial, r) {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, nrm = g.attributes.normal, P = new THREE.Vector3();
      for (let i = 0; i <= segs; i++) {
        curve.getPointAt(i / segs, P); const rr = r(i / segs);
        for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; pos.setXYZ(k, P.x + nrm.getX(k) * rr, P.y + nrm.getY(k) * rr, P.z + nrm.getZ(k) * rr); }
      }
      pos.needsUpdate = true; g.computeBoundingSphere();
      return g;
    }
    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    }
    /* a sagging conductor between two points */
    function sag(a, b, d, n) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = i / n; out.push(new THREE.Vector3().lerpVectors(a, b, t).add(V(0, -4 * d * t * (1 - t), 0))); }
      return out;
    }

    /* ======================================================================
       The block: the ground's surface with contour lines, cut faces showing the rock beds
       ====================================================================== */
    const NX = 128, NZ = 72;
    const tg = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ); tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setY(i, H(tp.getX(i), tp.getZ(i)));
    tg.computeVertexNormals();
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tp.count * 3), 3));
    const terrMat = std(0xffffff, 0, 0.96, { vertexColors: true });
    const contour = { uLine: { value: new THREE.Color(0x3a3a3a) }, uLineA: { value: 0.25 } };
    terrMat.extensions = { derivatives: true };
    terrMat.onBeforeCompile = (sh) => {
      sh.uniforms.uLine = contour.uLine; sh.uniforms.uLineA = contour.uLineA;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform vec3 uLine;\nuniform float uLineA;\n' +
        'float contourAt(float v, float step, float w) { float d = abs(fract(v / step + 0.5) - 0.5) * step; float fw = max(fwidth(v), 1e-4); return 1.0 - smoothstep(w * fw, (w + 1.0) * fw, d); }')
        .replace('#include <tonemapping_fragment>', '{ float c = max(contourAt(vWY, 2.0, 0.35) * 0.55, contourAt(vWY, 10.0, 0.75)); gl_FragColor.rgb = mix(gl_FragColor.rgb, uLine, c * uLineA); }\n#include <tonemapping_fragment>');
    };
    const terrain = new THREE.Mesh(tg, terrMat); terrain.receiveShadow = true; root.add(terrain);
    function paintTerrain(ground, rock, bank) {
      const c = tg.attributes.color, n = tg.attributes.normal, cg = new THREE.Color(ground), cr = new THREE.Color(rock), cb = new THREE.Color(bank), cc = new THREE.Color();
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), steep = 1 - n.getY(i);
        cc.copy(cg).lerp(cr, sm(0.16, 0.42, steep));
        const nearRiver = Math.abs(z - riverZ(x)) < 6.5 && x > DAM_X;
        if (y < 1.0 && nearRiver) cc.lerp(cb, 0.7);
        cc.multiplyScalar(0.94 + 0.12 * (0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.9) * Math.cos(z * 0.43 - x * 0.21)));
        c.setXYZ(i, cc.r, cc.g, cc.b);
      }
      c.needsUpdate = true;
    }

    /* the four cut faces: horizontal rock beds below a band of soil */
    const strataTex = canvasTex(32, 512, (g, w, h) => {
      const beds = [['#6f6a62', 0], ['#857e73', 0.12], ['#9d9482', 0.25], ['#8a8378', 0.36], ['#a89c86', 0.47], ['#938b7e', 0.6], ['#ada28c', 0.7], ['#9a9283', 0.84], ['#b0a690', 0.93]];
      beds.forEach(([c, v], i) => { const v1 = i + 1 < beds.length ? beds[i + 1][1] : 1; g.fillStyle = c; g.fillRect(0, h - v1 * h, w, (v1 - v) * h + 1); });
      for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
    });
    strataTex.wrapS = THREE.RepeatWrapping;
    const strataMat = std(0xffffff, 0, 0.95, { map: strataTex, side: THREE.DoubleSide });
    const soilMat = std(0x7a6a55, 0, 0.95, { side: THREE.DoubleSide });
    function faceStrip(pts, top, bottom, mat, uvScale) {
      const P = [], U = [], I = [];
      let along = 0;
      pts.forEach(([x, z], i) => {
        if (i) along += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
        const yt = top(x, z), yb = bottom(x, z);
        P.push(x, yt, z, x, yb, z);
        U.push(along / 14, (yt - BASE) / 60, along / 14, (yb - BASE) / 60);
        if (i) { const a = (i - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      if (uvScale !== false) g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; root.add(m); return m;
    }
    const edges = [];
    for (let x = X0; x <= X1; x++) edges.push([x, Z1]);
    const SOUTH = edges.slice(), EAST = [], NORTH = [], WEST = [];
    for (let z = Z1; z >= Z0; z--) EAST.push([X1, z]);
    for (let x = X1; x >= X0; x--) NORTH.push([x, Z0]);
    for (let z = Z0; z <= Z1; z++) WEST.push([X0, z]);
    [SOUTH, EAST, NORTH, WEST].forEach((side) => {
      faceStrip(side, (x, z) => H(x, z) - 0.7, () => BASE, strataMat);
      faceStrip(side, (x, z) => H(x, z), (x, z) => H(x, z) - 0.7, soilMat, false);
    });
    /* the river leaves through the east face: its water in section */
    const riverCut = [];
    for (let z = Z0; z <= Z1; z += 0.25) if (H(X1, z) < 0) riverCut.push([X1 + 0.02, z]);
    if (riverCut.length > 1) faceStrip(riverCut, () => 0, (x, z) => H(X1, z), M.water, false);
    /* the block's outline, as in a drawing */
    const ol = [];
    const topLine = (side) => { for (let i = 1; i < side.length; i++) ol.push(V(side[i - 1][0], H(side[i - 1][0], side[i - 1][1]), side[i - 1][1]), V(side[i][0], H(side[i][0], side[i][1]), side[i][1])); };
    [SOUTH, EAST, NORTH, WEST].forEach(topLine);
    [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]].forEach(([x, z], i, a) => {
      ol.push(V(x, BASE, z), V(x, H(x, z), z));
      const [x2, z2] = a[(i + 1) % 4]; ol.push(V(x, BASE, z), V(x2, BASE, z2));
    });
    const outline = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ol), lineMat); root.add(outline);
    /* a soft halo under the block, as under every Anatomy figure */
    const haloTex = canvasTex(256, 160, (g, w, h) => {
      g.filter = 'blur(14px)'; g.fillStyle = '#000'; g.fillRect(30, 30, w - 60, h - 60);
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 30, Z1 - Z0 + 26), new THREE.MeshBasicMaterial({ map: haloTex, color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(2, BASE - 0.05, 3); halo.renderOrder = -1; root.add(halo);

    /* ======================================================================
       Water: the reservoir, the river below the dam
       ====================================================================== */
    const RES_X1 = DAM_X - 1.6;
    const resMat = pmat('reservoir', M.water);
    const reservoir = own(new THREE.Mesh(new THREE.PlaneGeometry(RES_X1 - X0, Z1 - Z0), resMat), 'reservoir');
    reservoir.rotation.x = -Math.PI / 2; reservoir.position.set((X0 + RES_X1) / 2, 20, 0); reservoir.renderOrder = 1; root.add(reservoir);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(X1 + 10, Z1 - Z0), M.water);
    river.rotation.x = -Math.PI / 2; river.position.set((X1 - 10) / 2, 0, 0); river.renderOrder = 1; root.add(river);

    /* ======================================================================
       Dam: a concrete gravity dam with a gated spillway in the middle
       ====================================================================== */
    const yCrest = HY.Y(512), ySpill = HY.Y(497), B = new Batch();
    const NOF = [[-25.6, -1.6], [-7.4, -1.6], [-23.2, 20.4], [-23.2, yCrest], [-25.6, yCrest]];
    const OGEE = [[-25.6, -1.6], [-8.2, -1.6], [-22.6, 18.4], [-23.6, 19.1], [-24.6, ySpill], [-25.3, 18.8], [-25.6, 17.9]];
    const SP_Z0 = 1.2, SP_Z1 = 11.7, DAM_Z0 = -15, DAM_Z1 = 27;
    B.put(M.concrete, prism(NOF, DAM_Z0, SP_Z0)).put(M.concrete, prism(NOF, SP_Z1, DAM_Z1));
    [[DAM_Z0, SP_Z0], [SP_Z1, DAM_Z1]].forEach(([a, b]) => {
      B.span(M.conLt, -25.6, -25.3, yCrest, yCrest + 0.4, a, b).span(M.conLt, -23.5, -23.2, yCrest, yCrest + 0.4, a, b);   /* parapets */
      for (let z = a + 2; z < b - 1; z += 4.5) B.cyl(M.steelDk, 0.04, 0.9, -23.35, yCrest + 0.85, z);                     /* lamp posts */
    });
    B.flush('dam');
    /* contraction joints between the blocks, drawn as lines on the faces */
    const jl = [];
    for (let z = DAM_Z0 + 3; z < DAM_Z1; z += 3.2) {
      if (z > SP_Z0 - 0.3 && z < SP_Z1 + 0.3) continue;
      jl.push(V(-23.17, 20.4, z), V(-7.38, -1.58, z), V(-23.17, 20.4, z), V(-23.17, yCrest, z), V(-25.62, yCrest, z), V(-25.62, 0, z));
    }
    root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(jl), lineMat));
    /* spillway: ogee crest, five piers, a bridge, four radial gates and a stilling basin */
    const S = new Batch();
    S.put(M.conDk, prism(OGEE, SP_Z0, SP_Z1));
    const PIERS = [0, 1, 2, 3, 4].map((i) => SP_Z0 + 0.25 + i * 2.5), BAYS = [0, 1, 2, 3].map((i) => SP_Z0 + 0.5 + i * 2.5 + 1.0);
    PIERS.forEach((z) => {
      S.span(M.concrete, -26.4, -22.2, 16.8, yCrest + 1.0, z - 0.25, z + 0.25);
      S.cyl(M.concrete, 0.25, yCrest + 1.0 - 16.8, -26.4, (16.8 + yCrest + 1.0) / 2, z);
      S.cyl(M.steelDk, 0.12, 0.62, -22.9, 20.7, z, [Math.PI / 2, 0, 0]);   /* trunnion pins */
    });
    S.span(M.conLt, -26.5, -24.3, yCrest + 1.0, yCrest + 1.4, SP_Z0, SP_Z1);        /* road bridge */
    BAYS.forEach((z) => S.span(M.white, -23.6, -22.2, yCrest + 1.0, yCrest + 1.9, z - 0.8, z + 0.8));   /* gate hoists */
    S.span(M.conDk, -8.2, -1.4, -2.6, -2.2, SP_Z0, SP_Z1);                          /* stilling basin floor */
    S.span(M.concrete, -8.2, -1.4, -2.6, 0.7, SP_Z0 - 0.5, SP_Z0).span(M.concrete, -8.2, -1.4, -2.6, 0.7, SP_Z1, SP_Z1 + 0.5);
    S.span(M.concrete, -2.0, -1.4, -2.2, -1.5, SP_Z0, SP_Z1);                        /* end sill */
    for (let i = 0; i < 8; i++) S.box(M.concrete, 0.5, 0.5, 0.6, -5.8 + (i % 2) * 1.2, -1.95, SP_Z0 + 0.9 + i * 1.25);   /* baffle blocks */
    S.flush('spillway');
    const spillGates = BAYS.map((zc) => {
      const g = new THREE.Group(); g.position.set(-22.9, 20.7, 0); root.add(g);
      const R = 2.3, a0 = (216 * Math.PI) / 180, a1 = (164 * Math.PI) / 180, z0 = zc - 0.97, z1 = zc + 0.97, P = [], I = [];
      for (let k = 0; k <= 10; k++) { const a = lerp(a0, a1, k / 10); P.push(R * Math.cos(a), R * Math.sin(a), z0, R * Math.cos(a), R * Math.sin(a), z1); if (k) { const b = (k - 1) * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
      const skin = new THREE.BufferGeometry(); skin.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); skin.setIndex(I); skin.computeVertexNormals();
      const gb = new Batch();
      gb.put(M.steel, skin);
      const am = (lerp(a0, a1, 0.5)), tip = V(R * Math.cos(am), R * Math.sin(am), 0);
      [z0 + 0.12, z1 - 0.12].forEach((z) => { gb.rod(M.steelDk, V(0, 0, z), V(R * Math.cos(a0), R * Math.sin(a0), z), 0.07); gb.rod(M.steelDk, V(0, 0, z), V(R * Math.cos(a1), R * Math.sin(a1), z), 0.07); gb.rod(M.steelDk, V(0, 0, z), V(tip.x, tip.y, z), 0.05); });
      gb.flush('spillway', g);
      g.traverse((o) => { if (o.isMesh) { o.material = pmat('spillway', o.material.userData.base || o.material); o.material.side = THREE.DoubleSide; } });
      return g;
    });
    /* the sheet of water on the chute and the white water in the basin, shown while spilling */
    const chuteProfile = [[-24.95, 19.45], [-24.6, ySpill + 0.08], [-23.6, 19.18], [-22.6, 18.48], [-8.2, -1.5], [-5, -0.08], [-1.4, 0.02]];
    const chute = (() => {
      const P = [], I = [];
      chuteProfile.forEach(([x, y], i) => { P.push(x, y, SP_Z0 + 0.5, x, y, SP_Z1 - 0.5); if (i) { const b = (i - 1) * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, sheet); m.renderOrder = 2; root.add(m); return m;
    })();
    chute.material.side = THREE.DoubleSide;

    /* ======================================================================
       Intake tower with trash racks, its hoist and the access bridge
       ====================================================================== */
    const IN = { x: -32, z: -4.5 }, yRack0 = 9.0, yRack1 = 14.4, yDeck = 24.0;
    const T = new Batch();
    T.span(M.concrete, IN.x - 1.5, IN.x + 1.5, 3, yDeck, IN.z - 1.5, IN.z + 1.5);
    /* racks on the three faces that look into the reservoir: a dark opening and vertical bars */
    [[0, 1], [-1, 0], [1, 0]].forEach(([fx, fz]) => {
      const cx = IN.x + fx * 1.52, cz = IN.z + fz * 1.52;
      if (fz) T.span(M.dark, IN.x - 1.1, IN.x + 1.1, yRack0, yRack1, cz - 0.03, cz + 0.03);
      else T.span(M.dark, cx - 0.03, cx + 0.03, yRack0, yRack1, IN.z - 1.1, IN.z + 1.1);
      for (let k = -4; k <= 4; k++) {
        if (fz) T.span(M.rack, IN.x + k * 0.26 - 0.03, IN.x + k * 0.26 + 0.03, yRack0, yRack1, cz + fz * 0.04 - 0.03, cz + fz * 0.04 + 0.03);
        else T.span(M.rack, cx + fx * 0.04 - 0.03, cx + fx * 0.04 + 0.03, yRack0, yRack1, IN.z + k * 0.26 - 0.03, IN.z + k * 0.26 + 0.03);
      }
      if (fz) T.span(M.concrete, IN.x - 1.55, IN.x + 1.55, yRack1, yRack1 + 0.3, cz - 0.05, cz + 0.1);
      else T.span(M.concrete, cx - 0.1, cx + 0.1, yRack1, yRack1 + 0.3, IN.z - 1.55, IN.z + 1.55);
    });
    T.span(M.white, IN.x - 0.9, IN.x + 0.9, yDeck, yDeck + 1.2, IN.z - 0.9, IN.z + 0.9);         /* hoist house */
    T.span(M.roof, IN.x - 1.0, IN.x + 1.0, yDeck + 1.2, yDeck + 1.35, IN.z - 1.0, IN.z + 1.0);
    T.span(M.conLt, IN.x - 0.6, IN.x + 0.6, yDeck - 0.35, yDeck, IN.z - 1.5, -10.8);             /* bridge to the north shore */
    for (const x of [IN.x - 0.58, IN.x + 0.58]) T.rod(M.galv, V(x, yDeck + 0.5, IN.z - 1.5), V(x, yDeck + 0.5, -10.8), 0.03);
    T.span(M.concrete, IN.x - 0.4, IN.x + 0.4, H(IN.x, -8.2) - 1, yDeck - 0.35, -8.6, -7.8);      /* bridge pier */
    T.flush('intake');

    /* ======================================================================
       Headrace tunnel, surge tank, portal and valve house
       ====================================================================== */
    const TUN = [V(IN.x, 9.2, IN.z), V(-31, 9.15, -12), V(-22, 9.1, -17.5), V(-8, 9.0, -18), V(-1, 8.9, -14.6), V(SURGE.x, 8.9, SURGE.z), V(4.4, 8.85, -11.9), V(5.6, 8.8, -11.8)];
    const tunCurve = new THREE.CatmullRomCurve3(TUN, false, 'centripetal');
    const tunnel = own(new THREE.Mesh(new THREE.TubeGeometry(tunCurve, 90, 0.6, 14, false), pmat('tunnel', xray)), 'tunnel');
    tunnel.renderOrder = 3; root.add(tunnel);
    const shaftIn = own(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, yRack1 - 9.2, 14, 1, true), pmat('intake', xray)), 'intake');
    shaftIn.position.set(IN.x, (yRack1 + 9.2) / 2, IN.z); shaftIn.renderOrder = 3; root.add(shaftIn);
    /* portal headwall */
    const PW = new Batch();
    PW.span(M.concrete, 4.0, 10.8, 7.6, 12.6, -12.5, -11.8);
    PW.span(M.dark, 4.7, 6.5, 8.0, 9.8, -11.85, -11.75);
    PW.span(M.conLt, 3.9, 10.9, 12.6, 12.85, -12.6, -11.7);
    PW.flush('tunnel');
    /* surge tank: an open shaft and a tank on the hill, cut open toward the viewer */
    const yTop = HY.Y(530), th0 = (32 + 45) * Math.PI / 180, thL = 1.5 * Math.PI, hT = yTop - SURGE.y;
    const ST = new Batch();
    const wallO = new THREE.CylinderGeometry(2.15, 2.15, hT, 44, 1, true, th0, thL), wallI = new THREE.CylinderGeometry(1.85, 1.85, hT, 44, 1, true, th0, thL);
    ST.put(M.concrete, wallO, mtx([SURGE.x, SURGE.y + hT / 2, SURGE.z])).put(M.conDk, wallI, mtx([SURGE.x, SURGE.y + hT / 2, SURGE.z]));
    [th0, th0 + thL].forEach((a) => ST.box(M.conLt, 0.3, hT, 0.06, SURGE.x + 2.0 * Math.sin(a), SURGE.y + hT / 2, SURGE.z + 2.0 * Math.cos(a), [0, a + Math.PI / 2, 0]));
    ST.put(M.conLt, ring(1.85, 2.15, yTop, yTop + 0.12, 44), mtx([SURGE.x, 0, SURGE.z]));
    ST.put(M.conDk, ring(1.0, 2.15, SURGE.y - 0.3, SURGE.y, 44), mtx([SURGE.x, 0, SURGE.z]));
    ST.put(M.concrete, ring(2.15, 2.6, SURGE.y - 0.6, SURGE.y + 0.25, 44), mtx([SURGE.x, 0, SURGE.z]));
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; ST.cyl(M.galv, 0.025, 0.55, SURGE.x + 2.05 * Math.sin(a), yTop + 0.38, SURGE.z + 2.05 * Math.cos(a)); }
    ST.put(M.galv, new THREE.TorusGeometry(2.05, 0.03, 4, 44), mtx([SURGE.x, yTop + 0.66, SURGE.z], [Math.PI / 2, 0, 0]));
    ST.flush('surge');
    for (const m of parts.surge.meshes) m.material.side = THREE.DoubleSide;
    const shaft = own(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, SURGE.y - 8.9, 18, 1, true), pmat('surge', xray)), 'surge');
    shaft.position.set(SURGE.x, (SURGE.y + 8.9) / 2, SURGE.z); shaft.renderOrder = 3; root.add(shaft);
    const surgeWater = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.83, 1, 36), M.water); surgeWater.renderOrder = 2; root.add(surgeWater);
    const shaftWater = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1, 16), xrayWater); shaftWater.renderOrder = 4; root.add(shaftWater);
    /* valve house over the start of the penstock */
    const VH = new Batch();
    VH.span(M.wall, 6.3, 8.9, 8.0, 10.4, -10.4, -8.0).span(M.roof, 6.15, 9.05, 10.4, 10.65, -10.55, -7.85);
    VH.span(M.dark, 7.2, 8.0, 8.0, 9.6, -7.99, -7.96).span(M.glass, 6.5, 7.0, 9.2, 9.8, -7.99, -7.96);
    VH.pipe(M.pen, V(5.6, 8.8, -11.8), V(6.4, 8.75, -10.3), 0.55);
    VH.flush('valve');

    /* ======================================================================
       Penstock down the hillside, its anchor blocks and saddles, and the header to the units
       ====================================================================== */
    const PS = new Batch(), dirP = new THREE.Vector3().subVectors(PEN_E, PEN_S), lenP = dirP.length(), qP = new THREE.Quaternion().setFromUnitVectors(UP, dirP.clone().normalize());
    PS.pipe(M.pen, V(8.2, 8.65, -8.9), PEN_S, 0.55).pipe(M.pen, PEN_S, PEN_E, 0.55);
    for (let s = 0.9; s < lenP - 0.6; s += 1.15) {
      const p = new THREE.Vector3().copy(PEN_S).addScaledVector(dirP, s / lenP);
      PS.put(M.steelDk, new THREE.TorusGeometry(0.57, 0.035, 5, 28), new THREE.Matrix4().compose(p, qP.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), new THREE.Vector3(1, 1, 1)));
    }
    const yaw = -Math.atan2(dirP.z, dirP.x);
    for (let s = 2.2; s < lenP - 1.6; s += 2.3) {
      const p = new THREE.Vector3().copy(PEN_S).addScaledVector(dirP, s / lenP), g = H(p.x, p.z);
      PS.box(M.concrete, 0.7, Math.max(0.2, p.y - 0.45 - g + 0.4), 1.3, p.x, (p.y - 0.45 + g - 0.4) / 2, p.z, [0, yaw, 0]);
    }
    PS.box(M.concrete, 2.2, 2.4, 2.4, PEN_E.x, PEN_E.y - 0.2, PEN_E.z, [0, yaw, 0]);                    /* anchor block at the foot */
    const expP = new THREE.Vector3().copy(PEN_S).addScaledVector(dirP, 1.6 / lenP);
    PS.put(M.steel, new THREE.TorusGeometry(0.6, 0.09, 6, 28), new THREE.Matrix4().compose(expP, qP.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), new THREE.Vector3(1, 1, 1)));
    const UNITS = [24.6, 28.6, 32.6], RC = 1.32, XB = UNITS.map((x) => x + RC);
    PS.pipe(M.pen, PEN_E, V(XB[2], 1.4, -4.6), 0.5);
    XB.forEach((xb) => {
      PS.pipe(M.pen, V(xb, 1.4, -4.6), V(xb, 0.9, -3.95), 0.45);
      PS.sph(M.steel, 0.52, xb, 0.95, -4.05);                                                            /* main inlet valve */
      PS.cyl(M.steelDk, 0.08, 0.9, xb + 0.55, 1.2, -4.05);
      PS.box(M.concrete, 0.8, 0.8, 0.8, xb, 0.4, -4.6);
    });
    PS.flush('penstock');

    /* ======================================================================
       Powerhouse: concrete substructure around the turbines, a steel-framed hall above
       ====================================================================== */
    const PH = { x0: 22.2, x1: 35.8, z0: -3.6, z1: 3.4, yb: -2.6, yf: 3.0, yr: 8.4 };
    const cut = [];   /* the pieces taken away to see inside */
    const PB = new Batch();
    PB.span(M.conDk, PH.x0, PH.x1, PH.yb, PH.yb + 0.3, PH.z0, PH.z1);
    PB.span(M.conDk, PH.x0, PH.x1, PH.yb, PH.yf, PH.z0, PH.z0 + 0.6);
    PB.span(M.conDk, PH.x0, PH.x0 + 0.6, PH.yb, PH.yf, PH.z0, PH.z1).span(M.conDk, PH.x1 - 0.6, PH.x1, PH.yb, PH.yf, PH.z0, PH.z1);
    PB.span(M.concrete, PH.x0, PH.x1, PH.yf - 0.22, PH.yf, PH.z0, PH.z1);                           /* generator floor */
    PB.span(M.wall, PH.x0, PH.x1, PH.yf, PH.yr, PH.z0, PH.z0 + 0.3);
    PB.span(M.wall, PH.x0, PH.x0 + 0.3, PH.yf, PH.yr, PH.z0, PH.z1).span(M.wall, PH.x1 - 0.3, PH.x1, PH.yf, PH.yr, PH.z0, PH.z1);
    for (let x = PH.x0 + 3.4; x < PH.x1 - 1; x += 3.4) PB.span(M.roof, x - 0.15, x + 0.15, PH.yf, PH.yr, PH.z0 + 0.3, PH.z0 + 0.5);   /* columns */
    PB.span(M.steelDk, PH.x0 + 0.3, PH.x1 - 0.3, 6.9, 7.1, PH.z0 + 0.5, PH.z0 + 0.7);               /* crane rails */
    PB.span(M.yellow, 26.4, 26.9, 7.1, 7.55, PH.z0 + 0.5, PH.z1 - 0.5);                             /* crane bridge and its hoist */
    PB.span(M.dark, 26.1, 27.2, 6.7, 7.1, -0.5, 0.5);
    for (let k = 0; k < 3; k++) PB.span(M.dark, PH.x1 - 0.02, PH.x1 + 0.02, 4.0, 4.8, -2.9 + k * 2.8, -2.1 + k * 2.8);   /* bus duct openings */
    PB.flush('powerhouse');
    const PC = new Batch();
    /* front of the substructure with the draft tube outlets */
    let xl = PH.x0;
    UNITS.forEach((xu) => { PC.span(M.conDk, xl, xu - 0.9, PH.yb, PH.yf - 0.22, PH.z1 - 0.6, PH.z1); xl = xu + 0.9; });
    PC.span(M.conDk, xl, PH.x1, PH.yb, PH.yf - 0.22, PH.z1 - 0.6, PH.z1);
    UNITS.forEach((xu) => PC.span(M.conDk, xu - 0.9, xu + 0.9, -0.75, PH.yf - 0.22, PH.z1 - 0.6, PH.z1));
    /* front wall with tall windows, roof, front crane rail */
    PC.span(M.wall, PH.x0, PH.x1, PH.yf, PH.yr, PH.z1 - 0.3, PH.z1);
    for (let k = 0; k < 4; k++) PC.span(M.glass, PH.x0 + 1.4 + k * 3.25, PH.x0 + 3.0 + k * 3.25, 4.2, 7.6, PH.z1 + 0.01, PH.z1 + 0.04);
    PC.span(M.roof, PH.x0 - 0.2, PH.x1 + 0.2, PH.yr, PH.yr + 0.32, PH.z0 - 0.2, PH.z1 + 0.2);
    PC.span(M.wall, PH.x0 - 0.2, PH.x1 + 0.2, PH.yr + 0.32, PH.yr + 0.62, PH.z1, PH.z1 + 0.2).span(M.wall, PH.x0 - 0.2, PH.x1 + 0.2, PH.yr + 0.32, PH.yr + 0.62, PH.z0 - 0.2, PH.z0);
    PC.span(M.steelDk, PH.x0 + 0.3, PH.x1 - 0.3, 6.9, 7.1, PH.z1 - 0.7, PH.z1 - 0.5);
    PC.flush('powerhouse', null, { into: cut });

    /* ======================================================================
       The three units: spiral casing, wicket gates, runner, shaft, generator, draft tube
       ====================================================================== */
    const AEND = (330 * Math.PI) / 180;
    const spiralPts = (xu) => {
      const pts = [V(xu + RC, 0.9, -3.6), V(xu + RC, 0.9, -2.2), V(xu + RC, 0.9, -0.8)];
      for (let a = 0; a <= AEND + 1e-6; a += 0.2) { const r = RC - 0.36 * (a / AEND); pts.push(V(xu + r * Math.cos(a), 0.9, r * Math.sin(a))); }
      return pts;
    };
    const draftPts = (xu) => [V(xu, 0.45, 0), V(xu, -0.4, 0), V(xu, -1.2, 0.35), V(xu, -1.65, 1.3), V(xu, -1.6, 2.6), V(xu, -1.55, 3.5)];
    const units = UNITS.map((xu) => {
      const U = new Batch();
      U.put(M.steel, varTube(spiralPts(xu), 120, 18, (t) => (t < 0.35 ? 0.5 : 0.5 - 0.32 * ((t - 0.35) / 0.65))));
      U.flush('spiral');
      const D = new Batch();
      D.put(M.conDk, varTube(draftPts(xu), 60, 18, (t) => 0.4 + 0.38 * t));
      D.flush('drafttube');
      parts.drafttube.meshes.forEach((m) => { m.material.side = THREE.DoubleSide; });
      /* stay ring and head cover, and the gate operating ring with its servomotors */
      const W = new Batch();
      W.put(M.steel, ring(0.6, 0.86, 1.36, 1.46), mtx([xu, 0, 0])).put(M.steel, ring(0.6, 0.86, 0.34, 0.44), mtx([xu, 0, 0]));
      W.put(M.gate, ring(0.88, 1.0, 1.5, 1.58), mtx([xu, 0, 0]));
      [-1, 1].forEach((s) => W.pipe(M.gate, V(xu + s * 0.4, 1.56, -1.1), V(xu + s * 1.2, 1.56, -0.4), 0.09));
      W.flush('gates');
      const vanes = [];
      const vgeo = new THREE.BoxGeometry(0.3, 0.9, 0.035);
      for (let k = 0; k < 16; k++) {
        const phi = (k / 16) * TAU, m = own(new THREE.Mesh(vgeo, pmat('gates', M.gate)), 'gates');
        m.position.set(xu + 0.74 * Math.cos(phi), 0.9, 0.74 * Math.sin(phi)); m.userData.phi = phi; m.castShadow = true; root.add(m); vanes.push(m);
      }
      /* the rotating parts: runner, shaft, generator rotor, exciter */
      const rotor = new THREE.Group(); rotor.position.set(xu, 0, 0); root.add(rotor);
      const R = new Batch();
      R.cyl(M.stainless, 0.56, 0.1, 0, 1.28, 0).cyl(M.stainless, 0.2, 0.42, 0, 1.0, 0, null, new THREE.CylinderGeometry(1, 0.35, 1, 20));
      R.put(M.stainless, ring(0.46, 0.52, 0.44, 0.62, 36));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; R.box(M.stainless, 0.3, 0.72, 0.03, 0.34 * Math.cos(a), 0.88, 0.34 * Math.sin(a), [0.45, -a + 0.9, 0.25]); }
      R.cyl(M.steel, 0.13, 2.7, 0, 2.6, 0);
      R.flush('runner', rotor);
      const RG = new Batch();
      RG.cyl(M.genDk, 1.0, 0.86, 0, 3.5, 0);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; RG.box(M.white, 0.75, 0.03, 0.12, 0.55 * Math.cos(a), 3.94, -0.55 * Math.sin(a), [0, a, 0]); }
      RG.cyl(M.gen, 0.3, 0.46, 0, 4.36, 0).cyl(M.alu, 0.31, 0.06, 0, 4.25, 0).cyl(M.alu, 0.31, 0.06, 0, 4.45, 0);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; RG.box(M.gen, 0.12, 0.4, 0.04, 0.33 * Math.cos(a), 4.36, -0.33 * Math.sin(a), [0, a, 0]); }
      RG.flush('generator', rotor);
      /* generator stator, air coolers and upper bracket (these stay still) */
      const GS = new Batch();
      GS.put(M.gen, ring(1.03, 1.5, PH.yf, 4.0, 44), mtx([xu, 0, 0]));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; GS.box(M.genDk, 0.5, 0.62, 0.32, xu + 1.6 * Math.cos(a), 3.45, 1.6 * Math.sin(a), [0, -a, 0]); }
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; GS.box(M.gen, 1.2, 0.1, 0.12, xu + 0.92 * Math.cos(a), 4.06, 0.92 * Math.sin(a), [0, -a, 0]); }
      GS.flush('generator');
      return { xu: xu, rotor: rotor, vanes: vanes, angle: Math.random() * TAU };
    });
    /* tailrace training walls */
    const TR = new Batch();
    TR.span(M.concrete, PH.x0, PH.x0 + 0.45, -2.2, 1.0, PH.z1, 8.0).span(M.concrete, PH.x1 - 0.45, PH.x1, -2.2, 1.0, PH.z1, 8.0);
    TR.span(M.conDk, PH.x0, PH.x1, -2.2, -1.9, PH.z1, 6.5);
    TR.flush('tailrace');

    /* ======================================================================
       Step-up transformers, switchyard and the outgoing line
       ====================================================================== */
    const ZT = [-2.6, 0.2, 3.0], XT = 39.2, yPad = 0.9;
    const TX = new Batch();
    ZT.forEach((z, k) => {
      TX.span(M.tank, XT - 0.7, XT + 0.7, yPad, yPad + 1.6, z - 0.8, z + 0.8);
      for (let f = 0; f < 6; f++) TX.span(M.tank, XT + 0.8, XT + 1.3, yPad + 0.25, yPad + 1.45, z - 0.7 + f * 0.27, z - 0.66 + f * 0.27);
      TX.cyl(M.tank, 0.22, 1.2, XT - 0.3, yPad + 2.1, z, [Math.PI / 2, 0, 0]);
      TX.rod(M.tank, V(XT - 0.3, yPad + 1.6, z - 0.4), V(XT - 0.3, yPad + 1.95, z - 0.4), 0.05).rod(M.tank, V(XT - 0.3, yPad + 1.6, z + 0.4), V(XT - 0.3, yPad + 1.95, z + 0.4), 0.05);
      [-0.45, 0, 0.45].forEach((dz) => TX.cyl(M.porc, 0.06, 0.9, XT + 0.25, yPad + 2.05, z + dz));
      TX.span(M.conDk, XT - 1.1, XT + 1.6, yPad - 0.1, yPad + 0.1, z - 1.1, z + 1.1);
      /* bus duct from the powerhouse */
      TX.span(M.alu, PH.x1, XT - 0.5, 4.2, 4.6, z - 0.2, z + 0.2).span(M.alu, XT - 0.9, XT - 0.5, yPad + 1.6, 4.6, z - 0.2, z + 0.2);
      if (k < 2) TX.span(M.concrete, XT - 1.0, XT + 1.4, yPad, yPad + 2.6, z + 1.3, z + 1.5);   /* fire walls */
    });
    TX.flush('gsu');
    const SW = new Batch();
    const lattice = (x, z, h, w) => {   /* a lattice column of four legs with zigzag bracing */
      const c = [[-w, -w], [w, -w], [w, w], [-w, w]];
      c.forEach(([a, b]) => SW.rod(M.galv, V(x + a, yPad, z + b), V(x + a, h, z + b), 0.05));
      for (let y = yPad, i = 0; y < h - 0.5; y += 0.8, i++) c.forEach(([a, b], j) => { const [a2, b2] = c[(j + 1) % 4]; SW.rod(M.galv, V(x + (i % 2 ? a : a2), y, z + (i % 2 ? b : b2)), V(x + (i % 2 ? a2 : a), y + 0.8, z + (i % 2 ? b2 : b)), 0.025); });
    };
    [44, 50].forEach((x) => {
      lattice(x, -4.6, 7.7, 0.25); lattice(x, 5.2, 7.7, 0.25);
      SW.span(M.galv, x - 0.25, x + 0.25, 7.5, 7.8, -4.85, 5.45);
    });
    ZT.forEach((z) => {
      SW.span(M.conDk, 46.0, 47.2, yPad, yPad + 0.3, z - 0.5, z + 0.5).span(M.tank, 46.1, 47.1, yPad + 1.0, yPad + 1.6, z - 0.4, z + 0.4);   /* breaker */
      SW.rod(M.galv, V(46.6, yPad + 0.3, z), V(46.6, yPad + 1.0, z), 0.12);
      [-0.25, 0.25].forEach((d) => SW.cyl(M.porc, 0.07, 0.8, 46.6 + d, yPad + 2.0, z));
      [42.4, 48.6].forEach((x) => { SW.rod(M.galv, V(x, yPad, z), V(x, yPad + 1.5, z), 0.07); SW.cyl(M.porc, 0.07, 0.9, x, yPad + 1.95, z); SW.rod(M.galv, V(x, yPad + 2.4, z - 0.35), V(x, yPad + 2.4, z + 0.35), 0.03); });
    });
    SW.rod(M.alu, V(50, 7.2, -4.4), V(50, 7.2, 5.0), 0.05);   /* busbar on the second gantry */
    const tower = (x, z) => {
      const g = H(x, z), c = [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]], top = g + 12.2;
      const at = (y) => { const k = sm(g, g + 9, y) * 0.62 + sm(g + 9, top, y) * 0.16; return 1 - k; };
      c.forEach(([a, b]) => SW.path(M.galv, [V(x + a, g, z + b), V(x + a * at(g + 9), g + 9, z + b * at(g + 9)), V(x + a * at(top), top, z + b * at(top))], 0.06));
      for (let y = g, i = 0; y < g + 9; y += 1.5, i++) c.forEach(([a, b], j) => { const [a2, b2] = c[(j + 1) % 4], k0 = at(y), k1 = at(y + 1.5); SW.rod(M.galv, V(x + a * k0, y, z + b * k0), V(x + a2 * k1, y + 1.5, z + b2 * k1), 0.025); SW.rod(M.galv, V(x + a2 * k0, y, z + b2 * k0), V(x + a * k1, y + 1.5, z + b * k1), 0.025); });
      SW.span(M.galv, x - 0.12, x + 0.12, g + 11.0, g + 11.25, z - 2.7, z + 2.7);
      SW.rod(M.galv, V(x, top, z), V(x, top + 0.7, z), 0.05);
      [-2.2, 0, 2.2].forEach((d) => SW.rod(M.porc, V(x, g + 11.0, z + d), V(x, g + 10.4, z + d), 0.06));
      return g + 10.4;
    };
    const yT1 = tower(57, 0.2), yT2 = tower(62.6, 0.2);
    const PH3 = [-2.2, 0, 2.2];
    const lines = [];
    PH3.forEach((d, k) => {
      lines.push(sag(V(50, 7.3, -1.0 + k * 1.2), V(57, yT1, 0.2 + d), 0.35, 12), sag(V(57, yT1, 0.2 + d), V(62.6, yT2, 0.2 + d), 0.25, 10));
    });
    ZT.forEach((z) => { lines.push(sag(V(XT + 0.25, yPad + 2.5, z), V(44, 7.3, z), 0.3, 8), [V(44, 7.3, z), V(46.6 - 0.25, yPad + 2.4, z)], [V(46.6 + 0.25, yPad + 2.4, z), V(50, 7.3, z)]); });
    lines.forEach((pts) => SW.path(M.cable, pts, 0.035));
    SW.flush('switchyard');

    /* ======================================================================
       Shadows, labels and the particle routes that show the water and the power
       ====================================================================== */
    root.traverse((o) => { if (o.isMesh && o.material && !o.material.transparent && o !== terrain) o.castShadow = true; });

    const L = (rl) => HY.Y(rl);
    /* in order of importance: where labels collide on screen, the later ones give way */
    const labels = [
      { text: 'Reservoir', pos: V(-44, 0, 6), part: 'reservoir', lv: 0.6 },
      { text: 'Dam', pos: V(-24.4, yCrest + 0.6, 20), part: 'dam' },
      { text: 'Surge tank', pos: V(SURGE.x, yTop + 1.0, SURGE.z), part: 'surge' },
      { text: 'Penstock', pos: V(15.5, 6.0, -6.6), part: 'penstock' },
      { text: 'Powerhouse', pos: V(29, PH.yr + 0.9, 0), part: 'powerhouse' },
      { text: 'Switchyard', pos: V(47, 8.3, 0.2), part: 'switchyard' },
      { text: 'Intake', pos: V(IN.x, yDeck + 1.7, IN.z), part: 'intake' },
      { text: 'Spillway', pos: V(-24, yCrest + 2.2, 6.5), part: 'spillway' },
      { text: 'Headrace tunnel', pos: V(-15, 10.5, -18), part: 'tunnel' },
      { text: 'Valve house', pos: V(7.6, 10.9, -9.2), part: 'valve' },
      { text: 'Tailrace', pos: V(29, 0.5, 6.6), part: 'tailrace' },
      { text: 'Transformers', pos: V(XT, yPad + 3.6, 0.2), part: 'gsu' },
      { text: 'Spiral casing', pos: V(UNITS[0] - 1.1, 1.5, 1.1), part: 'spiral', inside: true },
      { text: 'Wicket gates', pos: V(UNITS[1] + 0.2, 1.75, 0.95), part: 'gates', inside: true },
      { text: 'Runner', pos: V(UNITS[2], 0.75, 0.2), part: 'runner', inside: true },
      { text: 'Generator', pos: V(UNITS[1], 4.9, 0), part: 'generator', inside: true },
      { text: 'Draft tube', pos: V(UNITS[0], -1.9, 2.4), part: 'drafttube', inside: true },
    ];

    /* routes: points with a kind per stretch: 'x' drawn through the ground or a pipe wall, 'p' inside the
       powerhouse, 's' on the water's surface. Points marked lv ride on the reservoir level. */
    function route(kind, unit) { return { kind: kind, unit: unit, pts: [], tags: [], lv: [] }; }
    const add = (r, p, tag, lv) => { r.pts.push(p); r.tags.push(tag); r.lv.push(!!lv); return r; };
    const riverOn = (r, xa, tag) => { for (let x = xa; x <= X1 - 0.5; x += 3) add(r, V(x, 0.05, riverZ(x)), tag); add(r, V(X1 - 0.3, 0.05, riverZ(X1 - 0.3)), tag); };
    const routes = [];
    UNITS.forEach((xu, k) => {
      const r = route('water', k), xb = XB[k];
      add(r, V(-50, 0, 6.4), 's', 1); add(r, V(-42, 0, 4.0 + k * 0.6), 's', 1); add(r, V(-36, 0, 0.6 + k * 0.4), 's', 1); add(r, V(-33.2, 0, -2.7), 's', 1);
      add(r, V(-32.4, 12.5, -3.2), 'x');
      tunCurve.getSpacedPoints(40).forEach((p) => add(r, p.clone(), 'x'));
      /* in the open the water is shown running along the top of the pipe, so walls and machines in front still hide it */
      add(r, V(6.4, 9.35, -10.3), 'p'); add(r, V(8.2, 9.25, -8.9), 'p'); add(r, PEN_S.clone().add(V(0, 0.6, 0)), 'p'); add(r, PEN_E.clone().add(V(0, 0.55, 0)), 'p');
      add(r, V(xb, 1.95, -4.6), 'p'); add(r, V(xb, 1.4, -3.95), 'p');
      spiralPts(xu).forEach((p, i) => { if (i < 3 || i % 2 === 0) add(r, p, 'p'); });
      add(r, V(xu + 0.3, 0.9, -0.15), 'p');
      draftPts(xu).forEach((p) => add(r, p.clone(), 'p'));
      add(r, V(xu, 0.05, 5.0), 's'); add(r, V(xu + 1.2, 0.05, riverZ(xu + 1.2)), 's');
      riverOn(r, xu + 4, 's');
      routes.push(r);
    });
    BAYS.forEach((zb, j) => {
      const r = route('spill', j);
      add(r, V(-40, 0, 2 + j * 2), 's', 1); add(r, V(-29, 0, zb), 's', 1); add(r, V(-26.2, 0, zb), 's', 1);
      chuteProfile.forEach(([x, y]) => add(r, V(x, y + 0.08, zb), 's'));
      add(r, V(1.5, 0.05, riverZ(1.5)), 's');
      riverOn(r, 5, 's');
      routes.push(r);
    });
    UNITS.forEach((xu, k) => {
      const r = route('power', k), z = ZT[k];
      [V(xu, 4.4, 0), V(PH.x1, 4.4, z), V(XT - 0.7, 4.4, z), V(XT - 0.7, yPad + 1.6, z)].forEach((p) => add(r, p, 'p'));
      sag(V(XT + 0.25, yPad + 2.5, z), V(44, 7.3, z), 0.3, 8).forEach((p) => add(r, p, 'p'));
      [V(46.35, yPad + 2.4, z), V(46.85, yPad + 2.4, z), V(50, 7.3, z), V(50, 7.3, -1.0 + k * 1.2)].forEach((p) => add(r, p, 'p'));
      sag(V(50, 7.3, -1.0 + k * 1.2), V(57, yT1, 0.2 + PH3[k]), 0.35, 12).forEach((p) => add(r, p, 'p'));
      sag(V(57, yT1, 0.2 + PH3[k]), V(62.6, yT2, 0.2 + PH3[k]), 0.25, 10).forEach((p) => add(r, p, 'p'));
      routes.push(r);
    });

    /* ---------- particles ---------- */
    const dotTex = canvasTex(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    const dot = (c, sz, over) => new THREE.PointsMaterial({ color: c, map: dotTex, size: sz, sizeAttenuation: false, transparent: true, depthWrite: false, depthTest: !over });
    const DM = { x: dot(0x3f9bff, 6, true), p: dot(0x3f9bff, 6, false), s: dot(0xe9f5ff, 5, false), power: dot(0xff7a1f, 6, false) };
    /* dots are drawn in screen pixels: keep them about half a unit (2.5 m) across at any zoom */
    function setDotScale(ppu) {
      const s = Math.max(2.4, Math.min(7.5, 0.55 * ppu));
      DM.x.size = s; DM.p.size = s; DM.s.size = s * 0.9; DM.power.size = Math.max(2.2, Math.min(7, 0.5 * ppu));
    }
    const flows = routes.map((r) => {
      const cum = [0];
      for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + r.pts[i].distanceTo(r.pts[i - 1]));
      const Lr = cum[cum.length - 1], n = Math.max(4, Math.round(Lr / (r.kind === 'power' ? 1.4 : 1.0)));
      const objs = {};
      (r.kind === 'power' ? ['power'] : ['x', 'p', 's']).forEach((k) => {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        const o = new THREE.Points(geo, DM[k]); o.frustumCulled = false; o.renderOrder = k === 'x' ? 6 : 4; root.add(o); objs[k] = o;
      });
      return { r: r, cum: cum, L: Lr, n: n, objs: objs, ph: Math.random() * Lr, rate: 0 };
    });
    function measure(f) { for (let i = 1; i < f.r.pts.length; i++) f.cum[i] = f.cum[i - 1] + f.r.pts[i].distanceTo(f.r.pts[i - 1]); f.L = f.cum[f.cum.length - 1]; }
    const tmp = new THREE.Vector3();
    function placeFlow(f, dt, speed, on) {
      const keys = Object.keys(f.objs);
      keys.forEach((k) => { f.objs[k].visible = on; });
      if (!on) return;
      f.ph = (f.ph + speed * dt) % f.L;
      const cnt = {}, arr = {};
      keys.forEach((k) => { cnt[k] = 0; arr[k] = f.objs[k].geometry.attributes.position; });
      let seg = 1;
      for (let i = 0; i < f.n; i++) {
        const s = (f.ph + (i * f.L) / f.n) % f.L;
        seg = 1; while (seg < f.cum.length - 1 && f.cum[seg] < s) seg++;
        const a = f.r.pts[seg - 1], b = f.r.pts[seg], u = (s - f.cum[seg - 1]) / Math.max(1e-6, f.cum[seg] - f.cum[seg - 1]);
        tmp.lerpVectors(a, b, u);
        const k = f.r.kind === 'power' ? 'power' : f.r.tags[seg];
        arr[k].setXYZ(cnt[k]++, tmp.x, tmp.y, tmp.z);
      }
      keys.forEach((k) => { arr[k].needsUpdate = true; f.objs[k].geometry.setDrawRange(0, cnt[k]); });
    }

    /* ======================================================================
       What the page calls
       ====================================================================== */
    let level = 20, spillOpen = 0, cutOn = false;
    function setLevel(rl) {
      level = L(rl);
      reservoir.position.y = level;
      flows.forEach((f) => { let moved = false; f.r.pts.forEach((p, i) => { if (f.r.lv[i]) { p.y = level + 0.06; moved = true; } }); if (moved) measure(f); });
      labels.forEach((l) => { if (l.lv != null) l.pos.y = level + l.lv; });
    }
    function setCut(on) { cutOn = on; cut.forEach((m) => { m.visible = !on; }); }
    function update(R, dt, run) {
      /* runners and generator rotors: they turn against the spiral's swirl, slowed for the eye */
      units.forEach((u, k) => {
        const st = R.units[k];
        if (run) u.angle -= dt * 1.7 * st.spin;
        u.rotor.rotation.y = u.angle;
        const open = st.gate;
        u.vanes.forEach((m) => { const th = m.userData.phi + Math.PI / 2 - 0.12 - 0.85 * open; m.rotation.y = -th; });
      });
      /* spillway gates rise, and the chute runs white */
      const want = R.spill > 0 ? 1 : 0;
      spillOpen += (want - spillOpen) * Math.min(1, dt * 1.5);
      spillGates.forEach((g) => { g.rotation.z = -0.82 * spillOpen; });
      sheet.opacity = 0.55 * spillOpen * (R.spill > 0 ? 1 : spillOpen);
      chute.visible = sheet.opacity > 0.01;
      /* surge tank: the water column follows the surge level */
      const ys = L(R.surge), y0 = SURGE.y;
      surgeWater.visible = ys > y0 + 0.02;
      if (surgeWater.visible) { surgeWater.scale.y = ys - y0; surgeWater.position.set(SURGE.x, (ys + y0) / 2, SURGE.z); }
      const yw = Math.min(ys, y0);
      shaftWater.scale.y = Math.max(0.01, yw - 8.9); shaftWater.position.set(SURGE.x, (yw + 8.9) / 2, SURGE.z);
      /* particles */
      if (!run) dt = 0;
      flows.forEach((f) => {
        const k = f.r.unit;
        if (f.r.kind === 'water') { const q = R.units[k].Q / HY.PLANT.Qr; placeFlow(f, dt, 2.2 + 6.5 * q, q > 0.01); }
        else if (f.r.kind === 'spill') placeFlow(f, dt, 9, R.spill > 0);
        else { const p = R.units[k].MW / 40; placeFlow(f, dt, 2.5 + 5 * p, p > 0.01); }
      });
    }
    function boxOf(id) {
      const b = new THREE.Box3();
      (parts[id] ? parts[id].meshes : []).forEach((m) => { if (m.visible !== false) b.expandByObject(m); });
      if (id === 'reservoir') b.set(V(-56, level - 6, -8), V(-26, level + 1, 20));
      if (id === 'tunnel') b.set(V(-33, 6, -20), V(11, 13, -2));
      return b;
    }
    function applyTheme(t) {
      paintTerrain(t.ground, t.rock, t.bank);
      contour.uLine.value.set(t.contour); contour.uLineA.value = t.contourA;
      [M.water, resMat].forEach((m) => m.color.set(t.water));
      strataMat.color.set(t.strata); soilMat.color.set(t.soil);
      lineMat.color.set(t.line);
      halo.material.opacity = t.halo;
      [xray, pmat('tunnel', xray), pmat('surge', xray), pmat('intake', xray)].forEach((m) => m.color.set(t.xray));
    }

    /* the outline of the block, for framing the camera on what is really there */
    const fitPts = [];
    [SOUTH, EAST, NORTH, WEST].forEach((side) => side.forEach(([x, z], i) => { if (i % 8 === 0) fitPts.push(V(x, H(x, z), z), V(x, BASE, z)); }));
    return {
      root: root, pickables: pickables, parts: parts, labels: labels, terrain: terrain, fitPts: fitPts, setDotScale: setDotScale,
      block: new THREE.Box3(V(X0, BASE, Z0), V(X1, 34, Z1)),
      powerhouse: new THREE.Box3(V(22, -2.6, -4.8), V(36.5, 7.5, 4.5)),
      setLevel: setLevel, setCut: setCut, update: update, boxOf: boxOf, applyTheme: applyTheme,
      get cut() { return cutOn; },
    };
  };
})();
