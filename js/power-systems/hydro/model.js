/* Electrica Hydro: the plant model. Numbers only, no drawing: heads, flows, turbine efficiency,
   power, and the mass oscillation in the surge tank. Everything the page shows comes from here.
   Levels are in metres above sea level (RL), flows in m³/s, power in MW. */
(function () {
  const HY = (window.HY = window.HY || {});

  const P = (HY.PLANT = {
    TWL: 400,              // tailwater level
    FRL: 505,              // full reservoir level
    MDDL: 475,             // minimum drawdown level: below this the intake would draw air
    CREST: 512,            // top of the dam
    SPILL: 497,            // spillway crest
    Hr: 100,               // rated net head
    Qr: 45,                // rated flow of one unit
    units: 3,
    poles: 20, f: 50,      // 20 poles at 50 Hz: 300 rpm
    rho: 1000, g: 9.81, etaGen: 0.98,
    cTunnel: 2.0 / (135 * 135),   // head lost in the tunnel, h = c Q²: 2.0 m at full flow
    cPen: 1.5 / (135 * 135),      // and in the penstock: 1.5 m at full flow
    L: 1800, At: 28.3,            // tunnel length and area (6 m diameter)
    As: 300,                      // surge tank area (19.5 m diameter)
    spillC: 2.1, spillL: 40,      // ogee crest, Q = C L h^1.5, four 10 m bays
    gateRate: 0.1,                // the governor moves the wicket gates at most 10% per second
    timeLapse: 20,                // the surge is shown 20 times faster than real (its real period is about 4.5 min)
  });
  HY.speedRpm = (120 * P.f) / P.poles;

  /* Francis turbine efficiency against the fraction of rated flow: best near 85%, poorer at part load. */
  HY.eta = function (q) {
    if (q <= 0.02) return 0;
    let e = 0.94 - 0.5 * (q - 0.85) * (q - 0.85);
    if (q < 0.35) e -= (0.35 - q) * 1.2;
    return Math.max(0, Math.min(0.95, e));
  };
  HY.spillFlow = (level, open) => (open && level > P.SPILL ? P.spillC * P.spillL * Math.pow(level - P.SPILL, 1.5) : 0);

  /* The running plant. Call set() with the operator's settings and step(dt) with real seconds. */
  HY.Sim = function () {
    this.level = 502; this.gateCmd = 0.85; this.unitsOn = 3; this.spill = false;
    this.gate = [0, 0, 0]; this.spin = [0, 0, 0];
    this.settle();
  };
  HY.Sim.prototype = {
    online(k) { return k < this.unitsOn; },
    /* the flow through each unit for a given net head */
    unitFlow(k, hNet) { return P.Qr * this.gate[k] * Math.sqrt(Math.max(0, hNet) / P.Hr); },
    totalFlow(zs) {
      /* the units and the penstock loss depend on each other: two passes are plenty */
      let Q = 0;
      for (let pass = 0; pass < 3; pass++) {
        const hNet = zs - P.cPen * Q * Q - P.TWL;
        Q = 0; for (let k = 0; k < P.units; k++) Q += this.unitFlow(k, hNet);
      }
      return Q;
    },
    /* jump straight to the steady state (used at start and when the reservoir level is moved) */
    settle() {
      for (let k = 0; k < P.units; k++) { this.gate[k] = this.online(k) ? this.gateCmd : 0; this.spin[k] = this.gate[k] > 0.03 ? 1 : 0; }
      this.settleSurge();
    },
    /* the tunnel and surge tank at rest for the gates as they are now (used when the reservoir level moves) */
    settleSurge() {
      let zs = this.level;
      for (let i = 0; i < 6; i++) { const Q = this.totalFlow(zs); zs = this.level - P.cTunnel * Q * Q; }
      this.zs = zs; this.Qt = this.totalFlow(zs);
    },
    step(dtReal) {
      const dtSim = Math.min(0.1, dtReal) * P.timeLapse;
      const n = Math.max(1, Math.ceil(dtSim / 0.5)), h = dtSim / n;
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < P.units; k++) {
          const target = this.online(k) ? this.gateCmd : 0, d = target - this.gate[k], m = P.gateRate * h;
          this.gate[k] += Math.max(-m, Math.min(m, d));
        }
        const Qp = this.totalFlow(this.zs);
        /* tunnel: the water column speeds up or slows down with the head across it */
        const dQ = ((P.g * P.At) / P.L) * (this.level - this.zs - P.cTunnel * this.Qt * Math.abs(this.Qt));
        this.Qt += dQ * h;
        /* surge tank: whatever the tunnel brings and the penstock does not take, raises the level */
        this.zs += ((this.Qt - Qp) / P.As) * h;
      }
      /* the runners spin up and coast down (shown in real seconds, not time-lapsed) */
      for (let k = 0; k < P.units; k++) {
        const t = this.gate[k] > 0.03 ? 1 : 0, r = t ? 0.6 : 0.35;
        this.spin[k] += (t - this.spin[k]) * Math.min(1, dtReal * r);
      }
    },
    /* everything the page shows, worked from the present state */
    read() {
      const Q = this.totalFlow(this.zs), hNet = this.zs - P.cPen * Q * Q - P.TWL;
      const units = [];
      let mw = 0;
      for (let k = 0; k < P.units; k++) {
        const q = this.unitFlow(k, hNet), eta = HY.eta(q / P.Qr);
        const p = (P.rho * P.g * q * hNet * eta * P.etaGen) / 1e6;
        units.push({ on: this.online(k), gate: this.gate[k], Q: q, eta: eta, MW: p, spin: this.spin[k] });
        mw += p;
      }
      const on = units.filter((u) => u.Q > 0.5);
      /* net head = gross head − friction in the tunnel and penstock + how far the surge tank stands above its resting level */
      const friction = (P.cTunnel + P.cPen) * Q * Q, swing = this.zs - (this.level - P.cTunnel * Q * Q);
      return {
        level: this.level, gross: this.level - P.TWL, net: hNet, friction: friction, swing: swing,
        Q: Q, Qunit: on.length ? Q / on.length : 0, eta: on.length ? on.reduce((a, u) => a + u.eta, 0) / on.length : 0,
        MW: mw, units: units, running: on.length, surge: this.zs, Qt: this.Qt,
        spill: HY.spillFlow(this.level, this.spill), rpm: HY.speedRpm,
        ns: (HY.speedRpm * Math.sqrt(40000)) / Math.pow(P.Hr, 1.25),
      };
    },
  };
})();
