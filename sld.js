/* Electrica Substation: the live single-line diagram.
   Draws the H arrangement (after Appendix D) feeding the sectionalised 22 kV single bus
   (after Appendix F). Every wire is tagged with its network node and recoloured on each
   update; every switch symbol shows its position and can be clicked. */
(function () {
  const SS = (window.SS = window.SS || {});
  const NS = 'http://www.w3.org/2000/svg';

  SS.SLD = function (svg, net, onPick) {
    const out = [];          // SVG source, built once
    const wires = [];        // { node }
    const hits = {};         // id -> [x, y, w, h]
    let k = 0;
    const W = (node, d, cls) => { out.push('<path class="w ' + (cls || '') + '" data-w="' + (k++) + '" d="' + d + '"/>'); wires.push(node); };
    const T = (x, y, s, cls, anchor) => out.push('<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>');
    const hit = (id, x, y, w, h, tip) => { hits[id] = [x, y, w, h]; out.push('<rect class="hit" data-id="' + id + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"><title>' + tip + '</title></rect>'); };
    const MW = (key, x, y, anchor) => out.push('<text class="mw" data-mw="' + key + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '></text>');
    const earth = (x, y) => out.push('<path class="g" d="M' + (x - 5) + ' ' + y + 'h10M' + (x - 3) + ' ' + (y + 2.6) + 'h6M' + (x - 1.2) + ' ' + (y + 5.2) + 'h2.4"/>');

    /* breaker: square centred on x, y */
    function cb(id, x, y, tip) {
      out.push('<rect class="cb" data-d="' + id + '" x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" rx="1.5"/>');
      hit(id, x - 11, y - 11, 22, 22, tip || id + ' circuit breaker');
    }
    /* disconnector between (x - 9) and (x + 9), or vertical */
    function ds(id, x, y, vert, tip) {
      const rot = vert ? ' transform="rotate(90 ' + x + ' ' + y + ')"' : '';
      out.push('<g' + rot + '><circle class="tm" cx="' + (x - 9) + '" cy="' + y + '" r="2"/><circle class="tm" cx="' + (x + 9) + '" cy="' + y + '" r="2"/>' +
        '<line class="bl" data-d="' + id + '" x1="' + (x - 9) + '" y1="' + y + '" x2="' + (x + 9) + '" y2="' + y + '" style="transform-origin:' + (x - 9) + 'px ' + y + 'px"/></g>');
      hit(id, x - 12, y - 12, 24, 24, tip || id + ' disconnector');
    }
    /* earth switch hanging below (dir 1) or above (dir -1) a node point */
    function es(id, node, x, y, dir, len, tip) {
      len = len || 16; dir = dir || 1;
      const c = y + dir * 5, p = y + dir * len;
      W(node, 'M' + x + ' ' + y + 'V' + c);
      out.push('<circle class="tm" cx="' + x + '" cy="' + c + '" r="1.6"/><line class="eb" data-d="' + id + '" x1="' + x + '" y1="' + p + '" x2="' + x + '" y2="' + c + '" style="transform-origin:' + x + 'px ' + p + 'px"/>');
      earth(x, dir > 0 ? p + 1 : p - 6);
      hit(id, x - 9, Math.min(y, p) - 2, 18, Math.abs(p - y) + 10, tip || id + ' earth switch');
    }
    function ct(node, x, y, vert) { out.push('<circle class="ct" data-n="' + node + '" cx="' + x + '" cy="' + y + '" r="4.5"/>'); }
    function vt(x, y) { out.push('<circle class="vt" cx="' + x + '" cy="' + (y - 2.5) + '" r="4"/><circle class="vt" cx="' + x + '" cy="' + (y + 3) + '" r="4"/>'); earth(x, y + 9); }

    const XB = 310, X22 = 590;
    const ROW = { A: 74, B: 252 };

    /* ---------- 110 kV: two line chains, the buses and the bus section ---------- */
    ['A', 'B'].forEach((L) => {
      const y = ROW[L], N = L === 'A' ? '1' : '2', BUS = L === 'A' ? 'BA' : 'BB', LN = 'L' + L;
      const by = L === 'A' ? [30, 118] : [208, 296];
      /* source and remote end */
      out.push('<circle class="src" cx="16" cy="' + y + '" r="8"/><path class="srcw" d="M11 ' + y + 'q2.5 -4 5 0t5 0"/>');
      W('src' + L, 'M24 ' + y + 'H37');
      cb('rem' + L, 44, y, 'Remote end of line ' + L + ' (in another substation)');
      T(44, y + 22, 'remote end', 'tiny', 'middle');
      W(LN, 'M51 ' + y + 'H131');
      out.push('<path class="brk" d="M58 ' + (y - 5) + 'l4 10M63 ' + (y - 5) + 'l4 10"/>');
      T(56, y - 24, '110 kV LINE ' + L, 'lbl');
      /* line CVT */
      W(LN, 'M86 ' + y + 'V' + (y + 9));
      out.push('<path class="vt" d="M80 ' + (y + 9) + 'h12M80 ' + (y + 12.5) + 'h12"/>');
      W(LN, 'M86 ' + (y + 12.5) + 'V' + (y + 17));
      vt(86, y + 22); T(94, y + 34, L + '197', 'tiny');
      hit(L + '197', 77, y + 6, 18, 30, L + '197 line voltage transformer');
      /* line earth switch and disconnector */
      es(L + '131', LN, 112, y, 1, 16, L + '131 line earth switch');
      T(118, y + 20, L + '131', 'tiny');
      ds(L + '129', 140, y); T(140, y - 10, L + '129', 'id', 'middle');
      W(L + '1', 'M149 ' + y + 'H189');
      ct(L + '1', 168, y); hit(L + '196', 162, y - 7, 12, 14, L + '196 current transformer');
      cb(L + '152', 196, y); T(196, y - 12, L + '152', 'id', 'middle');
      W(L + '2', 'M203 ' + y + 'H247');
      ct(L + '2', 224, y);
      ds(L + '129' + L, 256, y); T(256, y - 10, L + '129' + L, 'id', 'middle');
      W(BUS, 'M265 ' + y + 'H' + XB);
      MW('line' + L, 210, y + 22, 'middle');
      /* bus bar and bus VT */
      W(BUS, 'M' + XB + ' ' + by[0] + 'V' + by[1], 'bus');
      hit('bus' + L, XB - 6, by[0], 12, by[1] - by[0], '110 kV bus ' + L);
      if (L === 'A') T(XB, by[0] - 6, 'BUS A', 'lbl', 'middle'); else T(XB, by[1] + 13, 'BUS B', 'lbl', 'middle');
      const vy = L === 'A' ? 104 : 282;
      W(BUS, 'M' + XB + ' ' + vy + 'H295');
      vt(290, vy - 3);
      hit(L + '797', 280, vy - 12, 20, 30, L + '797 bus voltage transformer');
      T(290, vy + 22, L + '797', 'tiny', 'middle');
      /* transformer chain */
      W(BUS, 'M' + XB + ' ' + y + 'H341');
      ds(L + '429' + L, 350, y); T(350, y - 10, L + '429' + L, 'id', 'middle');
      W('T' + N + 'H', 'M359 ' + y + 'H401');
      W('T' + N + 'H', 'M378 ' + y + 'V' + (y + 8));
      out.push('<rect class="sa" x="375" y="' + (y + 8) + '" width="6" height="11" rx="1"/><path class="g" d="M378 ' + (y + 10) + 'v7"/>');
      earth(378, y + 21); hit(L + '45D', 370, y + 4, 16, 24, L + '45D surge arresters'); T(371, y + 17, L + '45D', 'tiny', 'end');
      out.push('<circle class="tx" data-n="T' + N + 'H" cx="412" cy="' + y + '" r="11"/><circle class="tx" data-n="T' + N + 'L" cx="426" cy="' + y + '" r="11"/>');
      hit('T' + N, 399, y - 13, 40, 26, 'T' + N + ' power transformer, 60 MVA');
      T(419, y - 17, 'T' + N, 'id', 'middle'); T(419, y + 24, '60 MVA', 'tiny', 'middle');
      MW('T' + N, 419, y + 35, 'middle');
      W('T' + N + 'L', 'M437 ' + y + 'H533');
      es(L + '531', 'T' + N + 'L', 468, y, 1, 16, L + '531 transformer cable earth switch'); T(474, y + 20, L + '531', 'tiny');
      cb(L + '552', 540, y); T(540, y - 12, L + '552', 'id', 'middle');
      W('Q' + L, 'M547 ' + y + 'H' + X22);
    });
    /* bus section, the bar of the H */
    W('BA', 'M' + XB + ' 118V125');
    ds('A729A', XB, 134, true); T(XB + 12, 137, 'A729A', 'id');
    W('S1', 'M' + XB + ' 143V163'); ct('S1', XB, 152); hit('A796', XB - 7, 146, 14, 12, 'A796 bus section current transformer');
    cb('A752', XB, 170); T(XB + 12, 173, 'A752', 'id');
    MW('A752', XB + 12, 184);
    W('S2', 'M' + XB + ' 177V183');
    ds('A729B', XB, 192, true); T(XB + 12, 195, 'A729B', 'id');
    W('BB', 'M' + XB + ' 201V208');

    /* ---------- 22 kV room ---------- */
    out.push('<rect class="room" x="496" y="4" width="678" height="322" rx="6"/>');
    T(504, 296, '22 kV', 'lbl'); T(504, 308, 'SWITCH ROOM', 'lbl');
    W('QA', 'M' + X22 + ' 10V134', 'bus'); hit('sb22', X22 - 6, 10, 12, 124, '22 kV bus A'); T(X22 - 10, 146, 'BUS A', 'lbl', 'end');
    W('QB', 'M' + X22 + ' 196V320', 'bus'); hit('sb22b', X22 - 6, 196, 12, 124, '22 kV bus B'); T(X22 - 10, 192, 'BUS B', 'lbl', 'end');
    W('QA', 'M' + X22 + ' 134V158');
    cb('A852', X22, 165); T(X22 + 12, 163, 'A852', 'id'); T(X22 + 12, 174, 'bus section', 'tiny');
    MW('A852', X22 - 10, 168, 'end');
    W('QB', 'M' + X22 + ' 172V196');
    W('QA', 'M' + X22 + ' 116H568'); es('A831', 'QA', 568, 116, 1, 14, 'A831 bus earth switch'); T(560, 130, 'A831', 'tiny', 'end');
    W('QB', 'M' + X22 + ' 214H568'); es('B831', 'QB', 568, 214, 1, 14, 'B831 bus earth switch'); T(560, 228, 'B831', 'tiny', 'end');
    const rowsA = ['A252', 'B252', 'C252', 'D252', 'K252'], rowsB = ['E252', 'F252', 'G252', 'H252', 'L252'];
    [[rowsA, 18], [rowsB, 204]].forEach(([ids, y0]) => {
      ids.forEach((id, i) => {
        const f = SS.FEEDERS[id], y = y0 + i * 26, L = id[0], n = 'F' + L;
        W('Q' + f.bus, 'M' + X22 + ' ' + y + 'H623');
        cb(id, 630, y, id + ' ' + f.to.toLowerCase()); T(630, y - 9, id, 'id', 'middle');
        W(n, 'M637 ' + y + 'H716'); ct(n, 660, y);
        es(L + '231', n, 688, y, 1, 13, L + '231 earth switch'); T(694, y + 14, L + '231', 'tiny');
        if (f.what === 'cust') out.push('<path class="arr" data-n="' + n + '" d="M716 ' + (y - 4.5) + 'L725 ' + y + 'L716 ' + (y + 4.5) + 'Z"/>');
        else if (f.what === 'st') out.push('<circle class="tx" data-n="' + n + '" cx="721" cy="' + y + '" r="5"/><circle class="tx" data-n="' + n + '" cx="728" cy="' + y + '" r="5"/>');
        else out.push('<path class="cap" data-n="' + n + '" d="M718 ' + (y - 6) + 'v12M723 ' + (y - 6) + 'v12"/>');
        const what = f.what === 'cust' ? 'Feeder to customers' : f.to;
        const val = f.mw ? f.mw + ' MW' : f.mvar + ' MVAr';
        out.push('<text class="fd" data-f="' + id + '" x="744" y="' + (y + 4) + '">' + what + ' <tspan class="fv">' + val + '</tspan></text>');
      });
    });
    /* fault marker */
    out.push('<g id="sldFault" class="fault" hidden><path d="M0 -9 L-4 1 L0 1 L-2 9 L5 -2 L1 -2 L3 -9 Z"/></g>');
    out.push('<rect id="sldSel" class="sel" x="0" y="0" width="0" height="0" rx="5"/>');
    svg.innerHTML = out.join('');

    const wireEls = Array.from(svg.querySelectorAll('[data-w]'));
    const devEls = Array.from(svg.querySelectorAll('[data-d]'));
    const nodeEls = Array.from(svg.querySelectorAll('[data-n]'));
    const mwEls = Array.from(svg.querySelectorAll('[data-mw]'));
    const fdEls = Array.from(svg.querySelectorAll('[data-f]'));
    const faultEl = svg.querySelector('#sldFault'), selEl = svg.querySelector('#sldSel');
    const FAULT_AT = { LA: [72, ROW.A - 12], BA: [XB + 14, 44], T1H: [419, ROW.A], T1L: [419, ROW.A], FC: [736, 70], LB: [72, ROW.B - 12], BB: [XB + 14, 222] };

    svg.addEventListener('click', (e) => {
      const h = e.target.closest('.hit');
      onPick(h ? (h.dataset.id === 'sb22b' ? 'sb22' : h.dataset.id) : null, h);
    });

    const fmw = (v) => (Math.abs(v) < 0.05 ? '' : Math.abs(v).toFixed(1) + ' MW');
    function update() {
      const st = net.st;
      wireEls.forEach((el, i) => {
        const n = wires[i];
        const s = n.indexOf('src') === 0 ? (st['rem' + n.slice(-1)] ? 'l110' : 'dead') : net.nodeState(n);
        el.setAttribute('class', el.getAttribute('class').replace(/ ?s-\w+/g, '') + ' s-' + s);
      });
      nodeEls.forEach((el) => { el.setAttribute('class', el.getAttribute('class').replace(/ ?s-\w+/g, '') + ' s-' + net.nodeState(el.dataset.n)); });
      devEls.forEach((el) => {
        const on = !!st[el.dataset.d];
        el.classList.toggle('on', on); el.classList.toggle('off', !on);
      });
      mwEls.forEach((el) => {
        const key = el.dataset.mw;
        let v = 0, txt = '';
        if (key === 'lineA' || key === 'lineB') { v = net.lineMW[key.slice(-1)]; txt = fmw(v); if (txt) txt = '→ ' + txt; }
        else if (key === 'T1' || key === 'T2') { v = net.txMW(key); txt = fmw(v); }
        else if (key === 'A752') { v = net.flow.A752; txt = fmw(v); if (txt) txt = (v > 0 ? '↓ ' : '↑ ') + txt; }
        else if (key === 'A852') { v = net.flow.A852; txt = fmw(v); if (txt) txt = (v > 0 ? '↓ ' : '↑ ') + txt; }
        el.textContent = txt;
      });
      fdEls.forEach((el) => el.classList.toggle('offsup', !net.supplied[el.dataset.f]));
      const f = net.fault[0];
      faultEl.hidden = !f;
      if (f && FAULT_AT[f]) faultEl.setAttribute('transform', 'translate(' + FAULT_AT[f][0] + ' ' + FAULT_AT[f][1] + ')');
    }
    function select(id) {
      const r = hits[id];
      if (!r) { selEl.setAttribute('width', 0); return; }
      selEl.setAttribute('x', r[0] - 2); selEl.setAttribute('y', r[1] - 2);
      selEl.setAttribute('width', r[2] + 4); selEl.setAttribute('height', r[3] + 4);
    }
    function rectOf(id) { const el = svg.querySelector('.hit[data-id="' + id + '"]'); return el ? el.getBoundingClientRect() : null; }
    update();
    return { update: update, select: select, rectOf: rectOf, has: (id) => !!hits[id] };
  };
})();
