/* Electrica Substation: the electrical network behind the model.
   Nodes are pieces of conductor that are always connected together (a bus, the conductor
   between two switches). Devices join nodes: breakers (cb) and disconnectors (ds) when
   closed, transformers (tx) always. Earth switches (es) connect a node to earth. The two
   line sources (src) are the breakers at the remote ends of the lines.

   The logic here works out what is live and what is earthed, applies the interlocks, trips
   breakers that close onto a fault, and shares the feeder loads between the two lines to
   get the power flow through every device. */
(function () {
  const SS = (window.SS = window.SS || {});
  const FEED = SS.FEEDERS;

  const KV = { LA: 110, A1: 110, A2: 110, BA: 110, LB: 110, B1: 110, B2: 110, BB: 110, S1: 110, S2: 110, T1H: 110, T2H: 110, T1L: 22, T2L: 22, QA: 22, QB: 22 };
  Object.keys(FEED).forEach((id) => { KV['F' + id[0]] = 22; });

  const DEV = {};
  function def(o) { DEV[o.id] = Object.assign({ needOpen: [], needDead: [], esBlock: [], normal: o.kind !== 'es' }, o); }
  /* remote ends of the lines */
  def({ id: 'remA', kind: 'src', node: 'LA' });
  def({ id: 'remB', kind: 'src', node: 'LB' });
  /* 110 kV */
  def({ id: 'A129', kind: 'ds', a: 'LA', b: 'A1', needOpen: ['A152'], esBlock: ['A131'] });
  def({ id: 'A152', kind: 'cb', a: 'A1', b: 'A2' });
  def({ id: 'A129A', kind: 'ds', a: 'A2', b: 'BA', needOpen: ['A152'] });
  def({ id: 'B129', kind: 'ds', a: 'LB', b: 'B1', needOpen: ['B152'], esBlock: ['B131'] });
  def({ id: 'B152', kind: 'cb', a: 'B1', b: 'B2' });
  def({ id: 'B129B', kind: 'ds', a: 'B2', b: 'BB', needOpen: ['B152'] });
  def({ id: 'A729A', kind: 'ds', a: 'BA', b: 'S1', needOpen: ['A752'] });
  def({ id: 'A752', kind: 'cb', a: 'S1', b: 'S2' });
  def({ id: 'A729B', kind: 'ds', a: 'S2', b: 'BB', needOpen: ['A752'] });
  def({ id: 'A429A', kind: 'ds', a: 'BA', b: 'T1H', needOpen: ['A552'], needDead: ['BA'] });
  def({ id: 'B429B', kind: 'ds', a: 'BB', b: 'T2H', needOpen: ['B552'], needDead: ['BB'] });
  def({ id: 'T1', kind: 'tx', a: 'T1H', b: 'T1L' });
  def({ id: 'T2', kind: 'tx', a: 'T2H', b: 'T2L' });
  def({ id: 'A131', kind: 'es', node: 'LA', needOpen: ['A129'], needDead: ['LA'] });
  def({ id: 'B131', kind: 'es', node: 'LB', needOpen: ['B129'], needDead: ['LB'] });
  /* 22 kV */
  def({ id: 'A552', kind: 'cb', a: 'T1L', b: 'QA' });
  def({ id: 'B552', kind: 'cb', a: 'T2L', b: 'QB' });
  def({ id: 'A852', kind: 'cb', a: 'QA', b: 'QB', normal: false });
  def({ id: 'A531', kind: 'es', node: 'T1L', needOpen: ['A552'], needDead: ['T1L'] });
  def({ id: 'B531', kind: 'es', node: 'T2L', needOpen: ['B552'], needDead: ['T2L'] });
  const onBus = { A: ['A552', 'A852'], B: ['B552', 'A852'] };
  Object.keys(FEED).forEach((id) => {
    const f = FEED[id], L = id[0];
    def({ id: id, kind: 'cb', a: 'Q' + f.bus, b: 'F' + L });
    def({ id: L + '231', kind: 'es', node: 'F' + L, needOpen: [id], needDead: ['F' + L] });
    onBus[f.bus].push(id);
  });
  def({ id: 'A831', kind: 'es', node: 'QA', needOpen: onBus.A, needDead: ['QA'] });
  def({ id: 'B831', kind: 'es', node: 'QB', needOpen: onBus.B, needDead: ['QB'] });

  const EDGES = Object.values(DEV).filter((d) => d.a);
  const SOURCES = Object.values(DEV).filter((d) => d.kind === 'src');
  const EARTHS = Object.values(DEV).filter((d) => d.kind === 'es');
  const CUST = Object.keys(FEED).filter((id) => FEED[id].what === 'cust');
  const NODE_NAME = {
    LA: 'line A', LB: 'line B', BA: 'bus A', BB: 'bus B', QA: '22 kV bus A', QB: '22 kV bus B',
    T1H: 'T1', T1L: 'the T1 22 kV cables', T2H: 'T2', T2L: 'the T2 22 kV cables',
  };
  Object.keys(FEED).forEach((id) => { NODE_NAME['F' + id[0]] = 'the ' + id + ' cable'; });

  function normalState() {
    const st = {};
    Object.values(DEV).forEach((d) => { if (d.kind !== 'tx') st[d.id] = d.normal; });
    return st;
  }

  /* What is live and what is earthed for a given set of switch positions. */
  function solve(st) {
    const adj = {};
    Object.keys(KV).forEach((n) => { adj[n] = []; });
    EDGES.forEach((d) => {
      if (d.kind === 'tx' || st[d.id]) { adj[d.a].push([d.b, d]); adj[d.b].push([d.a, d]); }
    });
    const live = new Set(), q = [];
    SOURCES.forEach((s) => { if (st[s.id] && !live.has(s.node)) { live.add(s.node); q.push(s.node); } });
    while (q.length) { const u = q.shift(); adj[u].forEach(([v]) => { if (!live.has(v)) { live.add(v); q.push(v); } }); }
    const earthed = new Set(), q2 = [];
    EARTHS.forEach((e) => { if (st[e.id] && !earthed.has(e.node)) { earthed.add(e.node); q2.push(e.node); } });
    while (q2.length) { const u = q2.shift(); adj[u].forEach(([v, d]) => { if (d.kind !== 'tx' && !earthed.has(v)) { earthed.add(v); q2.push(v); } }); }
    return { live: live, earthed: earthed, adj: adj };
  }

  /* Share each load equally between the line sources that can reach it, along the shortest
     path to each; signed power (MW) per device, positive in its normal direction a -> b. */
  function powerFlow(st, sol, supplied) {
    const flow = {}, lineMW = { A: 0, B: 0 };
    EDGES.forEach((d) => { flow[d.id] = 0; });
    Object.keys(FEED).forEach((id) => {
      const f = FEED[id];
      if (!f.mw || !supplied[id]) return;
      const start = 'F' + id[0], par = {}, seen = new Set([start]), q = [start];
      while (q.length) {
        const u = q.shift();
        sol.adj[u].forEach(([v, d]) => { if (!seen.has(v)) { seen.add(v); par[v] = [u, d]; q.push(v); } });
      }
      const srcs = SOURCES.filter((s) => st[s.id] && seen.has(s.node));
      if (!srcs.length) return;
      const share = f.mw / srcs.length;
      srcs.forEach((s) => {
        lineMW[s.id.slice(-1)] += share;
        let u = s.node;
        while (u !== start) {
          const [p, d] = par[u];
          flow[d.id] += d.a === u ? share : -share;
          u = p;
        }
      });
    });
    return { flow: flow, lineMW: lineMW };
  }

  const fmtList = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const label = (id) => (DEV[id] && DEV[id].kind === 'src' ? 'the remote end of line ' + id.slice(-1) : id);

  function Network() {
    this.st = normalState();
    this.fault = [];
    this.lost = new Set();
    this.undoStack = [];
    this.log = [];
    this.listeners = [];
    this.refresh();
  }
  Network.prototype = {
    DEV: DEV, KV: KV, FEED: FEED, CUST: CUST,
    on: function (fn) { this.listeners.push(fn); },
    emit: function (ev) { this.listeners.forEach((fn) => fn(ev || {})); },
    refresh: function () {
      const sol = solve(this.st), sup = {};
      Object.keys(FEED).forEach((id) => {
        const n = 'F' + id[0];
        sup[id] = sol.live.has(n) && !sol.earthed.has(n) && this.fault.indexOf(n) < 0;
      });
      const pf = powerFlow(this.st, sol, sup);
      this.sol = sol; this.supplied = sup; this.flow = pf.flow; this.lineMW = pf.lineMW;
      this.faultLive = this.fault.some((n) => sol.live.has(n));
    },
    isLive: function (n) { return this.sol.live.has(n); },
    nodeState: function (n) {
      if (this.sol.earthed.has(n)) return 'earthed';
      if (this.sol.live.has(n)) return KV[n] === 22 ? 'l22' : 'l110';
      return 'dead';
    },
    customersOn: function () { return CUST.filter((id) => this.supplied[id]).length; },
    allCustomers: function () { return this.customersOn() === CUST.length; },
    txMW: function (t) { return Math.abs(this.flow[t] || 0); },
    nodeName: function (n) { return NODE_NAME[n] || 'that section'; },
    label: label,

    /* Can this device be operated now? { ok, reason } */
    check: function (id) {
      const d = DEV[id];
      if (!d || d.kind === 'tx') return { ok: false, reason: '' };
      const closing = !this.st[id], st = this.st, sol = this.sol;
      if (d.kind === 'ds' || (d.kind === 'es' && closing)) {
        const shut = d.needOpen.filter((c) => st[c]);
        if (shut.length) {
          const why = d.kind === 'ds' ? 'a disconnector cannot make or break load current.' : 'an earth switch may only close onto an isolated circuit.';
          return { ok: false, reason: 'Interlock: open ' + fmtList(shut) + ' first; ' + why };
        }
        const liveN = d.needDead.filter((n) => sol.live.has(n));
        if (liveN.length) {
          const n = liveN[0];
          let extra = '';
          if (n === 'BA' || n === 'BB') extra = ' Open ' + (n === 'BA' ? 'A152' : 'B152') + ' and A752 to make it dead.';
          if (n === 'LA' || n === 'LB') extra = ' The remote end is still closed.';
          if (n === 'T1L' || n === 'T2L') extra = ' Isolate the transformer on its 110 kV side first.';
          return { ok: false, reason: 'Interlock: ' + this.nodeName(n) + ' is still live.' + extra };
        }
      }
      if (d.kind === 'ds' && closing) {
        const es = d.esBlock.filter((e) => st[e]);
        if (es.length) return { ok: false, reason: 'Interlock: open earth switch ' + fmtList(es) + ' first (mechanical interlock).' };
      }
      if (closing && d.kind !== 'es') {
        const t = Object.assign({}, st); t[id] = true;
        const s2 = solve(t);
        const hit = EARTHS.filter((e) => st[e.id] && s2.live.has(e.node)).map((e) => e.id);
        if (hit.length) return { ok: false, reason: 'Blocked: closing ' + label(id) + ' would make an earthed section live. Earth switch ' + fmtList(hit) + ' is closed.' };
      }
      return { ok: true, reason: '' };
    },

    operate: function (id) {
      const d = DEV[id], c = this.check(id);
      if (!c.ok) { this.emit({ type: 'blocked', id: id, msg: c.reason }); return c; }
      this.undoStack.push({ st: Object.assign({}, this.st), lost: new Set(this.lost), log: this.log.length });
      const before = Object.assign({}, this.supplied);
      const closing = !this.st[id];
      this.st[id] = closing;
      this.refresh();
      let msg = (closing ? 'Closed ' : 'Opened ') + label(id) + '.';
      let kind = 'op';
      if (closing && this.faultLive) {
        this.st[id] = false; this.refresh();
        msg = label(id).replace(/^the/, 'The') + ' closed onto the fault and tripped at once (switch-onto-fault protection).';
        kind = 'trip';
      }
      const dropped = CUST.filter((f) => before[f] && !this.supplied[f]);
      const back = CUST.filter((f) => !before[f] && this.supplied[f]);
      dropped.forEach((f) => this.lost.add(f));
      if (dropped.length) msg += ' Customers on ' + fmtList(dropped) + ' lost supply.';
      if (back.length) msg += ' ' + fmtList(back) + ' back on supply.';
      this.addLog(msg, kind);
      this.emit({ type: kind, id: id, msg: msg });
      return { ok: true, msg: msg };
    },
    undo: function () {
      const s = this.undoStack.pop();
      if (!s) return false;
      this.st = s.st; this.lost = s.lost; this.log.length = s.log;
      this.refresh(); this.emit({ type: 'undo', msg: 'Undid the last operation.' });
      return true;
    },
    reset: function (quiet) {
      this.st = normalState(); this.fault = []; this.lost = new Set(); this.undoStack = []; this.log = [];
      this.refresh();
      if (!quiet) { this.addLog('Normal state: every breaker closed except bus section A852.', 'info'); this.emit({ type: 'reset', msg: 'Back to the normal state.' }); }
    },
    startScenario: function (sc) {
      this.reset(true);
      this.fault = sc.fault.slice();
      sc.trips.forEach((t) => { this.st[t] = false; });
      this.refresh();
      const names = sc.trips.map((t) => (t[0] === 'r' ? 'the line ' + t.slice(-1) + ' remote end' : t));
      const msg = sc.trips.length ? 'Protection operated: ' + fmtList(names) + ' tripped.' : 'Normal state. Plan your switching.';
      this.addLog(msg, sc.trips.length ? 'trip' : 'info');
      this.emit({ type: 'scenario', msg: msg });
    },
    addLog: function (msg, kind) {
      const t = new Date();
      this.log.push({ t: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0'), msg: msg, kind: kind || 'op' });
    },
  };
  SS.Network = Network;
  SS.DEV = DEV;
})();
