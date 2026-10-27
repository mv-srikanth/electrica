/* ===================== 08 · Gray ↔ binary ===================== */
(function () {
  const { S, C, clamp, sub, nw, lblFs, fit } = ND;

  function compute(st) {
    const raw = String(st.bits).trim().replace(/\s/g, '');
    if (!/^[01]+$/.test(raw)) return { err: 'Type the bits as 0s and 1s, for example 101101.', errKey: 'bits' };
    if (raw.length < 2 || raw.length > 10) return { err: 'Use 2 to 10 bits for this view.', errKey: 'bits' };
    const inp = raw.split('').map(Number), n = inp.length, b2g = st.dir === 'b2g', out = [inp[0]];
    for (let i = 1; i < n; i++) out.push(b2g ? inp[i - 1] ^ inp[i] : out[i - 1] ^ inp[i]);
    const iN = b2g ? 'b' : 'g', oN = b2g ? 'g' : 'b';
    const bin = b2g ? inp : out, val = parseInt(bin.join(''), 2);
    const steps = [{ t: 'Copy the MSB', d: (b2g ? 'g' : 'b') + sub(n - 1) + ' = ' + (b2g ? 'b' : 'g') + sub(n - 1) + ' = ' + inp[0] + '. The most significant bit is the same in both codes.' }];
    for (let i = 1; i < n; i++) {
      const j = n - 1 - i, a = b2g ? inp[i - 1] : out[i - 1], b = inp[i];
      steps.push({
        t: 'Bit ' + j + ': ' + (b2g ? 'b' + sub(j + 1) + ' XOR b' + sub(j) : 'b' + sub(j + 1) + ' XOR g' + sub(j)),
        d: oN + sub(j) + ' = ' + (b2g ? 'b' + sub(j + 1) + ' ⊕ b' + sub(j) : 'b' + sub(j + 1) + ' ⊕ g' + sub(j)) + ' = ' + a + ' ⊕ ' + b + ' = ' + (a ^ b) + '. ' + (a === b ? 'The inputs are equal, so the XOR is 0.' : 'The inputs differ, so the XOR is 1.') + (b2g ? '' : ' Note the left input is the binary bit just found, so the result ripples from left to right.'),
        ab: [a, b],
      });
    }
    steps.push({ t: 'Result', d: (b2g ? 'Binary ' : 'Gray ') + inp.join('') + ' → ' + (b2g ? 'Gray ' : 'binary ') + out.join('') + '. The binary word is ' + bin.join('') + ' = ' + val + ' in decimal.' });
    return {
      b2g: b2g, inp: inp, out: out, n: n, iN: iN, oN: oN, val: val, steps: steps,
      plate: [['Direction', b2g ? 'Binary → Gray' : 'Gray → binary'], ['Bits', String(n)], ['Input', inp.join('')], ['Output', out.join('')], ['Value', val + '₁₀'], ['Gates', (n - 1) + ' XOR']],
      extra: (k) => {
        const ab = steps[k] && steps[k].ab;
        const rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
        return '<table class="tt"><caption>XOR truth table</caption><thead><tr><th>A</th><th>B</th><th>A ⊕ B</th></tr></thead><tbody>' +
          rows.map((r) => '<tr' + (ab && ab[0] === r[0] && ab[1] === r[1] ? ' class="on"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + (r[0] ^ r[1]) + '</td></tr>').join('') + '</tbody></table>';
      },
    };
  }

  function xorGate(cx, yT, gw, gh, cls) {
    const l = cx - gw / 2, r = cx + gw / 2;
    const body = 'M' + l + ' ' + yT + ' Q' + cx + ' ' + (yT + gh * 0.3) + ' ' + r + ' ' + yT + ' Q' + r + ' ' + (yT + gh * 0.62) + ' ' + cx + ' ' + (yT + gh) + ' Q' + l + ' ' + (yT + gh * 0.62) + ' ' + l + ' ' + yT + ' Z';
    const back = 'M' + l + ' ' + (yT - gh * 0.17) + ' Q' + cx + ' ' + (yT + gh * 0.13) + ' ' + r + ' ' + (yT - gh * 0.17);
    return S.p(body, 'gate ' + cls) + S.p(back, 'gate-b ' + cls);
  }

  ND.register({
    id: 'gray', short: 'Gray ↔ binary', kind: 'Conversion with XOR',
    name: 'Gray to binary and binary to Gray', sub: 'One XOR gate per bit',
    icon: '<path d="M10 11q12 5 24 0q0 13-12 23q-12-10-12-23z"/><path d="M10 7q12 5 24 0"/><path d="M22 34v6"/>',
    principle: 'Binary to Gray: copy the most significant bit, then each Gray bit is the exclusive-OR of a binary bit and the binary bit to its left. Gray to binary: copy the most significant bit, then each binary bit is the exclusive-OR of the Gray bit and the binary bit just found to its left. The first works on all bits at once; the second ripples from left to right.',
    formulas: ['gₙ₋₁ = bₙ₋₁,  gᵢ = bᵢ₊₁ ⊕ bᵢ', 'bₙ₋₁ = gₙ₋₁,  bᵢ = bᵢ₊₁ ⊕ gᵢ', 'XOR gives 1 when its inputs differ'],
    slips: [
      'In Gray → binary, XOR with the binary bit you have just found, not with the Gray bit to its left.',
      'Both directions start by copying the MSB unchanged.',
      'Check your answer by converting back: you must get the original bits.',
    ],
    init: () => ({ dir: 'b2g', bits: '101101' }),
    controls: (st) => C.seg('dir', 'Direction', [['b2g', 'Binary → Gray'], ['g2b', 'Gray → binary']], st.dir) + C.input('bits', st.dir === 'b2g' ? 'Binary input' : 'Gray input', st.bits, 12, 'numeric'),
    random(st) { const n = 4 + Math.floor(Math.random() * 4); let s = '1'; for (let i = 1; i < n; i++) s += Math.random() < 0.5 ? '0' : '1'; st.bits = s; },
    compute: compute,
    draw(c) {
      const W = c.W, H = c.H, m = c.m, k = c.k, n = m.n, fl = lblFs(W), cur = k >= n ? n : k;
      const pitch = clamp((W - 40) / n, 44, Math.min(120, H / 3.4)), s = Math.floor(clamp(pitch * 0.64, 26, 64));
      const x0 = Math.max(20, Math.floor((W - n * pitch) / 2));
      const cxOf = (i) => x0 + i * pitch + pitch / 2;
      const gw = s * 0.82, gh = s * 0.82;
      const yIn = 46, yG = yIn + s + Math.round(s * 0.9), yOut = yG + gh + Math.round(s * 0.8);
      const st = (i) => (i < cur ? 'done' : i === cur ? 'on' : '');
      let gateLbl = '';
      let o = S.lbl(x0, 22, m.b2g ? 'Binary in' : 'Gray in', fl);
      const fsS = clamp(s * 0.3, 11, 15);
      m.inp.forEach((b, i) => {
        o += S.t(cxOf(i), yIn - 8, m.iN + sub(n - 1 - i), 't-mut', { a: 'middle', fs: fsS });
        o += S.bit(cxOf(i) - s / 2, yIn, s, b, k < n && (i === cur || (m.b2g && i === cur - 1 && cur > 0)) ? 'hot' : '');
      });
      /* wires and gates */
      for (let i = 0; i < n; i++) {
        const cx = cxOf(i), cls = st(i);
        if (i === 0) {
          o += S.p('M' + cx + ' ' + (yIn + s) + ' L' + cx + ' ' + (yOut - 2), 'wire ' + cls);
          o += S.t(cx + 7, (yG + gh / 2), 'copy', cls === 'on' ? 't-flux t-body' : 't-mut t-body', { mid: true, fs: 12 });
          continue;
        }
        const inR = cx + gw * 0.22, inL = cx - gw * 0.22, yTop = yG - gh * 0.12;
        o += S.p('M' + inR + ' ' + (yIn + s) + ' L' + inR + ' ' + yTop, 'wire ' + cls);
        if (m.b2g) {
          const sx = cxOf(i - 1) + s * 0.18;
          o += S.p('M' + sx + ' ' + (yIn + s) + ' L' + sx + ' ' + (yIn + s + 10) + ' L' + inL + ' ' + (yTop - 10) + ' L' + inL + ' ' + yTop, 'wire ' + cls);
          o += S.c(sx, yIn + s + 10, 2.8, 'ptd');
        } else {
          const ox = cxOf(i - 1) + s / 2, oy = yOut + s / 2, vx = inL - 6;
          o += S.p('M' + ox + ' ' + oy + ' L' + vx + ' ' + oy + ' L' + vx + ' ' + (yTop - 14) + ' L' + inL + ' ' + (yTop - 14) + ' L' + inL + ' ' + yTop, 'wire ' + cls);
        }
        o += xorGate(cx, yG, gw, gh, cls);
        o += S.p('M' + cx + ' ' + (yG + gh) + ' L' + cx + ' ' + (yOut - 2), 'wire ' + cls);
        if (cls === 'on') {
          const a = m.steps[k].ab, t = a[0] + ' ⊕ ' + a[1] + ' = ' + (a[0] ^ a[1]), tf = clamp(s * 0.34, 12, 18), tw = t.length * tf * 0.62 + 12;
          const tx = cx + gw / 2 + tw + 14 < W ? cx + gw / 2 + 8 : cx - gw / 2 - 8 - tw;
          gateLbl = S.g(nw(c), 0, S.r(tx - 6, yG + gh * 0.45 - tf * 0.8, tw, tf * 1.6, 'panel', 5) + S.t(tx, yG + gh * 0.45, t, 't-flux t-b', { mid: true, fs: tf }));
        }
      }
      o += gateLbl;
      o += S.lbl(x0, yOut + s + 30, m.b2g ? 'Gray out' : 'Binary out', fl);
      m.out.forEach((b, i) => {
        if (i > cur) { o += S.cell(cxOf(i) - s / 2, yOut, s, '?', 'ghost'); }
        else o += S.g(nw(c, i === cur), 120, S.bit(cxOf(i) - s / 2, yOut, s, b, i === cur && k < n ? 'hot' : ''));
        o += S.t(cxOf(i), yOut + s + 14, m.oN + sub(n - 1 - i), 't-mut', { a: 'middle', fs: fsS });
      });
      let y = yOut + s + 44;
      if (k >= n) {
        const line = (m.b2g ? '(' + m.inp.join('') + ')₂ → Gray ' : 'Gray ' + m.inp.join('') + ' → (') + m.out.join('') + (m.b2g ? '' : ')₂') + '   = ' + m.val + '₁₀';
        o += S.g(nw(c), 0, S.t(x0, y + 14, line, 't-disp', { fs: fit(line, W - x0 - 18, clamp(s * 0.62, 20, 36), 0.6) }), 'data-focus="1"');
        y += 44;
      }
      return S.svg(W, y, (m.b2g ? 'Binary to Gray' : 'Gray to binary') + ' with XOR gates', o);
    },
  });
})();
