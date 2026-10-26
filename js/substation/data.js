/* Electrica Substation: the text for every piece of equipment, the guided tour, the
   switching exercises and the arrangement comparison. Edit the words here; the 3D model,
   the single-line diagram and the network logic read their IDs from the other files.

   Section numbers in "std" refer to the TasNetworks "Substation General Equipment Detail and
   Layout Standard" (R1089602, version 1.0, July 2018). Ratings marked "typical" are teaching
   values, not taken from that standard. */
(function () {
  const SS = (window.SS = window.SS || {});
  const E = {};

  /* ---------- helpers that write the A and B (or 1 and 2) versions of an entry ---------- */
  function twin(idA, idB, make) { E[idA] = make('A', '1', 'B'); E[idB] = make('B', '2', 'A'); }

  /* ---------- 110 kV lines and line bays ---------- */
  twin('lineA', 'lineB', (L, T, O) => ({
    name: '110 kV line ' + L, kind: 'Overhead transmission line', id: 'Line ' + L,
    role: 'Brings power in from the transmission network. The substation is through-fed: line A and line B come from different directions, so it stays in service when either line is lost.',
    notice: 'The last span lands on the strain gantry. The two earth wires above the phase conductors shield the line and the yard from direct lightning strikes; in modern lines one of them usually carries optical fibre (OPGW) for protection signalling.',
    std: 'Section 3: TasNetworks uses the ‘H’ arrangement for through-fed substations (Appendix D).',
    specs: [['Nominal voltage', '110 kV, 50 Hz, three phase'], ['Phase spacing at the gantry', '3.0 m'], ['Earth wires', '2, on the gantry peaks']],
    rel: ['rem' + L],
  }));
  twin('remA', 'remB', (L) => ({
    name: 'Remote end of line ' + L, kind: 'Circuit breaker in another substation', id: 'Remote ' + L,
    role: 'The breaker at the far end of line ' + L + '. In real life nobody here can operate it: you ask the network control centre. In this model you can open and close it to see what happens when a line is lost and restored.',
    notice: 'A line can only be earthed (A131 / B131) when both ends are open. Closing the remote end onto an earthed or faulted line is blocked or trips at once.',
    std: 'Not shown on the PCOLD; it belongs to the substation at the other end of the line.',
    specs: [], rel: [],
  }));
  twin('gantryA', 'gantryB', (L) => ({
    name: 'Line landing gantry, bay ' + L, kind: 'Strain gantry', id: 'Gantry ' + L,
    role: 'Takes the full mechanical tension of the line so that the switchyard equipment only carries short, slack droppers.',
    notice: 'Strain insulator strings hang from the beam. The peaks at the top hold the earth wires, which also shield the bay below.',
    std: 'Galvanised lattice steel; layout per project design.',
    specs: [['Beam height', '12.0 m'], ['Earth-wire peaks', '14.8 m'], ['Column spacing', '13 m']],
  }));
  twin('A197', 'B197', (L) => ({
    name: 'Line voltage transformer ' + L + '197', kind: 'Capacitor voltage transformer (CVT)', id: L + '197',
    role: 'Steps the line voltage down to 110 V for protection relays, metering and check-synchronising. The capacitor stack can also couple power-line-carrier signals onto the line.',
    notice: 'The tall capacitor stack sits on the electromagnetic unit (the small tank). It is connected on the line side of ' + L + '129, so it shows whether the line is live even when the bay is isolated.',
    std: '2.1.4 (R 586391): 110 kV voltage transformers, Koncar VCU-123. Appendix D draws ' + L + '197 as a capacitor voltage transformer.',
    specs: [['Ratio (typical)', '110 kV/√3 : 110 V/√3'], ['Accuracy (typical)', '0.2 metering, 3P protection']],
  }));
  twin('A129', 'B129', (L) => ({
    name: 'Line disconnector ' + L + '129', kind: 'Disconnector (isolator), centre break', id: L + '129',
    role: 'Isolates the line from the bay so that work can be done safely. A disconnector has no arc quenching: it may only open or close when no current flows, so it is interlocked with circuit breaker ' + L + '152.',
    notice: 'Both insulators turn 90° and the arms part in the middle, leaving a visible air gap. That visible gap is the point of a disconnector. Operate it and watch the blades turn.',
    std: '2.1.1 (R 586396): 110 kV disconnectors and earth switches, Alstom S3C / S3CT (the ‘T’ version carries an earth switch). The ‘M’ beside it on the PCOLD means motor operated.',
    specs: [['Rated voltage (typical)', '123–145 kV'], ['Rated current (typical)', '1250–2000 A'], ['Operation', 'Motor, three poles ganged']],
    rel: [L + '131', L + '152'],
    interlock: 'Operates only with ' + L + '152 open. Cannot close while earth switch ' + L + '131 is closed.',
  }));
  twin('A131', 'B131', (L) => ({
    name: 'Line earth switch ' + L + '131', kind: 'Earth switch', id: L + '131',
    role: 'Connects the line conductors solidly to the earth grid once the line is dead and isolated, so that anyone working on it is protected against induced voltage and accidental re-energising.',
    notice: 'The earth blade lies flat along the disconnector base when open and swings up to the line-side contact when closed.',
    std: '2.1.1 (R 586396): Alstom S3CT, a disconnector with an integral earth switch.',
    specs: [['Short-time current (typical)', '31.5–40 kA for 1 s']],
    rel: [L + '129'],
    interlock: 'Closes only when ' + L + '129 is open and line ' + L + ' is dead, which needs the remote end open too.',
  }));
  twin('A196', 'B196', (L) => ({
    name: 'Current transformer ' + L + '196', kind: 'Current transformer (CT)', id: L + '196',
    role: 'Reproduces the line current at 1 A for protection relays and meters. One unit holds several cores: on the PCOLD, ' + L + '196A–E are drawn on both sides of ' + L + '152 so that the protection zones on either side of the breaker overlap and no fault can fall in a gap.',
    notice: 'Oil-filled. The primary conductor passes through the head at the top; the secondary wiring comes down to the terminal box at the base.',
    std: '2.1.3 (R 522690): 110 kV current transformers, GE OSKF-123. (2.1.2 also lists combined VT/CT units, Ritz Kotef.)',
    specs: [['Ratio (typical)', '600-300 / 1 A'], ['Cores (typical)', 'Metering 0.2S, protection 5P20 and PX']],
  }));
  twin('A152', 'B152', (L) => ({
    name: 'Line circuit breaker ' + L + '152', kind: 'Circuit breaker, SF6 live tank', id: L + '152',
    role: 'The only device in the bay that can switch load current and interrupt fault current. Protection relays trip it within about 3 to 5 cycles (60–100 ms) of a fault.',
    notice: 'Three live-tank poles on one frame, all driven by one spring mechanism (ganged operation). The interrupter sits on top of a support insulator, so the breaking chamber is at line voltage. The cabinet holds the mechanism and the position indicator: red for closed, green for open.',
    std: '2.1.6 (R586376): 110 kV live tank, ganged operation, ABB LTB145D. Dead-tank alternative: Mitsubishi 120-SFMT-40E.',
    specs: [['Rated voltage (typical)', '145 kV class'], ['Rated current (typical)', '3150 A'], ['Breaking current (typical)', '40 kA'], ['Insulation and quenching', 'SF6 gas']],
    rel: [L + '129', L + '129' + L],
  }));
  twin('A129A', 'B129B', (L) => ({
    name: 'Bus disconnector ' + L + '129' + L, kind: 'Disconnector (isolator), centre break', id: L + '129' + L,
    role: 'Isolates circuit breaker ' + L + '152 from bus ' + L + ', so the breaker can be maintained while the bus stays in service.',
    notice: 'Same design as ' + L + '129 but without an earth switch. Its east side is part of the bus: the conductor runs on under the bus and rises to it.',
    std: '2.1.1 (R 586396): Alstom S3C.',
    specs: [['Rated voltage (typical)', '123–145 kV'], ['Operation', 'Motor, three poles ganged']],
    rel: [L + '152'],
    interlock: 'Operates only with ' + L + '152 open.',
  }));

  /* ---------- 110 kV buses and the bus section ---------- */
  twin('busA', 'busB', (L, T) => ({
    name: '110 kV bus ' + L, kind: 'Rigid tubular busbar', id: 'Bus ' + L,
    role: 'The common connection of line ' + L + ', transformer T' + T + ' and the bus section. The bus is a rigid aluminium tube on post insulators, 7.4 m above ground, high enough for the bay conductors to pass underneath it.',
    notice: 'Each phase of a bay rises to its own bus tube where it crosses it, so the three phases connect at three different places. Bus VT ' + L + '797 sits at the far end.',
    std: '2.1.13 (R 517375): switchyard conductors are AAC ‘Uranus’ stranded, or solid / tubular pipe. 2.1.5 (R 574184): 110 kV post insulators NGK 8A-108051MM.',
    specs: [['Height', '7.42 m'], ['Phase spacing', '3.0 m'], ['Tube (typical)', '100–150 mm aluminium']],
  }));
  twin('A797', 'B797', (L) => ({
    name: 'Bus voltage transformer ' + L + '797', kind: 'Voltage transformer (VT)', id: L + '797',
    role: 'Measures the bus ' + L + ' voltage for metering, voltage control, bus protection and check-synchronising before a breaker closes two live parts together.',
    notice: 'One single-phase unit per phase, connected to the end of each bus tube.',
    std: '2.1.4 (R 586391): 110 kV voltage transformers, Koncar VCU-123.',
    specs: [['Secondary (typical)', '110 V/√3']],
  }));
  E.A752 = {
    name: 'Bus section circuit breaker A752', kind: 'Circuit breaker, SF6 live tank', id: 'A752',
    role: 'The cross-bar of the ‘H’. Normally closed, it ties bus A to bus B so that either line can supply both transformers. If line A is lost, T1 carries on from line B through A752 and no customer notices.',
    notice: 'Same type as the line breakers, turned to run along the buses. CT A796 next to it feeds the bus protection on both sides.',
    std: '2.1.6 (R586376): ABB LTB145D live tank. Appendix D: A729A – A752 – A729B between bus A and bus B.',
    specs: [['Rated voltage (typical)', '145 kV class'], ['Rated current (typical)', '3150 A'], ['Breaking current (typical)', '40 kA']],
    rel: ['A729A', 'A729B'],
  };
  ['A729A', 'A729B'].forEach((id) => {
    const bus = id.slice(-1);
    E[id] = {
      name: 'Bus section disconnector ' + id, kind: 'Disconnector (isolator), centre break', id: id,
      role: 'Isolates the bus section breaker A752 from bus ' + bus + '. With both A729A and A729B open, A752 can be maintained.',
      notice: 'The bus section runs along the line of the buses, so this disconnector is turned 90° compared with the bay disconnectors.',
      std: '2.1.1 (R 586396): Alstom S3C.',
      specs: [['Operation', 'Motor, three poles ganged']],
      rel: ['A752'], interlock: 'Operates only with A752 open.',
    };
  });
  E.A796 = {
    name: 'Bus section current transformer A796', kind: 'Current transformer (CT)', id: 'A796',
    role: 'Measures current through the bus section for the bus protection of both buses (cores A796A–F on the PCOLD).',
    notice: 'Cores on each side of A752 let the bus A and bus B protection zones overlap across the breaker.',
    std: '2.1.3 (R 522690): GE OSKF-123.', specs: [],
  };

  /* ---------- transformer bays ---------- */
  twin('A429A', 'B429B', (L, T) => ({
    name: 'Transformer disconnector ' + L + '429' + L, kind: 'Disconnector (isolator), centre break', id: L + '429' + L,
    role: 'Isolates transformer T' + T + ' from bus ' + L + '. In an H arrangement there is no circuit breaker on the transformer’s 110 kV side, so this disconnector may only operate with bus ' + L + ' dead: it must not even switch the transformer’s no-load magnetising current.',
    notice: 'To take T' + T + ' out without losing customers you must first move its 22 kV load to the other transformer, then make bus ' + L + ' dead for a moment, open this disconnector and restore the bus. Exercise 5 walks through it.',
    std: '2.1.1 (R 586396): Alstom S3C. Appendix D: ' + L + '429' + L + ' between bus ' + L + ' and T' + T + '.',
    specs: [['Operation', 'Motor, three poles ganged']],
    rel: [L + '552', L + '152', 'A752'],
    interlock: 'Operates only with ' + L + '552 open and bus ' + L + ' dead (' + L + '152 and A752 open).',
  }));
  twin('A45D', 'B45D', (L, T) => ({
    name: 'Surge arresters ' + L + '45D', kind: 'Metal-oxide surge arrester', id: L + '45D',
    role: 'Protects transformer T' + T + ' from lightning and switching surges. Above its operating voltage the zinc-oxide stack conducts the surge to earth, holding the voltage below the transformer’s insulation level, then returns to a high resistance.',
    notice: 'Placed as close as practical to the transformer bushings. The grading ring at the top evens out the voltage along the stack; the surge counter at the base records how many times it has operated.',
    std: 'Shown as ' + L + '45D on the Appendix D PCOLD.',
    specs: [['Rated voltage (typical)', '96 kV'], ['Nominal discharge current (typical)', '10 kA']],
  }));
  twin('T1', 'T2', (L, T, O) => ({
    name: 'Power transformer T' + T, kind: 'Supply transformer, 60 MVA, 110 / 22 kV', id: 'T' + T,
    role: 'Steps 110 kV down to 22 kV for the distribution network. Each transformer can carry the whole substation load on its own, so one can be lost or taken out for maintenance without cutting customers off (n‑1 security).',
    notice: 'Radiators with fans (ONAN / ONAF cooling) at the far end; conservator on top with the Buchholz relay in its pipe; on-load tap changer and its motor drive at the near end; 110 kV bushings on top; the 22 kV cable box on the side, with the cables going underground to the switch room; an oil bund around it all.',
    std: '2.1.12 (R527890): supply transformers 110/22 kV, 60 MVA, type 2, ABB or Wilson.',
    specs: [['Rated power', '60 MVA'], ['Rated current at 60 MVA', '315 A at 110 kV · 1575 A at 22 kV'], ['Cooling (typical)', 'ONAN / ONAF'], ['Tap changer (typical)', 'On load, on the HV winding, about ±10 %'], ['Oil (typical)', 'roughly 20 tonnes']],
    rel: [L + '429' + L, L + '552', L + '531'],
  }));
  E.bund = {
    name: 'Oil containment bund', kind: 'Concrete bund and oil separator', id: 'Bund',
    role: 'Each transformer stands in a concrete bund that can hold its oil if the tank fails. Drainage passes to an oil separator, which lets rain water out and holds back any oil.',
    notice: 'The round lids beside each bund cover the oil separator tanks.',
    std: 'Environmental requirement; capacity per project design.', specs: [],
  };

  /* ---------- 22 kV switchboard ---------- */
  E.sb22 = {
    name: '22 kV indoor switchboard', kind: 'Metal-clad switchgear, single bus, two sections', id: '22 kV board',
    role: 'Distributes the transformers’ 22 kV output to the feeder cables. Bus A is fed by T1 through A552 and bus B by T2 through B552; bus section A852 joins them.',
    notice: '14 panels: transformer incomers at each end, feeders, capacitor banks, then bus section A852 and its riser panel in the middle. Each panel has a red lamp (breaker closed) and a green lamp (open), and a mimic strip that lights when its circuit is live.',
    std: 'Appendix F: Typical Single Bus (HV) PCOLD. Cables 2.1.10 (R 590630): 22 kV 1C × 630 mm², Prysmian.',
    specs: [['Rated voltage (typical)', '24 kV'], ['Busbar current (typical)', '2500 A'], ['Short-circuit rating (typical)', '25 kA for 3 s'], ['Breakers', 'Vacuum, withdrawable truck']],
  };
  twin('A552', 'B552', (L, T) => ({
    name: '22 kV incomer circuit breaker ' + L + '552', kind: 'Vacuum circuit breaker, transformer incomer', id: L + '552',
    role: 'Connects transformer T' + T + ' to 22 kV bus ' + L + '. Transformer protection trips it together with the 110 kV breakers; bus protection trips it for a 22 kV bus fault.',
    notice: 'At full load T' + T + ' delivers about 1575 A here, so the incomer has several 1C × 630 mm² cables per phase.',
    std: 'Appendix F: ' + L + '552, with CTs ' + L + '596A–E and earth switch ' + L + '531 on the cable side.',
    specs: [['Rated current (typical)', '2500 A'], ['Breaking current (typical)', '25 kA']],
    rel: [L + '531'],
  }));
  twin('A531', 'B531', (L, T) => ({
    name: 'Transformer cable earth switch ' + L + '531', kind: 'Earth switch, in incomer panel ' + L + '552', id: L + '531',
    role: 'Earths the 22 kV cables between T' + T + ' and the switchboard during a transformer outage.',
    notice: 'Its position is shown by the amber lamp on panel ' + L + '552.',
    std: 'Appendix F: ' + L + '531.', specs: [],
    rel: [L + '552'],
    interlock: 'Closes only with ' + L + '552 open and the T' + T + ' 22 kV side dead (' + L + '429' + L + ' open, or bus ' + L + ' dead).',
  }));
  E.A852 = {
    name: '22 kV bus section circuit breaker A852', kind: 'Vacuum circuit breaker, bus section', id: 'A852',
    role: 'Joins 22 kV bus A and bus B. In this model it is normally open, so T1 and T2 do not run in parallel; that keeps the 22 kV fault level down. Close it to carry the whole load on one transformer.',
    notice: 'Whether a bus section is run open or closed is an operating choice; many utilities keep it open and close it automatically if a transformer trips. The riser panel next to it carries the bus across.',
    std: 'Appendix F: A852 with CTs A896 on both sides.',
    specs: [['Rated current (typical)', '2500 A'], ['Normal state here', 'Open']],
  };
  twin('A831', 'B831', (L) => ({
    name: '22 kV bus earth switch ' + L + '831', kind: 'Earth switch', id: L + '831',
    role: 'Earths 22 kV bus ' + L + ' for maintenance.',
    notice: 'Every breaker on bus ' + L + ' must be open first, so this is only used for a planned bus outage.',
    std: 'Appendix F: ' + L + '831.', specs: [],
    interlock: 'Closes only when bus ' + L + ' is dead and every breaker on it is open.',
  }));
  const FEED = SS.FEEDERS = {
    A252: { bus: 'A', what: 'cust', to: 'Feeder A252', mw: 7.5 }, B252: { bus: 'A', what: 'cust', to: 'Feeder B252', mw: 6.0 },
    C252: { bus: 'A', what: 'cust', to: 'Feeder C252', mw: 8.0 }, D252: { bus: 'A', what: 'st', to: 'Station transformer ST1', mw: 0.3 },
    K252: { bus: 'A', what: 'cap', to: 'Capacitor bank 1', mvar: 5 }, E252: { bus: 'B', what: 'st', to: 'Station transformer ST2', mw: 0.3 },
    F252: { bus: 'B', what: 'cust', to: 'Feeder F252', mw: 7.0 }, G252: { bus: 'B', what: 'cust', to: 'Feeder G252', mw: 6.5 },
    H252: { bus: 'B', what: 'cust', to: 'Feeder H252', mw: 8.0 }, L252: { bus: 'B', what: 'cap', to: 'Capacitor bank 2', mvar: 5 },
  };
  Object.keys(FEED).forEach((id) => {
    const f = FEED[id], L = id[0], es = L + '231';
    if (f.what === 'cust') {
      E[id] = {
        name: '22 kV feeder circuit breaker ' + id, kind: 'Vacuum circuit breaker, feeder', id: id,
        role: 'Supplies one underground cable feeder into the distribution network (here ' + f.mw + ' MW). Overcurrent and earth-fault relays in the panel trip it for a fault on the cable or beyond.',
        notice: 'The cable leaves the bottom of the panel, runs in the trench and out through the east fence.',
        std: 'Appendix F: feeder ' + id + ' with CTs ' + L + '296A–D and earth switch ' + es + '. Cable 2.1.10: 22 kV 1C × 630 mm², Prysmian.',
        specs: [['Rated current (typical)', '630 A'], ['Breaking current (typical)', '25 kA'], ['Load in this model', f.mw + ' MW']],
        rel: [es],
      };
    } else if (f.what === 'st') {
      const n = f.to.slice(-1);
      E[id] = {
        name: 'Station transformer breaker ' + id, kind: 'Vacuum circuit breaker, auxiliary supply', id: id,
        role: 'Feeds station transformer ST' + n + ', which supplies the substation’s own 400 V loads: battery chargers, lighting, transformer fans, tap-changer motors and heaters.',
        notice: 'There is one on each bus, so the station keeps its auxiliary supply when one bus is out.',
        std: 'Appendix F: ' + id + ' to ST' + n + ' (400 V).', specs: [['Rated current (typical)', '630 A']], rel: [es],
      };
    } else {
      const n = f.to.slice(-1);
      E[id] = {
        name: 'Capacitor bank breaker ' + id, kind: 'Vacuum circuit breaker, capacitor duty', id: id,
        role: 'Switches capacitor bank ' + n + ' (5 MVAr). Capacitors supply reactive power locally, which supports the 22 kV voltage, improves the power factor and reduces current in the transformers and lines.',
        notice: 'Capacitor switching is a hard duty: the breaker must interrupt without restriking. After opening, a bank must discharge (about 5 minutes) before it is switched in again.',
        std: '2.1.9 (R 522695): 22 kV, two indoor 5 MVAr banks, ABB and Nokian. Appendix F does not show capacitor panels, so where they sit on this board is an assumption of the model.',
        specs: [['Bank rating', '5 MVAr at 22 kV'], ['Bank current', 'about 130 A']], rel: [es],
      };
    }
    E[es] = {
      name: 'Feeder earth switch ' + es, kind: 'Earth switch, in panel ' + id, id: es,
      role: 'Earths the outgoing cable at the switchboard before anyone works on it.',
      notice: 'Its position is shown by the amber lamp on panel ' + id + '.',
      std: 'Appendix F: ' + es + '.', specs: [], rel: [id],
      interlock: 'Closes only with ' + id + ' open and the cable dead. (In a real panel the breaker truck must also be racked out to the test position.)',
    };
  });
  twin('cap1', 'cap2', (L, T) => ({
    name: 'Capacitor bank ' + T, kind: 'Indoor shunt capacitor bank, 5 MVAr', id: 'Cap ' + T,
    role: 'Supplies reactive power at 22 kV, switched by ' + (T === '1' ? 'K252' : 'L252') + '.',
    notice: 'Capacitor cans in racks, star connected, with series reactors that limit the inrush current when the bank is switched in. The mesh screen keeps people out while it is live.',
    std: '2.1.9 (R 522695): 22 kV, 2 indoor, 5 MVAr, ABB and Nokian.',
    specs: [['Rating', '5 MVAr'], ['Reactors (typical)', '6 % detuning']],
  }));
  twin('ST1', 'ST2', (L, T) => ({
    name: 'Station transformer ST' + T, kind: 'Auxiliary transformer, 22 kV / 400 V', id: 'ST' + T,
    role: 'Supplies the substation’s own AC loads at 400 V. Two units, one on each 22 kV bus, so the auxiliaries survive the loss of one bus.',
    notice: 'If both are lost, the batteries keep protection and control working for several hours.',
    std: 'Appendix F: ST' + T + ', 400 V.', specs: [['Rating (typical)', '200–500 kVA']],
  }));

  /* ---------- building, site and safety ---------- */
  E.building = {
    name: 'Control building', kind: 'Switch room, control room, battery and capacitor rooms', id: 'Building',
    role: 'Houses the 22 kV switchboard, protection and control, batteries, the capacitor banks and communications. Use ‘Open roof’ to look inside.',
    notice: 'The 22 kV cables enter from the transformers through the west trench; feeder cables leave through the east trench.',
    std: 'Layout per project design.', specs: [],
  };
  E.ctrl = {
    name: 'Control and protection room', kind: 'Protection relays, control, SCADA', id: 'Control room',
    role: 'Protection relays (transformer differential, line distance, bus zone, overcurrent), control panels, the remote terminal unit that links the substation to the network control centre, and alarms.',
    notice: 'Protection works in milliseconds and on its own; operators switch from the control centre or from these panels.',
    std: 'Secondary systems per TasNetworks protection and control standards.', specs: [],
  };
  E.batt = {
    name: 'Battery room', kind: '110 V DC batteries and chargers', id: 'Battery room',
    role: 'Protection relays and breaker trip coils must work even when all AC is lost, so they run on DC from batteries. Chargers keep the batteries full from the station AC supply.',
    notice: 'Two separate systems for redundancy. The room is ventilated because lead-acid cells give off hydrogen while charging.',
    std: 'Secondary systems per project design.', specs: [['Voltage (typical)', '110 V DC'], ['Autonomy (typical)', '8–10 hours']],
  };
  E.comms = {
    name: 'Communications', kind: 'Comms room and radio tower', id: 'Comms',
    role: 'Optical fibre (often in the line earth wire, OPGW) and microwave radio links carry SCADA data, protection signalling between line ends, and voice.',
    notice: 'Line protection compares quantities at both ends of a line, so the comms links are part of the protection system.',
    std: 'Per project design.', specs: [],
  };
  E.amen = {
    name: 'Amenities and store', kind: 'Workshop, store, amenities', id: 'Store',
    role: 'Space for spares, test equipment, safety gear (earthing leads, insulated gloves, signs) and staff facilities.',
    notice: '', std: '', specs: [],
  };
  E.masts = {
    name: 'Lightning masts', kind: 'Shielding masts, about 22 m', id: 'Masts',
    role: 'Catch direct lightning strikes before they reach the equipment. Together with the gantry earth wires they form a protected zone, usually checked with the rolling-sphere method.',
    notice: 'Each mast is bonded straight into the earth grid.', std: 'Per project design.', specs: [['Height', 'about 22 m']],
  };
  E.fence = {
    name: 'Security fence', kind: 'Chain-mesh fence with barbed wire', id: 'Fence',
    role: 'Keeps the public out of the switchyard. It is earthed, and its distance from live parts follows the clearance rules of AS 2067 / IEC 61936-1.',
    notice: 'The vehicle gate is yellow; danger signs face outwards.', std: 'Per AS 2067 and project design.', specs: [['Height (typical)', '2.4 m + barbed wire']],
  };
  E.earthgrid = {
    name: 'Earth grid', kind: 'Buried copper mesh', id: 'Earth grid',
    role: 'Keeps touch and step voltages safe during an earth fault, and gives fault current a low-impedance path back to the source. Every structure, equipment frame, fence and mast is bonded to it.',
    notice: 'Shown here at 6 m spacing about 0.6 m deep. The crushed rock over the yard adds resistance between a person’s feet and the ground.',
    std: 'Designed to IEEE 80 / ENA EG-0 practice.', specs: [['Conductor (typical)', '120 mm² bare copper'], ['Depth (typical)', '0.6 m']],
  };
  E.trench = {
    name: 'Cable trench', kind: 'Covered concrete trench', id: 'Trench',
    role: 'Carries the 22 kV power cables and the control cables between the yard and the building.',
    notice: 'Power and control cables run on separate racks to limit interference.', std: '2.1.10 (R 590630): 22 kV cables 1C × 630 mm².', specs: [],
  };
  E.cond110 = {
    name: '110 kV conductors', kind: 'Stranded and tubular aluminium', id: '110 kV',
    role: 'Connect the equipment in a bay. Short connections are flexible stranded conductor; the buses are rigid tube.',
    notice: 'With Power flow on, live conductors glow copper, earthed ones green and dead ones grey.',
    std: '2.1.13 (R 517375): AAC ‘Uranus’ stranded, or solid / tubular pipe.', specs: [],
  };
  E.cable22 = {
    name: '22 kV cables', kind: 'XLPE insulated, single core', id: '22 kV',
    role: 'Carry the transformer output to the switchboard, and the feeders out to the network.',
    notice: 'Underground, so you see them only where they leave the transformer cable box.', std: '2.1.10 (R 590630): 1C × 630 mm², Prysmian.', specs: [],
  };
  SS.EQUIP = E;

  /* Which equipment a network node belongs to, for clicking on conductors. */
  SS.NODE_EQ = { LA: 'lineA', LB: 'lineB', BA: 'busA', BB: 'busB' };

  /* ---------- guided tour: follows the power from the lines to the feeders ---------- */
  SS.TOUR = [
    { eq: null, t: 'A zone substation', d: 'Two 110 kV lines come in on the left. Their power passes through the switchyard to two transformers, then at 22 kV through the switchboard in the building and out on the feeder cables on the right. Glowing dots show the power flow.', view: 'overview' },
    { eq: 'lineA', t: 'The lines arrive', d: 'Line A (top) and line B (bottom) come from different parts of the network. Each lands on a strain gantry, which takes the mechanical pull of the conductors.', cam: [-92, 34, 52], at: [-48, 8, 0] },
    { eq: 'A197', t: 'Measuring the line voltage', d: 'Capacitor voltage transformer A197 reports the line voltage to the relays. It sits on the line side of every switch, so it shows whether the line is live even when the bay is open.', cam: [-49, 9, -3.5], at: [-37, 4.5, -16] },
    { eq: 'A129', t: 'Line disconnector and earth switch', d: 'A129 gives a visible break between line and bay; A131 earths the line once it is dead. Neither can switch current, so both are interlocked with the breaker and the remote end.', cam: [-41, 8, -4], at: [-32.5, 3.6, -16] },
    { eq: 'A196', t: 'Current transformer', d: 'A196 feeds the line current to the protection relays and meters. Cores on both sides of the breaker overlap the protection zones.', cam: [-34, 7.5, -6], at: [-28.2, 4, -16] },
    { eq: 'A152', t: 'Line circuit breaker', d: 'A152 is the device that actually breaks fault current. Protection trips it in a few cycles. Its mechanism cabinet shows red when closed and green when open.', cam: [-30, 8.5, -3.5], at: [-24.2, 4, -16] },
    { eq: 'busA', t: 'The 110 kV buses', d: 'Each bay phase rises to its own bus tube. Bus A collects line A, transformer T1 and the bus section. The tubes are 7.4 m up so bay conductors pass beneath.', cam: [-34, 16, 8], at: [-12, 6, -14] },
    { eq: 'A752', t: 'The bus section: the bar of the ‘H’', d: 'A752 joins bus A to bus B. With it closed, either line can feed both transformers, which is why this arrangement survives the loss of a line without interrupting anyone.', cam: [-30, 12, 12], at: [-12, 4.5, 0] },
    { eq: 'A429A', t: 'Transformer disconnector and surge arresters', d: 'There is no 110 kV breaker for the transformer in an H arrangement. A429A isolates T1 but may only be operated with bus A dead. Arresters A45D clip surges right in front of the bushings.', cam: [-12, 8, -2.5], at: [-1.5, 4, -16] },
    { eq: 'T1', t: 'Power transformer T1', d: '60 MVA, 110 to 22 kV. Look for the conservator and Buchholz relay, the on-load tap changer at the near end, the radiators and fans at the far end, the 22 kV cable box and the oil bund.', cam: [-1, 12, 3], at: [8.6, 3.2, -16] },
    { eq: 'sb22', t: 'The 22 kV switchboard', d: 'Underground cables bring each transformer’s output into the building. Incomers A552 and B552 feed the two bus sections; A852 between them is normally open.', cam: [44, 13, 9], at: [31, 1.2, 0], roof: true },
    { eq: 'A252', t: 'Feeders out to customers', d: 'Six feeder breakers send 22 kV cables out through the east trench to the distribution network. Each has an earth switch for safe work on its cable.', cam: [56, 16, 18], at: [42, 0.5, 0], roof: true },
    { eq: 'cap1', t: 'Capacitor banks', d: 'Two 5 MVAr banks supply reactive power locally to hold up the 22 kV voltage and lighten the load on the transformers.', cam: [40, 14, 26], at: [36, 1.2, 12], roof: true },
    { eq: 'ctrl', t: 'Control, protection and batteries', d: 'Relays watch every circuit and trip the breakers on their own. Everything runs from 110 V DC batteries so it still works when AC is lost.', cam: [50, 14, 6], at: [40, 1.2, -2], roof: true },
    { eq: 'ST1', t: 'Station supply', d: 'ST1 and ST2, one on each 22 kV bus, supply the substation’s own 400 V needs: chargers, fans, tap-changer motors and lighting.', cam: [16, 7, -31], at: [24.5, 1.2, -22] },
    { eq: 'earthgrid', t: 'Keeping people safe', d: 'A buried copper grid bonds every structure together, the masts and earth wires catch lightning, and the fence keeps the public at a safe distance.', view: 'overview', earth: true },
  ];

  /* ---------- switching exercises ---------- */
  SS.SCENARIOS = [
    {
      id: 'lineA', level: 1, title: 'Fault on line A',
      story: 'Lightning has caused a permanent fault on line A. Its protection has tripped A152 here and the breaker at the remote end. Thanks to the bus section, T1 is still supplied from line B.',
      task: 'Make line A safe for the line crew: isolate it and earth it, keeping every customer supplied.',
      fault: ['LA'], trips: ['A152', 'remA'],
      hints: ['A disconnector may only operate when its breaker is open. A152 is already open.', 'An earth switch closes only onto a dead circuit. Is the remote end open?'],
      answer: ['Open A129', 'Close A131'],
      goals: [
        ['A129 open', (n) => !n.st.A129],
        ['A131 closed (line A earthed)', (n) => n.st.A131],
        ['All six customer feeders supplied', (n) => n.allCustomers()],
      ],
    },
    {
      id: 'busA', level: 2, title: 'Fault on 110 kV bus A',
      story: 'A flashover on a bus A post insulator. Bus protection has tripped every breaker connected to bus A: A152, A752 and A552. 22 kV bus A has lost supply.',
      task: 'Isolate bus A from all sides and get every customer back on supply.',
      fault: ['BA'], trips: ['A152', 'A752', 'A552'],
      hints: ['Bus A connects to three circuits: line A, the bus section and T1. Each has a disconnector next to the bus.', 'With T1 cut off, how can 22 kV bus A get supply from T2?'],
      answer: ['Open A129A', 'Open A729A', 'Open A429A', 'Close A852'],
      goals: [
        ['A129A open', (n) => !n.st.A129A],
        ['A729A open', (n) => !n.st.A729A],
        ['A429A open', (n) => !n.st.A429A],
        ['All six customer feeders supplied', (n) => n.allCustomers()],
      ],
    },
    {
      id: 'T1', level: 2, title: 'Transformer T1 trips',
      story: 'The Buchholz relay on T1 has operated: gas in the oil means an internal fault. With no 110 kV breaker of its own, T1 is cleared by tripping A152, A752 and A552, so bus A and 22 kV bus A are both dead.',
      task: 'Isolate T1, put line A and bus A back in service, and restore every customer from T2.',
      fault: ['T1H', 'T1L'], trips: ['A152', 'A752', 'A552'],
      hints: ['A429A may only operate with bus A dead and A552 open. Both are true right now, so isolate T1 first.', 'T2 can carry the whole load: 60 MVA is more than the 43 MW demand.'],
      answer: ['Open A429A', 'Close A152', 'Close A752', 'Close A852'],
      goals: [
        ['A429A open (T1 isolated on 110 kV)', (n) => !n.st.A429A],
        ['A552 open (T1 isolated on 22 kV)', (n) => !n.st.A552],
        ['Bus A back in service (A152 and A752 closed)', (n) => n.st.A152 && n.st.A752],
        ['All six customer feeders supplied', (n) => n.allCustomers()],
      ],
    },
    {
      id: 'C252', level: 1, title: 'Cable fault on feeder C252',
      story: 'An excavator has damaged the C252 cable. Its overcurrent protection has tripped C252, and its customers are off until the cable is repaired.',
      task: 'Make the cable safe for the jointers and keep everyone else on supply.',
      fault: ['FC'], trips: ['C252'],
      hints: ['C252 must stay open. Which device earths the cable at the switchboard?'],
      answer: ['Close C231'],
      goals: [
        ['C252 open', (n) => !n.st.C252],
        ['C231 closed (cable earthed)', (n) => n.st.C231],
        ['The other five customer feeders supplied', (n) => n.customersOn() >= 5],
      ],
    },
    {
      id: 'planT1', level: 3, title: 'Planned outage of T1',
      story: 'T1 is due for maintenance. The work must not interrupt a single customer.',
      task: 'Isolate T1 on both sides and earth its 22 kV cables, with no customer losing supply at any step, and finish with bus A back in service.',
      fault: [], trips: [],
      hints: ['First move the 22 kV bus A load across to T2 so T1 carries nothing.', 'A429A needs bus A dead. Opening A152 and A752 does that, and no customer depends on bus A once the load is on T2.', 'Once A429A is open, bus A can be restored, then the cable earth switch closed.'],
      answer: ['Close A852', 'Open A552', 'Open A152', 'Open A752', 'Open A429A', 'Close A152', 'Close A752', 'Close A531'],
      goals: [
        ['A429A open and A552 open', (n) => !n.st.A429A && !n.st.A552],
        ['A531 closed (T1 cables earthed)', (n) => n.st.A531],
        ['Bus A back in service', (n) => n.st.A152 && n.st.A752],
        ['No customer lost supply at any step', (n) => n.lost.size === 0],
      ],
    },
  ];

  /* ---------- the six arrangements in section 3 of the standard ---------- */
  SS.ARRANGEMENTS = [
    { id: 'bah', t: 'Breaker and a half', ref: '3.1 · Appendix A', use: 'Switching stations (EHV)', cb: '1.5 per circuit',
      good: 'Any one breaker or either bus can be taken out with no circuit lost. A bus fault interrupts nobody.', bad: 'Most breakers per circuit; protection and control are more complex.',
      svg: '<path d="M10 14H150M10 86H150"/><path d="M40 14V86M120 14V86"/><rect x="34" y="24" width="12" height="10"/><rect x="34" y="45" width="12" height="10"/><rect x="34" y="66" width="12" height="10"/><rect x="114" y="24" width="12" height="10"/><rect x="114" y="45" width="12" height="10"/><rect x="114" y="66" width="12" height="10"/><path d="M40 40H22M40 61H22M120 40H138M120 61H138"/>' },
    { id: 'db', t: 'Double bus', ref: '3.2 · Appendix B', use: 'Switching stations (EHV)', cb: '1 per circuit + coupler',
      good: 'Each circuit can be moved between two buses, so a bus can be maintained without an outage.', bad: 'A bus fault drops every circuit on that bus until they are moved across. Many disconnectors to switch.',
      svg: '<path d="M10 16H150M10 32H150"/><path d="M40 16V46M52 32V46M40 46H52M46 46V60"/><rect x="40" y="60" width="12" height="10"/><path d="M46 70V86"/><path d="M108 16V46M120 32V46M108 46H120M114 46V60"/><rect x="108" y="60" width="12" height="10"/><path d="M114 70V86"/><path d="M76 16V24M84 32V24"/><rect x="74" y="20" width="12" height="8"/>' },
    { id: 'gis', t: 'GIS double bus', ref: '3.3 · Appendix C', use: 'Where space is tight (EHV)', cb: '1 per circuit + coupler',
      good: 'Everything sits in earthed, SF6-filled metal enclosures: about a tenth of the area of an outdoor yard, and unaffected by pollution.', bad: 'Higher cost; repairs need the maker; SF6 is a strong greenhouse gas and must be handled carefully.',
      svg: '<rect class="enc" x="14" y="10" width="132" height="34" rx="6"/><path d="M22 20H138M22 32H138"/><path d="M46 20V58M114 32V58"/><rect x="40" y="58" width="12" height="10"/><rect x="108" y="58" width="12" height="10"/><path d="M46 68V86M114 68V86"/>' },
    { id: 'h', t: '‘H’ arrangement', ref: '3.4 · Appendix D', use: 'Through-fed zone substations (this model)', cb: '3 breakers for 2 lines + 2 transformers',
      good: 'Few breakers. Either line can feed both transformers through the bus section, so losing a line interrupts no one.', bad: 'No 110 kV breaker for a transformer: a transformer fault also trips its line and the bus section, and isolating a transformer needs the bus dead for a moment.',
      svg: '<path d="M40 8V92M120 8V92"/><rect x="34" y="24" width="12" height="10"/><rect x="114" y="24" width="12" height="10"/><path d="M40 50H120"/><rect x="74" y="45" width="12" height="10"/><circle cx="40" cy="74" r="7"/><circle cx="40" cy="82" r="7"/><circle cx="120" cy="74" r="7"/><circle cx="120" cy="82" r="7"/>' },
    { id: 'rad', t: 'Radial fed', ref: '3.5 · Appendix E', use: 'Small or remote loads', cb: '1',
      good: 'Simplest and cheapest.', bad: 'A fault on the single line or transformer interrupts every customer until it is repaired.',
      svg: '<path d="M80 8V92"/><rect x="74" y="26" width="12" height="10"/><circle cx="80" cy="62" r="8"/><circle cx="80" cy="72" r="8"/><path d="M50 92H110"/>' },
    { id: 'sb', t: 'Single bus, sectionalised', ref: '3.6 · Appendix F', use: '33, 22 and 11 kV switchboards (this model)', cb: '1 per circuit + bus section',
      good: 'Simple and compact. With the bus split in two, a fault on one section leaves the other in service.', bad: 'A bus-section fault interrupts every feeder on that section until it is isolated.',
      svg: '<path d="M10 30H72M88 30H150"/><rect x="74" y="25" width="12" height="10"/><path d="M28 30V52M52 30V52M108 30V52M132 30V52"/><rect x="22" y="52" width="12" height="10"/><rect x="46" y="52" width="12" height="10"/><rect x="102" y="52" width="12" height="10"/><rect x="126" y="52" width="12" height="10"/><path d="M28 62V88M52 62V88M108 62V88M132 62V88M40 8V30M120 8V30"/>' },
  ];
})();
