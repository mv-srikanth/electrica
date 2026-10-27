/*
  Parallel magnetic circuit on a shell-type core: the coil sits on the centre limb, which has
  an adjustable air gap, and the flux divides equally between the two outer limbs.
  One unit is 8 cm. Outer limbs and yokes are 4 × 4 cm (16 cm²), the centre limb 8 × 4 cm (32 cm²).
  Mean lengths: centre path 14 cm, each outer path 42 cm.
*/
(function () {
  const MU0 = 4 * Math.PI * 1e-7;
  const AS = 16e-4, AC = 32e-4;   // m²: outer limbs, centre limb
  const LC = 0.14, LS = 0.42;      // m: centre path, each outer path
  const MUR = 2000;

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function num(x, unit) {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0 ' + unit;
    const e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -2 && e < 4) return String(Number(x.toPrecision(3))) + ' ' + unit;
    return (x / Math.pow(10, e)).toFixed(2) + ' × 10' + String(e).split('').map((c) => SUP[c]).join('') + ' ' + unit;
  }

  Electrica.register({
    id: 'magnetic-circuit-parallel',
    short: 'Parallel magnetic circuit',
    name: 'Parallel magnetic circuit',
    kind: 'Magnetic circuit · DC',
    sub: 'Shell-type core · Centre-limb coil · Air gap',
    icon: '<rect x="5" y="9" width="34" height="26" rx="1"/><rect x="10" y="14" width="8" height="16"/><rect x="26" y="14" width="8" height="16"/><path d="M16 18h12M16 22h12M16 26h12"/>',
    plate: [
      ['Core', 'Shell type, laminated'], ['Outer limbs', '4 × 4 cm = 16 cm²'], ['Centre limb', '8 × 4 cm = 32 cm²'],
      ['Mean paths', 'centre 14 cm, outer 42 cm'], ['Permeability', 'μr = 2000, assumed'], ['Air gap', 'centre limb, 0 to 3 mm'],
    ],
    plateNote: 'Example values for teaching',
    principle: 'In a parallel magnetic circuit the flux divides between paths, just as current divides at a node. Here the two outer paths are identical, so each carries half the centre-limb flux. Their reluctances combine in parallel, and that pair is in series with the centre limb and its air gap.',
    formulas: [
      'Φc = Φ1 + Φ2',
      'S_eq = Sc + S1 · S2 / (S1 + S2)',
      'Here S1 = S2, so S_eq = Sc + S1 / 2',
      'Φc = N · I / S_eq',
    ],
    fluxNote: 'Flux rises through the centre limb, crosses the gap and splits equally into the two outer limbs before returning through the yokes. The centre limb is twice as wide, so the flux density is the same everywhere.',
    calcTitle: 'Try it: turns, current and gap',
    params: [
      { id: 'N', label: 'Turns N', min: 100, max: 1000, step: 50, value: 500 },
      { id: 'I', label: 'Current I', min: 0.2, max: 4, step: 0.1, value: 2, unit: 'A', format: (v) => v.toFixed(1) },
      { id: 'g', label: 'Air gap lg (centre limb)', min: 0, max: 3, step: 0.1, value: 1, unit: 'mm', format: (v) => v.toFixed(1) },
    ],
    diagram: '<svg viewBox="0 0 300 160" role="img" aria-label="Equivalent electrical circuit: the MMF source drives flux through the centre reluctance, which then splits into two outer reluctances in parallel">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M30 30H60M120 30H250V55M250 95V125H30V84M30 70V30M150 30V55M150 95V125"/>' +
      '<rect x="60" y="22" width="60" height="16"/><rect x="142" y="55" width="16" height="40"/><rect x="242" y="55" width="16" height="40"/>' +
      '<path d="M18 70H42" stroke-width="2.4"/><path d="M23 84H37" stroke-width="4.5"/></g>' +
      '<circle cx="150" cy="30" r="3" fill="currentColor"/><circle cx="150" cy="125" r="3" fill="currentColor"/>' +
      '<g fill="none" style="stroke:var(--flux)" stroke-width="2"><path d="M124 30H144M138 25l7 5-7 5"/><path d="M150 99V119M145 113l5 7 5-7"/><path d="M250 99V119M245 113l5 7 5-7"/></g>' +
      '<text x="90" y="15" text-anchor="middle">Sc</text><text x="90" y="52" text-anchor="middle">iron + gap</text><text x="44" y="81">F = NI</text>' +
      '<text x="164" y="79">S1</text><text x="264" y="79">S2</text>' +
      '<text x="134" y="20" text-anchor="middle" style="fill:var(--flux)">Φc</text><text x="164" y="114" style="fill:var(--flux)">Φ1</text><text x="264" y="114" style="fill:var(--flux)">Φ2</text>' +
      '<text x="150" y="150" text-anchor="middle">Φc = Φ1 + Φ2</text></svg>',
    calc: function (v) {
      const lg = v.g / 1000, F = v.N * v.I;
      const Sci = LC / (MU0 * MUR * AC), Sg = lg / (MU0 * AC), Sc = Sci + Sg, S1 = LS / (MU0 * MUR * AS);
      const Seq = Sc + S1 / 2, phiC = F / Seq, phi1 = phiC / 2;
      const Bc = phiC / AC, B1 = phi1 / AS, Fg = phiC * Sg;
      const rows = [
        ['MMF  F = NI', num(F, 'AT')],
        ['Sc  centre iron', num(Sci, 'AT/Wb')],
        ['Sc  air gap', lg > 0 ? num(Sg, 'AT/Wb') : 'no gap'],
        ['S1 = S2  each outer path', num(S1, 'AT/Wb')],
        ['S_eq = Sc + S1/2', num(Seq, 'AT/Wb')],
        ['Φc  centre limb', num(phiC * 1000, 'mWb')],
        ['Φ1 = Φ2  each outer limb', num(phi1 * 1000, 'mWb')],
        ['B centre / B outer', num(Bc, 'T') + ' / ' + num(B1, 'T')],
        ['MMF used by the gap', Math.round((100 * Fg) / F) + ' %'],
        ['Inductance  L = N²/S_eq', num((v.N * v.N) / Seq, 'H')],
      ];
      const note = Bc > 1.5
        ? 'B is above about 1.5 T. Real silicon steel starts to saturate here, μr falls, and the true flux would be lower than this linear result.'
        : 'Fringing is neglected and μr is taken as constant. The gap sits under the coil and is drawn wider than to scale; Cutaway shows it.';
      return { rows: rows, note: note, B: Bc };
    },

    build: function (k, m) {
      const { THREE, V, part, add, ringRR, cyl, makeFlux } = k;
      const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
      const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8);
      const D = 0.5, NS = 5, sd = 0.088, sg = (D - NS * sd) / (NS - 1);
      const zs = []; for (let i = 0; i < NS; i++) zs.push(-D / 2 + sd / 2 + i * (sd + sg));
      const WIN = 1.25;

      const centre = part({
        name: 'Centre limb',
        role: 'Carries the whole flux Φc. It is twice as wide as each outer limb because it carries twice the flux.',
        material: 'Silicon-steel laminations',
        look: 'The air gap is cut in this limb, under the coil.',
      });
      const unit = box(1.0, 1, sd), upper = [], lower = [];
      zs.forEach((z, i) => {
        const mk = i % 2 ? 'lamB' : 'lamA';
        upper.push(add(centre, unit, mk, { pos: [0, 0.3, z], ex: [0, 0.3, 0] }));
        lower.push(add(centre, unit, mk, { pos: [0, -0.3, z], ex: [0, -0.3, 0] }));
      });

      const outer = part({
        name: 'Outer limbs and yokes',
        role: 'The two return paths. Each outer limb carries half the flux, Φ1 = Φ2 = Φc / 2, and the yokes join them to the centre limb.',
        material: 'Silicon-steel laminations',
        look: 'Because the two paths are identical, their reluctances are equal and the flux splits evenly.',
      });
      const yokeG = box(4.0, 0.5, sd), sideG = box(0.5, WIN, sd);
      zs.forEach((z, i) => {
        const mk = i % 2 ? 'lamB' : 'lamA';
        add(outer, yokeG, mk, { pos: [0, 0.875, z], ex: [0, 1.0, 0] });
        add(outer, yokeG, mk, { pos: [0, -0.875, z], ex: [0, -1.0, 0] });
        add(outer, sideG, mk, { pos: [-1.75, 0, z], ex: [-1.0, 0, 0] });
        add(outer, sideG, mk, { pos: [1.75, 0, z], ex: [1.0, 0, 0] });
      });

      const gap = part({
        name: 'Air gap',
        role: 'A gap in the centre limb. Every line of flux has to cross it, so its reluctance sits in series with both outer paths. It usually dominates the total.',
        material: 'Air (shown in blue)',
        look: 'Placing the gap under the coil keeps the fringing flux close to the core.',
      });
      const gapMesh = add(gap, box(1.0, 1, 0.5), 'gel', { pos: [0, 0, 0], ex: [0, 0, -1.3], opacity: 0.35 });

      const coil = part({
        name: 'Exciting coil',
        role: 'Wound on the centre limb. Its MMF F = NI drives flux up the centre limb and back down both outer limbs.',
        material: 'Enamelled copper wire',
      });
      const CN = 8, CH = 1.0, cs = (CH - 0.015 * (CN - 1)) / CN, coilG = ringRR(1.08, 0.58, 0.16, 0.04, cs);
      for (let i = 0; i < CN; i++) add(coil, coilG, i % 2 ? 'copperDk' : 'copper', { pos: [0, -CH / 2 + cs / 2 + i * (cs + 0.015), 0], ex: [0, 0, 1.9] });

      const bob = part({
        name: 'Bobbin',
        role: 'Insulating former that holds the coil on the centre limb.',
        material: 'Moulded plastic or pressboard',
      });
      add(bob, ringRR(1.02, 0.52, 0.025, 0.02, 1.15), 'board', { ex: [0, 0, 1.2] });
      const fl = ringRR(1.02, 0.52, 0.26, 0.02, 0.03);
      add(bob, fl, 'board', { pos: [0, 0.575, 0], ex: [0, 0, 1.2] });
      add(bob, fl, 'board', { pos: [0, -0.575, 0], ex: [0, 0, 1.2] });

      const path = part({
        name: 'Mean magnetic paths',
        role: 'The average routes of the flux: 14 cm up the centre limb, and 42 cm round each outer path. These are the lengths used for the reluctances.',
        material: 'Reference lines drawn on the core face, not physical parts',
      });
      const dash = cyl(0.018, 0.12, 8);
      [[0, -0.875, 0, 0.875], [0, 0.875, -1.75, 0.875], [-1.75, 0.875, -1.75, -0.875], [-1.75, -0.875, 0, -0.875],
        [0, 0.875, 1.75, 0.875], [1.75, 0.875, 1.75, -0.875], [1.75, -0.875, 0, -0.875]].forEach((sgm) => {
        const len = Math.hypot(sgm[2] - sgm[0], sgm[3] - sgm[1]), n = Math.floor(len / 0.2), horiz = sgm[1] === sgm[3];
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, x = sgm[0] + (sgm[2] - sgm[0]) * u, y = sgm[1] + (sgm[3] - sgm[1]) * u;
          add(path, dash, 'R', { pos: [x, y, 0.262], rot: [0, 0, horiz ? Math.PI / 2 : 0], ex: [0, 0, 0.5] });
        }
      });

      const sup = part({
        name: 'DC supply and leads',
        role: 'Sets the coil current I.',
        material: 'Battery or regulated DC supply, copper leads',
      });
      const sx = 2.6, sex = [0.8, -0.6, 0.8];
      add(sup, box(0.55, 0.32, 0.34), 'dark', { pos: [sx, -0.965, 0.75], ex: sex });
      add(sup, cyl(0.04, 0.08, 12), 'R', { pos: [sx - 0.12, -0.765, 0.75], ex: sex });
      add(sup, cyl(0.04, 0.08, 12), 'dark', { pos: [sx + 0.12, -0.765, 0.75], ex: sex });
      add(sup, tube([V(0.7, 0.42, 0.3), V(1.2, 0.3, 0.62), V(2.1, -0.2, 0.75), V(sx - 0.12, -0.73, 0.75)], 0.02), 'copper', { ex: sex });
      add(sup, tube([V(0.7, -0.42, 0.3), V(1.3, -0.6, 0.7), V(sx + 0.12, -0.73, 0.75)], 0.02), 'copper', { ex: sex });

      const base = part({
        name: 'Base and clamps',
        role: 'Holds the core in place. Non-magnetic, so it offers the flux no extra path.',
        material: 'Wooden or laminated board base, brass brackets',
      });
      add(base, box(5.6, 0.08, 1.6), 'board', { pos: [0.45, -1.165, 0.2], ex: [0, -1.6, 0] });
      [-1.2, 1.2].forEach((x) => [-0.28, 0.28].forEach((z) => add(base, box(0.08, 0.3, 0.05), 'brass', { pos: [x, -0.98, z], ex: [0, -1.6, 0] })));

      function setGap(gv) {
        const h = (WIN - gv) / 2;
        upper.forEach((mm) => { mm.scale.y = h; mm.userData.base.y = WIN / 2 - h / 2; });
        lower.forEach((mm) => { mm.scale.y = h; mm.userData.base.y = -(WIN / 2 - h / 2); });
        gapMesh.visible = gv > 0.0001; gapMesh.scale.y = Math.max(gv, 0.0001);
      }
      setGap(0.1);

      /* Flux view: up the centre limb, then left or right round each outer path. */
      const loops = [];
      for (const s of [1, -1]) for (const z of [-0.13, 0, 0.13]) for (const e of [0.12, 0.3]) {
        const xc = s * e, xo = s * (1.75 + (0.3 - e) * 0.6), y = 0.875 - (0.3 - e) * 0.4;
        loops.push([V(xc, -y, z), V(xc, y, z), V(xo, y, z), V(xo, -y, z)]);
      }
      const fr = [];
      for (const s of [1, -1]) for (const z of [-0.1, 0.1]) {
        const xc = s * 0.44;
        fr.push([V(xc, -0.9, z), V(xc, -0.2, z), V(s * 0.58, 0, z), V(xc, 0.2, z), V(xc, 0.9, z), V(s * 1.8, 0.9, z), V(s * 1.8, -0.9, z)]);
      }
      const F = makeFlux(loops, 30, 0.2), FF = makeFlux(fr, 30, 0.18);
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
      m.camDir = [4.6, 3.0, 7.4];
    },
  });
})();
