/*
  Three-phase oil-immersed distribution transformer, as found on Indian 11 kV feeders.
  Everything a real unit carries: the active part (core and windings) inside a tank of oil,
  plus bushings, radiators, conservator, breather, Buchholz relay and other fittings.
  y is up. The tank is about 3.4 wide (x), 1.6 deep (z) and 3.3 tall.
*/
Electrica.register({
  id: 'distribution-transformer',
  short: 'Distribution transformer',
  name: 'Distribution transformer',
  kind: 'Static · 3-phase · Oil-filled',
  sub: 'Oil-immersed · Three-phase · ONAN · 11 kV / 433 V',
  icon: '<rect x="7" y="10" width="30" height="25" rx="3"/><circle cx="18" cy="22.5" r="6.5"/><circle cx="26" cy="22.5" r="6.5"/><path d="M15 10V6M22 10V6M29 10V6"/>',
  plate: [
    ['Type', '3-phase, oil-immersed'], ['Rating', '250 kVA'], ['Voltage', '11 000 / 433 V'],
    ['Vector group', 'Dyn11'], ['Cooling', 'ONAN'], ['Impedance', '4.5 %'],
  ],
  principle: 'It works like the single-phase transformer, but each limb of a three-limb core carries one phase. The core and windings sit in a tank of mineral oil, which insulates them and carries their heat to the radiators. The conservator, breather, Buchholz relay and pressure relief device keep the oil dry and protect the transformer if a fault develops inside.',
  formulas: [
    'Dyn11: HV in delta, LV in star with neutral',
    'LV phase voltage = 433 / √3 ≈ 250 V',
    'Turns ratio per phase = 11 000 / 250 = 44',
    'I = S / (√3 · V): 13.1 A HV, 333 A LV',
  ],
  fluxNote: 'Blue: flux in the three-limb core; the three limb fluxes always add to zero. Copper: hot oil rising through the windings, cooling in the radiators and sinking back (ONAN). Both slowed down.',

  build: function (k, m) {
    const { THREE, V, TAU, part, add, annulus, cyl, extrude, frameShape, polyShape, makeFlux, material } = k;
    const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
    const tube = (pts, r, seg) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg || 24, r, 8);
    const UP = [Math.PI / 2, 0, 0];      // turns a z-axis tube or a y-axis cylinder through 90°
    const LIMBS = [-1, 0, 1];            // x of the R, Y, B limbs
    const YC = -0.15;                    // height of the core centre

    /* Lift used in the exploded view: the active part comes out of the tank, as when a transformer is untanked. */
    const LIFT = 2.8, TOP = 3.5, COVER = 4.6;

    /* ---------------- the active part ---------------- */
    const core = part({
      name: 'Three-limb core',
      role: 'Each limb carries the flux of one phase and the yokes join them. The limbs are stepped so the round coils fit closely; the top yoke comes off when coils are fitted or replaced.',
      material: 'CRGO silicon-steel laminations, about 0.23 to 0.27 mm thick',
      look: 'In Flux view the three limb fluxes are 120° apart, so at every instant they add to zero.',
    });
    LIMBS.forEach((x) => {
      add(core, box(0.40, 1.70, 0.20), 'lamA', { pos: [x, YC, 0], ex: [0, LIFT, 0] });
      add(core, box(0.32, 1.70, 0.32), 'lamB', { pos: [x, YC, 0], ex: [0, LIFT, 0] });
      add(core, box(0.20, 1.70, 0.40), 'lamA', { pos: [x, YC, 0], ex: [0, LIFT, 0] });
    });
    [[0.88, TOP], [-1.18, LIFT]].forEach((yy) => {
      add(core, box(2.40, 0.36, 0.32), 'lamB', { pos: [0, yy[0], 0], ex: [0, yy[1], 0] });
      add(core, box(2.38, 0.28, 0.40), 'lamA', { pos: [0, yy[0], 0], ex: [0, yy[1], 0] });
    });

    const lv = part({
      name: 'LV winding',
      role: 'The inner winding on each limb, nearest the core because it needs the least insulation. The three LV windings are joined in star and the star point is brought out as the neutral.',
      material: 'Copper or aluminium conductor, paper insulated',
      look: 'The bar across the coil tops at the back is the star point.',
    });
    const LVH = 1.56, LVN = 12, lvs = (LVH - 0.012 * (LVN - 1)) / LVN, lvGeo = annulus(0.33, 0.25, lvs, null, null, 40);
    const LVX = [-0.25, 0.25, 0.75];     // LV phase bushings (the neutral is at -0.75)
    LIMBS.forEach((x, i) => {
      for (let j = 0; j < LVN; j++) add(lv, lvGeo, 'copperDk', { pos: [x, YC - LVH / 2 + lvs / 2 + j * (lvs + 0.012), 0], rot: UP, ex: [0, LIFT, 0.6] });
      add(lv, tube([V(x, 0.64, 0.29), V(x + (LVX[i] - x) * 0.3, 1.0, 0.33), V(LVX[i], 1.52, 0.35)], 0.028), 'copper', { ex: [0, LIFT, 0.6] });
    });
    add(lv, box(2.06, 0.05, 0.05), 'copper', { pos: [0, 0.665, -0.29], ex: [0, LIFT, 0.6] });
    add(lv, tube([V(-1.0, 0.66, -0.29), V(-1.32, 1.0, 0), V(-0.75, 1.52, 0.35)], 0.028), 'copper', { ex: [0, LIFT, 0.6] });

    const hv = part({
      name: 'HV winding',
      role: 'The outer winding, with many more turns of thinner conductor. The three HV windings are connected in delta and fed at 11 kV.',
      material: 'Paper-insulated copper or aluminium wire, wound as disc or crossover coils',
      look: 'Per phase the turns ratio is 44 : 1, from 11 000 V across each HV coil to 250 V across each LV coil.',
    });
    const HVH = 1.5, HVN = 16, hvs = (HVH - 0.01 * (HVN - 1)) / HVN, hvGeo = annulus(0.47, 0.37, hvs, null, null, 48);
    const HVX = [-0.9, 0, 0.9];
    LIMBS.forEach((x, i) => {
      for (let j = 0; j < HVN; j++) add(hv, hvGeo, 'copper', { pos: [x, YC - HVH / 2 + hvs / 2 + j * (hvs + 0.01), 0], rot: UP, ex: [0, LIFT, 1.5] });
      add(hv, tube([V(x, 0.62, -0.42), V(x * 0.95, 1.0, -0.4), V(HVX[i], 1.52, -0.35)], 0.022), 'copperDk', { ex: [0, LIFT, 1.5] });
    });

    const ins = part({
      name: 'Insulation and oil ducts',
      role: 'Pressboard cylinders and spacers separate the LV and HV windings and leave vertical ducts, so oil can flow up through the windings and carry the heat away.',
      material: 'Pressboard, kraft paper and seasoned wood, all oil-impregnated',
      look: 'The thin cylinder between the two windings is the main HV-LV barrier.',
    });
    const barrier = annulus(0.36, 0.345, 1.62, null, null, 40), endRing = annulus(0.48, 0.25, 0.04, null, null, 40);
    LIMBS.forEach((x) => {
      add(ins, barrier, 'board', { pos: [x, YC, 0], rot: UP, ex: [0, LIFT, 0.95] });
      add(ins, endRing, 'board', { pos: [x, -0.95, 0], rot: UP, ex: [0, LIFT, 0.95] });
    });

    const fr = part({
      name: 'Core clamps and frame',
      role: 'Steel frames and tie rods clamp the yokes and hold the whole core-and-coil assembly together. The lifting lugs carry it when it is lifted out of the tank.',
      material: 'Structural steel channels and tie rods',
      look: 'Exploded view lifts the active part out, the way it is untanked for repair.',
    });
    [-0.235, 0.235].forEach((z) => {
      add(fr, box(3.1, 0.3, 0.06), 'paint', { pos: [0, 0.88, z], ex: [0, TOP, 0] });
      add(fr, box(3.1, 0.3, 0.06), 'paint', { pos: [0, -1.18, z], ex: [0, LIFT, 0] });
      [-0.7, 0.7].forEach((x) => add(fr, box(0.12, 0.22, 0.04), 'paint', { pos: [x, 1.13, z], ex: [0, TOP, 0] }));
      [-1.5, 1.5].forEach((x) => {
        add(fr, cyl(0.025, 2.36, 10), 'steel', { pos: [x, YC, z], ex: [0, LIFT, 0] });
        add(fr, box(0.3, 0.16, 0.1), 'dark', { pos: [x * 0.66, -1.41, z], ex: [0, LIFT, 0] });
      });
    });

    const tap = part({
      name: 'Off-circuit tap switch',
      role: 'Selects tappings on the HV winding, which changes the turns ratio in small steps to correct the output voltage. It may only be operated with the transformer switched off.',
      material: 'Brass contacts on a pressboard body, operating handle on the cover',
      look: 'The handle on the cover, back left, shows the tap position.',
    });
    add(tap, cyl(0.085, 0.32, 20), 'board', { pos: [-1.2, 0.35, -0.62], ex: [-0.4, LIFT, -0.3] });
    add(tap, cyl(0.022, 1.22, 10), 'board', { pos: [-1.2, 1.12, -0.62], ex: [-0.4, LIFT, -0.3] });
    LIMBS.forEach((x) => add(tap, tube([V(x, 0.1, -0.47), V(x * 0.5 - 0.2, 0.2, -0.58), V(-0.7, 0.3, -0.6), V(-1.12, 0.35, -0.6)], 0.014), 'copperDk', { ex: [-0.4, LIFT, -0.3] }));
    add(tap, cyl(0.1, 0.04, 20), 'brass', { pos: [-1.2, 1.78, -0.62], ex: [0, COVER, 0] });
    add(tap, box(0.24, 0.05, 0.05), 'dark', { pos: [-1.2, 1.83, -0.62], rot: [0, 0.4, 0], ex: [0, COVER, 0] });

    /* ---------------- tank, oil and cover ---------------- */
    const tank = part({
      name: 'Tank',
      role: 'Welded steel tank that holds the active part and the oil. It is sealed against moisture and connected to earth.',
      material: 'Mild-steel sheet, painted inside and out',
      look: 'Cutaway opens the front right quarter to show the inside.',
      casing: true,
    });
    add(tank, box(3.44, 3.25, 0.05), 'paint', { pos: [0, 0.075, 0.755] });
    add(tank, box(3.44, 3.25, 0.05), 'paint', { pos: [0, 0.075, -0.755] });
    add(tank, box(0.05, 3.25, 1.46), 'paint', { pos: [1.695, 0.075, 0] });
    add(tank, box(0.05, 3.25, 1.46), 'paint', { pos: [-1.695, 0.075, 0] });
    add(tank, box(3.44, 0.06, 1.56), 'paint', { pos: [0, -1.52, 0] });
    const flange = extrude(frameShape(3.58, 1.70, 0.02, 3.36, 1.48, 0.01), 0.05, 2);
    flange.rotateX(Math.PI / 2);
    add(tank, flange, 'paint', { pos: [0, 1.675, 0] });
    [-1.45, 1.45].forEach((x) => [-0.8, 0.8].forEach((z) => add(tank, box(0.16, 0.2, 0.05), 'paint', { pos: [x, 1.5, z] })));

    const oil = part({
      name: 'Transformer oil',
      role: 'Fills the whole tank and part of the conservator. It insulates the windings far better than air and carries their heat to the radiators by natural circulation.',
      material: 'Mineral insulating oil to IS 335 (some units use ester oils)',
      look: 'Cutaway shows the oil around the windings and the level inside the conservator.',
      casing: true,
    });
    add(oil, box(3.32, 3.15, 1.44), 'oil', { pos: [0, 0.095, 0], opacity: 0.3 });

    const cover = part({
      name: 'Tank cover',
      role: 'Bolted lid with a gasket. The bushings, the tap switch handle and the protective devices are mounted on it.',
      material: 'Mild-steel plate with a nitrile-cork gasket',
      casing: true,
    });
    add(cover, box(3.62, 0.06, 1.74), 'paint', { pos: [0, 1.73, 0], ex: [0, COVER, 0] });

    /* ---------------- bushings ---------------- */
    function bushing(p, x, z, tall) {
      const H = tall ? 0.78 : 0.34, r = tall ? 0.065 : 0.055, R = tall ? 0.14 : 0.1, n = tall ? 5 : 2, ex = [0, COVER, 0];
      add(p, cyl(r * 1.9, 0.04, 20), 'dark', { pos: [x, 1.78, z], ex: ex });
      add(p, cyl(r, H, 20), 'porcelain', { pos: [x, 1.8 + H / 2, z], ex: ex });
      const shed = new THREE.CylinderGeometry(R * 0.9, R, 0.03, 24);
      for (let i = 0; i < n; i++) add(p, shed, 'porcelain', { pos: [x, 1.88 + ((i + 0.5) * (H - 0.1)) / n, z], ex: ex });
      add(p, cyl(0.022, 0.18, 10), 'brass', { pos: [x, 1.8 + H + 0.08, z], ex: ex });
      add(p, cyl(r * 0.9, 0.2, 16), 'porcelain', { pos: [x, 1.6, z], ex: ex });
    }
    const hvb = part({
      name: 'HV bushings',
      role: 'Porcelain bushings take the 11 kV leads out through the earthed cover. The sheds lengthen the surface path so rain and dirt do not cause a flashover.',
      material: 'Glazed porcelain with brass stems',
      look: 'They are taller than the LV bushings because the voltage is higher.',
    });
    HVX.forEach((x) => bushing(hvb, x, -0.35, true));
    const lvb = part({
      name: 'LV bushings',
      role: 'Four bushings: the three phases of the 433 V side and the neutral of the star winding.',
      material: 'Porcelain or epoxy with copper or brass stems',
      look: 'The one on the far left is the neutral.',
    });
    [-0.75].concat(LVX).forEach((x) => bushing(lvb, x, 0.35, false));

    /* ---------------- cooling ---------------- */
    const rad = part({
      name: 'Radiators',
      role: 'Pressed-steel panels on both sides. Hot oil enters at the top header, cools as it sinks through the panels and returns to the tank at the bottom. This is ONAN cooling: oil natural, air natural.',
      material: 'Pressed-steel panels welded to top and bottom headers',
      look: 'Flux view shows the oil circulation in copper.',
    });
    [1, -1].forEach((s) => {
      const ex = [s * 1.3, 0, 0];
      [1.15, -1.05].forEach((y) => {
        add(rad, cyl(0.06, 0.44, 14), 'paint', { pos: [s * 1.93, y, 0], rot: [0, 0, Math.PI / 2], ex: ex });
        add(rad, cyl(0.07, 1.4, 14), 'paint', { pos: [s * 2.2, y, 0], rot: UP, ex: ex });
      });
      for (let i = 0; i < 7; i++) add(rad, box(0.62, 2.35, 0.03), 'paint', { pos: [s * 2.2, 0.05, -0.6 + i * 0.2], ex: ex });
    });

    /* ---------------- oil preservation and protection ---------------- */
    const CX = 1.45, CY = 2.42, CR = 0.33, CEX = [0.6, 5.0, 0];
    const cons = part({
      name: 'Conservator and oil gauge',
      role: 'A drum above the tank. As the oil warms and expands it rises into the conservator, so the main tank always stays full. The magnetic oil gauge on its end shows the level.',
      material: 'Mild-steel drum on brackets',
      look: 'Cutaway slices it open to show the oil level inside.',
    });
    add(cons, annulus(CR, CR - 0.02, 1.6, null, null, 40), 'paint', { pos: [CX, CY, 0], ex: CEX });
    [-0.8, 0.8].forEach((z) => add(cons, cyl(CR, 0.03, 40), 'paint', { pos: [CX, CY, z], rot: UP, ex: CEX }));
    [-0.55, 0.55].forEach((z) => add(cons, box(0.14, 0.36, 0.08), 'paint', { pos: [CX, 1.93, z], ex: [0, COVER, 0] }));
    add(cons, cyl(0.11, 0.04, 24), 'dark', { pos: [CX, CY, 0.83], rot: UP, ex: CEX });
    add(cons, cyl(0.09, 0.05, 24), 'porcelain', { pos: [CX, CY, 0.835], rot: UP, ex: CEX });
    add(cons, box(0.015, 0.08, 0.01), 'R', { pos: [CX + 0.02, CY + 0.02, 0.865], rot: [0, 0, -0.7], ex: CEX });
    /* the oil inside: a circular segment just above half full */
    const h = 0.04, rr = CR - 0.025, seg = [];
    const ta = Math.PI - Math.asin(h / rr), tb = TAU + Math.asin(h / rr);
    for (let i = 0; i <= 40; i++) { const t = ta + ((tb - ta) * i) / 40; seg.push(new THREE.Vector2(rr * Math.cos(t), rr * Math.sin(t))); }
    add(oil, extrude(polyShape(seg), 1.56, 2), 'oil', { pos: [CX, CY, 0], ex: CEX, opacity: 0.55 });

    const buch = part({
      name: 'Buchholz relay',
      role: 'A gas-operated relay in the pipe between the tank and the conservator. Gas from a slowly developing fault collects in it and sounds an alarm; a sudden surge of oil from a serious fault trips the circuit breaker.',
      material: 'Cast housing with two floats and mercury or reed switches',
      look: 'It is usually fitted on the larger transformers; the pipe rises slightly towards the conservator so gas can reach it.',
    });
    const BEX = [0.3, 4.8, 0];
    add(buch, cyl(0.045, 0.3, 12), 'paint', { pos: [0.55, 1.91, -0.62], ex: BEX });
    add(buch, tube([V(0.55, 2.04, -0.62), V(0.75, 2.09, -0.62), V(0.95, 2.14, -0.62), V(1.14, 2.2, -0.62)], 0.045, 12), 'paint', { ex: BEX });
    add(buch, box(0.26, 0.2, 0.2), 'dark', { pos: [0.85, 2.12, -0.62], rot: [0, 0, 0.27], ex: BEX });
    [0.71, 0.99].forEach((x) => add(buch, cyl(0.09, 0.03, 20), 'dark', { pos: [x, 2.12 + (x - 0.85) * 0.27, -0.62], rot: [0, 0, Math.PI / 2 + 0.27], ex: BEX }));
    add(buch, cyl(0.05, 0.02, 16), 'glass', { pos: [0.85, 2.12, -0.51], rot: UP, ex: BEX });

    const br = part({
      name: 'Silica gel breather',
      role: 'When the oil cools and contracts, air is drawn into the conservator. It passes first through an oil cup, which traps dust, and then through silica gel, which takes out the moisture.',
      material: 'Glass or acrylic container with silica gel, oil cup below',
      look: 'Blue gel turns pink when it is saturated and needs replacing.',
    });
    const BRX = [1.0, 0, 1.0];
    add(br, tube([V(CX, 2.55, 0.78), V(CX, 2.56, 0.95), V(CX, 2.4, 1.0), V(CX, 1.1, 1.0)], 0.025, 20), 'paint', { ex: BRX });
    add(br, cyl(0.12, 0.06, 24), 'paint', { pos: [CX, 1.0, 1.0], ex: BRX });
    add(br, cyl(0.105, 0.38, 24), 'glass', { pos: [CX, 0.78, 1.0], ex: BRX, opacity: 0.3 });
    add(br, cyl(0.09, 0.34, 24), 'gel', { pos: [CX, 0.78, 1.0], ex: BRX });
    add(br, cyl(0.12, 0.04, 24), 'paint', { pos: [CX, 0.57, 1.0], ex: BRX });
    add(br, cyl(0.1, 0.09, 24), 'glass', { pos: [CX, 0.5, 1.0], ex: BRX, opacity: 0.35 });
    add(br, cyl(0.085, 0.05, 24), 'oil', { pos: [CX, 0.48, 1.0], ex: BRX, opacity: 0.7 });

    const prd = part({
      name: 'Pressure relief device',
      role: 'Opens in a few milliseconds if an internal fault vaporises oil and the pressure shoots up, so the tank does not burst. It reseals itself afterwards. Older transformers use an explosion vent with a breakable diaphragm instead.',
      material: 'Spring-loaded valve with a trip switch and a coloured flag',
    });
    add(prd, cyl(0.09, 0.1, 20), 'dark', { pos: [-1.38, 1.81, 0.45], ex: [0, COVER, 0] });
    add(prd, new THREE.SphereGeometry(0.09, 20, 10, 0, TAU, 0, Math.PI / 2), 'paint', { pos: [-1.38, 1.86, 0.45], ex: [0, COVER, 0] });
    add(prd, box(0.03, 0.08, 0.06), 'Y', { pos: [-1.38, 1.98, 0.45], ex: [0, COVER, 0] });

    const oti = part({
      name: 'Oil temperature indicator',
      role: 'A dial thermometer whose bulb sits in a pocket in the top oil, the hottest oil in the tank. Contacts inside it switch the alarm and trip circuits.',
      material: 'Dial gauge with a capillary to a sensing bulb',
      look: 'The pocket is on the cover, front left.',
    });
    add(oti, cyl(0.035, 0.14, 12), 'brass', { pos: [-1.05, 1.83, 0.6], ex: [0, COVER, 0] });
    const OEX = [0, 0, 0.9];
    add(oti, cyl(0.17, 0.06, 32), 'dark', { pos: [-1.15, 0.95, 0.81], rot: UP, ex: OEX });
    add(oti, cyl(0.15, 0.065, 32), 'porcelain', { pos: [-1.15, 0.95, 0.815], rot: UP, ex: OEX });
    add(oti, box(0.02, 0.12, 0.01), 'R', { pos: [-1.17, 0.99, 0.852], rot: [0, 0, 0.6], ex: OEX });
    add(oti, tube([V(-1.05, 1.86, 0.62), V(-1.05, 1.88, 0.86), V(-1.1, 1.5, 0.84), V(-1.15, 1.12, 0.83)], 0.012, 16), 'brass', { ex: OEX });

    const val = part({
      name: 'Drain and sampling valves',
      role: 'The drain valve empties the tank or connects a filter machine; the sampling valve draws oil for tests such as breakdown voltage, moisture and dissolved gas analysis.',
      material: 'Gunmetal or cast-steel valves',
    });
    [[-0.9, 0.07, 0.075], [-0.45, 0.045, 0.055]].forEach((v) => {
      const x = v[0], r = v[1], wr = v[2], ex = [0, 0, 0.9];
      add(val, cyl(r * 1.6, 0.03, 20), 'dark', { pos: [x, -1.32, 0.795], rot: UP, ex: ex });
      add(val, cyl(r, 0.16, 20), 'brass', { pos: [x, -1.32, 0.87], rot: UP, ex: ex });
      add(val, new THREE.TorusGeometry(wr, 0.014, 8, 24), 'dark', { pos: [x, -1.32, 0.97], ex: ex });
    });

    const base = part({
      name: 'Base and earthing',
      role: 'Base channels carry the tank and fix it to the plinth. The tank and the LV neutral are both connected to the earth pits, so a fault current has a safe path to ground.',
      material: 'Steel channels, brass earthing pads',
    });
    [-0.5, 0.5].forEach((z) => add(base, box(3.7, 0.14, 0.16), 'dark', { pos: [0, -1.62, z], ex: [0, -0.9, 0] }));
    [-1.6, 1.6].forEach((x) => add(base, box(0.14, 0.1, 0.03), 'brass', { pos: [x, -1.62, 0.595], ex: [0, -0.9, 0] }));

    /* rating plate with real text, drawn on a canvas */
    const plateC = document.createElement('canvas');
    plateC.width = 640; plateC.height = 400;
    const g = plateC.getContext('2d');
    g.fillStyle = '#d6d9d4'; g.fillRect(0, 0, 640, 400);
    g.strokeStyle = '#3a3f44'; g.lineWidth = 6; g.strokeRect(12, 12, 616, 376);
    g.fillStyle = '#22262a'; g.textAlign = 'center'; g.font = 'bold 28px sans-serif';
    g.fillText('3-PHASE DISTRIBUTION TRANSFORMER', 320, 62);
    g.textAlign = 'left'; g.font = '23px monospace';
    [['RATING', '250 kVA'], ['VOLTAGE HV / LV', '11000 / 433 V'], ['CURRENT HV / LV', '13.1 / 333 A'], ['VECTOR GROUP', 'Dyn11'],
      ['COOLING', 'ONAN'], ['FREQUENCY', '50 Hz'], ['IMPEDANCE', '4.5 %']].forEach((r, i) => {
      g.fillText(r[0], 44, 112 + i * 36); g.fillText(r[1], 360, 112 + i * 36);
    });
    g.font = '17px monospace'; g.textAlign = 'center';
    g.fillText('EXAMPLE PLATE FOR TEACHING', 320, 372);
    const tex = new THREE.CanvasTexture(plateC);
    const rp = part({
      name: 'Rating plate',
      role: 'States the rating, voltages, currents, vector group, impedance and cooling, with the connection diagram. Engineers read it before connecting or operating the transformer.',
      material: 'Anodised aluminium or stainless steel, etched',
      look: 'The values shown are an example for teaching.',
    });
    add(rp, new THREE.PlaneGeometry(0.8, 0.5), material('alu', { map: tex, metalness: 0.2, roughness: 0.6, color: new THREE.Color(0xffffff), side: THREE.FrontSide }), { pos: [-0.15, 0.25, 0.783], ex: [0, 0, 0.7] });

    /* ---------------- Flux view ---------------- */
    const w = Math.PI;                    // 0.5 Hz on screen
    function win(x0, x1, z, d) { return [V(x0, -1.18 + d, z), V(x0, 0.88 - d, z), V(x1, 0.88 - d, z), V(x1, -1.18 + d, z)]; }
    const L1 = [], L2 = [];
    for (const z of [-0.1, 0.1]) for (const d of [0, 0.08]) {
      L1.push(win(-1.0 + d, -0.06 - d * 0.5, z, d));   // up the R limb, down the Y limb
      L2.push(win(0.06 + d * 0.5, 1.0 - d, z, d));     // up the Y limb, down the B limb
    }
    const F1 = makeFlux(L1, 30, 0.3), F2 = makeFlux(L2, 30, 0.3);
    function oilLoop(s, z) {
      return [V(s * 0.5, -1.3, z), V(s * 0.5, 1.5, z), V(s * 1.45, 1.55, z), V(s * 1.9, 1.15, z), V(s * 2.2, 1.0, z),
        V(s * 2.2, -0.9, z), V(s * 1.9, -1.05, z), V(s * 1.35, -1.35, z)];
    }
    const OL = [];
    for (const s of [1, -1]) for (const z of [-0.4, 0, 0.4]) OL.push(oilLoop(s, z));
    const FO = makeFlux(OL, 26, 0.26, 'copper');
    m.fluxGroup.add(F1.obj, F2.obj, FO.obj);
    /* Loop fluxes: window 1 carries the R-limb flux, window 2 minus the B-limb flux; their difference is the Y-limb flux. */
    m.fluxUpdate = (t) => {
      F1.update(-0.9 * Math.cos(w * t));
      F1.mat.opacity = 0.2 + 0.8 * Math.abs(Math.sin(w * t));
      F2.update(0.9 * Math.cos(w * t + TAU / 3));
      F2.mat.opacity = 0.2 + 0.8 * Math.abs(Math.sin(w * t + TAU / 3));
      FO.update(t * 0.45);
    };
    m.waves = [
      { label: 'vR', color: 'phR', f: (t) => Math.cos(w * t) },
      { label: 'vY', color: 'phY', f: (t) => Math.cos(w * t - TAU / 3) },
      { label: 'vB', color: 'phB', f: (t) => Math.cos(w * t - (2 * TAU) / 3) },
    ];
    m.speed = 0;
    m.cutNormals = [[-1, 0, 0], [0, 0, -1]];   // Cutaway removes the front right quarter
    m.camDir = [6.6, 4.4, 8.4];
  },
});
