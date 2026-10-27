/* Two-pole three-phase squirrel-cage induction motor (TEFC). The shaft runs along z. */
Electrica.register({
  id: 'induction-motor',
  short: 'Induction motor',
  name: 'Squirrel-cage induction motor',
  kind: 'Rotating · 3-phase AC',
  sub: 'Two-pole · TEFC · 50 Hz',
  icon: '<circle cx="22" cy="22" r="16"/><text x="22" y="23">M</text><text class="s" x="22" y="32">3~</text>',
  plate: [
    ['Type', '3-phase squirrel cage'], ['Output', '3.7 kW'], ['Voltage', '415 V, delta'],
    ['Frequency', '50 Hz'], ['Speed', '2880 rpm, 2-pole'], ['Enclosure', 'TEFC, IP55'],
  ],
  principle: 'Three-phase currents in the stator make a magnetic field that rotates at synchronous speed. It induces currents in the cage, and the rotor follows a little slower. That difference is the slip.',
  formulas: ['ns = 120 · f / P', 's = (ns − n) / ns', '2-pole, 50 Hz: ns = 3000 rpm'],
  fluxNote: 'The field rotates at synchronous speed and the rotor trails it. Slip is exaggerated to 15% so you can see it.',

  build: function (k, m) {
    const { THREE, V, TAU, part, add, annulus, extrude, polyShape, circlePts, slotPts, cyl, makeFlux, fluxMaterial } = k;

    const fr = part({
      name: 'Frame and cooling fins',
      role: 'Totally enclosed housing. The fins give the fan’s air a large surface to carry heat away.',
      material: 'Cast iron or die-cast aluminium',
      look: 'TEFC: totally enclosed, fan cooled.',
      casing: true,
    });
    const fex = [0, 0, -2.4];
    add(fr, annulus(1.98, 1.78, 3.0, null, null, 64), 'paint', { ex: fex });
    const fin = new THREE.BoxGeometry(0.22, 0.07, 2.8);
    for (let i = 0; i < 32; i++) {
      const a = (i * TAU) / 32, deg = (a * 180) / Math.PI;
      if (Math.abs(deg - 270) < 28 || Math.abs(deg - 90) < 20) continue;
      add(fr, fin, 'paint', { pos: [2.08 * Math.cos(a), 2.08 * Math.sin(a), 0], rot: [0, 0, a], ex: fex });
    }
    const foot = new THREE.BoxGeometry(0.6, 0.55, 2.4);
    add(fr, foot, 'paint', { pos: [-1.15, -1.86, 0], ex: fex });
    add(fr, foot, 'paint', { pos: [1.15, -1.86, 0], ex: fex });

    const sc = part({
      name: 'Stator core',
      role: 'Slotted laminated ring that carries the rotating flux and holds the stator winding.',
      material: 'Silicon-steel laminations',
      look: 'This model has 24 stator slots.',
    });
    const sl = 0.19, gap = (2.0 - 10 * sl) / 9;
    const sg = extrude(polyShape(circlePts(1.78, 96), [slotPts(1.08, 24, 0.24, 0.5, 1)]), sl, 2);
    for (let i = 0; i < 10; i++) add(sc, sg, i % 2 ? 'lamB' : 'lamA', { pos: [0, 0, -1 + sl / 2 + i * (sl + gap)] });

    const sw = part({
      name: 'Stator winding',
      role: 'Three-phase winding in the slots. Fed with three currents 120° apart, it produces a magnetic field that rotates at synchronous speed.',
      material: 'Enamelled copper coils',
      look: 'The colours follow the Indian R-Y-B phase convention.',
    });
    const PH = ['R', 'B', 'Y'], cond = new THREE.BoxGeometry(0.17, 0.11, 2.24);
    for (let i = 0; i < 24; i++) {
      const c = ((i + 0.5) * TAU) / 24;
      add(sw, cond, PH[Math.floor(i / 4) % 3], { pos: [1.2 * Math.cos(c), 1.2 * Math.sin(c), 0], rot: [0, 0, c] });
    }
    [['R', 0], ['B', 1], ['Y', 2]].forEach((pb, lvl) => {
      const start = ((pb[1] * 4 + 2) * TAU) / 24, tg = new THREE.TorusGeometry(1.22 + lvl * 0.07, 0.085, 8, 40, Math.PI);
      [1, -1].forEach((e) => add(sw, tg, pb[0], { pos: [0, 0, e * (1.13 + lvl * 0.12)], rot: [0, 0, start] }));
    });

    const rc = part({
      name: 'Rotor core',
      role: 'Laminated cylinder on the shaft. The air gap to the stator is kept as small as possible, around 0.3 to 0.5 mm in small motors.',
      material: 'Silicon-steel laminations',
      look: 'No wire or brush connects to the rotor.',
    });
    const rg = extrude(polyShape(circlePts(1.03, 96), [circlePts(0.2, 24)]), sl, 2);
    for (let i = 0; i < 10; i++) add(rc, rg, i % 2 ? 'lamB' : 'lamA', { pos: [0, 0, -1 + sl / 2 + i * (sl + gap)], ex: [0, 0, 3.0], rotor: true });

    const cage = part({
      name: 'Squirrel cage',
      role: 'Bars shorted together by end rings. The rotating field induces currents in the bars, and the force on those currents drags the rotor round.',
      material: 'Die-cast aluminium (copper in some high-efficiency motors)',
      look: 'The bars are skewed slightly to reduce noise and cogging.',
    });
    for (let i = 0; i < 28; i++) {
      const a = (i * TAU) / 28, sk = 0.12;
      const line = new THREE.LineCurve3(V(0.99 * Math.cos(a), 0.99 * Math.sin(a), -1.06), V(0.99 * Math.cos(a + sk), 0.99 * Math.sin(a + sk), 1.06));
      add(cage, new THREE.TubeGeometry(line, 1, 0.05, 8), 'alu', { ex: [0, 0, 3.0], rotor: true });
    }
    const ring = annulus(1.045, 0.8, 0.12);
    add(cage, ring, 'alu', { pos: [0, 0, 1.1], ex: [0, 0, 3.0], rotor: true });
    add(cage, ring, 'alu', { pos: [0, 0, -1.1], ex: [0, 0, 3.0], rotor: true });

    const sh = part({
      name: 'Shaft and bearings',
      role: 'Carries the torque to the load. Bearings in the end shields keep the rotor centred.',
      material: 'Steel shaft, ball bearings',
    });
    add(sh, cyl(0.2, 5.4), 'shaft', { pos: [0, 0, 0.4], rot: [Math.PI / 2, 0, 0], ex: [0, 0, 3.0], rotor: true });
    const brg = annulus(0.38, 0.2, 0.2);
    add(sh, brg, 'steel', { pos: [0, 0, 1.6], ex: [0, 0, 3.0], rotor: true });
    add(sh, brg, 'steel', { pos: [0, 0, -1.6], ex: [0, 0, 3.0], rotor: true });

    const es = part({
      name: 'End shields',
      role: 'Bolt to the frame, hold the bearings and keep the air gap even all round.',
      material: 'Cast iron',
      casing: true,
    });
    const shield = extrude(polyShape(circlePts(1.98, 96), [circlePts(0.4, 32)]), 0.14, 2), hub = annulus(0.52, 0.38, 0.4);
    add(es, shield, 'paint', { pos: [0, 0, 1.57], ex: [0, 0, 4.8] });
    add(es, hub, 'paint', { pos: [0, 0, 1.62], ex: [0, 0, 4.8] });
    add(es, shield, 'paint', { pos: [0, 0, -1.57], ex: [0, 0, -3.4] });
    add(es, hub, 'paint', { pos: [0, 0, -1.62], ex: [0, 0, -3.4] });

    const fan = part({
      name: 'Cooling fan and cowl',
      role: 'A fan on the shaft blows air along the fins. The cowl guides the air and guards the blades.',
      material: 'Plastic or aluminium fan, pressed-steel cowl',
      look: 'Straight radial blades cool equally well in either direction of rotation.',
      casing: true,
    });
    add(fan, cyl(0.3, 0.24), 'dark', { pos: [0, 0, -2.0], rot: [Math.PI / 2, 0, 0], ex: [0, 0, -4.0], rotor: true });
    const blade = new THREE.BoxGeometry(1.1, 0.05, 0.3);
    for (let i = 0; i < 9; i++) {
      const a = (i * TAU) / 9;
      add(fan, blade, 'dark', { pos: [0.86 * Math.cos(a), 0.86 * Math.sin(a), -2.0], rot: [0, 0, a], ex: [0, 0, -4.0], rotor: true });
    }
    add(fan, annulus(2.06, 2.0, 0.85, null, null, 64), 'paint', { pos: [0, 0, -2.0], ex: [0, 0, -4.6] });
    const holes = [];
    [[0.6, 12], [1.0, 20], [1.4, 29], [1.78, 37]].forEach((rn) => {
      for (let i = 0; i < rn[1]; i++) { const a = (i / rn[1]) * TAU; holes.push(circlePts(0.085, 12, rn[0] * Math.cos(a), rn[0] * Math.sin(a))); }
    });
    add(fan, extrude(polyShape(circlePts(2.06, 96), holes), 0.05, 2), 'paint', { pos: [0, 0, -2.45], ex: [0, 0, -4.6] });

    const tb = part({
      name: 'Terminal box',
      role: 'Supply connections U1 V1 W1 and U2 V2 W2. Links on the terminal board connect the winding in star or delta.',
      material: 'Cast or pressed steel box with a gasketed lid',
      casing: true,
    });
    add(tb, new THREE.BoxGeometry(0.9, 0.42, 0.9), 'paint', { pos: [0, 2.17, 0.3], ex: [0, 1.3, -2.4] });
    add(tb, new THREE.BoxGeometry(0.98, 0.07, 0.98), 'paint', { pos: [0, 2.415, 0.3], ex: [0, 1.6, -2.4] });
    add(tb, cyl(0.09, 0.26, 16), 'dark', { pos: [0.58, 2.17, 0.3], rot: [0, 0, Math.PI / 2], ex: [0, 1.3, -2.4] });

    /* Flux: a two-pole field across the rotor, returning through the stator back iron. The whole pattern rotates. */
    function loop(d, z) {
      const rIn = 1.32, c = Math.sqrt(rIn * rIn - d * d), pts = [V(-c, d, z), V(c, d, z)];
      const a0 = Math.atan2(d, c), rB = 1.52 + Math.abs(d) * 0.25, a1 = d > 0 ? Math.PI - a0 : -Math.PI - a0;
      for (let i = 0; i <= 20; i++) { const a = a0 + ((a1 - a0) * i) / 20; pts.push(V(rB * Math.cos(a), rB * Math.sin(a), z)); }
      return pts;
    }
    const loops = [];
    for (const z of [-0.6, 0, 0.6]) for (const d of [-0.62, -0.22, 0.22, 0.62]) loops.push(loop(d, z));
    const F = makeFlux(loops, 28, 0.24);
    const am = fluxMaterial(0.5);
    const shaftA = new THREE.Mesh(cyl(0.06, 1.7, 12), am); shaftA.rotation.z = -Math.PI / 2; shaftA.position.x = -0.1; shaftA.renderOrder = 21;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 16), am); head.rotation.z = -Math.PI / 2; head.position.x = 0.92; head.renderOrder = 21;
    m.fluxGroup.add(F.obj, shaftA, head);
    const ws = TAU / 4;
    m.speed = ws * 0.85;
    m.fluxUpdate = (t) => { m.fluxGroup.rotation.z = ws * t + Math.PI / 6; F.update(t * 1.2); };
    m.waves = [
      { label: 'iR', color: 'phR', f: (t) => Math.cos(ws * t) },
      { label: 'iY', color: 'phY', f: (t) => Math.cos(ws * t - TAU / 3) },
      { label: 'iB', color: 'phB', f: (t) => Math.cos(ws * t - (2 * TAU) / 3) },
    ];
    m.cutNormals = [[-1, 0, 0], [0, -1, 0]];
    m.camDir = [7.2, 4.2, 7.8];
  },
});
