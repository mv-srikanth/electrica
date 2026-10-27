/* ===================== 04 · Complements ===================== */
(function () {
  const { S, C, clamp, sub, sup, nw, lblFs, fit, DIG, parse, stripLead, fmtN, baseName } = ND;
  const EX = { 2: '1101100', 8: '3725', 10: '52520', 16: '3A7F' };
  const cn = (r) => (r - 1) + '’s', rn = (r) => r + '’s';

  function compute(st) {
    const r = st.r, p = parse(st.nums[r], r, { maxInt: 12, maxFrac: 4 });
    if (p.err) return { err: p.err, errKey: 'num' };
    const minLen = stripLead(p.ip).length;
    const n = st.w === 'auto' ? p.ip.length : Number(st.w);
    if (n < minLen) return { err: 'N needs at least ' + minLen + ' digits before the point. Choose a larger width.', errKey: 'num' };
    const ip = Array(Math.max(0, n - p.ip.length)).fill(0).concat(p.ip.slice(Math.max(0, p.ip.length - n)));
    const fp = p.fp, m = fp.length, all = ip.concat(fp), L = all.length;
    const c1 = all.map((d) => r - 1 - d);
    const c2 = c1.slice(), cr = Array(L).fill(0);
    let carry = 1;
    for (let i = L - 1; i >= 0; i--) { cr[i] = carry; const s = c2[i] + carry; c2[i] = s % r; carry = s >= r ? 1 : 0; }
    const out2 = carry;
    const ck = Array(L).fill(0), ckc = Array(L).fill(0);
    let cc = 0;
    for (let i = L - 1; i >= 0; i--) { ckc[i] = cc; const s = all[i] + c2[i] + cc; ck[i] = s % r; cc = s >= r ? 1 : 0; }
    const zero = all.every((d) => d === 0);
    let j1 = -1; for (let i = L - 1; i >= 0; i--) if (all[i] === 1) { j1 = i; break; }
    const nCarr = cr.slice(0, L - 1).filter((x) => x).length;
    const top = DIG[r - 1];
    const Nn = fmtN(ip, fp, r), C1 = fmtN(c1.slice(0, n), c1.slice(n), r), C2 = fmtN(c2.slice(0, n), c2.slice(n), r);
    const rN = '(1' + '0'.repeat(n) + (m ? '.' + '0'.repeat(m) : '') + ')' + sub(r);
    const nCopy = j1 >= 0 ? L - j1 : L;
    const steps = [
      { t: 'The number N and its width n', d: 'N = ' + Nn + ' with n = ' + n + ' digit' + (n > 1 ? 's' : '') + ' before the point' + (m ? ' and m = ' + m + ' after it' : '') + '. Its complements are measured against rⁿ = ' + r + sup(n) + ', written ' + rN + '.', look: 'The width n is part of the problem: change it and the complement changes.' },
      { t: 'Write ' + top + ' in every place', d: top + ' is the largest digit in base ' + r + ', so a row of ' + top + 's is the largest number that fits: rⁿ − 1' + (m ? ' − r⁻ᵐ' : '') + '.' },
      { t: 'Subtract digit by digit: ' + cn(r) + ' complement', d: 'Each digit d becomes ' + top + ' − d. No digit exceeds ' + top + ', so no borrow is ever needed. ' + (r === 2 ? 'In binary this simply flips every bit. ' : '') + 'The ' + cn(r) + ' complement of N is ' + C1 + '.' },
      { t: 'Add 1 in the last place: ' + rn(r) + ' complement', d: 'The ' + rn(r) + ' complement is the ' + cn(r) + ' complement plus 1' + (m ? ' in the last fraction place, r⁻ᵐ' : '') + '. ' + (nCarr ? 'The carry ripples left through ' + nCarr + ' place' + (nCarr > 1 ? 's' : '') + '. ' : 'No carry is needed here. ') + 'The ' + rn(r) + ' complement of N is ' + C2 + '.', look: 'Blue chips are carries.' },
      { t: 'Check: N + complement = rⁿ', d: zero ? 'N is 0, so its ' + rn(r) + ' complement is 0 as well: the carry out of the top is dropped.' : 'N plus its ' + rn(r) + ' complement is 1 followed by zeros, which is rⁿ. An n-digit register has no room for the leading 1, so it keeps 0. That is why the ' + rn(r) + ' complement can stand for −N.', look: 'The outlined 1 on the left is the carry that falls off.' },
    ];
    if (r === 2) steps.push({ t: 'Shortcut for the 2’s complement', d: zero ? 'N has no 1s, so every bit is copied and the result is 0.' : 'Scan from the right. Copy every bit up to and including the first 1 (' + nCopy + ' bit' + (nCopy > 1 ? 's' : '') + ' here), then flip all the bits to its left. The result, ' + C2 + ', matches step 4.' });
    return {
      r: r, n: n, m: m, all: all, c1: c1, c2: c2, cr: cr, out2: out2, ck: ck, ckc: ckc, zero: zero, j1: j1, steps: steps,
      plate: [['Base r', r + ', ' + baseName(r)], ['Width', 'n = ' + n + (m ? ', m = ' + m : '')], ['N', Nn], [cn(r) + ' compl.', C1], [rn(r) + ' compl.', C2], ['rⁿ', rN]],
    };
  }

  ND.register({
    id: 'complements', short: 'Complements', kind: 'r’s and (r−1)’s complement',
    name: 'r’s and (r−1)’s complements', sub: '1’s, 2’s, 9’s, 10’s and the rest',
    icon: '<rect x="5" y="7" width="34" height="11" rx="2"/><path d="M5 22h34"/><rect x="5" y="26" width="34" height="11" rx="2"/><text x="22" y="15.5">N</text><text x="22" y="34.5">rⁿ−N</text>',
    principle: 'For an n-digit number N in base r, the (r−1)’s complement is (rⁿ − 1) − N and the r’s complement is rⁿ − N. The (r−1)’s complement is found one digit at a time as (r−1) − d, with no borrows, and the r’s complement is one more. In binary these are the 1’s and 2’s complements, in decimal the 9’s and 10’s. Digital systems use complements so that an adder can also subtract.',
    formulas: ['(r−1)’s complement = (rⁿ − 1) − N', 'r’s complement = rⁿ − N = (r−1)’s + 1', 'With m fraction digits: (rⁿ − r⁻ᵐ) − N', 'N + r’s complement = rⁿ'],
    slips: [
      'Fix the width n first. The 2’s complement of 0101 (4 bits) is not that of 101 (3 bits).',
      'The 1 added for the r’s complement goes in the very last place, after the point if there is a fraction.',
      'The r’s complement of 0 is 0: the carry out of the top is dropped.',
    ],
    init: () => ({ r: 2, nums: Object.assign({}, EX), w: 'auto' }),
    set(st, key, v) { if (key === 'num') { st.nums[st.r] = v; return true; } return false; },
    controls: (st) => C.seg('r', 'Base', [[2, 'Binary'], [8, 'Octal'], [10, 'Decimal'], [16, 'Hex']], st.r) + C.input('num', 'Number N', st.nums[st.r], 14) +
      C.seg('w', 'Width n', [['auto', 'As typed'], [4, '4'], [6, '6'], [8, '8'], [12, '12']], st.w),
    random(st) {
      const r = st.r, len = r === 2 ? 6 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 2);
      let s = DIG[1 + Math.floor(Math.random() * (r - 1))];
      for (let i = 1; i < len; i++) s += DIG[Math.floor(Math.random() * r)];
      if (Math.random() < 0.25) s += '.' + DIG[1 + Math.floor(Math.random() * (r - 1))];
      st.nums[r] = s; st.w = 'auto';
    },
    compute: compute,
    draw(c) {
      const W = c.W, H = c.H, m = c.m, k = c.k, L = m.all.length, n = m.n, r = m.r, fl = lblFs(W);
      const lw = W < 520 ? 62 : 104, ptW = m.m ? 16 : 0, cols = L + 1;
      const s = Math.floor(clamp((W - lw - 26 - ptW) / (cols * 1.17), 19, Math.min(58, H / 14)));
      const gap = Math.round(s * 0.17), gw = cols * (s + gap) - gap + ptW;
      const x0 = lw + Math.max(8, Math.floor((W - lw - 14 - gw) / 2));
      const xc = (i) => x0 + (i + 1) * (s + gap) + (i >= n ? ptW : 0);
      const rowH = s + Math.round(s * 0.36);
      const lab = (y, t, cls, edge) => S.t(edge ? x0 - 10 : x0 + s - 2, y + s / 2, t, 't-lbl ' + (cls || ''), { a: 'end', mid: true, fs: fit(t, (edge ? x0 - 16 : x0 + s - 8), clamp(s * 0.3, 10.5, 15), 0.78) });
      const pt = (y) => (m.m ? S.c(x0 + (n + 1) * (s + gap) - gap / 2 + ptW / 2, y + s * 0.84, Math.max(2.4, s * 0.07), 'ptd') : '');
      const cellOf = (i, y, d, cls) => (r === 2 ? S.bit(xc(i), y, s, d, cls) : S.cell(xc(i), y, s, DIG[d], cls));
      const row = (y, ds, cls, isNew, gapMs) => ds.map((d, i) => S.g(nw(c, isNew), isNew ? (L - 1 - i) * (gapMs || 60) : 0, cellOf(i, y, d, typeof cls === 'function' ? cls(i) : cls))).join('') + pt(y);
      const rule = (y) => S.l(xc(0) - 4, y, xc(L - 1) + s + 4, y, 'rule');
      let o = '', y = 20;
      const y0 = y, y1 = y0 + rowH, y2 = y1 + rowH + 10, y3 = y2 + rowH + Math.round(s * 0.5), y4 = y3 + rowH + 10;
      if (k >= 1) o += lab(y0, 'r − 1') + row(y0, m.all.map(() => r - 1), '', k === 1);
      o += lab(y1, k >= 1 ? '− N' : 'N') + row(y1, m.all, '', false);
      if (k >= 2) {
        o += rule(y1 + s + 6) + lab(y2, cn(r)) + row(y2, m.c1, k === 2 ? 'hot' : '', k === 2, 70);
      }
      if (k >= 3) {
        let g = '';
        for (let i = 0; i < L - 1; i++) if (m.cr[i]) g += S.g(nw(c, k === 3), (L - 1 - i) * 110, S.chip(xc(i) + s / 2, y3 - s * 0.32, clamp(s * 0.2, 7, 12), '1'));
        if (m.out2) g += S.chip(x0 + s / 2, y3 - s * 0.32, clamp(s * 0.2, 7, 12), '1');
        o += g + lab(y3, '+ 1') + S.g(nw(c, k === 3), 0, cellOf(L - 1, y3, 1, 'hot'));
        o += rule(y3 + s + 6) + lab(y4, rn(r), '', m.out2) + row(y4, m.c2, k === 3 ? 'hot' : '', k === 3, 110);
        if (m.out2) o += S.cell(x0, y4, s, '1', 'ghost');
      }
      y = (k >= 3 ? y4 : k >= 2 ? y2 : y1) + rowH + 22;
      if (k === 4) {
        let g = S.lbl(18, y, 'Check · N + ' + rn(r) + ' complement', fl);
        const ya = y + 14 + Math.round(s * 0.45), yb = ya + rowH, yc = yb + rowH + 10;
        for (let i = 0; i < L; i++) if (m.ckc[i]) g += S.g(nw(c), (L - 1 - i) * 110, S.chip(xc(i) + s / 2, ya - s * 0.32, clamp(s * 0.2, 7, 12), '1'));
        g += lab(ya, 'N') + row(ya, m.all, '', false) + lab(yb, '+ ' + rn(r)) + row(yb, m.c2, '', false) + rule(yb + s + 6);
        g += lab(yc, 'rⁿ', '', !m.zero) + row(yc, m.ck, 'hot', true, 110);
        if (!m.zero) {
          g += S.g(nw(c), L * 110, S.cell(x0, yc, s, '1', 'ghost') + S.chip(x0 + s / 2, ya - s * 0.32, clamp(s * 0.2, 7, 12), '1'));
          g += S.t(x0 + s / 2, yc + s + 15, 'dropped', 't-bad', { a: 'middle', fs: 11 });
        }
        o += S.g('', 0, g, 'data-focus="1"');
        y = yc + s + 30;
      }
      if (k === 5) {
        let g = S.lbl(18, y, W < 480 ? 'Shortcut: copy, then flip' : 'Shortcut · copy to the first 1, flip the rest', fl);
        const ya = y + 34, yb = ya + rowH + 8;
        const jj = m.j1 < 0 ? 0 : m.j1;
        const bx = (a, b, cls, txt) => {
          const xa = xc(a) + 2, xe = xc(b) + s - 2, col = cls === 'g' ? 'var(--good)' : 'var(--copper)';
          return '<path d="M' + xa + ' ' + (ya - 6) + ' L' + xa + ' ' + (ya - 13) + ' L' + xe + ' ' + (ya - 13) + ' L' + xe + ' ' + (ya - 6) + '" style="fill:none;stroke:' + col + ';stroke-width:2.2"/>' + S.t((xa + xe) / 2, ya - 18, txt, cls === 'g' ? 't-good' : 't-acc', { a: 'middle', fs: 11.5 });
        };
        if (m.j1 > 0) g += bx(0, jj - 1, 'c', 'flip');
        g += bx(m.j1 < 0 ? 0 : jj, L - 1, 'g', 'copy');
        g += lab(ya, 'N') + row(ya, m.all, (i) => (m.j1 >= 0 && i < m.j1 ? '' : 'okc'), false);
        g += lab(yb, rn(r)) + row(yb, m.c2, (i) => (m.j1 >= 0 && i < m.j1 ? 'hot' : 'okc'), true, 90);
        o += S.g('', 0, g, 'data-focus="1"');
        y = yb + s + 26;
      }
      return S.svg(W, y, 'Complements of ' + m.steps[0].d.split(' with')[0], o);
    },
  });
})();
