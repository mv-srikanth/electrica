/*
  TEMPLATE FOR A NEW MACHINE  (a small pull-type solenoid, as a working example)

  1. Copy this file and rename it, for example to js/machines/stepper-motor.js
  2. Change id below to match the file name: 'stepper-motor'
  3. In index.html, add a line above <script>Electrica.start();</script>:
       <script src="js/machines/stepper-motor.js"></script>
  4. Open index.html in a browser and click your machine. If something is wrong,
     the viewer shows the error and the file to check (more detail in the browser console, F12).

  Size and axes: the machines here are about 4 units across; keep yours similar so the
  camera framing works. Put the shaft of a rotating machine along the z axis.

  This file is not listed in index.html, so the example does not appear on the site.
*/
Electrica.register({
  id: 'solenoid-example',        // lower-case, no spaces; also the link: index.html#solenoid-example
  short: 'Solenoid',             // name in the machine list and on the rating plate
  name: 'Pull-type solenoid',    // large heading above the viewer
  kind: 'Static · DC',           // small line under the name in the list
  sub: 'Example machine · Template',
  icon: '<circle cx="22" cy="22" r="16"/><text x="22" y="26">S</text>',  // drawing in a 44 x 44 box
  plate: [['Type', 'Pull-type solenoid'], ['Voltage', '24 V DC'], ['Stroke', '10 mm'], ['Duty', '100% ED']],
  principle: 'Current in the coil magnetises the steel path. The plunger is pulled into the coil to close the air gap, because that lowers the reluctance of the magnetic circuit.',
  formulas: ['F ≈ μ0 · (N · I)² · A / (2 · g²)'],
  fluxNote: 'Steady flux runs along the plunger, out through the front plate and back along the housing.',

  build: function (k, m) {
    // k holds the helpers; m is the machine you are building.
    const { THREE, V, TAU, part, add, annulus, cyl, makeFlux } = k;

    // part({...}) creates one entry in the components list.
    // add(part, geometry, materialName, options) puts a piece of that part in the scene.
    //   options.pos  [x, y, z]   where the piece sits
    //   options.rot  [x, y, z]   rotation in radians
    //   options.ex   [x, y, z]   how far it moves at 100% Separation (exploded view)
    //   options.rotor true       the piece turns when the machine runs (see m.speed)
    // Materials: lamA lamB steel copper copperDk board paint shaft alu carbon brass porcelain mica dark R Y B

    const housing = part({
      name: 'Housing and end plates',
      role: 'Steel return path for the flux, and the case that holds everything together.',
      material: 'Mild steel',
      casing: true,                // casing parts fade out in Flux view so the inside shows
    });
    add(housing, annulus(1.3, 1.18, 2.6), 'paint');
    const plate = annulus(1.3, 0.5, 0.12);
    add(housing, plate, 'paint', { pos: [0, 0, 1.36], ex: [0, 0, 1.6] });
    add(housing, plate, 'paint', { pos: [0, 0, -1.36], ex: [0, 0, -1.6] });

    const former = part({
      name: 'Coil former',
      role: 'Insulating tube the coil is wound on. The plunger slides inside it.',
      material: 'Glass-filled nylon',
    });
    add(former, annulus(0.6, 0.5, 2.5), 'board', { ex: [0, 1.6, 0] });

    const coil = part({
      name: 'Coil',
      role: 'Many turns of wire. The current through it sets the magnetomotive force N · I.',
      material: 'Enamelled copper wire',
      look: 'Each copper ring here stands for a layer of turns.',
    });
    const turn = annulus(1.12, 0.62, 0.17);
    for (let i = 0; i < 12; i++) add(coil, turn, i % 2 ? 'copperDk' : 'copper', { pos: [0, 0, -1.07 + i * 0.195], ex: [0, 2.6, 0] });

    const plunger = part({
      name: 'Plunger',
      role: 'The moving steel core. It is pulled in until it meets the pole piece.',
      material: 'Soft magnetic steel',
      look: 'The small gap between plunger and pole piece is the air gap g in the force formula.',
    });
    add(plunger, cyl(0.46, 3.0), 'shaft', { pos: [0, 0, 0.9], rot: [Math.PI / 2, 0, 0], ex: [0, 0, 3.0] });

    const stop = part({
      name: 'Pole piece',
      role: 'Fixed steel stop at the back. The plunger closes the gap against it.',
      material: 'Soft magnetic steel',
    });
    add(stop, cyl(0.46, 0.7), 'steel', { pos: [0, 0, -1.0], rot: [Math.PI / 2, 0, 0], ex: [0, 0, -2.2] });

    const term = part({
      name: 'Terminals',
      role: 'Connect the coil to the supply.',
      material: 'Brass',
    });
    [-0.3, 0.3].forEach((z) => add(term, cyl(0.06, 0.3, 12), 'brass', { pos: [0, 1.42, z], ex: [0, 1.0, 0] }));

    // Flux view: particles that travel round closed loops (arrays of points).
    const loops = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, c = Math.cos(a), s = Math.sin(a), r1 = 0.25, r2 = 1.24;
      loops.push([V(r1 * c, r1 * s, -1.3), V(r1 * c, r1 * s, 1.36), V(r2 * c, r2 * s, 1.36), V(r2 * c, r2 * s, -1.36), V(r1 * c, r1 * s, -1.36)]);
    }
    const F = makeFlux(loops, 24, 0.22);     // particles per loop, particle size
    m.fluxGroup.add(F.obj);
    m.fluxUpdate = (t) => F.update(t * 0.8); // t is time in seconds; move the particles along their loops

    // Lines on the small scope in Flux view. Colours: copper ink flux phR phY phB
    m.waves = [{ label: 'Coil current (DC)', color: 'copper', f: () => 0.6 }];

    m.speed = 0;                             // rad/s for pieces added with rotor: true. 0 = no moving parts
    m.cutNormals = [[-1, 0, 0], [0, -1, 0]]; // Cutaway removes the quarter where x > 0 and y > 0
    m.camDir = [6, 3.5, 7];                  // direction the camera starts from
  },
});
