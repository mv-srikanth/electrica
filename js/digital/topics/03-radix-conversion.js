/* ===================== 03 · Radix conversion ===================== */
(function () {
  const { S, C, clamp, sub, nw, lblFs, fit, DIG, parse, stripLead, stripTrail, ival, fval, toDigits, fracDigits, dec, nstr, dstr, fmtN, placeModel, drawPlace, isPow2, log2, baseName, minus } = ND;
  const NM = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hex' };
  const PAIRS = [[10, 2, '45.625'], [2, 10, '110101.011'], [2, 8, '10110101.1101'], [2, 16, '1011011.1011'], [16, 2, '3AF.C'], [8, 16, '754.32'], [10, 16, '2026.75'], [16, 10, 'B2.4'], [10, 8, '419.3'], [8, 10, '177.6']];

  function view(o) { return Object.assign({ div: 0, up: false, mul: 0, down: false, fin: false }, o || {}); }
  /* Integer by repeated division, fraction by repeated multiplication. */
  function ladder(I, F, r2, maxF) {
    const R2 = BigInt(r2), divs = [], muls = [];
    let v = I;
    while (v > 0n) { divs.push({ n: v, q: v / R2, rem: Number(v % R2) }); v /= R2; }
    let num = F.num, kk = 0;
    while (num !== 0n && kk < maxF) { const prod = num * R2; muls.push({ num: num, prod: prod, dg: Number(prod / F.den), rest: prod % F.den }); num = prod % F.den; kk++; }
    const ip = divs.length ? divs.map((d) => d.rem).reverse() : [0];
    const fs = (x) => { const d7 = dec(x, F.den, 7); return d7.endsWith('…') ? dec(x, F.den, 4) : d7; };
    return { I: I, F: F, r2: r2, divs: divs, muls: muls, exact: num === 0n, ip: ip, fp: muls.map((x) => x.dg), fs: fs };
  }
  function ladderSteps(L, srcTxt, steps) {
    const r2 = L.r2, nD = L.divs.length, res = fmtN(L.ip, L.fp, r2, !L.exact);
    steps.push({ t: 'Split at the radix point', d: 'Convert the integer part ' + L.I + ' and the fraction ' + (L.F.num ? L.fs(L.F.num) : '0') + ' separately, then join them.', v: view() });
    if (!nD) steps.push({ t: 'The integer part is 0', d: 'Zero is 0 in every base, so there is nothing to divide.', v: view({ up: true }) });
    L.divs.forEach((dv, i) => steps.push({
      t: dv.n + ' ÷ ' + r2 + ' = ' + dv.q + ', remainder ' + DIG[dv.rem],
      d: dv.n + ' ÷ ' + r2 + ' = ' + dv.q + ', remainder ' + dv.rem + (dv.rem > 9 ? ', which is the digit ' + DIG[dv.rem] : '') + '. ' + (dv.q === 0n ? 'The quotient is 0, so stop dividing.' : 'Now divide ' + dv.q + '.'),
      v: view({ div: i + 1 }),
    }));
    if (nD) steps.push({ t: 'Read the remainders upward', d: 'The first remainder is the least significant digit and the last is the most significant, so read from the bottom up: ' + dstr(L.ip) + '.', v: view({ div: nD, up: true }) });
    if (L.F.num !== 0n) {
      L.muls.forEach((ml, i) => steps.push({
        t: L.fs(ml.num) + ' × ' + r2 + ' = ' + L.fs(ml.prod),
        d: L.fs(ml.num) + ' × ' + r2 + ' = ' + L.fs(ml.prod) + '. Its integer part ' + ml.dg + (ml.dg > 9 ? ' (digit ' + DIG[ml.dg] + ')' : '') + ' is the next digit after the point. ' + (ml.rest === 0n ? 'The fraction left is 0, so stop.' : 'Carry on with ' + L.fs(ml.rest) + '.'),
        v: view({ div: nD, up: true, mul: i + 1 }),
      }));
      steps.push({ t: 'Read the integer parts downward', d: 'The first integer part is the first digit after the point, so read from the top down: .' + dstr(L.fp) + '. ' + (L.exact ? 'The fraction ended exactly.' : 'The fraction does not end in base ' + r2 + '; it is cut off after ' + L.muls.length + ' digits.'), v: view({ div: nD, up: true, mul: L.muls.length, down: true }) });
    }
    steps.push({ t: 'Result', d: srcTxt + ' = ' + res + (L.exact ? '' : ' (rounded down)') + '.', v: view({ div: nD, up: true, mul: L.muls.length, down: true, fin: true }) });
  }

  function drawLadder(c, L, v, y0, srcTxt) {
    const W = c.W, fl = lblFs(W), r2 = L.r2, hasF = L.F.num !== 0n, wide = W >= 680 && hasF;
    const rh = Math.round(clamp(c.H / 13, 32, 48)), fs = clamp(rh * 0.44, 13, 20), cw = fs * 0.602, cs = rh - 9;
    const colA = 18, colAW = wide ? Math.floor((W - 54) * 0.5) : W - 36, colB = wide ? colA + colAW + 18 : 18, colBW = wide ? W - colB - 18 : W - 36;
    let o = '', y = y0 + 24;
    /* ---- integer part ---- */
    o += S.lbl(colA, y, 'Integer part · divide by ' + r2, fl);
    const yA = y + 12;
    const nW = Math.max(1, ...L.divs.map((d) => String(d.n).length)) * cw;
    const qW = Math.max(1, ...L.divs.map((d) => String(d.q).length)) * cw;
    const xN = colA + nW, xDiv = xN + cw * 0.9, xEq = xDiv + (2.9 + String(r2).length) * cw, xQ = xEq + cw * 1.9 + qW;
    const xChip = Math.min(colA + colAW - cs - 34, xQ + cw * 3);
    if (!L.divs.length) o += S.t(colA, yA + rh / 2, '0', 't-b', { mid: true, fs: fs });
    L.divs.forEach((dv, i) => {
      if (i >= v.div) return;
      const yy = yA + i * rh, cur = i === v.div - 1 && !v.up;
      let g = cur ? S.r(colA - 6, yy + 2, xChip + cs + 12 - colA, rh - 4, 'halo', 6) : '';
      g += S.t(xN, yy + rh / 2, String(dv.n), '', { a: 'end', mid: true, fs: fs });
      g += S.t(xDiv, yy + rh / 2, '÷ ' + r2, 't-mut', { mid: true, fs: fs });
      g += S.t(xEq, yy + rh / 2, '=', 't-mut', { mid: true, fs: fs });
      g += S.t(xQ, yy + rh / 2, String(dv.q), dv.q === 0n ? 't-mut' : '', { a: 'end', mid: true, fs: fs });
      g += S.t(xChip - 6, yy + rh / 2, 'r', 't-mut', { a: 'end', mid: true, fs: fs * 0.8 });
      g += r2 === 2 ? S.bit(xChip, yy + 4.5, cs, dv.rem) : S.cell(xChip, yy + 4.5, cs, DIG[dv.rem], 'gB');
      if (dv.rem > 9) g += S.t(xChip + cs + 5, yy + rh / 2, '=' + dv.rem, 't-mut', { mid: true, fs: fs * 0.7 });
      o += S.g(nw(c, cur), 0, g, cur ? 'data-focus="1"' : '');
    });
    const nD = L.divs.length, yAend = yA + Math.max(1, nD) * rh;
    if (v.up && nD) {
      const ax = xChip + cs + (L.divs.some((d) => d.rem > 9) ? 34 : 14);
      let g = S.arrow('M' + ax + ' ' + (yAend - 8) + ' L' + ax + ' ' + (yA + 8), '', 'f');
      g += S.t(ax + 7, yA + 12, 'LSB', 't-flux', { fs: 10.5 }) + S.t(ax + 7, yAend - 10, 'MSB', 't-flux', { fs: 10.5 });
      g += S.t(ax + 7, (yA + yAend) / 2, 'read up', 't-flux t-body', { fs: 12, mid: true });
      o += S.g(nw(c, !v.mul && !v.fin), 0, g);
    }
    /* ---- fraction part ---- */
    let yBend = yAend;
    if (hasF) {
      const yB0 = wide ? y : yAend + 26;
      o += S.lbl(colB, yB0, 'Fraction · multiply by ' + r2, fl);
      const yB = yB0 + 12;
      const nCh = Math.max(...L.muls.map((ml) => L.fs(ml.num).length)) + Math.max(...L.muls.map((ml) => L.fs(ml.prod).length)) + 6.6 + String(r2).length;
      const fsB = Math.min(fs, (colBW - cs - 96) / (nCh * 0.602)), cwB = fsB * 0.602;
      const fW = Math.max(...L.muls.map((ml) => L.fs(ml.num).length)) * cwB, pW = Math.max(...L.muls.map((ml) => L.fs(ml.prod).length)) * cwB;
      const xF = colB + fW, xX = xF + cwB * 0.9, xE = xX + (2.9 + String(r2).length) * cwB, xP = xE + cwB * 1.9 + pW;
      const xC = xP + cwB * 1.6;
      L.muls.forEach((ml, i) => {
        if (i >= v.mul) return;
        const yy = yB + i * rh, cur = i === v.mul - 1 && !v.down;
        let g = cur ? S.r(colB - 6, yy + 2, xC + cs + 12 - colB, rh - 4, 'halo', 6) : '';
        g += S.t(xF, yy + rh / 2, L.fs(ml.num), '', { a: 'end', mid: true, fs: fsB });
        g += S.t(xX, yy + rh / 2, '× ' + r2, 't-mut', { mid: true, fs: fsB });
        g += S.t(xE, yy + rh / 2, '=', 't-mut', { mid: true, fs: fsB });
        g += S.t(xP, yy + rh / 2, L.fs(ml.prod), '', { a: 'end', mid: true, fs: fsB });
        g += r2 === 2 ? S.bit(xC, yy + 4.5, cs, ml.dg) : S.cell(xC, yy + 4.5, cs, DIG[ml.dg], 'gY');
        o += S.g(nw(c, cur), 0, g, cur ? 'data-focus="1"' : '');
      });
      yBend = yB + Math.max(1, L.muls.length) * rh;
      if (v.down) {
        const ax = xC + cs + 14;
        o += S.g(nw(c, !v.fin), 0, S.arrow('M' + ax + ' ' + (yB + 8) + ' L' + ax + ' ' + (yBend - 8), '', 'f') + S.t(ax + 7, (yB + yBend) / 2, 'read down', 't-flux t-body', { fs: 12, mid: true }));
      }
    }
    /* ---- result ---- */
    let yR = Math.max(yAend, yBend) + 30;
    if (v.up || v.fin) {
      const ip = v.up ? L.ip : [], fp = v.down ? L.fp : [];
      const cells = ip.length + fp.length, ptW = fp.length ? 16 : 0;
      const s = Math.floor(clamp((W - 60 - ptW) / (cells * 1.14 + 1), 20, 54)), gap = Math.round(s * 0.14);
      let g = S.lbl(18, yR, v.fin ? 'Result' : 'Digits so far', fl);
      const yy = yR + 10;
      let x = 18;
      ip.forEach((d) => { g += r2 === 2 ? S.bit(x, yy, s, d) : S.cell(x, yy, s, DIG[d], 'gB'); x += s + gap; });
      if (fp.length) { g += S.c(x + 3, yy + s * 0.84, Math.max(2.6, s * 0.07), 'ptd'); x += ptW; fp.forEach((d) => { g += r2 === 2 ? S.bit(x, yy, s, d) : S.cell(x, yy, s, DIG[d], 'gY'); x += s + gap; }); }
      if (v.down && !L.exact) { g += S.t(x + 2, yy + s * 0.6, '…', 't-mut', { fs: s * 0.5 }); x += s * 0.6; }
      g += S.t(x + 4, yy + s * 0.95, sub(r2), 't-mut', { fs: clamp(s * 0.4, 12, 20) });
      yR = yy + s + 14;
      if (v.fin) {
        const line = srcTxt + ' = ' + fmtN(L.ip, L.fp, r2, !L.exact);
        g += S.t(18, yR + 20, line, 't-disp', { fs: fit(line, W - 36, clamp(s * 0.62, 20, 36), 0.6) });
        yR += 34;
      }
      o += S.g(nw(c, v.fin), 0, g, v.fin ? 'data-focus="1"' : '');
    }
    return { o: o, y: yR + 10 };
  }

  /* Regroup bits between bases that are powers of 2. */
  function groupModel(r1, r2, ip, fp) {
    const k1 = log2(r1), k2 = log2(r2);
    const toB = (d, w) => d.toString(2).padStart(w, '0').split('').map(Number);
    const bitsI = r1 === 2 ? ip.slice() : [].concat(...ip.map((d) => toB(d, k1)));
    const bitsF = r1 === 2 ? fp.slice() : [].concat(...fp.map((d) => toB(d, k1)));
    const padL = r2 === 2 ? 0 : (k2 - (bitsI.length % k2)) % k2, padR = r2 === 2 ? 0 : (k2 - (bitsF.length % k2)) % k2;
    const gI = Array(padL).fill(0).concat(bitsI), gF = bitsF.concat(Array(padR).fill(0));
    const chunk = (a) => { const o = []; for (let i = 0; i < a.length; i += k2) o.push(a.slice(i, i + k2)); return o; };
    const grI = r2 === 2 ? [] : chunk(gI).map((b) => ({ b: b, d: parseInt(b.join(''), 2) }));
    const grF = r2 === 2 ? [] : chunk(gF).map((b) => ({ b: b, d: parseInt(b.join(''), 2) }));
    let rI, rF;
    if (r2 === 2) { rI = stripLead(bitsI.length ? bitsI : [0]); rF = stripTrail(bitsF); }
    else { rI = stripLead(grI.map((g) => g.d)); if (!rI.length) rI = [0]; rF = stripTrail(grF.map((g) => g.d)); }
    return { r1: r1, r2: r2, k1: k1, k2: k2, ip: ip, fp: fp, bitsI: bitsI, bitsF: bitsF, padL: padL, padR: padR, gI: gI, gF: gF, grI: grI, grF: grF, rI: rI, rF: rF };
  }
  function drawGroup(c, G, kinds, k) {
    const W = c.W, fl = lblFs(W);
    const at = (name) => kinds.indexOf(name) >= 0 && kinds.indexOf(name) <= k;
    const showPad = at('pad') || (G.r2 !== 2 && kinds.indexOf('pad') < 0);
    const nI = G.gI.length, nF = G.gF.length, ptW = nF ? 18 : 0;
    const s = Math.floor(clamp((W - 36 - ptW) / ((nI + nF) * 1.14), 11, Math.min(58, c.H / 7.5)));
    const gap = Math.max(1.5, Math.round(s * 0.14)), rowW = (nI + nF) * (s + gap) - gap + ptW;
    const x0 = Math.max(18, Math.round((W - rowW) / 2));
    const xb = (j) => x0 + j * (s + gap) + (j >= nI ? ptW : 0);
    const grpCls = ['gR', 'gY', 'gB'];
    let o = '', y = 26;
    const fsD = clamp(s * 0.56, 12, 30);
    if (G.r1 !== 2) {
      o += S.lbl(x0, y, 'Base ' + G.r1 + ' digits', fl); y += 10;
      const cellH = clamp(s * 1.05, 24, 58);
      G.ip.forEach((d, i) => { const j0 = G.padL + i * G.k1, w = G.k1 * (s + gap) - gap; o += S.cell(xb(j0), y, w, DIG[d], '', { h: cellH, fs: fsD }); });
      G.fp.forEach((d, i) => { const j0 = nI + i * G.k1, w = G.k1 * (s + gap) - gap; o += S.cell(xb(j0), y, w, DIG[d], '', { h: cellH, fs: fsD }); });
      if (G.fp.length) o += S.c(x0 + nI * (s + gap) - gap / 2 + ptW / 2, y + cellH * 0.84, 3, 'ptd');
      y += cellH + 8;
      if (at('expand')) {
        let g = '';
        G.ip.forEach((d, i) => { const j0 = G.padL + i * G.k1; g += S.p('M' + (xb(j0) + s / 2) + ' ' + (y + 12) + ' L' + (xb(j0) + s / 2) + ' ' + (y + 4) + ' L' + (xb(j0 + G.k1 - 1) + s / 2) + ' ' + (y + 4) + ' L' + (xb(j0 + G.k1 - 1) + s / 2) + ' ' + (y + 12), 'thin'); });
        G.fp.forEach((d, i) => { const j0 = nI + i * G.k1; g += S.p('M' + (xb(j0) + s / 2) + ' ' + (y + 12) + ' L' + (xb(j0) + s / 2) + ' ' + (y + 4) + ' L' + (xb(j0 + G.k1 - 1) + s / 2) + ' ' + (y + 4) + ' L' + (xb(j0 + G.k1 - 1) + s / 2) + ' ' + (y + 12), 'thin'); });
        o += g;
      }
      y += 34;
    }
    const bitsShown = G.r1 === 2 || at('expand');
    if (bitsShown) {
      let g = S.lbl(x0, y, G.r1 === 2 ? 'Binary digits' : 'Each digit as ' + G.k1 + ' bits', fl);
      const yy = y + 10;
      G.gI.forEach((b, j) => {
        const pad = j < G.padL;
        if (pad && !showPad) return;
        g += pad ? S.g(nw(c, kinds[k] === 'pad'), j * 60, S.cell(xb(j), yy, s, '0', 'ghost')) : S.g(nw(c, kinds[k] === 'expand'), j * 30, S.bit(xb(j), yy, s, b));
      });
      G.gF.forEach((b, j) => {
        const pad = j >= G.bitsF.length;
        if (pad && !showPad) return;
        g += pad ? S.g(nw(c, kinds[k] === 'pad'), j * 60, S.cell(xb(nI + j), yy, s, '0', 'ghost')) : S.g(nw(c, kinds[k] === 'expand'), (nI + j) * 30, S.bit(xb(nI + j), yy, s, b));
      });
      if (nF) g += S.c(x0 + nI * (s + gap) - gap / 2 + ptW / 2, yy + s * 0.84, Math.max(2.6, s * 0.08), 'ptd');
      o += g;
      y = yy + s + 10;
    }
    if (G.r2 !== 2 && at('convert')) {
      let g = '';
      const yb = y + 4, yc = y + 24, cellH = clamp(s * 1.05, 24, 58);
      const grp = (list, j0, side) => list.forEach((gr, i) => {
        const ja = j0 + i * G.k2, jb = ja + G.k2 - 1, xa = xb(ja), xe = xb(jb) + s, cls = grpCls[(side + i) % 3];
        const col = { gR: 'var(--phR)', gY: 'var(--phY)', gB: 'var(--phB)' }[cls];
        let q = '<path d="M' + (xa + 2) + ' ' + yb + ' L' + (xa + 2) + ' ' + (yb + 8) + ' L' + (xe - 2) + ' ' + (yb + 8) + ' L' + (xe - 2) + ' ' + yb + '" style="fill:none;stroke:' + col + ';stroke-width:2.2"/>';
        q += S.cell(xa, yc, xe - xa, DIG[gr.d], cls, { h: cellH, fs: fsD });
        if (xe - xa > 52) q += S.t((xa + xe) / 2, yc + cellH + 14, gr.b.join('') + ' = ' + gr.d, 't-mut', { a: 'middle', fs: 11 });
        g += S.g(nw(c, kinds[k] === 'convert'), (ja) * 45, q);
      });
      grp(G.grI, 0, 0); grp(G.grF, nI, G.grI.length);
      if (nF) g += S.c(x0 + nI * (s + gap) - gap / 2 + ptW / 2, yc + cellH * 0.84, 3, 'ptd');
      o += S.g('', 0, g, kinds[k] === 'convert' ? 'data-focus="1"' : '');
      y = yc + cellH + 26;
    }
    if (kinds[k] === 'result') {
      const line = fmtN(G.ip, G.fp, G.r1) + ' = ' + fmtN(G.rI, G.rF, G.r2);
      const fs = fit(line, W - 36, clamp(s * 0.7, 20, 38), 0.6);
      o += S.g(nw(c), 0, S.lbl(18, y + 14, 'Result', fl) + S.t(18, y + 22 + fs, line, 't-disp', { fs: fs }), 'data-focus="1"');
      y += fs + 40;
    }
    return { o: o, y: y + 6 };
  }

  ND.register({
    id: 'convert', short: 'Radix conversion', kind: 'Any base to any base',
    name: 'Conversion from one radix to another', sub: 'Expand, divide and multiply, or regroup the bits',
    icon: '<path d="M6 15h28"/><path d="M28 9l6 6-6 6"/><path d="M38 29H10"/><path d="M16 23l-6 6 6 6"/>',
    principle: 'To reach decimal, multiply every digit by its weight and add. To leave decimal, divide the integer part by the new base again and again, keeping the remainders, and multiply the fraction by the new base again and again, keeping the integer parts. Between bases that are powers of 2 there is a shortcut: an octal digit is exactly 3 bits and a hex digit exactly 4, so you only regroup the bits.',
    formulas: ['r → 10: N = Σ dₖ · rᵏ', '10 → r, integer: divide, read remainders bottom up', '10 → r, fraction: multiply, read integer parts top down', '2 ↔ 8: groups of 3 · 2 ↔ 16: groups of 4'],
    slips: [
      'The first remainder is the least significant digit, so remainders are read from the bottom up.',
      'The integer parts from the fraction are read from the top down.',
      'Group bits outward from the radix point and pad with zeros only at the outer ends.',
      'Many decimal fractions, such as 0.1, never end in binary. Stop at the precision you need.',
    ],
    init: () => ({ num: '45.625', from: 10, to: 2, maxF: 6, res: '' }),
    controls(st) {
      const bases = [];
      for (let r = 2; r <= 16; r++) bases.push([r, r + (NM[r] ? ' · ' + NM[r] : '')]);
      return C.input('num', 'Number', st.num, 15) +
        '<div class="fld-row">' + C.select('from', 'From base', bases, st.from) + '<button type="button" class="swap" data-k="swap" data-v="1" aria-label="Swap the bases and convert the answer back">⇄</button>' + C.select('to', 'To base', bases, st.to) + '</div>' +
        C.seg('maxF', 'Fraction digits', [[4, '4'], [6, '6'], [8, '8']], st.maxF);
    },
    set(st, key, v) {
      if (key === 'swap') { const f = st.from; st.from = st.to; st.to = f; if (st.res) st.num = st.res; return true; }
      return false;
    },
    random(st) {
      const p = PAIRS[Math.floor(Math.random() * PAIRS.length)];
      st.from = p[0]; st.to = p[1];
      const r = p[0];
      if (r === 10) { st.num = String(Math.floor(Math.random() * 400) + 20) + ['.5', '.25', '.75', '.125', '.375', '.3'][Math.floor(Math.random() * 6)]; return; }
      const ni = r === 2 ? 5 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 2), nf = r === 2 ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
      let s = DIG[1 + Math.floor(Math.random() * (r - 1))];
      for (let i = 1; i < ni; i++) s += DIG[Math.floor(Math.random() * r)];
      s += '.';
      for (let i = 0; i < nf; i++) s += DIG[1 + Math.floor(Math.random() * (r - 1))];
      st.num = s;
    },
    compute(st) {
      const r1 = st.from, r2 = st.to;
      const p = parse(st.num, r1, { maxInt: r1 === 10 ? 9 : 12, maxFrac: 8 });
      if (p.err) { st.res = ''; return { err: p.err, errKey: 'num' }; }
      const ip = stripLead(p.ip), fp = p.fp;
      const I = ival(ip, r1), F = fval(fp, r1);
      const src = fmtN(ip, fp, r1);
      const decTxt = '(' + dec(I * F.den + F.num, F.den, 8) + ')₁₀';
      let method, steps = [], data = {};
      if (r1 === r2) method = 'same';
      else if (r2 === 10) method = 'expand';
      else if (r1 === 10) method = 'divide';
      else if (isPow2(r1) && isPow2(r2)) method = 'group';
      else method = 'via';
      if (method === 'same') steps = [{ t: 'Same base', d: 'The two bases are the same, so there is nothing to convert. Pick a different target base.' }];
      if (method === 'expand' || method === 'via') {
        const P = placeModel(r1, ip, fp); data.P = P;
        steps.push({ t: 'Number the positions', d: 'Positions count from 0 just left of the radix point: ' + (ip.length - 1) + ' down to 0' + (fp.length ? ', then −1 to −' + fp.length + ' after the point' : '') + '.', lv: 0 });
        steps.push({ t: 'Write the weights ' + r1 + 'ᵏ', d: 'Each position k is worth ' + r1 + 'ᵏ in base ' + r1 + '.', lv: 1 });
        steps.push({ t: 'Multiply each digit by its weight', d: 'Work out every product in decimal. Zeros add nothing.', lv: 2 });
        steps.push({ t: method === 'via' ? 'Add: the value in decimal' : 'Add the products', d: src + ' = ' + decTxt + '.' + (method === 'via' ? ' There is no shortcut between base ' + r1 + ' and base ' + r2 + ', so decimal is the stepping stone.' : ''), lv: 3 });
        data.nA = steps.length;
      }
      if (method === 'divide' || method === 'via') {
        const L = ladder(I, F, r2, st.maxF); data.L = L;
        ladderSteps(L, method === 'via' ? decTxt : src, steps);
        if (method === 'via') steps[steps.length - 1].d = src + ' = ' + decTxt + ' = ' + fmtN(L.ip, L.fp, r2, !L.exact) + (L.exact ? '' : ' (cut off)') + '.';
        st.res = nstr(L.ip, L.fp);
      }
      if (method === 'group') {
        const G = groupModel(r1, r2, ip, fp); data.G = G;
        const kinds = [];
        if (r1 !== 2) { kinds.push('expand'); steps.push({ t: 'Write each digit as ' + G.k1 + ' bits', d: 'Each base-' + r1 + ' digit is exactly ' + G.k1 + ' bits: ' + ip.concat(fp).slice(0, 5).map((d) => DIG[d] + ' → ' + d.toString(2).padStart(G.k1, '0')).join(', ') + (ip.length + fp.length > 5 ? ', …' : '') + '.' }); }
        if (r2 !== 2) {
          kinds.push('pad');
          steps.push({ t: 'Make groups of ' + G.k2 + ' from the point', d: 'Group outward from the radix point: leftward for the integer part, rightward for the fraction. ' + (G.padL ? G.padL + ' zero' + (G.padL > 1 ? 's go' : ' goes') + ' on the far left' : 'The integer part already fills whole groups') + (G.gF.length ? (G.padR ? ' and ' + G.padR + ' on the far right.' : ', and the fraction fills whole groups.') : '.') + ' Zeros added at the outer ends do not change the value.' });
          kinds.push('convert');
          const all = G.grI.concat(G.grF);
          steps.push({ t: 'Replace each group by one digit', d: 'Each group of ' + G.k2 + ' bits is one base-' + r2 + ' digit: ' + all.slice(0, 5).map((g) => g.b.join('') + ' → ' + DIG[g.d]).join(', ') + (all.length > 5 ? ', …' : '') + '.' });
        }
        kinds.push('result');
        steps.push({ t: 'Result', d: src + ' = ' + fmtN(G.rI, G.rF, r2) + '.' + (r2 !== 2 && (G.rI.length < G.grI.length) ? ' Leading zero digits are dropped.' : '') });
        data.kinds = kinds;
        st.res = nstr(G.rI, G.rF);
      }
      if (method === 'expand') st.res = data.P.total;
      const res = st.res ? '(' + st.res + (data.L && !data.L.exact ? '…' : '') + ')' + sub(r2) : '';
      const how = { same: '—', expand: 'Expand with weights', divide: 'Divide and multiply', group: 'Regroup the bits', via: 'Through decimal' }[method];
      return Object.assign(data, {
        method: method, src: src, decTxt: decTxt, steps: steps,
        plate: [['From', 'Base ' + r1 + (NM[r1] ? ', ' + NM[r1] : '')], ['To', 'Base ' + r2 + (NM[r2] ? ', ' + NM[r2] : '')], ['Method', how], ['Number', src], ['Value', decTxt], ['Answer', res || '—']],
      });
    },
    draw(c) {
      const m = c.m, k = c.k, W = c.W;
      let r;
      if (m.method === 'same') return S.svg(W, 120, 'Same base', S.t(W / 2, 60, m.src + ' stays ' + m.src, 't-disp', { a: 'middle', fs: 26 }));
      if (m.method === 'expand') r = drawPlace(c, m.P, k, 0);
      else if (m.method === 'divide') r = drawLadder(c, m.L, m.steps[k].v, 0, m.src);
      else if (m.method === 'group') r = drawGroup(c, m.G, m.kinds, k);
      else if (k < m.nA) r = drawPlace(c, m.P, k, 0);
      else {
        const fl = lblFs(W), top = S.lbl(18, 22, 'Stage 1 gave', fl) + S.t(18, 46, m.src + ' = ' + m.decTxt, 't-disp', { fs: fit(m.src + ' = ' + m.decTxt, W - 36, 24, 0.6) });
        r = drawLadder(c, m.L, m.steps[k].v, 52, m.decTxt);
        r.o = top + r.o;
      }
      return S.svg(W, r.y, 'Converting ' + m.src, r.o);
    },
  });
})();
