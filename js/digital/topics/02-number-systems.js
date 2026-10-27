/* ===================== 02 · Number systems ===================== */
(function () {
  const { S, C, clamp, sub, sup, nw, lblFs, fit, DIG, parse, stripLead, placeModel, drawPlace, toDigits, fracDigits, nstr, fmtN, minus, baseName } = ND;
  const EX = { 2: '1011.101', 8: '347.2', 10: '2026.75', 16: '3AF.8' };
  const digitsOf = (r) => (r <= 10 ? '0 to ' + (r - 1) : '0–9, A–F');

  function placeM(st) {
    const r = st.r, p = parse(st.nums[r], r, { maxInt: 10, maxFrac: 6 });
    if (p.err) return { err: p.err, errKey: 'num' };
    const ip = stripLead(p.ip), fp = p.fp;
    const P = placeModel(r, ip, fp);
    P.four = [[2, 'Binary'], [8, 'Octal'], [10, 'Decimal'], [16, 'Hex']].map((b) => {
      const i = toDigits(P.I, b[0]), f = fracDigits(P.F.num, P.F.den, b[0], 12);
      return { r: b[0], name: b[1], text: nstr(i, f.ds, !f.exact) };
    });
    const nm = fmtN(ip, fp, r), first = P.digs[0], last = P.digs[P.digs.length - 1];
    const nz = P.digs.filter((g) => g.d).length;
    return {
      P: P,
      steps: [
        { t: 'Digits sit in numbered positions', d: nm + ' has ' + ip.length + ' digit' + (ip.length > 1 ? 's' : '') + ' before the radix point' + (fp.length ? ' and ' + fp.length + ' after it' : '') + '. Position 0 is just left of the point; positions rise to the left and fall to −1, −2, … on the right.' },
        { t: 'Each position has a weight rᵏ', d: 'In base ' + r + ' the weight of position k is ' + r + 'ᵏ. The leftmost digit here sits at k = ' + first.k + ' and is worth ' + P.weights[0].big + ' = ' + P.weights[0].small + (fp.length ? '; the last sits at k = ' + minus(last.k) + ' and is worth ' + P.weights[P.digs.length - 1].small : '') + '.' },
        { t: 'Multiply each digit by its weight', d: 'Digit ' + DIG[first.d] + ' at k = ' + first.k + ' gives ' + first.d + ' × ' + P.weights[0].small + ' = ' + P.prods[0] + '. A zero gives nothing, however large its weight' + (r === 16 ? ', and the letters A to F stand for 10 to 15' : '') + '.' },
        { t: 'Add the products', d: 'The ' + nz + ' non-zero products add up to the value: ' + nm + ' = (' + P.total + ')₁₀. The bar is drawn to scale, so you can see which digits carry the weight.' },
        { t: 'The same value in four systems', d: 'The value ' + P.total + ' written in each base. Binary needs the most digits and hexadecimal the fewest, since one hex digit carries 4 bits and one octal digit 3.' + (P.four.some((f) => f.text.endsWith('…')) ? ' A row ending in … does not terminate in that base.' : '') },
      ],
      plate: [['Base r', r + ', ' + baseName(r)], ['Digits used', digitsOf(r)], ['Weights', '… ' + r + '² ' + r + '¹ ' + r + '⁰ . ' + r + '⁻¹ ' + r + '⁻² …'], ['Number', nm], ['Value', '(' + P.total + ')₁₀']],
    };
  }
  function countM(st) {
    const v = st.v, prev = st.prev, up = v === (prev + 1) % 256;
    const rows = [[2, 8, 'Binary'], [8, 3, 'Octal'], [10, 3, 'Decimal'], [16, 2, 'Hex']].map((b) => {
      const r = b[0], w = b[1];
      const padTo = (ds) => Array(Math.max(0, w - ds.length)).fill(0).concat(ds);
      const ds = padTo(toDigits(BigInt(v), r)), ps = padTo(toDigits(BigInt(prev), r));
      const changed = [], rolled = [];
      ds.forEach((d, i) => { if (d !== ps[i]) changed.push(i); if (up && ps[i] === r - 1 && d === 0) rolled.push(i); });
      return { r: r, w: w, name: b[2], ds: ds, changed: changed, rolled: rolled };
    });
    const s = (r) => rows.find((x) => x.r === r).ds.map((d) => DIG[d]).join('');
    const rollTxt = rows.map((x) => x.name.toLowerCase() + ' ' + x.rolled.length).join(', ');
    return {
      rows: rows, v: v, prev: prev, keepStep: true,
      counter: { label: 'Count · value ' + v, text: v + '₁₀ = ' + s(2) + '₂', prev: '− 1', next: '+ 1' },
      live: () => true, liveLabel: 'Count',
      steps: [{ t: 'Count in four bases at once', d: (prev !== v ? prev + ' → ' + v + '. ' : '') + 'A digit rolls over to 0 when it passes the largest digit of its base (1 in binary, 7 in octal, 9 in decimal, F in hex) and carries 1 to the left.' + (up ? ' Roll-overs this count: ' + rollTxt + '.' : '') + ' Tap any binary digit to flip it.', look: 'Blue outlines mark the digits that changed. The small arrows are carries.' }],
      plate: [['Value', String(v)], ['Binary', s(2) + '₂'], ['Octal', s(8) + '₈'], ['Decimal', s(10) + '₁₀'], ['Hex', s(16) + '₁₆'], ['Range', '0 to 255, 8 bits']],
      plateNote: 'Live values for the counter',
    };
  }
  function drawCount(c) {
    const W = c.W, H = c.H, m = c.m, fl = lblFs(W);
    const s = Math.floor(clamp((W - 48) / (8 * 1.2), 26, Math.min(70, H / 8.6)));
    const gap = Math.round(s * 0.2), dh = Math.round(s * 1.55), x0 = Math.max(20, Math.round((W - (8 * s + 7 * gap)) / 2));
    const xR = x0 + 8 * s + 7 * gap;
    let o = '', y = 26;
    m.rows.forEach((row) => {
      o += S.lbl(xR, y, row.name + ' · base ' + row.r, fl, 'end');
      y += 10;
      row.ds.forEach((d, i) => {
        const x = xR - (row.w - i) * (s + gap) + gap, hot = row.changed.indexOf(i) >= 0;
        const above = (d - 1 + row.r) % row.r, below = (d + 1) % row.r;
        let g = '<g class="drum' + (hot ? ' hot' : '') + '"' + (row.r === 2 ? ' data-act="bit" data-v="' + (row.w - 1 - i) + '" role="button" tabindex="0" aria-label="Flip bit ' + (row.w - 1 - i) + '"' : '') + '>';
        g += S.r(x, y, s, dh, 'dr', s * 0.16) + S.r(x + 3, y + (dh - s * 0.66) / 2, s - 6, s * 0.66, 'win', 4);
        g += S.t(x + s / 2, y + dh * 0.15, DIG[above], 't-mut', { a: 'middle', mid: true, fs: s * 0.25 });
        g += S.t(x + s / 2, y + dh / 2 + 1, DIG[d], row.r === 2 && d ? 't-acc t-b' : 't-b', { a: 'middle', mid: true, fs: s * 0.58 });
        g += S.t(x + s / 2, y + dh * 0.86, DIG[below], 't-mut', { a: 'middle', mid: true, fs: s * 0.25 });
        o += g + '</g>';
        if (row.rolled.indexOf(i) >= 0 && i > 0) o += S.arrow('M' + (x + s * 0.3) + ' ' + (y - 2) + ' Q ' + (x - gap / 2) + ' ' + (y - 16) + ' ' + (x - gap - s * 0.3) + ' ' + (y - 3), 'c', 'c');
      });
      y += dh;
      if (row.r === 2) {
        row.ds.forEach((d, i) => { const x = xR - (row.w - i) * (s + gap) + gap; o += S.t(x + s / 2, y + 15, String(1 << (row.w - 1 - i)), 't-mut', { a: 'middle', fs: fit('128', s, 12) }); });
        y += 18;
      }
      y += 26;
    });
    const free = xR - 3 * (s + gap) - x0 - 20;
    if (free > 90) {
      const fsV = clamp(Math.min(free / 2.2, s * 1.5), 30, 96);
      o += S.lbl(x0, 26 + 10 + dh + 18 + 26 + 30, 'Value', fl);
      o += S.t(x0, 26 + 10 + dh + 18 + 26 + 36 + fsV * 0.8, String(m.v), 't-disp', { fs: fsV });
    }
    return S.svg(W, y, 'Counting ' + m.v + ' in binary, octal, decimal and hexadecimal', o);
  }

  ND.register({
    id: 'radix', short: 'Number systems', kind: 'Binary, octal, decimal, hex',
    name: 'Binary, octal, decimal and hexadecimal', sub: 'Place value: every digit times its weight',
    icon: '<rect x="4" y="12" width="11" height="20" rx="2"/><rect x="16.5" y="12" width="11" height="20" rx="2"/><rect x="29" y="12" width="11" height="20" rx="2"/><text x="9.5" y="26">1</text><text x="22" y="26">0</text><text x="34.5" y="26">1</text>',
    principle: 'In a positional number system each digit is worth its face value times a weight, and the weight depends on where the digit sits. The base or radix r is the number of distinct digits: binary uses 2 (0, 1), octal 8 (0–7), decimal 10 (0–9) and hexadecimal 16 (0–9, A–F). Positions left of the radix point weigh r⁰, r¹, r², …; positions to the right weigh r⁻¹, r⁻², …',
    formulas: ['N = Σ dₖ · rᵏ', 'Binary weights: … 8 4 2 1 . ½ ¼ ⅛', 'A=10 B=11 C=12 D=13 E=14 F=15', '1 octal digit = 3 bits · 1 hex digit = 4 bits'],
    slips: [
      'A digit must be smaller than the base: 8 is not an octal digit and 2 is not a binary digit.',
      'Write the base as a subscript, (101)₂, so it is not read as one hundred and one.',
      'Positions after the point weigh r⁻¹, r⁻², …; there is no second r⁰.',
    ],
    init: () => ({ mode: 'place', r: 2, nums: Object.assign({}, EX), v: 39, prev: 38 }),
    set(st, key, v) { if (key === 'num') { st.nums[st.r] = v; return true; } return false; },
    controls(st) {
      let h = C.seg('mode', 'View', [['place', 'Place value'], ['count', 'Counting']], st.mode);
      if (st.mode === 'place') h += C.seg('r', 'Base', [[2, 'Binary'], [8, 'Octal'], [10, 'Decimal'], [16, 'Hex']], st.r) + C.input('num', 'Number', st.nums[st.r], 14);
      return h;
    },
    random(st) {
      if (st.mode === 'count') { st.prev = st.v; st.v = Math.floor(Math.random() * 256); return; }
      const r = st.r, ni = 2 + Math.floor(Math.random() * (r === 2 ? 5 : 3)), nf = Math.floor(Math.random() * 3);
      let s = DIG[1 + Math.floor(Math.random() * (r - 1))];
      for (let i = 1; i < ni; i++) s += DIG[Math.floor(Math.random() * r)];
      if (nf) { s += '.'; for (let i = 0; i < nf; i++) s += DIG[1 + Math.floor(Math.random() * (r - 1))]; }
      st.nums[r] = s;
    },
    compute: (st) => (st.mode === 'count' ? countM(st) : placeM(st)),
    bump(st, dir) { st.prev = st.v; st.v = (st.v + dir + 256) % 256; },
    frame(st, m, dt) { st.acc = (st.acc || 0) + dt; if (st.acc < 0.75) return false; st.acc = 0; st.prev = st.v; st.v = (st.v + 1) % 256; return 'draw'; },
    act(st, m, a, v) { if (a === 'bit' && st.mode === 'count') { st.prev = st.v; st.v ^= 1 << +v; return true; } return false; },
    draw(c) {
      if (c.st.mode === 'count') return drawCount(c);
      const r = drawPlace(c, c.m.P, c.k, 0);
      return S.svg(c.W, r.y + 12, 'Place value of ' + fmtN(c.m.P.ip, c.m.P.fp, c.m.P.r), r.o);
    },
  });
})();
