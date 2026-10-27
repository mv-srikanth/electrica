/*
  1 MVA, 11 / 0.433 kV, Dyn11, ONAN oil-immersed transformer, modelled on an Indian tender
  datasheet (IS 1180 Part 1, IS 2026): HV and LV cable boxes with disconnecting chambers at
  opposite ends, detachable radiators, conservator with air cell, double-float Buchholz relay,
  pressure relief valve and explosion vent, OTI and WTI in an IP55 marshalling box, a separate
  neutral bushing with CT, bi-directional rollers, standing on the existing foundation.
  y is up. One unit is 0.5 m: the tank is 1.7 m long (x), 1.0 m wide (z) and 1.5 m tall.
*/
(function () {
  const PI = Math.PI, H = PI / 2, TAU = PI * 2;

  /* ---------- drawings for dials and plates (canvas) ---------- */
  function drawDial(g, S, o) {
    const c = S / 2, R = S * 0.4;
    g.fillStyle = '#24292d'; g.beginPath(); g.arc(c, c, S / 2 - 1, 0, TAU); g.fill();
    g.fillStyle = '#f6f5f0'; g.beginPath(); g.arc(c, c, S * 0.47, 0, TAU); g.fill();
    const a0 = PI * 0.75, a1 = PI * 2.25, ang = (v) => a0 + ((a1 - a0) * (v - o.min)) / (o.max - o.min);
    (o.bands || []).forEach((b) => { g.strokeStyle = b[2]; g.lineWidth = S * 0.035; g.beginPath(); g.arc(c, c, R - S * 0.015, ang(b[0]), ang(b[1])); g.stroke(); });
    g.strokeStyle = '#222'; g.fillStyle = '#222'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const steps = Math.round((o.max - o.min) / o.minor);
    for (let i = 0; i <= steps; i++) {
      const v = o.min + i * o.minor, a = ang(v), major = Math.abs((v - o.min) / o.major - Math.round((v - o.min) / o.major)) < 1e-6;
      const L = major ? S * 0.06 : S * 0.035;
      g.lineWidth = major ? S * 0.012 : S * 0.006;
      g.beginPath(); g.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.lineTo(c + Math.cos(a) * (R - L), c + Math.sin(a) * (R - L)); g.stroke();
      if (major && o.labels !== false) { g.font = 'bold ' + Math.round(S * 0.07) + 'px sans-serif'; g.fillText(String(v), c + Math.cos(a) * (R - S * 0.13), c + Math.sin(a) * (R - S * 0.13)); }
    }
    (o.words || []).forEach((w) => { g.font = 'bold ' + Math.round(S * 0.055) + 'px sans-serif'; const a = ang(w[0]); g.fillText(w[1], c + Math.cos(a) * (R - S * 0.15), c + Math.sin(a) * (R - S * 0.15)); });
    g.font = 'bold ' + Math.round(S * 0.06) + 'px sans-serif'; g.fillText(o.title, c, c + R * 0.45);
    if (o.sub) { g.font = Math.round(S * 0.05) + 'px sans-serif'; g.fillText(o.sub, c, c + R * 0.65); }
    function needle(v, col, w, len) {
      const a = ang(v); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(c - Math.cos(a) * S * 0.05, c - Math.sin(a) * S * 0.05); g.lineTo(c + Math.cos(a) * R * len, c + Math.sin(a) * R * len); g.stroke();
    }
    (o.sets || []).forEach((sp) => needle(sp[0], sp[1], S * 0.014, 0.97));
    if (o.maxv != null) needle(o.maxv, '#c0392b', S * 0.012, 0.9);
    needle(o.val, '#111', S * 0.024, 0.84);
    g.fillStyle = '#111'; g.beginPath(); g.arc(c, c, S * 0.035, 0, TAU); g.fill();
  }

  function plateBase(g, W, Hh) {
    g.fillStyle = '#d8dbd5'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#30353a'; g.lineWidth = 6; g.strokeRect(12, 12, W - 24, Hh - 24);
    g.fillStyle = '#8d9296'; [[26, 26], [W - 26, 26], [26, Hh - 26], [W - 26, Hh - 26]].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 7, 0, TAU); g.fill(); });
    g.fillStyle = '#1f2327'; g.textBaseline = 'alphabetic';
  }
  function drawRating(g, W, Hh) {
    plateBase(g, W, Hh);
    g.textAlign = 'center'; g.font = 'bold 27px sans-serif'; g.fillText('3-PHASE OIL-IMMERSED TRANSFORMER', W / 2, 58);
    g.font = '16px sans-serif'; g.fillText('IS 1180 (PART 1) : 2014   ·   IS 2026', W / 2, 84);
    const rows = [['RATING', '1000 kVA'], ['VOLTS AT NO LOAD  HV / LV', '11000 / 433 V'], ['AMPERES  HV / LV', '52.5 / 1333.4 A'],
      ['PHASES / FREQUENCY', '3 / 50 Hz'], ['VECTOR GROUP', 'Dyn11'], ['TYPE OF COOLING', 'ONAN'], ['IMPEDANCE AT 75 °C', '5.0 %'],
      ['TEMP. RISE  OIL / WINDING', '50 / 55 °C'], ['BIL / POWER FREQUENCY', '75 kVp / 28 kV'], ['ENERGY EFFICIENCY', 'LEVEL 2'],
      ['INSULATING OIL', 'MINERAL, IS 335']];
    g.textAlign = 'left';
    rows.forEach((r, i) => {
      const y = 122 + i * 29;
      g.font = '17px monospace'; g.fillText(r[0], 42, y);
      g.font = 'bold 17px monospace'; g.fillText(r[1], 378, y);
      g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(40, y + 9); g.lineTo(W - 40, y + 9); g.stroke();
    });
    g.textAlign = 'center'; g.font = '14px monospace'; g.fillText('EXAMPLE PLATE FOR TEACHING', W / 2, Hh - 30);
  }
  function drawTerminals(g, W, Hh) {
    plateBase(g, W, Hh);
    g.textAlign = 'center'; g.font = 'bold 25px sans-serif'; g.fillText('TERMINAL MARKING AND CONNECTIONS', W / 2, 58);
    g.strokeStyle = '#1f2327'; g.lineWidth = 4; g.lineJoin = 'round';
    const P = (cx, cy, r, deg) => [cx + r * Math.cos((deg * PI) / 180), cy + r * Math.sin((deg * PI) / 180)];
    /* HV delta: 1U at 12 o'clock */
    const dx = 132, dy = 185, ds = 66, U = P(dx, dy, ds, -90), Vv = P(dx, dy, ds, 30), Ww = P(dx, dy, ds, 150);
    g.beginPath(); g.moveTo(U[0], U[1]); g.lineTo(Vv[0], Vv[1]); g.lineTo(Ww[0], Ww[1]); g.closePath(); g.stroke();
    g.font = 'bold 19px sans-serif'; g.fillText('1U', U[0], U[1] - 12); g.fillText('1V', Vv[0] + 20, Vv[1] + 18); g.fillText('1W', Ww[0] - 20, Ww[1] + 18);
    g.font = '16px sans-serif'; g.fillText('HV 11000 V, DELTA', dx, dy + 98);
    /* LV star: 2U at 11 o'clock (Dyn11) */
    const sx = 508, sy = 185, sr = 66;
    [[-120, '2U'], [0, '2V'], [120, '2W']].forEach((a) => {
      const e = P(sx, sy, sr, a[0]); g.beginPath(); g.moveTo(sx, sy); g.lineTo(e[0], e[1]); g.stroke();
      const t = P(sx, sy, sr + 22, a[0]); g.font = 'bold 19px sans-serif'; g.fillText(a[1], t[0], t[1] + 7);
    });
    g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.fill(); g.font = 'bold 17px sans-serif'; g.fillText('2N', sx - 20, sy + 30);
    g.font = '16px sans-serif'; g.fillText('LV 433 V, STAR + NEUTRAL', sx, sy + 98);
    /* clock diagram */
    const cx = 320, cy = 185, cr = 48;
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) { const a = P(cx, cy, cr, i * 30 - 90), b = P(cx, cy, cr - 7, i * 30 - 90); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.lineWidth = 4; let e = P(cx, cy, cr - 6, -90); g.beginPath(); g.moveTo(cx, cy); g.lineTo(e[0], e[1]); g.stroke();
    g.strokeStyle = '#b5321f'; e = P(cx, cy, cr - 12, -120); g.beginPath(); g.moveTo(cx, cy); g.lineTo(e[0], e[1]); g.stroke();
    g.strokeStyle = '#1f2327'; g.font = 'bold 20px sans-serif'; g.fillText('Dyn11', cx, cy + 80);
    g.font = '13px sans-serif'; g.fillText('LV leads HV by 30°', cx, cy + 100);
    /* tap table */
    const y0 = 322, cols = [92, 222, 312, 402, 492, 582];
    const rows = [['TAP', '1', '2', '3', '4', '5'], ['HV VOLTS', '11550', '11275', '11000', '10725', '10450'], ['STEP', '+5 %', '+2.5 %', '0', '−2.5 %', '−5 %']];
    g.lineWidth = 1.5; g.strokeRect(40, y0 - 24, W - 80, 96);
    rows.forEach((r, i) => {
      r.forEach((t, j) => { g.font = (i === 0 || j === 0 ? 'bold ' : '') + '16px monospace'; g.fillText(t, cols[j], y0 + i * 32); });
      if (i < 2) { g.beginPath(); g.moveTo(40, y0 + i * 32 + 8); g.lineTo(W - 40, y0 + i * 32 + 8); g.stroke(); }
    });
    g.beginPath(); g.moveTo(160, y0 - 24); g.lineTo(160, y0 + 72); g.stroke();
    g.font = '13px sans-serif'; g.fillText('OFF-CIRCUIT TAP CHANGER: OPERATE ONLY WHEN DE-ENERGISED', W / 2, Hh - 30);
  }
  function drawTapPlate(g, S) {
    const c = S / 2;
    g.fillStyle = '#d8dbd5'; g.beginPath(); g.arc(c, c, S / 2 - 2, 0, TAU); g.fill();
    g.strokeStyle = '#30353a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, S / 2 - 6, 0, TAU); g.stroke();
    g.fillStyle = '#1f2327'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + Math.round(S * 0.13) + 'px sans-serif';
    [1, 2, 3, 4, 5].forEach((n, i) => { const a = ((-150 + i * 30) * PI) / 180; g.fillText(String(n), c + Math.cos(a) * S * 0.36, c + Math.sin(a) * S * 0.36); });
    g.font = 'bold ' + Math.round(S * 0.09) + 'px sans-serif'; g.fillText('TAP', c, c + S * 0.2);
    g.font = Math.round(S * 0.055) + 'px sans-serif'; g.fillText('OFF-CIRCUIT', c, c + S * 0.31);
  }
  function drawDanger(g, W, Hh) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#c62828'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, Hh - 12);
    g.fillStyle = '#c62828'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 50px sans-serif'; g.fillText('DANGER', W / 2 + 18, 58);
    g.beginPath(); g.moveTo(44, 26); g.lineTo(26, 70); g.lineTo(42, 70); g.lineTo(32, 104); g.lineTo(60, 56); g.lineTo(44, 56); g.lineTo(56, 26); g.closePath(); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 34px sans-serif'; g.fillText('11000 VOLTS', W / 2, 128);
    g.font = 'bold 20px sans-serif'; g.fillText('KEEP OFF', W / 2, 166);
  }
  function drawGaugeMarks(g, W, Hh) {
    g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#1f2327'; g.fillStyle = '#1f2327'; g.lineWidth = 3; g.textAlign = 'center'; g.font = 'bold 13px sans-serif';
    [[28, 'MAX'], [128, '35°C'], [228, 'MIN']].forEach((r) => { g.beginPath(); g.moveTo(6, r[0]); g.lineTo(W - 6, r[0]); g.stroke(); g.fillText(r[1], W / 2, r[0] + 16); });
    g.fillStyle = '#c0392b'; g.fillRect(6, 232, W - 12, 18);
  }

  Electrica.register({
    id: 'distribution-transformer',
    short: 'Distribution transformer',
    name: 'Distribution transformer, 1 MVA',
    kind: 'Static · 3-phase · Oil-filled',
    sub: 'Oil-immersed · ONAN · 11 / 0.433 kV · Dyn11 · Cable-box type',
    icon: '<rect x="11" y="13" width="22" height="22" rx="2"/><circle cx="19" cy="24" r="5.5"/><circle cx="25" cy="24" r="5.5"/><path d="M4 18h7v12H4zM33 18h7v12h-7zM15 13v-5h14v5"/>',
    plate: [
      ['Rating', '1000 kVA, ONAN'], ['Voltage', '11 000 / 433 V'], ['Current', '52.5 / 1333 A'],
      ['Vector group', 'Dyn11'], ['Taps', 'Off-circuit, ±5 % in 2.5 % steps'], ['Impedance', '5 % (IS 1180)'],
      ['Insulation', 'BIL 75 kVp, 28 kV'], ['Temp. rise', 'Oil 50 °C, winding 55 °C'], ['Terminals', 'Cable boxes, 180° apart'],
    ],
    plateNote: 'Based on an 11 kV, 1 MVA tender datasheet',
    principle: 'A 1 MVA, 11 kV / 433 V transformer of the kind that feeds a plant or a large building. Each limb of the three-limb core carries one phase; the HV winding is in delta and the LV in star, with the neutral brought out and solidly earthed. The core and windings sit in mineral oil, which insulates them and carries their heat to detachable radiators by natural circulation (ONAN). Cables enter through air-insulated cable boxes at opposite ends, and every protective device reports to the marshalling box: Buchholz relay, oil and winding temperature, oil level and pressure relief.',
    formulas: [
      'I = S / (√3 · V): 52.5 A HV, 1333 A LV',
      'LV phase voltage = 433 / √3 ≈ 250 V',
      'Turns ratio per phase = 11 000 / 250 = 44',
      'Tap step = 2.5 % of 11 000 V = 275 V',
      'Dyn11: LV leads HV by 30°',
    ],
    fluxNote: 'Blue: flux in the three-limb core; the three limb fluxes always add to zero. Copper: hot oil rising through the windings, cooling in the radiators on both long sides and sinking back (ONAN). Both slowed down.',

    build: function (k, m) {
      const { THREE, V, part, add, annulus, cyl, ringRR, extrude, polyShape, makeFlux, material, merge, rbox } = k;
      const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
      const UPZ = [H, 0, 0];   // a z-axis shape (annulus) stood upright, or a y-axis cylinder laid along z
      const ALX = [0, 0, H];   // a y-axis cylinder laid along x
      const ZX = [0, H, 0];    // a z-axis shape turned to lie along x
      const BIG = 1e-5;

      /* ---------- small helpers ---------- */
      function pathOf(pts, bend) {
        const path = new THREE.CurvePath(); let prev = pts[0].clone();
        for (let i = 1; i < pts.length - 1; i++) {
          const a = pts[i - 1], b = pts[i], c = pts[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b);
          const r = Math.min(bend, d1.length() / 2, d2.length() / 2);
          const p1 = b.clone().sub(d1.normalize().multiplyScalar(r)), p2 = b.clone().add(d2.normalize().multiplyScalar(r));
          if (prev.distanceTo(p1) > BIG) path.add(new THREE.LineCurve3(prev, p1));
          path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); prev = p2;
        }
        const last = pts[pts.length - 1];
        if (prev.distanceTo(last) > BIG) path.add(new THREE.LineCurve3(prev, last.clone()));
        return path;
      }
      function pipe(pts, r, bend, radial) {
        const v = pts.map((p) => (Array.isArray(p) ? V(p[0], p[1], p[2]) : p));
        return new THREE.TubeGeometry(pathOf(v, bend == null ? r * 3 : bend), Math.max(24, v.length * 16), r, radial || 12, false);
      }
      function toward(d) {
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q);
        return [e.x, e.y, e.z];
      }
      function placer(origin, rotY) {
        const qy = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rotY || 0), o = V(origin[0], origin[1], origin[2]);
        return function (g, pos, rot) {
          const p = V(pos[0], pos[1], pos[2]).applyQuaternion(qy).add(o), r = rot || [0, 0, 0];
          const q = qy.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])));
          const e = new THREE.Euler().setFromQuaternion(q);
          return [g, { pos: [p.x, p.y, p.z], rot: [e.x, e.y, e.z] }];
        };
      }
      function rrShape(w, h, r) {
        const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        return s;
      }
      function canvasTex(w, h, draw) {
        const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
      }
      const faceMat = (t) => material('white', { map: t, color: new THREE.Color(0xffffff), metalness: 0.05, roughness: 0.55 });
      const HEX = cyl(0.016, 0.02, 6), HEXS = cyl(0.011, 0.014, 6);
      function boltsH(cx, y, cz, w, d, pitch, list, g) {
        const nx = Math.max(2, Math.round(w / pitch)), nz = Math.max(2, Math.round(d / pitch));
        for (let i = 0; i <= nx; i++) { const x = cx - w / 2 + (w * i) / nx; list.push([g || HEX, { pos: [x, y, cz - d / 2] }], [g || HEX, { pos: [x, y, cz + d / 2] }]); }
        for (let j = 1; j < nz; j++) { const z = cz - d / 2 + (d * j) / nz; list.push([g || HEX, { pos: [cx - w / 2, y, z] }], [g || HEX, { pos: [cx + w / 2, y, z] }]); }
      }
      function boltsX(x, cy, cz, h, d, pitch, list) {
        const ny = Math.max(2, Math.round(h / pitch)), nz = Math.max(2, Math.round(d / pitch));
        for (let i = 0; i <= nz; i++) { const z = cz - d / 2 + (d * i) / nz; list.push([HEXS, { pos: [x, cy - h / 2, z], rot: ALX }], [HEXS, { pos: [x, cy + h / 2, z], rot: ALX }]); }
        for (let j = 1; j < ny; j++) { const y = cy - h / 2 + (h * j) / ny; list.push([HEXS, { pos: [x, y, cz - d / 2], rot: ALX }], [HEXS, { pos: [x, y, cz + d / 2], rot: ALX }]); }
      }
      /* gate valve: outflow along local +z from a wall at z = 0, stem up */
      function gateValve(origin, rotY, s, body, wheel) {
        const P = placer(origin, rotY);
        body.push(P(cyl(0.05 * s, 0.16 * s, 16), [0, 0, 0.1 * s], UPZ));
        body.push(P(cyl(0.075 * s, 0.022 * s, 20), [0, 0, 0.02 * s], UPZ));
        body.push(P(cyl(0.075 * s, 0.022 * s, 20), [0, 0, 0.18 * s], UPZ));
        body.push(P(cyl(0.05 * s, 0.03 * s, 16), [0, 0, 0.205 * s], UPZ));
        body.push(P(cyl(0.032 * s, 0.11 * s, 12), [0, 0.09 * s, 0.1 * s]));
        body.push(P(cyl(0.012 * s, 0.09 * s, 8), [0, 0.18 * s, 0.1 * s]));
        wheel.push(P(new THREE.TorusGeometry(0.065 * s, 0.011 * s, 8, 28), [0, 0.225 * s, 0.1 * s], [H, 0, 0]));
        wheel.push(P(box(0.13 * s, 0.012 * s, 0.014 * s), [0, 0.225 * s, 0.1 * s]));
        wheel.push(P(box(0.014 * s, 0.012 * s, 0.13 * s), [0, 0.225 * s, 0.1 * s]));
      }
      /* butterfly (shut-off) valve in a pipe along local z, lever on top */
      function butterfly(origin, rotY, s, body, lever) {
        const P = placer(origin, rotY);
        body.push(P(cyl(0.085 * s, 0.02 * s, 20), [0, 0, -0.03 * s], UPZ));
        body.push(P(cyl(0.085 * s, 0.02 * s, 20), [0, 0, 0.03 * s], UPZ));
        body.push(P(cyl(0.07 * s, 0.04 * s, 20), [0, 0, 0], UPZ));
        body.push(P(cyl(0.012 * s, 0.06 * s, 8), [0, 0.09 * s, 0]));
        lever.push(P(box(0.022 * s, 0.016 * s, 0.14 * s), [0, 0.125 * s, 0.05 * s]));
      }
      /* lifting lug: plate with a hole, protruding along +x, thin in z */
      const lugShape = new THREE.Shape();
      lugShape.moveTo(0, -0.1); lugShape.lineTo(0.1, -0.1); lugShape.absarc(0.1, 0, 0.1, -H, H, false); lugShape.lineTo(0, 0.1); lugShape.lineTo(0, -0.1);
      const lugHole = new THREE.Path(); lugHole.absarc(0.1, 0, 0.042, 0, TAU, true); lugShape.holes.push(lugHole);
      const lugG = extrude(lugShape, 0.035, 12);

      /* ---------- dimensions ---------- */
      const TX = 1.7, TZ = 1.0, CT = 1.55;                 // tank half-length and half-width; cover top
      const LIFT = 3.0, TOP = 3.4, COVER = 4.9, CONS = 5.8;   // exploded lifts
      const P = 0.95, YT = 0.96, YB = -1.16, YW = -0.1;    // limb pitch, yoke centres, window centre
      const LIMBS = [-P, 0, P];
      const CX = -0.05, CY = 2.45, CR = 0.33, CL = 2.2;     // conservator

      /* ======================= the parts ======================= */
      const core = part({
        name: 'Three-limb core',
        role: 'Each limb carries the flux of one phase and the top and bottom yokes join them. The core is built from thin insulated sheets in packets of different widths, so the limbs have a stepped, nearly round section that fills the round coils.',
        material: 'Cold-rolled grain-oriented silicon steel, M4 grade or better, as the datasheet asks',
        look: 'The lines across the core are the packet steps. Exploded view lifts the top yoke off, as when coils are fitted.',
      });
      const lv = part({
        name: 'LV winding',
        role: 'The 433 V winding, wound next to the core because it needs the least insulation. It carries 1333 A at full load, so it has few turns of heavy copper strip or foil. The three LV windings are joined in star and the star point becomes the neutral.',
        material: 'Copper strip or foil, paper insulated (the datasheet specifies copper)',
        look: 'Cutaway shows it inside the HV winding, with an oil duct and a pressboard cylinder between them.',
      });
      const hv = part({
        name: 'HV winding',
        role: 'The 11 kV winding, outside the LV winding, with many turns of paper-covered copper wound as discs. The gaps between discs are horizontal oil ducts. The three HV windings are connected in delta, and tappings near the middle of each go to the tap changer.',
        material: 'Paper-insulated copper conductor',
        look: 'Per phase the turns ratio is 44 : 1, from 11 000 V across each HV winding to 250 V across each LV winding.',
      });
      const ins = part({
        name: 'Insulation and oil ducts',
        role: 'Pressboard cylinders, spacers, end rings and phase barriers keep the windings apart and leave ducts for oil to flow up through them. The datasheet asks for hybrid insulation to IS 2026 Part 14, which uses high-temperature material in the hottest regions.',
        material: 'Pressboard and kraft paper, with high-temperature (aramid) paper at the hot spots',
        look: 'The vertical strips on the HV winding are duct spacers; the sheets between phases are phase barriers.',
      });
      const frame = part({
        name: 'Core clamps and frame',
        role: 'Steel frames and tie rods clamp the yokes and press the windings so they withstand short-circuit forces. The core bolts are insulated, and the core is earthed at one point only through a copper strip.',
        material: 'Structural steel channels and tie rods',
        look: 'The lifting eyes on the top frame carry the whole core-and-coil assembly when it is lifted out.',
      });
      const leads = part({
        name: 'Leads and connections',
        role: 'Copper leads join the windings to the bushings. The HV ends are linked in delta and run to the HV end; heavy LV leads run to the LV end. The star point is taken out as the neutral, both to the LV cable box and to the separate neutral bushing for earthing.',
        material: 'Paper-insulated copper leads; bare copper on the LV side',
        look: 'The bundles of thin leads from the middle of each HV winding are the tappings.',
      });
      const tap = part({
        name: 'Off-circuit tap changer',
        role: 'Changes the HV turns in 2.5 % steps over ±5 %: five positions from 11 550 V to 10 450 V, to correct the output voltage. It must only be turned with the transformer switched off. The handle outside has snap action, end stops, a position plate and a padlock.',
        material: 'Brass contacts on a pressboard drum, steel shaft sealed through the tank wall',
        look: 'The handle is on the HV end, below the cable box, set at tap 3 (11 000 V).',
      });
      const tank = part({
        name: 'Tank',
        role: 'Welded sheet-steel tank holding the active part and the oil. The base is reinforced so the tank does not distort when lifted. Lifting lugs sit at the top corners and jacking lugs at the bottom.',
        material: 'Mild-steel sheet, two coats of epoxy paint, shade 632 of IS 5 (dark admiralty grey)',
        look: 'Cutaway removes the upper front quarter to show the inside.',
        casing: true,
      });
      const oil = part({
        name: 'Transformer oil',
        role: 'Fills the tank and the conservator. It insulates the windings far better than air and carries their heat to the radiators by natural circulation. The supplier provides the first filling plus 10 % extra.',
        material: 'Mineral insulating oil to IS 335',
        look: 'Cutaway shows the oil around the windings and inside the conservator.',
        casing: true,
      });
      const cover = part({
        name: 'Tank cover',
        role: 'Bolted lid with an oil-tight gasket. The inspection cover gives access to the connections without lifting the whole cover; air release plugs let trapped air out when filling.',
        material: 'Mild-steel plate, nitrile-cork gasket, copper flexible bonds to the tank',
        look: 'The small copper straps across the flange keep the cover earthed.',
        casing: true,
      });
      const rad = part({
        name: 'Radiators',
        role: 'Four detachable pressed-steel radiators on the long sides. Hot oil enters at the top header, cools as it sinks through the fins and returns at the bottom: ONAN, oil natural and air natural. Shut-off valves at both headers let a radiator be removed without draining the tank.',
        material: 'Pressed-steel fins on top and bottom headers, each with an air vent, a drain plug and a lifting lug',
        look: 'Flux view shows the oil circulating through them.',
        casing: true,
      });
      const cons = part({
        name: 'Conservator with air cell',
        role: 'A drum above the tank that keeps the main tank always full: as the oil warms it expands into the conservator. Inside, a rubber air cell separates the oil from the air, so moisture and oxygen never reach the oil. The datasheet asks for this rather than breathing through silica gel alone.',
        material: 'Mild-steel drum with dished ends; nitrile-rubber air cell (bladder)',
        look: 'Cutaway opens the drum: oil below, the air cell floating on it. Filling cap on top, drain valve underneath.',
      });
      const lvl = part({
        name: 'Oil level gauges',
        role: 'The magnetic oil level gauge on the end of the conservator follows a float through a magnetic coupling, so no glass touches the oil, and gives a low-level alarm and trip. A plain gauge with MIN, 35 °C and MAX marks is fitted as well.',
        material: 'Float arm with magnetic coupling, dial and switch; glass level tube',
        look: 'In Cutaway you can see the float riding on the oil.',
      });
      const brt = part({
        name: 'Silica gel breather',
        role: 'Air drawn into the air cell as the oil cools passes first through an oil cup, which traps dust, and then through silica gel, which removes moisture.',
        material: 'Glass container of silica gel above an oil cup',
        look: 'Fresh gel is blue; it turns pink from the bottom up as it takes in moisture and must then be replaced.',
      });
      const buch = part({
        name: 'Buchholz relay',
        role: 'A double-float gas relay in the pipe to the conservator. Gas from a slowly developing fault collects in the top and the upper float gives an alarm; a surge of oil from a serious fault tips the lower float and trips the breaker. Isolating valves on either side let it be removed without draining the oil.',
        material: 'Cast housing with two floats, sight windows and reed switches; IS 3637',
        look: 'The pipe rises a few degrees towards the conservator so gas reaches the relay. Cutaway shows the floats.',
      });
      const prv = part({
        name: 'Pressure relief valve',
        role: 'Opens within milliseconds if a fault vaporises oil and the pressure shoots up, then reseals. A flag shows it has operated and a contact signals the marshalling box.',
        material: 'Spring-loaded valve with flag and alarm contact',
      });
      const vent = part({
        name: 'Explosion vent',
        role: 'A pipe closed by a thin diaphragm that bursts if the pressure rises violently, releasing it away from people. The datasheet asks for it as well as the pressure relief valve, and lists a spare diaphragm.',
        material: 'Steel pipe with a bakelite or glass diaphragm',
      });
      const temp = part({
        name: 'Temperature indicators (OTI and WTI)',
        role: 'Dial thermometers with alarm and trip contacts and a maximum-reading pointer. The oil temperature indicator reads the top oil through a pocket in the cover. The winding temperature indicator reads the same top oil plus the heat from a small heater fed by a CT in the load current, so it shows an estimate of the winding hot spot.',
        material: 'Dial gauges with capillary tubes to sensing bulbs in thermometer pockets',
        look: 'The dials are behind the window of the marshalling box.',
      });
      const mbox = part({
        name: 'Marshalling box',
        role: 'A weatherproof IP55 box on the front of the tank. Every protective device and the neutral CT are wired to its terminals: Buchholz alarm and trip, winding and oil temperature alarm and trip, oil level alarm and trip. It has a lamp, switch and socket inside.',
        material: 'Sheet steel, gasketed door with window, removable gland plate',
        casing: true,
      });
      const hvBox = part({
        name: 'HV cable box and disconnecting chamber',
        role: 'An air-insulated, IP55 box where the 11 kV cable is terminated. Between it and the tank is the disconnecting chamber: removing its links separates the transformer from the cable without disturbing the cable joint, for testing or removal.',
        material: 'Sheet steel, bolted covers with lifting handles, removable gland plate',
        look: 'There is at least 600 mm from the gland plate to the terminals, as the datasheet asks for 11 kV cable.',
        casing: true,
      });
      const hvTerm = part({
        name: 'HV bushings and cable termination',
        role: 'Three porcelain bushings take the HV leads through the tank wall. Copper links in the disconnecting chamber join them to the cable side, where one 3-core, 120 mm² aluminium XLPE cable is terminated with heat-shrink stress-control terminations.',
        material: 'Porcelain bushings to IS 3347, copper links, heat-shrink cable terminations',
        look: 'The red sleeves with sheds are the cable terminations.',
      });
      const lvBox = part({
        name: 'LV cable box and disconnecting chamber',
        role: 'The 433 V cable box at the opposite end, 180° from the HV box. It is larger because it takes three runs of 3.5-core, 400 mm² cable, needed for 1333 A.',
        material: 'Sheet steel, bolted covers, removable gland plate',
        casing: true,
      });
      const lvTerm = part({
        name: 'LV bushings and busbars',
        role: 'Four bushings, three phases and the neutral, lead through the tank wall. In the cable box each bushing feeds a copper busbar, and the cores of the three cables are lugged onto the busbars: red, yellow and blue phases and the black neutral.',
        material: 'Porcelain bushings, copper busbars and lugs, aluminium XLPE cable cores',
      });
      const neu = part({
        name: 'Neutral bushing, CT and earthing strip',
        role: 'A separate outdoor bushing brings the neutral out for solid earthing. A ring CT on it measures the current returning through the neutral, for earth-fault protection. A galvanised strip on porcelain stand-offs takes the neutral down to the earth pit.',
        material: 'Porcelain bushing; neutral CT …/1 A, 15 VA, 5P10; galvanised iron strip',
      });
      const valves = part({
        name: 'Valves',
        role: 'The drain-cum-bottom filter valve and the top filter valve connect a filter machine to circulate and dry the oil; the sampling valve draws oil for tests such as breakdown voltage, moisture and dissolved gas analysis.',
        material: 'Gunmetal gate valves with blanking caps',
        look: 'The top filter valve is at the HV end; the bottom valves are at the front right.',
      });
      const base = part({
        name: 'Base, rollers and towing lugs',
        role: 'Base channels with skids and pulling eyes, and cross channels with towing lugs, for moving the transformer. It stands on four bi-directional rollers that can be turned through 90°, held by anti-earthquake clamps.',
        material: 'Steel channels; cast-steel flanged rollers',
      });
      const earth = part({
        name: 'Earthing terminals',
        role: 'Two earthing terminals on the tank, and two on each cable box, connect the body to the station earth so that a fault current has a safe path to ground.',
        material: 'Brass terminal pads, galvanised strip',
      });
      const plates = part({
        name: 'Rating and terminal marking plates',
        role: 'The rating plate states the rating, voltages, currents, vector group, cooling, impedance and insulation levels. The terminal marking plate shows the delta and star connections, the Dyn11 clock diagram and the tap table.',
        material: 'Anodised aluminium or stainless steel, etched',
        look: 'Zoom in to read them. The values are an example for teaching.',
      });
      const fdn = part({
        name: 'Foundation',
        role: 'The existing plinth from the datasheet drawing: 1500 × 1500 mm, with two MS plates, 400 × 1250 mm and 600 mm apart, grouted flush with the surface. The rollers run on the plates.',
        material: 'Reinforced concrete plinth with grouted mild-steel plates',
      });

      /* ======================= active part ======================= */
      {
        const PK = [[-0.16, 0.24], [-0.08, 0.36], [0, 0.42], [0.08, 0.36], [0.16, 0.24]], PT = 0.074;
        const LA = [], LB = [], TA = [], TB = [], BA = [], BB = [];
        PK.forEach((pk, i) => {
          const z = pk[0], w = pk[1], L = YT - YB - w;
          LIMBS.forEach((x) => (i % 2 ? LB : LA).push([box(w, L, PT), { pos: [x, (YT + YB) / 2, z] }]));
          (i % 2 ? TB : TA).push([box(2 * P + w, w, PT), { pos: [0, YT, z] }]);
          (i % 2 ? BB : BA).push([box(2 * P + w, w, PT), { pos: [0, YB, z] }]);
        });
        add(core, merge(LA), 'lamA', { ex: [0, LIFT, 0] });
        add(core, merge(LB), 'lamB', { ex: [0, LIFT, 0] });
        add(core, merge(TA), 'lamA', { ex: [0, TOP, 0] });
        add(core, merge(TB), 'lamB', { ex: [0, TOP, 0] });
        add(core, merge(BA), 'lamA', { ex: [0, LIFT, 0] });
        add(core, merge(BB), 'lamB', { ex: [0, LIFT, 0] });

        const LVN = 12, LVH = 1.5, lvs = (LVH - 0.01 * (LVN - 1)) / LVN, lvG = annulus(0.3, 0.235, lvs, null, null, 40);
        const lA = [], lB = [];
        LIMBS.forEach((x) => { for (let j = 0; j < LVN; j++) (j % 2 ? lB : lA).push([lvG, { pos: [x, YW - LVH / 2 + lvs / 2 + j * (lvs + 0.01), 0], rot: UPZ }]); });
        add(lv, merge(lA), 'copperDk', { ex: [0, LIFT, 0.7] });
        add(lv, merge(lB), 'copper', { ex: [0, LIFT, 0.7] });

        const HVN = 16, HVH = 1.44, hvs = (HVH - 0.012 * (HVN - 1)) / HVN, hvG = annulus(0.43, 0.335, hvs, null, null, 48);
        const hA = [], hB = [];
        LIMBS.forEach((x) => { for (let j = 0; j < HVN; j++) (j % 2 ? hB : hA).push([hvG, { pos: [x, YW - HVH / 2 + hvs / 2 + j * (hvs + 0.012), 0], rot: UPZ }]); });
        add(hv, merge(hA), 'copper', { ex: [0, LIFT, 1.5] });
        add(hv, merge(hB), 'copperDk', { ex: [0, LIFT, 1.5] });

        const IN = [], bar = annulus(0.322, 0.31, 1.6, null, null, 40), ring = annulus(0.45, 0.225, 0.035, null, null, 40);
        const stick = box(0.03, HVH, 0.022), blk = box(0.08, 0.065, 0.08);
        LIMBS.forEach((x) => {
          IN.push([bar, { pos: [x, YW, 0], rot: UPZ }]);
          IN.push([ring, { pos: [x, 0.667, 0], rot: UPZ }], [ring, { pos: [x, -0.867, 0], rot: UPZ }]);
          for (let a = 0; a < 12; a++) { const t = (a * TAU) / 12 + 0.13; IN.push([stick, { pos: [x + 0.437 * Math.cos(t), YW, 0.437 * Math.sin(t)], rot: [0, -t - H, 0] }]); }
          for (let a = 0; a < 4; a++) { const t = PI / 4 + (a * PI) / 2; [0.718, -0.917].forEach((y) => IN.push([blk, { pos: [x + 0.39 * Math.cos(t), y, 0.39 * Math.sin(t)] }])); }
        });
        [-P / 2, P / 2].forEach((x) => IN.push([box(0.012, 1.5, 0.82), { pos: [x, YW, 0] }]));
        [-1.0, 1.0].forEach((x) => IN.push([box(0.3, 0.09, 0.5), { pos: [x, -1.42, 0] }]));
        add(ins, merge(IN), 'board', { ex: [0, LIFT, 1.1] });

        const FT = [], FB = [], FR = [];
        [-0.255, 0.255].forEach((z) => {
          FT.push([box(2.72, 0.3, 0.04), { pos: [0, YT, z] }], [box(2.72, 0.04, 0.1), { pos: [0, YT + 0.15, z + Math.sign(z) * 0.03] }]);
          FB.push([box(2.72, 0.3, 0.04), { pos: [0, YB, z] }], [box(2.72, 0.04, 0.1), { pos: [0, YB - 0.15, z + Math.sign(z) * 0.03] }]);
          [-1.37, 1.37].forEach((x) => FR.push([cyl(0.018, 2.4, 10), { pos: [x, -0.1, z] }]));
          [-0.8, 0.8].forEach((x) => FT.push([new THREE.TorusGeometry(0.055, 0.016, 8, 20), { pos: [x, YT + 0.22, z] }], [box(0.1, 0.06, 0.04), { pos: [x, YT + 0.17, z] }]));
        });
        add(frame, merge(FT), 'paint', { ex: [0, TOP, 0] });
        add(frame, merge(FB), 'paint', { ex: [0, LIFT, 0] });
        add(frame, merge(FR), 'steel', { ex: [0, LIFT, 0] });
        add(frame, box(0.035, 0.2, 0.004), 'copper', { pos: [0.35, 0.78, 0.236], ex: [0, LIFT, 0] });

        /* leads */
        const HB = [-0.3, 0, 0.3], LZ = [-0.48, -0.16, 0.16, 0.48];
        const HL = [], TL = [], LL = [];
        LIMBS.forEach((x, i) => {
          HL.push(pipe([[x, YW + 0.72, 0.4], [x, 0.78 + 0.05 * i, 0.5 + 0.03 * i], [-1.36, 0.78 + 0.05 * i, 0.5 + 0.03 * i], [-1.52, 0.85, HB[i]], [-1.6, 0.85, HB[i]]], 0.018, 0.08));
          const j = (i + 1) % 3;
          HL.push(pipe([[x + 0.14, YW - 0.72, 0.4], [x + 0.14, -0.96 - 0.04 * i, 0.56 + 0.025 * i], [-1.47, -0.96 - 0.04 * i, 0.56 + 0.025 * i], [-1.47, 0.6, 0.45], [-1.5, 0.85, HB[j]], [-1.56, 0.85, HB[j]]], 0.016, 0.08));
          for (let t = 0; t < 5; t++) {
            const xx = x - 0.08 + 0.04 * t, yy = YW - 0.04 + 0.02 * t, a = (t - 2) * 0.55;
            TL.push(pipe([[xx, yy, 0.43], [xx, 0.2 + 0.015 * t, 0.62], [-1.36, 0.3 + 0.05 * Math.cos(a), 0.62 + 0.05 * Math.sin(a)], [-1.4, 0.3 + 0.055 * Math.cos(a), 0.62 + 0.055 * Math.sin(a)]], 0.007, 0.05, 6));
          }
          LL.push(pipe([[x, YW + 0.75, -0.27], [x, 0.72, -0.42], [x, 0.92 + 0.05 * i, -0.42], [1.42, 0.92 + 0.05 * i, -0.42], [1.5, 0.8, LZ[i]], [1.62, 0.8, LZ[i]]], 0.026, 0.08));
          LL.push(pipe([[x, YW - 0.75, -0.27], [x, -0.92, -0.42]], 0.026, 0.05));
        });
        LL.push(pipe([[-P, -0.92, -0.42], [1.25, -0.92, -0.42], [1.25, 0.86, -0.5], [1.5, 0.8, LZ[3]], [1.62, 0.8, LZ[3]]], 0.026, 0.1));
        LL.push(pipe([[1.25, 0.86, -0.5], [1.52, 1.25, -0.55], [1.52, 1.52, -0.55]], 0.022, 0.1));
        add(leads, merge(HL), 'copperDk', { ex: [0, LIFT, 0.9] });
        add(leads, merge(TL), 'copperDk', { ex: [0, LIFT, 0.9] });
        add(leads, merge(LL), 'copper', { ex: [0, LIFT, 0.9] });

        /* tap changer: drum inside, handle on the HV end */
        add(tap, cyl(0.075, 0.22, 24), 'board', { pos: [-1.51, 0.3, 0.62], rot: ALX, ex: [0, LIFT, 0.9] });
        const TC = [];
        for (let t = 0; t < 5; t++) { const a = (t - 2) * 0.55; TC.push([cyl(0.014, 0.03, 8), { pos: [-1.395, 0.3 + 0.055 * Math.cos(a), 0.62 + 0.055 * Math.sin(a)], rot: ALX }]); }
        add(tap, merge(TC), 'brass', { ex: [0, LIFT, 0.9] });
        add(tap, cyl(0.016, 0.22, 10), 'steel', { pos: [-1.73, 0.3, 0.62], rot: ALX, ex: [-0.8, 0, 0] });
        const tp = canvasTex(256, 256, (g, S) => drawTapPlate(g, S));
        add(tap, new THREE.CircleGeometry(0.13, 40), faceMat(tp), { pos: [-TX - 0.012, 0.3, 0.62], rot: [0, -H, 0], ex: [-0.8, 0, 0] });
        const TH = [[cyl(0.05, 0.05, 20), { pos: [-1.86, 0.3, 0.62], rot: ALX }], [box(0.03, 0.2, 0.035), { pos: [-1.9, 0.38, 0.62] }],
          [new THREE.SphereGeometry(0.028, 12, 8), { pos: [-1.9, 0.49, 0.62] }], [cyl(0.022, 0.012, 6), { pos: [-1.78, 0.3, 0.62], rot: ALX }]];
        add(tap, merge(TH), 'brass', { ex: [-0.8, 0, 0] });
        add(tap, merge([[box(0.05, 0.06, 0.025), { pos: [-1.87, 0.15, 0.72] }]]), 'brass', { ex: [-0.8, 0, 0] });
        add(tap, new THREE.TorusGeometry(0.02, 0.006, 6, 16, PI), 'galv', { pos: [-1.87, 0.18, 0.72], ex: [-0.8, 0, 0] });
      }

      /* ======================= tank, oil, cover ======================= */
      {
        const T = [[ringRR(3.32, 1.92, 0.04, 0.03, 3.0), {}], [rbox(3.4, 0.05, 2.0, 0.01), { pos: [0, -1.475, 0] }],
          [ringRR(3.4, 2.0, 0.08, 0.07, 0.05), { pos: [0, 1.475, 0] }]];
        [-0.8, 0.8].forEach((z) => {
          T.push([lugG, { pos: [TX, 1.2, z] }], [lugG, { pos: [-TX, 1.2, z], rot: [0, PI, 0] }]);
          [-1, 1].forEach((s) => T.push([box(0.16, 0.05, 0.2), { pos: [s * (TX + 0.08), -1.2, z] }], [box(0.03, 0.12, 0.16), { pos: [s * (TX + 0.03), -1.29, z] }]));
        });
        add(tank, merge(T), 'tank');
        add(oil, box(3.32, 2.98, 1.92), 'oil', { opacity: 0.22 });

        add(cover, rbox(3.6, 0.05, 2.2, 0.012), 'tank', { pos: [0, 1.525, 0], ex: [0, COVER, 0] });
        const CB = []; boltsH(0, 1.56, 0, 3.48, 2.08, 0.19, CB);
        const IC = [[rbox(0.56, 0.035, 0.4, 0.008), { pos: [-0.35, CT + 0.017, -0.45] }]];
        boltsH(-0.35, CT + 0.04, -0.45, 0.48, 0.32, 0.12, CB, HEXS);
        [-0.55, -0.15].forEach((x) => IC.push([new THREE.TorusGeometry(0.05, 0.01, 6, 16, PI), { pos: [x, CT + 0.035, -0.45] }]));
        [[-1.0, 0.92], [1.0, 0.92], [-1.0, -0.92], [1.0, -0.92]].forEach((p) => IC.push([box(0.12, 0.02, 0.08), { pos: [p[0], CT + 0.01, p[1]] }], [new THREE.TorusGeometry(0.04, 0.012, 6, 16), { pos: [p[0], CT + 0.06, p[1]] }]));
        add(cover, merge(IC), 'tank', { ex: [0, COVER, 0] });
        add(cover, merge(CB), 'galv', { ex: [0, COVER, 0] });
        add(cover, merge([[cyl(0.025, 0.05, 6), { pos: [1.55, CT + 0.025, 0.85] }], [cyl(0.025, 0.05, 6), { pos: [-1.55, CT + 0.025, -0.85] }]]), 'brass', { ex: [0, COVER, 0] });
        const ST = [];
        [[-1.0, 1], [1.0, 1], [-1.0, -1], [1.0, -1]].forEach((p) => ST.push([box(0.05, 0.12, 0.012), { pos: [p[0], 1.47, p[1] * 1.108] }]));
        add(cover, merge(ST), 'copper', { ex: [0, COVER, 0] });
      }

      /* ======================= radiators ======================= */
      {
        const fin = extrude(rrShape(0.78, 2.2, 0.12), 0.028, 6);
        [1, -1].forEach((s) => {
          const body = [], vb = [], lev = [], plugs = [];
          [-0.95, 0.95].forEach((cx) => {
            for (let i = 0; i < 9; i++) body.push([fin, { pos: [cx + (i - 4) * 0.09, 0, s * 1.53], rot: [0, H, 0] }]);
            [0.98, -0.98].forEach((y) => {
              body.push([cyl(0.05, 0.84, 16), { pos: [cx, y, s * 1.22], rot: ALX }]);
              body.push([cyl(0.05, 0.22, 16), { pos: [cx, y, s * 1.11], rot: UPZ }]);
              butterfly([cx, y, s * 1.07], s > 0 ? 0 : PI, 1, vb, lev);
              plugs.push([cyl(0.022, 0.05, 6), { pos: [cx + 0.44, y, s * 1.22], rot: ALX }]);
            });
            [0.75, -0.75].forEach((y) => body.push([box(0.84, 0.03, 0.03), { pos: [cx, y, s * 1.905] }]));
            body.push([box(0.04, 0.12, 0.1), { pos: [cx, 1.15, s * 1.53] }]);
          });
          add(rad, merge(body), 'tank', { ex: [0, 0, s * 1.6] });
          add(rad, merge(vb), 'dark', { ex: [0, 0, s * 1.6] });
          add(rad, merge(lev), 'R', { ex: [0, 0, s * 1.6] });
          add(rad, merge(plugs), 'brass', { ex: [0, 0, s * 1.6] });
        });
      }

      /* ======================= conservator and its fittings ======================= */
      {
        const dome = new THREE.SphereGeometry(CR, 36, 10, 0, TAU, 0, H);
        const C = [[annulus(CR, CR - 0.012, CL, null, null, 48), { pos: [CX, CY, 0], rot: ZX }],
          [dome, { pos: [CX + CL / 2, CY, 0], rot: [0, 0, -H], scale: [1, 0.28, 1] }],
          [dome, { pos: [CX - CL / 2, CY, 0], rot: [0, 0, H], scale: [1, 0.28, 1] }]];
        [-0.85, 0.35].forEach((x) => {
          C.push([box(0.1, 0.6, 0.08), { pos: [x, 1.86, 0] }], [box(0.24, 0.02, 0.2), { pos: [x, CT + 0.01, 0] }]);
          C.push([annulus(CR + 0.035, CR, 0.1, PI * 1.2, PI * 1.8, 16), { pos: [x, CY, 0], rot: ZX }]);
        });
        C.push([cyl(0.025, 0.12, 12), { pos: [CX - 0.95, CY - CR - 0.05, 0] }]);
        add(cons, merge(C), 'tank', { ex: [0, CONS, 0] });
        add(cons, merge([[cyl(0.06, 0.06, 20), { pos: [CX - 0.6, CY + CR + 0.02, 0] }], [cyl(0.075, 0.03, 6), { pos: [CX - 0.6, CY + CR + 0.065, 0] }]]), 'brass', { ex: [0, CONS, 0] });
        const DVb = [], DVw = []; gateValve([CX - 0.95, CY - CR - 0.15, -0.05], 0, 0.6, DVb, DVw);
        add(cons, merge(DVb), 'brass', { ex: [0, CONS, 0] });
        add(cons, merge(DVw), 'R', { ex: [0, CONS, 0] });
        add(cons, new THREE.SphereGeometry(1, 32, 16), 'rubber', { pos: [CX - 0.05, CY + 0.17, -0.02], scale: undefined, ex: [0, CONS, 0] }).scale.set(0.95, 0.12, 0.24);
        add(cons, cyl(0.03, 0.14, 12), 'rubber', { pos: [CX - 0.95, CY + 0.28, 0], ex: [0, CONS, 0] });

        /* conservator oil: a segment a little above half full */
        const h = 0.03, rr = CR - 0.015, seg = [], ta = PI - Math.asin(h / rr), tb = TAU + Math.asin(h / rr);
        for (let i = 0; i <= 40; i++) { const t = ta + ((tb - ta) * i) / 40; seg.push(new THREE.Vector2(rr * Math.cos(t), rr * Math.sin(t))); }
        add(oil, extrude(polyShape(seg), CL - 0.02, 2), 'oil', { pos: [CX, CY, 0], rot: ZX, ex: [0, CONS, 0], opacity: 0.55 });

        /* magnetic oil level gauge on the +x end, float inside */
        const mx = CX + CL / 2 + 0.1;
        add(lvl, merge([[cyl(0.11, 0.07, 32), { pos: [mx, CY, 0], rot: ALX }], [cyl(0.05, 0.06, 16), { pos: [mx - 0.05, CY, 0], rot: ALX }]]), 'dark', { ex: [0.4, CONS, 0] });
        const mog = canvasTex(256, 256, (g, S) => drawDial(g, S, { min: 0, max: 100, major: 50, minor: 10, labels: false, words: [[0, 'EMPTY'], [50, '35°C'], [100, 'FULL']], bands: [[0, 15, '#c0392b']], title: 'OIL LEVEL', sub: 'MOG', val: 55 }));
        add(lvl, new THREE.CircleGeometry(0.092, 40), faceMat(mog), { pos: [mx + 0.037, CY, 0], rot: [0, H, 0], ex: [0.4, CONS, 0] });
        add(lvl, new THREE.TorusGeometry(0.098, 0.012, 8, 40), 'galv', { pos: [mx + 0.037, CY, 0], rot: [0, H, 0], ex: [0.4, CONS, 0] });
        add(lvl, merge([[cyl(0.008, 0.5, 8), { pos: [CX + CL / 2 - 0.22, CY + 0.01, -0.06], rot: [0, 0, H + 0.06] }], [new THREE.SphereGeometry(0.055, 16, 12), { pos: [CX + CL / 2 - 0.48, CY + 0.035, -0.06] }]]), 'alu', { ex: [0.4, CONS, 0] });
        /* plain level gauge on the front of the drum */
        const gx = CX - 0.7, gz = CR + 0.035;
        add(lvl, box(0.07, 0.42, 0.01), faceMat(canvasTex(64, 256, drawGaugeMarks)), { pos: [gx + 0.06, CY, gz - 0.01], ex: [0, CONS, 0.4] });
        add(lvl, cyl(0.022, 0.38, 16), 'glass', { pos: [gx, CY, gz], ex: [0, CONS, 0.4], opacity: 0.35 });
        add(lvl, cyl(0.016, 0.21, 12), 'oil', { pos: [gx, CY - 0.085, gz], ex: [0, CONS, 0.4], opacity: 0.85 });
        add(lvl, merge([[cyl(0.03, 0.03, 6), { pos: [gx, CY + 0.205, gz] }], [cyl(0.03, 0.03, 6), { pos: [gx, CY - 0.205, gz] }],
          [box(0.02, 0.02, 0.03), { pos: [gx, CY + 0.205, gz - 0.02] }], [box(0.02, 0.02, 0.03), { pos: [gx, CY - 0.205, gz - 0.02] }]]), 'brass', { ex: [0, CONS, 0.4] });
      }

      /* ======================= breather ======================= */
      {
        const BX = -1.52, BZ = -1.13, BY = 0.42, ex = [-0.5, 0, -1.2];
        add(brt, pipe([[CX - 0.95, CY + CR + 0.08, 0], [CX - 0.95, CY + CR + 0.18, 0], [BX, CY + CR + 0.18, 0], [BX, CY + CR + 0.18, BZ], [BX, BY + 0.24, BZ]], 0.022, 0.1), 'tank', { ex: ex });
        add(brt, merge([[cyl(0.12, 0.035, 24), { pos: [BX, BY + 0.205, BZ] }], [cyl(0.12, 0.03, 24), { pos: [BX, BY - 0.195, BZ] }],
          [cyl(0.1, 0.015, 24), { pos: [BX, BY - 0.32, BZ] }], [box(0.05, 0.1, 0.13), { pos: [BX, BY + 0.27, -1.065] }]]), 'tank', { ex: ex });
        add(brt, cyl(0.105, 0.36, 32), 'glass', { pos: [BX, BY, BZ], ex: ex, opacity: 0.3 });
        add(brt, cyl(0.09, 0.26, 24), 'gel', { pos: [BX, BY + 0.04, BZ], ex: ex });
        add(brt, cyl(0.09, 0.08, 24), 'gelPink', { pos: [BX, BY - 0.13, BZ], ex: ex });
        add(brt, cyl(0.1, 0.1, 32), 'glass', { pos: [BX, BY - 0.26, BZ], ex: ex, opacity: 0.35 });
        add(brt, cyl(0.085, 0.05, 24), 'oil', { pos: [BX, BY - 0.285, BZ], ex: ex, opacity: 0.8 });
      }

      /* ======================= Buchholz relay ======================= */
      {
        const yAt = (x) => 1.76 + (1.25 - x) * 0.1, ex = [0, 5.2, 0.7], BXr = 0.85, by = yAt(BXr);
        add(buch, pipe([[1.25, CT, 0], [1.25, 1.76, 0], [0.45, yAt(0.45), 0], [0.45, CY - CR + 0.02, 0]], 0.04, 0.09), 'tank', { ex: ex });
        const vb = [], lev = [];
        [1.1, 0.6].forEach((x) => butterfly([x, yAt(x), 0], H, 0.75, vb, lev));
        add(buch, merge(vb), 'dark', { ex: ex });
        add(buch, merge(lev), 'R', { ex: ex });
        const HB = [[rbox(0.27, 0.2, 0.2, 0.02), { pos: [BXr, by, 0], rot: [0, 0, 0.1] }],
          [cyl(0.075, 0.025, 20), { pos: [BXr - 0.135, by + 0.014, 0], rot: ALX }], [cyl(0.075, 0.025, 20), { pos: [BXr + 0.135, by - 0.014, 0], rot: ALX }],
          [rbox(0.22, 0.03, 0.17, 0.01), { pos: [BXr, by + 0.11, 0], rot: [0, 0, 0.1] }]];
        add(buch, merge(HB), 'alu', { ex: ex });
        add(buch, merge([[rbox(0.1, 0.08, 0.08, 0.01), { pos: [BXr - 0.05, by + 0.165, 0.03] }], [new THREE.TorusGeometry(0.05, 0.01, 8, 24), { pos: [BXr, by, 0.102] }], [new THREE.TorusGeometry(0.05, 0.01, 8, 24), { pos: [BXr, by, -0.102] }]]), 'dark', { ex: ex });
        add(buch, merge([[cyl(0.045, 0.006, 24), { pos: [BXr, by, 0.1], rot: UPZ }], [cyl(0.045, 0.006, 24), { pos: [BXr, by, -0.1], rot: UPZ }]]), 'glass', { ex: ex, opacity: 0.45 });
        add(buch, merge([[cyl(0.012, 0.06, 8), { pos: [BXr + 0.06, by + 0.15, -0.04] }], [box(0.05, 0.012, 0.02), { pos: [BXr + 0.06, by + 0.185, -0.04] }]]), 'brass', { ex: ex });
        add(buch, merge([[cyl(0.035, 0.1, 16), { pos: [BXr - 0.04, by + 0.05, 0], rot: UPZ }], [cyl(0.035, 0.1, 16), { pos: [BXr + 0.05, by - 0.05, 0], rot: UPZ }]]), 'white', { ex: ex });
      }

      /* ======================= PRV and explosion vent ======================= */
      {
        const px = 0.95, pz = -0.55, ex = [0, COVER, 0];
        add(prv, merge([[cyl(0.11, 0.03, 28), { pos: [px, CT + 0.015, pz] }], [cyl(0.09, 0.08, 28), { pos: [px, CT + 0.07, pz] }],
          [new THREE.SphereGeometry(0.09, 28, 10, 0, TAU, 0, H), { pos: [px, CT + 0.11, pz] }]]), 'tank', { ex: ex });
        add(prv, merge([[cyl(0.008, 0.09, 8), { pos: [px, CT + 0.24, pz] }], [box(0.07, 0.06, 0.06), { pos: [px + 0.12, CT + 0.08, pz] }]]), 'dark', { ex: ex });
        add(prv, box(0.012, 0.07, 0.07), 'Y', { pos: [px, CT + 0.3, pz + 0.03], ex: ex });

        const vx = -0.95, vz = -0.55, end = V(vx, 2.47, -0.78), d = V(0, 0.16, -0.2).normalize();
        add(vent, pipe([[vx, CT, vz], [vx, 2.3, vz], end], 0.07, 0.14, 20), 'tank', { ex: ex });
        add(vent, merge([[cyl(0.12, 0.03, 28), { pos: [vx, CT + 0.015, vz] }], [cyl(0.11, 0.03, 28), { pos: [end.x, end.y, end.z], rot: toward(d) }]]), 'tank', { ex: ex });
        const dp = end.clone().addScaledVector(d, 0.018);
        add(vent, cyl(0.095, 0.006, 28), 'white', { pos: [dp.x, dp.y, dp.z], rot: toward(d), ex: ex });
      }

      /* ======================= temperature indicators and marshalling box ======================= */
      {
        const exC = [0, COVER, 0], exM = [0, 0, 1.3];
        const PK = [];
        [[0.15, 0.62], [-0.15, 0.62], [0.5, 0.62]].forEach((p) => PK.push([cyl(0.04, 0.07, 6), { pos: [p[0], CT + 0.035, p[1]] }], [cyl(0.028, 0.03, 12), { pos: [p[0], CT + 0.085, p[1]] }]));
        add(temp, merge(PK), 'brass', { ex: exC });
        const CAP = [];
        [0.15, -0.15].forEach((x) => CAP.push(pipe([[x, CT + 0.09, 0.62], [x, CT + 0.11, 1.18], [x * 0.7, 0.9, 1.2], [x * 0.7, 0.87, 1.2]], 0.008, 0.08, 6)));
        add(temp, merge(CAP), 'brass', { ex: exM });
        const oti = canvasTex(256, 256, (g, S) => drawDial(g, S, { min: 0, max: 150, major: 30, minor: 10, title: 'OIL °C', sub: 'OTI', val: 58, maxv: 71, sets: [[85, '#d9a21c'], [95, '#c0392b']] }));
        const wti = canvasTex(256, 256, (g, S) => drawDial(g, S, { min: 0, max: 150, major: 30, minor: 10, title: 'WINDING °C', sub: 'WTI', val: 67, maxv: 82, sets: [[95, '#d9a21c'], [105, '#c0392b']] }));
        add(temp, new THREE.CircleGeometry(0.085, 40), faceMat(oti), { pos: [-0.12, 0.6, 1.346], ex: exM });
        add(temp, new THREE.CircleGeometry(0.085, 40), faceMat(wti), { pos: [0.12, 0.6, 1.346], ex: exM });
        add(temp, merge([[new THREE.TorusGeometry(0.09, 0.012, 8, 36), { pos: [-0.12, 0.6, 1.347] }], [new THREE.TorusGeometry(0.09, 0.012, 8, 36), { pos: [0.12, 0.6, 1.347] }]]), 'dark', { ex: exM });

        const MB = [[rbox(0.62, 0.86, 0.26, 0.025), { pos: [0, 0.43, 1.19] }], [rbox(0.58, 0.82, 0.02, 0.008), { pos: [0, 0.43, 1.33] }],
          [rbox(0.7, 0.025, 0.34, 0.008), { pos: [0, 0.885, 1.2], rot: [-0.08, 0, 0] }]];
        [[-0.22, 0.12], [0.22, 0.12], [-0.22, 0.74], [0.22, 0.74]].forEach((p) => MB.push([box(0.08, 0.06, 0.07), { pos: [p[0], p[1], 1.035] }]));
        add(mbox, merge(MB), 'tank', { ex: exM });
        add(mbox, merge([[box(0.46, 0.022, 0.01), { pos: [0, 0.73, 1.345] }], [box(0.46, 0.022, 0.01), { pos: [0, 0.47, 1.345] }], [box(0.022, 0.26, 0.01), { pos: [-0.23, 0.6, 1.345] }],
          [box(0.022, 0.26, 0.01), { pos: [0.23, 0.6, 1.345] }], [box(0.5, 0.015, 0.2), { pos: [0, -0.005, 1.19] }]]), 'dark', { ex: exM });
        add(mbox, box(0.44, 0.24, 0.004), 'glass', { pos: [0, 0.6, 1.352], ex: exM, opacity: 0.22 });
        add(mbox, merge([[cyl(0.012, 0.12, 8), { pos: [-0.3, 0.22, 1.342] }], [cyl(0.012, 0.12, 8), { pos: [-0.3, 0.66, 1.342] }], [box(0.025, 0.1, 0.03), { pos: [0.25, 0.3, 1.355] }],
          pipeItem(0.22), pipeItem(-0.22)]), 'galv', { ex: exM });
        add(mbox, merge([-0.18, -0.06, 0.06, 0.18].map((x) => [cyl(0.03, 0.06, 6), { pos: [x, -0.04, 1.19] }])), 'brass', { ex: exM });
        function pipeItem(x) { return [pipe([[x, 0.87, 1.2], [x, 1.63, 1.2], [x, 1.63, 0.9]], 0.014, 0.08), {}]; }
      }

      /* ======================= HV cable box and termination ======================= */
      {
        const HBz = [-0.3, 0, 0.3];
        add(hvBox, rbox(0.34, 0.8, 1.1, 0.02), 'tank', { pos: [-1.885, 0.85, 0], ex: [-1.0, 0, 0] });
        add(hvBox, merge([[rbox(0.58, 1.8, 1.0, 0.025), { pos: [-2.34, 0.35, 0] }], [rbox(0.26, 0.02, 0.92, 0.006), { pos: [-1.885, 1.258, 0] }]]), 'tank', { ex: [-1.7, 0, 0] });
        add(hvBox, box(0.5, 0.012, 0.9), 'dark', { pos: [-2.34, -0.556, 0], ex: [-1.7, 0, 0] });
        const CV = [[rbox(0.03, 1.72, 0.92, 0.01), { pos: [-2.645, 0.35, 0] }]], CVb = [];
        boltsX(-2.664, 0.35, 0, 1.64, 0.84, 0.17, CVb);
        [1.05, -0.3].forEach((y) => CVb.push([pipe([[-2.66, y, -0.18], [-2.72, y, -0.18], [-2.72, y, 0.18], [-2.66, y, 0.18]], 0.012, 0.03), {}]));
        add(hvBox, merge(CV), 'tank', { ex: [-2.4, 0, 0] });
        add(hvBox, merge(CVb), 'galv', { ex: [-2.4, 0, 0] });
        const dg = canvasTex(256, 192, drawDanger);
        add(hvBox, new THREE.PlaneGeometry(0.3, 0.225), faceMat(dg), { pos: [-2.662, 0.55, 0], rot: [0, -H, 0], ex: [-2.4, 0, 0] });
        add(hvBox, cyl(0.075, 0.08, 20), 'brass', { pos: [-2.34, -0.6, 0], ex: [-1.7, 0, 0] });

        const BU = [], BUi = [], ST = [], LK = [], RS = [], RC = [], LG = [];
        HBz.forEach((z, i) => {
          BUi.push([cyl(0.04, 0.14, 16), { pos: [-1.6, 0.85, z], rot: ALX }]);
          BU.push([cyl(0.045, 0.22, 20), { pos: [-1.83, 0.85, z], rot: ALX }]);
          [-1.78, -1.86].forEach((x) => BU.push([cyl(0.07, 0.015, 24), { pos: [x, 0.85, z], rot: ALX }]));
          ST.push([cyl(0.075, 0.02, 20), { pos: [-1.715, 0.85, z], rot: ALX }]);
          LK.push([cyl(0.013, 0.12, 8), { pos: [-1.98, 0.85, z], rot: ALX }], [box(0.02, 0.17, 0.05), { pos: [-2.03, 0.785, z] }], [cyl(0.013, 0.1, 8), { pos: [-2.15, 0.7, z], rot: ALX }]);
          RS.push([cyl(0.05, 0.12, 16), { pos: [-2.06, 0.7, z], rot: ALX }]);
          const kk = i - 1, a = V(-2.34, 0.2, 0.3 * kk), b = V(-2.25, 0.55, 0.3 * kk);
          RC.push(pipe([[-2.34, -0.05, 0.035 * kk], a, b, [-2.2, 0.64, z]], 0.022, 0.1));
          [0.3, 0.45, 0.6].forEach((u) => { const p = a.clone().lerp(b, u); RC.push([cyl(0.05, 0.012, 20), { pos: [p.x, p.y, p.z], rot: [0, 0, -0.25] }]); });
          LG.push([box(0.045, 0.1, 0.03), { pos: [-2.19, 0.7, z] }]);
        });
        add(hvTerm, merge(BUi), 'porcelainBr', { ex: [-0.6, 0, 0] });
        add(hvTerm, merge(BU), 'porcelainBr', { ex: [-0.6, 0, 0] });
        add(hvTerm, merge(ST), 'dark', { ex: [-0.6, 0, 0] });
        add(hvTerm, merge(LK), 'copper', { ex: [-1.0, 0, 0] });
        add(hvTerm, merge(RS), 'dark', { ex: [-1.0, 0, 0] });
        add(hvTerm, merge(RC.map((g) => (Array.isArray(g) ? g : [g, {}]))), 'R', { ex: [-1.7, 0, 0] });
        add(hvTerm, merge(LG), 'copper', { ex: [-1.7, 0, 0] });
        add(hvTerm, merge([[cyl(0.065, 0.48, 24), { pos: [-2.34, -0.3, 0] }], [cyl(0.078, 0.1, 24), { pos: [-2.34, -0.07, 0] }],
          [pipe([[-2.34, -0.62, 0], [-2.34, -1.95, 0], [-2.95, -2.2, 0]], 0.065, 0.3, 16), {}]]), 'rubber', { ex: [-1.7, 0, 0] });
      }

      /* ======================= LV cable box and busbars ======================= */
      {
        const LZ = [-0.48, -0.16, 0.16, 0.48], CZ = [-0.42, 0, 0.42], COL = ['R', 'Y', 'B', 'dark'];
        add(lvBox, rbox(0.36, 0.8, 1.44, 0.02), 'tank', { pos: [1.9, 0.8, 0], ex: [1.0, 0, 0] });
        add(lvBox, merge([[rbox(0.72, 2.0, 1.44, 0.025), { pos: [2.44, 0.2, 0] }], [rbox(0.28, 0.02, 1.36, 0.006), { pos: [1.9, 1.208, 0] }]]), 'tank', { ex: [1.7, 0, 0] });
        add(lvBox, box(0.64, 0.012, 1.36), 'dark', { pos: [2.44, -0.806, 0], ex: [1.7, 0, 0] });
        const CVb = []; boltsX(2.835, 0.2, 0, 1.84, 1.28, 0.18, CVb);
        [1.0, -0.6].forEach((y) => CVb.push([pipe([[2.83, y, -0.2], [2.89, y, -0.2], [2.89, y, 0.2], [2.83, y, 0.2]], 0.012, 0.03), {}]));
        add(lvBox, rbox(0.03, 1.92, 1.36, 0.01), 'tank', { pos: [2.815, 0.2, 0], ex: [2.4, 0, 0] });
        add(lvBox, merge(CVb), 'galv', { ex: [2.4, 0, 0] });
        add(lvBox, merge(CZ.map((z) => [cyl(0.075, 0.08, 20), { pos: [2.44, -0.85, z] }])), 'brass', { ex: [1.7, 0, 0] });

        const BU = [], ST = [], LK = [], RS = [], BB = [], LG = [], SH = [];
        const cores = { R: [], Y: [], B: [], dark: [] };
        LZ.forEach((z) => {
          BU.push([cyl(0.05, 0.14, 16), { pos: [1.6, 0.8, z], rot: ALX }], [cyl(0.055, 0.17, 20), { pos: [1.81, 0.8, z], rot: ALX }], [cyl(0.08, 0.015, 24), { pos: [1.8, 0.8, z], rot: ALX }]);
          ST.push([cyl(0.08, 0.02, 20), { pos: [1.715, 0.8, z], rot: ALX }]);
          LK.push([box(0.1, 0.02, 0.07), { pos: [1.94, 0.8, z] }], [box(0.02, 0.17, 0.07), { pos: [1.99, 0.725, z] }]);
          RS.push([cyl(0.055, 0.12, 16), { pos: [2.08, 0.65, z], rot: ALX }]);
          BB.push([box(0.1, 0.014, 0.08), { pos: [2.17, 0.65, z] }], [box(0.014, 0.62, 0.08), { pos: [2.22, 0.34, z] }]);
        });
        CZ.forEach((zc, c) => {
          SH.push([cyl(0.06, 0.48, 24), { pos: [2.44, -0.57, zc] }], [cyl(0.072, 0.1, 24), { pos: [2.44, -0.33, zc] }]);
          SH.push([pipe([[2.44, -0.88, zc], [2.44, -1.95, zc], [3.05, -2.2, zc]], 0.06, 0.3, 16), {}]);
          LZ.forEach((z, j) => {
            const y = 0.12 + 0.12 * c;
            cores[COL[j]].push(pipe([[2.44, -0.28, zc + (j - 1.5) * 0.03], [2.4, -0.05, zc * 0.6 + z * 0.4], [2.3, y - 0.06, z], [2.25, y, z]], 0.021, 0.08, 8));
            LG.push([box(0.04, 0.07, 0.03), { pos: [2.235, y, z + 0.0] }]);
          });
        });
        add(lvTerm, merge(BU), 'porcelainBr', { ex: [0.6, 0, 0] });
        add(lvTerm, merge(ST), 'dark', { ex: [0.6, 0, 0] });
        add(lvTerm, merge(LK), 'copper', { ex: [1.0, 0, 0] });
        add(lvTerm, merge(RS), 'dark', { ex: [1.0, 0, 0] });
        add(lvTerm, merge(BB.concat(LG)), 'copper', { ex: [1.7, 0, 0] });
        Object.keys(cores).forEach((c) => add(lvTerm, merge(cores[c].map((g) => [g, {}])), c, { ex: [1.7, 0, 0] }));
        add(lvTerm, merge(SH), 'rubber', { ex: [1.7, 0, 0] });
      }

      /* ======================= neutral bushing, CT and earthing strip ======================= */
      {
        const nx = 1.52, nz = -0.55, exB = [0, COVER, 0], exS = [0.6, 0, -0.6];
        add(neu, merge([[cyl(0.08, 0.025, 24), { pos: [nx, CT + 0.012, nz] }], [new THREE.TorusGeometry(0.085, 0.032, 12, 32), { pos: [nx, CT + 0.06, nz], rot: [H, 0, 0] }],
          [rbox(0.08, 0.06, 0.06, 0.008), { pos: [nx + 0.14, CT + 0.06, nz] }]]), 'dark', { ex: exB });
        const NB = [[cyl(0.045, 0.3, 20), { pos: [nx, CT + 0.22, nz] }]];
        [0.13, 0.21, 0.29].forEach((y) => NB.push([cyl(0.075, 0.018, 24), { pos: [nx, CT + y, nz] }]));
        add(neu, merge(NB), 'porcelainBr', { ex: exB });
        add(neu, merge([[cyl(0.014, 0.1, 8), { pos: [nx, CT + 0.42, nz] }], [box(0.06, 0.05, 0.06), { pos: [nx, CT + 0.47, nz] }]]), 'brass', { ex: exB });
        const yS = CT + 0.47, zW = -1.16;
        const GS = [[box(0.05, 0.006, nz - zW), { pos: [nx, yS, (nz + zW) / 2] }], [box(0.05, yS + 1.75, 0.006), { pos: [nx, (yS - 1.75) / 2, zW] }],
          [box(0.05, 0.006, 0.44), { pos: [nx, -1.75, zW - 0.22] }], [box(0.05, 0.5, 0.006), { pos: [nx, -2.0, zW - 0.44] }]];
        add(neu, merge(GS), 'galv', { ex: exS });
        add(neu, merge([1.2, 0.0, -1.2].map((y) => [cyl(0.025, 0.16, 12), { pos: [nx, y, -1.08], rot: UPZ }])), 'porcelainBr', { ex: exS });
      }

      /* ======================= valves ======================= */
      {
        const fb = [], fw = [], tb = [], tw = [];
        gateValve([1.52, -1.25, TZ], 0, 1.1, fb, fw);
        gateValve([1.52, -0.9, TZ], 0, 0.6, fb, fw);
        gateValve([-TX, 1.32, -0.76], -H, 1.0, tb, tw);
        add(valves, merge(fb), 'brass', { ex: [0, 0, 0.8] });
        add(valves, merge(fw), 'R', { ex: [0, 0, 0.8] });
        add(valves, merge(tb), 'brass', { ex: [-0.8, 0, 0] });
        add(valves, merge(tw), 'R', { ex: [-0.8, 0, 0] });
      }

      /* ======================= base, rollers, earthing, plates, foundation ======================= */
      {
        const ex = [0, -0.7, 0], BS = [], RL = [], FK = [], CL2 = [];
        [-0.95, 0.95].forEach((z) => {
          BS.push([rbox(3.6, 0.2, 0.14, 0.01), { pos: [0, -1.6, z] }], [lugG, { pos: [1.8, -1.6, z] }], [lugG, { pos: [-1.8, -1.6, z], rot: [0, PI, 0] }]);
          [-1.1, 1.1].forEach((x) => {
            FK.push([box(0.22, 0.02, 0.22), { pos: [x, -1.71, z] }], [box(0.17, 0.13, 0.015), { pos: [x, -1.78, z - 0.055] }], [box(0.17, 0.13, 0.015), { pos: [x, -1.78, z + 0.055] }]);
            RL.push([cyl(0.13, 0.07, 28), { pos: [x, -1.85, z], rot: UPZ }], [cyl(0.15, 0.015, 28), { pos: [x, -1.85, z - 0.04], rot: UPZ }]);
            CL2.push([cyl(0.02, 0.15, 8), { pos: [x, -1.85, z], rot: UPZ }], [box(0.035, 0.12, 0.1), { pos: [x + 0.2, -1.92, z] }], [box(0.09, 0.02, 0.1), { pos: [x + 0.17, -1.87, z] }]);
          });
        });
        [-1.35, 1.35].forEach((x) => {
          BS.push([rbox(0.12, 0.16, 2.3, 0.01), { pos: [x, -1.62, 0] }]);
          BS.push([lugG, { pos: [x, -1.62, 1.15], rot: [0, -H, 0] }], [lugG, { pos: [x, -1.62, -1.15], rot: [0, H, 0] }]);
        });
        add(base, merge(BS), 'tank', { ex: ex });
        add(base, merge(FK), 'dark', { ex: ex });
        add(base, merge(RL), 'steel', { ex: ex });
        add(base, merge(CL2), 'galv', { ex: ex });

        const EP = [], EF = [], EB = [];
        [[-1, 0.55], [1, -0.55]].forEach((p) => {
          const x = p[0] * (TX + 0.012);
          EP.push([box(0.024, 0.08, 0.14), { pos: [x, -0.95, p[1]] }]);
          [-0.035, 0.035].forEach((dz) => EB.push([HEXS, { pos: [x + p[0] * 0.016, -0.95, p[1] + dz], rot: ALX }]));
          EF.push([box(0.006, 1.31, 0.05), { pos: [p[0] * (TX + 0.03), -1.6, p[1]] }]);
        });
        [[-2.34, -0.4, 0.505], [-2.34, -0.4, -0.505], [2.44, -0.65, 0.725], [2.44, -0.65, -0.725]].forEach((p) => EP.push([box(0.1, 0.05, 0.012), { pos: p }]));
        add(earth, merge(EP), 'brass');
        add(earth, merge(EB), 'galv');
        add(earth, merge(EF), 'galv', { ex: [0, -0.4, 0] });

        const rp = canvasTex(640, 480, drawRating), tm = canvasTex(640, 480, drawTerminals);
        add(plates, new THREE.PlaneGeometry(0.48, 0.36), faceMat(rp), { pos: [-0.265, -0.55, TZ + 0.012], ex: [0, 0, 0.8] });
        add(plates, new THREE.PlaneGeometry(0.48, 0.36), faceMat(tm), { pos: [0.265, -0.55, TZ + 0.012], ex: [0, 0, 0.8] });
        const RV = [[box(0.5, 0.38, 0.008), { pos: [-0.265, -0.55, TZ + 0.006] }], [box(0.5, 0.38, 0.008), { pos: [0.265, -0.55, TZ + 0.006] }]];
        add(plates, merge(RV), 'galv', { ex: [0, 0, 0.8] });

        add(fdn, rbox(3.0, 0.3, 3.0, 0.02), 'concrete', { pos: [0, -2.13, 0], ex: [0, -1.4, 0] });
        add(fdn, merge([[box(2.5, 0.01, 0.8), { pos: [0, -1.984, 1.0] }], [box(2.5, 0.01, 0.8), { pos: [0, -1.984, -1.0] }]]), 'dark', { ex: [0, -1.4, 0] });
      }

      /* ======================= Flux view ======================= */
      const w = PI;   // 0.5 Hz on screen
      function win(x0, x1, z, d) { return [V(x0, YB + d, z), V(x0, YT - d, z), V(x1, YT - d, z), V(x1, YB + d, z)]; }
      const L1 = [], L2 = [];
      for (const z of [-0.08, 0.08]) for (const d of [0, 0.07]) { L1.push(win(-P + d, -d, z, d)); L2.push(win(d, P - d, z, d)); }
      const F1 = makeFlux(L1, 30, 0.3), F2 = makeFlux(L2, 30, 0.3);
      function oilLoop(s, x) {
        return [V(x, -1.25, 0.15 * s), V(x, 0.75, 0.15 * s), V(x, 1.35, 0.35 * s), V(x, 1.3, 0.85 * s), V(x, 0.98, 1.22 * s), V(x, 0.9, 1.5 * s),
          V(x, -0.9, 1.5 * s), V(x, -0.98, 1.22 * s), V(x, -1.3, 0.85 * s), V(x, -1.36, 0.4 * s)];
      }
      const OL = [];
      for (const s of [1, -1]) for (const x of [-1.1, -0.8, 0.8, 1.1]) OL.push(oilLoop(s, x));
      const FO = makeFlux(OL, 26, 0.26, 'copper');
      m.fluxGroup.add(F1.obj, F2.obj, FO.obj);
      /* window 1 carries the R-limb flux, window 2 minus the B-limb flux; their difference is the Y-limb flux */
      m.fluxUpdate = (t) => {
        F1.update(-0.9 * Math.cos(w * t)); F1.mat.opacity = 0.2 + 0.8 * Math.abs(Math.sin(w * t));
        F2.update(0.9 * Math.cos(w * t + TAU / 3)); F2.mat.opacity = 0.2 + 0.8 * Math.abs(Math.sin(w * t + TAU / 3));
        FO.update(t * 0.45);
      };
      m.waves = [
        { label: 'vR', color: 'phR', f: (t) => Math.cos(w * t) },
        { label: 'vY', color: 'phY', f: (t) => Math.cos(w * t - TAU / 3) },
        { label: 'vB', color: 'phB', f: (t) => Math.cos(w * t - (2 * TAU) / 3) },
      ];
      m.speed = 0;
      m.cutNormals = [[0, 0, -1], [0, -1, 0]];   // Cutaway removes the upper front quarter
      m.camDir = [6.2, 3.6, 8.8];
    },
  });
})();
