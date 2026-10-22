/* Four-pole three-phase salient-pole alternator (synchronous generator). The shaft runs along z. */
Electrica.register({
  id: 'alternator',
  short: 'Alternator',
  name: 'Salient-pole alternator',
  kind: 'Rotating · 3-phase AC',
  sub: 'Four-pole · Synchronous · 50 Hz',
  icon: '<circle cx="22" cy="22" r="16"/><text x="22" y="23">G</text><text class="s" x="22" y="32">3~</text>',
  plate: [
    ['Type', '3-phase, salient pole'], ['Rating', '50 kVA, 0.8 pf'], ['Voltage', '415 V'],
    ['Frequency', '50 Hz'], ['Speed', '1500 rpm, 4-pole'], ['Excitation', 'DC via slip rings'],
  ],
  principle: 'The rotor’s DC field turns past the stationary coils. The changing flux induces an alternating EMF in each phase, as Faraday’s law says, and the three phases are 120° apart.',
  formulas: ['f = P · n / 120', 'E = 4.44 · f · N · Φ · Kw'],
  fluxNote: 'The field turns with the rotor and sweeps the stator coils. Each phase voltage peaks as a pole passes it.',

  build: function (k, m) {
    const { THREE, TAU, pol, part, add, annulus, ringRR, extrude, polyShape, circlePts, slotPts, cyl, makeFlux } = k;

    const fr = part({
      name: 'Stator frame',
      role: 'Holds the stator core and passes the torque reaction to the foundation.',
      material: 'Fabricated or cast steel',
      casing: true,
    });
    const fex = [0, 0, -2.8];
    add(fr, annulus(2.0, 1.82, 2.5, null, null, 64), 'paint', { ex: fex });
    const foot = new THREE.BoxGeometry(0.6, 0.55, 2.2);
    add(fr, foot, 'paint', { pos: [-1.2, -1.85, 0], ex: fex });
    add(fr, foot, 'paint', { pos: [1.2, -1.85, 0], ex: fex });
    const rib = new THREE.BoxGeometry(0.16, 0.12, 2.5);
    [30, 70, 110, 150, 200, 340].forEach((dg) => {
      const a = (dg * Math.PI) / 180;
      add(fr, rib, 'paint', { pos: [2.06 * Math.cos(a), 2.06 * Math.sin(a), 0], rot: [0, 0, a], ex: fex });
    });

    const sc = part({
      name: 'Stator core',
      role: 'Laminated slotted ring. The rotor’s field sweeps through it, so it is laminated to keep iron loss low.',
      material: 'Silicon-steel laminations',
      look: 'This model has 36 stator slots.',
    });
    const sl = 0.16, gap = (1.7 - 10 * sl) / 9;
    const sg = extrude(polyShape(circlePts(1.82, 96), [slotPts(1.25, 36, 0.2, 0.5, 1)]), sl, 2);
    for (let i = 0; i < 10; i++) add(sc, sg, i % 2 ? 'lamB' : 'lamA', { pos: [0, 0, -0.85 + sl / 2 + i * (sl + gap)] });

    const sw = part({
      name: 'Armature (stator) winding',
      role: 'The three-phase winding where the EMF is induced. Coils 120 electrical degrees apart give three output voltages.',
      material: 'Copper coils in the stator slots',
      look: 'Unlike a DC machine, the armature here stays still and the field turns.',
    });
    const PH = ['R', 'B', 'Y'], cond = new THREE.BoxGeometry(0.15, 0.085, 1.9);
    for (let i = 0; i < 36; i++) {
      const c = ((i + 0.5) * TAU) / 36;
      add(sw, cond, PH[Math.floor(i / 3) % 3], { pos: [1.35 * Math.cos(c), 1.35 * Math.sin(c), 0], rot: [0, 0, c] });
    }
    for (let b = 0; b < 12; b++) {
      const lvl = b % 3, start = ((b * 3 + 1.5) * TAU) / 36, tg = new THREE.TorusGeometry(1.42 + lvl * 0.06, 0.05, 6, 20, Math.PI / 2);
      [1, -1].forEach((e) => add(sw, tg, PH[lvl], { pos: [0, 0, e * (0.92 + lvl * 0.09)], rot: [0, 0, start] }));
    }

    const rp = part({
      name: 'Rotor poles',
      role: 'Salient poles on the rotor hub, alternately north and south. This build is common in slow-speed generators such as hydro sets.',
      material: 'Laminated steel pole shoes on a steel hub',
      look: 'Four poles: at 1500 rpm this machine gives 50 Hz.',
    });
    const fc = part({
      name: 'Field winding',
      role: 'Carries DC from the exciter to magnetise the poles. Changing the field current changes the output voltage.',
      material: 'Copper strip or wire coils',
    });
    add(rp, extrude(polyShape(circlePts(0.52, 48), [circlePts(0.2, 24)]), 1.8, 2), 'steel', { ex: [0, 0, 3.0], rotor: true });
    const pbody = new THREE.BoxGeometry(0.46, 0.5, 1.8), coilS = ringRR(0.54, 1.84, 0.13, 0.04, 0.1);
    for (let i = 0; i < 4; i++) {
      const th = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(th), s = Math.sin(th);
      add(rp, pbody, 'steel', { pos: [0.73 * c, 0.73 * s, 0], rot: [0, 0, th], ex: [0, 0, 3.0], rotor: true });
      add(rp, annulus(1.2, 0.95, 1.8, th - 0.56, th + 0.56, 20), 'lamA', { ex: [0, 0, 3.0], rotor: true });
      for (let j = 0; j < 3; j++) {
        const r = 0.6 + j * 0.115;
        add(fc, coilS, 'copper', { pos: [r * c, r * s, 0], rot: [0, 0, th - Math.PI / 2], ex: [0.8 * c, 0.8 * s, 3.0], rotor: true });
      }
    }

    const sr = part({
      name: 'Slip rings and brushes',
      role: 'Feed the DC field current into the spinning rotor. Unlike a commutator, they do not reverse anything.',
      material: 'Brass or steel rings on an insulating sleeve, carbon brushes',
    });
    add(sr, annulus(0.3, 0.2, 0.55), 'mica', { pos: [0, 0, 1.67], ex: [0, 0, 4.0], rotor: true });
    const ringG = annulus(0.4, 0.3, 0.12);
    [1.52, 1.8].forEach((z) => {
      add(sr, ringG, 'brass', { pos: [0, 0, z], ex: [0, 0, 4.0], rotor: true });
      add(sr, new THREE.BoxGeometry(0.1, 0.2, 0.1), 'carbon', { pos: [0, 0.5, z], ex: [0, 0.9, 4.0] });
      add(sr, new THREE.BoxGeometry(0.16, 0.16, 0.16), 'brass', { pos: [0, 0.68, z], ex: [0, 0.9, 4.0] });
    });

    const sh = part({
      name: 'Shaft and bearings',
      role: 'Coupled to the prime mover, such as a turbine or a diesel engine. Bearings in the end shields carry the rotor.',
      material: 'Steel shaft, rolling-element bearings',
    });
    add(sh, cyl(0.2, 5.0), 'shaft', { pos: [0, 0, 0.2], rot: [Math.PI / 2, 0, 0], ex: [0, 0, 3.0], rotor: true });
    const brg = annulus(0.36, 0.2, 0.18);
    add(sh, brg, 'steel', { pos: [0, 0, 1.32], ex: [0, 0, 3.0], rotor: true });
    add(sh, brg, 'steel', { pos: [0, 0, -1.32], ex: [0, 0, 3.0], rotor: true });

    const es = part({
      name: 'End shields',
      role: 'Close the machine, hold the bearings and keep the rotor centred in the bore.',
      material: 'Cast iron',
      casing: true,
    });
    const vents = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i * TAU) / 6 + 0.3; return circlePts(0.16, 16, 1.55 * Math.cos(a), 1.55 * Math.sin(a)); });
    const shield = extrude(polyShape(circlePts(2.0, 96), [circlePts(0.4, 32)].concat(vents)), 0.14, 2), hub = annulus(0.5, 0.36, 0.3);
    add(es, shield, 'paint', { pos: [0, 0, 1.32], ex: [0, 0, 5.0] });
    add(es, hub, 'paint', { pos: [0, 0, 1.36], ex: [0, 0, 5.0] });
    add(es, shield, 'paint', { pos: [0, 0, -1.32], ex: [0, 0, -3.8] });
    add(es, hub, 'paint', { pos: [0, 0, -1.36], ex: [0, 0, -3.8] });

    /* Flux: out of each N pole, across the gap, round the stator back iron and into the neighbouring S poles.
       The particles sit in the rotor group, so the pattern turns with the rotor. */
    function loop(th, side, del, z) {
      const a = th + side * del, b = th + side * (Math.PI / 2 - del), pts = [], n = 12;
      [0.45, 0.8, 1.15, 1.42].forEach((r) => pts.push(pol(r, a, z)));
      for (let i = 0; i <= n; i++) pts.push(pol(1.62, a + ((b - a) * i) / n, z));
      [1.42, 1.15, 0.8, 0.45].forEach((r) => pts.push(pol(r, b, z)));
      for (let i = 1; i < n; i++) pts.push(pol(0.45, b + ((a - b) * i) / n, z));
      return pts;
    }
    const loops = [];
    for (const z of [-0.55, 0, 0.55]) for (const p of [0, 2]) for (const side of [1, -1]) for (const del of [0.12, 0.3]) loops.push(loop(Math.PI / 4 + (p * Math.PI) / 2, side, del, z));
    const F = makeFlux(loops, 22, 0.22);
    m.fluxGroup.add(F.obj);
    m.rotor.add(m.fluxGroup);
    const wr = TAU / 5;
    m.speed = wr;
    m.fluxUpdate = (t) => F.update(t);
    m.waves = [
      { label: 'eR', color: 'phR', f: (t) => Math.sin(2 * wr * t) },
      { label: 'eY', color: 'phY', f: (t) => Math.sin(2 * wr * t - TAU / 3) },
      { label: 'eB', color: 'phB', f: (t) => Math.sin(2 * wr * t - (2 * TAU) / 3) },
    ];
    m.cutNormals = [[-1, 0, 0], [0, -1, 0]];
    m.camDir = [7.0, 4.0, 7.4];
  },
});
