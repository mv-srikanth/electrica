/*
  Series (composite) magnetic circuit: a laminated core with a coil on one limb and an
  adjustable air gap in the other. One unit in the model is 8 cm, so the 0.5-unit limbs are
  4 cm square and the centre line of the core is 60 cm long, the figures used in the calculation.
*/
(function () {
  const MU0 = 4 * Math.PI * 1e-7;
  const A = 16e-4;       // m², 4 cm × 4 cm
  const LI = 0.60;       // m, mean iron path
  const MUR = 2000;      // relative permeability, assumed constant

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function num(x, unit) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0 ' + unit;
    const e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -2 && e < 4) return String(Number(x.toPrecision(3))) + ' ' + unit;
    return (x / Math.pow(10, e)).toFixed(2) + ' × 10' + String(e).split('').map((c) => SUP[c]).join('') + ' ' + unit;
  }

  Electrica.register({
    id: 'magnetic-circuit-series',
    short: 'Series magnetic circuit',
    name: 'Magnetic circuit with air gap',
    kind: 'Magnetic circuit · DC',
    sub: 'Composite series circuit · Iron path and air gap',
    icon: '<path d="M37 19V9H7v26h30V25"/><path d="M14 16h16v12H14z"/><path d="M4 17h7M4 21h7M4 25h7M4 29h7"/>',
    plate: [
      ['Core', 'Laminated silicon steel'], ['Section', '4 × 4 cm = 16 cm²'], ['Iron path', 'li = 60 cm'],
      ['Permeability', 'μr = 2000, assumed'], ['Air gap', '0 to 3 mm'], ['Coil', 'N turns carrying I'],
    ],
    plateNote: 'Example values for teaching',
    principle: 'A magnetic circuit is the closed path the flux follows. The coil’s MMF drives flux round it and every section opposes the flux with its reluctance, just as an EMF drives current through resistances. Sections in series carry the same flux, so their reluctances add. Air has μr = 1, so a gap of a millimetre or two can need more MMF than the whole iron path.',
    formulas: [
      'S = l / (μ0 · μr · A)',
      'Φ = F / (S_iron + S_gap),  F = N · I',
      'B = Φ / A,  H = B / (μ0 · μr)',
      'L = N² / S_total',
    ],
    fluxNote: 'Flux circles the core and crosses the gap. At the gap some lines bulge outwards; this is fringing, and it grows with the gap. Particle speed and brightness follow the flux density.',
    calcTitle: 'Try it: turns, current and gap',
    params: [
      { id: 'N', label: 'Turns N', min: 100, max: 1000, step: 50, value: 500 },
      { id: 'I', label: 'Current I', min: 0.2, max: 4, step: 0.1, value: 2, unit: 'A', format: (v) => v.toFixed(1) },
      { id: 'g', label: 'Air gap lg', min: 0, max: 3, step: 0.1, value: 1, unit: 'mm', format: (v) => v.toFixed(1) },
    ],
    diagram: '<svg viewBox="0 0 300 140" style="white-space:pre" role="img" aria-label="Equivalent electrical circuit: the MMF source F drives flux through the iron reluctance and the gap reluctance in series">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M40 30H110M170 30H260V50M260 90V110H40V77M40 63V30"/>' +
      '<rect x="110" y="22" width="60" height="16"/><rect x="252" y="50" width="16" height="40"/>' +
      '<path d="M28 63H52" stroke-width="2.4"/><path d="M33 77H47" stroke-width="4.5"/></g>' +
      '<path d="M188 30H228M221 25l7 5-7 5" fill="none" style="stroke:var(--flux)" stroke-width="2"/>' +
      '<text x="140" y="15" text-anchor="middle">S iron</text><text x="246" y="74" text-anchor="end">S gap</text>' +
      '<text x="56" y="74">F = NI</text><text x="208" y="20" text-anchor="middle" style="fill:var(--flux)">Φ</text>' +
      '<text x="150" y="132" text-anchor="middle">F ↔ E  ·  Φ ↔ I  ·  S ↔ R</text></svg>',
    calc: function (v) {
      const lg = v.g / 1000, F = v.N * v.I;
      const Si = LI / (MU0 * MUR * A), Sg = lg / (MU0 * A), S = Si + Sg;
      const phi = F / S, B = phi / A;
      const Fi = phi * Si, Fg = phi * Sg;
      const rows = [
        ['MMF  F = NI', num(F, 'AT')],
        ['S iron', num(Si, 'AT/Wb')],
        ['S gap', lg > 0 ? num(Sg, 'AT/Wb') : 'no gap'],
        ['S total', num(S, 'AT/Wb')],
        ['Flux  Φ', num(phi * 1000, 'mWb')],
        ['Flux density  B', num(B, 'T')],
        ['MMF used by the iron', Math.round((100 * Fi) / F) + ' %  (' + Math.round(Fi) + ' AT)'],
        ['MMF used by the gap', Math.round((100 * Fg) / F) + ' %  (' + Math.round(Fg) + ' AT)'],
        ['Inductance  L = N²/S', num((v.N * v.N) / S, 'H')],
      ];
      const note = B > 1.5
        ? 'B is above about 1.5 T. Real silicon steel starts to saturate here, μr falls, and the true flux would be lower than this linear result.'
        : 'Fringing is neglected and μr is taken as constant. The gap is drawn wider than to scale.';
      return { rows: rows, note: note, B: B };
    },

    build: function (k, m) {
      const { THREE, V, part, add, ringRR, cyl, makeFlux } = k;
      const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
      const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8);
      const D = 0.5, NS = 5, sd = 0.088, sg = (D - NS * sd) / (NS - 1);
      const zs = []; for (let i = 0; i < NS; i++) zs.push(-D / 2 + sd / 2 + i * (sd + sg));
      const WIN = 1.25;   // window height; limbs run from -0.625 to 0.625

      const core = part({
        name: 'Laminated core',
        role: 'The low-reluctance path for the flux. With μr in the thousands, the steel guides almost all the flux round the circuit.',
        material: 'Silicon-steel laminations, insulated from each other to limit eddy currents',
        look: 'The right limb is cut to make the air gap.',
      });
      const yokeG = box(2.5, 0.5, sd), limbG = box(0.5, WIN, sd), unit = box(0.5, 1, sd);
      const upper = [], lower = [];
      zs.forEach((z, i) => {
        const mk = i % 2 ? 'lamB' : 'lamA';
        add(core, yokeG, mk, { pos: [0, 0.875, z], ex: [0, 0.9, 0] });
        add(core, yokeG, mk, { pos: [0, -0.875, z], ex: [0, -0.9, 0] });
        add(core, limbG, mk, { pos: [-1.0, 0, z], ex: [-0.9, 0, 0] });
        upper.push(add(core, unit, mk, { pos: [1.0, 0.3, z], ex: [0.9, 0.3, 0] }));
        lower.push(add(core, unit, mk, { pos: [1.0, -0.3, z], ex: [0.9, -0.3, 0] }));
      });

      const gap = part({
        name: 'Air gap',
        role: 'A short break in the core filled with air. Because air has μr = 1, a gap of 1 mm adds more reluctance than the whole 60 cm of iron. Gaps are used on purpose in inductors and chokes to keep the inductance steady and stop the core saturating.',
        material: 'Air (shown in blue)',
        look: 'Change the gap with the slider and watch the MMF share it takes.',
      });
      const gapMesh = add(gap, box(0.5, 1, 0.5), 'gel', { pos: [1.0, 0, 0], ex: [1.4, 0, 0], opacity: 0.35 });

      const coil = part({
        name: 'Exciting coil',
        role: 'N turns carrying a current I give the magnetomotive force F = NI, which drives flux round the core the way an EMF drives current round a circuit.',
        material: 'Enamelled copper wire',
        look: 'The right-hand grip rule gives the flux direction from the current direction.',
      });
      const CN = 8, CH = 1.0, cs = (CH - 0.015 * (CN - 1)) / CN, coilG = ringRR(0.58, 0.58, 0.18, 0.04, cs);
      for (let i = 0; i < CN; i++) add(coil, coilG, i % 2 ? 'copperDk' : 'copper', { pos: [-1.0, -CH / 2 + cs / 2 + i * (cs + 0.015), 0], ex: [-0.3, 0, 1.6] });

      const bob = part({
        name: 'Bobbin',
        role: 'Insulating former that holds the coil and keeps it off the core.',
        material: 'Moulded plastic or pressboard',
      });
      add(bob, ringRR(0.52, 0.52, 0.025, 0.02, 1.15), 'board', { pos: [-1.0, 0, 0], ex: [-0.3, 0, 1.0] });
      const fl = ringRR(0.52, 0.52, 0.28, 0.02, 0.03);
      add(bob, fl, 'board', { pos: [-1.0, 0.575, 0], ex: [-0.3, 0, 1.0] });
      add(bob, fl, 'board', { pos: [-1.0, -0.575, 0], ex: [-0.3, 0, 1.0] });

      const path = part({
        name: 'Mean magnetic path',
        role: 'The average route of the flux, through the middle of the core. Its length l is the l in S = l / (μ0 μr A): 60 cm here.',
        material: 'A reference line drawn on the core face, not a physical part',
      });
      const dash = cyl(0.018, 0.12, 8);
      [[-1, -0.875, 1, -0.875], [1, -0.875, 1, 0.875], [1, 0.875, -1, 0.875], [-1, 0.875, -1, -0.875]].forEach((sgm) => {
        const len = Math.hypot(sgm[2] - sgm[0], sgm[3] - sgm[1]), n = Math.floor(len / 0.2), horiz = sgm[1] === sgm[3];
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, x = sgm[0] + (sgm[2] - sgm[0]) * u, y = sgm[1] + (sgm[3] - sgm[1]) * u;
          add(path, dash, 'R', { pos: [x, y, 0.262], rot: [0, 0, horiz ? Math.PI / 2 : 0], ex: [0, 0, 0.5] });
        }
      });

      const sup = part({
        name: 'DC supply and leads',
        role: 'Sets the coil current I. Reversing the supply reverses the flux.',
        material: 'Battery or regulated DC supply, copper leads',
      });
      add(sup, box(0.55, 0.32, 0.34), 'dark', { pos: [-2.0, -0.965, 0.55], ex: [-0.8, -0.6, 0.8] });
      add(sup, cyl(0.04, 0.08, 12), 'R', { pos: [-2.12, -0.765, 0.55], ex: [-0.8, -0.6, 0.8] });
      add(sup, cyl(0.04, 0.08, 12), 'dark', { pos: [-1.88, -0.765, 0.55], ex: [-0.8, -0.6, 0.8] });
      add(sup, tube([V(-1.46, 0.42, 0.25), V(-1.8, 0.2, 0.5), V(-2.12, -0.55, 0.55), V(-2.12, -0.73, 0.55)], 0.02), 'copper', { ex: [-0.8, -0.6, 0.8] });
      add(sup, tube([V(-1.46, -0.42, 0.25), V(-1.7, -0.55, 0.5), V(-1.88, -0.73, 0.55)], 0.02), 'copper', { ex: [-0.8, -0.6, 0.8] });

      const base = part({
        name: 'Base and clamps',
        role: 'Holds the core in place. The base and clamps are non-magnetic so they do not offer the flux a second path.',
        material: 'Wooden or laminated board base, brass brackets',
      });
      add(base, box(4.2, 0.08, 1.4), 'board', { pos: [-0.35, -1.165, 0.1], ex: [0, -1.5, 0] });
      [-0.8, 0.8].forEach((x) => [-0.28, 0.28].forEach((z) => add(base, box(0.08, 0.3, 0.05), 'brass', { pos: [x, -0.98, z], ex: [0, -1.5, 0] })));

      function setGap(gv) {
        const h = (WIN - gv) / 2;
        upper.forEach((mm) => { mm.scale.y = h; mm.userData.base.y = WIN / 2 - h / 2; });
        lower.forEach((mm) => { mm.scale.y = h; mm.userData.base.y = -(WIN / 2 - h / 2); });
        gapMesh.visible = gv > 0.0001; gapMesh.scale.y = Math.max(gv, 0.0001);
      }
      setGap(0.1);

      /* Flux view: loops round the core (clockwise from the coil limb), plus fringing loops that bulge at the gap. */
      const loops = [];
      for (const z of [-0.13, 0, 0.13]) for (const d of [-0.14, 0, 0.14]) {
        const hx = 1.0 + d, hy = 0.875 + d;
        loops.push([V(-hx, -hy, z), V(-hx, hy, z), V(hx, hy, z), V(hx, -hy, z)]);
      }
      const fr = [];
      [[0.22, 0.17], [-0.22, -0.17]].forEach((dd) => [-0.1, 0.1].forEach((z) => {
        const hx = 1.0 + dd[0], hy = 0.875 + dd[0];
        fr.push([V(-hx, -hy, z), V(-hx, hy, z), V(hx, hy, z), V(hx, 0.2, z), V(hx + dd[1], 0, z), V(hx, -0.2, z), V(hx, -hy, z)]);
      }));
      [0.22, -0.22].forEach((z) => fr.push([V(-1, -0.875, z), V(-1, 0.875, z), V(1, 0.875, z), V(1, 0.2, z), V(1, 0, z + Math.sign(z) * 0.17), V(1, -0.2, z), V(1, -0.875, z)]));
      const F = makeFlux(loops, 34, 0.2), FF = makeFlux(fr, 34, 0.18);
      m.fluxGroup.add(F.obj, FF.obj);
      let acc = 0, lastT = 0, speed = 1, op = 0.9, fop = 0.5;
      m.fluxUpdate = (t) => {
        const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t; acc += dt * speed;
        F.update(acc); FF.update(acc); F.mat.opacity = op; FF.mat.opacity = fop;
      };
      m.onParams = (v, res) => {
        setGap(v.g > 0 ? 0.03 + v.g * 0.07 : 0);
        const b = Math.min(1.6, res.B || 0);
        speed = 0.15 + 0.9 * b;
        op = 0.15 + 0.8 * Math.min(1, b / 1.4);
        fop = v.g > 0 ? op * Math.min(1, 0.2 + v.g / 2) : 0;
      };
      m.speed = 0;
      m.cutNormals = [[0, 0, -1], [0, -1, 0]];
      m.camDir = [4.4, 2.8, 6.8];
    },
  });
})();
