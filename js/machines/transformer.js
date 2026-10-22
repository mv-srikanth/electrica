/* Single-phase core-type transformer. Units are arbitrary; the core is 3.2 wide. */
Electrica.register({
  id: 'transformer',
  short: 'Transformer',
  name: 'Single-phase transformer',
  kind: 'Static · AC',
  sub: 'Core type · Single phase · 50 Hz',
  icon: '<circle cx="16" cy="22" r="10"/><circle cx="28" cy="22" r="10"/>',
  plate: [
    ['Type', '1-phase, core type'], ['Rating', '2 kVA'], ['Voltage', '230 / 115 V'],
    ['Frequency', '50 Hz'], ['Cooling', 'AN (air natural)'], ['Insulation', 'Class F'],
  ],
  principle: 'An alternating current in the primary sets up an alternating flux in the core. The same flux links the secondary and induces a voltage there. This is mutual induction.',
  formulas: ['Vs / Vp = Ns / Np', 'E = 4.44 · f · N · Φm'],
  fluxNote: 'The flux reverses with the supply. Shown slowed down: at 50 Hz it reverses 100 times a second.',

  build: function (k, m) {
    const { THREE, V, part, add, extrude, frameShape, ringRR, cyl, makeFlux } = k;

    const core = part({
      name: 'Laminated core',
      role: 'Gives the magnetic flux a low-reluctance steel path that links both windings. It is built from thin sheets, each insulated from the next, so eddy currents and core loss stay small.',
      material: 'Cold-rolled grain-oriented (CRGO) silicon steel, 0.23 to 0.35 mm per sheet',
      look: 'Drag Separation to fan the sheets apart.',
    });
    const t = 0.088, g = 0.0125;
    const lam = extrude(frameShape(3.2, 3.0, 0.04, 2.0, 1.8, 0.02), t, 4);
    for (let i = 0; i < 10; i++) {
      add(core, lam, i % 2 ? 'lamB' : 'lamA', { pos: [0, 0, -0.5 + t / 2 + i * (t + g)], ex: [0, 0, (i - 4.5) * 0.13] });
    }

    const pri = part({
      name: 'Primary winding',
      role: 'Connected to the supply. Its alternating current magnetises the core and sets up the alternating flux.',
      material: 'Enamelled copper wire: more turns of thinner wire on the high-voltage side',
      look: 'This model has twice as many turns as the secondary, a 2 : 1 ratio.',
    });
    const sec = part({
      name: 'Secondary winding',
      role: 'Links the same changing flux, so a voltage is induced in it. This winding feeds the load.',
      material: 'Enamelled copper, a thicker conductor because it carries the larger current',
      look: 'Half the turns, so half the voltage: 230 V in, 115 V out.',
    });
    function coil(p, x, n, h, mk, ex) {
      const gap = 0.018, sh = (h - gap * (n - 1)) / n, geo = ringRR(0.74, 1.14, 0.24, 0.06, sh);
      for (let i = 0; i < n; i++) add(p, geo, mk, { pos: [x, -h / 2 + sh / 2 + i * (sh + gap), 0], ex: ex });
    }
    coil(pri, -1.3, 14, 1.5, 'copper', [-0.2, 0, 3.3]);
    coil(sec, 1.3, 7, 1.5, 'copperDk', [0.2, 0, 3.3]);

    const bob = part({
      name: 'Bobbins and insulation',
      role: 'Hold each winding in shape and insulate it from the earthed core.',
      material: 'Pressboard and aramid (Nomex) paper, varnish-impregnated',
      look: 'Insulation class F allows a hot-spot temperature of 155 °C.',
    });
    const tube = ringRR(0.62, 1.02, 0.05, 0.03, 1.7), flange = ringRR(0.62, 1.02, 0.35, 0.03, 0.04);
    [-1.3, 1.3].forEach((x) => {
      add(bob, tube, 'board', { pos: [x, 0, 0], ex: [0, 0, 1.9] });
      add(bob, flange, 'board', { pos: [x, 0.85, 0], ex: [0, 0, 1.9] });
      add(bob, flange, 'board', { pos: [x, -0.85, 0], ex: [0, 0, 1.9] });
    });

    const cl = part({
      name: 'Core clamps',
      role: 'Squeeze the laminations tight so they cannot vibrate, and carry the mounting feet.',
      material: 'Painted structural steel with through-bolts',
      look: 'Loose laminations are a common cause of transformer hum.',
    });
    const bar = new THREE.BoxGeometry(3.5, 0.46, 0.08), bolt = cyl(0.045, 1.26, 12), foot = new THREE.BoxGeometry(0.5, 0.06, 1.5);
    [[1.2, 0.56], [1.2, -0.56], [-1.2, 0.56], [-1.2, -0.56]].forEach((yz) => add(cl, bar, 'paint', { pos: [0, yz[0], yz[1]], ex: [0, Math.sign(yz[0]) * 0.8, Math.sign(yz[1]) * 1.25] }));
    [[1.68, 1.2], [-1.68, 1.2], [1.68, -1.2], [-1.68, -1.2]].forEach((xy) => add(cl, bolt, 'steel', { pos: [xy[0], xy[1], 0], rot: [Math.PI / 2, 0, 0], ex: [0, Math.sign(xy[1]) * 0.8, 0] }));
    add(cl, foot, 'paint', { pos: [-1.45, -1.53, 0], ex: [0, -0.8, 0] });
    add(cl, foot, 'paint', { pos: [1.45, -1.53, 0], ex: [0, -0.8, 0] });

    const term = part({
      name: 'Terminals and bushings',
      role: 'Bring the winding ends out through insulating bushings to the supply and the load.',
      material: 'Porcelain bushings with brass studs',
      look: 'The left pair connects to the primary, the right pair to the secondary.',
    });
    const base = cyl(0.13, 0.05, 20), bush = new THREE.CylinderGeometry(0.075, 0.1, 0.32, 20), stud = cyl(0.03, 0.22, 12);
    [-1.48, -1.12, 1.12, 1.48].forEach((x) => {
      const ex = [0, 1.1, 0.3];
      add(term, base, 'dark', { pos: [x, 1.475, 0.62], ex: ex });
      add(term, bush, 'porcelain', { pos: [x, 1.66, 0.62], ex: ex });
      add(term, stud, 'brass', { pos: [x, 1.92, 0.62], ex: ex });
      const lead = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x, 0.74, 0.69), V(x, 1.05, 0.92), V(x, 1.34, 0.82), V(x, 1.46, 0.64)]), 16, 0.025, 6);
      add(term, lead, 'copper', { ex: ex });
    });

    /* Flux: particles round the core, swinging back and forth with the AC (0.5 Hz on screen). */
    const loops = [];
    for (const z of [-0.28, 0, 0.28]) {
      for (const d of [-0.13, 0.13]) {
        const hx = 1.3 + d, hy = 1.2 + d;
        loops.push([V(-hx, hy, z), V(hx, hy, z), V(hx, -hy, z), V(-hx, -hy, z)]);
      }
    }
    const F = makeFlux(loops, 40, 0.26);
    m.fluxGroup.add(F.obj);
    m.fluxUpdate = (t) => {
      F.update(-1.4 * Math.sin(Math.PI * t));
      F.mat.opacity = 0.18 + 0.82 * Math.abs(Math.cos(Math.PI * t));
    };
    m.waves = [
      { label: 'Vp primary', color: 'copper', f: (t) => Math.sin(Math.PI * t) },
      { label: 'Vs secondary', color: 'ink', f: (t) => 0.5 * Math.sin(Math.PI * t) },
    ];
    m.speed = 0;
    m.cutNormals = [[0, 0, -1], [0, -1, 0]];
    m.camDir = [5.4, 3.4, 8.2];
  },
});
