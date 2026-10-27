/* Two-pole DC shunt motor. The shaft runs along z; N pole at the top, S pole at the bottom. */
Electrica.register({
  id: 'dc-motor',
  short: 'DC motor',
  name: 'DC shunt motor',
  kind: 'Rotating · DC',
  sub: 'Two-pole · Brushed · Commutator',
  icon: '<circle cx="22" cy="22" r="16"/><text x="22" y="25">M</text><path d="M16.5 30.5h11M16.5 33.5h11"/>',
  plate: [
    ['Type', 'DC shunt motor'], ['Output', '1.5 kW'], ['Voltage', '220 V DC'],
    ['Speed', '1500 rpm'], ['Duty', 'S1 continuous'], ['Insulation', 'Class F'],
  ],
  principle: 'The armature conductors carry current inside the field of the poles, so each one feels a force. The commutator flips the current in each coil as it passes the neutral axis, which keeps the torque in one direction.',
  formulas: ['F = B · I · L', 'T = k · Φ · Ia', 'Eb = V − Ia · Ra'],
  fluxNote: 'A steady field runs from the north pole to the south pole through the armature and returns through the yoke.',

  build: function (k, m) {
    const { THREE, V, TAU, part, add, annulus, ringRR, extrude, polyShape, circlePts, slotPts, cyl, makeFlux } = k;

    const yoke = part({
      name: 'Yoke',
      role: 'The outer frame. It carries the flux from one pole round to the other and protects the parts inside.',
      material: 'Cast or rolled steel',
      look: 'In Flux view, watch the field return through the yoke on both sides.',
    });
    add(yoke, annulus(1.9, 1.62, 2.4), 'paint');
    const foot = new THREE.BoxGeometry(0.55, 0.5, 2.0);
    add(yoke, foot, 'paint', { pos: [-1.05, -1.78, 0] });
    add(yoke, foot, 'paint', { pos: [1.05, -1.78, 0] });

    const poles = part({
      name: 'Field poles',
      role: 'Hold the field coils. The curved pole shoes spread the flux evenly across the air gap.',
      material: 'Laminated steel, bolted to the yoke',
      look: 'North pole at the top, south pole at the bottom.',
    });
    const fw = part({
      name: 'Field winding',
      role: 'Carries the field current that magnetises the poles.',
      material: 'Enamelled copper: many turns of fine wire in a shunt motor',
      look: 'Reversing the field current reverses the direction of rotation.',
    });
    const body = new THREE.BoxGeometry(0.62, 0.42, 2.0), coilS = ringRR(0.66, 2.04, 0.18, 0.05, 0.055);
    [1, -1].forEach((s) => {
      const a = (s * Math.PI) / 2;
      add(poles, body, 'steel', { pos: [0, s * 1.43, 0], ex: [0, s * 2.0, 0] });
      add(poles, annulus(1.24, 1.06, 2.0, a - 0.87, a + 0.87, 24), 'lamA', { ex: [0, s * 2.0, 0] });
      for (let i = 0; i < 4; i++) add(fw, coilS, 'copper', { pos: [0, s * (1.2925 + i * 0.062), 0], ex: [0, s * 2.8, 0] });
    });

    const ac = part({
      name: 'Armature core',
      role: 'The rotating laminated cylinder. Its slots hold the armature conductors close to the air gap.',
      material: 'Silicon-steel laminations keyed to the shaft',
      look: 'Laminations limit eddy-current loss as the core turns in the field.',
    });
    const sl = 0.19, gap = (2.0 - 10 * sl) / 9;
    const armGeo = extrude(polyShape(slotPts(0.98, 16, 0.17, 0.42, -1), [circlePts(0.185, 24)]), sl, 2);
    for (let i = 0; i < 10; i++) add(ac, armGeo, i % 2 ? 'lamB' : 'lamA', { pos: [0, 0, -1 + sl / 2 + i * (sl + gap)], ex: [0, 0, 3.0], rotor: true });

    const aw = part({
      name: 'Armature winding',
      role: 'Conductors in the slots carry the armature current. Each feels a force F = BIL, and together they turn the rotor.',
      material: 'Copper conductors, joined at the ends and connected to the commutator',
      look: 'The rings at each end are the overhang of the coils.',
    });
    const cond = new THREE.BoxGeometry(0.15, 0.1, 2.24), riser = new THREE.BoxGeometry(0.36, 0.04, 0.05), ew = new THREE.TorusGeometry(0.82, 0.11, 10, 48);
    for (let i = 0; i < 16; i++) {
      const c = ((i + 0.5) * TAU) / 16;
      add(aw, cond, 'copper', { pos: [0.89 * Math.cos(c), 0.89 * Math.sin(c), 0], rot: [0, 0, c], ex: [0, 0, 3.0], rotor: true });
      add(aw, riser, 'copper', { pos: [0.64 * Math.cos(c), 0.64 * Math.sin(c), 1.5], rot: [0, 0, c], ex: [0, 0, 3.0], rotor: true });
    }
    add(aw, ew, 'copperDk', { pos: [0, 0, 1.13], ex: [0, 0, 3.0], rotor: true });
    add(aw, ew, 'copperDk', { pos: [0, 0, -1.13], ex: [0, 0, 3.0], rotor: true });

    const com = part({
      name: 'Commutator',
      role: 'Copper segments insulated by mica. As the rotor turns it reverses the current in each coil, so the torque always acts in the same direction.',
      material: 'Hard-drawn copper segments with mica insulation',
      look: 'In Flux view, the scope shows one coil’s current flipping every half turn.',
    });
    const sw = TAU / 16, segGeo = annulus(0.46, 0.25, 0.5, sw * 0.07, sw * 0.93, 6);
    for (let i = 0; i < 16; i++) add(com, segGeo, 'copper', { pos: [0, 0, 1.8], rot: [0, 0, i * sw], ex: [0, 0, 4.2], rotor: true });
    add(com, annulus(0.445, 0.2, 0.5), 'mica', { pos: [0, 0, 1.8], ex: [0, 0, 4.2], rotor: true });

    const br = part({
      name: 'Brushes',
      role: 'Carbon blocks pressed onto the commutator by springs. They feed current from the supply into the turning armature.',
      material: 'Carbon-graphite in brass holders',
      look: 'The brushes sit on the neutral axis, midway between the poles.',
    });
    const carbon = new THREE.BoxGeometry(0.24, 0.15, 0.2), holder = new THREE.BoxGeometry(0.2, 0.22, 0.26);
    [1, -1].forEach((s) => {
      const ex = [s * 0.9, 0, 4.2];
      add(br, carbon, 'carbon', { pos: [s * 0.58, 0, 1.8], ex: ex });
      add(br, holder, 'brass', { pos: [s * 0.8, 0, 1.8], ex: ex });
      add(br, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * 0.9, 0, 1.8), V(s * 1.25, 0.25, 1.75), V(s * 1.55, 0.6, 1.6)]), 16, 0.025, 6), 'copper', { ex: ex });
    });

    const sh = part({
      name: 'Shaft and bearings',
      role: 'The shaft carries the torque to the load; ball bearings at each end let it turn freely.',
      material: 'Steel shaft, deep-groove ball bearings',
    });
    add(sh, cyl(0.18, 5.0), 'shaft', { pos: [0, 0, 0.2], rot: [Math.PI / 2, 0, 0], ex: [0, 0, 3.0], rotor: true });
    const brg = annulus(0.34, 0.18, 0.16);
    add(sh, brg, 'steel', { pos: [0, 0, -1.36], ex: [0, 0, 3.0], rotor: true });
    add(sh, brg, 'steel', { pos: [0, 0, 2.3], ex: [0, 0, 3.0], rotor: true });

    const ec = part({
      name: 'End covers',
      role: 'Close the ends of the motor, hold the bearings and keep the armature centred between the poles.',
      material: 'Cast iron or pressed steel',
      look: 'Windows in the front cover give access to the brushes.',
      casing: true,
    });
    const vents = [0, 1, 2, 3].map((i) => circlePts(0.22, 20, 1.15 * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), 1.15 * Math.sin(Math.PI / 4 + (i * Math.PI) / 2)));
    const disc = extrude(polyShape(circlePts(1.9, 72), [circlePts(0.36, 24)].concat(vents)), 0.12, 2), hub = annulus(0.44, 0.34, 0.3);
    add(ec, disc, 'paint', { pos: [0, 0, -1.27], ex: [0, 0, -2.2] });
    add(ec, hub, 'paint', { pos: [0, 0, -1.36], ex: [0, 0, -2.2] });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 12;
      add(ec, annulus(1.9, 1.78, 1.0, a, a + Math.PI / 3, 16), 'paint', { pos: [0, 0, 1.7], ex: [0, 0, 5.0] });
    }
    add(ec, disc, 'paint', { pos: [0, 0, 2.26], ex: [0, 0, 5.0] });
    add(ec, hub, 'paint', { pos: [0, 0, 2.3], ex: [0, 0, 5.0] });

    /* Flux: N pole down through the armature to S, back up through the yoke on each side. */
    function loop(s, d, z) {
      const pts = [V(s * d * 0.55, 1.5, z), V(s * d, 1.12, z), V(s * d, -1.12, z), V(s * d * 0.55, -1.5, z)];
      const r = 1.76, a0 = -Math.PI / 2 + s * 0.2, a1 = Math.PI / 2 - s * 0.2, end = s > 0 ? a1 : a1 - TAU;
      for (let i = 0; i <= 24; i++) { const a = a0 + ((end - a0) * i) / 24; pts.push(V(r * Math.cos(a), r * Math.sin(a), z)); }
      return pts;
    }
    const loops = [];
    for (const z of [-0.6, 0, 0.6]) for (const s of [1, -1]) for (const d of [0.16, 0.48]) loops.push(loop(s, d, z));
    const F = makeFlux(loops, 26, 0.24);
    m.fluxGroup.add(F.obj);
    const speed = TAU / 3;
    m.speed = speed;
    m.fluxUpdate = (t) => F.update(t * 1.1);
    m.waves = [
      { label: 'Supply current (DC)', color: 'copper', f: () => 0.7 },
      { label: 'Current in one armature coil', color: 'flux', f: (t) => 0.7 * Math.tanh(5 * Math.cos(speed * t)) },
    ];
    m.cutNormals = [[-1, 0, 0], [0, -1, 0]];
    m.camDir = [6.6, 3.8, 7.2];
  },
});
